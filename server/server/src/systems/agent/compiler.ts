/* === Agent Compiler === */
/* DeepSeek V4 (understand CN) → Gemini 3 Pro (polish EN) → output */
/* Falls back to rule-based if LLM keys unavailable */

import { geminiChat } from '../ai/gemini.js';
import { getProfile } from '../../config.js';
import type { CompiledPrompt } from '../../../../shared/api-types.js';

// ─── CN→EN rule tables ────────────────────────
const FRAMING: Record<string, string> = { '特写':'extreme close-up','近景':'close-up shot','中景':'medium shot','全景':'full shot','远景':'long shot','大远景':'extreme long shot' };
const MOVEMENT: Record<string, string> = { '固定':'static tripod shot','推':'dolly in','拉':'dolly out','摇':'pan','移':'tracking','跟':'follow','升降':'crane','手持':'handheld' };
const LIGHTING: Record<string, string> = { '顶光':'top lighting','侧光':'side lighting','逆光':'backlight','顺光':'front lighting','底光':'bottom lighting','柔光':'soft diffused','硬光':'hard directional','霓虹':'neon' };

function compileRules(shot: Record<string, string>): CompiledPrompt {
  const debug: CompiledPrompt['debug'] = [];
  const parts: string[] = [];
  const cam: string[] = [];
  if (shot.framing) { const en = FRAMING[shot.framing] || shot.framing; cam.push(en); debug.push({ field:'framing', contribution:en }); }
  if (shot.movement) { const en = MOVEMENT[shot.movement] || shot.movement; cam.push(en); debug.push({ field:'movement', contribution:en }); }
  if (shot.lens) { cam.push(`${shot.lens} lens`); debug.push({ field:'lens', contribution:`${shot.lens} lens` }); }
  if (shot.angle) { cam.push(`${shot.angle} angle`); debug.push({ field:'angle', contribution:`${shot.angle} angle` }); }
  if (cam.length) parts.push(`Camera: ${cam.join(', ')}`);

  const lit: string[] = [];
  if (shot.key) { const en = LIGHTING[shot.key] || shot.key; lit.push(en); debug.push({ field:'key', contribution:en }); }
  if (shot.mood) { lit.push(`${shot.mood} atmosphere`); debug.push({ field:'mood', contribution:`${shot.mood} atmosphere` }); }
  if (shot.color) { lit.push(`${shot.color} color palette`); debug.push({ field:'color', contribution:`${shot.color} color palette` }); }
  if (lit.length) parts.push(`Lighting: ${lit.join(', ')}`);

  if (shot.intent_cn) { parts.push(`Scene: ${shot.intent_cn}`); debug.push({ field:'intent_cn', contribution: shot.intent_cn }); }

  return {
    en: parts.join('. ') + '. Cinematic quality, 8K, highly detailed, photorealistic.',
    cn: shot.intent_cn || '',
    negative: 'blurry, low quality, distorted, deformed, watermark, text, logo',
    debug,
  };
}

// ─── Main compile ──────────────────────────────
export async function compilePrompt(
  shot?: Record<string, string>,
  rawText?: string,
  referenceUrls?: string[]
): Promise<CompiledPrompt> {
  const config = getProfile();

  // Build reference image hint for LLM
  const refHint = referenceUrls && referenceUrls.length > 0
    ? `\n\n[图生图模式: 用户提供了 ${referenceUrls.length} 张参考图片，在提示词中以 [图:名称] 标签标记。用户可能在描述一个图像合成/融合任务，例如将某张图的角色放到另一张图的场景中，或以某张图为主体进行风格变换。请根据用户提示词的语义，理解每张参考图在生成任务中的角色（主体/场景/风格/元素），并据此生成精确的英文图像生成提示词。]`
    : '';

  // Raw text only — no structured shot data
  if (!shot || (!shot.intent_cn && !shot.framing && !shot.movement && !shot.key)) {
    if (rawText) {
      const compiled: CompiledPrompt = { en: rawText, cn: rawText, negative: 'blurry, low quality', debug: [{ field:'raw', contribution: rawText }] };
      if (config.promptEnhancement) {
        const ds = await geminiChat(config.systemPrompt, `Transform into a detailed English image prompt:${refHint}\n\n${rawText}`);
        if (ds) { compiled.en = ds; compiled.debug.push({ field:'gemini', contribution:'compiled' }); }
        if (referenceUrls?.length) compiled.debug.push({ field:'refs', contribution: `${referenceUrls.length} images` });
        const gm = await geminiChat(config.polishPrompt, `Polish:\n\n${compiled.en}`);
        if (gm) { compiled.en = gm; compiled.debug.push({ field:'gemini', contribution:'polished' }); }
      }
      return compiled;
    }
    return { en:'', cn:'', negative:'', debug:[] };
  }

  // Structured shot data
  const compiled = compileRules(shot);

  if (config.promptEnhancement) {
    const userContent = rawText || shot.intent_cn || compiled.cn;
    const debugInfo = compiled.debug.map(d => d.contribution).join(', ');

    const ds = await geminiChat(config.systemPrompt, `Technical context: ${debugInfo}${refHint}\n\nScene: ${userContent}`);
    if (ds) { compiled.en = ds; compiled.debug.push({ field:'gemini', contribution:'compiled' }); }
    if (referenceUrls?.length) compiled.debug.push({ field:'refs', contribution: `${referenceUrls.length} images` });

    const gm = await geminiChat(config.polishPrompt, `Original: ${userContent}\n\nDraft: ${compiled.en}`);
    if (gm) { compiled.en = gm; compiled.debug.push({ field:'gemini', contribution:'polished' }); }

    console.log(`[agent] Pipeline: ${compiled.debug.map(d => d.field).join(' → ')}`);
  }

  return compiled;
}
