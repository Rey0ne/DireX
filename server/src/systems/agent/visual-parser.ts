/* === Visual Parsing Agent — 视觉拆解 + 主体提取 + Prompt编译 === */

import { gpt5Chat } from '../ai/gemini.js';

// ─── Types ───────────────────────────────────────
export type ExtractMode = 'character' | 'prop' | 'scene' | 'auto';

export interface ExtractionIntent {
  extractTarget: string;
  sourcePosition?: string;
  preserve: string[];
  remove: string[];
  newScene: string;
  outputType: string;
  camera: string;
  lighting: string;
  finalPrompt: string;
  /** 5-layer structural constraints (semantic-drift prevention) */
  structuralConstraints?: string[];
  /** Critical "DO NOT generate" rules */
  negativeConstraints?: string[];
  /** Widest category label (e.g. "fixed-blade knife", not "hunting knife") */
  category?: string;
}

// ─── Keyword Detection ───────────────────────────
// ─── Intent Detection ─────────────────────────────
// Requires BOTH:
//   1. Reference to an image source (图中/图里/这张/那张/参考图/第X张/宫格...)
//   2. An extraction action (提取/抠/单独提出/单独生成/分离...)
// Plus a few very strong standalone keywords that unambiguously mean extraction.

const IMAGE_SOURCE_RE = /图中|图里|这张|那张|参考图|第.?[张个幅]|宫格|九宫格|某.?[张个幅]/i;
const EXTRACTION_ACTION_RE = /提取|抠出|单独抠|单独提取|单独提出|单独生成|单独拿|分离出|去除背景|去掉背景/i;
const STRONG_EXTRACTION_RE = /^提取|^抠出|^单独抠|^把.*提取|^把.*抠/i;

export function detectExtractionIntent(userPrompt: string): boolean {
  // Strong standalone keywords at start of prompt
  if (STRONG_EXTRACTION_RE.test(userPrompt.trim())) return true;
  // Natural language: image reference + extraction action
  if (IMAGE_SOURCE_RE.test(userPrompt) && EXTRACTION_ACTION_RE.test(userPrompt)) return true;
  return false;
}

// ─── System Prompts ──────────────────────────────

/** Character extraction — 人物完整保留，去除背景/次要人物 */
const CHARACTER_SYSTEM = `你是图像提取专家。从参考图中提取指定的人物角色。

规则：
1. 仔细观察参考图，识别目标人物
2. 完整保留人物外观特征：五官、脸型、眼型/颜色、鼻型、唇形、肤色、发型/发色、体型、年龄、服装款式/颜色/面料、配饰
3. 禁止美化：不要更漂亮/更年轻/更精致/更瘦/更白
4. 禁止添加参考图中不存在的道具、配饰、武器
5. 去除：背景、次要人物、无关物品
6. 新场景：干净的人像摄影背景（如纯色幕布、柔光工作室）

按以下格式输出：

## Subject
[中文：目标人物的简短描述]

## Preserve
- [保留项1]
- [保留项2]
...

## Remove
- [去除项1]
- [去除项2]
...

## New Scene
[中文：新场景描述]

## Camera
[英文：镜头参数，如 85mm portrait lens, eye-level]

## Lighting
[英文：灯光描述，如 soft key light from front, subtle rim light]

## Final Image2 Prompt
[纯英文生成提示词，可直接喂给Image2。包含Preserve/Remove/Scene/Camera/Lighting全部信息，禁止用"Character identity"占位符代替实际描述]`;

