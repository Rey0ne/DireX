/* === QChat — Conversational Interface to the Q Brain === */
import { qMemory } from './q-memory.js';
import { getProjectSummary, getOrCreateProject } from './q-state.js';
import { generateSuggestions, type Suggestion } from './q-suggest.js';
import { generatePredictions } from './q-predict.js';
import { getDeviations } from './q-state.js';
import { getOrchestrationStats } from './q-orchestrate.js';
import { readJSON } from '../db/store.js';
import { FASHION_STYLE_DB, FASHION_COORDINATION_DB } from '../agent/style-db.js';
import type { LLMMessage, LLMTool, LLMToolCall, LLMToolResponse } from '../ai/deepseek.js';

// ── Types ────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'q' | 'system';
  text: string;
  ts: number;
}

export interface ChatContext {
  projectId?: string;
  recentMessages?: { role: string; text: string }[];
}

export interface ChatAction {
  type: 'execute_pipeline' | 'navigate' | 'open_panel' | 'generate' | 'none';
  route?: string;           // Pipeline route to execute
  params?: Record<string, unknown>;
  label: string;            // Human-readable action label
}

export interface ChatResponse {
  reply: string;
  suggestions?: string[];
  action?: ChatAction;      // Executable action Q brain decided to take
  context?: {
    projectId?: string;
    memoriesRecalled: number;
    projectSummary?: ReturnType<typeof getProjectSummary>;
    usedLLM: boolean;
  };
}

// ── Canvas State Reader ──────────────────────────

interface CanvasNodeSummary {
  byType: Record<string, number>;
  totalNodes: number;
  totalEdges: number;
  generatedAssets: number;
  recentGenerations: string[];
  /** Script/project text content from canvas nodes (titles + previews) */
  canvasTextIndex: string;
  /** Full shot node scripts (the main storyboard) */
  shotScripts: string[];
  /** Count of nodes that contain text */
  textNodeCount: number;
}

function getCanvasSummary(): CanvasNodeSummary | null {
  try {
    const raw = readJSON('canvas-state.json');
    const nodes = raw.nodes || [];
    const edges = raw.edges || [];

    const byType: Record<string, number> = {};
    let generatedAssets = 0;
    const recentGenerations: string[] = [];
    const textPreviews: string[] = [];
    const shotScripts: string[] = [];
    let textNodeCount = 0;

    for (const node of nodes) {
      const type = node.type || 'unknown';
      byType[type] = (byType[type] || 0) + 1;

      // Collect text content from all node types
      const title = node.title || '';
      const prompt = node.meta?.gen?.prompt || '';
      const content = node.meta?.content || '';
      const fullText = prompt || content;

      if (fullText.length > 20) {
        textNodeCount++;
        // Build a compact index: [type] title — first 100 chars
        const preview = fullText.replace(/\n/g, ' ').slice(0, 100);
        textPreviews.push(`[${type}] ${title || '(无标题)'} — ${preview}...`);

        // Shot nodes contain the main script/storyboard — capture full text
        if (type === 'shot' && fullText.length > 100) {
          shotScripts.push(fullText.slice(0, 3000)); // cap at 3000 chars each
        }
      }

      // Check for generated assets
      const gen = node.meta?.gen || {};
      const assets = gen.resultAssetUrls || gen.resultAssetIds || [];
      if (assets.length > 0) {
        generatedAssets++;
        if (recentGenerations.length < 5) {
          const model = gen.model || 'Unknown';
          recentGenerations.push(`${type}「${title || type}」→ ${model} (${assets.length} assets)`);
        }
      }
    }

    // Limit text index to avoid context overflow (max 30 entries, ~3KB)
    const canvasTextIndex = textPreviews.slice(0, 30).join('\n');

    return {
      byType, totalNodes: nodes.length, totalEdges: edges.length,
      generatedAssets, recentGenerations, canvasTextIndex,
      shotScripts, textNodeCount,
    };
  } catch {
    return null;
  }
}

function formatCanvasContext(canvas: CanvasNodeSummary): string {
  const typeBreakdown = Object.entries(canvas.byType)
    .map(([t, n]) => `${t}: ${n}个`)
    .join('、');
  const genLines = canvas.recentGenerations.length > 0
    ? `\n最近生成：\n${canvas.recentGenerations.map(g => `  • ${g}`).join('\n')}`
    : '';

  let result = `画布：${canvas.totalNodes}节点/${canvas.totalEdges}连线（${typeBreakdown}），其中${canvas.generatedAssets}个节点已有生成结果${genLines}`;

  // Include shot scripts (the main storyboard/project text)
  if (canvas.shotScripts.length > 0) {
    result += '\n\n## 画布上的剧本/分镜内容';
    for (let i = 0; i < canvas.shotScripts.length; i++) {
      result += `\n\n### Shot ${i + 1}\n${canvas.shotScripts[i]}`;
    }
  }

  // Include text index (titles + previews of other text nodes)
  if (canvas.canvasTextIndex) {
    result += '\n\n## 画布上其他节点的文本内容（标题+前100字预览）\n' + canvas.canvasTextIndex;
  }

  return result;
}

