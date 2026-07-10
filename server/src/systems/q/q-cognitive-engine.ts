/* === QCognitiveEngine — Think→Plan→Execute→Verify→Reflect Loop === */
import { qMemory } from './q-memory.js';
import {
  getOrCreateProject,
  getProjectSummary,
  getDeviations,
  type QProject,
} from './q-state.js';
import { detectDeviations } from './q-detector.js';
import {
  push,
  buildNotification,
  notifyProgress,
} from './q-notification.js';
import { AutoFixer, type AutoFixResult } from './q-autofix.js';

// ── Default Executor (closes autofix loop) ─────────
// When no custom executor is provided, this default executor
// can recall autofix results from memory and re-trigger generation.

async function defaultExecutor(
  action: CycleAction,
  ctx: CycleContext,
): Promise<{ success: boolean; output: string }> {
  // For retry_generation and autofix actions, recall adjusted prompts from memory
  if (action.type === 'retry_generation' || action.type === 'autofix') {
    const fixMemories = qMemory.recall('autofix applied', { projectId: ctx.projectId });
    const relevantFix = fixMemories.find(m => {
      const detail = (m.entry as any).detail || {};
      return detail.shotNumber === (action.targetShot || ctx.shotNumber);
    });

    if (relevantFix) {
      const detail = (relevantFix.entry as any).detail || {};
      const adjustedPrompt = detail.adjustedPrompt as string;

      if (adjustedPrompt) {
        try {
          // Dynamic import to avoid circular dependency at module level
          const { executeOrchestration } = await import('./q-orchestrate.js');
          const decision = {
            nodeId: ctx.nodeId || '',
            nodeType: 'text' as const,
            route: 'unified_pipeline' as const,
            confidence: 0.9,
            reasoning: `Retry generation with autofix-adjusted prompt`,
            dependencies: [] as string[],
            args: { adjustedPrompt },
          };

          const result = await executeOrchestration(decision, adjustedPrompt);
          if (result) {
            const successMsg = `Re-generated with autofix prompt: ${adjustedPrompt.slice(0, 80)}...`;
            console.log('[q-default-executor]', successMsg);
            return { success: true, output: successMsg };
          }
          return { success: false, output: 'Re-generation returned null — no route matched' };
        } catch (err: any) {
          return { success: false, output: `Re-generation failed: ${err.message}` };
        }
      }
    }
    return { success: false, output: 'No adjusted prompt found in autofix memory — cannot re-generate' };
  }

  // For other action types, notification is sufficient
  return { success: true, output: `Action "${action.type}" completed (no executor needed)` };
}

// ── Types ────────────────────────────────────────

export type CyclePhase = 'think' | 'plan' | 'execute' | 'verify' | 'reflect';

export interface CycleContext {
  projectId: string;
  trigger: 'pipeline_complete' | 'deviation_threshold' | 'interval' | 'manual';
  triggerDetail: string;         // e.g. "Shot 5 generation failed"
  shotNumber?: number;
  nodeId?: string;
}

export interface CyclePlan {
  actions: CycleAction[];
  reasoning: string;             // why these actions were chosen
  expectedOutcome: string;
  riskLevel: 'low' | 'medium' | 'high';
  basedOn: string[];             // memory IDs that informed this plan
}

export interface CycleAction {
  type: 'retry_generation' | 'autofix' | 'adjust_prompt' | 'switch_provider'
      | 'notify_user' | 'wait' | 'custom';
  description: string;
  targetShot?: number;
  params?: Record<string, unknown>;
  priority: number;              // 1=highest
}

export interface CycleResult {
  cycleId: string;
  phase: CyclePhase;
  success: boolean;
  details: string;
  memoriesCreated: string[];     // memory IDs
  learnings?: string[];          // what was learned
  shouldRetry: boolean;
  retryReason?: string;
  retriesRemaining: number;
}

