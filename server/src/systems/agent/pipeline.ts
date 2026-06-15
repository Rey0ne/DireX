/* === Agent Pipeline — 4-Agent Orchestrator === */
/* Creative Producer → Art Director → Storyboard Director → Prompt Architect */

import { geminiChat, gpt5Chat, visionAnalyze } from '../ai/gemini.js';
import {
  CREATIVE_PRODUCER, ART_DIRECTOR, STORYBOARD_DIRECTOR, PROMPT_ARCHITECT, PROMPT_ANALYST,
  SCRIPT_ANALYST, SCRIPT_OVERVIEW, SCENE_SHOT, CHARACTER_EXTRACTOR,
  type AgentProfile,
} from './profiles.js';

const MAX_PREV_OUTPUT_CHARS = 600; // tight summary of each previous agent output

export interface PipelineContext {
  userInput: string;
  model: string;
  mode?: string;
  referenceUrls?: string[];
  referencePrompts?: string[]; // original prompts of the referenced images
  referenceAnalysis?: string[]; // vision analysis results (Gemini 3.1 Pro)
  aspect?: string;
  resolution?: string;
}

export interface AgentResult {
  agentId: string;
  agentName: string;
  output: string;
  durationMs: number;
}

export interface PipelineResult {
  creativeBrief: string;
  visualBible: string;
  storyboard: string;
  modelPrompt: string;
  trace: AgentResult[];
  totalDurationMs: number;
}

const VISION_ANALYSIS_PROMPT = `Analyze this image as a cinematography reference. Be thorough and objective — describe EXACTLY what you see, don't interpret or beautify.

Describe in detail:
1. CAMERA: angle (low/high/eye-level, specify degrees if apparent), shot size (extreme close-up to extreme wide), lens feel (wide, normal, telephoto compression), depth of field (shallow/deep, what's in focus)
2. COMPOSITION: subject placement (rule of thirds, center, off-center), leading lines, framing elements, negative space, symmetry/asymmetry
3. LIGHTING: key light direction & quality (hard/soft), fill light, rim/backlight, contrast ratio (high-key/low-key), practical lights visible
4. COLOR: color temperature (warm/cool/neutral), dominant colors, color contrast, saturation level, any notable color grading
5. SUBJECT: what/who is the main subject, their pose/stance, where they're looking, their relative size in frame
6. ENVIRONMENT: setting description, foreground/midground/background elements, atmospheric conditions (fog, haze, dust, rain, snow)
7. MOOD & STYLE: visual tone, genre references, any distinctive stylistic choices

Output as structured paragraphs. Do NOT summarize in 2-3 sentences — include ALL observable details.`;

async function fetchImageAsBase64(url: string): Promise<{ base64: string; mimeType: string } | null> {
  if (url.startsWith('data:')) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (match) { console.log('[vision] Extracted data URL, length=' + match[2].length); return { mimeType: match[1], base64: match[2] }; }
    console.log('[vision] Invalid data URL format');
    return null;
  }
  try {
    console.log('[vision] Fetching image: ' + url.slice(0, 80));
    const proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    const opts: any = {
      headers: { 'User-Agent': 'TapNow/1.0' },
    };
    if (proxy) {
      const { ProxyAgent } = await import('undici');
      opts.dispatcher = new ProxyAgent(proxy);
    }
    const resp = await fetch(url, opts);
    if (!resp.ok) { console.log('[vision] Fetch failed: HTTP ' + resp.status); return null; }
    const buffer = Buffer.from(await resp.arrayBuffer());
    const contentType = resp.headers.get('content-type') || 'image/png';
    console.log('[vision] Fetched image, size=' + buffer.length + ' type=' + contentType);
    return { mimeType: contentType, base64: buffer.toString('base64') };
  } catch (err) { console.log('[vision] Fetch error: ' + String(err).slice(0, 100)); return null; }
}

export async function analyzeReferenceImages(urls: string[]): Promise<string[]> {
  const results: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    console.log('[vision] Analyzing reference image ' + (i + 1) + '/' + urls.length);
    const img = await fetchImageAsBase64(urls[i]);
    if (!img) { results.push('[Unable to fetch image]'); continue; }
    const analysis = await visionAnalyze(VISION_ANALYSIS_PROMPT, img.base64, img.mimeType);
    results.push(analysis || '[Vision analysis failed]');
  }
  return results;
}