// ── Intent Detection ─────────────────────────────

type ChatIntent =
  | 'greeting'       // 你好/嗨/hello
  | 'project_status' // 项目状态/进度/节点数
  | 'deviations'     // 偏差/问题/质量
  | 'suggestions'    // 建议/推荐/下一步
  | 'predictions'    // 预测/预估
  | 'memory'         // 记忆/历史/之前
  | 'style'          // 风格/美术/视觉
  | 'help'           // 帮助/能做什么
  | 'generate_action'// 生成/创建/制作
  | 'fix_action'     // 修复/重新生成/重试
  | 'regenerate_section' // 重新生成某一项（角色/场景/分镜/音乐）
  | 'analyze_action' // 分析/检查/查看
  | 'general';       // 其他

function detectIntent(message: string): ChatIntent {
  const m = message.toLowerCase();
  if (/^(你好|嗨|hello|hi|hey|早上好|晚上好)[\s!！。.,，]*$/.test(m) || /^(你好|嗨|hello|hi|hey)/.test(m))
    return 'greeting';
  if (/项目|进度|状态|节点|画布|canvas|做了多少|完成|镜头数/.test(m))
    return 'project_status';
  if (/偏差|问题|质量|violation|deviation|错误|不对|出问题/.test(m))
    return 'deviations';
  if (/建议|推荐|下一步|接下来|怎么办|该做什么|怎么改进/.test(m))
    return 'suggestions';
  if (/预测|预估|还要多久|多久完成|还要花/.test(m))
    return 'predictions';
  if (/记忆|历史|之前|上次|过去|记得|回忆/.test(m))
    return 'memory';
  if (/风格|美术|视觉|色调|配色|审美|style|aesthetic/.test(m))
    return 'style';
  if (/帮助|能做什么|功能|help|怎么用|命令/.test(m))
    return 'help';
  if (/生成|创建|做|制作|产生|帮我生成|重新生成|再生成一次|再生一个/.test(m))
    return 'generate_action';
  if (/服装|衣服|穿搭|穿着|造型|换.*风格|太厚|太薄|太暗|太亮|材质|面料|廓形/.test(m))
    return 'regenerate_section';
  if (/修复|重新生成|重试|改一下|调整prompt|再来|再生/.test(m))
    return 'fix_action';
  if (/分析|检查|查看|看看|评估|检测/.test(m))
    return 'analyze_action';
  return 'general';
}

// ── Rule-based Response Generator (Fast Path / LLM fallback) ──

