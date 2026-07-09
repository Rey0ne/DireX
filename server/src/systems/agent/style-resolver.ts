/* === Style Resolver — runtime style resolution + aggregated context === *
 * Bridges style-db.ts (knowledge base) into profiles.ts and pipeline.ts
 * so the style data isn't duplicated across system prompts.
 */

import { FASHION_STYLE_DB, INTERIOR_STYLE_DB, STYLE_DECISION_RULES, STYLE_POLISH_HINT, decideStyle, type DimensionInput, type StyleDecision } from './style-db.js';

// ── Style matching via keyword scoring ─────────────

/** Score how well a style name/description matches the user input. */
function matchScore(input: string, candidate: string): number {
  const lower = input.toLowerCase();
  const candLower = candidate.toLowerCase();
  let score = 0;

  // Direct substring match
  if (lower.includes(candLower)) score += 10;
  if (candLower.includes(lower)) score += 5;

  // Word-level overlap
  const inputWords = new Set(lower.split(/[\s,，、|/]+/).filter(Boolean));
  const candWords = candLower.split(/[\s,，、|/()（）]+/).filter(Boolean);
  for (const w of inputWords) {
    if (w.length < 2) continue;
    if (candWords.some(cw => cw === w)) score += 3;
    if (candWords.some(cw => cw.includes(w))) score += 1;
  }

  return score;
}

/** Resolve the best-matching fashion style description from the style DB. */
export function resolveFashionStyle(userInput: string): string {
  if (!userInput?.trim()) return STYLE_POLISH_HINT;

  const input = userInput.trim();
  const sections = FASHION_STYLE_DB.split('\n');
  const results: { style: string; score: number }[] = [];

  // Extract style names from table rows
  for (const line of sections) {
    const match = line.match(/^\|\s*([^|]+?)\s*\|/);
    if (match) {
      const styleName = match[1].trim();
      if (styleName && !styleName.includes('---') && !styleName.includes('风格')) {
        const score = matchScore(input, styleName);
        if (score > 0) results.push({ style: styleName, score });
      }
    }
  }

  // Also check designer keywords and trend sections
  const designerSection = sections.join('\n');
  for (const kw of ['Chanel', 'Dior', 'McQueen', 'Yohji', 'Comme', 'Rick Owens', 'Simone Rocha', 'Phoebe Philo']) {
    if (input.toLowerCase().includes(kw.toLowerCase())) {
      results.push({ style: kw, score: 8 });
    }
  }

  results.sort((a, b) => b.score - a.score);

  if (results.length === 0) return STYLE_POLISH_HINT;

  // Return the most relevant style line + surrounding context
  const topStyles = results.slice(0, 3).map(r => r.style);
  return `## 匹配风格参考 (Matched Style Reference)\n用户输入: "${input}" → 最佳匹配: ${topStyles.join(', ')}\n\n${FASHION_STYLE_DB}`;
}

/** Resolve the best-matching interior style from the style DB. */
export function resolveInteriorStyle(userInput: string): string {
  if (!userInput?.trim()) return '';

  const input = userInput.trim();
  const sections = INTERIOR_STYLE_DB.split('\n');
  const results: { style: string; score: number }[] = [];

  for (const line of sections) {
    const match = line.match(/^\|\s*([^|]+?)\s*\|/);
    if (match) {
      const styleName = match[1].trim();
      if (styleName && !styleName.includes('---') && !styleName.includes('风格')) {
        const score = matchScore(input, styleName);
        if (score > 0) results.push({ style: styleName, score });
      }
    }
  }

  results.sort((a, b) => b.score - a.score);

  if (results.length === 0) return '';

  const topStyles = results.slice(0, 3).map(r => r.style);
  return `## 匹配空间风格参考\n用户输入: "${input}" → 最佳匹配: ${topStyles.join(', ')}\n\n${INTERIOR_STYLE_DB}`;
}

/** Build aggregated style context for injection into prompts.
 *  Includes the full style reference + decision rules when a visual style is specified,
 *  or a condensed default reference otherwise.
 */
export function getStyleContext(visualStyle?: string): string {
  if (visualStyle?.trim()) {
    const style = visualStyle.trim();
    const fashion = resolveFashionStyle(style);
    const interior = resolveInteriorStyle(style);
    return [fashion, interior].filter(Boolean).join('\n\n---\n\n');
  }
  // Default: short polish hint
  return STYLE_POLISH_HINT;
}

// ── 5-Dimension decision helpers ──────────────────

/**
 * Apply a style decision to shot parameters, returning a human-readable
 * style instruction string for injection into image generation prompts.
 */
export function applyStyleDecision(
  shotParams: { era?: string; region?: string; sceneFunction?: string; mood?: string; identity?: string },
  styleResult?: StyleDecision,
): string {
  const decision = styleResult || decideStyle(shotParams as DimensionInput);

  const parts: string[] = [];
  parts.push(`整体风格：${decision.primary}(70%) + ${decision.secondary}(20%) + ${decision.accent}(10%)`);

  if (decision.colorDirection) {
    parts.push(`配色方向：${decision.colorDirection}`);
  }
  if (decision.lightingDirection) {
    parts.push(`灯光方向：${decision.lightingDirection}`);
  }
  if (decision.materialDirection) {
    parts.push(`材质方向：${decision.materialDirection}`);
  }
  if (decision.fashionStyles.length > 0) {
    parts.push(`服装风格参考：${decision.fashionStyles.join(', ')}`);
  }
  if (decision.interiorStyles.length > 0) {
    parts.push(`场景风格参考：${decision.interiorStyles.join(', ')}`);
  }

  return `[Style Decision · confidence=${decision.confidence}] ${parts.join('。')}。`;
}

// ── Re-export style-db strings for template literal use in profiles ──

export { FASHION_STYLE_DB, INTERIOR_STYLE_DB, STYLE_DECISION_RULES, STYLE_POLISH_HINT };
