/* === TapNow Canvas API Server === */
import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { readJSON, writeJSON } from './systems/db/store.js';
import { v4 as uuid } from 'uuid';

import { KEY_LABELS, getProfile, updateProfile, loadKeys, persistKey, getHiddenKeys, hideKeySlot, restoreKeySlot } from './config.js';
import { submitTask, checkTask, downloadModel as downloadTripoModel, checkRig, submitRig, retargetAnimation } from './systems/ai/tripo-provider.js';
import { authMiddleware } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import kimodoRouter from './routes/kimodo.js';
import { getProvider, listProviders } from './systems/ai/registry.js';
import { qRouter } from './systems/q/q-api.js';
import { trackCanvasSync, captureScriptAnalysis } from './systems/q/q-observer.js';
import { detectDeviations } from './systems/q/q-detector.js';
import { getOrCreateProject } from './systems/q/q-state.js';
import { onPipelineComplete, onIntervalCheck } from './systems/q/q-cognitive-engine.js';
import { periodicSuggest } from './systems/q/q-suggest.js';
import { detectAndRoute } from './systems/q/q-orchestrate.js';
import { qMemory } from './systems/q/q-memory.js';
import { withKieLimit } from './systems/ai/kie-provider.js';
import { compilePrompt } from './systems/agent/compiler.js';
import { buildCamBlock } from './systems/agent/camera-kit-mappings.js';
import { runAgentPipeline, runTextPipeline, runUnifiedPipeline, analyzeReferenceImages, compileI2IWithGPT5, parseShotBlocks } from './systems/agent/pipeline.js';
import { gpt5Chat } from './systems/ai/gemini.js';
import { compileVideoPrompt } from './systems/agent/video-analyzer.js';
import { pollStoredTask, initVideoTask, uploadDataUrl } from './systems/ai/kie-provider.js';
import { addLog, getLogs } from './systems/task/manager.js';
import { handleDownload } from './systems/file/download.js';
import { cacheGenerationResult } from './systems/file/asset-cache.js';
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
// BVH static files must be before /api/models catch-all (Express route ordering)
const bvhDir = path.join(process.cwd(), 'data', 'bvh');
app.use('/api/models/bvh', express.static(bvhDir, { fallthrough: false }));
app.use('/api/models', express.static(MODELS_DIR, { fallthrough: false }));

// ─── Local asset output (generated images/videos/audio cached from CDN) ──
const OUTPUT_DIR = path.join(process.cwd(), 'server', 'data', 'output');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
app.use('/api/output', express.static(OUTPUT_DIR, { fallthrough: false }));

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
    // Single query — frontend handles the polling interval
    const result = await checkTask(req.params.taskId);
    res.json(result);
  } catch (e: any) { res.status(400).json({ success: false, error: e.message }); }
});

// SSE stream — server polls Tripo3D once per task, pushes to all connected clients
app.get('/api/tripo/task/:taskId/stream', (req, res) => {
  const taskId = req.params.taskId;
  const POLL_INTERVAL = 5000;
  const TIMEOUT_MS = 900_000; // 15 min

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Initial heartbeat
  res.write(`: ok\n\n`);

  let closed = false;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;

  const cleanup = () => {
    closed = true;
    if (pollTimer) { clearTimeout(pollTimer); pollTimer = null; }
  };

  // Hard timeout — stop polling after 15 min
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
      // Continue polling
      pollTimer = setTimeout(poll, POLL_INTERVAL);
    } catch (e: any) {
      if (closed) return;
      // Transient error → retry next interval
      try { res.write(`data: ${JSON.stringify({ status: 'polling', error: e.message })}\n\n`); } catch {}
      pollTimer = setTimeout(poll, POLL_INTERVAL);
    }
  };

  // Start
  poll();

  // Client disconnect
  req.on('close', () => {
    clearTimeout(hardTimeout);
    cleanup();
  });
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
    const proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    const fetchOpts: any = { headers: { 'User-Agent': 'TapNow/1.0' } };
    // Use proxy for CDN downloads if configured (faster in China)
    if (proxy) {
      try {
        const { ProxyAgent } = await import('undici');
        fetchOpts.dispatcher = new ProxyAgent(proxy);
      } catch {}
    }

    const fetchResp = await fetch(url, fetchOpts);
    if (!fetchResp.ok) { res.status(502).json({ error: `Upstream fetch failed: ${fetchResp.status}` }); return; }

    const contentLength = fetchResp.headers.get('content-length');
    const contentType = fetchResp.headers.get('content-type') || 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    // Stream CDN → browser (no buffering — bytes flow as they arrive)
    if (fetchResp.body) {
      const reader = fetchResp.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: String(err) });
    else res.end();
  }
}

