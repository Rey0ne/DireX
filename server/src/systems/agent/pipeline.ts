/* === Agent Pipeline — 4-Agent Orchestrator === */
/* Creative Producer → Art Director → Storyboard Director → Prompt Architect */

import { geminiChat, gpt5Chat, visionAnalyze } from '../ai/gemini.js';
import {
  CREATIVE_PRODUCER, ART_DIRECTOR, STORYBOARD_DIRECTOR, PROMPT_ARCHITECT, PROMPT_ANALYST,
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

const VISION_ANALYSIS_PROMPT = `Describe this image concisely as a creative reference. Cover: 1) Subject & scene, 2) Artistic style & color, 3) Lighting & composition. Be brief — 2-3 sentences max.`;

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
const CHARACTER_EXTRACT_PROMPT = `Is there a person in this image? If YES, describe ONLY the person in detail:

Face shape & bone structure (jawline, cheekbones, brow ridge)
Eyes (shape, color, distance apart, eyelid type)
Nose (bridge height, width, tip shape)
Mouth (lip thickness, width, shape)
Facial hair (mustache, beard, stubble — be explicit: NONE if absent)
Distinguishing marks (moles, scars, tattoos — say NONE if absent)
Age (approximate range)
Ethnicity/appearance type (be specific about facial feature combinations, not just labels)
Hair (color, length, texture, style)
Body (build, height impression, shoulder width)
Skin tone (be precise: pale, fair, tan, olive, brown, dark — with undertones)
Clothing (each visible garment: type, color, fabric, fit, any logos/text)

If NO person, reply "NO_PERSON".`;

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

规则：
1. 角色五官、发型、体型、肤色、种族 → 100% 由参考图决定，不在文本中描述
2. 服装 → 由参考图决定，不在文本中描述
3. 文本只描述：动作/姿态、表情、背景/场景、光影/色调、构图/镜头角度
4. 用 "Character identity, facial features, hair, body type, skin tone, and clothing — see reference images exactly as shown." 来引用角色
5. 禁止添加参考图中不存在的道具、武器、配饰、胡须、眼镜
6. 禁止美化：不要更漂亮、更年轻、更精致
7. 输出为一段连贯的英文提示词，不要格式标记`;

export async function compileI2IWithGPT5(
  userInput: string,
  charProfiles: CharacterProfile[],
  sceneAnalyses: string[],
): Promise<string | null> {
  // Build context from vision data
  const parts: string[] = [];
  charProfiles.forEach((p, i) => {
    if (p.hasPerson && p.description) {
      parts.push(`Reference Image #${i + 1} — CHARACTER:\n${p.description}`);
    }
  });
  sceneAnalyses.forEach((s, i) => {
    if (s && !charProfiles[i]?.hasPerson) {
      parts.push(`Reference Image #${i + 1} — SCENE/STYLE:\n${s.slice(0, 300)}`);
    }
  });

  const context = parts.join('\n\n') || '[No vision analysis available]';
  const userContent = `[VISION ANALYSIS]\n${context}\n\n[USER INSTRUCTION]\n${userInput}\n\nCompile a generation prompt. Character identity from reference images ONLY. Describe only: pose, expression, background, lighting, composition.`;

  console.log('[i2i-gpt5] Starting compilation with GPT-5, ' + charProfiles.filter(p => p.hasPerson).length + ' char refs');
  const result = await gpt5Chat(I2I_GPT5_SYSTEM, userContent, 2000, 'high');
  if (result) {
    console.log('[i2i-gpt5] Compiled ' + result.length + ' chars');
    return result;
  }
  return null;
}

async function runAgent(
  profile: AgentProfile,
  context: PipelineContext,
  previousOutputs: Record<string, string>
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

  // Try GPT-5 (reasoning=high) first, fall back to Gemini/DeepSeek
  let output = await gpt5Chat(profile.systemPrompt, userMessage, 1500, 'high');
  if (!output) {
    output = await geminiChat(profile.systemPrompt, userMessage, 1500);
  }
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