function ruleBasedReply(intent: ChatIntent, message: string, projectSummary?: ReturnType<typeof getProjectSummary>, canvas?: CanvasNodeSummary | null): ChatResponse {
  const ctx = { projectId: projectSummary?.project.projectId };
  const suggestions: string[] = [];

  switch (intent) {
    case 'greeting':
      return {
        reply: `你好！我是小Q ✨\n\n我是 DireX 的 AI 认知助手。我可以帮你：\n• 查看画布项目状态和进度\n• 检测生成结果中的偏差和问题\n• 提供创作建议和下一步行动\n• 回答关于当前项目的任何问题\n\n${projectSummary ? `我注意到你正在做「${projectSummary.project.name}」项目，有什么想了解的吗？` : '你目前还没有打开项目，可以先在画布上开始创作，我随时在。'}`,
        suggestions: projectSummary
          ? ['当前项目进度如何？', '有没有需要修复的问题？', '给我一些建议']
          : ['小Q 能做什么？'],
      };

    case 'project_status': {
      if (!projectSummary) {
        return {
          reply: '你还没有打开项目呢。先在画布上开始创作，我就能帮你跟踪项目状态了～',
          suggestions: ['怎么开始一个项目？'],
        };
      }
      const p = projectSummary.project.progress;
      const rate = projectSummary.completionRate;
      const emoji = rate >= 80 ? '🚀' : rate >= 50 ? '⚡' : rate >= 20 ? '🌱' : '🎬';
      suggestions.push('有哪些偏差需要处理？', '给我一些优化建议');
      return {
        reply: `${emoji} **${projectSummary.project.name}** 项目状态\n\n` +
          `📊 进度：${p.shotsGenerated}/${p.totalShots} 镜头（${rate}%）\n` +
          `✅ 已通过：${p.shotsApproved} 个镜头\n` +
          `⚠️ 有偏差：${p.shotsWithDeviations} 个镜头\n` +
          `💰 已花费：${p.totalCreditsSpent} 积分\n` +
          `⏱ 平均生成：${Math.round(p.avgGenerationMs / 1000)}s/镜头\n` +
          `🔢 ${canvas ? formatCanvasContext(canvas) : `画布节点：${projectSummary.project.canvasNodeCount} 个`}\n` +
          `📝 开放偏差：${projectSummary.openDeviations.total} 个（${projectSummary.openDeviations.violations} 严重）\n` +
          `🧠 Q记忆条目：${projectSummary.memory.episodic.total} 个`,
        suggestions,
        context: { projectId: ctx.projectId, memoriesRecalled: 0, projectSummary, usedLLM: false },
      };
    }

    case 'deviations': {
      if (!projectSummary) {
        return { reply: '你需要先打开一个项目，我才能检查偏差哦。' };
      }
      const od = projectSummary.openDeviations;
      if (od.total === 0) {
        return {
          reply: `✅ 太棒了！「${projectSummary.project.name}」项目目前没有开放偏差，所有生成的镜头都符合预期。`,
          suggestions: ['查看项目进度', '给我一些优化建议'],
        };
      }
      const devs = getDeviations(projectSummary.project.projectId, 'open');
      const top3 = devs.slice(0, 3);
      const devLines = top3.map(d =>
        `• 🚨 Shot ${d.shotNumber}: ${d.severity === 'VIOLATION' ? '🔴' : d.severity === 'DEVIATION' ? '🟡' : '🟢'} **${d.category}** — ${d.suggestion.slice(0, 80)}`
      ).join('\n');

      suggestions.push('怎么修复这些问题？', '触发自动修复');
      return {
        reply: `⚠️ 「${projectSummary.project.name}」有 **${od.total}** 个开放偏差（${od.violations} 严重 / ${od.deviations} 一般 / ${od.discrepancies} 轻微）\n\n${devLines}${od.total > 3 ? `\n\n…还有 ${od.total - 3} 个问题` : ''}`,
        suggestions,
        context: { projectId: ctx.projectId, memoriesRecalled: 0, projectSummary, usedLLM: false },
      };
    }

    case 'suggestions': {
      if (!projectSummary) {
        return { reply: '打开一个项目，我就能根据项目状态给你个性化建议了～' };
      }
      try {
        const sugs = generateSuggestions(projectSummary.project.projectId);
        if (sugs.length > 0) {
          const sugLines = sugs.slice(0, 4).map((s: Suggestion, i: number) =>
            `${i + 1}. **${s.title}** — ${s.body.slice(0, 100)}`
          ).join('\n\n');
          suggestions.push('查看项目进度', '检查偏差');
          return {
            reply: `💡 基于「${projectSummary.project.name}」当前状态，我有 ${sugs.length} 条建议：\n\n${sugLines}`,
            suggestions,
            context: { projectId: ctx.projectId, memoriesRecalled: 0, projectSummary, usedLLM: false },
          };
        }
      } catch {}
      return {
        reply: `「${projectSummary.project.name}」项目目前运行良好，没有特别需要提醒的事项。继续推进就好～`,
        suggestions: ['查看项目进度', '检查偏差'],
      };
    }

    case 'predictions': {
      if (!projectSummary) {
        return { reply: '需要先打开项目才能做预测哦。' };
      }
      try {
        const pred = generatePredictions(projectSummary.project.projectId);
        const lines: string[] = [];
        if (pred.estimatedRemainingMs > 0) {
          const min = Math.round(pred.estimatedRemainingMs / 60000);
          lines.push(`⏱ 预计剩余时间：约 ${min} 分钟`);
        }
        if (pred.estimatedCredits > 0) {
          lines.push(`💰 预计还需积分：${pred.estimatedCredits}`);
        }
        if (pred.completionDate) {
          lines.push(`📅 预计完成：${new Date(pred.completionDate).toLocaleString('zh-CN')}`);
        }
        if (pred.riskFactors && pred.riskFactors.length > 0) {
          lines.push(`\n⚠️ 风险因素：`);
          pred.riskFactors.forEach((r: string) => lines.push(`  • ${r}`));
        }
        return {
          reply: `🔮 「${projectSummary.project.name}」项目预测\n\n${lines.join('\n')}`,
          suggestions: ['查看项目进度', '给我一些建议'],
        };
      } catch {
        return { reply: '暂时无法生成预测，项目数据还不够充足。继续生成几个镜头后再试～' };
      }
    }

    case 'memory': {
      const memories = qMemory.recall(message, projectSummary ? { projectId: projectSummary.project.projectId } : {});
      if (memories.length === 0) {
        return {
          reply: '我翻了一下记忆，暂时没有找到相关内容。可能是因为项目刚开始，还没有积累足够的经验。\n\n每当你生成内容、修复问题，我都会记住，下次就能帮到你了。',
          suggestions: ['查看项目进度', '小Q 能记住什么？'],
        };
      }
      const topMem = memories.slice(0, 5).map(m =>
        `• [${m.layer}] ${m.entry.content?.slice(0, 120) || JSON.stringify(m.entry).slice(0, 120)}`
      ).join('\n');
      return {
        reply: `🧠 我回忆起 ${memories.length} 条相关记忆：\n\n${topMem}${memories.length > 5 ? `\n\n…还有 ${memories.length - 5} 条` : ''}`,
        suggestions: ['查看项目进度', '检查偏差'],
        context: { projectId: ctx.projectId, memoriesRecalled: memories.length, projectSummary, usedLLM: false },
      };
    }

    case 'style':
      return {
        reply: '我的风格知识库涵盖欧洲/日本/韩国先锋设计、奢侈品秀场、街头潮牌、搭配法则等多个维度。\n\n你可以直接跟我说具体需求——比如"我想要法国南部的慵懒度假风"或"这个角色的服装太厚重了"——我会从知识库里找到最匹配的品牌、面料、廓形、配色来给你建议。\n\n🎨 试试告诉我：\n• "换成 Miu Miu 那种故意不完美的少女感"\n• "要 Lemaire 的松弛知识分子风"\n• "用 2026 春夏的软结构趋势"',
        suggestions: ['查看项目进度', '当前项目状态', '重新生成角色服装'],
      };

    case 'regenerate_section': {
      // Detect which section from message
      const section = /角色|演员|人物|char/i.test(message) ? 'characters'
        : /场景|环境|scene/i.test(message) ? 'scenes'
        : /分镜|镜头|shot|storyboard/i.test(message) ? 'storyboard'
        : /音乐|声音|sound|music|suno/i.test(message) ? 'music'
        : 'characters'; // default: assume characters (most common complaint)
      const sectionLabel = section === 'characters' ? '角色' : section === 'scenes' ? '场景' : section === 'storyboard' ? '分镜' : '音乐';
      const action: ChatAction = {
        type: 'regenerate_section',
        route: 'regenerate_section',
        section,
        params: { section, userFeedback: message },
        label: `重新生成${sectionLabel}`,
      };
      return {
        reply: `收到！我帮你重新生成${sectionLabel}设计。\n\n我会根据你的反馈调整风格方向。完成后你可以在画布上查看更新结果。`,
        suggestions: ['查看项目进度', `重新生成${sectionLabel}`],
        action,
      };
    }

    case 'help':
      return {
        reply: '🤖 **小Q 能力清单**\n\n' +
          '我可以帮你做这些事：\n\n' +
          '📊 **项目监控** — 查看画布节点数、镜头进度、积分消耗\n' +
          '🔍 **偏差检测** — 自动发现生成结果与脚本的不一致\n' +
          '🔧 **自动修复** — 针对严重偏差自动调整提示词重新生成\n' +
          '💡 **智能建议** — 基于项目状态推荐下一步行动\n' +
          '🔮 **预测预估** — 估算剩余时间和积分消耗\n' +
          '🧠 **经验记忆** — 记住你每次的偏好和修复经验\n' +
          '🎨 **风格决策** — 5 维风格引擎帮你确定视觉方向\n' +
          '🪄 **自动编排** — 检测画布新节点并自动路由到对应管道\n\n' +
          '直接跟我聊天就行，我会根据你的项目状态给出最相关的回答。试试问我：\n' +
          '• "项目进度如何？"\n• "有什么需要修复的吗？"\n• "给我一些建议"',
        suggestions: ['项目进度如何？', '有什么问题需要处理？', '给我一些建议'],
      };

    case 'generate_action': {
      const action: ChatAction = {
        type: 'execute_pipeline',
        route: projectSummary ? 'full_pipeline' : 'unified_pipeline',
        params: { action: message },
        label: '开始生成',
      };
      return {
        reply: '收到！我来为你启动生成管线。',
        suggestions: ['查看项目进度', '检查偏差'],
        action,
      };
    }

    case 'fix_action': {
      const shotMatch = message.match(/镜头\s*(\d+)/);
      const shotNumber = shotMatch ? parseInt(shotMatch[1]) : undefined;
      const action: ChatAction = {
        type: 'execute_pipeline',
        route: 'script_analysis',
        params: { shotNumber, action: 'autofix' },
        label: shotNumber ? `修复镜头 ${shotNumber}` : '修复问题',
      };
      return {
        reply: shotNumber
          ? `好的，我来检查并修复镜头 ${shotNumber} 的问题。`
          : '我来检查项目中的问题并尝试修复。',
        suggestions: ['查看项目进度', '检查所有偏差'],
        action,
      };
    }

    case 'analyze_action': {
      const action: ChatAction = {
        type: 'execute_pipeline',
        route: 'script_analysis',
        params: { action: message },
        label: '开始分析',
      };
      return {
        reply: '我来分析一下当前的剧本和项目状态。',
        suggestions: ['查看分析结果', '下一步怎么做？'],
        action,
      };
    }

    default: // general
      suggestions.push('项目进度如何？', '小Q 能做什么？');
      if (projectSummary) {
        suggestions.push('有什么需要修复的问题吗？', '给我一些建议');
      }
      return {
        reply: `我理解你在问关于「${message.slice(0, 40)}」的问题。\n\n` +
          `目前我主要通过规则引擎来回答，对于复杂的开放性问题，建议你可以：\n` +
          `• 查看具体的项目数据（进度/偏差/建议）\n` +
          `• 在画布上操作，我会自动检测并给出反馈\n` +
          (projectSummary ? `\n当前你正在做「${projectSummary.project.name}」项目（${projectSummary.completionRate}% 完成），有什么具体想了解的吗？` : ''),
        suggestions,
      };
  }
}