// ─── Character Profile Extraction (I2I) ─────────
const CHARACTER_EXTRACT_PROMPT = `Analyze the person in this image with forensic detail. Be OBJECTIVE — describe what you actually see, not what you assume. If uncertain about any feature, say "unclear" rather than guessing.

FACE & HEAD:
- Face shape (oval, round, square, rectangular, heart, diamond, triangle) — describe the actual bone structure
- Forehead (high/low, wide/narrow, smooth/lined)
- Jawline (sharp/soft/angular/rounded, width)
- Cheekbones (prominent/flat, high/low)
- Brow ridge (prominent/subtle)
- Chin (pointed/rounded/square/cleft, projection)

EYES:
- Shape (almond/round/hooded/monolid/deep-set/protruding)
- Size relative to face
- Distance apart (close-set/wide-set/average)
- Color (blue/green/brown/hazel/grey — be specific)
- Eyelashes (long/short, thick/sparse)
- Eyebrows (thick/thin, straight/arched, color, distance from eyes)

NOSE:
- Bridge (high/low, wide/narrow, straight/hooked)
- Tip (pointed/rounded/bulbous/upturned)
- Nostrils (wide/narrow, visible/not)
- Overall size relative to face

MOUTH:
- Lip thickness (thin/medium/full — upper vs lower)
- Width (wide/narrow/average)
- Cupid's bow (defined/subtle)
- Corners (upturned/downturned/neutral)

SKIN:
- Tone (very pale/pale/fair/light tan/medium tan/olive/brown/dark — be specific)
- Undertones (cool/pink, warm/golden, neutral, olive)
- Texture (smooth/rough, visible pores, freckles, acne, scars)
- Any distinguishing marks (moles, beauty marks, scars, birthmarks) — explicit location on face
- Wrinkles or aging signs (forehead lines, crow's feet, nasolabial folds)

HAIR:
- Color (black/brown/blonde/red/grey/white — specify shade)
- Length (buzz cut/short/medium/long — approximate in cm)
- Texture (straight/wavy/curly/coily)
- Style (describe the actual style seen)
- Volume (thin/medium/thick)
- Hairline (straight/receding/widow's peak)
- Facial hair (clean shaven/stubble/light beard/full beard/mustache — describe exactly)

AGE: approximate range (e.g., 25-30, 40-45, 60-65) based on visible indicators

ETHNICITY/ANCESTRY: Describe the actual facial features you observe (e.g., "fair skin, high nasal bridge, deep-set round eyes, angular jaw, light brown wavy hair" rather than just labeling). Focus on the combination of features visible.

BODY (if visible):
- Build (slim/athletic/average/heavy — describe proportions)
- Shoulders (broad/narrow/average)
- Height appearance (short/average/tall — relative impression)
- Posture (erect/slouched/relaxed/tense)

CLOTHING (each visible garment, top to bottom):
- Type (jacket, shirt, dress, etc.)
- Color & pattern (be specific)
- Fabric & texture
- Fit (tight/regular/loose/oversized)
- Neckline or collar style
- Sleeves (long/short/none)
- Any visible logos, text, graphics, badges, patches — describe exactly
- Accessories (glasses, jewelry, watch, hat, scarf, belt, bag)

If there is NO person in the image, reply ONLY "NO_PERSON".
If there are MULTIPLE people, describe the most prominent/foreground person.`;

export interface CharacterProfile {
  hasPerson: boolean;
  description: string; // structured character description, or empty if no person
}

export async function extractCharacterProfile(url: string): Promise<CharacterProfile> {
  console.log('[char] Extracting character profile: ' + url.slice(0, 80));
  const img = await fetchImageAsBase64(url);
  if (!img) return { hasPerson: false, description: '' };
  const result = await visionAnalyze(CHARACTER_EXTRACT_PROMPT, img.base64, img.mimeType);
  if (!result || result.includes('NO_PERSON') || result.includes('[Vision analysis failed]')) {
    console.log('[char] No person detected or analysis failed');
    return { hasPerson: false, description: '' };
  }
  console.log('[char] Profile extracted: ' + result.slice(0, 100));
  return { hasPerson: true, description: result };
}

// ─── I2I Prompt Compiler — Reference Hierarchy ──

