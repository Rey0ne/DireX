/* === Agent Pipeline — 4-Agent Orchestrator === */
/* Creative Producer → Art Director → Storyboard Director → Prompt Architect */

import { geminiChat, visionAnalyze } from '../ai/gemini.js';
import {
  CREATIVE_PRODUCER, ART_DIRECTOR, STORYBOARD_DIRECTOR, PROMPT_ARCHITECT, PROMPT_ANALYST,
  type AgentProfile,
} from './profiles.js';

const MAX_PREV_OUTPUT_CHARS = 2000; // truncate each previous agent output

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

const VISION_ANALYSIS_PROMPT = `Analyze this image in detail for use as a creative reference. Describe:
1. SUBJECT: What is the main subject? People, objects, scene type. Describe appearance, pose, expression.
2. STYLE: Artistic style (photorealistic, illustration, 3D render, sketch, etc.). Color palette and mood.
3. LIGHTING: Light direction (front/side/back/top), quality (hard/soft), color temperature, shadows.
4. COMPOSITION: Camera angle, framing, depth of field, focal point, perspective.
5. MATERIALS: Surface qualities (glossy/matte/rough/metallic/translucent), fabric, wood grain, stone, glass, metal, skin, cloth, plastic. Note weathering, wear, reflections, imperfections.
6. DETAILS: Patterns, background elements, fine ornaments, repeating motifs.
7. TEXT: Any visible text - transcribe exactly.

Be thorough and specific. This analysis will guide AI image generation.`;

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

async function analyzeReferenceImages(urls: string[]): Promise<string[]> {
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
  let refBlock = '';
  if (context.referenceUrls && context.referenceUrls.length > 0) {
    if (context.referenceAnalysis && context.referenceAnalysis.length > 0) {
      refBlock = '\n\n[参考图片视觉分析结果]\n';
      context.referenceUrls.forEach((_url, i) => {
        const analysis = context.referenceAnalysis[i] || '[No analysis]';
        refBlock += '\n### 参考图' + (i + 1) + '\n' + analysis + '\n';
      });
      refBlock += '\n请参考以上视觉分析结果，理解每张参考图的内容、风格、光线和构图，并在生成新图像时融合这些元素。';
    } else {
      refBlock = '\n\n[参考图片 — 以下是这些图片生成时的原始Prompt]\n';
      context.referenceUrls.forEach((url, i) => {
        const prompt = context.referencePrompts?.[i] || '';
        if (prompt) {
          refBlock += '参考图' + (i+1) + ': ' + prompt + '\n';
        } else {
          refBlock += '参考图' + (i+1) + ': [URL: ' + url + ']\n';
        }
      });
      refBlock += '请根据这些原始Prompt理解每张参考图的内容和风格。\n';
    }
  }

  const userMessage = '用户需求: ' + context.userInput +
    '\n目标模型: ' + context.model +
    '\n模式: ' + (context.mode || 'text-to-image') +
    (context.referenceUrls?.length ? '\n参考图片数量: ' + context.referenceUrls.length : '') +
    contextBlock +
    refBlock +
    '\n\n请按照你的角色职责输出。';

  const output = await geminiChat(profile.systemPrompt, userMessage, 1500);
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
