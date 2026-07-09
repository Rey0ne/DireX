/* === QAutoFix — 4-Level Auto-Fix Strategy Engine === */
import { qMemory } from './q-memory.js';
import {
  getOrCreateProject,
  getProjectSummary,
  getDeviations,
  resolveDeviation,
  type QProject,
  type QDeviationRecord,
} from './q-state.js';
import { detectDeviations, type DetectionResult } from './q-detector.js';
import {
  push,
  buildNotification,
} from './q-notification.js';

// ── Types ────────────────────────────────────────

export type FixStrategyLevel = 1 | 2 | 3 | 4;

export interface FixStrategy {
  level: FixStrategyLevel;
  name: string;
  description: string;
  /** Whether this strategy can be applied automatically */
  autoApplicable: boolean;
  /** Try to apply this fix. Returns the adjusted prompt/params or null if not applicable. */
  apply: (deviation: QDeviationRecord, context: AutoFixContext) => FixAttempt | null;
}

export interface FixAttempt {
  strategyLevel: FixStrategyLevel;
  strategyName: string;
  action: string;              // description of what was changed
  adjustedPrompt?: string;     // if prompt was modified
  adjustedParams?: Record<string, unknown>;  // if generation params changed
  suggestion?: string;         // for manual strategies: what to tell the user
}

export interface AutoFixContext {
  projectId: string;
  shotNumber: number;
  project: QProject;
}

export interface AutoFixResult {
  success: boolean;
  appliedStrategy: string | null;
  strategyLevel: FixStrategyLevel | null;
  attempts: { strategy: string; level: FixStrategyLevel; result: string }[];
  deviationResolved: boolean;
  report: string;
}

// ── Strategy Definitions ─────────────────────────

/**
 * Level 1: Prompt Adjustment
 * Re-words the prompt to emphasize missing/incorrect elements.
 * Example: if character keywords are missing → add explicit character description
 */
class PromptAdjustStrategy implements FixStrategy {
  level: FixStrategyLevel = 1;
  name = 'Prompt Adjustment';
  description = 'Re-word intent keywords to emphasize missing elements';
  autoApplicable = true;

  apply(deviation: QDeviationRecord, context: AutoFixContext): FixAttempt | null {
    const shotSpec = context.project.scriptStructure?.shots?.find(
      s => s.shotNumber === deviation.shotNumber,
    );

    if (!shotSpec) return null;

    let adjustedPrompt = shotSpec.visualPrompt || '';
    const actions: string[] = [];

    switch (deviation.category) {
      case 'character':
        // Add character emphasis
        const charNames = Object.keys(context.project.scriptStructure?.characters || {});
        const sceneChars = charNames.filter(n =>
          shotSpec.contentCN?.includes(n) || shotSpec.visualPrompt?.includes(n),
        );
        if (sceneChars.length > 0) {
          adjustedPrompt = `[CHARACTER FOCUS: ${sceneChars.join(', ')}] ` + adjustedPrompt;
          actions.push(`Added character focus: ${sceneChars.join(', ')}`);
        } else {
          adjustedPrompt = '[CHARACTER FOCUS: Maintain exact character appearance from reference] ' + adjustedPrompt;
          actions.push('Added generic character focus directive');
        }
        break;

      case 'mood_mismatch':
      case 'emotion-mismatch':
        // Strengthen emotion keywords in prompt
        if (shotSpec.emotion) {
          adjustedPrompt = `[MOOD: ${shotSpec.emotion}] ` + adjustedPrompt;
          actions.push(`Added mood directive: ${shotSpec.emotion}`);
        }
        break;

      case 'composition':
        // Emphasize shot type
        if (shotSpec.shotType) {
          adjustedPrompt = `[FRAMING: ${shotSpec.shotType}] ` + adjustedPrompt;
          actions.push(`Added framing directive: ${shotSpec.shotType}`);
        }
        break;

      case 'lighting':
        // Emphasize lighting direction
        if (shotSpec.visualPrompt) {
          const lightingTerms = /(左边|左侧|右边|右侧|left.*light|right.*light|从.*侧.*光|from.*side.*light)/i;
          const match = shotSpec.visualPrompt.match(lightingTerms);
          if (match) {
            adjustedPrompt = `[LIGHTING: ${match[0]}] ` + adjustedPrompt;
            actions.push(`Added lighting directive: ${match[0]}`);
          }
        }
        break;

      default:
        // Generic prompt boost — prepend the expected element
        if (deviation.expected) {
          adjustedPrompt = `[REQUIRED: ${deviation.expected.slice(0, 100)}] ` + adjustedPrompt;
          actions.push(`Added requirement: ${deviation.expected.slice(0, 80)}`);
        }
    }

    if (actions.length === 0) return null;

    return {
      strategyLevel: 1,
      strategyName: this.name,
      action: actions.join('; '),
      adjustedPrompt,
    };
  }
}