const I2I_SYSTEM_PROMPT = `你是 I2I (Image-to-Image) 提示词编译专家。收到多张参考图的视觉分析后，你必须：

## ⚠️ CRITICAL RULE — 文本 vs 图片权重
图像生成模型中，文本 Prompt 的权重大于参考图片。如果文本中描述了角色外貌，模型会优先采信文本而忽略参考图。
因此：FINAL PROMPT 中禁止描述角色五官/发型/体型/肤色/种族。角色身份100%由参考图片承载，文本只描述动作、表情、场景、光影、构图。

## ⚠️ CRITICAL RULE — 角色特征铁律
[CHARACTER PROFILE] 标记的内容来自 Gemini Vision 对参考图的直接分析，是 GROUND TRUTH。
- CHARACTER IDENTITY 和 LOCKED ELEMENTS 章节用于文档记录和约束声明
- 但在 FINAL PROMPT 中，角色外貌特征不通过文本描述，而是用 "Character identity — see Reference Images" 引用
- 禁止根据你的训练数据或常识去"修正"、"补充"、"美化"角色特征
- [CHARACTER PROFILE] 没提到的特征（如胡须、眼镜、痣、纹身） = 不存在，禁止添加
- 如果你不确定某个特征是否存在，默认 = 不存在

## 1. 参考图职责分类
根据视觉分析，将每张参考图分配唯一职责（一张图只承担一个职责）：

- PRIMARY REFERENCE (Identity Source): 包含角色面部/五官/发型/体型的图
- SECONDARY REFERENCE (Wardrobe Source): 包含服装/配饰细节的图
- TERTIARY REFERENCE (Composition Source): 包含构图/镜头角度/机位的图
- QUATERNARY REFERENCE (Environment Source): 包含场景/背景/环境的图
- STYLE REFERENCE (Lighting and Color Source): 包含光影/色调/氛围的图

如果某张图同时包含多个元素，选择它最突出的特征作为唯一职责。
如果某类职责没有对应参考图，标注为 "None — use prompt description"。

## 2. 角色身份隔离
Character identity is exclusively derived from PRIMARY REFERENCE.
从 PRIMARY REFERENCE 中提取并锁定以下属性：
facial proportions, face shape, eye shape, nose structure, mouth structure, hair style, hair color, age, gender, ethnicity, skin tone, body type

明确告诉模型：Do NOT inherit composition, background, lighting, camera angle, or environment from the PRIMARY REFERENCE.

## 3. 锁定元素（100% preserve）
Face: 100% preserve | Hair: 100% preserve | Facial proportions: 100% preserve
Eye shape: 100% preserve | Nose structure: 100% preserve | Jawline: 100% preserve
Clothing: 100% preserve (from SECONDARY REFERENCE if available)
Logo: 100% preserve | Text: 100% preserve

## 4. 可编辑元素
Pose: replace | Background: replace | Camera angle: replace
Environment: replace | Lighting: adjust

## 5. 一致性等级
根据用户需求自动判定：
- Level 1 Visual Reference: 参考即可，允许变化（灵感图）
- Level 2 Strong Match: 保持80%以上一致性（产品图）
- Level 3 Identity Lock: 保持95%以上身份一致性（角色/人物）

默认使用 Level 3 Identity Lock，除非用户明确要求更宽松。

## 6. 禁止优化与禁止添加
PROHIBITED — 禁止模型自行"美化"或"丰富"画面：
- 禁止美化外貌：更漂亮、更年轻、更精致、更瘦、更白、更对称
- 禁止添加元素：禁止添加参考图中不存在的道具、武器、配饰、装饰、物体、人物、动物
- 禁止修改场景：禁止自行添加或替换场景中的物体
- 核心原则：只能生成用户指令中明确要求的元素，不要"补充"或"丰富"画面
Maintain the EXACT appearance. No beautification. No adding. No enriching.

## 输出格式（必须严格遵循）

REFERENCE HIERARCHY
PRIMARY REFERENCE (Identity Source): [Image #N 或 "None"]
SECONDARY REFERENCE (Wardrobe Source): [Image #N 或 "None"]
TERTIARY REFERENCE (Composition Source): [Image #N 或 "None"]
QUATERNARY REFERENCE (Environment Source): [Image #N 或 "None"]
STYLE REFERENCE (Lighting and Color Source): [Image #N 或 "None"]

--------------------------------

LOCKED ELEMENTS
Face: 100% preserve
Hair: 100% preserve
Facial proportions: 100% preserve
Eye shape: 100% preserve
Nose structure: 100% preserve
Jawline: 100% preserve
Clothing: 100% preserve
[其他锁定元素]

--------------------------------

EDITABLE ELEMENTS
Pose: replace
Background: replace
Camera angle: replace
Environment: replace
Lighting: adjust

--------------------------------

CONSISTENCY LEVEL
Level [1/2/3] — [Visual Reference / Strong Match / Identity Lock]

--------------------------------

PROHIBITED CHANGES
DO NOT make the character: 更漂亮、更年轻、更精致、更瘦、更白、更对称
DO NOT add: 参考图中不存在的道具、武器、配饰、物体、人物、动物
DO NOT modify: 场景中不应出现的元素
角色五官/体型/肤色/年龄/道具必须与 PRIMARY REFERENCE 完全一致
只生成用户明确要求的元素，禁止自行"丰富"画面

--------------------------------

CHARACTER IDENTITY (from PRIMARY REFERENCE only — VERBATIM)
[将 PRIMARY REFERENCE 的 [CHARACTER PROFILE] 内容原样复制到此处，一字不改]
⚠️ CRITICAL: 角色特征必须从 [CHARACTER PROFILE] 中原样提取，禁止改写、禁止推断、禁止"优化"。
如果 [CHARACTER PROFILE] 中没有描述胡须，就绝对不能添加胡须。
如果 [CHARACTER PROFILE] 中描述的是特定种族/体型特征，就绝对不能改变。
DO NOT infer, embellish, or "improve" character features.
Character identity is exclusively derived from [Image #N].
Do NOT inherit composition, background, lighting, camera angle, or environment from [Image #N].

--------------------------------

FINAL PROMPT (EN)
[编译为英文生成提示词。关键规则：
- ❌ 禁止在 FINAL PROMPT 中描述角色的五官、发型、体型、肤色、种族 — 这些100%来自参考图
- ✅ 只描述可编辑元素：动作/表情、背景/场景、光影/色调、构图/机位
- ✅ 用 "Character identity, facial features, hair, body type, clothing — see Reference Images" 来引用角色
- 示例正确写法: "The character (exactly as shown in reference images) stands in a winter Nordic forest, looking forward with a mocking expression, not looking at camera. Heavy snow falls. Cold, bleak atmosphere. Midday winter light."
- 示例错误写法: "A tall Nordic man with blonde hair, blue eyes, sharp jawline..." ← 禁止！这会让模型忽略参考图]`;

