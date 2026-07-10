/* === QDecide — Central Brain Decision Endpoint ===
 *
 * Q 大脑的入口。接受自然语言 action，用 DeepSeek 理解意图
 * → 决定管道 → 执行 → 验证 → 返回结果 + Q 洞察。
 *
 * 模式参考：music-planner.ts（DeepSeek 分析 → JSON 决策 → 注入管道）
 */

import { deepseekChat } from '../ai/deepseek.js';
import { qMemory } from './q-memory.js';
import { getProjectSummary, getDeviations } from './q-state.js';
import type { PipelineRoute } from './q-orchestrate.js';

// ── Types ──────────────────────────────────────────

export interface QDecideRequest {
  action: string;              // Natural language: "分析这个剧本", "给镜头3重新生成"
  scriptText?: string;
  nodeId?: string;
  projectId?: string;          // Defaults to 'default'
  params?: Record<string, unknown>;
  autoExecute?: boolean;       // If true, actually runs the pipeline. Default: true
}

export interface QDecisionStep {
  step: 'intent' | 'route' | 'context' | 'execution' | 'validation';
  description: string;
  result: unknown;
  durationMs: number;
}

export interface QDecideResponse {
  intent: {
    understood: string;
    confidence: number;        // 0-1
    category: 'generate' | 'analyze' | 'fix' | 'query' | 'unknown';
  };
  routing: {
    route: PipelineRoute | 'none';
    reasoning: string;
    alternatives: string[];
  };
  context: {
    memoriesRecalled: number;
    relevantMemories: { content: string; layer: string }[];
    knownIssues: string[];
  };
  execution?: {
    success: boolean;
    result: unknown;
    durationMs: number;
  };
  validation?: {
    deviationsFound: number;
    violationsFound: number;
    suggestions: string[];
  };
  planOnly: boolean;
  trace: QDecisionStep[];
}

// ── DeepSeek Intent Analysis Prompt ────────────────

const INTENT_PROMPT = `你是小Q，DireX AI内容生产管线的认知大脑。分析用户请求并输出结构化决策。

## 任务
1. 理解用户意图
2. 分类意图
3. 决定最优管道路线

## 意图分类
- generate: 用户想要生成内容（分镜、角色、场景、音乐、图片、视频）
- analyze: 用户想要分析内容（剧本分析、偏差检测、质量评估）
- fix: 用户想要修复问题（重新生成、调整prompt、修复偏差）
- query: 用户想要查询信息（项目状态、记忆、建议、进度）

## 管道路线
- full_pipeline: 长剧本全管线（角色+场景+分镜+音乐+道具，全部并行）
- unified_pipeline: 中等文本统一管线（一次GPT调用输出全部）
- script_analysis: 剧本分镜分析
- character_extraction: 角色提取
- scene_extraction: 场景环境设计
- scene_architect: 场景空间架构
- prop_designer: 道具设计
- sound_composer: 声音与音乐设计
- deviation_check: 偏差检测与质量检查
- none: 纯信息查询，不需要执行管道

## 输出格式
只输出合法JSON，不要markdown代码块，不要额外文字：

{"intentCategory":"generate","confidence":0.9,"route":"full_pipeline","reasoning":"长剧本500+字，包含多个场景和角色，适合全管线处理"}`;

// ── Rule-based Router (DeepSeek fallback) ──────────

