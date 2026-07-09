/* === QDetector — Deviation Detection Engine === */
import { getOrCreateProject, addDeviation, getDeviations, type QShotSpec } from './q-state.js';
import { notifyDeviation } from './q-notification.js';
import { checkDeviationThreshold } from './q-observer.js';
import { qMemory } from './q-memory.js';

// ── Types ────────────────────────────────────────

export interface DetectionInput {
  projectId: string;
  shotNumber: number;
  nodeId?: string;
  assetUrls: string[];
  visionAnalysis?: string;     // pre-analyzed via Gemini Vision
  compiledPrompt?: string;     // what was actually sent to the model
}

export interface DetectionResult {
  deviationsFound: number;
  violations: number;
  deviations: number;
  discrepancies: number;
  details: { severity: string; category: string; suggestion: string }[];
}

// ── Rule-Based Fast-Path ─────────────────────────

interface RuleCheck {
  name: string;
  check: (intent: QShotSpec, observed: string, prompt: string) => RuleResult | null;
}

interface RuleResult {
  severity: 'DISCREPANCY' | 'DEVIATION' | 'VIOLATION';
  category: string;
  expected: string;
  observed: string;
  suggestion: string;
}

const RULES: RuleCheck[] = [
  // 1. Shot type vs detected composition
  {
    name: 'shot-type-mismatch',
    check(intent, observed) {
      const wideShots = ['ELS', 'WS', 'LS', 'EWS'];
      const tightShots = ['ECU', 'CU', 'MCU'];

      const isWideIntent = wideShots.some(s => intent.shotType?.toUpperCase() === s);
      const isTightIntent = tightShots.some(s => intent.shotType?.toUpperCase() === s);

      const observedLower = observed.toLowerCase();

      if (isTightIntent && /wide\s*(shot|landscape|panorama|vista)/i.test(observedLower)) {
        return {
          severity: 'VIOLATION',
          category: 'composition',
          expected: `${intent.shotType} (tight close-up framing)`,
          observed: 'wide/landscape framing detected',
          suggestion: `分镜要求 ${intent.shotType} 特写，但生成的是广角/远景。建议重新生成，强调"tight close-up, ${intent.shotType} framing"`,
        };
      }

      if (isWideIntent && /extreme\s*close|tight\s*close|macro|face\s*fills\s*frame/i.test(observedLower)) {
        return {
          severity: 'DEVIATION',
          category: 'composition',
          expected: `${intent.shotType} (wide framing)`,
          observed: 'close-up framing detected',
          suggestion: `分镜要求 ${intent.shotType} 远景，但生成的是特写。建议重新生成，强调"wide shot, ${intent.shotType} composition"`,
        };
      }

      return null;
    },
  },

  // 2. Emotion polarity check
  {
    name: 'emotion-mismatch',
    check(intent, observed) {
      const positiveEmotions = ['快乐', '喜悦', '欢乐', '温暖', '甜蜜', '浪漫', '幸福',
                                'happy', 'joy', 'warmth', 'sweet', 'romantic', 'blissful'];
      const negativeEmotions = ['悲伤', '恐惧', '愤怒', '绝望', '阴郁', '紧张', '痛苦',
                                'sad', 'fear', 'angry', 'despair', 'gloomy', 'tense', 'painful'];

      const intentLower = (intent.emotion || '').toLowerCase();
      const observedLower = observed.toLowerCase();

      const intentPositive = positiveEmotions.some(e => intentLower.includes(e));
      const intentNegative = negativeEmotions.some(e => intentLower.includes(e));
      const observedPositive = positiveEmotions.some(e => observedLower.includes(e));
      const observedNegative = negativeEmotions.some(e => observedLower.includes(e));

      if (intentPositive && observedNegative && !observedPositive) {
        return {
          severity: 'DEVIATION',
          category: 'mood_mismatch',
          expected: `positive emotion: ${intent.emotion}`,
          observed: 'negative/dark mood detected',
          suggestion: `情绪偏离：分镜要求"${intent.emotion}"，但生成画面情绪相反。建议强调"${intent.emotion} atmosphere, warm lighting"`,
        };
      }

      if (intentNegative && observedPositive && !observedNegative) {
        return {
          severity: 'DEVIATION',
          category: 'mood_mismatch',
          expected: `negative emotion: ${intent.emotion}`,
          observed: 'positive/bright mood detected',
          suggestion: `情绪偏离：分镜要求"${intent.emotion}"，但生成画面情绪相反。建议强调"${intent.emotion} atmosphere, cold/dim lighting"`,
        };
      }

      return null;
    },
  },

  // 3. Character mention check
  {
    name: 'character-presence',
    check(intent, observed, prompt) {
      // Extract character names from the visualPrompt
      const charMatch = prompt.match(/人物[：:]\s*(.+?)(?:。|，|\n|$)/);
      if (!charMatch) return null;

      const characterHint = charMatch[1];
      const observedLower = observed.toLowerCase();

      // Check if character description elements are present
      const missingKeywords: string[] = [];
      const keywords = characterHint.split(/[、，,\s]+/).filter(w => w.length > 1);

      for (const kw of keywords.slice(0, 5)) { // check first 5 keywords
        if (!observedLower.includes(kw.toLowerCase())) {
          missingKeywords.push(kw);
        }
      }

      if (missingKeywords.length >= 2 && missingKeywords.length / Math.min(keywords.length, 5) > 0.5) {
        return {
          severity: 'VIOLATION',
          category: 'character',
          expected: `Character: ${characterHint.slice(0, 100)}`,
          observed: `Missing keywords: ${missingKeywords.join(', ')}`,
          suggestion: `角色特征丢失：${missingKeywords.join('、')} 在生成结果中未体现。建议增强角色描述权重，或使用角色参考图`,
        };
      }

      return null;
    },
  },

  // 4. Lighting direction check
  {
    name: 'lighting-direction',
    check(intent, observed) {
      const leftLight = /左边|左侧|left.*light|light.*left|从左侧|from.*left/i;
      const rightLight = /右边|右侧|right.*light|light.*right|从右侧|from.*right/i;

      const intentLeft = leftLight.test(intent.visualPrompt || '');
      const intentRight = rightLight.test(intent.visualPrompt || '');
      const observedLeft = leftLight.test(observed);
      const observedRight = rightLight.test(observed);

      if (intentLeft && observedRight && !observedLeft) {
        return {
          severity: 'DISCREPANCY',
          category: 'lighting',
          expected: 'lighting from left side',
          observed: 'lighting from right side',
          suggestion: '光源方向与分镜相反。影响较小，可选择重生成或接受。',
        };
      }

      if (intentRight && observedLeft && !observedRight) {
        return {
          severity: 'DISCREPANCY',
          category: 'lighting',
          expected: 'lighting from right side',
          observed: 'lighting from left side',
          suggestion: '光源方向与分镜相反。影响较小，可选择重生成或接受。',
        };
      }

      return null;
    },
  },
];