export async function compileI2IPrompt(
  userInput: string,
  referenceUrls: string[],
  referenceAnalyses: string[],
  characterProfiles: CharacterProfile[] = [],
  referencePrompts: string[] = [],
): Promise<string> {
  // Extract @mention tags from user prompt to map names → image indices
  const mentionTags: string[] = [];
  const mentionRe = /@(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = mentionRe.exec(userInput)) !== null) {
    if (!mentionTags.includes(m[1])) mentionTags.push(m[1]);
  }

  // Build vision analysis summary with @mention name context
  // CRITICAL: Character profiles are marked as GROUND TRUTH — use VERBATIM
  const refSummaries = referenceUrls.map((_url, i) => {
    const tag = mentionTags[i] ? ` (@${mentionTags[i]})` : '';
    const sceneInfo = referenceAnalyses[i] || '[No analysis]';
    const charInfo = characterProfiles[i];
    const refPrompt = referencePrompts[i] || '';
    let block = `Image #${i + 1}${tag}:\n`;
    if (charInfo?.hasPerson && charInfo.description) {
      block += `[CHARACTER PROFILE — GROUND TRUTH, USE VERBATIM]\n${charInfo.description}\n`;
    }
    block += `[SCENE CONTEXT]: ${sceneInfo.slice(0, 200)}`;
    if (refPrompt) {
      block += `\n[ORIGINAL PROMPT]: ${refPrompt.slice(0, 200)}`;
    }
    return block;
  }).join('\n\n');

  const userContent = `参考图视觉分析:
${refSummaries}

用户指令: ${userInput}

请按照 REFERENCE HIERARCHY 格式编译输出。`;

  console.log('[i2i-compile] Starting compilation, ' + referenceUrls.length + ' refs');
  const result = await geminiChat(I2I_SYSTEM_PROMPT, userContent, 2000);
  if (!result) {
    console.log('[i2i-compile] Compilation failed, falling back to user input');
    return userInput;
  }
  console.log('[i2i-compile] Compiled ' + result.length + ' chars');
  return result;
}

// ─── I2I GPT-5 Compiler (reasoning.effort = high) ──
const I2I_GPT5_SYSTEM = `你是 I2I 提示词编译专家。根据参考图的视觉分析，为图像生成模型编写精准的生成提示词。

参考图有两种类型：
- 角色参考图(CHARACTER)：锁定人物身份 — 五官、发型、体型、肤色、种族、服装
- 构图参考图(SCENE/COMPOSITION)：提取镜头角度、景别、姿态、光线、氛围

规则：
1. 角色五官、发型、体型、肤色、种族 → 100% 从角色参考图提取，不在文本中描述
2. 服装 → 从角色参考图提取，不在文本中描述
3. 镜头角度、景别、姿态、构图 → 从构图参考图提取，写入 prompt
4. 光影、色调、氛围 → 从构图参考图提取，写入 prompt
5. 背景/场景/环境 → 优先从构图参考图提取，配合用户指令补充
6. 用 "Character identity, facial features, hair, body type, skin tone, and clothing — see reference images exactly as shown." 来引用角色
7. 禁止添加参考图中不存在的道具、武器、配饰、胡须、眼镜
8. 禁止美化：不要更漂亮、更年轻、更精致
9. 输出为一段连贯的英文提示词，不要格式标记`;

// GPT-5.4 I2I prompt compiler — sends reference images DIRECTLY to GPT-5.4 for vision analysis + prompt compilation.
// No separate Gemini Vision step needed; GPT-5.4 sees the actual images.
export async function compileI2IWithGPT5(
  userInput: string,
  referenceUrls: string[],
): Promise<string | null> {
  if (!referenceUrls.length) return null;

  // Convert data: URLs to public HTTP URLs (GPT-5.4 needs accessible URLs)
  const { uploadDataUrl } = await import('../ai/kie-provider.js');
  const publicUrls: string[] = [];
  for (const url of referenceUrls) {
    if (url.startsWith('data:')) {
      const uploaded = await uploadDataUrl(url);
      if (uploaded) publicUrls.push(uploaded);
      else console.log('[i2i-gpt5] Failed to upload data URL, skipping ref');
    } else {
      publicUrls.push(url);
    }
  }
  if (!publicUrls.length) { console.log('[i2i-gpt5] No public URLs available'); return null; }

  // Extract @mention tags from user prompt to label images
  const mentionTags: string[] = [];
  const mentionRe = /@(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = mentionRe.exec(userInput)) !== null) {
    if (!mentionTags.includes(m[1])) mentionTags.push(m[1]);
  }

  // Build user message: text instruction + reference images
  const userContent: any[] = [];
  userContent.push({ type: 'input_text', text: '参考图说明：' });
  publicUrls.forEach((url, i) => {
    const tag = mentionTags[i] ? ` (@${mentionTags[i]})` : '';
    userContent.push({ type: 'input_text', text: `[参考图 #${i + 1}${tag}]` });
    userContent.push({ type: 'input_image', image_url: url });
  });
  userContent.push({ type: 'input_text', text: `
用户指令: ${userInput}

请按照以下规则编译英文生成提示词：
1. 从角色参考图(@演员)中准确提取并描述：五官形状、眼睛颜色与形状、鼻梁高低与形状、嘴唇厚度、脸型、发型发色、肤色与底色、体型、年龄、服装款式与颜色面料。将这些特征明确写入prompt。
2. 从构图参考图(@动作，机位)中准确提取并描述：镜头角度(仰拍/俯拍/平视)、景别(特写/中景/全景)、构图方式、主体站位、光线方向与质感。
3. 光影、色调、氛围 → 从构图参考图提取并写入 prompt。
4. 背景/场景/环境 → 优先从构图参考图提取，配合用户指令补充。
5. 禁止添加参考图中不存在的道具、配饰、武器、装饰物。
6. 禁止美化：不要更漂亮、更年轻、更精致、更瘦、更白、更对称。
7. 保持角色参考图中人物的原始五官、发型、服装不变 — 不要改变或替换。
8. 输出为一段连贯的英文提示词，不要格式标记，不要用"Character identity..."占位符代替实际描述。` });

  const messages = [
    { role: 'system' as const, content: [{ type: 'input_text' as const, text: '你是 I2I 提示词编译专家。根据参考图，为图像生成模型编写精准的英文生成提示词。你直接看到参考图，所以你能准确描述图中的角色特征和构图信息。' }] },
    { role: 'user' as const, content: userContent },
  ];

  console.log('[i2i-gpt5] GPT-5.4 analyzing ' + publicUrls.length + ' ref images directly');
  const result = await gpt5Chat(messages, { effort: 'high' });
  if (result) {
    console.log('[i2i-gpt5] Compiled ' + result.length + ' chars');
    return result;
  }
  return null;
}

