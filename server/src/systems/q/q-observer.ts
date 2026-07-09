/* === QObserver — Pipeline Observation & Event Capture === */
import { qMemory } from './q-memory.js';
import {
  getOrCreateProject,
  updateProject,
  recordGeneration,
  setScriptStructure,
  getProjectSummary,
  type QScriptStructure,
} from './q-state.js';
import {
  push,
  buildNotification,
  notifyGenerationComplete,
  notifyGenerationFailed,
  notifyPipelineComplete,
  notifyProgress,
} from './q-notification.js';
import type { GenerateResult } from '../../../../shared/api-types.js';

// ── Pipeline Wrapping ────────────────────────────

export interface PipelineContext {
  pipelineName: string;
  projectId: string;
  nodeId?: string;
  shotLabel?: string;
  providerId?: string;
}

export interface PipelineObservation {
  context: PipelineContext;
  startTime: number;
  endTime: number;
  durationMs: number;
  success: boolean;
  result: unknown;
  error?: string;
  creditsConsumed: number;
  memoryId: string;
}

/**
 * Wrap a pipeline function to record observations.
 * Usage in index.ts route handler:
 *   const result = await observePipeline(() => runFullPipeline(scriptText), { pipelineName: 'full', projectId });
 */
export async function observePipeline<T>(
  fn: () => Promise<T>,
  context: PipelineContext,
): Promise<{ result: T; observation: PipelineObservation }> {
  const startTime = Date.now();
  let result: T;
  let success = false;
  let error: string | undefined;
  let creditsConsumed = 0;

  try {
    result = await fn();
    success = true;
  } catch (err: any) {
    error = err?.message || String(err);
    result = undefined as unknown as T;
  }

  const durationMs = Date.now() - startTime;

  // Extract credits from result if it's a GenerateResult
  if (success && result && typeof result === 'object' && 'cost' in (result as any)) {
    const genResult = result as unknown as GenerateResult;
    creditsConsumed = Math.round((genResult.cost || 0) * 100);
  }

  // Record to episodic memory
  const memoryId = qMemory.episodicAdd(
    context.pipelineName.includes('generate') ? 'generation' : 'pipeline_run',
    success
      ? `${context.pipelineName}: completed in ${durationMs}ms`
      : `${context.pipelineName}: failed — ${error}`,
    {
      pipelineName: context.pipelineName,
      projectId: context.projectId,
      nodeId: context.nodeId,
      durationMs,
      status: success ? 'succeeded' : 'failed',
      credits: creditsConsumed,
      error,
    },
    [context.pipelineName, success ? 'success' : 'failed'],
    [],
  ).id;

  const observation: PipelineObservation = {
    context,
    startTime,
    endTime: Date.now(),
    durationMs,
    success,
    result,
    error,
    creditsConsumed,
    memoryId,
  };

  // Update progress & send notifications
  if (context.projectId) {
    if (success && creditsConsumed > 0) {
      recordGeneration(context.projectId, creditsConsumed, durationMs);
    }

    if (success && context.pipelineName.includes('generate')) {
      notifyGenerationComplete({
        shotLabel: context.shotLabel,
        provider: context.providerId,
        credits: creditsConsumed,
        duration: `${(durationMs / 1000).toFixed(0)}s`,
      });
    } else if (!success) {
      notifyGenerationFailed({
        shotLabel: context.shotLabel,
        reason: error || '未知错误',
        suggestion: error?.includes('timeout') ? '建议重试或降低分辨率' : undefined,
        nodeId: context.nodeId,
        retry: true,
      });
    }

    // Progress update
    try {
      const summary = getProjectSummary(context.projectId);
      if (summary.project.progress.totalShots > 0) {
        notifyProgress({
          generated: summary.project.progress.shotsGenerated,
          total: summary.project.progress.totalShots,
          credits: summary.project.progress.totalCreditsSpent,
        });
      }
    } catch { /* progress notification is best-effort */ }
  }

  return { result: result as T, observation };
}

// ── Generation Log Hook ─────────────────────────

/**
 * Call this from task/manager.ts addLog() to capture generation events.
 * The task/manager.ts needs a small modification to call this hook.
 */
export let onGenerationLogged: ((log: {
  providerId: string;
  status: 'succeeded' | 'failed';
  credits: number;
  durationMs: number;
  error?: string;
}) => void) | null = null;