export interface CycleReport {
  cycleId: string;
  projectId: string;
  trigger: string;
  startTime: string;
  endTime: string;
  totalDurationMs: number;
  phases: {
    think: { recalledMemories: number; keyInsights: string[] };
    plan: { actionsGenerated: number; reasoning: string };
    execute: { actionsCompleted: number; actionsFailed: number; results: string[] };
    verify: { deviationsFound: number; violations: number };
    reflect: { learnings: string[]; consolidated: number; shouldReexecute: boolean };
  };
  retriesUsed: number;
  maxRetries: number;
  outcome: 'success' | 'partial' | 'failed' | 'aborted';
}

// ── Cognitive Loop Engine ────────────────────────

const MAX_RETRIES = 3;
const CONSOLIDATE_THRESHOLD = 50;

// Track active cycles per project (prevent overlapping)
const activeCycles = new Map<string, boolean>();

export async function runCognitiveCycle(
  context: CycleContext,
  llmChat?: (systemPrompt: string, userPrompt: string) => Promise<string>,
  executor?: (action: CycleAction, ctx: CycleContext) => Promise<{ success: boolean; output: string }>,
): Promise<CycleReport> {
  const { projectId } = context;

  // Prevent overlapping cycles
  if (activeCycles.get(projectId)) {
    console.log(`[q-cognitive] Cycle already running for ${projectId}, skipping`);
    return {
      cycleId: 'skipped',
      projectId,
      trigger: context.trigger,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      totalDurationMs: 0,
      phases: {
        think: { recalledMemories: 0, keyInsights: ['Skipped — cycle already running'] },
        plan: { actionsGenerated: 0, reasoning: 'Skipped' },
        execute: { actionsCompleted: 0, actionsFailed: 0, results: [] },
        verify: { deviationsFound: 0, violations: 0 },
        reflect: { learnings: [], consolidated: 0, shouldReexecute: false },
      },
      retriesUsed: 0,
      maxRetries: MAX_RETRIES,
      outcome: 'aborted',
    };
  }

  activeCycles.set(projectId, true);
  const cycleId = `cycle-${Date.now()}`;
  const startTime = Date.now();
  let retries = 0;

  const report: CycleReport = {
    cycleId,
    projectId,
    trigger: context.trigger,
    startTime: new Date().toISOString(),
    endTime: '',
    totalDurationMs: 0,
    phases: {
      think: { recalledMemories: 0, keyInsights: [] },
      plan: { actionsGenerated: 0, reasoning: '' },
      execute: { actionsCompleted: 0, actionsFailed: 0, results: [] },
      verify: { deviationsFound: 0, violations: 0 },
      reflect: { learnings: [], consolidated: 0, shouldReexecute: false },
    },
    retriesUsed: 0,
    maxRetries: MAX_RETRIES,
    outcome: 'failed',
  };

  try {
    // ── Phase 1: Think ──────────────────────────
    const thinkResult = await think(context, llmChat);
    report.phases.think = thinkResult;

    // ── Phase 2: Plan ───────────────────────────
    const cyclePlan = await planPhase(context, thinkResult.keyInsights, llmChat);
    report.phases.plan = {
      actionsGenerated: cyclePlan.actions.length,
      reasoning: cyclePlan.reasoning,
    };

    // ── Phase 3: Execute ─────────────────────────
    let executeResult = await executePhase(context, cyclePlan, executor, llmChat);
    report.phases.execute = executeResult;

    // Retry loop
    while (executeResult.actionsFailed > 0 && retries < MAX_RETRIES) {
      retries++;
      console.log(`[q-cognitive] Retry ${retries}/${MAX_RETRIES} for ${projectId}`);

      // Reflect on failure → generate revised plan
      const revisedPlan = await planPhase(
        context,
        [
          ...thinkResult.keyInsights,
          `Previous attempt failed: ${executeResult.results.filter(r => r.includes('FAILED')).join('; ')}`,
        ],
        llmChat,
      );

      const retryResult = await executePhase(context, revisedPlan, executor, llmChat);

      // Merge results
      executeResult.actionsCompleted += retryResult.actionsCompleted;
      executeResult.actionsFailed = retryResult.actionsFailed;
      executeResult.results.push(...retryResult.results.map(r => `[Retry ${retries}] ${r}`));
    }

    report.retriesUsed = retries;
    report.phases.execute = executeResult;

    // ── Phase 4: Verify ─────────────────────────
    const verifyResult = await verifyAfterCycle(context);
    report.phases.verify = verifyResult;

    // ── Phase 5: Reflect ────────────────────────
    const reflectResult = await reflectOnCycle(
      context,
      { think: thinkResult, plan: cyclePlan, execute: executeResult, verify: verifyResult },
      retries,
      llmChat,
    );
    report.phases.reflect = reflectResult;

    // Determine outcome
    if (executeResult.actionsFailed === 0 && verifyResult.violations === 0) {
      report.outcome = 'success';
    } else if (executeResult.actionsCompleted > 0) {
      report.outcome = 'partial';
    } else {
      report.outcome = 'failed';
    }

    // Notify progress
    try {
      const summary = getProjectSummary(projectId);
      if (summary.project.progress.totalShots > 0) {
        notifyProgress({
          generated: summary.project.progress.shotsGenerated,
          total: summary.project.progress.totalShots,
          credits: summary.project.progress.totalCreditsSpent,
        });
      }
    } catch {}

    // Auto-consolidate if enough unconsolidated entries
    checkAndConsolidate(llmChat);

  } catch (err: any) {
    console.error('[q-cognitive] Cycle failed:', err.message);
    report.outcome = 'failed';
    report.phases.reflect.learnings.push(`Cycle error: ${err.message}`);
  } finally {
    activeCycles.delete(projectId);
  }

  report.endTime = new Date().toISOString();
  report.totalDurationMs = Date.now() - startTime;

  // Remember the cycle
  qMemory.episodicAdd(
    'cognitive_cycle',
    `Cognitive cycle ${cycleId}: ${report.outcome} — ${report.phases.execute.actionsCompleted} actions, ${report.phases.verify.deviationsFound} deviations`,
    {
      cycleId,
      projectId,
      trigger: context.trigger,
      outcome: report.outcome,
      retriesUsed: retries,
      actionsCompleted: report.phases.execute.actionsCompleted,
      deviationsFound: report.phases.verify.deviationsFound,
      learnings: report.phases.reflect.learnings,
      durationMs: report.totalDurationMs,
    },
    ['cognitive-cycle', report.outcome],
    [],
  );

  console.log(`[q-cognitive] Cycle ${cycleId} complete: ${report.outcome} (${report.totalDurationMs}ms)`);
  return report;
}