export async function runAgent(
  profile: AgentProfile,
  context: PipelineContext,
  previousOutputs: Record<string, string>,
  maxTokens = 1500
): Promise<AgentResult> {
  const t0 = Date.now();

  let contextBlock = '';
  for (const dep of profile.dependencies) {
    if (previousOutputs[dep]) {
      const prev = previousOutputs[dep];
      const truncated = prev.length > MAX_PREV_OUTPUT_CHARS
        ? prev.slice(0, MAX_PREV_OUTPUT_CHARS) + '\n...[truncated]'
        : prev;
      contextBlock += '\n\n--- ' + dep + ' 的输出 ---\n' + truncated;
    }
  }

  // Reference image analysis — prefer Gemini Vision, fallback to original prompts
  // Truncate each analysis to keep context lean; only include first 8 refs if > 8
  let refBlock = '';
  const MAX_REF_ANALYSIS_CHARS = 200;
  const MAX_REFS_IN_CONTEXT = 8;
  if (context.referenceUrls && context.referenceUrls.length > 0) {
    const refsToShow = context.referenceUrls.slice(0, MAX_REFS_IN_CONTEXT);
    if (context.referenceAnalysis && context.referenceAnalysis.length > 0) {
      const truncated = context.referenceAnalysis.slice(0, MAX_REFS_IN_CONTEXT).map(a =>
        a.length > MAX_REF_ANALYSIS_CHARS ? a.slice(0, MAX_REF_ANALYSIS_CHARS) + '...' : a
      );
      refBlock = '\n\n[参考图摘要]\n' + refsToShow.map((_, i) =>
        '图' + (i + 1) + ': ' + (truncated[i] || '-')
      ).join('\n');
      if (context.referenceUrls.length > MAX_REFS_IN_CONTEXT) {
        refBlock += '\n... (+' + (context.referenceUrls.length - MAX_REFS_IN_CONTEXT) + ' more)';
      }
    } else {
      refBlock = '\n\n[参考图原始Prompt]\n' + refsToShow.map((_, i) => {
        const p = context.referencePrompts?.[i] || '';
        return '图' + (i + 1) + ': ' + (p ? p.slice(0, 200) : '-');
      }).join('\n');
    }
  }

  const userMessage = '用户需求: ' + context.userInput +
    '\n目标模型: ' + context.model +
    '\n模式: ' + (context.mode || 'text-to-image') +
    (context.referenceUrls?.length ? '\n参考图片数量: ' + context.referenceUrls.length : '') +
    contextBlock +
    refBlock +
    '\n\n请按照你的角色职责输出。';

  // gpt-5-5 via Kie.ai Codex API
  const msgs: any[] = [
    { role: 'system', content: [{ type: 'input_text', text: profile.systemPrompt }] },
    { role: 'user', content: [{ type: 'input_text', text: userMessage }] },
  ];
  let output = await gpt5Chat(msgs, { effort: 'high', maxTokens });
  if (!output) output = await geminiChat(profile.systemPrompt, userMessage, maxTokens);
  return {
    agentId: profile.id,
    agentName: profile.name,
    output: output || '[' + profile.name + ' 未能生成输出]',
    durationMs: Date.now() - t0,
  };
}