app.use('/api/auth', authRouter);
app.use('/api/kimodo', kimodoRouter);

app.use(authMiddleware);

// ─── Image Analysis Cache ──────────────────────
// Persistent vision cache — survives server restarts so images aren't re-analyzed
const VISION_CACHE_FILE = 'data/vision-cache.json';
const imageCache: Map<string, string> = new Map(Object.entries((readJSON(VISION_CACHE_FILE) as Record<string, string>) || {}));
console.log('[vision-cache] Loaded ' + imageCache.size + ' cached analyses from disk');
let lastCompiled: any = null; // last compiled prompt for debugging

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

// ── Script task persistence ──
const SCRIPT_TASKS_FILE = 'data/script-tasks.json';
function loadScriptTasks(): Map<string, any> {
  const raw = readJSON(SCRIPT_TASKS_FILE) as Record<string, any> | null;
  const map = new Map<string, any>();
  if (raw && raw.tasks) {
    let staleCount = 0;
    for (const [id, t] of Object.entries(raw.tasks)) {
      // Tasks that were "processing" when the server went down are now lost
      if (t.status === 'processing') {
        map.set(id, { ...t, status: 'lost', error: 'Server restarted while task was in progress' });
        staleCount++;
      } else {
        map.set(id, { ...t, createdAt: t.createdAt || Date.now() });
      }
    }
    console.log(`[script-tasks] Loaded ${map.size} persisted tasks (${staleCount} marked lost)`);
  }
  return map;
}
function saveScriptTasks() {
  const obj: Record<string, any> = {};
  for (const [id, t] of scriptTasks) {
    obj[id] = { status: t.status, result: t.result, error: t.error, createdAt: t.createdAt };
  }
  writeJSON(SCRIPT_TASKS_FILE, { tasks: obj, updatedAt: new Date().toISOString() });
}

// ── Canvas backup: keep last 20 timestamped snapshots ──
const BACKUP_DIR = 'data/backups';
function rotateBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.startsWith('canvas-') && f.endsWith('.json'));
    if (files.length >= 20) {
      files.sort(); // alphabetical = chronological (ISO timestamps)
      for (let i = 0; i < files.length - 19; i++) {
        try { fs.unlinkSync(path.join(BACKUP_DIR, files[i])); } catch {}
      }
    }
  } catch {}
}
app.post('/api/canvas/sync', (req, res) => {
  canvasState = { nodes: req.body.nodes || [], edges: req.body.edges || [], updatedAt: new Date().toISOString() };
  // Backup old state before overwriting — prevents accidental data loss
  if (fs.existsSync(CANVAS_FILE)) {
    try { fs.copyFileSync(CANVAS_FILE, CANVAS_FILE + '.bak'); } catch {}
  }
  try {
    rotateBackups();
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    fs.copyFileSync(CANVAS_FILE, path.join(BACKUP_DIR, `canvas-${ts}.json`));
  } catch {}
  writeJSON(CANVAS_FILE, canvasState);
  console.log(`[canvas] Synced: ${canvasState.nodes.length} nodes, ${canvasState.edges.length} edges → disk`);
  // 小Q: track canvas changes + auto-orchestration
  try { trackCanvasSync('default', canvasState.nodes.length); } catch {}
  try {
    detectAndRoute(canvasState.nodes, 'default', {
      autoExecute: process.env.Q_AUTO_EXECUTE === 'true',
    });
  } catch {}
  res.json({ ok: true });
});
app.get('/api/canvas/state', (_req, res) => {
  res.json({
    nodes: canvasState.nodes || [],
    edges: canvasState.edges || [],
    updatedAt: canvasState.updatedAt,
  });
});

