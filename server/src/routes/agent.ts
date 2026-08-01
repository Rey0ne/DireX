/* === Agent Routes — Generation / Script Analysis / Tripo3D / Callbacks === */

import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import fs from 'node:fs';
import path from 'node:path';

// Agent pipeline
import { runAgentPipeline, runTextPipeline, runUnifiedPipeline, compileI2IWithGPT5, parseShotBlocks, runCharacterExtraction, runSceneExtraction, runSceneArchitect, runPropDesigner, runSoundComposer, runScriptAnalysis, type ScriptAnalysisResult } from '../systems/agent/pipeline.js';
import { compilePrompt } from '../systems/agent/compiler.js';
import { buildCamBlock } from '../systems/agent/camera-kit-mappings.js';
import { compileVideoPrompt } from '../systems/agent/video-analyzer.js';
import { parseVisualIntent, type ExtractMode } from '../systems/agent/visual-parser.js';

// AI providers
import { getProvider } from '../systems/ai/registry.js';
import { withKieLimit, pollStoredTask, initVideoTask, uploadDataUrl } from '../systems/ai/kie-provider.js';
import { gpt5Chat, visionAnalyze } from '../systems/ai/gemini.js';
import { submitTask, checkTask, downloadModel as downloadTripoModel, checkRig, submitRig, retargetAnimation } from '../systems/ai/tripo-provider.js';

// Task & file
import { addLog, getLogs } from '../systems/task/manager.js';
import { handleDownload } from '../systems/file/download.js';
import { cacheGenerationResult } from '../systems/file/asset-cache.js';

// Config
import { getProfile } from '../config.js';

// Q brain hooks
import { trackCanvasSync, captureScriptAnalysis } from '../systems/q/q-observer.js';
import { detectDeviations } from '../systems/q/q-detector.js';
import { onPipelineComplete, onIntervalCheck } from '../systems/q/q-cognitive-engine.js';
import { periodicSuggest } from '../systems/q/q-suggest.js';
import { detectAndRoute } from '../systems/q/q-orchestrate.js';
import { qMemory } from '../systems/q/q-memory.js';

// Canvas state (for supplement endpoint)
import { readJSON, writeJSON } from '../systems/db/store.js';
import { readProjectState, writeProjectState, getProjectFile, projectStateCache, OUTPUT_DIR, loadScriptTasks, saveScriptTasks } from '../systems/db/canvas-store.js';

// Types
import type { KeyStatus, CompileRequest, AgentGenerateRequest, AgentGenerateResult, GenerateResult } from '../../../shared/api-types.js';

const router = Router();

// ─── Vision cache (persistent across restarts) ──
const VISION_CACHE_FILE = 'data/vision-cache.json';
const imageCache: Map<string, string> = new Map(Object.entries((readJSON(VISION_CACHE_FILE) as Record<string, string>) || {}));
console.log('[vision-cache] Loaded ' + imageCache.size + ' cached analyses from disk');

// TODO: analyzeAndCache was undefined in original index.ts — this is the intended implementation
async function analyzeAndCache(url: string): Promise<string> {
  if (imageCache.has(url)) return imageCache.get(url)!;
  try {
    const resp = await fetch(url);
    if (!resp.ok) return '';
    const buf = Buffer.from(await resp.arrayBuffer());
    const b64 = buf.toString('base64');
    const mime = resp.headers.get('content-type') || 'image/png';
    const desc = await visionAnalyze(
      'Describe this image in detail, focusing on visual elements, composition, colors, subject matter, and style.',
      b64,
      mime,
    );
    const result = desc || '';
    if (result) {
      imageCache.set(url, result);
      try { writeJSON(VISION_CACHE_FILE, Object.fromEntries(imageCache)); } catch {}
    }
    return result;
  } catch {
    return '';
  }
}

// ─── Last compiled prompt (debug) ───────────────
export let lastCompiled: any = null;

// ─── Script task store (persisted async tasks) ──
export const scriptTasks = loadScriptTasks();

// ─── Kie Suno callback store ─────────────────────
export const sunoCallbacks = new Map<string, any>();

// ═══════════════════════════════════════════════════
//  Agent / Generation Endpoints
// ═══════════════════════════════════════════════════

// ─── Image Analysis ──────────────────────────────
router.post('/analyze-image', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) { res.status(400).json({ error: 'Missing url' }); return; }
  const desc = await analyzeAndCache(url);
  res.json({ url, description: desc, cached: imageCache.has(url) });
});

// ─── Generate ────────────────────────────────────
router.post('/generate', async (req: Request, res: Response) => {
  const { providerId, prompt } = req.body;
  if (!providerId || !prompt) { res.status(400).json({ error: 'Missing providerId or prompt' }); return; }

  const handler = getProvider(providerId);
  if (!handler) { res.status(400).json({ error: `Unknown provider: ${providerId}` }); return; }

  console.log(`[api] Generate: ${providerId} "${prompt.slice(0,60)}..."`);
  const t0 = Date.now();
  let result: GenerateResult;
  try {
    result = await handler(req.body);
  } catch (err) {
    result = { success: false, assetUrls: [], cost: 0, durationMs: Date.now() - t0, seed: 0, error: String(err).slice(0, 200) };
  }
  result.durationMs = Date.now() - t0;
  console.log(`[api] ${result.success ? 'OK' : 'FAIL'}: ${result.assetUrls.length} assets, ${result.durationMs}ms`);

  addLog({
    id: uuid(), timestamp: new Date().toISOString(), providerId, prompt,
    status: result.success ? 'succeeded' : 'failed',
    assetUrls: result.assetUrls, cost: result.cost, durationMs: result.durationMs, error: result.error,
  });

  res.json(result);
});

// ─── Agent Compile ───────────────────────────────
router.post('/agent/compile', async (req: Request, res: Response) => {
  const body = req.body as CompileRequest;
  res.json({ compiled: await compilePrompt(body.shot, body.rawText, (body as any).referenceUrls) });
});