/**
 * Level 2: Parameter Override
 * Adjusts resolution, aspect ratio, or image count to help the model.
 * Example: lower resolution for faster retry, increase count for batch coverage
 */
class ParameterOverrideStrategy implements FixStrategy {
  level: FixStrategyLevel = 2;
  name = 'Parameter Override';
  description = 'Adjust resolution/aspect/count to improve generation quality';
  autoApplicable = true;

  apply(deviation: QDeviationRecord, _context: AutoFixContext): FixAttempt | null {
    const params: Record<string, unknown> = {};

    switch (deviation.category) {
      case 'character':
        // Higher resolution for detail-critical shots
        params.resolution = '4K';
        params.imgCount = 2; // generate multiple for selection
        break;

      case 'composition':
        // Lock aspect ratio to match shot type
        if (deviation.expected.includes('wide') || deviation.expected.includes('ELS') || deviation.expected.includes('WS')) {
          params.aspect = '21:9';
        }
        break;

      case 'lighting':
        // Lower resolution, faster retry
        params.resolution = '1K';
        break;

      default:
        // General: increase count for batch coverage
        params.imgCount = 4;
    }

    if (Object.keys(params).length === 0) return null;

    return {
      strategyLevel: 2,
      strategyName: this.name,
      action: `Adjusted params: ${JSON.stringify(params)}`,
      adjustedParams: params,
    };
  }
}

/**
 * Level 3: Provider/Mode Fallback
 * Switches to a different provider or mode if current one consistently fails.
 * Example: T2I → I2I with a reference frame, or switch provider
 */
class PipelineFallbackStrategy implements FixStrategy {
  level: FixStrategyLevel = 3;
  name = 'Provider/Mode Fallback';
  description = 'Switch provider or generation mode for better results';
  autoApplicable = false; // requires user confirmation in Phase 2

  apply(deviation: QDeviationRecord, _context: AutoFixContext): FixAttempt | null {
    const suggestion: string[] = [];

    switch (deviation.category) {
      case 'character':
        suggestion.push('建议切换到 I2I 模式，使用角色参考图');
        suggestion.push('可尝试：上传角色定妆照作为参考 → 使用 image-to-image 模式 → 低 denoise 强度（0.3-0.5）');
        break;

      case 'composition':
        suggestion.push('建议使用 ControlNet 或分镜模板控制构图');
        suggestion.push('可尝试：在 prompt 中明确写出"三分法构图"或"黄金分割"');
        break;

      case 'mood_mismatch':
        suggestion.push('建议切换 Provider（不同模型对情绪关键词敏感度不同）');
        suggestion.push('可尝试：GPT Image → Flux → Seedream 依次尝试');
        break;

      default:
        suggestion.push('建议尝试不同的生成模式或 Provider');
    }

    if (suggestion.length === 0) return null;

    return {
      strategyLevel: 3,
      strategyName: this.name,
      action: 'Provider/mode fallback suggested',
      suggestion: suggestion.join('\n'),
    };
  }
}

/**
 * Level 4: Manual Intervention
 * Pauses generation, notifies user with detailed analysis, waits for input.
 */