// ─── File Upload (data URL → public URL) ──────
app.post('/api/upload', async (req, res) => {
  try {
    const { dataUrl } = req.body;
    if (!dataUrl || typeof dataUrl !== 'string') return res.status(400).json({ error: 'Missing dataUrl' });
    const url = await uploadDataUrl(dataUrl);
    if (!url) return res.status(500).json({ error: 'Upload to catbox failed' });
    res.json({ url });
  } catch (e: any) {
    res.status(500).json({ error: String(e).slice(0, 200) });
  }
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
    // 小Q: Pre-flight memory recall (non-blocking log only)
    try {
      const memories = qMemory.recall(scriptText.slice(0, 200), { projectId: 'default' });
      if (memories.length > 0) {
        console.log('[q-hook:full] Recalled', memories.length, 'memories before full pipeline');
      }
    } catch { /* Q hook failure must never block pipeline */ }

    const pipelineResult = await runUnifiedPipeline(scriptText, visualStyle);
    // 小Q: capture script analysis
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

app.post('/api/agent/generate', async (req: Request, res: Response) => {
  const body = req.body as AgentGenerateRequest;
  if (!body.providerId) { res.status(400).json({ error: 'Missing providerId' }); return; }
  console.log('[agent] providerId received:', body.providerId, 'model:', (body as any).model, 'mode:', body.mode);

  // 小Q: Pre-flight context enrichment (non-blocking — fire-and-forget)
  try {
    const projectId = (body as any).projectId || 'default';
    const memories = qMemory.recall(userPrompt || (body as any).rawText || '', { projectId });
    if (memories.length > 0) {
      console.log('[q-hook:generate] Recalled', memories.length, 'relevant memories');
    }
  } catch { /* Q hook failure must never block generation */ }

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
  // Camera/Lens/Film → visual description via shared module
  const camBlock = buildCamBlock({ camera: cam, lens, focalLength: focal, aperture: apt, filmStock: film });
  // Camera block deliberately excluded from enrichedPrompt — it's prepended
  // once to the final compiledPrompt below. Including it caused double-prepend
  // when GPT translates (Chinese→English): guard `compiledPrompt !== enrichedPrompt`
  // always passes for translated output → "[Camera: ...] [Camera: ...] rest".
  const enrichedPrompt = userPrompt;

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

    // Upload local reference files to public hosting — kie.ai can't access localhost
    const uploadLocalRef = async (u: string): Promise<string | null> => {
      if (!u) return null;
      if (u.startsWith('http://') || u.startsWith('https://')) return u;
      // Map /api/output/... → disk file
      let filePath: string;
      if (u.startsWith('/api/output/')) {
        filePath = path.join(OUTPUT_DIR, u.replace('/api/output/', ''));
      } else if (u.startsWith('/')) {
        filePath = u; // absolute disk path
      } else {
        console.log('[agent] Cannot resolve ref URL: ' + u.slice(0, 80));
        return null;
      }
      try {
        if (!fs.existsSync(filePath)) { console.log('[agent] Ref file not found: ' + filePath); return null; }
        const buf = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();
        const mime = ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : ext === '.webm' ? 'video/webm' : ext === '.mp4' ? 'video/mp4' : 'application/octet-stream';
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

    // Submit to Kie — passes image/video URLs directly so Seedance can analyze them
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
      genMode: (body as any).genMode,
      firstFrameUrl: resolvedFirstFrame, lastFrameUrl: resolvedLastFrame,
      characterOrientation: (body as any).characterOrientation,
      keepOriginalSound: (body as any).keepOriginalSound,
      fixedCamera: (body as any).fixedCamera,
      generateAudio: (body as any).generateAudio,
      webSearch: (body as any).webSearch,
      clientTaskId,
    }) );
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
      // T2I: Send prompt directly to kie.ai — no translation.
      // User verified Chinese prompts produce correct layouts in playground.
      compiledPrompt = enrichedPrompt;
    }
  } else {
    compiledPrompt = enrichedPrompt;
    // If reference images exist, analyze them with Gemini Vision and merge into prompt
    const refUrls = (body as any).referenceUrls as string[] | undefined;
    if (refUrls && refUrls.length > 0) {
      // First, map each @mention to a reference URL by order of appearance
      const orderedMentions: string[] = [];
      const mentionPattern = /@(\S+)/g;  // match @word only — do NOT swallow trailing text
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
        console.log('[agent] Vision merged, prompt length:', compiledPrompt.length);
    }
  }
  // Safety: ensure compiledPrompt is never empty
  if (!compiledPrompt || compiledPrompt.trim().length === 0) {
    compiledPrompt = userPrompt || body.rawText || 'generate an image';
    console.log('[agent] WARNING: compiledPrompt was empty, using fallback: ' + compiledPrompt.slice(0, 80));
  }
  // Camera kit prepended once (enrichedPrompt no longer includes camBlock,
  // so there's no risk of double-prepend regardless of translation path)
  if (camBlock && compiledPrompt) {
    compiledPrompt = camBlock + compiledPrompt;
  }

  console.log('[agent] Generate: ' + body.providerId + ' prompt=' + compiledPrompt.slice(0, 100) + ' (len=' + compiledPrompt.length + ')');
  const t0 = Date.now();
  // I2I negative prompt: NEVER mention face/identity terms — they confuse the model and break identity preservation
  const i2iNegPrompt = body.mode === 'image-to-image'
    ? 'blurry, low quality, distorted, deformed, watermark, text, logo, extra limbs, extra fingers, fused body, extra props, weapon, object not in prompt, hallucinated item, extra person, clutter, fabricated details'
    : 'blurry, low quality, distorted, deformed, watermark, text, logo';
  const result: GenerateResult = await withKieLimit(`generate:${body.providerId}`, () => handler({
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
  }) );
  result.durationMs = Date.now() - t0;
  addLog({
    id: uuid(), timestamp: new Date().toISOString(), providerId: body.providerId,
    prompt: compiledPrompt, compiledPrompt: compiledPrompt,
    status: result.success ? 'succeeded' : 'failed',
    assetUrls: result.assetUrls, cost: result.cost, durationMs: result.durationMs, error: result.error,
  });
  // 小Q: observe generation + detect deviations + cognitive cycle
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
        // Trigger cognitive cycle if violations found
        if (detectionResult && detectionResult.violations > 0) {
          onPipelineComplete('default', shotNumber, {
            total: detectionResult.deviationsFound,
            violations: detectionResult.violations,
          }).catch(() => {});
        }
      }).catch(() => {});
    }
  } catch {}
  // ── Local asset caching ── download external CDN URLs to data/output/
  if (result.success && result.assetUrls.length > 0) {
    try {
      const { localUrls } = await cacheGenerationResult(result.assetUrls);
      result.assetUrls = localUrls;
    } catch {}
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
  // Cache completed assets locally so they survive network changes
  if (result.status === 'succeeded' && result.assetUrls?.length) {
    try {
      const { localUrls } = await cacheGenerationResult(result.assetUrls);
      result.assetUrls = localUrls;
    } catch {}
  }
  res.json(result);
});

