/* === PromptCompiler Agent === */
/* shot.struct → compiled prompt (CN/EN + back-translation + negative) */

import type { ShotMeta } from '../types/graph';

export interface CompiledPrompt {
  en: string;
  cn: string;
  negative: string;
  debug: { field: string; contribution: string }[];
}

const FRAMING_CN_EN: Record<string, string> = {
  '特写': 'extreme close-up',
  '近景': 'close-up shot',
  '中景': 'medium shot',
  '全景': 'full shot',
  '远景': 'long shot',
  '大远景': 'extreme long shot',
};

const MOVEMENT_CN_EN: Record<string, string> = {
  '固定': 'static tripod shot',
  '推': 'dolly in / push in',
  '拉': 'dolly out / pull back',
  '摇': 'pan',
  '移': 'tracking shot',
  '跟': 'follow shot',
  '升降': 'crane / jib shot',
  '手持': 'handheld shot',
};

const LIGHTING_CN_EN: Record<string, string> = {
  '顶光': 'top lighting',
  '侧光': 'side lighting',
  '逆光': 'backlight / rim lighting',
  '顺光': 'front lighting',
  '底光': 'bottom lighting',
  '柔光': 'soft diffused lighting',
  '硬光': 'hard directional lighting',
  '霓虹': 'neon lighting',
};

export function compileShotToPrompt(shot: ShotMeta): CompiledPrompt {
  const debug: CompiledPrompt['debug'] = [];
  const parts: string[] = [];

  // Camera setup
  const cameraParts: string[] = [];
  if (shot.framing) {
    const en = FRAMING_CN_EN[shot.framing] || shot.framing;
    cameraParts.push(en);
    debug.push({ field: 'framing', contribution: en });
  }
  if (shot.movement) {
    const en = MOVEMENT_CN_EN[shot.movement] || shot.movement;
    cameraParts.push(en);
    debug.push({ field: 'movement', contribution: en });
  }
  if (shot.lens) {
    cameraParts.push(`${shot.lens} lens`);
    debug.push({ field: 'lens', contribution: `${shot.lens} lens` });
  }
  if (shot.angle) {
    cameraParts.push(`${shot.angle} angle`);
    debug.push({ field: 'angle', contribution: `${shot.angle} angle` });
  }
  if (cameraParts.length > 0) parts.push(`Camera: ${cameraParts.join(', ')}`);

  // Lighting
  const lightParts: string[] = [];
  if (shot.key) {
    const en = LIGHTING_CN_EN[shot.key] || shot.key;
    lightParts.push(en);
    debug.push({ field: 'key', contribution: en });
  }
  if (shot.mood) {
    lightParts.push(`${shot.mood} atmosphere`);
    debug.push({ field: 'mood', contribution: `${shot.mood} atmosphere` });
  }
  if (shot.color) {
    lightParts.push(`${shot.color} color palette`);
    debug.push({ field: 'color', contribution: `${shot.color} color palette` });
  }
  if (lightParts.length > 0) parts.push(`Lighting: ${lightParts.join(', ')}`);

  // Intent
  if (shot.intent_cn) {
    parts.push(`Scene: ${shot.intent_cn}`);
    debug.push({ field: 'intent_cn', contribution: shot.intent_cn });
  }

  const en = parts.join('. ') + '. Cinematic quality, 8K, highly detailed, photorealistic.';
  const cn = shot.intent_cn || '';
  const negative = 'blurry, low quality, distorted, deformed, watermark, text, logo, ugly, bad composition, oversaturated, jpeg artifacts';

  return { en, cn, negative, debug };
}