function ruleBasedRoute(action: string, scriptText?: string): {
  category: 'generate' | 'analyze' | 'fix' | 'query' | 'unknown';
  route: PipelineRoute | 'none';
  reasoning: string;
  confidence: number;
} {
  const lower = action.toLowerCase();

  // Fix actions
  if (/修复|重新生成|重试|改一下|调整prompt|再生|autofix|retry/i.test(lower)) {
    const shotMatch = action.match(/镜头\s*(\d+)/);
    return {
      category: 'fix',
      route: 'script_analysis',
      reasoning: shotMatch ? `用户要求修复镜头 ${shotMatch[1]}` : '用户要求修复/重新生成',
      confidence: 0.8,
    };
  }

  // Query actions
  if (/查看|检查|状态|进度|多少|怎么样|如何|怎么|help|帮助|能做什么/i.test(lower)) {
    return {
      category: 'query',
      route: 'none',
      reasoning: '信息查询，不需要执行管道',
      confidence: 0.9,
    };
  }

  // Analyze actions
  if (/分析|拆解|检查|查看|评估/i.test(lower)) {
    return {
      category: 'analyze',
      route: 'script_analysis',
      reasoning: '用户要求分析内容',
      confidence: 0.7,
    };
  }

  // Generate actions — route by text length
  if (scriptText && scriptText.length > 500) {
    return {
      category: 'generate',
      route: 'full_pipeline',
      reasoning: `长文本 ${scriptText.length} 字 → 全管线`,
      confidence: 0.85,
    };
  }
  if (scriptText && scriptText.length > 200) {
    return {
      category: 'generate',
      route: 'unified_pipeline',
      reasoning: `中等文本 ${scriptText.length} 字 → 统一管线`,
      confidence: 0.7,
    };
  }

  // Check for specific keywords in action
  if (/角色|人物|character/i.test(lower)) {
    return { category: 'generate', route: 'character_extraction', reasoning: '用户提到角色', confidence: 0.8 };
  }
  if (/场景|环境|scene/i.test(lower)) {
    return { category: 'generate', route: 'scene_extraction', reasoning: '用户提到场景', confidence: 0.8 };
  }
  if (/音乐|配乐|声音|sound|music|audio/i.test(lower)) {
    return { category: 'generate', route: 'sound_composer', reasoning: '用户提到音乐/声音', confidence: 0.8 };
  }
  if (/道具|prop/i.test(lower)) {
    return { category: 'generate', route: 'prop_designer', reasoning: '用户提到道具', confidence: 0.8 };
  }
  if (/空间|建筑|architect/i.test(lower)) {
    return { category: 'generate', route: 'scene_architect', reasoning: '用户提到空间架构', confidence: 0.8 };
  }

  // Default generate
  return {
    category: 'generate',
    route: scriptText && scriptText.length > 100 ? 'unified_pipeline' : 'script_analysis',
    reasoning: '默认路由：根据文本长度选择管道',
    confidence: 0.5,
  };
}

// ── Core Decision Function ─────────────────────────