// ─── Agent Text ──────────────────────────────────
router.post('/agent/text', async (req: Request, res: Response) => {
  const body = req.body;
  const userPrompt = body.rawText || (body.shot && body.shot.intent_cn) || '';
  const hasRefs = (body.referenceUrls?.length || 0) > 0;
  console.log('[text-api] Request: rawText=' + (userPrompt || '').slice(0, 80) + ' refUrls=' + (body.referenceUrls?.length || 0) + ' refPrompts=' + (body.referencePrompts?.length || 0));
  if (!userPrompt && !hasRefs) { res.status(400).json({ error: 'Missing prompt' }); return; }

  try {
    const pipelineResult = await runTextPipeline({
      userInput: userPrompt,
      model: body.providerId || 'text',
      mode: 'text-analysis',
      referenceUrls: body.referenceUrls,
      referencePrompts: body.referencePrompts,
      aspect: body.aspect,
      resolution: body.resolution,
    });

    const trace = pipelineResult.trace.map((t) => ({
      agentId: t.agentId, agentName: t.agentName,
      output: t.output.slice(0, 500), durationMs: t.durationMs,
    }));

    console.log('[text-agent] Complete in ' + pipelineResult.totalDurationMs + 'ms');

    res.json({
      compiled: {
        en: pipelineResult.textOutput,
        cn: pipelineResult.textOutput,
        negative: '',
        debug: trace,
      },
      result: {
        success: true,
        assetUrls: [],
        cost: 0,
        durationMs: pipelineResult.totalDurationMs,
        seed: 0,
      },
    });
  } catch (err) {
    console.error('[text-agent] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── Full Pipeline ───────────────────────────────
router.post('/agent/full', async (req: Request, res: Response) => {
  const body = req.body;
  const scriptText = body.rawText || '';
  const visualStyle = body.visualStyle as string | undefined;
  console.log('[full-api] Request: script=' + scriptText.slice(0, 80) + ' style=' + (visualStyle || 'none'));
  if (!scriptText) { res.status(400).json({ error: 'Missing script text' }); return; }

  try {
    try {
      const memories = qMemory.recall(scriptText.slice(0, 200), { projectId: 'default' });
      if (memories.length > 0) {
        console.log('[q-hook:full] Recalled', memories.length, 'memories before full pipeline');
      }
    } catch {}

    const pipelineResult = await runUnifiedPipeline(scriptText, visualStyle);
    try {
      captureScriptAnalysis('default', scriptText, {
        characters: pipelineResult.characters,
        scenes: pipelineResult.scenes,
        shots: pipelineResult.shots?.shots || [],
        sceneArchitecture: pipelineResult.sceneArchitecture,
        props: pipelineResult.props,
        music: pipelineResult.music,
      });
    } catch {}
    res.json({
      success: true,
      characters: pipelineResult.characters,
      scenes: pipelineResult.scenes,
      sceneArchitecture: pipelineResult.sceneArchitecture,
      props: pipelineResult.props,
      music: pipelineResult.music,
      shots: pipelineResult.shots?.shots || [],
      totalDurationMs: pipelineResult.totalDurationMs,
    });
  } catch (err) {
    console.error('[full-api] Error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// ─── Agent Generate (image/video — largest endpoint) ──
router.post('/agent/generate', async (req: Request, res: Response) => {
  const body = req.body as AgentGenerateRequest;
  if (!body.providerId) { res.status(400).json({ error: 'Missing providerId' }); return; }
  console.log('[agent] providerId received:', body.providerId, 'model:', (body as any).model, 'mode:', body.mode);

  try {
    const projectId = (body as any).projectId || 'default';
    const memories = qMemory.recall((body as any).rawText || '', { projectId });
    if (memories.length > 0) {
      console.log('[q-hook:generate] Recalled', memories.length, 'relevant memories');
    }
  } catch {}

  const handler = getProvider(body.providerId);
  if (!handler) { res.status(400).json({ error: 'Unknown provider: ' + body.providerId }); return; }
  const config = getProfile();
  const userPrompt = body.rawText || (body.shot && body.shot.intent_cn) || '';
  let compiledPrompt = '';
  let agentTrace: any[] = [];
  const isVideo = body.providerId === 'kling-video' || body.providerId === 'seedance-2';
  const isEnglish = /^[a-zA-Z0-9\s.,!?;:'"()\-\[\]{}$@#%^&*+=<>/\\|~`\n\r]+$/.test(userPrompt);

  // Camera kit
  const cam = (body as any).camera;
  const lens = (body as any).lens;
  const focal = (body as any).focalLength;
  const apt = (body as any).aperture;
  const film = (body as any).filmStock;
  const camBlock = buildCamBlock({ camera: cam, lens, focalLength: focal, aperture: apt, filmStock: film });
  const enrichedPrompt = userPrompt;

  // ── Video models ──
  if (isVideo) {
    const videoUrls = (body as any).videoUrls as string[] | undefined;
    const refUrls = (body as any).referenceUrls as string[] | undefined;
    const hasRefs = !!(videoUrls?.length || refUrls?.length);

    // I2V: Seedance sees the image directly. No enrichment, no translation.
    if (hasRefs) {
      compiledPrompt = enrichedPrompt;
    }

    const uploadLocalRef = async (u: string): Promise<string | null> => {
      if (!u) return null;
      if (u.startsWith('http://') || u.startsWith('https://')) return u;
      let filePath: string;
      if (u.startsWith('/api/output/')) {
        filePath = path.join(OUTPUT_DIR, u.replace('/api/output/', ''));
      } else if (u.startsWith('/')) {
        filePath = u;
      } else {
        console.log('[agent] Cannot resolve ref URL: ' + u.slice(0, 80));
        return null;
      }
      try {
        if (!fs.existsSync(filePath)) { console.log('[agent] Ref file not found: ' + filePath); return null; }
        const buf = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mimeMap: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.webm': 'video/webm', '.mp4': 'video/mp4' };
        const mime = mimeMap[ext] || 'application/octet-stream';
        const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
        const uploaded = await uploadDataUrl(dataUrl);
        if (uploaded) console.log('[agent] Uploaded ref: ' + u.slice(0, 40) + ' → ' + uploaded.slice(0, 50));
        return uploaded;
      } catch (e) {
        console.log('[agent] Upload ref failed: ' + String(e).slice(0, 80));
        return null;
      }
    };
    const resolvedRefs = (await Promise.all((refUrls || []).map(uploadLocalRef))).filter(Boolean) as string[];
    const resolvedVideoUrls = (await Promise.all((videoUrls || []).map(uploadLocalRef))).filter(Boolean) as string[];
    const resolvedFirstFrame = (body as any).firstFrameUrl ? await uploadLocalRef((body as any).firstFrameUrl) : undefined;
    const resolvedLastFrame = (body as any).lastFrameUrl ? await uploadLocalRef((body as any).lastFrameUrl) : undefined;
    const resolvedRefImage = body.referenceImage ? await uploadLocalRef(body.referenceImage) : undefined;

    const clientTaskId = uuid();
    initVideoTask(clientTaskId, body.providerId, (body as any).nodeId);
    const i2iNegPrompt = 'blurry, low quality, distorted, deformed, watermark, text, logo';
    const result: GenerateResult = await withKieLimit(`video:${body.providerId}`, () => handler({
      providerId: body.providerId, mode: body.mode, prompt: compiledPrompt,
      negativePrompt: i2iNegPrompt,
      aspect: body.aspect || '16:9', resolution: body.resolution || config.defaultResolution,
      referenceImage: resolvedRefImage, referenceUrls: resolvedRefs, maskImage: body.maskImage,
      styleImageUrl: body.styleImageUrl,
      videoUrls: resolvedVideoUrls, duration: (body as any).duration,
      genMode: (body as any).genMode, refVideoDuration: (body as any).refVideoDuration,
      firstFrameUrl: resolvedFirstFrame, lastFrameUrl: resolvedLastFrame,
      characterOrientation: (body as any).characterOrientation,
      keepOriginalSound: (body as any).keepOriginalSound,
      fixedCamera: (body as any).fixedCamera,
      generateAudio: (body as any).generateAudio,
      webSearch: (body as any).webSearch,
      clientTaskId,
    }));
    console.log('[agent] ===== COMPILED PROMPT =====');
    console.log(compiledPrompt);
    console.log('[agent] ===== END COMPILED PROMPT =====');
    console.log('[agent] Video task submitted: client=' + clientTaskId + ' — client will poll');
    res.json({ compiled: { en: compiledPrompt, cn: userPrompt, negative: 'blurry, low quality', debug: [] }, result: { ...result, taskId: clientTaskId, needsPoll: true }, agentTrace: [] });
    return;
  }
  if (config.promptEnhancement && !isEnglish) {
    const isI2I = body.mode === 'image-to-image' && (((body as any).referenceUrls?.length || 0) > 0 || body.referenceImage);
    if (isI2I) {
      try {
        const refUrls = (body as any).referenceUrls as string[] | undefined;
        if (refUrls?.length) {
          const gpt5Result = await compileI2IWithGPT5(enrichedPrompt, refUrls);
          if (gpt5Result) {
            compiledPrompt = gpt5Result;
            console.log('[agent] I2I GPT-5.4 compiled ' + gpt5Result.length + ' chars');
          } else {
            compiledPrompt = 'Character identity, facial features, hair, body, skin tone, ethnicity, age, clothing — see reference images EXACTLY as shown. Do NOT change, beautify, or reinterpret any physical features. Only modify: pose, expression, background, lighting, camera angle as instructed below.\n\n' + enrichedPrompt;
            console.log('[agent] I2I GPT-5.4 failed, using fallback');
          }
        } else {
          compiledPrompt = enrichedPrompt;
        }
      } catch(e) { console.log('[agent] I2I assembly failed:', String(e).slice(0, 80)); compiledPrompt = enrichedPrompt; }
    } else {
      compiledPrompt = enrichedPrompt;
    }
  } else {
    compiledPrompt = enrichedPrompt;
    const refUrls = (body as any).referenceUrls as string[] | undefined;
    if (refUrls && refUrls.length > 0) {
      const orderedMentions: string[] = [];
      const mentionPattern = /@(\S+)/g;
      let mMatch: RegExpExecArray | null;
      while ((mMatch = mentionPattern.exec(compiledPrompt)) !== null) {
        if (!orderedMentions.includes(mMatch[0])) orderedMentions.push(mMatch[0]);
      }
      let summaries: string[] = [];
      try {
        const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000));
        const results = await Promise.race([Promise.all(refUrls.map((url: string) => analyzeAndCache(url))), timeout]);
        summaries = results as string[];
      } catch (err) { console.log("[agent] Vision cache lookup/analysis timed out, continuing without summaries"); summaries = refUrls.map(() => ""); }
      orderedMentions.forEach((tag) => {
        const i = orderedMentions.indexOf(tag);
        const refIdx = Math.min(i, refUrls.length - 1);
        const desc = summaries[refIdx] ? `: ${summaries[refIdx]}` : '';
        compiledPrompt = compiledPrompt.split(tag).join(`[Ref ${refIdx + 1}${desc}]`);
      });
      console.log('[agent] Vision merged, prompt length:', compiledPrompt.length);
    }
  }
  if (!compiledPrompt || compiledPrompt.trim().length === 0) {
    compiledPrompt = userPrompt || body.rawText || 'generate an image';
    console.log('[agent] WARNING: compiledPrompt was empty, using fallback: ' + compiledPrompt.slice(0, 80));
  }
  if (camBlock && compiledPrompt) {
    compiledPrompt = camBlock + compiledPrompt;
  }

  console.log('[agent] Generate: ' + body.providerId + ' prompt=' + compiledPrompt.slice(0, 100) + ' (len=' + compiledPrompt.length + ')');
  const t0 = Date.now();
  const i2iNegPrompt = body.mode === 'image-to-image'
    ? 'blurry, low quality, distorted, deformed, watermark, text, logo, extra limbs, extra fingers, fused body, extra props, weapon, object not in prompt, hallucinated item, extra person, clutter, fabricated details'
    : 'blurry, low quality, distorted, deformed, watermark, text, logo';
  const result: GenerateResult = await withKieLimit(`generate:${body.providerId}`, () => handler({
    providerId: body.providerId, mode: body.mode, prompt: compiledPrompt,
    negativePrompt: i2iNegPrompt,
    aspect: body.aspect || '16:9', resolution: body.resolution || config.defaultResolution,
    referenceImage: body.referenceImage, referenceUrls: (body as any).referenceUrls, maskImage: body.maskImage, styleImageUrl: body.styleImageUrl,
    videoUrls: (body as any).videoUrls, duration: (body as any).duration,
    genMode: (body as any).genMode, refVideoDuration: (body as any).refVideoDuration,
    firstFrameUrl: (body as any).firstFrameUrl,
    lastFrameUrl: (body as any).lastFrameUrl,
    characterOrientation: (body as any).characterOrientation,
    keepOriginalSound: (body as any).keepOriginalSound,
    fixedCamera: (body as any).fixedCamera,
    generateAudio: (body as any).generateAudio,
    webSearch: (body as any).webSearch,
    instrumental: (body as any).instrumental as boolean | undefined,
    lyrics: (body as any).lyrics as string | undefined,
  }));
  result.durationMs = Date.now() - t0;
  addLog({
    id: uuid(), timestamp: new Date().toISOString(), providerId: body.providerId,
    prompt: compiledPrompt, compiledPrompt: compiledPrompt,
    status: result.success ? 'succeeded' : 'failed',
    assetUrls: result.assetUrls, cost: result.cost, durationMs: result.durationMs, error: result.error,
  });
  try {
    const shotNumber = (body as any).shot?.shotNumber || (body as any).shotNumber || 0;
    if (shotNumber) {
      detectDeviations({
        projectId: 'default',
        shotNumber,
        assetUrls: result.assetUrls || [],
        compiledPrompt: compiledPrompt,
        nodeId: (body as any).nodeId,
      }).then((detectionResult) => {
        if (detectionResult && detectionResult.violations > 0) {
          onPipelineComplete('default', shotNumber, {
            total: detectionResult.deviationsFound,
            violations: detectionResult.violations,
          }).catch(() => {});
        }
      }).catch(() => {});
    }
  } catch {}
  if (result.success && result.assetUrls.length > 0) {
    try {
      const { localUrls } = await cacheGenerationResult(result.assetUrls);
      result.assetUrls = localUrls;
    } catch {}
  }
  const debugInfo = agentTrace.map(function(t: any){ return {field:t.agentName||t.agentId,contribution:t.output?t.output.slice(0,60):''}; });
  debugInfo.push({field:'compiledPrompt', contribution: 'len=' + compiledPrompt.length + ' empty=' + (!compiledPrompt || compiledPrompt.trim().length === 0) + ' mode=' + (body.mode || 'none') + ' hasRefs=' + (((body as any).referenceUrls?.length) || 0) + ' text=' + compiledPrompt.slice(0, 500) });
  debugInfo.push({field:'providerId-received', contribution: body.providerId});
  const kieReq = (globalThis as any).__lastKieReq;
  const kieResp = (globalThis as any).__lastKieResp;
  if (kieReq) debugInfo.push({field:'kie-req', contribution: JSON.stringify({model:kieReq.model,refs:kieReq.refs_count}).slice(0,300)});
  if (kieResp) debugInfo.push({field:'kie-resp', contribution: JSON.stringify(kieResp).slice(0,1000)});
  const rawVision = (globalThis as any).__lastI2IVision;
  if (rawVision) {
    debugInfo.push({field:'rawVision-charProfiles', contribution: JSON.stringify(rawVision.charProfiles).slice(0, 2000)});
    debugInfo.push({field:'rawVision-sceneAnalyses', contribution: JSON.stringify(rawVision.sceneAnalyses).slice(0, 2000)});
  }
  lastCompiled = { en: compiledPrompt, cn: userPrompt, mode: body.mode, refs: (body as any).referenceUrls?.length || 0, method: body.mode === 'image-to-image' ? 'i2i-direct' : (config.promptEnhancement ? 't2i-pipeline' : 'raw'), time: new Date().toISOString() };
  console.log('[agent] ===== COMPILED PROMPT =====');
  console.log(compiledPrompt);
  console.log('[agent] ===== END COMPILED PROMPT =====');
  res.json({ compiled: { en: compiledPrompt, cn: userPrompt, negative: 'blurry, low quality', debug: debugInfo }, result, agentTrace });
});

// ─── Task Polling ────────────────────────────────
router.get('/task/:taskId/poll', async (req: Request, res: Response) => {
  const { taskId } = req.params;
  if (!taskId) { res.status(400).json({ error: 'Missing taskId' }); return; }
  console.log('[poll] Client polling ' + taskId);
  const result = await pollStoredTask(taskId);
  if (result.status === 'succeeded' && result.assetUrls?.length) {
    try {
      const { localUrls } = await cacheGenerationResult(result.assetUrls);
      result.assetUrls = localUrls;
    } catch {}
  }
  res.json(result);
});

// ─── Debug ───────────────────────────────────────
router.get('/last-compiled', (_req: Request, res: Response) => res.json({ compiled: lastCompiled || { en: '(no generation yet)' }, kieReq: (globalThis as any).__lastKieReq || null, kieResp: (globalThis as any).__lastKieResp || null }));
router.get('/agent/logs', (_req: Request, res: Response) => res.json({ logs: getLogs() }));

// ═══════════════════════════════════════════════════
//  Script Analysis Endpoints
// ═══════════════════════════════════════════════════

// ─── Overview (async unified pipeline) ───────────
router.post('/agent/script/overview', async (req: Request, res: Response) => {
  const { scriptText, visualStyle } = req.body;
  if (!scriptText) { res.status(400).json({ error: 'Missing scriptText' }); return; }
  const taskId = uuid();
  scriptTasks.set(taskId, { status: 'processing', createdAt: Date.now() });
  saveScriptTasks(scriptTasks);
  console.log('[script-analysis] Task ' + taskId + ' started, scriptLen=' + scriptText.length);

  (async () => {
    try {
      const t0 = Date.now();
      const result = await runUnifiedPipeline(scriptText, visualStyle);

      console.log('[script-analysis] Task ' + taskId
        + ' chars:' + Object.keys(result.characters || {}).length
        + ' shots:' + (result.shots?.shots?.length || 0)
        + ' scenes:' + Object.keys(result.scenes || {}).length
        + ' music:' + Object.keys(result.music?.scenes || {}).length
        + ' time=' + (Date.now() - t0) + 'ms');

      const fullResult = {
        characters: result.characters || {},
        scenes: result.scenes || {},
        sceneArchitecture: result.sceneArchitecture || {},
        soundResult: result.music || { scenes: {}, sunoPrompts: {} },
        storyboard: result.shots || { shots: [] as any[], characters: {} as Record<string, string>, rawOutput: '', durationMs: 0 },
      };

      const task = scriptTasks.get(taskId);
      if (task) { task.status = 'done'; task.section = 'overview'; task.result = fullResult; saveScriptTasks(scriptTasks); }

      try {
        captureScriptAnalysis('default', scriptText, {
          characters: result.characters || {},
          scenes: result.scenes || {},
          shots: result.shots?.shots || [],
          sceneArchitecture: result.sceneArchitecture || {},
          props: result.props || {},
          music: result.music || { scenes: {}, sunoPrompts: {} },
        });
      } catch {}
    } catch (err) {
      const task = scriptTasks.get(taskId);
      if (task) { task.status = 'done'; task.error = String(err); saveScriptTasks(scriptTasks); }
      console.log('[script-analysis] Task ' + taskId + ' failed:', String(err).slice(0, 200));
    }
  })();
  res.json({ taskId, status: 'processing' });
});

// ─── Poll Result ─────────────────────────────────
router.get('/agent/script/result/:taskId', (req: Request, res: Response) => {
  const task = scriptTasks.get(req.params.taskId);
  if (!task) { res.status(404).json({ error: 'Task not found', status: 'lost' }); return; }
  if (task.status === 'processing') { res.json({ status: 'processing' }); return; }
  if (task.status === 'lost') { res.json({ status: 'lost', error: task.error || 'Task was interrupted by server restart' }); return; }
  const r = task.result;
  res.json({
    status: 'done',
    success: !task.error,
    section: task.section || 'overview',
    shots: r?.storyboard?.shots || [],
    characterProfiles: r?.characters || {},
    rawOutput: r?.storyboard?.rawOutput || '',
    durationMs: r?.storyboard?.durationMs || 0,
    scenes: r?.scenes || {},
    sceneArchitecture: r?.sceneArchitecture || {},
    sunoPrompts: r?.soundResult?.sunoPrompts || {},
    soundScenes: r?.soundResult?.scenes || {},
    error: task.error,
  });
});

// ─── Characters (async) ──────────────────────────
router.post('/agent/script/characters', async (req: Request, res: Response) => {
  const { scriptText, visualStyle, userFeedback, existingContent } = req.body;
  if (!scriptText) { res.status(400).json({ error: 'Missing scriptText' }); return; }
  const taskId = uuid();
  scriptTasks.set(taskId, { status: 'processing', createdAt: Date.now() });
  saveScriptTasks(scriptTasks);
  console.log('[char-async] Task ' + taskId + ' started, feedback=' + !!userFeedback);

  const TIMEOUT_MS = 600_000;
  (async () => {
    try {
      const result = await Promise.race([
        runCharacterExtraction(scriptText, visualStyle, userFeedback, existingContent),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Character extraction timeout after 10 minutes')), TIMEOUT_MS)
        ),
      ]);
      const task = scriptTasks.get(taskId);
      if (task) {
        task.status = 'done';
        task.result = { characters: result, scenes: {}, sceneArchitecture: {}, storyboard: { shots: [], rawOutput: '', durationMs: 0 }, soundResult: { scenes: {}, sunoPrompts: {} } };
        task.section = 'characters';
        saveScriptTasks(scriptTasks);
      }
      console.log('[char-async] Task ' + taskId + ' done, chars=' + Object.keys(result).length);
    } catch (err) {
      const task = scriptTasks.get(taskId);
      if (task) { task.status = 'done'; task.error = String(err); saveScriptTasks(scriptTasks); }
      console.log('[char-async] Task ' + taskId + ' failed:', String(err).slice(0, 200));
    }
  })();
  res.json({ taskId, status: 'processing' });
});

// ─── Scenes (async) ──────────────────────────────
router.post('/agent/script/scenes', async (req: Request, res: Response) => {
  const { scriptText, userFeedback, existingContent } = req.body;
  if (!scriptText) { res.status(400).json({ error: 'Missing scriptText' }); return; }
  const taskId = uuid();
  scriptTasks.set(taskId, { status: 'processing', createdAt: Date.now() });
  saveScriptTasks(scriptTasks);
  console.log('[scene-async] Task ' + taskId + ' started, feedback=' + !!userFeedback);

  const TIMEOUT_MS = 600_000;
  (async () => {
    try {
      const [scenes, sceneArchitecture] = await Promise.race([
        Promise.all([
          runSceneExtraction(scriptText, userFeedback, existingContent),
          runSceneArchitect(scriptText, userFeedback, existingContent),
        ]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Scene extraction timeout after 10 minutes')), TIMEOUT_MS)
        ),
      ]);
      const task = scriptTasks.get(taskId);
      if (task) {
        task.status = 'done';
        task.result = { characters: {}, scenes, sceneArchitecture, storyboard: { shots: [], rawOutput: '', durationMs: 0 }, soundResult: { scenes: {}, sunoPrompts: {} } };
        task.section = 'scenes';
        saveScriptTasks(scriptTasks);
      }
      console.log('[scene-async] Task ' + taskId + ' done, scenes=' + Object.keys(scenes).length);
    } catch (err) {
      const task = scriptTasks.get(taskId);
      if (task) { task.status = 'done'; task.error = String(err); saveScriptTasks(scriptTasks); }
      console.log('[scene-async] Task ' + taskId + ' failed:', String(err).slice(0, 200));
    }
  })();
  res.json({ taskId, status: 'processing' });
});

// ─── Scene Architect (sync) ──────────────────────
router.post('/agent/script/scene-architect', async (req: Request, res: Response) => {
  const { scriptText } = req.body;
  if (!scriptText) { res.status(400).json({ error: 'Missing scriptText' }); return; }
  try {
    const designs = await runSceneArchitect(scriptText);
    res.json({ success: true, designs });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── Prop Designer (sync) ────────────────────────
router.post('/agent/script/props', async (req: Request, res: Response) => {
  const { scriptText } = req.body;
  if (!scriptText) { res.status(400).json({ error: 'Missing scriptText' }); return; }
  try {
    const props = await runPropDesigner(scriptText);
    res.json({ success: true, props });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── Sound Composer (sync) ───────────────────────
router.post('/agent/script/sound', async (req: Request, res: Response) => {
  const { scriptText } = req.body;
  if (!scriptText) { res.status(400).json({ error: 'Missing scriptText' }); return; }
  try {
    const result = await runSoundComposer(scriptText);
    res.json({ success: true, soundScenes: result.scenes, sunoPrompts: result.sunoPrompts });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── Regenerate Section (async) ──────────────────
router.post('/agent/script/regenerate', async (req: Request, res: Response) => {
  const { scriptText, section, visualStyle, userFeedback, existingResults } = req.body || {};
  if (!scriptText || !section) {
    res.status(400).json({ error: 'Missing scriptText or section. section: characters|scenes|storyboard|music' });
    return;
  }
  const validSections = ['characters', 'scenes', 'storyboard', 'music'];
  if (!validSections.includes(section)) {
    res.status(400).json({ error: `Invalid section "${section}". Must be: ${validSections.join(', ')}` });
    return;
  }

  const taskId = uuid();
  scriptTasks.set(taskId, { status: 'processing', createdAt: Date.now(), section });
  saveScriptTasks(scriptTasks);
  console.log(`[regenerate] Task ${taskId} section=${section} feedback=${(userFeedback || '').slice(0, 80)}`);

  const TIMEOUT_MS = 600_000;
  (async () => {
    try {
      const existingChars = existingResults?.characters as Record<string, string> | undefined;

      const result = await Promise.race([
        (async () => {
          switch (section) {
            case 'characters': {
              const existingContent = existingResults?.characters ? JSON.stringify(existingResults.characters) : undefined;
              const characters = await runCharacterExtraction(scriptText, visualStyle, userFeedback, existingContent);
              return { characters, scenes: {}, sceneArchitecture: {}, storyboard: { shots: [], rawOutput: '', durationMs: 0 }, soundResult: { scenes: {}, sunoPrompts: {} } };
            }
            case 'scenes': {
              const existingScenesContent = existingResults?.scenes ? JSON.stringify(existingResults.scenes) : undefined;
              const [scenes, sceneArchitecture] = await Promise.all([
                runSceneExtraction(scriptText, userFeedback, existingScenesContent),
                runSceneArchitect(scriptText, userFeedback, existingScenesContent),
              ]);
              return { characters: {}, scenes, sceneArchitecture, storyboard: { shots: [], rawOutput: '', durationMs: 0 }, soundResult: { scenes: {}, sunoPrompts: {} } };
            }
            case 'storyboard': {
              const existingStoryboardContent = existingResults?.storyboard ? JSON.stringify(existingResults.storyboard) : undefined;
              const analysisResult = await runScriptAnalysis(scriptText, visualStyle, existingChars, userFeedback, existingStoryboardContent);
              return { characters: analysisResult.characters || {}, scenes: {}, sceneArchitecture: {}, storyboard: { shots: analysisResult.shots || [], rawOutput: analysisResult.rawOutput || '', durationMs: analysisResult.durationMs || 0 }, soundResult: { scenes: {}, sunoPrompts: {} } };
            }
            case 'music': {
              const existingMusicContent = existingResults?.music ? JSON.stringify(existingResults.music) : undefined;
              const soundResult = await runSoundComposer(scriptText, userFeedback, existingMusicContent);
              return { characters: {}, scenes: {}, sceneArchitecture: {}, storyboard: { shots: [], rawOutput: '', durationMs: 0 }, soundResult: { scenes: soundResult.scenes, sunoPrompts: soundResult.sunoPrompts } };
            }
            default:
              throw new Error('Invalid section: ' + section);
          }
        })(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Regeneration timeout after 10 minutes (section: ${section})`)), TIMEOUT_MS)
        ),
      ]);

      const task = scriptTasks.get(taskId);
      if (task) { task.status = 'done'; task.result = result; saveScriptTasks(scriptTasks); }
      console.log(`[regenerate] Task ${taskId} done, section=${section}`);
    } catch (err) {
      const task = scriptTasks.get(taskId);
      if (task) { task.status = 'done'; task.error = String(err); saveScriptTasks(scriptTasks); }
      console.log(`[regenerate] Task ${taskId} failed:`, String(err).slice(0, 200));
    }
  })();

  res.json({ taskId, status: 'processing' });
});

// ─── Music Regeneration (async) ──────────────────
router.post('/agent/script/music', async (req: Request, res: Response) => {
  const { scriptText, userFeedback, existingMusic } = req.body;
  if (!scriptText) { res.status(400).json({ error: 'Missing scriptText' }); return; }
  const taskId = uuid();
  const existingMusicContent = existingMusic ? JSON.stringify(existingMusic) : undefined;
  scriptTasks.set(taskId, { status: 'processing', createdAt: Date.now() });
  saveScriptTasks(scriptTasks);
  console.log('[music-regen] Task ' + taskId + ' started, feedback=' + (userFeedback || '').slice(0, 60));

  const MASTER_TIMEOUT_MS = 600_000;
  (async () => {
    try {
      const result = await Promise.race([
        runSoundComposer(scriptText, userFeedback, existingMusicContent),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Music pipeline timeout after 10 minutes')), MASTER_TIMEOUT_MS)
        ),
      ]);
      const task = scriptTasks.get(taskId);
      if (task) {
        task.status = 'done';
        task.section = 'music';
        task.result = { soundResult: result, characters: {}, scenes: {}, sceneArchitecture: {}, storyboard: { shots: [], rawOutput: '', durationMs: 0 } };
        saveScriptTasks(scriptTasks);
      }
      console.log('[music-regen] Task ' + taskId + ' done, music=' + Object.keys(result.sunoPrompts).length);
    } catch (err) {
      const task = scriptTasks.get(taskId);
      if (task) { task.status = 'done'; task.error = String(err); saveScriptTasks(scriptTasks); }
      console.log('[music-regen] Task ' + taskId + ' failed:', String(err).slice(0, 200));
    }
  })();
  res.json({ taskId, status: 'processing' });
});

// ─── Supplement (chars+scenes+music, no storyboard) ──
router.post('/agent/script/supplement', async (req: Request, res: Response) => {
  const { scriptText, visualStyle, nodeId } = req.body;
  if (!scriptText) { res.status(400).json({ error: 'Missing scriptText' }); return; }

  const taskId = uuid();
  scriptTasks.set(taskId, { status: 'processing', createdAt: Date.now() });
  saveScriptTasks(scriptTasks);
  console.log('[supplement] Task ' + taskId + ' started: chars+scenes+music in parallel');

  (async () => {
    const t0 = Date.now();
    try {
      const [chars, scenes, music] = await Promise.all([
        runCharacterExtraction(scriptText, visualStyle),
        runSceneExtraction(scriptText),
        runSoundComposer(scriptText),
      ]);
      const task = scriptTasks.get(taskId);
      if (task) {
        task.status = 'done';
        task.section = 'supplement';
        task.result = {
          characters: chars,
          scenes: scenes,
          sceneArchitecture: {},
          soundResult: music,
          storyboard: { shots: [], rawOutput: '', durationMs: 0 },
        };
        saveScriptTasks(scriptTasks);
      }
      console.log('[supplement] Task ' + taskId + ' done in ' + (Date.now() - t0) + 'ms, chars=' + Object.keys(chars).length + ' scenes=' + Object.keys(scenes).length + ' music=' + Object.keys(music.sunoPrompts || {}).length);

      // Write to canvas node if nodeId provided
      if (nodeId) {
        try {
          const sf = getProjectFile('default');
          if (fs.existsSync(sf)) {
            const st = JSON.parse(fs.readFileSync(sf, 'utf-8'));
            const node = st.nodes?.find((n: any) => n.id === nodeId);
            if (node) {
              if (!node.meta) node.meta = {};
              if (!node.meta.gen) node.meta.gen = {};
              if (chars) node.meta.gen.scriptCharacters = chars;
              if (scenes) node.meta.gen.scriptScenes = scenes;
              if (music?.sunoPrompts) node.meta.gen.scriptSunoPrompts = music.sunoPrompts;
              if (music?.scenes) node.meta.gen.scriptSoundScenes = music.scenes;
              fs.writeFileSync(sf, JSON.stringify(st, null, 2), 'utf-8');
              projectStateCache.delete('default');
            }
          }
        } catch (e) { console.warn('[supplement] Canvas write failed:', e); }
      }
    } catch (err) {
      const task = scriptTasks.get(taskId);
      if (task) { task.status = 'done'; task.error = String(err); saveScriptTasks(scriptTasks); }
      console.log('[supplement] Task ' + taskId + ' failed:', String(err).slice(0, 200));
    }
  })();
  res.json({ taskId, status: 'processing' });
});

// ─── Single Scene Pipeline ───────────────────────
router.post('/agent/script/scene', async (req: Request, res: Response) => {
  req.setTimeout(600000);
  const { scene, scriptExcerpt, visualBible, characterProfiles } = req.body;
  if (!scene && !scriptExcerpt) { res.status(400).json({ error: 'Missing scene data' }); return; }
  try {
    const result = await runAgentPipeline({ userInput: scriptExcerpt || scene.summary || '', model: 'text', mode: 'script-analysis' });
    const shots = parseShotBlocks(result.fullPromptOutput || result.storyboard);
    res.json({ success: true, shots });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ═══════════════════════════════════════════════════
//  Tripo3D Endpoints
// ═══════════════════════════════════════════════════

router.post('/tripo/generate', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    const toPublicUrl = async (url: string): Promise<string> => {
      if (!url) return url;
      if (url.startsWith('data:')) {
        const uploaded = await uploadDataUrl(url);
        if (uploaded) { console.log('[tripo] Converted data URL →', uploaded.slice(0, 60)); return uploaded; }
        throw new Error('Failed to upload reference image — Tripo needs a public URL, not base64 data');
      }
      // Already a public URL
      if (url.startsWith('https://') || (url.startsWith('http://') && !url.includes('localhost'))) {
        return url;
      }
      if (url.startsWith('/api/') || url.startsWith('/models/')) {
        try {
          let filePath = '';
          if (url.startsWith('/api/output/')) {
            filePath = path.join(process.cwd(), 'data', 'output', url.replace('/api/output/', ''));
          } else if (url.startsWith('/api/models/')) {
            filePath = path.join(process.cwd(), '..', 'data', 'models', url.replace('/api/models/', ''));
          } else {
            filePath = path.join(process.cwd(), 'data', url.replace(/^\/api\//, ''));
          }
          console.log('[tripo] Resolving local URL:', url, '→', filePath);
          if (fs.existsSync(filePath)) {
            const buf = fs.readFileSync(filePath);
            const ext = path.extname(filePath).toLowerCase();
            const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png';
            const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
            const uploaded = await uploadDataUrl(dataUrl);
            if (uploaded) { console.log('[tripo] Uploaded file →', uploaded.slice(0, 60)); return uploaded; }
            console.log('[tripo] uploadDataUrl returned empty for', url);
          } else {
            console.log('[tripo] File not found:', filePath);
          }
        } catch (e) { console.log('[tripo] Failed to upload local file:', (e as Error).message); }
        const host = req.get('host') || 'localhost:3001';
        const proto = host.startsWith('localhost') ? 'http' : 'https';
        return `${proto}://${host}${url}`;
      }
      return url;
    };

    let inputUrl = body.input ? await toPublicUrl(body.input) : undefined;
    let inputUrls = body.inputs ? await Promise.all(body.inputs.map((u: string) => toPublicUrl(u))) : undefined;

    const result = await submitTask({
      mode: body.mode || 'text-to-model',
      prompt: body.prompt,
      input: inputUrl,
      inputs: inputUrls,
      model: body.model,
      face_limit: body.face_limit,
      texture: body.texture,
      pbr: body.pbr,
      texture_quality: body.texture_quality,
      auto_size: body.auto_size,
      compress: body.compress,
    });
    res.json({ success: true, task_id: result.task_id });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.get('/tripo/task/:taskId', async (req: Request, res: Response) => {
  try {
    const result = await checkTask(req.params.taskId);
    res.json(result);
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.get('/tripo/task/:taskId/stream', (req: Request, res: Response) => {
  const taskId = req.params.taskId;
  const POLL_INTERVAL = 5000;
  const TIMEOUT_MS = 900_000;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`: ok\n\n`);

  let closed = false;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;

  const cleanup = () => {
    closed = true;
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
  };

  const hardTimeout = setTimeout(() => {
    if (!closed) {
      try { res.write(`data: ${JSON.stringify({ status: 'expired', error: 'Task polling timed out after 15 min' })}\n\n`); } catch {}
      try { res.end(); } catch {}
      cleanup();
    }
  }, TIMEOUT_MS);

  const poll = async () => {
    if (closed) return;
    try {
      const result = await checkTask(taskId);
      if (closed) return;
      const line = `data: ${JSON.stringify(result)}\n\n`;
      try { res.write(line); } catch { cleanup(); return; }
      if (result.status === 'success' || ['failed','cancelled','banned','expired'].includes(result.status)) {
        clearTimeout(hardTimeout);
        try { res.end(); } catch {}
        cleanup();
        return;
      }
      pollTimer = setTimeout(poll, POLL_INTERVAL);
    } catch (e: any) {
      if (closed) return;
      try { res.write(`data: ${JSON.stringify({ status: 'polling', error: e.message })}\n\n`); } catch {}
      pollTimer = setTimeout(poll, POLL_INTERVAL);
    }
  };

  poll();
  req.on('close', () => {
    clearTimeout(hardTimeout);
    cleanup();
  });
});

router.post('/tripo/save-model', async (req: Request, res: Response) => {
  try {
    const { model_url, name, format, texResolution } = req.body;
    if (!model_url) { res.status(400).json({ success: false, error: 'No model_url' }); return; }
    const ext = format || 'glb';
    const safeName = (name || 'tripo_model').replace(/[^a-zA-Z0-9一-鿿_-]/g, '_');
    const dest = path.join(process.cwd(), '..', 'data', 'models', `tripo_${Date.now()}_${safeName}.${ext}`);

    let downloadUrl = model_url;
    const params = new URLSearchParams();
    if (format && format !== 'glb') params.set('format', format);
    if (texResolution) {
      const sizeMap: Record<string, string> = { '512': '512', '1K': '1024', '2K': '2048', '4K': '4096', '8K': '8192' };
      params.set('texture_size', sizeMap[texResolution] || '2048');
    }
    if (params.toString()) downloadUrl += (model_url.includes('?') ? '&' : '?') + params.toString();

    console.log('[tripo] save-model: ' + downloadUrl.slice(0, 100));
    await downloadTripoModel(downloadUrl, dest);
    const relPath = '/api/models/' + path.basename(dest);
    const stat = fs.statSync(dest);
    res.json({ success: true, path: relPath, name: safeName + '.' + ext, size: stat.size });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.post('/tripo/rig-check', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;
    if (!input) { res.status(400).json({ success: false, error: 'Missing input (task_id, file_token, or URL)' }); return; }
    const result = await checkRig(input);
    res.json({ success: true, task_id: result.task_id });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.post('/tripo/rig', async (req: Request, res: Response) => {
  try {
    const { input, model, rig_type, spec, out_format } = req.body;
    if (!input) { res.status(400).json({ success: false, error: 'Missing input (task_id or file_token)' }); return; }
    const result = await submitRig({ input, model, rig_type, spec, out_format });
    res.json({ success: true, task_id: result.task_id });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

router.post('/tripo/retarget', async (req: Request, res: Response) => {
  try {
    const { input, animation, animations, out_format, bake_animation, export_with_geometry, animate_in_place } = req.body;
    if (!input) { res.status(400).json({ success: false, error: 'Missing input (rigged task_id)' }); return; }
    if (!animation && !animations?.length) { res.status(400).json({ success: false, error: 'Missing animation or animations' }); return; }
    const result = await retargetAnimation({ input, animation, animations, out_format, bake_animation, export_with_geometry, animate_in_place });
    res.json({ success: true, task_id: result.task_id });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

// ═══════════════════════════════════════════════════
//  Kie Callbacks
// ═══════════════════════════════════════════════════

router.post('/kie-callback', (req: Request, res: Response) => {
  console.log('[kie-callback] Received:', JSON.stringify(req.body).slice(0, 300));
  res.json({ code: 200, msg: 'ok' });
});

router.post('/kie/suno-callback', (req: Request, res: Response) => {
  console.log('[suno-callback] Received:', JSON.stringify(req.body).slice(0, 500));
  const taskId = req.body?.taskId || req.body?.data?.taskId || '';
  if (taskId) {
    sunoCallbacks.set(taskId, { data: req.body, receivedAt: Date.now() });
    console.log('[suno-callback] Stored result for taskId:', taskId);
  }
  res.json({ received: true });
});

router.get('/kie/suno-callback/:taskId', (req: Request, res: Response) => {
  const data = sunoCallbacks.get(req.params.taskId as string);
  if (!data) { res.json({ ready: false }); return; }
  res.json({ ready: true, data: data.data });
});

// ─── Download ────────────────────────────────────
router.get('/download', handleDownload);

// ═══════════════════════════════════════════════════
//  Visual Extraction Agent
// ═══════════════════════════════════════════════════

router.post('/agent/visual-extract', async (req: Request, res: Response) => {
  console.log('[visual-extract] ===== ROUTE HIT =====');
  const body = req.body as AgentGenerateRequest;
  if (!body.providerId) { res.status(400).json({ error: 'Missing providerId' }); return; }

  const refUrls = (body as any).referenceUrls as string[] | undefined;
  const primaryImage = body.referenceImage as string | undefined;
  const allRefUrls: string[] = [...(refUrls || [])];
  if (primaryImage && !allRefUrls.includes(primaryImage)) {
    allRefUrls.push(primaryImage);
  }
  if (!allRefUrls.length) {
    console.log('[visual-extract] No image sources, redirecting to /api/agent/generate');
    try {
      const PORT = parseInt(process.env.PORT || '3001', 10);
      const resp = await fetch(`http://localhost:${PORT}/api/agent/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await resp.json();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: 'Generate fallback failed: ' + String(e) });
    }
    return;
  }

  console.log('[visual-extract] image sources: refUrls=' + (refUrls?.length || 0) + ' + primaryImage=' + (primaryImage ? 1 : 0));

  const handler = getProvider(body.providerId);
  if (!handler) { res.status(400).json({ error: 'Unknown provider: ' + body.providerId }); return; }

  const config = getProfile();
  const userPrompt = body.rawText || (body.shot && body.shot.intent_cn) || '';
  const extractMode = ((body as any).extractMode as string) || 'auto';
  let compiledPrompt = '';

  const cam = (body as any).camera;
  const lens = (body as any).lens;
  const focal = (body as any).focalLength;
  const apt = (body as any).aperture;
  const film = (body as any).filmStock;
  const camBlock = buildCamBlock({ camera: cam, lens, focalLength: focal, aperture: apt, filmStock: film });
  const enrichedPrompt = userPrompt;

  console.log('[visual-extract] mode=' + extractMode + ' refs=' + allRefUrls.length + ' prompt=' + userPrompt.slice(0, 80));

  const parsed = await parseVisualIntent(enrichedPrompt, allRefUrls, extractMode as ExtractMode);

  if (!parsed) {
    console.log('[visual-extract] Parser failed, compiling locally via compileI2IWithGPT5');
    const fallback = await compileI2IWithGPT5(enrichedPrompt, allRefUrls);
    if (!fallback) {
      res.status(502).json({
        compiled: { en: '', cn: userPrompt, negative: '', debug: [] },
        result: { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: 'Visual parser and fallback both failed — kie.ai server error. Please retry.' },
      });
      return;
    }
    compiledPrompt = fallback;
    console.log('[visual-extract] Fallback compiled ' + fallback.length + ' chars');
  } else {
    compiledPrompt = parsed.compiledPrompt;
  }

  if (camBlock && compiledPrompt) {
    compiledPrompt = camBlock + compiledPrompt;
  }

  console.log('[visual-extract] Generate: ' + body.providerId + ' prompt=' + compiledPrompt.slice(0, 100) + ' (len=' + compiledPrompt.length + ')');
  const t0 = Date.now();

  const i2iNegPrompt = 'blurry, low quality, distorted, deformed, watermark, text, logo, extra limbs, extra fingers, fused body, extra props, weapon, object not in prompt, hallucinated item, extra person, clutter, fabricated details';

  const result: GenerateResult = await withKieLimit(`visual-extract:${body.providerId}`, () => handler({
    providerId: body.providerId,
    mode: 'image-to-image',
    prompt: compiledPrompt,
    negativePrompt: i2iNegPrompt,
    aspect: body.aspect || '16:9',
    resolution: body.resolution || config.defaultResolution,
    referenceImage: body.referenceImage,
    referenceUrls: allRefUrls,
    maskImage: body.maskImage,
    styleImageUrl: body.styleImageUrl,
    videoUrls: (body as any).videoUrls,
    duration: (body as any).duration,
    genMode: (body as any).genMode, refVideoDuration: (body as any).refVideoDuration,
    firstFrameUrl: (body as any).firstFrameUrl,
    lastFrameUrl: (body as any).lastFrameUrl,
    characterOrientation: (body as any).characterOrientation,
    keepOriginalSound: (body as any).keepOriginalSound,
    fixedCamera: (body as any).fixedCamera,
    generateAudio: (body as any).generateAudio,
    webSearch: (body as any).webSearch,
    instrumental: (body as any).instrumental as boolean | undefined,
    lyrics: (body as any).lyrics as string | undefined,
  }));
  result.durationMs = Date.now() - t0;

  addLog({
    id: uuid(), timestamp: new Date().toISOString(), providerId: body.providerId,
    prompt: compiledPrompt, compiledPrompt: compiledPrompt,
    status: result.success ? 'succeeded' : 'failed',
    assetUrls: result.assetUrls, cost: result.cost, durationMs: result.durationMs, error: result.error,
  });

  const debugInfo = [
    { field: 'extractMode', contribution: extractMode },
    { field: 'compiledPrompt', contribution: 'len=' + compiledPrompt.length + ' mode=image-to-image hasRefs=' + allRefUrls.length + ' text=' + compiledPrompt.slice(0, 500) },
    { field: 'providerId', contribution: body.providerId },
    { field: 'extractTarget', contribution: parsed?.intent?.extractTarget || 'none' },
    { field: 'preserve', contribution: (parsed?.intent?.preserve || []).join(', ') },
    { field: 'remove', contribution: (parsed?.intent?.remove || []).join(', ') },
  ];

  lastCompiled = {
    en: compiledPrompt,
    cn: userPrompt,
    mode: 'image-to-image',
    refs: allRefUrls.length,
    method: 'visual-extract-' + extractMode,
    time: new Date().toISOString(),
  };

  console.log('[visual-extract] ===== COMPILED PROMPT =====');
  console.log(compiledPrompt);
  console.log('[visual-extract] ===== END COMPILED PROMPT =====');

  res.json({
    compiled: { en: compiledPrompt, cn: userPrompt, negative: 'blurry, low quality', debug: debugInfo },
    result,
  });
});

// ═══════════════════════════════════════════════════
//  Background Intervals
// ═══════════════════════════════════════════════════

// Cleanup expired script tasks (every 10 min)
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  let deleted = 0;
  for (const [id, t] of scriptTasks) { if (t.createdAt < cutoff) { scriptTasks.delete(id); deleted++; } }
  if (deleted > 0) { saveScriptTasks(scriptTasks); console.log(`[script-tasks] Cleaned ${deleted} expired tasks`); }
}, 600_000);

// 小Q: periodic cognitive check + suggestions (every 5 min)
setInterval(() => {
  onIntervalCheck('default').catch(() => {});
  periodicSuggest('default');
}, 300_000);

export default router;