app.get('/api/last-compiled', (_req, res) => res.json({ compiled: lastCompiled || { en: '(no generation yet)' }, kieReq: (globalThis as any).__lastKieReq || null, kieResp: (globalThis as any).__lastKieResp || null }));
app.get('/api/agent/logs', (_req, res) => res.json({ logs: getLogs() }));

// ─── Script Analysis ─────────────────────────
import { runCharacterExtraction, runSceneExtraction, runSceneArchitect, runPropDesigner, runSoundComposer, runScriptAnalysis, type ScriptAnalysisResult } from './systems/agent/pipeline.js';

// 异步任务存储：taskId → { status, result }。持久化到磁盘，抗服务重启
const scriptTasks = loadScriptTasks();

// 提交分析任务 → 立即返回 taskId，后台异步处理
app.post('/api/agent/script/overview', async (req, res) => {
  const { scriptText, visualStyle } = req.body;
  if (!scriptText) { res.status(400).json({ error: 'Missing scriptText' }); return; }
  const taskId = uuid();
  scriptTasks.set(taskId, { status: 'processing', createdAt: Date.now() });
  saveScriptTasks();
  console.log('[script-analysis] Task ' + taskId + ' started, scriptLen=' + scriptText.length);
  // 后台异步全管线处理（角色 → 场景+音乐+分镜 并行）
  // 所有结果存入一个 task，前端只轮询一个 taskId 拿到全部结果
  // 统一管线：一次 GPT 调用完成全部 6 项分析（角色/场景/空间/道具/音乐/分镜）
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
      if (task) { task.status = 'done'; task.section = 'overview'; task.result = fullResult; saveScriptTasks(); }

      // 小Q: capture script analysis
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
      if (task) { task.status = 'done'; task.error = String(err); saveScriptTasks(); }
      console.log('[script-analysis] Task ' + taskId + ' failed:', String(err).slice(0, 200));
    }
  })();
  res.json({ taskId, status: 'processing' });
});