// ── Main Detection ──────────────────────────────

/**
 * Run deviation detection on a generated image.
 * Phase 1 uses rule-based detection only.
 * Phase 2 will add LLM-powered deep comparison.
 */
export async function detectDeviations(
  input: DetectionInput,
): Promise<DetectionResult> {
  const project = getOrCreateProject(input.projectId);
  const shotSpec = project.scriptStructure?.shots?.find(
    s => s.shotNumber === input.shotNumber,
  );

  if (!shotSpec) {
    // No script structure to compare against — record as observation only
    qMemory.episodicAdd(
      'generation',
      `Shot ${input.shotNumber}: No script structure for comparison — skipping deviation check`,
      { shotNumber: input.shotNumber, nodeId: input.nodeId },
      ['generation', 'no-script'],
      [],
    );
    return { deviationsFound: 0, violations: 0, deviations: 0, discrepancies: 0, details: [] };
  }

  const observed = input.visionAnalysis || input.compiledPrompt || '';
  const prompt = shotSpec.visualPrompt || input.compiledPrompt || '';

  const detections: RuleResult[] = [];

  // Run all rules
  for (const rule of RULES) {
    try {
      const result = rule.check(shotSpec, observed, prompt);
      if (result) {
        detections.push(result);
      }
    } catch { /* rule failure is non-fatal */ }
  }

  // Record all detections
  const details: DetectionResult['details'] = [];
  let violations = 0;
  let deviations = 0;
  let discrepancies = 0;

  for (const d of detections) {
    const category = d.category as any;
    addDeviation(
      input.projectId,
      input.shotNumber,
      d.severity as 'DISCREPANCY' | 'DEVIATION' | 'VIOLATION',
      category,
      d.expected,
      d.observed,
      d.suggestion,
      input.assetUrls,
      input.nodeId || null,
    );

    details.push({
      severity: d.severity,
      category: d.category,
      suggestion: d.suggestion,
    });

    if (d.severity === 'VIOLATION') violations++;
    else if (d.severity === 'DEVIATION') deviations++;
    else discrepancies++;

    // Send notification for VIOLATION and DEVIATION
    if (d.severity !== 'DISCREPANCY') {
      const shotLabel = `Shot ${input.shotNumber}`;
      notifyDeviation({
        shotLabel,
        severity: d.severity,
        category: d.category,
        suggestion: d.suggestion,
        deviationId: input.shotNumber.toString(),
        canAutofix: d.severity === 'DEVIATION', // only auto-fix non-VIOLATION in Phase 1
      });
    }
  }

  // Check if threshold exceeded
  if (violations > 0) {
    checkDeviationThreshold(input.projectId);
  }

  return {
    deviationsFound: detections.length,
    violations,
    deviations,
    discrepancies,
    details,
  };
}

