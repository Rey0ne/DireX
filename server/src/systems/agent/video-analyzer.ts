/* === Video Prompt Enricher === */
/* Agent does NOT analyze images/videos — Seedance sees them directly via API.
   Agent only enriches user's Chinese prompt with cinematic visual detail:
   motion, physics, lighting, atmosphere, micro-expressions — without changing original intent. */

import { gpt5Chat } from '../ai/gemini.js';

const VIDEO_ENRICH_SYSTEM = `你是一个视频生成提示词优化器。用户会给你一段中文场景描述，你需要将其润色为更适合视频生成模型的详细提示词。

核心原则：
1. 你绝不翻译 — 输入中文，输出中文。Seedance 2.0 原生支持中文。
2. 你绝不改变原意 — 不新增人物、不改变场景设定、不魔改故事。
3. 你只是「补全画面」— 把用户没说但画面中理应存在的视觉细节补上。

你需要补充的维度：
- 物理动态：发丝飘动方向、衣摆/裙摆随动作的摆动、布料褶皱变化、坠感
- 粒子与氛围：空气中的微尘/光点/花瓣/萤火虫、圣光中的丁达尔效应、雾气流动
- 光线细节：光源方向、光的颜色温度、阴影柔硬度、逆光/侧光/顶光、体积光
- 微表情与肢体：眼神方向、嘴角微动、指尖动作、呼吸起伏、步伐节奏
- 材质质感：丝绸反光、金属锈迹、木质纹理、水面波纹、玻璃折射
- 环境纵深：前景/中景/远景层次、背景虚化程度、空间透视

参考素材处理规则：
- 如果用户提供了参考图片：告诉模型「使用参考图作为角色/场景的外观依据」
- 如果用户提供了参考视频：告诉模型「使用参考视频的运镜轨迹、节奏、动作时机」
- 你不需要描述参考图片或视频的具体内容 — Seedance 会直接看到原文件

输出格式：
- 直接输出一段优化的中文提示词，长度控制在 150-400 字
- 不分段、不用 markdown、不用 bullet points
- 语言风格：描述性、视觉化、电影感
- 如果用户原意已经足够详细，适当轻量化优化，不要过度堆砌`;

export async function compileVideoPrompt(
  userInput: string,
  hasImageRefs: boolean,
  hasVideoRefs: boolean,
): Promise<string> {
  const refHints: string[] = [];
  if (hasImageRefs) refHints.push('用户提供了参考图片（角色/场景），请在提示词中指引模型以参考图为外观依据。');
  if (hasVideoRefs) refHints.push('用户提供了参考视频（运镜/动作），请在提示词中指引模型以参考视频的运镜轨迹、节奏和动作时机为准。');

  const userContent = [
    refHints.length ? '参考素材提示：\n' + refHints.join('\n') : '',
    '',
    '用户原始描述：',
    userInput,
    '',
    '请输出优化后的中文视频生成提示词（150-400字，视觉化、电影感，不翻译）：',
  ].filter(Boolean).join('\n');

  console.log('[video-enricher] Enriching prompt, hasImg=' + hasImageRefs + ' hasVid=' + hasVideoRefs);
  const result = await gpt5Chat(
    [{ role: 'system', content: [{ type: 'input_text', text: VIDEO_ENRICH_SYSTEM }] },
     { role: 'user', content: [{ type: 'input_text', text: userContent }] }],
    { effort: 'low', timeoutMs: 30000, maxOutputTokens: 1000 }
  );

  if (!result) {
    console.log('[video-enricher] Enrichment failed, falling back to user input');
    return userInput;
  }

  console.log('[video-enricher] Enriched: ' + result.length + ' chars — ' + result.slice(0, 120));
  return result;
}