export async function runAgentPipeline(context: PipelineContext): Promise<PipelineResult> {
  const t0 = Date.now();
  const trace: AgentResult[] = [];
  const outputs: Record<string, string> = {};

  console.log('[pipeline] Starting for: "' + context.userInput.slice(0, 60) + '..."');

  // Pre-process: analyze reference images with Gemini Vision
  if (context.referenceUrls && context.referenceUrls.length > 0 && !context.referenceAnalysis) {
    console.log('[pipeline] Analyzing ' + context.referenceUrls.length + ' reference image(s) with Vision...');
    context.referenceAnalysis = await analyzeReferenceImages(context.referenceUrls);
    console.log('[pipeline] Vision analysis complete');
  }

  try {
    console.log('[pipeline] Step 1: Creative Producer');
    const cp = await runAgent(CREATIVE_PRODUCER, context, outputs);
    outputs['creative-producer'] = cp.output; trace.push(cp);

    console.log('[pipeline] Step 2: Art Director');
    const ad = await runAgent(ART_DIRECTOR, context, outputs);
    outputs['art-director'] = ad.output; trace.push(ad);

    console.log('[pipeline] Step 3: Storyboard Director');
    const sd = await runAgent(STORYBOARD_DIRECTOR, context, outputs);
    outputs['storyboard-director'] = sd.output; trace.push(sd);

    console.log('[pipeline] Step 4: Prompt Architect');
    const pa = await runAgent(PROMPT_ARCHITECT, context, outputs);
    outputs['prompt-architect'] = pa.output; trace.push(pa);

    console.log('[pipeline] Complete in ' + (Date.now() - t0) + 'ms');

    return {
      creativeBrief: cp.output,
      visualBible: ad.output,
      storyboard: sd.output,
      modelPrompt: extractModelPrompt(pa.output),
      trace,
      totalDurationMs: Date.now() - t0,
    };
  } catch (err) {
    console.error('[pipeline] Error:', err);
    return {
      creativeBrief: '', visualBible: '', storyboard: '',
      modelPrompt: context.userInput,
      trace, totalDurationMs: Date.now() - t0,
    };
  }
}

function extractModelPrompt(output: string): string {
  const m = output.match(/\*\*主Prompt \(EN\)\*\*:?\s*\n([\s\S]*?)(?:\n\*\*|$)/i);
  if (m) return m[1].trim();
  const lines = output.split('\n').filter(l => l.trim().length > 20);
  return lines.length > 0 ? lines[lines.length - 1].trim() : output.slice(-500).trim();
}

// ─── Fast Text Pipeline (single agent, for TEXT nodes) ──
export interface TextPipelineResult {
  textOutput: string;
  trace: AgentResult[];
  totalDurationMs: number;
}

export async function runTextPipeline(context: PipelineContext): Promise<TextPipelineResult> {
  const t0 = Date.now();
  const trace: AgentResult[] = [];

  console.log('[text-pipeline] Starting for: "' + context.userInput.slice(0, 60) + '..."');

  // Pre-process: analyze reference images with Gemini Vision if available
  if (context.referenceUrls && context.referenceUrls.length > 0 && !context.referenceAnalysis) {
    console.log('[text-pipeline] Analyzing ' + context.referenceUrls.length + ' reference image(s) with Vision...');
    const results = await analyzeReferenceImages(context.referenceUrls);
    // Check if all vision analyses failed
    const allFailed = results.every(r => r.includes('[Unable to fetch image]') || r.includes('[Vision analysis failed]'));
    if (allFailed) {
      console.log("[text-pipeline] All vision analyses failed, falling back to text-only");
    } else {
      context.referenceAnalysis = results.filter(function(r) { return !r.includes("[Unable to fetch image]") && !r.includes("[Vision analysis failed]"); });
    }
    console.log('[text-pipeline] Vision analysis complete');
  }

  // If there are reference URLs but no vision analysis and no prompts, can't analyze
  const hasUsableRefs = (context.referenceAnalysis && context.referenceAnalysis.length > 0) ||
                        (context.referencePrompts && context.referencePrompts.length > 0);
  if (context.referenceUrls && context.referenceUrls.length > 0 && !hasUsableRefs) {
    console.log("[text-pipeline] No vision or prompts, using user text input only");
  }

  // Determine if we have usable image data
  const hasImageData = !!(context.referenceAnalysis && context.referenceAnalysis.length > 0 &&
    !context.referenceAnalysis.every(r => r.includes('[Unable to fetch image]') || r.includes('[Vision analysis failed]')));

  try {
    console.log('[text-pipeline] Running Prompt Analyst | hasImageData:', hasImageData, 'refUrls:', context.referenceUrls?.length || 0);
    // Inject a clear signal so the Agent doesn't have to guess
    const signalBlock = hasImageData
      ? '\n\n[系统] 参考图视觉分析数据已就绪，请执行图像反推。'
      : '\n\n[系统] 无参考图数据，请根据用户文本需求执行文本反推或提示词优化。';
    const augmentedContext = { ...context, userInput: context.userInput + signalBlock };
    const result = await runAgent(PROMPT_ANALYST, augmentedContext, {});
    console.log('[text-pipeline] Agent output (' + result.output.length + ' chars): ' + result.output.slice(0, 120));
    trace.push(result);

    console.log('[text-pipeline] Complete in ' + (Date.now() - t0) + 'ms');

    return {
      textOutput: result.output,
      trace,
      totalDurationMs: Date.now() - t0,
    };
  } catch (err) {
    console.error('[text-pipeline] Error:', err);
    return {
      textOutput: '失败请重新提交',
      trace,
      totalDurationMs: Date.now() - t0,
    };
  }
}

// ─── Script Analysis Pipeline — 剧本 → 分镜 JSON ───
export interface ShotDef {
  shotNumber: number;
  shotType: string;       // ELS/LS/FS/MS/CU/ECU
  cameraMovement: string; // Static/PushIn/Dolly/Truck/Crane/Orbit/Handheld
  duration: number;       // seconds
  angle: string;          // EyeLevel/LowAngle/HighAngle/BirdsEye
  aperture: number;       // 1.4 / 4 / 11
  role: string;           // establishing/action/dialog/reaction/insert
  lighting: string;       // 光线描述
  composition: string;    // 构图描述
  blocking: string;       // 角色调度
  writerIntent: string;   // 编剧意图——这场戏的戏剧目的
  visualPrompt: string;   // 图生提示词
  videoPrompt: string;    // 视频生成提示词
}