// ── Script Analysis Capture ─────────────────────

/**
 * Call after script analysis pipeline completes to capture script structure.
 */
export function captureScriptAnalysis(
  projectId: string,
  scriptText: string,
  result: {
    characters?: Record<string, string>;
    scenes?: Record<string, string>;
    shots?: unknown[];
    sceneArchitecture?: Record<string, string>;
    props?: Record<string, string>;
    music?: { scenes: Record<string, string>; sunoPrompts: Record<string, string> };
  },
): void {
  const structure: QScriptStructure = {
    characters: result.characters || {},
    scenes: result.scenes || {},
    shots: (result.shots || []).map((s: any, i: number) => ({
      shotNumber: (s.shotNumber || s.shot_number || i + 1) as number,
      scene: (s.scene || '') as string,
      shotType: (s.shotType || s.shot_type || 'MS') as string,
      angle: (s.angle || s.camera_angle || '平视') as string,
      lens: (s.lens || s.focal_length || '50mm') as string,
      composition: (s.composition || '三分法') as string,
      foreground: (s.foreground || '') as string,
      midground: (s.midground || '') as string,
      background: (s.background || '') as string,
      blocking: (s.blocking || '') as string,
      action: (s.action || '') as string,
      emotion: (s.emotion || '') as string,
      cameraMovement: (s.cameraMovement || s.camera_movement || '固定') as string,
      focusPoint: (s.focusPoint || s.focus_point || '') as string,
      visualPrompt: (s.visualPrompt || s.visual_prompt || '') as string,
      contentCN: (s.contentCN || s.content_cn || '') as string,
    })),
    sceneArchitecture: result.sceneArchitecture || {},
    props: result.props || {},
    music: result.music || { scenes: {}, sunoPrompts: {} },
  };

  setScriptStructure(projectId, scriptText, structure);

  const shotCount = structure.shots.length;
  const charCount = Object.keys(structure.characters).length;
  const sceneCount = Object.keys(structure.scenes).length;

  qMemory.episodicAdd(
    'pipeline_run',
    `Script analysis: ${charCount} characters, ${sceneCount} scenes, ${shotCount} shots`,
    { charCount, sceneCount, shotCount, projectId },
    ['script-analysis', 'pipeline'],
    [],
  );

  notifyPipelineComplete({
    characterCount: charCount,
    sceneCount,
    shotCount,
  });
}

// ── Canvas Sync Tracking ────────────────────────

let lastNodeCount = 0;

/**
 * Call on each POST /api/canvas/sync to track canvas changes.
 * Detects node additions/removals and records as observations.
 */
export function trackCanvasSync(
  projectId: string,
  nodeCount: number,
): void {
  if (nodeCount !== lastNodeCount && lastNodeCount > 0) {
    const diff = nodeCount - lastNodeCount;
    qMemory.episodicAdd(
      'user_action',
      diff > 0
        ? `Canvas: ${diff} node(s) added (now ${nodeCount})`
        : `Canvas: ${Math.abs(diff)} node(s) removed (now ${nodeCount})`,
      { projectId, previousCount: lastNodeCount, newCount: nodeCount, delta: diff },
      ['canvas', 'sync'],
      [],
    );
  }
  lastNodeCount = nodeCount;

  // Update project node count
  const project = getOrCreateProject(projectId);
  if (project.canvasNodeCount !== nodeCount) {
    updateProject(projectId, { canvasNodeCount: nodeCount });
  }
}

// ── Deviations Threshold Monitor ────────────────

/**
 * Check if deviation count exceeds threshold and send alert.
 * Called after each new deviation is added.
 */
export function checkDeviationThreshold(projectId: string): void {
  const summary = getProjectSummary(projectId);
  if (summary.openDeviations.criticalThreshold) {
    push(buildNotification('SYSTEM_ALERT', {
      title: `⚠️ 严重偏差过多`,
      body: `当前有 ${summary.openDeviations.violations} 个严重偏差（VIOLATION），${summary.openDeviations.deviations} 个内容偏差。建议暂停生成，复查问题。`,
      severity: 'error',
      actionable: true,
      actionId: projectId,
      actionLabel: '查看详情',
    }));
  }
}