// ── Think Phase ──────────────────────────────────

async function think(
  context: CycleContext,
  llmChat?: (systemPrompt: string, userPrompt: string) => Promise<string>,
): Promise<{ recalledMemories: number; keyInsights: string[] }> {
  const { projectId } = context;

  // 1. Recall relevant memories
  const triggerMemories = qMemory.recall(context.triggerDetail, { projectId });
  const projectMemories = qMemory.recall(`project ${projectId}`, { projectId });
  const deviationMemories = qMemory.recall('deviation', { projectId });
  const fixMemories = qMemory.recall('fix strategy success', { projectId });

  const allMemories = [...triggerMemories, ...projectMemories, ...deviationMemories, ...fixMemories];

  // 2. Get project state
  let projectSummary: ReturnType<typeof getProjectSummary> | null = null;
  try {
    projectSummary = getProjectSummary(projectId);
  } catch {}

  // 3. Analyze state (LLM-powered if available)
  const keyInsights: string[] = [];

  // Rule-based insights (fast path)
  if (projectSummary) {
    const openDevs = projectSummary.openDeviations;
    if (openDevs.violations > 0) {
      keyInsights.push(`${openDevs.violations} VIOLATION deviations open — requires immediate attention`);
    }
    if (openDevs.deviations > 2) {
      keyInsights.push(`${openDevs.deviations} content deviations — pattern may indicate systematic issue`);
    }
    if (projectSummary.completionRate > 0.5 && openDevs.total > 0) {
      keyInsights.push(`Project ${Math.round(projectSummary.completionRate * 100)}% complete but has unresolved deviations`);
    }
  }

  // LLM deep analysis
  if (llmChat && allMemories.length > 0) {
    try {
      const recentMemories = allMemories
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(m => `[${m.layer}] ${m.content}`)
        .join('\n');

      const systemPrompt = `You are 小Q, the cognitive brain of DireX. Analyze the current project state and recent memories.
Output ONLY a JSON array of insights (max 5). Each insight is a single Chinese sentence describing what needs attention.
Example: ["3 shots have emotion mismatches — 情绪一致性有问题", "50mm shots consistently succeed while 24mm fail"]`;

      const userPrompt = `Project: ${projectId}
Open deviations: ${JSON.stringify(projectSummary?.openDeviations || {})}
Completion: ${Math.round((projectSummary?.completionRate || 0) * 100)}%
Recent memories:\n${recentMemories}
Trigger: ${context.trigger} — ${context.triggerDetail}`;

      const response = await llmChat(systemPrompt, userPrompt);
      const match = response.match(/\[[\s\S]*\]/);
      if (match) {
        const insights = JSON.parse(match[0]);
        if (Array.isArray(insights)) {
          keyInsights.push(...insights);
        }
      }
    } catch {
      // LLM analysis failure is non-fatal — use rule-based insights only
    }
  }

  // Fallback: at least state what triggered this cycle
  if (keyInsights.length === 0) {
    keyInsights.push(`Triggered by: ${context.trigger} — ${context.triggerDetail}`);
  }

  console.log(`[q-cognitive:think] ${allMemories.length} memories recalled, ${keyInsights.length} insights`);
  return {
    recalledMemories: allMemories.length,
    keyInsights,
  };
}