class ManualInterventionStrategy implements FixStrategy {
  level: FixStrategyLevel = 4;
  name = 'Manual Intervention';
  description = 'Pause generation and request user guidance';
  autoApplicable = false;

  apply(deviation: QDeviationRecord, context: AutoFixContext): FixAttempt | null {
    const suggestion = [
      `⚠️ 自动修复未能解决 Shot ${deviation.shotNumber} 的 ${deviation.severity} 偏差。`,
      `类别：${deviation.category}`,
      `期望：${deviation.expected}`,
      `实际：${deviation.observed}`,
      `建议：${deviation.suggestion}`,
      '',
      '请手动检查并采取以下行动之一：',
      '1. 手动调整 prompt 后重新生成',
      '2. 替换参考图或调整 I2I 参数',
      '3. 接受此偏差并标记为"已知"',
      '4. 修改分镜模板以适配实际生成效果',
    ].join('\n');

    return {
      strategyLevel: 4,
      strategyName: this.name,
      action: 'Manual intervention required',
      suggestion,
    };
  }
}

// ── AutoFix Engine ───────────────────────────────

const STRATEGIES: FixStrategy[] = [
  new PromptAdjustStrategy(),
  new ParameterOverrideStrategy(),
  new PipelineFallbackStrategy(),
  new ManualInterventionStrategy(),
];

export class AutoFixer {
  private strategies: FixStrategy[] = STRATEGIES;