// ── Main Chat Handler ─────────────────────────────

let LLM_CHAT: ((systemPrompt: string, userPrompt: string) => Promise<string | null>) | null = null;
let LLM_CHAT_TOOLS: ((messages: LLMMessage[], tools: LLMTool[], maxTokens?: number) => Promise<LLMToolResponse | null>) | null = null;

/**
 * Set the LLM chat function for AI-powered responses.
 * Call this during server init to wire up DeepSeek or another LLM.
 */
export function setLLMChat(fn: (systemPrompt: string, userPrompt: string) => Promise<string | null>): void {
  (LLM_CHAT as any) = fn;
}

/**
 * Set the LLM chat function with tool-calling support.
 * When set, chat() will use this for memory tool operations.
 */
export function setLLMChatWithTools(
  fn: (messages: LLMMessage[], tools: LLMTool[], maxTokens?: number) => Promise<LLMToolResponse | null>,
): void {
  (LLM_CHAT_TOOLS as any) = fn;
}

// ── Memory Tools (AgeMem-inspired: 6 tools mapped to qMemory) ──

export const MEMORY_TOOLS: LLMTool[] = [
  {
    type: 'function',
    function: {
      name: 'q_memory_store',
      description: '把重要信息存入长期记忆。当你学到用户偏好、项目关键信息、或修复经验时主动调用。',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: '要存储的内容，一句话总结' },
          type: { type: 'string', enum: ['user_preference', 'project_info', 'fix_strategy', 'quality_issue', 'style_insight', 'workflow_learning'], description: '记忆类型' },
          importance: { type: 'number', description: '重要性 0-1，默认 0.5', default: 0.5 },
          tags: { type: 'array', items: { type: 'string' }, description: '标签，方便后续检索' },
        },
        required: ['content', 'type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'q_memory_recall',
      description: '从记忆中搜索相关信息。在回答用户问题前，先检查是否有相关的历史记忆。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词' },
          limit: { type: 'number', description: '返回条数上限，默认 5', default: 5 },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'q_memory_update',
      description: '更新已有记忆条目。当学到的信息修正了之前的记忆时使用。',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: '用于模糊匹配已有记忆的关键词' },
          new_content: { type: 'string', description: '新的内容' },
          importance: { type: 'number', description: '新的重要性评分 0-1' },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'q_memory_forget',
      description: '删除过时或不正确的记忆条目。',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: '用于模糊匹配要删除的记忆内容' },
        },
        required: ['content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'q_memory_summarize',
      description: '总结最近的记忆或对话上下文，提炼关键信息，减少上下文长度。当对话较长或需要压缩时使用。',
      parameters: {
        type: 'object',
        properties: {
          topic: { type: 'string', description: '要总结的主题或时间段，如"刚才的讨论"、"今天的项目进展"' },
        },
        required: ['topic'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'q_memory_filter',
      description: '检查并报告记忆中与当前话题无关或可能产生干扰的内容，便于清理。',
      parameters: {
        type: 'object',
        properties: {
          criterion: { type: 'string', description: '当前相关的话题关键词，用来判断哪些记忆相关' },
        },
        required: ['criterion'],
      },
    },
  },
];