/** Prop extraction — 参考图直引 + 多层级几何约束，防语义漂移 */
const PROP_SYSTEM = `你是产品几何特征提取与参考图直引专家。

你的核心任务不是用文字描述物品，而是：
1. 从参考图中提取决定物品身份的结构层信息（几何/比例/部件关系）
2. 编写约束型提示词，让 Image2 模型在参考图基础上做约束生成

═══════════════════════════════════
核心原则
═══════════════════════════════════

A. 语义标签 vs 结构约束
   语义标签（"猎刀"、"匕首"、"香水瓶"）在生成模型的潜在空间里是模糊集合，
   会导致模型按训练数据概率补全出相似但不相同的物品。
   结构约束（"单刃/Drop Point刀尖/无护手/三颗铆钉"）才是决定物品身份的信息。
   你的输出必须以后者为主，前者仅用于定位目标。

B. 参考图是视觉源
   模型能看到原图。不需要你把物品转成文字再让模型画一遍。
   提示词的作用是约束框架，不是描述内容。

C. 提取层级（自顶向下，5层）
   对参考图中的目标物品，按以下层级逐层分析：

   第1层 · 类别定位
   - 这是什么类型的产品？（只定类，不定型）
   - 用最宽泛的分类词，避免窄化

   第2层 · 功能结构
   - 有哪些决定功能的结构特征？
   - 例：刃数、开刃位置、固定/折叠、有无护手、有无刀格
   - 例：瓶口类型、是否喷雾、有无泵头、瓶盖结构

   第3层 · 形态结构
   - 有哪些决定外形识别度的形状特征？
   - 例：刀尖形状、刀背曲线、刀腹弧度、握柄轮廓
   - 例：瓶身曲线、肩部过渡、底部形状

   第4层 · 细节约束
   - 有哪些可见的具体元素？数量是多少？
   - 例：铆钉×3、黄铜色、木质握柄纹路、刀面处理
   - 例：logo位置、标签形状、刻度标记

   第5层 · 排除约束（关键！）
   - 这类物品常见的变体中，哪些在参考图里确定没有？
   - 例：非双刃匕首、非锯齿刃、非折叠结构
   - 例：非喷雾瓶、非按压式、非磨砂玻璃
   - 这是防止生成模型漂移到"相似但错误"的最重要防线

D. 部件感知
   如果物品有清晰的结构部件，逐部件列出关键约束：
   如刀具 → 刀尖/刀刃/刀背/刀腹/护手/刀柄/铆钉/柄尾
   如瓶罐 → 瓶盖/瓶口/瓶肩/瓶身/瓶底/标签
   如电子 → 屏幕/边框/按键/接口/logo位置
   不要硬编码部件名 — 根据实际看到的物品灵活命名

E. 禁止行为
   - 禁止用模糊语义标签代替具体结构描述
   - 禁止在 Final Prompt 中写"a wooden hunting knife"这种一句话概述
   - 禁止添加参考图中不存在的部件、功能、装饰
   - 禁止改变物品的比例关系

F. 忠实参考图
   - 所有结构特征、形态描述、细节约束必须严格来源于参考图中实际可见的内容
   - 描述要尽可能详细：每个结构部件的形状、尺寸比例、位置关系、材质纹理都要展开写
   - 不要根据类别名称脑补该类物品"通常应该有什么"
   - 参考图中看不到的特征 → 不写；看到了但不确定的 → 如实标注不确定
   - 排除约束同样：只排除参考图中明确不存在的变体

═══════════════════════════════════
输出格式
═══════════════════════════════════

## Subject
[中文：目标物品 + 在参考图中的位置]

## Category
[英文：最宽泛的类别词，如"fixed-blade knife"，而非"hunting knife"]

## Functional Structure
- [功能层约束，英文，如"single-edge blade"、"fixed blade, no folding mechanism"]
- [...]

## Morphological Structure
- [形态层约束，英文，如"drop-point tip profile"、"straight spine, no serrations"]
- [...]

## Detail Constraints
- [细节层约束，英文 + 数量，如"3 brass rivets on handle"、"satin finish on blade"]
- [...]

## Negative Constraints
- [排除约束，英文。DO NOT generate X / NO double-edged / NOT a folding knife]
- [...]

## Remove
- [去除项：背景、手持人物、无关物品]

## New Scene
[英文：新场景。纯白背景 product shot on pure white background #FFFFFF, subtle contact shadow below]

## Camera
[英文：通常用 orthographic front view，或根据三视图需求调整]

## Lighting
[英文：如 even diffused studio lighting, no harsh shadows, material texture clearly visible]

## Final Image2 Prompt
[纯英文。必须以"Use the attached reference image as the primary visual source."开头。
然后整合 Structural Constraints（Functional + Morphological + Detail 三层的精炼版）。
然后单独列出 Critical Negative Constraints。
最后简写 Scene / Camera / Lighting 约束。

结构示例：
Use the attached reference image as the primary visual source. Extract the [宽泛类别] shown in the reference.

Critical structural constraints:
- [几何特征1]
- [几何特征2]
- ...
- [比例关系]
- [部件约束]

Do NOT generate:
- [排除项1]
- [排除项2]

Scene: [纯白背景等]
Camera: [镜头]
Lighting: [灯光]

注意：Final Prompt 中禁止出现模糊的语义标签（如"hunting knife"、"dagger"）。
用结构特征描述物体身份，不要用品类名称代替。]`;

/** Scene extraction — 环境/建筑提取，去除前景人物 */
const SCENE_SYSTEM = `你是场景与环境提取专家。从参考图中提取场景/环境/建筑。

规则：
1. 仔细观察参考图，识别场景元素：空间结构、建筑风格、自然环境、光影方向、色调
2. 完整保留：空间比例、建筑细节、植被类型、地形特征、光影方向与质感、色调氛围
3. 去除：前景人物、车辆、临时物品
4. 禁止添加参考图中不存在的建筑、山脉、水体
5. 新场景：保持原场景的空间结构，清空动态元素

按以下格式输出：

## Subject
[中文：目标场景的简短描述]

## Preserve
- [保留项1]
...

## Remove
- [去除项1]
...

## New Scene
[中文：清理后的场景描述]

## Camera
[英文：如 wide establishing shot, deep focus]

## Lighting
[英文：如 natural sunlight from left, long shadows]

## Final Image2 Prompt
[纯英文生成提示词]`;