// ── Plan Phase ───────────────────────────────────

async function planPhase(
  context: CycleContext,
  keyInsights: string[],
  llmChat?: (systemPrompt: string, userPrompt: string) => Promise<string>,
): Promise<CyclePlan> {
  const { projectId } = context;

  // 1. Recall past fix strategies that worked
  const fixHistory = qMemory.recall('autofix succeeded', { projectId });
  const knownFixes = qMemory.recall('fix strategy', { projectId });

  const actions: CycleAction[] = [];

  // 2. Generate actions based on trigger type
  switch (context.trigger) {
    case 'deviation_threshold':
      actions.push({
        type: 'autofix',
        description: 'Auto-fix VIOLATION deviations',
        priority: 1,
      });
      actions.push({
        type: 'notify_user',
        description: 'Alert user about critical deviation count',
        priority: 1,
      });
      break;

    case 'pipeline_complete':
      // Check for deviations and generate retry if needed
      actions.push({
        type: 'verify',
        description: 'Check generated output for deviations',
        targetShot: context.shotNumber,
        priority: 1,
      });
      break;

    case 'interval':
      // Periodic — consolidate learnings, check progress
      actions.push({
        type: 'wait',
        description: 'Consolidate recent memories and learnings',
        priority: 3,
      });
      break;

    default:
      actions.push({
        type: 'notify_user',
        description: 'Inform user of situation',
        priority: 2,
      });
  }

  // 3. LLM-powered plan generation (Phase 2 enables smarter planning)
  let reasoning = `Triggered by ${context.trigger}. ${actions.length} auto-generated actions.`;

  if (llmChat) {
    try {
      const systemPrompt = `You are 小Q's planning module. Given the current insights and trigger, generate an action plan.
Output ONLY valid JSON: {"reasoning":"...","actions":[{"type":"retry_generation|autofix|adjust_prompt|switch_provider|notify_user|wait|custom","description":"...","targetShot":null,"priority":1}]}
Priority: 1=urgent, 2=important, 3=when-idle. Max 4 actions.`;

      const userPrompt = `Trigger: ${context.trigger} — ${context.triggerDetail}
Insights:\n${keyInsights.map(i => `- ${i}`).join('\n')}
Known fixes that worked before:\n${fixHistory.map(f => `- ${f.content}`).join('\n') || '(none)'}
Project: ${projectId}`;

      const response = await llmChat(systemPrompt, userPrompt);
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const planData = JSON.parse(match[0]);
        if (planData.reasoning) reasoning = planData.reasoning;
        if (Array.isArray(planData.actions) && planData.actions.length > 0) {
          // Merge LLM actions with auto-generated ones, LLM priority wins
          actions.length = 0;
          for (const a of planData.actions) {
            actions.push({
              type: a.type || 'custom',
              description: a.description || '',
              targetShot: a.targetShot || undefined,
              params: a.params || {},
              priority: a.priority || 2,
            });
          }
        }
      }
    } catch {
      // LLM planning failure — use auto-generated actions
    }
  }

  const basedOn = fixHistory.slice(0, 3).map(f => f.id);
  const riskLevel = actions.length > 3 ? 'high' : actions.length > 1 ? 'medium' : 'low';

  console.log(`[q-cognitive:plan] ${actions.length} actions planned, risk=${riskLevel}`);
  return {
    actions: actions.sort((a, b) => a.priority - b.priority),
    reasoning,
    expectedOutcome: 'Deviations reduced, learnings consolidated',
    riskLevel,
    basedOn,
  };
}