// ── Memory Tool Executor ──────────────────────────

interface ToolCallResult {
  tool_call_id: string;
  role: 'tool';
  content: string;
}

async function executeMemoryTool(toolCall: LLMToolCall, projectId?: string): Promise<ToolCallResult> {
  const { name, arguments: argsStr } = toolCall.function;
  let args: Record<string, unknown> = {};
  try { args = JSON.parse(argsStr); } catch { /* use empty args */ }

  const content = await executeMemoryToolByName(name, args, projectId);
  return { tool_call_id: toolCall.id, role: 'tool', content };
}

export async function executeMemoryToolByName(
  name: string,
  args: Record<string, unknown>,
  projectId?: string,
): Promise<string> {
  try {
    switch (name) {
      case 'q_memory_store': {
        const content = String(args.content || '');
        const type = (args.type as string) || 'user_preference';
        const importance = Number(args.importance ?? 0.5);
        const tags = Array.isArray(args.tags) ? args.tags.map(String) : [];
        const detail: Record<string, unknown> = { source: 'q_chat_tool', importance };
        if (projectId) detail.projectId = projectId;

        const mapping: Record<string, string> = {
          user_preference: 'user_action',
          project_info: 'system_event',
          fix_strategy: 'autofix_attempt',
          quality_issue: 'deviation_found',
          style_insight: 'user_action',
          workflow_learning: 'system_event',
        };
        const episodicType = (mapping[type] || 'user_action') as import('./q-memory.js').EpisodicType;

        const entry = qMemory.episodicAdd(episodicType, content, detail, tags, []);
        return `✅ 已存储记忆 [${entry.id.slice(0, 8)}]: "${content}" (重要性: ${importance})`;
      }

      case 'q_memory_recall': {
        const query = String(args.query || '');
        const limit = Math.min(Number(args.limit ?? 5), 10);
        const results = qMemory.recall(query, projectId ? { projectId } : {});
        const top = results.slice(0, limit);
        if (!top.length) return `未找到与"${query}"相关的记忆。`;
        return top.map((r, i) =>
          `[${i + 1}] [${r.layer}] ${typeof r.entry === 'object' && 'content' in r.entry ? r.entry.content : String(r.entry)} (相关度: ${r.score.toFixed(2)})`,
        ).join('\n');
      }

      case 'q_memory_update': {
        const searchContent = String(args.content || '');
        const newContent = String(args.new_content || args.content || '');
        const importance = Number(args.importance ?? -1);

        // Search for matching episodic entry
        const results = qMemory.recall(searchContent, projectId ? { projectId } : {});
        const episodicResults = results.filter(r => r.layer === 'episodic');

        if (!episodicResults.length) {
          // No match found — store as new instead
          const entry = qMemory.episodicAdd('user_action', newContent,
            { source: 'q_chat_tool_update', projectId }, [], []);
          return `⚠️ 未找到匹配的记忆，已作为新记忆存储 [${entry.id.slice(0, 8)}]: "${newContent}"`;
        }

        // Found match — add new version with higher confidence
        const best = episodicResults[0].entry as import('./q-memory.js').QEpisodicEntry;
        const entry = qMemory.episodicAdd('user_action', newContent,
          { source: 'q_chat_tool_update', replacedId: best.id, projectId },
          importance > 0 ? ['updated', `importance_${importance}`] : ['updated'],
          [best.id],
        );
        return `✅ 已更新记忆: "${newContent}" (替换旧版本 [${best.id.slice(0, 8)}])`;
      }

      case 'q_memory_forget': {
        const searchContent = String(args.content || '');
        const results = qMemory.recall(searchContent, projectId ? { projectId } : {});
        const episodicResults = results.filter(r => r.layer === 'episodic');

        if (!episodicResults.length) {
          return `未找到与"${searchContent}"匹配的记忆，无需删除。`;
        }

        // Delete matched entries
        let deleted = 0;
        for (const r of episodicResults.slice(0, 3)) {
          const entry = r.entry as import('./q-memory.js').QEpisodicEntry;
          try {
            qMemory.forget(entry.id);
            deleted++;
          } catch { /* skip if can't delete */ }
        }
        return `✅ 已删除 ${deleted} 条匹配"${searchContent}"的记忆。`;
      }

      case 'q_memory_summarize': {
        const topic = String(args.topic || '最近的对话');
        const results = qMemory.recall(topic, projectId ? { projectId } : {});
        const top = results.slice(0, 10);

        if (!top.length) return `没有与"${topic}"相关的记忆需要总结。`;

        const summary = top.map((r, i) => {
          const content = typeof r.entry === 'object' && 'content' in r.entry
            ? r.entry.content : String(r.entry);
          return `${i + 1}. ${content}`;
        }).join('\n');

        return `## 记忆总结：「${topic}」\n\n${summary}\n\n（共 ${results.length} 条相关记忆，此处展示前 ${top.length} 条）`;
      }

      case 'q_memory_filter': {
        const criterion = String(args.criterion || '');
        const results = qMemory.recall('', projectId ? { projectId } : {});
        const all = results.slice(0, 20);

        const relevant: string[] = [];
        const irrelevant: string[] = [];

        for (const r of all) {
          const content = typeof r.entry === 'object' && 'content' in r.entry
            ? (r.entry as any).content || '' : String(r.entry);
          const tags = typeof r.entry === 'object' && 'tags' in r.entry
            ? (r.entry as any).tags?.join(' ') || '' : '';

          const haystack = (content + ' ' + tags).toLowerCase();
          if (haystack.includes(criterion.toLowerCase())) {
            relevant.push(`✅ ${content}`);
          } else if (content.length > 10) {
            irrelevant.push(`🔇 ${content}`);
          }
        }

        return `## 记忆过滤：「${criterion}」\n\n### 相关 (${relevant.length} 条)\n${relevant.join('\n') || '(无)'}\n\n### 不相关 (${irrelevant.length} 条)\n${irrelevant.join('\n') || '(无)'}`;
      }

      default:
        return `未知工具: ${name}`;
    }
  } catch (err: any) {
    return `工具执行失败: ${String(err).slice(0, 200)}`;
  }
}