export async function qDecide(
  request: QDecideRequest,
): Promise<QDecideResponse> {
  const t0 = Date.now();
  const trace: QDecisionStep[] = [];
  const projectId = request.projectId || 'default';

  // ── Step 1: Intent Understanding ──────────────────
  const t1 = Date.now();
  let intentResult: { category: QDecideResponse['intent']['category']; route: PipelineRoute | 'none'; reasoning: string; confidence: number };

  try {
    const llmRaw = await deepseekChat(
      INTENT_PROMPT,
      `用户请求: "${request.action}"\n${request.scriptText ? `\n相关文本 (前500字): ${request.scriptText.slice(0, 500)}` : ''}`,
      500,
    );
    if (llmRaw) {
      const jsonMatch = llmRaw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        intentResult = {
          category: parsed.intentCategory || 'unknown',
          route: parsed.route || 'none',
          reasoning: parsed.reasoning || 'LLM分析结果',
          confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.7)),
        };
      } else {
        intentResult = { ...ruleBasedRoute(request.action, request.scriptText), confidence: 0.5 };
      }
    } else {
      intentResult = { ...ruleBasedRoute(request.action, request.scriptText), confidence: 0.5 };
    }
  } catch {
    intentResult = { ...ruleBasedRoute(request.action, request.scriptText), confidence: 0.4 };
  }

  trace.push({
    step: 'intent',
    description: `DeepSeek → ${intentResult.category} (${Math.round(intentResult.confidence * 100)}%)`,
    result: { category: intentResult.category, route: intentResult.route, reasoning: intentResult.reasoning },
    durationMs: Date.now() - t1,
  });

  // ── Step 2: Route Decision with Memory ────────────
  const t2 = Date.now();
  let route: PipelineRoute | 'none' = intentResult.route;
  const alternatives: string[] = [];

  // Check memory for historical success patterns
  try {
    const historyMemories = qMemory.recall('pipeline_run succeeded', { projectId });
    if (historyMemories.length > 0 && request.scriptText) {
      const routeCounts = new Map<string, number>();
      for (const mem of historyMemories) {
        const detail = (mem.entry as any).detail || {};
        const prevRoute = detail.pipelineName || detail.route || '';
        if (prevRoute) routeCounts.set(prevRoute, (routeCounts.get(prevRoute) || 0) + 1);
      }
      // Sort by success count
      const sorted = [...routeCounts.entries()].sort((a, b) => b[1] - a[1]);
      for (const [r] of sorted) {
        if (r !== route && r !== 'none') alternatives.push(r);
      }
      // If memory strongly suggests a different route
      if (sorted[0] && sorted[0][1] >= 3 && sorted[0][0] !== route && sorted[0][0] !== 'none') {
        route = sorted[0][0] as PipelineRoute;
        intentResult.reasoning += `。历史最佳: ${route} (${sorted[0][1]}次成功)`;
      }
    }
  } catch {}

  trace.push({
    step: 'route',
    description: `Selected: ${route}`,
    result: { route, alternatives, reasoning: intentResult.reasoning },
    durationMs: Date.now() - t2,
  });

  // ── Step 3: Context Enrichment ────────────────────
  const t3 = Date.now();
  let memoriesRecalled = 0;
  const relevantMemories: { content: string; layer: string }[] = [];
  const knownIssues: string[] = [];

  try {
    const contextMemories = qMemory.recall(
      request.action + (request.scriptText?.slice(0, 100) || ''),
      { projectId },
    );
    memoriesRecalled = contextMemories.length;
    for (const m of contextMemories.slice(0, 5)) {
      const entry = m.entry as any;
      relevantMemories.push({
        content: entry.content?.slice(0, 150) || entry.detail?.report?.slice(0, 150) || JSON.stringify(entry).slice(0, 150),
        layer: m.layer,
      });
    }

    // Check semantic memory for known issues
    const issuePatterns = qMemory.recall('fix strategy', { projectId })
      .filter(m => m.layer === 'semantic');
    for (const m of issuePatterns.slice(0, 3)) {
      const fact = (m.entry as any).fact || (m.entry as any).content || '';
      if (fact) knownIssues.push(fact.slice(0, 200));
    }
  } catch {}

  trace.push({
    step: 'context',
    description: `${memoriesRecalled} memories, ${knownIssues.length} issues`,
    result: { memoriesRecalled, knownIssues },
    durationMs: Date.now() - t3,
  });

  // ── Step 4: Execution ─────────────────────────────
  const autoExecute = request.autoExecute !== false;
  let executionResult: QDecideResponse['execution'] | undefined;

  if (autoExecute && route !== 'none' && request.scriptText) {
    const t4 = Date.now();
    try {
      const pipeline = await import('../agent/pipeline.js');
      let result: unknown;

      switch (route) {
        case 'full_pipeline':
          result = await pipeline.runFullPipeline(request.scriptText, (request.params?.visualStyle as string));
          break;
        case 'unified_pipeline':
          result = await pipeline.runUnifiedPipeline(request.scriptText, (request.params?.visualStyle as string));
          break;
        case 'script_analysis':
          result = await pipeline.runScriptAnalysis(request.scriptText, (request.params?.visualStyle as string));
          break;
        case 'character_extraction':
          result = await pipeline.runCharacterExtraction(request.scriptText, (request.params?.visualStyle as string));
          break;
        case 'scene_extraction':
          result = await pipeline.runSceneExtraction(request.scriptText);
          break;
        case 'scene_architect':
          result = await pipeline.runSceneArchitect(request.scriptText);
          break;
        case 'prop_designer':
          result = await pipeline.runPropDesigner(request.scriptText);
          break;
        case 'sound_composer':
          result = await pipeline.runSoundComposer(request.scriptText);
          break;
        default:
          result = null;
      }

      const durationMs = Date.now() - t4;
      executionResult = {
        success: result !== null,
        result,
        durationMs,
      };

      // Record to episodic memory
      try {
        qMemory.episodicAdd(
          'pipeline_run',
          `Q Brain decided: ${route} → ${executionResult.success ? 'succeeded' : 'returned null'} (${durationMs}ms)`,
          {
            projectId,
            route,
            success: executionResult.success,
            durationMs,
            scriptLength: request.scriptText.length,
            action: request.action,
          },
          ['pipeline_run', executionResult.success ? 'succeeded' : 'failed', projectId],
          [],
        );
      } catch {}

      trace.push({
        step: 'execution',
        description: `${route} → ${executionResult.success ? 'OK' : 'null'} (${durationMs}ms)`,
        result: { success: executionResult.success, durationMs },
        durationMs,
      });
    } catch (err: any) {
      executionResult = {
        success: false,
        result: { error: err.message },
        durationMs: Date.now() - t4,
      };
      trace.push({
        step: 'execution',
        description: `${route} → FAILED: ${err.message}`,
        result: { success: false, error: err.message },
        durationMs: Date.now() - t4,
      });
    }
  } else if (autoExecute && route !== 'none' && !request.scriptText) {
    trace.push({
      step: 'execution',
      description: 'Skipped — no scriptText provided',
      result: { skipped: true, reason: 'no scriptText' },
      durationMs: 0,
    });
  }

  // ── Step 5: Validation ────────────────────────────
  const t5 = Date.now();
  let validation: QDecideResponse['validation'] | undefined;

  if (executionResult?.success) {
    try {
      const { detectDeviations } = await import('./q-detector.js');
      const devResult = await detectDeviations({
        projectId,
        shotNumber: (request.params?.shotNumber as number) || 1,
        assetUrls: [],
      });
      validation = {
        deviationsFound: devResult.deviationsFound,
        violationsFound: devResult.violations,
        suggestions: devResult.suggestions || [],
      };
    } catch {}

    // If violations exist, trigger cognitive cycle (background)
    if (validation && validation.violations > 0) {
      try {
        const { onPipelineComplete } = await import('./q-cognitive-engine.js');
        onPipelineComplete(projectId, (request.params?.shotNumber as number), {
          total: validation.deviationsFound,
          violations: validation.violations,
        }).catch(() => {});
      } catch {}
    }
  }

  trace.push({
    step: 'validation',
    description: validation
      ? `${validation.deviationsFound} deviations, ${validation.violations} violations`
      : 'Skipped — no execution or execution failed',
    result: validation || { skipped: true },
    durationMs: Date.now() - t5,
  });

  // ── Return ────────────────────────────────────────
  console.log('[q-decide] Complete:', intentResult.category, '→', route,
    executionResult ? `(${executionResult.success ? 'OK' : 'FAIL'})` : '(plan only)',
    `${Date.now() - t0}ms`);

  return {
    intent: {
      understood: intentResult.reasoning,
      confidence: intentResult.confidence,
      category: intentResult.category,
    },
    routing: {
      route,
      reasoning: intentResult.reasoning,
      alternatives,
    },
    context: {
      memoriesRecalled,
      relevantMemories,
      knownIssues,
    },
    execution: executionResult,
    validation,
    planOnly: !autoExecute,
    trace,
  };
}