/** Auto mode — AI 自行判断目标类型，结构层分析 + 语义层防漂移 */
const AUTO_SYSTEM = `你是视觉拆解专家。根据参考图和用户指令，判断提取目标的类型（人物/物品/场景），并按对应规则处理。

═══════════════════════════════════
类型判断
═══════════════════════════════════

- 人物：用户要提取的是人（角色/模特/人物），关心五官/发型/服装
  → 按 Character Rules 处理
- 物品：用户要提取的是物（产品/道具/工具/装备/配件/载具）
  → 按 Prop Rules 处理
- 场景：用户要提取的是环境（建筑/室内/自然景观）
  → 按 Scene Rules 处理

═══════════════════════════════════
Prop Rules（物品 — 核心）
═══════════════════════════════════

参考图是视觉源。你的任务不是用文字描述物品让模型重绘，而是提取结构约束。
忠实按照图片实际内容提取，不要根据类别名称脑补"通常应该有什么"。
描述要尽可能详细：每个结构部件的形状、比例、位置关系、材质、颜色都要展开。

5层分析（自顶向下）：
第1层·类别定位 — 最宽泛的分类词，不定型
第2层·功能结构 — 决定功能的结构特征（刃数/开刃方式/固定or折叠/有无护手…）
第3层·形态结构 — 决定外形识别度的形状特征（刀尖形状/瓶身曲线/边框弧度…）
第4层·细节约束 — 可见的具体元素 + 数量（铆钉×3/logo位置…）
第5层·排除约束 — 这类物品常见但参考图确定没有的变体（非双刃/非折叠/非磨砂…）

最终输出结构约束 + 排除约束，而非语义标签。
"单刃固定刀片/Drop Point刀尖/无护手/木柄三铆钉" 优于 "一把猎刀"。
因为"猎刀"在生成模型的潜在空间里是模糊语义集合，会漂移成"匕首"、"生存刀"等。

Final Prompt 必须以"Use the reference image as primary visual source"开头，
列出 Critical Structural Constraints（几何特征），
再列出 Negative Constraints（禁止生成的变体），
最后写 Scene/Camera/Lighting。

═══════════════════════════════════
Character Rules（人物）
═══════════════════════════════════

完整保留五官/发型/服装/体型，禁止美化，去除背景和次要人物。

═══════════════════════════════════
Scene Rules（场景）
═══════════════════════════════════

保留空间结构/光影/色调，去除动态元素。

═══════════════════════════════════
输出格式
═══════════════════════════════════

## Subject
[目标简短描述 + 在参考图中的位置]

## Extraction Type
[character / prop / scene]

（以下为 prop 类型的输出区块，character/scene 可简化）

## Category
[英文：最宽泛的类别词]

## Structural Constraints
- [功能层 + 形态层 + 细节层 的合并，英文]
- [...]

## Negative Constraints
- [英文。DO NOT generate X / NO double-edged / 等]
- [...]

## Remove
- [去除项]

## New Scene
[英文：pure white background #FFFFFF with subtle contact shadow / 或人物/场景的新背景]

## Camera
[英文镜头参数]

## Lighting
[英文灯光描述]

## Final Image2 Prompt
[纯英文生成提示词。

Prop类：必须以"Use the reference image as primary visual source"开头
→ 列出 Critical Structural Constraints
→ 列出 Negative Constraints（DO NOT generate...）
→ 简写 Scene/Camera/Lighting
→ 禁止用模糊语义标签代替结构描述

Character/Scene类：完整的英文生成提示词]`;

function getSystemPrompt(mode: ExtractMode): string {
  switch (mode) {
    case 'character': return CHARACTER_SYSTEM;
    case 'prop':      return PROP_SYSTEM;
    case 'scene':     return SCENE_SYSTEM;
    default:          return AUTO_SYSTEM;
  }
}

// ─── Output Parsing ──────────────────────────────