const Q_SYSTEM_PROMPT = `你是小Q，DireX AI 内容制作管线的认知助手。你的身份是一个漂浮在画布上的玻璃球精灵。

## 你的能力
- 监控画布项目状态（节点数、镜头进度、积分消耗）
- 检测生成结果与脚本的偏差（VIOLATION/DEVIATION/DISCREPANCY 三级）
- 提供创作建议和下一步行动
- 5维风格决策（时代/地域/功能/情绪/身份 → 70/20/10 混搭法则）
- 记忆用户偏好和修复经验
- **主动管理记忆**：你可以调用记忆工具来存储、检索、更新、总结和过滤信息

## 记忆工具使用原则 + 行为范例

你有 6 个记忆工具。以下是从高质量对话中提取的标准行为模式，**请严格参照执行**：

- 模式1「新项目/新信息」: 先 recall 再 store。用户带来新项目时先查有无相关记忆，确认没有后才 store 关键信息（角色、场景、风格偏好，importance 0.8-0.9）。
- 模式2「修正偏好」: recall + update（不是重新 store!）。用户改变设定时先 recall 找旧记忆，用 update 替换，然后告诉用户变更了什么vs保留了什么。
- 模式3「纠正错误」: recall → 基于事实纠正。用户说错了（"女主角是卖包子的吧？"、"故事在成都对吧？"），不要附和，先查记忆再用事实纠正。
- 模式4「执行任务」: 先 recall 所有相关记忆 → 再综合回答。用户要求设计/分析时，必须先全面 recall，基于记忆中的信息给出方案，引用记忆中的每个关键点。
- 模式5「确认状态」: recall → 展示最新版本。用户怕记混时查记忆展示当前最新状态，标注哪些已更新、哪些保持不变，不要凭感觉回答。
- 模式6「清理过时」: forget + store 新。旧设定完全作废时先 forget 旧记忆再 store 新的，然后确认旧已删除+新已存储。

辅助工具: q_memory_summarize 用于对话超过5轮时整理要点；q_memory_filter 用于用户消息混杂无关内容时分离相关与噪音。

关键禁忌: 闲聊/问候/帮助询问不碰工具；不要未 recall 就直接 store；不要重复 store 相同信息；修正偏好用 update 不是 store 新+留旧的。

## 回答原则
- 用中文回复，简洁友好，像朋友聊天
- 如果用户问了项目相关的问题，给出具体的数据而不是泛泛而谈
- 每次回答控制在 200 字以内，除非用户明确需要详细信息
- 如果你不确定某个数据，诚实地说"我查一下"而不是编造
- 在回复末尾可以给 2-3 个建议追问（用简短的问题形式）

## 可执行动作
当用户明确要求执行操作时（生成、分析、修复），在回复末尾用特殊标记输出动作指令。
格式：<!--ACTION:{"type":"execute_pipeline","route":"full_pipeline","label":"开始生成"}-->

可用的 route 值：
- full_pipeline: 全管线（角色+场景+分镜+音乐+道具，并行）
- unified_pipeline: 统一管线（一次调用输出全部）
- script_analysis: 剧本分镜分析
- character_extraction: 角色提取
- scene_extraction: 场景环境设计
- scene_architect: 场景空间架构
- prop_designer: 道具设计
- sound_composer: 声音与音乐设计
- deviation_check: 偏差检测与修复

如果用户只是询问信息，不要输出动作标记。

## 当前上下文
项目状态和记忆会在用户消息中提供。`;

