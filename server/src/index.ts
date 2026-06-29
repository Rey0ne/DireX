/* === TapNow Canvas API Server === */
import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { readJSON, writeJSON } from './systems/db/store.js';
import { v4 as uuid } from 'uuid';

import { KEY_LABELS, getProfile, updateProfile, loadKeys, persistKey, getHiddenKeys, hideKeySlot, restoreKeySlot } from './config.js';
import { submitTask, pollTask, downloadModel as downloadTripoModel, checkRig, submitRig, retargetAnimation } from './systems/ai/tripo-provider.js';
import { authMiddleware } from './middleware/auth.js';
import blenderRouter from './routes/blender.js';
import authRouter from './routes/auth.js';
import { getProvider, listProviders } from './systems/ai/registry.js';
import { compilePrompt } from './systems/agent/compiler.js';
import { runAgentPipeline, runTextPipeline, runUnifiedPipeline, analyzeReferenceImages, compileI2IWithGPT5, parseShotBlocks } from './systems/agent/pipeline.js';
import { gpt5Chat } from './systems/ai/gemini.js';
import { compileVideoPrompt } from './systems/agent/video-analyzer.js';
import { pollStoredTask, initVideoTask, uploadDataUrl } from './systems/ai/kie-provider.js';
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

// Model storage — save to disk, serve statically
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
const MODELS_DIR = path.join(process.cwd(), 'data', 'models');
fs.mkdirSync(MODELS_DIR, { recursive: true });
const upload = multer({ storage: multer.diskStorage({
  destination: MODELS_DIR,
  filename: (_req, file, cb) => { const ext = path.extname(file.originalname); cb(null, Date.now() + '_' + Math.random().toString(36).slice(2,8) + ext); }
}), limits: { fileSize: 200 * 1024 * 1024 } }); // 200MB limit
app.post('/api/models/upload', upload.single('model'), (req, res) => {
  if (!req.file) { res.status(400).json({ error: 'No file' }); return; }
  res.json({ success: true, path: '/api/models/' + req.file.filename, name: req.file.originalname });
});
app.post('/api/models/delete', (req, res) => {
  const { p } = req.body; if (!p || !p.startsWith('/api/models/')) { res.status(400).json({ error: 'Invalid path' }); return; }
  const filepath = path.join(MODELS_DIR, p.replace('/api/models/', ''));
  fs.unlink(filepath, (err) => { if (err && err.code !== 'ENOENT') console.error('[models] Delete error:', err.message); });
  res.json({ success: true });
});
app.use('/api/models', express.static(MODELS_DIR, { fallthrough: false }));