// ── Execute Phase ────────────────────────────────

async function executePhase(
  context: CycleContext,
  plan: CyclePlan,
  executor?: (action: CycleAction, ctx: CycleContext) => Promise<{ success: boolean; output: string }>,
  llmChat?: (systemPrompt: string, userPrompt: string) => Promise<string>,
): Promise<{ actionsCompleted: number; actionsFailed: number; results: string[] }> {
  let actionsCompleted = 0;
  let actionsFailed = 0;
  const results: string[] = [];

  for (const action of plan.actions) {
    try {
      let result: { success: boolean; output: string };

      // Try AutoFix for autofix-type actions
      if (action.type === 'autofix' && context.shotNumber) {
        const autoFixer = new AutoFixer();
        const fixResult = await autoFixer.autoFix(
          context.projectId,
          context.shotNumber,
          llmChat,
        );
        result = {
          success: fixResult.success,
          output: fixResult.report,
        };
        // Record fix result
        qMemory.episodicAdd(
          fixResult.success ? 'autofix_attempt' : 'autofix_attempt',
          `AutoFix ${fixResult.success ? 'succeeded' : 'failed'}: ${fixResult.appliedStrategy || 'no strategy applicable'}`,
          {
            projectId: context.projectId,
            shotNumber: context.shotNumber,
            success: fixResult.success,
            strategy: fixResult.appliedStrategy,
            result: fixResult.report,
          },
          ['autofix', fixResult.success ? 'succeeded' : 'failed'],
          [],
        );
      } else if (executor) {
        // Custom executor (e.g., calling generate API)
        result = await executor(action, context);
      } else {
        // No custom executor — use default executor that can actually re-generate
        result = await defaultExecutor(action, context);
      }

      if (result.success) {
        actionsCompleted++;
        results.push(`✅ ${action.type}: ${action.description} — ${result.output}`);
      } else {
        actionsFailed++;
        results.push(`❌ FAILED ${action.type}: ${action.description} — ${result.output}`);
      }
    } catch (err: any) {
      actionsFailed++;
      results.push(`❌ ERROR ${action.type}: ${err.message}`);
    }
  }

  console.log(`[q-cognitive:execute] ${actionsCompleted} ok, ${actionsFailed} failed`);
  return { actionsCompleted, actionsFailed, results };
}