export interface SceneDef {
  sceneNumber: number;
  sceneHeader: string;
  location: string;
  timeOfDay: string;
  shots: ShotDef[];
}

export interface CharacterProfile {
  role: string;           // 主角/反派/配角
  angleBias: string;      // LowAngle/HighAngle/EyeLevel
  appearance: string;     // 外观描述
}

export interface ScriptAnalysisResult {
  scriptTitle: string;
  visualBible?: {
    colorPalette?: string;
    lightingStyle?: string;
    environment?: string;
    characters?: Record<string, string>;
  };
  scenes: SceneDef[];
  characterProfiles: Record<string, CharacterProfile>;
  trace: AgentResult[];
  totalDurationMs: number;
}

export async function runScriptPipeline(scriptText: string, visualStyle = ''): Promise<ScriptAnalysisResult> {
  const t0 = Date.now();
  const trace: AgentResult[] = [];

  console.log('[script-pipeline] Analyzing script (' + scriptText.length + ' chars)' + (visualStyle ? ' style:' + visualStyle : ''));

  try {
    const styleContext = visualStyle ? '\n\n[视觉风格要求]\n所有镜头的visualPrompt和videoPrompt必须严格遵循此视觉风格：' + visualStyle + '\n将风格特征融入每个画面的场景氛围、光线设计、色彩调色板和构图中。' : '';
    const context: PipelineContext = {
      userInput: scriptText + styleContext,
      model: 'deepseek',
      mode: 'script-analysis',
    };

    const result = await runAgent(SCRIPT_ANALYST, context, {}, 12000);
    console.log('[script-pipeline] Agent output (' + result.output.length + ' chars)');
    trace.push(result);

    // Parse JSON from agent output
    let parsed: any;
    try {
      // Find JSON block in output (may be wrapped in markdown code fences)
      let jsonStr = result.output;
      const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fenceMatch) jsonStr = fenceMatch[1];
      // Trim any non-JSON prefix/suffix
      const braceStart = jsonStr.indexOf('{');
      const braceEnd = jsonStr.lastIndexOf('}');
      if (braceStart >= 0 && braceEnd > braceStart) {
        jsonStr = jsonStr.slice(braceStart, braceEnd + 1);
      }
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('[script-pipeline] JSON parse failed:', parseErr);
      return {
        scriptTitle: '',
        scenes: [],
        characterProfiles: {},
        trace,
        totalDurationMs: Date.now() - t0,
      };
    }

    return {
      scriptTitle: parsed.scriptTitle || '',
      visualBible: parsed.visualBible || undefined,
      scenes: (parsed.scenes || []).map((s: any) => ({
        sceneNumber: s.sceneNumber || 1,
        sceneHeader: s.sceneHeader || '',
        location: s.location || '',
        timeOfDay: s.timeOfDay || '',
        shots: (s.shots || []).map((sh: any) => ({
          shotNumber: sh.shotNumber || 1,
          shotType: sh.shotType || 'MS',
          cameraMovement: sh.cameraMovement || 'Static',
          duration: sh.duration || 5,
          angle: sh.angle || 'EyeLevel',
          aperture: sh.aperture || 4,
          role: sh.role || 'action',
          lighting: sh.lighting || '',
          composition: sh.composition || '',
          blocking: sh.blocking || '',
          writerIntent: sh.writerIntent || '',
          visualPrompt: sh.visualPrompt || '',
          videoPrompt: sh.videoPrompt || '',
        })),
      })),
      characterProfiles: parsed.characterProfiles || {},
      trace,
      totalDurationMs: Date.now() - t0,
    };
  } catch (err) {
    console.error('[script-pipeline] Error:', err);
    return {
      scriptTitle: '',
      scenes: [],
      characterProfiles: {},
      trace,
      totalDurationMs: Date.now() - t0,
    };
  }
}

// ─── Two-Phase Script Pipeline — Phase 1: Overview ───
export interface SceneOverview {
  sceneNumber: number;
  sceneHeader: string;
  location: string;
  timeOfDay: string;
  characters: string[];
  sceneType: string;
  summary: string;
  estimatedShots: number;
  dramaticCore: string;
}

export interface ScriptOverviewResult {
  scriptTitle: string;
  scenes: SceneOverview[];
  visualBible: {
    colorPalette?: string;
    lightingStyle?: string;
    era?: string;
  };
  characterProfiles: Record<string, { role: string; appearance: string }>;
  trace: AgentResult[];
  totalDurationMs: number;
}