/**
 * Deep LLM-based detection for Phase 2.
 * Accepts an optional LLM chat function.
 */
export async function detectDeviationsDeep(
  input: DetectionInput,
  llmChat?: (systemPrompt: string, userPrompt: string) => Promise<string>,
): Promise<DetectionResult> {
  // First run rule-based fast-path
  const ruleResult = await detectDeviations(input);

  if (!llmChat) return ruleResult;

  const project = getOrCreateProject(input.projectId);
  const shotSpec = project.scriptStructure?.shots?.find(
    s => s.shotNumber === input.shotNumber,
  );

  if (!shotSpec) return ruleResult;

  const observed = input.visionAnalysis || '';
  if (!observed || observed.length < 20) return ruleResult;

  const systemPrompt = `You are comparing a storyboard shot specification against what was actually generated.

Read the INTENT and the OBSERVED description, then identify any deviations beyond the already-detected ones:
${JSON.stringify(ruleResult.details)}

INTENT:
- Shot Type: ${shotSpec.shotType}
- Angle: ${shotSpec.angle}
- Composition: ${shotSpec.composition}
- Foreground: ${shotSpec.foreground}
- Midground: ${shotSpec.midground}
- Background: ${shotSpec.background}
- Action: ${shotSpec.action}
- Emotion: ${shotSpec.emotion}
- Camera: ${shotSpec.cameraMovement}
- Full Prompt: ${shotSpec.visualPrompt?.slice(0, 500)}

OBSERVED (from vision analysis of generated image):
${observed.slice(0, 1000)}

Output ONLY valid JSON array. Each object: {"severity":"DISCREPANCY|DEVIATION|VIOLATION","category":"composition|character|lighting|missing_element|extra_element|mood_mismatch|style_mismatch|consistency_break|era_conflict|spatial_logic","expected":"...","observed":"...","suggestion":"..."}
If no significant new deviations, output empty array []. Limit to 3 findings.`;

  try {
    const response = await llmChat(systemPrompt, observed);
    const match = response.match(/\[[\s\S]*\]/);
    if (!match) return ruleResult;

    const deepResults = JSON.parse(match[0]);
    if (!Array.isArray(deepResults) || deepResults.length === 0) return ruleResult;

    for (const d of deepResults) {
      if (!d.severity || !d.category) continue;

      addDeviation(
        input.projectId,
        input.shotNumber,
        d.severity,
        d.category,
        d.expected || '',
        d.observed || '',
        d.suggestion || '',
        input.assetUrls,
        input.nodeId || null,
      );

      ruleResult.deviationsFound++;
      if (d.severity === 'VIOLATION') ruleResult.violations++;
      else if (d.severity === 'DEVIATION') ruleResult.deviations++;
      else ruleResult.discrepancies++;

      ruleResult.details.push({
        severity: d.severity,
        category: d.category,
        suggestion: d.suggestion || '',
      });
    }
  } catch {
    // Deep detection failure is non-fatal
  }

  return ruleResult;
}