// ─── Tripo3D Routes ────────────────────────────
app.post('/api/tripo/generate', async (req, res) => {
  try {
    const body = req.body;

    // Convert data URLs & local paths to public HTTP URLs (Tripo needs accessible URLs)
    const toPublicUrl = async (url: string): Promise<string> => {
      if (!url) return url;
      if (url.startsWith('data:')) {
        const uploaded = await uploadDataUrl(url);
        if (uploaded) { console.log('[tripo] Converted data URL →', uploaded.slice(0, 60)); return uploaded; }
        throw new Error('Failed to upload reference image — Tripo needs a public URL, not base64 data');
      }
      if (url.startsWith('/api/') || url.startsWith('/models/')) {
        // Read local file and upload to public host
        try {
          const fs = await import('fs');
          const path = await import('path');
          const filePath = path.join(process.cwd(), 'server/data', url.replace(/^\/api\/models?\//, ''));
          if (fs.existsSync(filePath)) {
            const buf = fs.readFileSync(filePath);
            const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;
            const uploaded = await uploadDataUrl(dataUrl);
            if (uploaded) { console.log('[tripo] Uploaded local file →', uploaded.slice(0, 60)); return uploaded; }
          }
        } catch (e) { console.log('[tripo] Failed to upload local file:', (e as Error).message); }
        // Fallback: resolve to absolute URL via host
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

app.get('/api/tripo/task/:taskId', async (req, res) => {
  try {
    const result = await pollTask(req.params.taskId);
    res.json(result);
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

app.post('/api/tripo/save-model', async (req, res) => {
  try {
    const { model_url, name, format, texResolution } = req.body;
    if (!model_url) { res.status(400).json({ success: false, error: 'No model_url' }); return; }
    const ext = format || 'glb';
    const safeName = (name || 'tripo_model').replace(/[^a-zA-Z0-9一-鿿_-]/g, '_');
    const dest = path.join(MODELS_DIR, `tripo_${Date.now()}_${safeName}.${ext}`);

    // Tripo3D supports format conversion via URL query params
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

// ─── Tripo3D Rig & Animation Routes ─────────────
app.post('/api/tripo/rig-check', async (req, res) => {
  try {
    const { input } = req.body;
    if (!input) { res.status(400).json({ success: false, error: 'Missing input (task_id, file_token, or URL)' }); return; }
    const result = await checkRig(input);
    res.json({ success: true, task_id: result.task_id });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

app.post('/api/tripo/rig', async (req, res) => {
  try {
    const { input, model, rig_type, spec, out_format } = req.body;
    if (!input) { res.status(400).json({ success: false, error: 'Missing input (task_id or file_token)' }); return; }
    const result = await submitRig({ input, model, rig_type, spec, out_format });
    res.json({ success: true, task_id: result.task_id });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

app.post('/api/tripo/retarget', async (req, res) => {
  try {
    const { input, animation, animations, out_format, bake_animation, export_with_geometry, animate_in_place } = req.body;
    if (!input) { res.status(400).json({ success: false, error: 'Missing input (rigged task_id)' }); return; }
    if (!animation && !animations?.length) { res.status(400).json({ success: false, error: 'Missing animation or animations' }); return; }
    const result = await retargetAnimation({ input, animation, animations, out_format, bake_animation, export_with_geometry, animate_in_place });
    res.json({ success: true, task_id: result.task_id });
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

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
// Persistent vision cache — survives server restarts so images aren't re-analyzed
const VISION_CACHE_FILE = 'data/vision-cache.json';
const imageCache: Map<string, string> = new Map(Object.entries((readJSON(VISION_CACHE_FILE) as Record<string, string>) || {}));
console.log('[vision-cache] Loaded ' + imageCache.size + ' cached analyses from disk');
let lastCompiled: any = null; // last compiled prompt for debugging

// Analyze a single image and cache the result (disk-persisted)
async function analyzeAndCache(url: string): Promise<string> {
  if (imageCache.has(url)) return imageCache.get(url)!;
  try {
    const analyses = await analyzeReferenceImages([url]);
    const desc = analyses[0] || '';
    // Use full detailed analysis (materials, facial features, clothing, weathering, etc.)
    const summary = desc.slice(0, 800);
    imageCache.set(url, summary);
    // Persist to disk so restart doesn't re-trigger analysis
    writeJSON(VISION_CACHE_FILE, Object.fromEntries(imageCache));
    console.log('[vision-cache] Cached (' + imageCache.size + ' total):', summary.slice(0, 60) + '...');
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
  console.log(`[canvas] Synced: ${canvasState.nodes.length} nodes, ${canvasState.edges.length} edges → disk`);
  res.json({ ok: true });
});
app.get('/api/canvas/state', (_req, res) => {
  res.json({
    nodes: canvasState.nodes || [],
    edges: canvasState.edges || [],
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

// ─── Full Pipeline: one call → characters + scenes + props + music + storyboard ───
app.post('/api/agent/full', async (req: Request, res: Response) => {
  const body = req.body;
  const scriptText = body.rawText || '';
  const visualStyle = body.visualStyle as string | undefined;
  console.log('[full-api] Request: script=' + scriptText.slice(0, 80) + ' style=' + (visualStyle || 'none'));
  if (!scriptText) { res.status(400).json({ error: 'Missing script text' }); return; }

  try {
    const pipelineResult = await runUnifiedPipeline(scriptText, visualStyle);
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

  // ── Video models: Agent compiles prompt (text only) → Kie gets URLs directly → Seedance does visual understanding ──
  if (isVideo) {
    const videoUrls = (body as any).videoUrls as string[] | undefined;
    const refUrls = (body as any).referenceUrls as string[] | undefined;
    const hasRefs = !!(videoUrls?.length || refUrls?.length);

    // Lightweight prompt compilation (text-only, no image/video analysis — Seedance sees refs directly)
    if (hasRefs && !isEnglish && config.promptEnhancement) {
      try {
        const compiled = await compileVideoPrompt(enrichedPrompt, !!(refUrls?.length), !!(videoUrls?.length));
        if (compiled) compiledPrompt = compiled;
      } catch (e) {
        console.log('[agent] Video compile failed:', String(e).slice(0, 80));
      }
    }

    // Submit to Kie — passes image/video URLs directly so Seedance can analyze them
    const clientTaskId = uuid();
    initVideoTask(clientTaskId, body.providerId);
    const i2iNegPrompt = 'blurry, low quality, distorted, deformed, watermark, text, logo';
    const result: GenerateResult = await handler({
      providerId: body.providerId, mode: body.mode, prompt: compiledPrompt,
      negativePrompt: i2iNegPrompt,
      aspect: body.aspect || '16:9', resolution: body.resolution || config.defaultResolution,
      referenceImage: body.referenceImage, referenceUrls: refUrls, maskImage: body.maskImage,
      styleImageUrl: body.styleImageUrl,
      videoUrls: videoUrls, duration: (body as any).duration,
      genMode: (body as any).genMode,
      firstFrameUrl: (body as any).firstFrameUrl, lastFrameUrl: (body as any).lastFrameUrl,
      characterOrientation: (body as any).characterOrientation,
      keepOriginalSound: (body as any).keepOriginalSound,
      fixedCamera: (body as any).fixedCamera,
      generateAudio: (body as any).generateAudio,
      webSearch: (body as any).webSearch,
      clientTaskId,
    });
    // Seedance generation is async — client polls for result, don't block here
    console.log('[agent] ===== COMPILED PROMPT =====');
    console.log(compiledPrompt);
    console.log('[agent] ===== END COMPILED PROMPT =====');
    console.log('[agent] Video task submitted: client=' + clientTaskId + ' — client will poll');
    res.json({ compiled: { en: compiledPrompt, cn: userPrompt, negative: 'blurry, low quality', debug: [] }, result: { ...result, taskId: clientTaskId, needsPoll: true }, agentTrace: [] });
    return;
  }
  if (config.promptEnhancement && !isEnglish) {
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
      // T2I: GPT-5.4 translates Chinese → English
      try {
        const t0 = Date.now();
        const translated = await gpt5Chat(
          [{ role: 'user', content: [{ type: 'input_text', text: 'Translate the following Chinese image generation prompt into English. Preserve all visual details, camera specs, composition, lighting, mood. Output ONLY the English prompt, no explanations.\n\n' + enrichedPrompt }] }],
          { effort: 'low', timeoutMs: 60000, maxOutputTokens: 500 },
        );
        if (translated) {
          compiledPrompt = translated;
          console.log('[agent] T2I GPT-5.4 translated in ' + (Date.now() - t0) + 'ms, ' + translated.length + ' chars');
        } else {
          compiledPrompt = enrichedPrompt; // fallback: use Chinese directly
        }
      } catch(e) {
        console.log('[agent] T2I translation failed:', String(e).slice(0, 80));
        compiledPrompt = enrichedPrompt;
      }
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
    // Suno audio
    instrumental: (body as any).instrumental as boolean | undefined,
    lyrics: (body as any).lyrics as string | undefined,
  });
  result.durationMs = Date.now() - t0;
  addLog({
    id: uuid(), timestamp: new Date().toISOString(), providerId: body.providerId,
    prompt: compiledPrompt, compiledPrompt: compiledPrompt,
    status: result.success ? 'succeeded' : 'failed',
    assetUrls: result.assetUrls, cost: result.cost, durationMs: result.durationMs, error: result.error,
  });
  // Auto-cache disabled — unused @mention feature wasted Gemini Vision calls
  // if (result.success && result.assetUrls.length > 0) {
  //   result.assetUrls.forEach(url => { analyzeAndCache(url).catch(() => {}); });
  // }
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
  console.log('[agent] ===== COMPILED PROMPT =====');
  console.log(compiledPrompt);
  console.log('[agent] ===== END COMPILED PROMPT =====');
  res.json({ compiled: { en: compiledPrompt, cn: userPrompt, negative: 'blurry, low quality', debug: debugInfo }, result, agentTrace });
});

// ─── Client-side task polling (for long video generation) ──
app.get('/api/task/:taskId/poll', async (req, res) => {
  const { taskId } = req.params;
  if (!taskId) { res.status(400).json({ error: 'Missing taskId' }); return; }
  console.log('[poll] Client polling ' + taskId);
  const result = await pollStoredTask(taskId);
  res.json(result);
});

app.get('/api/last-compiled', (_req, res) => res.json({ compiled: lastCompiled || { en: '(no generation yet)' }, kieReq: (globalThis as any).__lastKieReq || null }));
app.get('/api/agent/logs', (_req, res) => res.json({ logs: getLogs() }));

// ─── Script Analysis ─────────────────────────
import { runCharacterExtraction, runSceneExtraction, runSceneArchitect, runPropDesigner, runSoundComposer, runScriptAnalysis, type ScriptAnalysisResult } from './systems/agent/pipeline.js';

// 异步任务存储：taskId → { status, result }
const scriptTasks = new Map<string, { status: 'processing'|'done'; result?: ScriptAnalysisResult; error?: string; createdAt: number }>();

// 提交分析任务 → 立即返回 taskId，后台异步处理
app.post('/api/agent/script/overview', async (req, res) => {
  const { scriptText, visualStyle } = req.body;
  if (!scriptText) { res.status(400).json({ error: 'Missing scriptText' }); return; }
  const taskId = uuid();
  scriptTasks.set(taskId, { status: 'processing', createdAt: Date.now() });
  console.log('[script-analysis] Task ' + taskId + ' started, scriptLen=' + scriptText.length);
  // 后台异步两阶段处理
  // Phase 1: 角色提取（快，输出短）
  // Phase 2: 分镜生成（基于角色 + 镜头规范，输出稳定完整）
  (async () => {
    try {
      const characters = await runCharacterExtraction(scriptText, visualStyle);
      console.log('[script-analysis] Task ' + taskId + ' chars extracted: ' + Object.keys(characters).length);
      const result = await runScriptAnalysis(scriptText, visualStyle, characters);
      const task = scriptTasks.get(taskId);
      if (task) { task.status = 'done'; task.result = result; }
      console.log('[script-analysis] Task ' + taskId + ' done, shots=' + result.shots.length + ' chars=' + result.rawOutput.length);
    } catch (err) {
      const task = scriptTasks.get(taskId);
      if (task) { task.status = 'done'; task.error = String(err); }
      console.log('[script-analysis] Task ' + taskId + ' failed:', String(err).slice(0, 200));
    }
  })();
  res.json({ taskId, status: 'processing' });
});

// 轮询任务结果
app.get('/api/agent/script/result/:taskId', (req, res) => {
  const task = scriptTasks.get(req.params.taskId);
  if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
  if (task.status === 'processing') { res.json({ status: 'processing' }); return; }
  const r = task.result;
  res.json({
    status: 'done',
    success: !task.error,
    shots: r?.shots || [],
    characterProfiles: r?.characters || {},
    rawOutput: r?.rawOutput || '',
    durationMs: r?.durationMs || 0,
    error: task.error,
  });
});

// 清理过期任务（每 30 分钟清一次）
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, t] of scriptTasks) { if (t.createdAt < cutoff) scriptTasks.delete(id); }
}, 600_000);

app.post('/api/agent/script/characters', async (req, res) => {
  const { scriptText } = req.body;
  if (!scriptText) { res.status(400).json({ error: 'Missing scriptText' }); return; }
  try {
    const characters = await runCharacterExtraction(scriptText);
    res.json({ success: true, characters });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

app.post('/api/agent/script/scenes', async (req, res) => {
  const { scriptText } = req.body;
  if (!scriptText) { res.status(400).json({ error: 'Missing scriptText' }); return; }
  try {
    const scenes = await runSceneExtraction(scriptText);
    res.json({ success: true, scenes });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── Scene Architect (场景空间设计) ──
app.post('/api/agent/script/scene-architect', async (req, res) => {
  const { scriptText } = req.body;
  if (!scriptText) { res.status(400).json({ error: 'Missing scriptText' }); return; }
  try {
    const designs = await runSceneArchitect(scriptText);
    res.json({ success: true, designs });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── Prop Designer (道具设计) ──
app.post('/api/agent/script/props', async (req, res) => {
  const { scriptText } = req.body;
  if (!scriptText) { res.status(400).json({ error: 'Missing scriptText' }); return; }
  try {
    const props = await runPropDesigner(scriptText);
    res.json({ success: true, props });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── Sound Composer (声音与音乐 → Suno) ──
app.post('/api/agent/script/sound', async (req, res) => {
  const { scriptText } = req.body;
  if (!scriptText) { res.status(400).json({ error: 'Missing scriptText' }); return; }
  try {
    const result = await runSoundComposer(scriptText);
    res.json({ success: true, soundScenes: result.scenes, sunoPrompts: result.sunoPrompts });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

app.post('/api/agent/script/scene', async (req, res) => {
  req.setTimeout(600000); // 10 min — per-scene pipeline
  const { scene, scriptExcerpt, visualBible, characterProfiles } = req.body;
  if (!scene && !scriptExcerpt) { res.status(400).json({ error: 'Missing scene data' }); return; }
  try {
    const result = await runAgentPipeline({ userInput: scriptExcerpt || scene.summary || '', model: 'text', mode: 'script-analysis' });
    const shots = parseShotBlocks(result.fullPromptOutput || result.storyboard);
    res.json({ success: true, shots });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ─── Kie.ai Callback ──────────────────────────
app.post('/api/kie-callback', (req, res) => {
  console.log('[kie-callback] Received:', JSON.stringify(req.body).slice(0, 300));
  res.json({ code: 200, msg: 'ok' });
});

// ─── Kie.ai Suno Callback ─────────────────────
const sunoCallbacks = new Map<string, any>();
app.post('/api/kie/suno-callback', (req, res) => {
  console.log('[suno-callback] Received:', JSON.stringify(req.body).slice(0, 500));
  const taskId = req.body?.taskId || req.body?.data?.taskId || '';
  if (taskId) {
    sunoCallbacks.set(taskId, { data: req.body, receivedAt: Date.now() });
    console.log('[suno-callback] Stored result for taskId:', taskId);
  }
  res.json({ received: true });
});
// Poll endpoint — frontend can check callback results
app.get('/api/kie/suno-callback/:taskId', (req, res) => {
  const data = sunoCallbacks.get(req.params.taskId);
  if (!data) { res.json({ ready: false }); return; }
  res.json({ ready: true, data: data.data });
});

// ─── Download ────────────────────────────────
app.get('/api/download', handleDownload);

// ─── Visual Extraction Agent ──────────────────
import { parseVisualIntent, detectExtractionIntent, type ExtractMode } from './systems/agent/visual-parser.js';

app.post('/api/agent/visual-extract', async (req: Request, res: Response) => {
  console.log('[visual-extract] ===== ROUTE HIT =====');
  const body = req.body as AgentGenerateRequest;
  if (!body.providerId) { res.status(400).json({ error: 'Missing providerId' }); return; }

  // Collect all image sources: @mention refs + uploaded primary image
  const refUrls = (body as any).referenceUrls as string[] | undefined;
  const primaryImage = body.referenceImage as string | undefined;
  const allRefUrls: string[] = [...(refUrls || [])];
  if (primaryImage && !allRefUrls.includes(primaryImage)) {
    allRefUrls.push(primaryImage);
  }
  if (!allRefUrls.length) {
    // No image sources at all → fallback to normal generate
    console.log('[visual-extract] No image sources, redirecting to /api/agent/generate');
    try {
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

  // Camera kit
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

  console.log('[visual-extract] mode=' + extractMode + ' refs=' + allRefUrls.length + ' prompt=' + userPrompt.slice(0, 80));

  // Run visual parser
  const parsed = await parseVisualIntent(enrichedPrompt, allRefUrls, extractMode as ExtractMode);

  if (!parsed) {
    // GPT-5.4 failed (kie.ai transient error) → fallback to local I2I compile, no extra HTTP hop
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

  // Apply camera kit to compiled prompt
  if (camBlock && compiledPrompt) {
    compiledPrompt = camBlock + compiledPrompt;
  }

  console.log('[visual-extract] Generate: ' + body.providerId + ' prompt=' + compiledPrompt.slice(0, 100) + ' (len=' + compiledPrompt.length + ')');
  const t0 = Date.now();

  const i2iNegPrompt = 'blurry, low quality, distorted, deformed, watermark, text, logo, extra limbs, extra fingers, fused body, extra props, weapon, object not in prompt, hallucinated item, extra person, clutter, fabricated details';

  const result: GenerateResult = await handler({
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
    genMode: (body as any).genMode,
    firstFrameUrl: (body as any).firstFrameUrl,
    lastFrameUrl: (body as any).lastFrameUrl,
    characterOrientation: (body as any).characterOrientation,
    keepOriginalSound: (body as any).keepOriginalSound,
    fixedCamera: (body as any).fixedCamera,
    generateAudio: (body as any).generateAudio,
    webSearch: (body as any).webSearch,
    instrumental: (body as any).instrumental as boolean | undefined,
    lyrics: (body as any).lyrics as string | undefined,
  });
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
    { field: 'extractTarget', contribution: parsed.intent.extractTarget },
    { field: 'preserve', contribution: parsed.intent.preserve.join(', ') },
    { field: 'remove', contribution: parsed.intent.remove.join(', ') },
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
server.timeout = 0;           // 禁用空闲超时，允许长请求（kie.ai 生成需要 5-10 分钟无数据传输）
server.requestTimeout = 0;    // 禁用请求体超时
server.headersTimeout = 0;    // 禁用请求头超时
server.keepAliveTimeout = 0;  // 禁用 keep-alive 超时

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