// 轮询任务结果
app.get('/api/agent/script/result/:taskId', (req, res) => {
  const task = scriptTasks.get(req.params.taskId);
  if (!task) { res.status(404).json({ error: 'Task not found', status: 'lost' }); return; }
  if (task.status === 'processing') { res.json({ status: 'processing' }); return; }
  if (task.status === 'lost') { res.json({ status: 'lost', error: task.error || 'Task was interrupted by server restart' }); return; }
  const r = task.result;
  res.json({
    status: 'done',
    success: !task.error,
    section: task.section || 'overview',  // null for old overview tasks, 'music'/'characters'/etc for individual regen
    // Storyboard (shots)
    shots: r?.storyboard?.shots || [],
    characterProfiles: r?.characters || {},
    rawOutput: r?.storyboard?.rawOutput || '',
    durationMs: r?.storyboard?.durationMs || 0,
    // Scenes
    scenes: r?.scenes || {},
    sceneArchitecture: r?.sceneArchitecture || {},
    // Music / Sound
    sunoPrompts: r?.soundResult?.sunoPrompts || {},
    soundScenes: r?.soundResult?.scenes || {},
    error: task.error,
  });
});

// 清理过期任务（每 30 分钟清一次）
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  let deleted = 0;
  for (const [id, t] of scriptTasks) { if (t.createdAt < cutoff) { scriptTasks.delete(id); deleted++; } }
  if (deleted > 0) { saveScriptTasks(); console.log(`[script-tasks] Cleaned ${deleted} expired tasks`); }
}, 600_000);

// 小Q: periodic cognitive check + suggestions (every 5 min)
setInterval(() => {
  onIntervalCheck('default').catch(() => {});
  periodicSuggest('default');
}, 300_000);

app.post('/api/agent/script/characters', async (req, res) => {
  const { scriptText, visualStyle, userFeedback, existingContent } = req.body;
  if (!scriptText) { res.status(400).json({ error: 'Missing scriptText' }); return; }
  const taskId = uuid();
  scriptTasks.set(taskId, { status: 'processing', createdAt: Date.now() });
  saveScriptTasks();
  console.log('[char-async] Task ' + taskId + ' started, feedback=' + !!userFeedback);

  const TIMEOUT_MS = 600_000; // 10 min
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
        saveScriptTasks();
      }
      console.log('[char-async] Task ' + taskId + ' done, chars=' + Object.keys(result).length);
    } catch (err) {
      const task = scriptTasks.get(taskId);
      if (task) { task.status = 'done'; task.error = String(err); saveScriptTasks(); }
      console.log('[char-async] Task ' + taskId + ' failed:', String(err).slice(0, 200));
    }
  })();
  res.json({ taskId, status: 'processing' });
});

app.post('/api/agent/script/scenes', async (req, res) => {
  const { scriptText, userFeedback, existingContent } = req.body;
  if (!scriptText) { res.status(400).json({ error: 'Missing scriptText' }); return; }
  const taskId = uuid();
  scriptTasks.set(taskId, { status: 'processing', createdAt: Date.now() });
  saveScriptTasks();
  console.log('[scene-async] Task ' + taskId + ' started, feedback=' + !!userFeedback);

  const TIMEOUT_MS = 600_000; // 10 min
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
        saveScriptTasks();
      }
      console.log('[scene-async] Task ' + taskId + ' done, scenes=' + Object.keys(scenes).length);
    } catch (err) {
      const task = scriptTasks.get(taskId);
      if (task) { task.status = 'done'; task.error = String(err); saveScriptTasks(); }
      console.log('[scene-async] Task ' + taskId + ' failed:', String(err).slice(0, 200));
    }
  })();
  res.json({ taskId, status: 'processing' });
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

// ─── Regenerate individual section with user feedback (async, task-based) ──
app.post('/api/agent/script/regenerate', async (req, res) => {
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
  saveScriptTasks();
  console.log(`[regenerate] Task ${taskId} section=${section} feedback=${(userFeedback || '').slice(0, 80)}`);

  const TIMEOUT_MS = 600_000; // 10 min
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
      if (task) { task.status = 'done'; task.result = result; saveScriptTasks(); }
      console.log(`[regenerate] Task ${taskId} done, section=${section}`);
    } catch (err) {
      const task = scriptTasks.get(taskId);
      if (task) { task.status = 'done'; task.error = String(err); saveScriptTasks(); }
      console.log(`[regenerate] Task ${taskId} failed:`, String(err).slice(0, 200));
    }
  })();

  res.json({ taskId, status: 'processing' });
});