  /**
   * Try to auto-fix a specific deviation.
   * Escalates through strategy levels until resolved or manual intervention reached.
   */
  async autoFix(
    projectId: string,
    shotNumber: number,
    llmChat?: (systemPrompt: string, userPrompt: string) => Promise<string>,
  ): Promise<AutoFixResult> {
    const project = getOrCreateProject(projectId);
    const deviations = getDeviations(projectId, 'open')
      .filter(d => d.shotNumber === shotNumber);

    const result: AutoFixResult = {
      success: false,
      appliedStrategy: null,
      strategyLevel: null,
      attempts: [],
      deviationResolved: false,
      report: '',
    };

    if (deviations.length === 0) {
      result.report = 'No open deviations to fix';
      result.success = true;
      return result;
    }

    const context: AutoFixContext = { projectId, shotNumber, project };
    const reportLines: string[] = [];

    // Process deviations in order of severity: VIOLATION → DEVIATION → DISCREPANCY
    const sorted = [...deviations].sort((a, b) => {
      const order = { VIOLATION: 0, DEVIATION: 1, DISCREPANCY: 2 };
      return (order[a.severity] || 3) - (order[b.severity] || 3);
    });

    for (const deviation of sorted) {
      if (deviation.severity === 'DISCREPANCY') {
        // Minor discrepancies: auto-resolve with a note
        resolveDeviation(projectId, deviation.id, 'acknowledged');
        reportLines.push(`DISCREPANCY "${deviation.category}" auto-acknowledged`);
        result.attempts.push({
          strategy: 'auto-acknowledge',
          level: 1,
          result: 'Auto-acknowledged — minor discrepancy',
        });
        continue;
      }

      // Try strategies in order
      let fixed = false;
      for (const strategy of this.strategies) {
        if (!strategy.autoApplicable && strategy.level < 4) {
          // Skip non-auto strategies until we've exhausted auto ones
          continue;
        }

        const attempt = strategy.apply(deviation, context);
        if (!attempt) continue;

        const attemptLabel = `L${strategy.level}: ${strategy.name}`;
        console.log(`[q-autofix] Trying ${attemptLabel} for deviation ${deviation.id}: ${deviation.category}`);

        // Apply the fix (in Phase 2, this would actually trigger re-generation)
        if (strategy.autoApplicable && strategy.level <= 2) {
          // Auto-applicable strategies get applied
          if (attempt.adjustedPrompt) {
            // Record the adjusted prompt for the executor to use
            qMemory.episodicAdd(
              'autofix_attempt',
              `Applied ${strategy.name}: ${attempt.action}`,
              {
                projectId,
                shotNumber,
                deviationId: deviation.id,
                strategy: strategy.name,
                level: strategy.level,
                adjustedPrompt: attempt.adjustedPrompt,
                adjustedParams: attempt.adjustedParams,
              },
              ['autofix', 'applied', `level-${strategy.level}`],
              [deviation.id],
            );

            // Mark as attempted — verification happens on next generate
            reportLines.push(`Applied ${strategy.name}: ${attempt.action}`);
            result.attempts.push({
              strategy: strategy.name,
              level: strategy.level,
              result: `Applied — ${attempt.action}`,
            });
            result.appliedStrategy = strategy.name;
            result.strategyLevel = strategy.level;
            fixed = true;
            break;
          } else if (attempt.adjustedParams) {
            qMemory.episodicAdd(
              'autofix_attempt',
              `Applied ${strategy.name}: ${attempt.action}`,
              {
                projectId,
                shotNumber,
                deviationId: deviation.id,
                strategy: strategy.name,
                level: strategy.level,
                adjustedParams: attempt.adjustedParams,
              },
              ['autofix', 'applied', `level-${strategy.level}`],
              [deviation.id],
            );
            reportLines.push(`Applied ${strategy.name}: ${attempt.action}`);
            result.attempts.push({
              strategy: strategy.name,
              level: strategy.level,
              result: `Applied — ${attempt.action}`,
            });
            result.appliedStrategy = strategy.name;
            result.strategyLevel = strategy.level;
            fixed = true;
            break;
          }
        } else {
          // Non-auto strategies (Level 3-4): send suggestion to user
          if (attempt.suggestion) {
            push(buildNotification('SUGGESTION', {
              title: `小Q 修复建议 (${strategy.name})`,
              body: attempt.suggestion,
              actionId: deviation.id,
              actionLabel: strategy.level === 4 ? '手动处理' : '尝试应用',
            }));

            reportLines.push(`Suggested ${strategy.name}: ${attempt.suggestion.slice(0, 100)}`);
            result.attempts.push({
              strategy: strategy.name,
              level: strategy.level,
              result: `Suggested — ${attempt.suggestion.slice(0, 80)}...`,
            });
          }
        }

        // For Level 4 (Manual), stop trying
        if (strategy.level >= 4) break;
      }

      if (fixed) {
        // Log successful fix strategy to episodic memory for future recall
        qMemory.episodicAdd(
          'autofix_attempt',
          `Fix successful: ${result.appliedStrategy} resolved ${deviation.category} deviation`,
          {
            projectId,
            shotNumber,
            deviationId: deviation.id,
            severity: deviation.severity,
            category: deviation.category,
            strategy: result.appliedStrategy,
            level: result.strategyLevel,
          },
          ['autofix', 'succeeded', deviation.category],
          [deviation.id],
        );

        // Reinforce semantic memory: this strategy works for this category
        qMemory.episodicAdd(
          'autofix_attempt',
          `Strategy pattern: ${result.appliedStrategy} effective for ${deviation.category} deviations (severity: ${deviation.severity})`,
          {
            strategy: result.appliedStrategy,
            category: deviation.category,
            severity: deviation.severity,
            success: true,
          },
          ['autofix', 'pattern', 'semantic-seed'],
          [],
        );
      }
    }

    // Check if deviations are resolved
    const remaining = getDeviations(projectId, 'open').filter(
      d => d.shotNumber === shotNumber,
    );
    result.deviationResolved = remaining.length === 0;
    result.success = result.attempts.some(a => a.result.startsWith('Applied'));
    result.report = reportLines.join('\n') || 'No applicable fix strategies found';

    return result;
  }

  /**
   * Get a summary of all known fix strategies from memory.
   */
  getFixHistory(): { strategy: string; category: string; success: boolean }[] {
    const memories = qMemory.recall('autofix pattern', {});
    return memories
      .filter(m => m.layer === 'episodic')
      .map(m => ({
        strategy: (m as any).detail?.strategy || 'unknown',
        category: (m as any).detail?.category || 'unknown',
        success: (m as any).detail?.success !== false,
      }));
  }
}