export async function chat(
  message: string,
  context: ChatContext = {},
): Promise<ChatResponse> {
  const intent = detectIntent(message);
  let projectSummary: ReturnType<typeof getProjectSummary> | undefined;
  let memoriesRecalled = 0;

  // Get project state if projectId provided
  if (context.projectId) {
    try {
      projectSummary = getProjectSummary(context.projectId);
    } catch {
      // Project may not exist yet — that's fine
    }
  } else {
    // Try to detect project from memory
    try {
      const stats = qMemory.stats();
      if (stats.episodic.total > 0) {
        // Look for recent project IDs in memory
        const recentMem = qMemory.recall('project', {});
        if (recentMem.length > 0) {
          const pid = (recentMem[0].entry as any).detail?.projectId;
          if (pid) {
            try {
              projectSummary = getProjectSummary(pid);
            } catch {}
          }
        }
      }
    } catch {}
  }

  // ── Read canvas state (real-time, covers all content) ──
  const canvas = getCanvasSummary();

  // ── Build user prompt context ──
  const buildUserPrompt = () => {
    let userPrompt = `用户说：「${message}」`;
    if (projectSummary) {
      const p = projectSummary;
      userPrompt += `\n\n当前项目：「${p.project.name}」
进度：${p.project.progress.shotsGenerated}/${p.project.progress.totalShots} 镜头（${p.completionRate}%）
开放偏差：${p.openDeviations.total}（${p.openDeviations.violations} 严重）
Q记忆条目：${p.memory.episodic.total} 个`;
    }
    if (canvas) {
      userPrompt += `\n\n${formatCanvasContext(canvas)}`;
    }
    if (context.recentMessages && context.recentMessages.length > 0) {
      userPrompt += '\n\n最近对话：\n' + context.recentMessages
        .slice(-6)
        .map(m => `[${m.role}]: ${m.text}`)
        .join('\n');
    }
    return userPrompt;
  };

  // ── Style knowledge base injection ──
  const styleIntent = intent === 'style' || intent === 'regenerate_section';
  const systemPrompt = styleIntent
    ? Q_SYSTEM_PROMPT + `\n\n## 风格知识库（当用户询问服装/穿搭/风格时参考，给出具体品牌/面料/廓形/配色建议）\n\n${FASHION_STYLE_DB}\n\n${FASHION_COORDINATION_DB}`
    : Q_SYSTEM_PROMPT;

  // ── Fast path: simple intents use basic LLM_CHAT without tools ──
  const fastIntents: ChatIntent[] = ['greeting', 'help'];
  if (fastIntents.includes(intent) || !LLM_CHAT_TOOLS) {
    if (LLM_CHAT) {
      try {
        const llmReply = await LLM_CHAT(systemPrompt, buildUserPrompt());
        if (llmReply) {
          const { replyText, action } = parseActionMarker(llmReply);
          return {
            reply: replyText,
            suggestions: generateFollowUps(intent, projectSummary),
            action,
            context: { projectId: context.projectId, memoriesRecalled, projectSummary, usedLLM: true },
          };
        }
      } catch { /* fall through */ }
    }
    return ruleBasedReply(intent, message, projectSummary, canvas);
  }

  // ── Tool-calling path: use LLM_CHAT_TOOLS with memory tools ──
  try {
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: buildUserPrompt() },
    ];

    let llmResponse = await LLM_CHAT_TOOLS(messages, MEMORY_TOOLS, 800);
    if (!llmResponse) {
      // Fall back to basic LLM_CHAT
      if (LLM_CHAT) {
        const fallback = await LLM_CHAT(systemPrompt, buildUserPrompt());
        if (fallback) {
          const { replyText, action } = parseActionMarker(fallback);
          return {
            reply: replyText,
            suggestions: generateFollowUps(intent, projectSummary),
            action,
            context: { projectId: context.projectId, memoriesRecalled, projectSummary, usedLLM: true },
          };
        }
      }
      return ruleBasedReply(intent, message, projectSummary, canvas);
    }

    // ── Tool-call loop (max 3 rounds) ──
    let toolLoop = 0;
    const MAX_TOOL_ROUNDS = 3;

    while (llmResponse.toolCalls && llmResponse.toolCalls.length > 0 && toolLoop < MAX_TOOL_ROUNDS) {
      toolLoop++;
      console.log('[q-chat] Tool calls round ' + toolLoop + ': ' + llmResponse.toolCalls.map(t => t.function.name).join(', '));

      // Add assistant message with tool_calls (DeepSeek OpenAI-compatible format)
      messages.push({
        role: 'assistant',
        content: llmResponse.content || null,
        tool_calls: llmResponse.toolCalls || undefined,
      } as any);

      // Execute each tool call
      const toolResults: ToolCallResult[] = [];
      for (const tc of llmResponse.toolCalls) {
        const result = await executeMemoryTool(tc, context.projectId);
        toolResults.push(result);
      }

      // Add tool results to messages
      for (const tr of toolResults) {
        messages.push(tr as any);
      }

      // Count memory operations
      const memOps = llmResponse.toolCalls.filter(t =>
        ['q_memory_recall', 'q_memory_store', 'q_memory_update', 'q_memory_summarize'].includes(t.function.name),
      );
      memoriesRecalled += memOps.length;

      // Continue conversation
      llmResponse = await LLM_CHAT_TOOLS(messages, MEMORY_TOOLS, 800);
      if (!llmResponse) break;
    }

    // ── Final reply ──
    const finalContent = llmResponse?.content;
    if (finalContent) {
      const { replyText, action } = parseActionMarker(finalContent);
      return {
        reply: replyText,
        suggestions: generateFollowUps(intent, projectSummary),
        action,
        context: {
          projectId: context.projectId,
          memoriesRecalled,
          projectSummary,
          usedLLM: true,
        },
      };
    }

    // No content in final response — fall through
  } catch (err: any) {
    console.log('[q-chat] Tool-calling path failed:', String(err).slice(0, 100));
  }

  // ── Rule-based fallback ──
  return ruleBasedReply(intent, message, projectSummary, canvas);
}