// ── Verify Phase ─────────────────────────────────

async function verifyAfterCycle(
  context: CycleContext,
): Promise<{ deviationsFound: number; violations: number }> {
  let deviationsFound = 0;
  let violations = 0;

  if (context.shotNumber) {
    try {
      const result = await detectDeviations({
        projectId: context.projectId,
        shotNumber: context.shotNumber,
        assetUrls: [],
        nodeId: context.nodeId,
      });
      deviationsFound = result.deviationsFound;
      violations = result.violations;
    } catch {
      // Detection failure is non-fatal
    }
  }

  // Check all open deviations
  try {
    const allDeviations = getDeviations(context.projectId, 'open');
    deviationsFound = Math.max(deviationsFound, allDeviations.length);
    violations = Math.max(
      violations,
      allDeviations.filter(d => d.severity === 'VIOLATION').length,
    );
  } catch {}

  console.log(`[q-cognitive:verify] ${deviationsFound} deviations (${violations} violations)`);
  return { deviationsFound, violations };
}

// ── Reflect Phase ────────────────────────────────

async function reflectOnCycle(
  context: CycleContext,
  phaseResults: {
    think: { recalledMemories: number; keyInsights: string[] };
    plan: CyclePlan;
    execute: { actionsCompleted: number; actionsFailed: number; results: string[] };
    verify: { deviationsFound: number; violations: number };
  },
  retriesUsed: number,
  llmChat?: (systemPrompt: string, userPrompt: string) => Promise<string>,
): Promise<{ learnings: string[]; consolidated: number; shouldReexecute: boolean }> {
  const learnings: string[] = [];
  const { execute, verify } = phaseResults;

  // Rule-based learnings
  if (execute.actionsCompleted > 0 && execute.actionsFailed === 0) {
    learnings.push('All planned actions completed successfully');
  }
  if (execute.actionsFailed > 0) {
    learnings.push(`${execute.actionsFailed} action(s) failed — need alternative approach`);
  }
  if (verify.deviationsFound > 0 && verify.violations === 0) {
    learnings.push('Deviations found but no VIOLATIONs — acceptable outcome');
  }
  if (verify.violations > 0) {
    learnings.push(`${verify.violations} VIOLATIONs remain — needs further action`);
  }
  if (retriesUsed > 0) {
    learnings.push(`Required ${retriesUsed} retries to reach current outcome`);
  }

  // LLM-powered reflection
  if (llmChat && phaseResults.think.keyInsights.length > 0) {
    try {
      const systemPrompt = `You are 小Q's reflection module. Analyze what happened during this cognitive cycle and extract learnings.
Output ONLY valid JSON: {"learnings":["..."],"shouldReexecute":false}
Learnings: concise insights about what worked, what didn't, and what to try next (max 4).
shouldReexecute: true ONLY if violations remain AND a different approach is available.`;

      const userPrompt = `Insights before cycle:\n${phaseResults.think.keyInsights.map(i => `- ${i}`).join('\n')}
Plan: ${phaseResults.plan.reasoning}
Results:\n${execute.results.join('\n')}
Deviations remaining: ${verify.deviationsFound} (${verify.violations} violations)
Retries used: ${retriesUsed}`;

      const response = await llmChat(systemPrompt, userPrompt);
      const match = response.match(/\{[\s\S]*\}/);
      if (match) {
        const reflection = JSON.parse(match[0]);
        if (Array.isArray(reflection.learnings)) {
          learnings.push(...reflection.learnings);
        }
        if (reflection.shouldReexecute && retriesUsed < MAX_RETRIES) {
          learnings.push('Re-execution recommended with revised approach');
        }
      }
    } catch {
      // LLM reflection failure is non-fatal
    }
  }

  // Should re-execute?
  const shouldReexecute =
    retriesUsed < MAX_RETRIES &&
    verify.violations > 0 &&
    execute.actionsFailed > 0;

  // Auto-consolidate check
  let consolidated = 0;
  try {
    const stats = qMemory.stats();
    if (stats.episodic.unconsolidated >= CONSOLIDATE_THRESHOLD) {
      const newlyConsolidated = await qMemory.consolidate(llmChat);
      consolidated = newlyConsolidated.length;
    }
  } catch {}

  // Remember learnings
  for (const learning of learnings) {
    qMemory.episodicAdd(
      'cognitive_cycle',
      `Reflection: ${learning}`,
      { projectId: context.projectId, retriesUsed },
      ['reflection', 'learning'],
      [],
    );
  }

  console.log(`[q-cognitive:reflect] ${learnings.length} learnings, consolidated=${consolidated}, reexecute=${shouldReexecute}`);
  return { learnings, consolidated, shouldReexecute };
}