/** 从 GPT-5.4 原始输出中提取 Final Image2 Prompt */
function extractFinalPrompt(rawOutput: string): string {
  // Try ## Final Image2 Prompt header
  const headerMatch = rawOutput.match(/##\s*Final\s*Image2?\s*Prompt\s*\n+([\s\S]+?)(?:\n*$|$)/i);
  if (headerMatch) {
    const prompt = headerMatch[1].trim();
    if (prompt.length > 20) return prompt;
  }
  // Fallback: take the last substantial English paragraph
  const paragraphs = rawOutput.split(/\n\n+/).filter(p => {
    const cleaned = p.trim();
    return cleaned.length > 30 && /^[a-zA-Z]/.test(cleaned);
  });
  if (paragraphs.length > 0) {
    return paragraphs[paragraphs.length - 1].trim();
  }
  // Last resort: return raw (trimmed)
  return rawOutput.trim();
}

/** 从 GPT-5.4 原始输出中解析结构化 ExtractionIntent */
function parseIntent(rawOutput: string): ExtractionIntent {
  const extract = (label: string): string => {
    const re = new RegExp(`##\\s*${label}\\s*\\n+([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
    const m = rawOutput.match(re);
    return m ? m[1].trim() : '';
  };
  const list = (label: string): string[] => {
    const text = extract(label);
    if (!text) return [];
    return text.split('\n')
      .map(line => line.replace(/^[\s•\-*]+/, '').trim())
      .filter(Boolean);
  };

  return {
    extractTarget: extract('Subject') || '未识别',
    sourcePosition: undefined,
    preserve: list('Preserve'),
    remove: list('Remove'),
    newScene: extract('New Scene') || extract('NewScene') || '',
    outputType: extract('Extraction Type') || '',
    camera: extract('Camera') || '',
    lighting: extract('Lighting') || '',
    finalPrompt: extractFinalPrompt(rawOutput),
    // New: 5-layer structural extraction
    structuralConstraints: list('Structural Constraints'),
    negativeConstraints: list('Negative Constraints'),
    category: extract('Category') || undefined,
  };
}

// ─── Main Entry Point ────────────────────────────

export async function parseVisualIntent(
  userInput: string,
  referenceUrls: string[],
  mode: ExtractMode = 'auto',
): Promise<{ intent: ExtractionIntent; compiledPrompt: string } | null> {
  if (!referenceUrls.length) return null;

  // Convert data: URLs to public HTTP URLs
  const { uploadDataUrl } = await import('../ai/kie-provider.js');
  const publicUrls: string[] = [];
  for (const url of referenceUrls) {
    if (url.startsWith('data:')) {
      const uploaded = await uploadDataUrl(url);
      if (uploaded) publicUrls.push(uploaded);
      else console.log('[visual-parser] Failed to upload data URL, skipping ref');
    } else {
      publicUrls.push(url);
    }
  }
  if (!publicUrls.length) {
    console.log('[visual-parser] No public URLs available');
    return null;
  }

  // Extract @mention tags from user input to label images
  const mentionTags: string[] = [];
  const mentionRe = /@(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = mentionRe.exec(userInput)) !== null) {
    if (!mentionTags.includes(m[1])) mentionTags.push(m[1]);
  }

  // Build multimodal message: text instruction + labeled images + user command
  const userContent: Array<{ type: 'input_text'; text: string } | { type: 'input_image'; image_url: string }> = [];

  // Reference image labels
  userContent.push({ type: 'input_text', text: '以下是参考图：' });
  publicUrls.forEach((url, i) => {
    const tag = mentionTags[i] ? ` (@${mentionTags[i]})` : '';
    userContent.push({ type: 'input_text', text: `[参考图 #${i + 1}${tag}]` });
    userContent.push({ type: 'input_image', image_url: url });
  });

  // User command
  userContent.push({ type: 'input_text', text: `用户指令: ${userInput}

按照上述规则分析参考图，提取目标主体，输出分析结果和最终英文生成提示词。` });

  const systemPrompt = getSystemPrompt(mode);

  const messages = [
    { role: 'system' as const, content: [{ type: 'input_text' as const, text: systemPrompt }] },
    { role: 'user' as const, content: userContent },
  ];

  console.log('[visual-parser] GPT-5.4 analyzing ' + publicUrls.length + ' ref images, mode=' + mode);
  const t0 = Date.now();
  const rawOutput = await gpt5Chat(messages, { effort: 'high', timeoutMs: 180000 });

  if (!rawOutput) {
    console.log('[visual-parser] GPT-5.4 returned null after ' + (Date.now() - t0) + 'ms');
    return null;
  }

  console.log('[visual-parser] GPT-5.4 output ' + rawOutput.length + ' chars in ' + (Date.now() - t0) + 'ms');

  const intent = parseIntent(rawOutput);
  const compiledPrompt = intent.finalPrompt;

  if (!compiledPrompt || compiledPrompt.length < 20) {
    console.log('[visual-parser] Failed to extract valid Final Image2 Prompt');
    return null;
  }

  console.log('[visual-parser] Compiled prompt: ' + compiledPrompt.slice(0, 120) + '...');
  return { intent, compiledPrompt };
}
