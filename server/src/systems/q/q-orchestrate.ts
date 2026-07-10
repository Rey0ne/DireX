/* === QOrchestrate — Auto-Orchestration Engine === */
import { qMemory } from './q-memory.js';
import {
  getOrCreateProject,
  getProjectSummary,
  type QProject,
} from './q-state.js';
import { push, buildNotification } from './q-notification.js';

// ── Types ────────────────────────────────────────

export type NodeType =
  | 'text'          // text/script input → triggers pipeline
  | 'image'         // generated image → triggers deviation check
  | 'video'         // generated video
  | 'audio'         // generated audio
  | 'group'         // node group
  | 'unknown';

export interface CanvasNode {
  id: string;
  type: string;
  data?: Record<string, unknown>;
  position?: { x: number; y: number };
}

export type PipelineRoute =
  | 'script_analysis'       // runScriptAnalysis
  | 'character_extraction'  // runCharacterExtraction
  | 'scene_extraction'      // runSceneExtraction
  | 'scene_architect'       // runSceneArchitect
  | 'prop_designer'         // runPropDesigner
  | 'sound_composer'        // runSoundComposer
  | 'full_pipeline'         // runFullPipeline
  | 'text_pipeline'         // runTextPipeline
  | 'unified_pipeline'      // runUnifiedPipeline
  | 'deviation_check'       // trigger deviation detection
  | 'none';                 // no action needed

export interface OrchestrationDecision {
  nodeId: string;
  nodeType: NodeType;
  route: PipelineRoute;
  confidence: number;
  reasoning: string;
  /** Pipeline args to execute */
  args?: Record<string, unknown>;
  /** Dependencies that should be generated first */
  dependencies: string[];
}

// ── State ────────────────────────────────────────

/** Track which nodes have been orchestrated to avoid re-triggering */
const orchestratedNodes = new Map<string, { route: PipelineRoute; at: string }>();
const MAX_ORCHESTRATED = 500;

/**
 * Classify a canvas node by its type and data.
 */
export function classifyNode(node: CanvasNode): NodeType {
  const type = node.type?.toLowerCase() || '';
  const data = node.data || {};

  // Text/script nodes
  if (type === 'text' || type === 'textnode' || type === 'notenode') {
    return 'text';
  }

  // Image nodes
  if (type === 'image' || type === 'imagenode' || type === 'resultnode') {
    return 'image';
  }

  // Check node data for clues
  if (data.scriptText || data.rawText) {
    return 'text';
  }
  if (data.imageUrl || data.imageUrls || data.resultUrl) {
    return 'image';
  }
  if (data.videoUrl) return 'video';
  if (data.audioUrl) return 'audio';
  if (type === 'group' || type === 'groupnode') return 'group';

  return 'unknown';
}

/**
 * For a text node, extract the text content to determine pipeline routing.
 */
function extractTextContent(node: CanvasNode): string {
  const data = node.data || {};
  return String(data.scriptText || data.rawText || data.text || data.content || '');
}

/**
 * Decide which pipeline to route a text node to based on content analysis.
 */
