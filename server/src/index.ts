/* === TapNow Canvas API Server === */
import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { readJSON, writeJSON } from './systems/db/store.js';
import { v4 as uuid } from 'uuid';

import { KEY_LABELS, getProfile, updateProfile, loadKeys, persistKey, getHiddenKeys, hideKeySlot, restoreKeySlot } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import blenderRouter from './routes/blender.js';
import authRouter from './routes/auth.js';
import { getProvider, listProviders } from './systems/ai/registry.js';
import { compilePrompt } from './systems/agent/compiler.js';
import { runAgentPipeline, runTextPipeline, analyzeReferenceImages, compileI2IWithGPT5 } from './systems/agent/pipeline.js';
import { geminiChat } from './systems/ai/gemini.js';
import { addLog, getLogs } from './systems/task/manager.js';
import { handleDownload } from './systems/file/download.js';
import type { KeyStatus, CompileRequest, AgentGenerateRequest, AgentGenerateResult, GenerateResult } from '../../shared/api-types.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ─── Middleware ───────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', methods: ['GET','POST','PUT','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '50mb' }));
// ─── Public routes (no auth needed) ──────────
// Image proxy — loaded via <img> tag, can't send auth headers
app.get('/api/proxy-image', async (req, res) => proxyAsset(req, res));
app.get('/api/proxy-video', async (req, res) => proxyAsset(req, res));

async function proxyAsset(req: Request, res: Response) {
  const url = req.query.url as string;
  if (!url) { res.status(400).json({ error: 'Missing url' }); return; }
  try {
    const fetchResp = await fetch(url, {
      headers: { 'User-Agent': 'TapNow/1.0' },
    });
    if (!fetchResp.ok) { res.status(502).json({ error: `Upstream fetch failed: ${fetchResp.status}` }); return; }
    const buffer = Buffer.from(await fetchResp.arrayBuffer());
    const contentType = fetchResp.headers.get('content-type') || 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}

app.use('/api/blender', blenderRouter);
app.use('/api/auth', authRouter);

app.use(authMiddleware);

// ─── Image Analysis Cache ──────────────────────
// Stores Gemini Vision analysis for every image URL
const imageCache = new Map<string, string>(); // url → description
let lastCompiled: any = null; // last compiled prompt for debugging

// Analyze a single image and cache the result
async function analyzeAndCache(url: string): Promise<string> {
  if (imageCache.has(url)) return imageCache.get(url)!;
  try {
    const analyses = await analyzeReferenceImages([url]);
    const desc = analyses[0] || '';
    // Use full detailed analysis (materials, facial features, clothing, weathering, etc.)
    const summary = desc.slice(0, 800);
    imageCache.set(url, summary);
    console.log('[vision-cache] Cached:', summary.slice(0, 60) + '... (' + summary.length + ' chars)');
    return summary;
  } catch (err) {
    console.log('[vision-cache] Failed:', String(err).slice(0, 60));
    return '';
  }
}

// ─── Startup ──────────────────────────────────
loadKeys(); // Restore persisted API keys

// ═══════════════════════════════════════════════
// API Routes
// ═══════════════════════════════════════════════

// ─── Health ───────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Canvas Sync ─────────────────────────────
const CANVAS_FILE = 'data/canvas-state.json';
let canvasState: any = readJSON(CANVAS_FILE) || { nodes: [], edges: [], updatedAt: '' };
console.log(`[canvas] Loaded state: ${canvasState.nodes?.length||0} nodes`);

app.post('/api/canvas/sync', (req, res) => {
  canvasState = { nodes: req.body.nodes || [], edges: req.body.edges || [], updatedAt: new Date().toISOString() };
  writeJSON(CANVAS_FILE, canvasState);
  const imgNodes = (canvasState.nodes as any[]).filter((n: any) => n.type?.includes('image') || n.type === 'scene.3d');
  const imageUrls: string[] = [];
  imgNodes.forEach((n: any) => {
    const u = n.meta?.gen?.imageUrl || n.meta?.gen?.videoUrl;
    if (u) imageUrls.push(u);
  });
  imageUrls.forEach(url => { analyzeAndCache(url).catch(() => {}); });
  console.log(`[canvas] Synced: ${canvasState.nodes.length} nodes, ${canvasState.edges.length} edges → disk`);
  res.json({ ok: true, imagesAnalyzing: imageUrls.length });
});
app.get('/api/canvas/state', (_req, res) => {
  const imgNodes = (canvasState.nodes as any[]).filter((n: any) => n.type?.includes('image') || n.type === 'scene.3d');
  res.json({
    totalNodes: canvasState.nodes.length,
    totalEdges: canvasState.edges.length,
    imageCount: imgNodes.length,
    cachedImages: imageCache.size,
    updatedAt: canvasState.updatedAt,
  });
});

// ─── Keys ─────────────────────────────────────
app.get('/api/keys', (_req, res) => {
  const hidden = getHiddenKeys();
  const keys: KeyStatus[] = Object.entries(KEY_LABELS)
    .filter(([k]) => !hidden.includes(k))
    .map(([k, label]) => {
      const v = process.env[k] || '';
      return { key: k, label, configured: v.length > 0, masked: v.length > 0 ? v.slice(0,3)+'...'+v.slice(-4) : '' };
    });
  res.json({ keys });
});

app.put('/api/keys', (req, res) => {
  const updates = req.body as Record<string, string>;
  for (const [k, v] of Object.entries(updates)) {
    if (KEY_LABELS[k] && v?.trim()) { process.env[k] = v.trim(); persistKey(k, v.trim()); console.log(`[keys] Set ${k}`); }
  }
  const keys: KeyStatus[] = Object.entries(KEY_LABELS).map(([k, label]) => {
    const v = process.env[k] || '';
    return { key: k, label, configured: v.length > 0, masked: v.length > 0 ? v.slice(0,3)+'...'+v.slice(-4) : '' };
  });
  res.json({ keys });
});

app.delete('/api/keys/:key', (req, res) => {
  const k = req.params.key;
  if (!KEY_LABELS[k]) return res.status(400).json({ error: `Unknown key: ${k}` });
  delete process.env[k];
  hideKeySlot(k);
  res.json({ hidden: k, label: KEY_LABELS[k] });
});

app.get('/api/keys/hidden', (_req, res) => {
  res.json({ keys: getHiddenKeys().map(k => ({ key: k, label: KEY_LABELS[k] || k })) });
});

app.post('/api/keys/restore/:key', (req, res) => {
  restoreKeySlot(req.params.key);
  res.json({ restored: req.params.key });
});

// ─── Agent Config ─────────────────────────────
app.get('/api/agent/config', (_req, res) => res.json(getProfile()));

app.put('/api/agent/config', (req, res) => {
  const allowed = ['name','avatar','translationStyle','defaultModel','defaultResolution','promptEnhancement','systemPrompt','polishPrompt'];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in req.body) patch[k] = (req.body as any)[k];
  res.json(updateProfile(patch));
});

// ─── Image Analysis ──────────────────────────
app.post('/api/analyze-image', async (req: Request, res: Response) => {
  const { url } = req.body;
  if (!url) { res.status(400).json({ error: 'Missing url' }); return; }
  const desc = await analyzeAndCache(url);
  res.json({ url, description: desc, cached: imageCache.has(url) });
});

// ─── Generate ─────────────────────────────────
app.post('/api/generate', async (req: Request, res: Response) => {
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

// ─── Agent ───────────────────────────────────
app.post('/api/agent/compile', async (req: Request, res: Response) => {
  const body = req.body as CompileRequest;
  res.json({ compiled: await compilePrompt(body.shot, body.rawText, (body as any).referenceUrls) });
});

app.post('/api/agent/text', async (req: Request, res: Response) => {
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

    const trace = pipelineResult.trace.map(t => ({
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

app.post('/api/agent/generate', async (req: Request, res: Response) => {
  const body = req.body as AgentGenerateRequest;
  if (!body.providerId) { res.status(400).json({ error: 'Missing providerId' }); return; }
  console.log('[agent] providerId received:', body.providerId, 'model:', (body as any).model, 'mode:', body.mode);
  const handler = getProvider(body.providerId);
  if (!handler) { res.status(400).json({ error: 'Unknown provider: ' + body.providerId }); return; }
  const config = getProfile();
  const userPrompt = body.rawText || (body.shot && body.shot.intent_cn) || '';
  let compiledPrompt = '';
  let agentTrace = [];
  const isVideo = body.providerId === 'kling-video' || body.providerId === 'seedance-2';
  // Skip agent pipeline if prompt is already English (no need to compile)
  const isEnglish = /^[a-zA-Z0-9\s.,!?;:'"()\-\[\]{}$@#%^&*+=<>/\\|~`\n\r]+$/.test(userPrompt);

  // Build camera kit spec string — inject BEFORE any AI compilation
  const cam = (body as any).camera;
  const lens = (body as any).lens;
  const focal = (body as any).focalLength;
  const apt = (body as any).aperture;
  const film = (body as any).filmStock;
  let camBlock = '';
  if (cam || lens || focal || apt || film) {
    const parts: string[] = [];
    if (cam) parts.push(`Camera: ${cam}`);
    if (lens) parts.push(`Lens: ${lens}`);
    if (focal) parts.push(`Focal length: ${focal}`);
    if (apt) parts.push(`Aperture: ${apt}`);
    if (film) parts.push(`Film stock: ${film}`);
    camBlock = '[' + parts.join(', ') + '] ';
  }
  const enrichedPrompt = camBlock ? camBlock + userPrompt : userPrompt;

  // ── Video models: pass through as-is (Kling/Seedance are Chinese-native, no translation needed) ──
  if (isVideo) {
    compiledPrompt = enrichedPrompt;
  } else if (config.promptEnhancement && !isEnglish) {
    const isI2I = body.mode === 'image-to-image' && ((body as any).referenceUrls?.length > 0 || body.referenceImage);
    if (isI2I) {
      // I2I: GPT-5.4 directly analyzes reference images + compiles prompt
      try {
        const refUrls = (body as any).referenceUrls as string[] | undefined;
        if (refUrls?.length) {
          // GPT-5.4 sees the actual images — no separate Gemini Vision step needed
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
      // T2I mode: full cinematic compilation
      try {
        const pipelineResult = await runAgentPipeline({
          userInput: enrichedPrompt, model: body.providerId, mode: body.mode,
          referenceUrls: (body as any).referenceUrls,
          referencePrompts: (body as any).referencePrompts,
          aspect: body.aspect, resolution: body.resolution,
        });
        compiledPrompt = pipelineResult.modelPrompt || userPrompt;
        agentTrace = pipelineResult.trace;
      } catch(e) { compiledPrompt = userPrompt; console.error('[pipeline] Error:', e); }
    }
  } else {
    compiledPrompt = enrichedPrompt;
    // If reference images exist, analyze them with Gemini Vision and merge into prompt
    const refUrls = (body as any).referenceUrls as string[] | undefined;
    if (refUrls && refUrls.length > 0) {
      // First, map each @mention to a reference URL by order of appearance
      const orderedMentions: string[] = [];
      const mentionPattern = /@([\S]+)(?:\s+[\S]+)*/g;
      let mMatch: RegExpExecArray | null;
      while ((mMatch = mentionPattern.exec(compiledPrompt)) !== null) {
        if (!orderedMentions.includes(mMatch[0])) orderedMentions.push(mMatch[0]);
      }
      // Use cached analyses (or analyze on demand)
      let summaries: string[] = []; try { const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)); const results = await Promise.race([Promise.all(refUrls.map(url => analyzeAndCache(url))), timeout]); summaries = results as string[]; } catch (err) { console.log("[agent] Vision cache lookup/analysis timed out, continuing without summaries"); summaries = refUrls.map(() => ""); }
      // Replace each @mention with its mapped ref
      orderedMentions.forEach((tag) => {
        const i = orderedMentions.indexOf(tag);
        const refIdx = Math.min(i, refUrls.length - 1);
        const desc = summaries[refIdx] ? `: ${summaries[refIdx]}` : '';
        compiledPrompt = compiledPrompt.split(tag).join(`[Ref ${refIdx + 1}${desc}]`);
        });
        if (compiledPrompt.length > 3500) compiledPrompt = compiledPrompt.slice(0, 3500);
        console.log('[agent] Vision merged, prompt length:', compiledPrompt.length);
    }
  }
  // Safety: ensure compiledPrompt is never empty
  if (!compiledPrompt || compiledPrompt.trim().length === 0) {
    compiledPrompt = userPrompt || body.rawText || 'generate an image';
    console.log('[agent] WARNING: compiledPrompt was empty, using fallback: ' + compiledPrompt.slice(0, 80));
  }
  // Apply camera kit to compiledPrompt if not already in enrichedPrompt
  if (camBlock && compiledPrompt && compiledPrompt !== enrichedPrompt) {
    compiledPrompt = camBlock + compiledPrompt;
  }

  console.log('[agent] Generate: ' + body.providerId + ' prompt=' + compiledPrompt.slice(0, 100) + ' (len=' + compiledPrompt.length + ')');
  const t0 = Date.now();
  // I2I negative prompt: NEVER mention face/identity terms — they confuse the model and break identity preservation
  const i2iNegPrompt = body.mode === 'image-to-image'
    ? 'blurry, low quality, distorted, deformed, watermark, text, logo, extra limbs, extra fingers, fused body, extra props, weapon, object not in prompt, hallucinated item, extra person, clutter, fabricated details'
    : 'blurry, low quality, distorted, deformed, watermark, text, logo';
  const result: GenerateResult = await handler({
    providerId: body.providerId, mode: body.mode, prompt: compiledPrompt,
    negativePrompt: i2iNegPrompt,
    aspect: body.aspect || '16:9', resolution: body.resolution || config.defaultResolution,
    referenceImage: body.referenceImage, referenceUrls: (body as any).referenceUrls, maskImage: body.maskImage, styleImageUrl: body.styleImageUrl,
    videoUrls: (body as any).videoUrls, duration: (body as any).duration,
    // Model-specific params (Kling / Seedance)
    genMode: (body as any).genMode,
    firstFrameUrl: (body as any).firstFrameUrl,
    lastFrameUrl: (body as any).lastFrameUrl,
    characterOrientation: (body as any).characterOrientation,
    keepOriginalSound: (body as any).keepOriginalSound,
    fixedCamera: (body as any).fixedCamera,
    generateAudio: (body as any).generateAudio,
    webSearch: (body as any).webSearch,
  });
  result.durationMs = Date.now() - t0;
  addLog({
    id: uuid(), timestamp: new Date().toISOString(), providerId: body.providerId,
    prompt: compiledPrompt, compiledPrompt: compiledPrompt,
    status: result.success ? 'succeeded' : 'failed',
    assetUrls: result.assetUrls, cost: result.cost, durationMs: result.durationMs, error: result.error,
  });
  // Auto-cache generated images for future @mention use
  if (result.success && result.assetUrls.length > 0) {
    result.assetUrls.forEach(url => { analyzeAndCache(url).catch(() => {}); });
  }
  const debugInfo = agentTrace.map(function(t){ return {field:t.agentName||t.agentId,contribution:t.output?t.output.slice(0,60):''}; });
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
  // Save last compiled prompt for debugging
  lastCompiled = { en: compiledPrompt, cn: userPrompt, mode: body.mode, refs: (body as any).referenceUrls?.length || 0, method: body.mode === 'image-to-image' ? 'i2i-direct' : (config.promptEnhancement ? 't2i-pipeline' : 'raw'), time: new Date().toISOString() };
  console.log('[agent] ===== COMPILED EN PROMPT =====');
  console.log(compiledPrompt);
  console.log('[agent] ===== END COMPILED PROMPT =====');
  res.json({ compiled: { en: compiledPrompt, cn: userPrompt, negative: 'blurry, low quality', debug: debugInfo }, result, agentTrace });
});

app.get('/api/last-compiled', (_req, res) => res.json({ compiled: lastCompiled || { en: '(no generation yet)' }, kieReq: (globalThis as any).__lastKieReq || null }));
app.get('/api/agent/logs', (_req, res) => res.json({ logs: getLogs() }));

// ─── Script Analysis ─────────────────────────
import { runAgentPipeline } from './systems/agent/pipeline.js';

function parseShotsFromOutput(output: string): any[] {
  const blocks = output.split(/===+/).filter(b => b.trim().length > 20);
  return blocks.map((block, i) => {
    const extract = (label: string) => { const m = block.match(new RegExp(label + ':\\s*\\n?([^\\n]+)', 'i')); return m ? m[1].trim() : ''; };
    return {
      shotNumber: i + 1,
      shotType: extract('Shot Type') || 'MS',
      cameraMovement: extract('Camera Movement') || 'static',
      angle: extract('Camera Angle') || 'eye level',
      lens: extract('Lens') || '50mm',
      aperture: extract('Aperture') || '2.8',
      composition: extract('Composition') || '',
      visualPrompt: block.trim(),
      scene: extract('Scene') || '',
      emotion: extract('Emotion') || '',
      action: extract('Action Beat') || '',
      foreground: extract('Foreground') || '',
      midground: extract('Midground') || '',
      background: extract('Background') || '',
      blocking: extract('Character Blocking') || '',
    };
  });
}

function extractCharacters(brief: string): Record<string, any> {
  const chars: Record<string, any> = {};
  // Match lines like "**角色名**: description" or "- 角色名: description"
  const re = /(?:^|\n)(?:\*\*|[-*]\s*|\d+\.\s*)([^\n:：]{2,12})(?:[:：]\s*)([^\n]{10,200})/gm;
  let m;
  while ((m = re.exec(brief)) !== null) {
    const name = m[1].replace(/[*#\s]/g, '').trim();
    if (name && name.length >= 2 && !name.match(/^(主题|核心|场景|镜头|风格|光线|色彩|导演|参考|第.|情绪|功能|符号|空间|声音|节奏)/)) {
      chars[name] = m[2].trim();
    }
  }
  if (Object.keys(chars).length === 0) {
    // Fallback: try simpler pattern
    const lines = brief.split('\n').filter(l => l.includes(':') && l.length < 120);
    lines.forEach(l => {
      const parts = l.split(/[:：]/);
      if (parts.length === 2 && parts[0].length >= 2 && parts[0].length <= 10 && parts[1].length >= 5) {
        chars[parts[0].trim()] = parts[1].trim();
      }
    });
  }
  return chars;
}

app.post('/api/agent/script/overview', async (req, res) => {
  const { scriptText, visualStyle } = req.body;
  if (!scriptText) { res.status(400).json({ error: 'Missing scriptText' }); return; }
  try {
    const result = await runAgentPipeline({ userInput: scriptText, model: 'text', mode: 'script-analysis' });
    const shots = parseShotsFromOutput(result.fullPromptOutput || result.storyboard);
    const scenes = [{ sceneNumber: 1, sceneHeader: '全剧本', location: '', timeOfDay: '', characters: [], sceneType: '', summary: '', estimatedShots: shots.length, dramaticCore: '' }];
    res.json({ success: true, creativeBrief: result.creativeBrief, visualBible: result.visualBible, storyboard: result.storyboard, allShots: shots.length > 0 ? [{ sceneNumber: 1, shots }] : [], scenes: shots.length > 0 ? scenes : [], characterProfiles: extractCharacters(result.creativeBrief) });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

app.post('/api/agent/script/characters', async (_req, res) => {
  // Characters are extracted from the overview creative brief — see overview route
  res.json({ success: true, characters: {} });
});

app.post('/api/agent/script/scene', async (req, res) => {
  const { scene, scriptExcerpt, visualBible, characterProfiles } = req.body;
  if (!scene && !scriptExcerpt) { res.status(400).json({ error: 'Missing scene data' }); return; }
  try {
    const result = await runAgentPipeline({ userInput: scriptExcerpt || scene.summary || '', model: 'text', mode: 'script-analysis' });
    const shots = parseShotsFromOutput(result.fullPromptOutput || result.storyboard);
    res.json({ success: true, shots });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── Kie.ai Callback ──────────────────────────
app.post('/api/kie-callback', (req, res) => {
  console.log('[kie-callback] Received:', JSON.stringify(req.body).slice(0, 300));
  res.json({ code: 200, msg: 'ok' });
});

// ─── Download ────────────────────────────────
app.get('/api/download', handleDownload);

// ─── Proxy Image (for CORS-free canvas crop)

// ─── UE5 Proxy ────────────────────────────
import { createProxyMiddleware } from 'http-proxy-middleware';
// UE5 HTTP player page
app.use('/ue5', createProxyMiddleware({ target: 'http://127.0.0.1:80', changeOrigin: true, pathRewrite: { '^/ue5': '' } }));
// UE5 WebSocket signalling (Pixel Streaming needs ws:// → ws://localhost:8888)
app.use('/ue5-ws', createProxyMiddleware({ target: 'ws://127.0.0.1:8888', changeOrigin: true, ws: true, pathRewrite: { '^/ue5-ws': '' } }));

// ─── Serve static files ──
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/admin', express.static(path.join(__dirname, '../../admin'), {
  setHeaders: (res) => { res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate'); }
}));
// Production frontend
// Proxy to Vite dev server (localhost:5173)
app.use('/', createProxyMiddleware({
  target: 'http://127.0.0.1:5173',
  changeOrigin: true,
  ws: true,
  filter: (pathname: string) => !pathname.startsWith('/api/') && !pathname.startsWith('/admin/') && !pathname.startsWith('/ue5'),
}));

// Create HTTP server explicitly for WebSocket upgrade proxying
import http from 'node:http';
const server = http.createServer(app);

// UE5 Pixel Streaming WebSocket proxy (created once, reused)
const ue5WsProxy = createProxyMiddleware({
  target: 'ws://127.0.0.1:8888',
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/ue5-ws': '' },
});
server.on('upgrade', (req, socket, head) => {
  if (req.url?.startsWith('/ue5-ws')) {
    console.log('[ws-proxy] Upgrade:', req.url);
    // @ts-ignore
    ue5WsProxy.upgrade(req, socket, head);
  }
});

server.listen(PORT, () => {
  console.log(`[server] TapNow API → http://localhost:${PORT}`);
  console.log(`[server] Admin → http://localhost:${PORT}/admin`);
});