export async function runOverviewPipeline(scriptText: string): Promise<ScriptOverviewResult> {
  const t0 = Date.now();
  const trace: AgentResult[] = [];
  console.log('[overview] Scanning script (' + scriptText.length + ' chars)');

  // Phase 0: Extract characters first（独立角色提取，不做其他事）
  let extractedChars: Record<string, { role: string; appearance: string; side?: string }> = {};
  try {
    const charCtx: PipelineContext = { userInput: scriptText, model: 'gpt-5-5', mode: 'character-extract' };
    const charResult = await runAgent(CHARACTER_EXTRACTOR, charCtx, {}, 6000);
    trace.push(charResult);
    try {
      let js = charResult.output;
      const fm = js.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fm) js = fm[1];
      const bs = js.indexOf('{'), be = js.lastIndexOf('}');
      if (bs >= 0 && be > bs) js = js.slice(bs, be + 1);
      const parsed = JSON.parse(js);
      // 支持两种格式: {"name":"desc"} 或 {"characters":{"name":{...}}}
      extractedChars = parsed.characters || (typeof Object.values(parsed)[0]==='string' ? parsed : {});
      console.log('[overview] Character extractor found ' + Object.keys(extractedChars).length + ' characters');
    } catch { console.log('[overview] Character extraction parse failed'); }
  } catch (err) { console.log('[overview] Character extraction failed:', String(err).slice(0,60)); }

  try {
    const context: PipelineContext = {
      userInput: scriptText, model: 'gpt-5-5', mode: 'script-overview',
    };
    const result = await runAgent(SCRIPT_OVERVIEW, context, {}, 6000);
    trace.push(result);
    let parsed: any;
    try {
      let jsonStr = result.output;
      const fm = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fm) jsonStr = fm[1];
      const bs = jsonStr.indexOf('{'), be = jsonStr.lastIndexOf('}');
      if (bs >= 0 && be > bs) jsonStr = jsonStr.slice(bs, be + 1);
      parsed = JSON.parse(jsonStr);
    } catch { return { scriptTitle: '', scenes: [], visualBible: {}, characterProfiles: {}, trace, totalDurationMs: Date.now() - t0 }; }

    // 合并：角色提取结果优先，概览补充
    const mergedChars: Record<string, any> = { ...extractedChars };
    if (parsed.characterProfiles) {
      for (const [k, v] of Object.entries(parsed.characterProfiles)) {
        if (!mergedChars[k]) mergedChars[k] = v;
      }
    }

    return {
      scriptTitle: parsed.scriptTitle || '',
      scenes: (parsed.scenes || []).map((s: any) => ({
        sceneNumber: s.sceneNumber || 1, sceneHeader: s.sceneHeader || '', location: s.location || '',
        timeOfDay: s.timeOfDay || '', characters: s.characters || [], sceneType: s.sceneType || 'mixed',
        summary: s.summary || '', estimatedShots: s.estimatedShots || 8, dramaticCore: s.dramaticCore || '',
      })),
      visualBible: parsed.visualBible || {},
      characterProfiles: mergedChars,
      trace, totalDurationMs: Date.now() - t0,
    };
  } catch (err) { console.error('[overview] Error:', err); return { scriptTitle: '', scenes: [], visualBible: {}, characterProfiles: {}, trace, totalDurationMs: Date.now() - t0 }; }
}

// ─── Phase 2: Per-Scene Shot Breakdown ───
export async function runSceneShotPipeline(
  scene: SceneOverview, scriptExcerpt: string, visualBible: any, characterProfiles: any
): Promise<{ sceneNumber: number; shots: ShotDef[]; trace: AgentResult[] }> {
  const t0 = Date.now();
  const trace: AgentResult[] = [];
  const contextText = `场景${scene.sceneNumber}: ${scene.sceneHeader}
地点: ${scene.location} | 时间: ${scene.timeOfDay} | 类型: ${scene.sceneType}
角色: ${(scene.characters||[]).join(', ')}
戏剧核心: ${scene.dramaticCore}
预计镜头数: ${scene.estimatedShots}
视觉圣经: ${JSON.stringify(visualBible||{})}
角色设定: ${JSON.stringify(characterProfiles||{})}

剧本原文:
${scriptExcerpt}`;

  console.log(`[scene-shot] Scene ${scene.sceneNumber} (${contextText.length} chars)`);
  try {
    const context: PipelineContext = { userInput: contextText, model: 'gpt-5-5', mode: 'scene-shot' };
    const result = await runAgent(SCENE_SHOT, context, {}, 12000);
    trace.push(result);
    let parsed: any;
    try {
      let jsonStr = result.output;
      const fm = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (fm) jsonStr = fm[1];
      const bs = jsonStr.indexOf('{'), be = jsonStr.lastIndexOf('}');
      if (bs >= 0 && be > bs) jsonStr = jsonStr.slice(bs, be + 1);
      parsed = JSON.parse(jsonStr);
    } catch(e) { console.log('[scene-shot] JSON parse failed, output first 200:', result.output?.slice(0,200)); return { sceneNumber: scene.sceneNumber, shots: [], trace }; }

    return {
      sceneNumber: scene.sceneNumber,
      shots: (parsed.shots || []).map((sh: any) => ({
        shotNumber: sh.shotNumber || 1, shotType: sh.shotType || 'MS',
        cameraMovement: sh.cameraMovement || 'Static', duration: sh.duration || 5,
        angle: sh.angle || 'EyeLevel', aperture: sh.aperture || 4,
        role: sh.role || 'action', lighting: sh.lighting || '',
        composition: sh.composition || '', blocking: sh.blocking || '',
        writerIntent: sh.writerIntent || '',
        visualPrompt: sh.visualPrompt || '', videoPrompt: sh.videoPrompt || '',
      })),
      trace,
    };
  } catch (err) { console.error('[scene-shot] Error:', err); return { sceneNumber: scene.sceneNumber, shots: [], trace }; }
}