function decideTextRoute(node: CanvasNode, project: QProject): OrchestrationDecision {
  const text = extractTextContent(node);
  const textLen = text.length;
  let route: PipelineRoute = 'script_analysis';
  let confidence = 0.5;
  let reasoning = '';

  // Short text → text pipeline (quick generation)
  if (textLen < 200) {
    route = 'text_pipeline';
    confidence = 0.8;
    reasoning = `Short text (${textLen} chars) → text pipeline for quick generation`;
  }
  // Long text → full pipeline with analysis
  else if (textLen > 500) {
    // Check if project already has script analysis
    if (project.scriptStructure?.shots?.length) {
      route = 'full_pipeline';
      confidence = 0.7;
      reasoning = `Long script (${textLen} chars) → full pipeline (已有 ${project.scriptStructure.shots.length} 个分镜)`;
    } else {
      route = 'full_pipeline';
      confidence = 0.85;
      reasoning = `New long script (${textLen} chars) → full pipeline`;
    }
  }
  // Medium text → unified pipeline (balanced)
  else {
    route = 'unified_pipeline';
    confidence = 0.65;
    reasoning = `Medium script (${textLen} chars) → unified pipeline`;
  }

  // Recall: what pipeline worked best for similar content length?
  const historyRecall = qMemory.recall('pipeline_run succeeded', {});
  const similarLength = historyRecall.filter(m => {
    const entryDetail = (m.entry as any).detail || {};
    const prevLen = entryDetail.scriptLength || 0;
    return Math.abs(prevLen - textLen) < (prevLen * 0.5);
  });

  if (similarLength.length > 0) {
    // Bias toward the pipeline type that succeeded most
    const routeCounts = new Map<string, number>();
    for (const mem of similarLength) {
      const entryDetail = (mem.entry as any).detail || {};
      const r = entryDetail.pipelineName || 'script_analysis';
      routeCounts.set(r, (routeCounts.get(r) || 0) + 1);
    }
    const bestRoute = [...routeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (bestRoute && bestRoute[1] >= 2) {
      route = bestRoute[0] as PipelineRoute;
      confidence = Math.max(confidence, 0.7);
      reasoning += `. 历史偏好: ${bestRoute[0]} (${bestRoute[1]}次成功)`;
    }
  }

  return {
    nodeId: node.id,
    nodeType: 'text',
    route,
    confidence,
    reasoning,
    dependencies: [],
  };
}

/**
 * Decide pipeline routing for an image node.
 * Image nodes typically trigger deviation checks, not pipeline runs.
 */
function decideImageRoute(
  node: CanvasNode,
  project: QProject,
): OrchestrationDecision {
  const data = node.data || {};

  // If image has a shot reference, check for deviations
  if (data.shotNumber !== undefined || data.shot !== undefined) {
    return {
      nodeId: node.id,
      nodeType: 'image',
      route: 'deviation_check',
      confidence: 0.6,
      reasoning: 'Generated image with shot reference → check for deviations',
      dependencies: [],
    };
  }

  return {
    nodeId: node.id,
    nodeType: 'image',
    route: 'none',
    confidence: 1.0,
    reasoning: 'Image node without shot reference → no action needed',
    dependencies: [],
  };
}

// ── Orchestration Options ──────────────────────────

export interface OrchestrationOptions {
  /** If true, automatically execute pipelines for text nodes (fire-and-forget) */
  autoExecute?: boolean;
  /** Script text to pass to pipeline when auto-executing */
  scriptText?: string;
  /** Visual style hint */
  visualStyle?: string;
}

/**
 * Detect new canvas nodes and return orchestration decisions.
 * Only nodes that haven't been processed before are included.
 *
 * When options.autoExecute is true, text nodes that route to a pipeline
 * will be auto-executed (fire-and-forget, does not block return).
 */
export function detectAndRoute(
  nodes: CanvasNode[],
  projectId: string,
  options?: OrchestrationOptions,
): OrchestrationDecision[] {
  const project = getOrCreateProject(projectId);
  const decisions: OrchestrationDecision[] = [];

  for (const node of nodes) {
    // Skip already-orchestrated nodes
    if (orchestratedNodes.has(node.id)) {
      continue;
    }

    const nodeType = classifyNode(node);
    let decision: OrchestrationDecision;

    switch (nodeType) {
      case 'text':
        decision = decideTextRoute(node, project);
        break;
      case 'image':
        decision = decideImageRoute(node, project);
        break;
      case 'video':
      case 'audio':
      case 'group':
      case 'unknown':
      default:
        decision = {
          nodeId: node.id,
          nodeType,
          route: 'none',
          confidence: 1.0,
          reasoning: `Node type "${nodeType}" → no auto-routing needed`,
          dependencies: [],
        };
        break;
    }

    // Notify if a meaningful route was decided
    if (decision.route !== 'none') {
      push(buildNotification('SUGGESTION', {
        title: `🔀 自动路由：${decision.route.replace(/_/g, ' ')}`,
        body: `${nodeType}节点 → ${decision.route} · ${decision.reasoning}`,
        severity: 'info',
        actionable: true,
        actionId: node.id,
        actionLabel: '执行管道',
      }));

      // Remember in episodic memory
      qMemory.episodicAdd(
        'system_event',
        `Orchestrated ${nodeType} node "${node.id}" → ${decision.route}`,
        { nodeId: node.id, nodeType, route: decision.route, projectId },
        ['orchestration', nodeType, projectId],
        [],
      );

      // Mark as orchestrated
      recordOrchestration(node.id, decision.route);

      // Auto-execute if configured (fire-and-forget, don't block canvas sync)
      if (options?.autoExecute && decision.route !== 'none' && decision.route !== 'deviation_check') {
        const scriptContent = options.scriptText || extractTextContent(node);
        executeOrchestration(decision, scriptContent, options.visualStyle)
          .then(result => {
            if (result) {
              console.log(`[q-orchestrate] Auto-executed ${decision.route} for node ${node.id}`);
              push(buildNotification('GENERATION_COMPLETE', {
                title: `✅ 自动执行完成: ${decision.route.replace(/_/g, ' ')}`,
                body: `节点 ${node.id} 的管道执行完成`,
                severity: 'success',
                actionable: true,
                actionId: node.id,
                actionLabel: '查看结果',
              }));
            }
          })
          .catch(err => {
            console.error(`[q-orchestrate] Auto-execute failed for ${node.id}:`, err.message);
          });
      }
    }

    decisions.push(decision);
  }

  return decisions;
}

/**
 * Execute an orchestration decision by calling the appropriate pipeline.
 * Returns the pipeline result or null if not executable.
 */
export async function executeOrchestration(
  decision: OrchestrationDecision,
  scriptText?: string,
  visualStyle?: string,
): Promise<{ route: PipelineRoute; result: any } | null> {
  // Dynamic import to avoid circular dependency at module level
  const pipeline = await import('../agent/pipeline.js');

  switch (decision.route) {
    case 'script_analysis':
      if (scriptText) {
        const result = await pipeline.runScriptAnalysis(scriptText, visualStyle);
        return { route: decision.route, result };
      }
      break;
    case 'character_extraction':
      if (scriptText) {
        const result = await pipeline.runCharacterExtraction(scriptText, visualStyle);
        return { route: decision.route, result };
      }
      break;
    case 'scene_extraction':
      if (scriptText) {
        const result = await pipeline.runSceneExtraction(scriptText);
        return { route: decision.route, result };
      }
      break;
    case 'scene_architect':
      if (scriptText) {
        const result = await pipeline.runSceneArchitect(scriptText);
        return { route: decision.route, result };
      }
      break;
    case 'prop_designer':
      if (scriptText) {
        const result = await pipeline.runPropDesigner(scriptText);
        return { route: decision.route, result };
      }
      break;
    case 'sound_composer':
      if (scriptText) {
        const result = await pipeline.runSoundComposer(scriptText);
        return { route: decision.route, result };
      }
      break;
    case 'full_pipeline':
      if (scriptText) {
        const result = await pipeline.runFullPipeline(scriptText, visualStyle);
        return { route: decision.route, result };
      }
      break;
    case 'text_pipeline':
      if (scriptText) {
        const result = await pipeline.runTextPipeline({
          userInput: scriptText,
          model: 'gemini-2.5-pro',
        });
        return { route: decision.route, result };
      }
      break;
    case 'unified_pipeline':
      if (scriptText) {
        const result = await pipeline.runUnifiedPipeline({
          userInput: scriptText,
          model: 'gemini-2.5-pro',
        });
        return { route: decision.route, result };
      }
      break;
    default:
      break;
  }

  return null;
}

// ── Track orchestrated nodes ────────────────────

function recordOrchestration(nodeId: string, route: PipelineRoute): void {
  orchestratedNodes.set(nodeId, {
    route,
    at: new Date().toISOString(),
  });

  // Prune old entries
  if (orchestratedNodes.size > MAX_ORCHESTRATED) {
    const keys = [...orchestratedNodes.keys()];
    for (let i = 0; i < Math.floor(MAX_ORCHESTRATED * 0.2); i++) {
      orchestratedNodes.delete(keys[i]);
    }
  }
}

/**
 * Check if a node has already been orchestrated.
 */
export function isOrchestrated(nodeId: string): boolean {
  return orchestratedNodes.has(nodeId);
}

/**
 * Reset orchestration tracking for a node (allows re-orchestration).
 */
export function resetOrchestration(nodeId: string): void {
  orchestratedNodes.delete(nodeId);
}

/**
 * Get orchestration stats for debugging.
 */
export function getOrchestrationStats(): {
  trackedNodes: number;
  byRoute: Record<string, number>;
} {
  const byRoute: Record<string, number> = {};
  for (const { route } of orchestratedNodes.values()) {
    byRoute[route] = (byRoute[route] || 0) + 1;
  }

  return {
    trackedNodes: orchestratedNodes.size,
    byRoute,
  };
}