// ─── Music-only async regeneration (task-based, survives refresh) ──
app.post('/api/agent/script/music', async (req, res) => {
  const { scriptText, userFeedback, existingMusic } = req.body;
  if (!scriptText) { res.status(400).json({ error: 'Missing scriptText' }); return; }
  const taskId = uuid();
  const existingMusicContent = existingMusic ? JSON.stringify(existingMusic) : undefined;
  scriptTasks.set(taskId, { status: 'processing', createdAt: Date.now() });
  saveScriptTasks();
  console.log('[music-regen] Task ' + taskId + ' started, feedback=' + (userFeedback || '').slice(0, 60));

  const MASTER_TIMEOUT_MS = 600_000; // 10 min
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
        saveScriptTasks();
      }
      console.log('[music-regen] Task ' + taskId + ' done, music=' + Object.keys(result.sunoPrompts).length);
    } catch (err) {
      const task = scriptTasks.get(taskId);
      if (task) { task.status = 'done'; task.error = String(err); saveScriptTasks(); }
      console.log('[music-regen] Task ' + taskId + ' failed:', String(err).slice(0, 200));
    }
  })();
  res.json({ taskId, status: 'processing' });
});

// ─── Supplement: run characters + scenes + music in parallel, skip storyboard ──
app.post('/api/agent/script/supplement', async (req, res) => {
  const { scriptText, visualStyle, nodeId } = req.body;
  if (!scriptText) { res.status(400).json({ error: 'Missing scriptText' }); return; }

  const taskId = uuid();
  scriptTasks.set(taskId, { status: 'processing', createdAt: Date.now() });
  saveScriptTasks();
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
        task.section = 'supplement';  // 不覆盖已有分镜
        task.result = {
          characters: chars,
          scenes: scenes,
          sceneArchitecture: {},
          soundResult: music,
          storyboard: { shots: [], rawOutput: '', durationMs: 0 },
        };
        saveScriptTasks();
      }
      console.log('[supplement] Task ' + taskId + ' done in ' + (Date.now() - t0) + 'ms, chars=' + Object.keys(chars).length + ' scenes=' + Object.keys(scenes).length + ' music=' + Object.keys(music.sunoPrompts || {}).length);

      // Write to canvas node if nodeId provided
      if (nodeId) {
        try {
          const { readJSON, writeJSON } = await import('./systems/db/store.js');
          const canvasState = readJSON('canvas-state');
          const node = canvasState.nodes?.find((n: any) => n.id === nodeId);
          if (node) {
            if (!node.meta) node.meta = {};
            if (!node.meta.gen) node.meta.gen = {};
            if (chars) node.meta.gen.scriptCharacters = chars;
            if (scenes) node.meta.gen.scriptScenes = scenes;
            if (music?.sunoPrompts) node.meta.gen.scriptSunoPrompts = music.sunoPrompts;
            if (music?.scenes) node.meta.gen.scriptSoundScenes = music.scenes;
            writeJSON('canvas-state', canvasState);
          }
        } catch (e) { console.warn('[supplement] Canvas write failed:', e); }
      }
    } catch (err) {
      const task = scriptTasks.get(taskId);
      if (task) { task.status = 'done'; task.error = String(err); saveScriptTasks(); }
      console.log('[supplement] Task ' + taskId + ' failed:', String(err).slice(0, 200));
    }
  })();
  res.json({ taskId, status: 'processing' });
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
  // Camera/Lens/Film → visual description via shared module
  const camBlock = buildCamBlock({ camera: cam, lens, focalLength: focal, aperture: apt, filmStock: film });
  const enrichedPrompt = userPrompt;  // camBlock not included — prepended once below

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
  }) );
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

// ─── 小Q Brain API ────────────────────────
app.use('/api/q', qRouter);

import { createProxyMiddleware } from 'http-proxy-middleware';

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
  filter: (pathname: string) => !pathname.startsWith('/api/') && !pathname.startsWith('/admin/'),
}));

// Create HTTP server explicitly for WebSocket upgrade proxying
import http from 'node:http';
const server = http.createServer(app);
server.timeout = 0;           // 禁用空闲超时，允许长请求（kie.ai 生成需要 5-10 分钟无数据传输）
server.requestTimeout = 0;    // 禁用请求体超时
server.headersTimeout = 0;    // 禁用请求头超时
server.keepAliveTimeout = 0;  // 禁用 keep-alive 超时

// Auto-start Kimodo motion server (runs `python -m uvicorn server:app` on port 8000)
import { startKimodo } from './systems/kimodo-launcher.js';
startKimodo().then(ok => {
  console.log(ok ? '[kimodo-launcher] ✅ Kimodo ready' : '[kimodo-launcher] ⚠️ Kimodo unavailable — motion generation disabled');
});

server.listen(PORT, () => {
  console.log(`[server] TapNow API → http://localhost:${PORT}`);
  console.log(`[server] Admin → http://localhost:${PORT}/admin`);
});