// ── Action marker parser (shared) ──

function parseActionMarker(text: string): { replyText: string; action?: ChatAction } {
  let replyText = text;
  let action: ChatAction | undefined;
  const actionMatch = replyText.match(/<!--ACTION:\s*(\{[\s\S]*?\})\s*-->/);
  if (actionMatch) {
    try {
      action = JSON.parse(actionMatch[1]) as ChatAction;
      replyText = replyText.replace(/<!--ACTION:\s*\{[\s\S]*?\}\s*-->/, '').trim();
    } catch { /* parse failure → no action */ }
  }
  return { replyText, action };
}

function generateFollowUps(intent: ChatIntent, projectSummary?: ReturnType<typeof getProjectSummary>): string[] {
  const all = projectSummary
    ? ['查看项目进度', '有什么需要修复的问题？', '给我一些建议', '预估剩余时间']
    : ['小Q 能做什么？', '怎么开始一个项目？'];
  // Return 2-3 that don't overlap with the current intent
  switch (intent) {
    case 'project_status': return all.filter(s => !s.includes('进度')).slice(0, 3);
    case 'deviations': return all.filter(s => !s.includes('修复') && !s.includes('问题')).slice(0, 3);
    case 'suggestions': return all.filter(s => !s.includes('建议')).slice(0, 3);
    default: return all.slice(0, 3);
  }
}