// ── Trigger Helpers ──────────────────────────────

/**
 * Called after a pipeline run completes.
 * Triggers a cognitive cycle if deviations > threshold.
 */
export async function onPipelineComplete(
  projectId: string,
  shotNumber?: number,
  deviationCount?: { total: number; violations: number },
  llmChat?: (systemPrompt: string, userPrompt: string) => Promise<string>,
): Promise<CycleReport | null> {
  if (!deviationCount || deviationCount.violations === 0) {
    // Normal completion — just remember, don't trigger full cycle
    qMemory.episodicAdd(
      'pipeline_run',
      `Pipeline completed for ${projectId}${shotNumber ? ` shot ${shotNumber}` : ''} — ${deviationCount?.total || 0} deviations`,
      { projectId, shotNumber, deviationCount },
      ['pipeline', 'complete'],
      [],
    );
    return null;
  }

  // VIOLATIONs trigger cognitive cycle
  return runCognitiveCycle(
    {
      projectId,
      trigger: deviationCount.violations >= 3 ? 'deviation_threshold' : 'pipeline_complete',
      triggerDetail: `Shot ${shotNumber || '?'} completed with ${deviationCount.violations} violations, ${deviationCount.total} total deviations`,
      shotNumber,
    },
    llmChat,
  );
}

/**
 * Periodic cognitive check (call every 5 minutes).
 * Only triggers if new unconsolidated memories exist since last check.
 */
let lastIntervalCheck = 0;
let lastUnconsolidatedCount = 0;

export async function onIntervalCheck(
  projectId: string,
  llmChat?: (systemPrompt: string, userPrompt: string) => Promise<string>,
): Promise<CycleReport | null> {
  const now = Date.now();
  if (now - lastIntervalCheck < 300_000) return null; // 5 min minimum
  lastIntervalCheck = now;

  const stats = qMemory.stats();
  if (stats.episodic.unconsolidated <= lastUnconsolidatedCount) {
    // No new memories — skip
    return null;
  }
  lastUnconsolidatedCount = stats.episodic.unconsolidated;

  return runCognitiveCycle(
    {
      projectId,
      trigger: 'interval',
      triggerDetail: `Periodic check — ${stats.episodic.unconsolidated} unconsolidated memories`,
    },
    llmChat,
  );
}

export function getActiveCycleCount(): number {
  return activeCycles.size;
}

// ── Auto-Consolidation ───────────────────────────

async function checkAndConsolidate(
  llmChat?: (systemPrompt: string, userPrompt: string) => Promise<string>,
): Promise<void> {
  try {
    const stats = qMemory.stats();
    if (stats.episodic.unconsolidated >= CONSOLIDATE_THRESHOLD) {
      console.log(`[q-cognitive] Auto-consolidating: ${stats.episodic.unconsolidated} unconsolidated entries`);
      await qMemory.consolidate(llmChat);
    }
    if (stats.semantic.unconsolidated >= 20) {
      console.log(`[q-cognitive] Auto-reflecting: ${stats.semantic.unconsolidated} unconsolidated semantic entries`);
      await qMemory.reflect(llmChat);
    }
  } catch {}
}
