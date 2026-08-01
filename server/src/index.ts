/* === TapNow Canvas API Server === */
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// ── Load .env from project root regardless of cwd ──
// npm run dev:server does "cd server && tsx src/index.ts", so process.cwd()
// would be server/ — dotenv would search the wrong directory.
const __rootdir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
dotenv.config({ path: path.join(__rootdir, '.env') });

import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuid } from 'uuid';

import { KEY_LABELS, getProfile, updateProfile, loadKeys, persistKey, getHiddenKeys, hideKeySlot, restoreKeySlot } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import authRouter from './routes/auth.js';
import kimodoRouter from './routes/kimodo.js';
import kimodoV2Router from './routes/kimodo-v2.js';
import canvasRouter from './routes/canvas.js';
import agentRouter from './routes/agent.js';
import outputRouter from './routes/output.js';
import { qRouter } from './systems/q/q-api.js';
import type { KeyStatus } from '../../shared/api-types.js';

// Canvas state (startup)
import { readProjectState, projectStateCache, migrateLegacyCanvas, getProjectFile, writeProjectState } from './systems/db/canvas-store.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ─── Middleware ──────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', methods: ['GET','POST','PUT','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '50mb' }));

// ─── Public routes (no auth needed) ──────────────
// Image proxy — loaded via <img> tag, can't send auth headers
async function proxyAsset(req: Request, res: Response) {
  const url = req.query.url as string;
  if (!url) { res.status(400).json({ error: 'Missing url' }); return; }
  try {
    const proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    const fetchOpts: any = { headers: { 'User-Agent': 'TapNow/1.0' } };
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
app.get('/api/proxy-image', async (req, res) => proxyAsset(req, res));
app.get('/api/proxy-video', async (req, res) => proxyAsset(req, res));

// ─── Model storage — save to disk, serve statically ──
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
const MODELS_DIR = path.join(__rootdir, 'data', 'models');
fs.mkdirSync(MODELS_DIR, { recursive: true });
const upload = multer({ storage: multer.diskStorage({
  destination: MODELS_DIR,
  filename: (_req, file, cb) => { const ext = path.extname(file.originalname); cb(null, Date.now() + '_' + Math.random().toString(36).slice(2,8) + ext); }
}), limits: { fileSize: 200 * 1024 * 1024 } });
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
const bvhDir = path.join(__rootdir, 'data', 'bvh');
app.use('/api/models/bvh', express.static(bvhDir, { fallthrough: false }));
app.use('/api/models', express.static(MODELS_DIR, { fallthrough: false }));

// ─── Local asset output (generated images/videos/audio cached from CDN) ──
const OUTPUT_DIR = path.join(__rootdir, 'server', 'data', 'output');
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
app.use('/api/output', express.static(OUTPUT_DIR, { fallthrough: false }));

// ─── Public upload (called during drag-drop, no auth headers sent) ──
// Saves images locally — same pattern as 3D model upload at /api/models/upload.
// Content-addressed (SHA256) for natural dedup. Served via existing /api/output static.
import crypto from 'node:crypto';
app.post('/api/upload', async (req, res) => {
  try {
    const { dataUrl } = req.body;
    if (!dataUrl || typeof dataUrl !== 'string') { res.status(400).json({ error: 'Missing dataUrl' }); return; }

    // Parse data URL
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx < 0) { res.status(400).json({ error: 'Invalid data URL format' }); return; }
    const header = dataUrl.slice(0, commaIdx);
    const mimeMatch = header.match(/data:([^;]+)/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/png';
    const extMap: Record<string, string> = {
      'image/png': '.png', 'image/jpeg': '.jpg', 'image/webp': '.webp',
      'image/gif': '.gif', 'image/svg+xml': '.svg', 'image/bmp': '.bmp',
    };
    const ext = extMap[mime] || '.png';
    const b64 = dataUrl.slice(commaIdx + 1);
    const buf = Buffer.from(b64, 'base64');

    // Content-addressed filename → natural dedup
    const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);
    const fname = `${hash}${ext}`;
    const uploadsDir = path.join(OUTPUT_DIR, 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filePath = path.join(uploadsDir, fname);

    // Dedup: only write if not already on disk
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, buf);
    }

    const url = `/api/output/uploads/${fname}`;
    console.log(`[upload] ${(buf.length / 1024).toFixed(1)}KB → ${url}`);
    res.json({ url });
  } catch (e: any) {
    res.status(500).json({ error: String(e).slice(0, 200) });
  }
});

// ─── Public routers (no auth) ────────────────────
app.use('/api/auth', authRouter);
app.use('/api/kimodo', kimodoRouter);
app.use('/api/kimodo-v2', kimodoV2Router);

// ─── Diagnostics: receive frontend data-loading failure reports ──
// Public (no auth) — only receives structured failure events, no PII
app.post('/api/diag/report', (req: Request, res: Response) => {
  const { category, severity, message, detail, ts } = req.body || {};
  const emoji = severity === 'error' ? '🔴' : '🟡';
  const detailStr = detail ? ` | ${String(detail).slice(0, 200)}` : '';
  console.log(`[diag] ${emoji} [${category || 'unknown'}] ${message || '(no message)'}${detailStr}`);
  res.json({ ok: true });
});

// ─── Auth wall (everything below requires auth) ──
app.use(authMiddleware);

// ─── Health ──────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Canvas routes ───────────────────────────────
app.use('/api/canvas', canvasRouter);

// ─── Agent / Generation / Script / Tripo routes ──
app.use('/api', agentRouter);

// ─── Output / Upload routes ──────────────────────
app.use('/api', outputRouter);

// ─── Keys ────────────────────────────────────────
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

// ─── Agent Config ────────────────────────────────
app.get('/api/agent/config', (_req, res) => res.json(getProfile()));

app.put('/api/agent/config', (req, res) => {
  const allowed = ['name','avatar','translationStyle','defaultModel','defaultResolution','promptEnhancement','systemPrompt','polishPrompt'];
  const patch: Record<string, unknown> = {};
  for (const k of allowed) if (k in req.body) patch[k] = (req.body as any)[k];
  res.json(updateProfile(patch));
});

// ─── 小Q Brain API ───────────────────────────────
app.use('/api/q', qRouter);

// ─── Serve static files ──────────────────────────
import { createProxyMiddleware } from 'http-proxy-middleware';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use('/admin', express.static(path.join(__dirname, '../../admin'), {
  setHeaders: (res) => { res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate'); }
}));
// Proxy to Vite dev server (localhost:5173)
// proxyTimeout: 0 + timeout: 0 = never drop idle WebSocket (defaults are 30s, kills HMR)
app.use('/', createProxyMiddleware({
  target: 'http://127.0.0.1:5173',
  changeOrigin: true,
  ws: true,
  proxyTimeout: 0,
  timeout: 0,
  filter: (pathname: string) => !pathname.startsWith('/api/') && !pathname.startsWith('/admin/'),
}));

// Create HTTP server explicitly for WebSocket upgrade proxying
import http from 'node:http';
const server = http.createServer(app);
server.timeout = 0;
server.requestTimeout = 0;
server.headersTimeout = 0;
server.keepAliveTimeout = 0;

// Auto-start Kimodo motion server
import { startKimodo } from './systems/kimodo-launcher.js';
startKimodo().then(ok => {
  console.log(ok ? '[kimodo-launcher] ✅ Kimodo ready' : '[kimodo-launcher] ⚠️ Kimodo unavailable — motion generation disabled');
});

// ─── Startup ─────────────────────────────────────
loadKeys(); // Restore persisted API keys

// Migrate legacy canvas to multi-project
migrateLegacyCanvas();

// Ensure default project exists
if (!fs.existsSync(getProjectFile('default'))) {
  writeProjectState('default', { nodes: [], edges: [], updatedAt: new Date().toISOString() });
}

// Warm state cache
const initialState = readProjectState('default');
projectStateCache.set('default', initialState);
console.log(`[canvas] Loaded: ${initialState.nodes?.length||0} nodes (project=default)`);

server.listen(PORT, () => {
  console.log(`[server] TapNow API → http://localhost:${PORT}`);
  console.log(`[server] Admin → http://localhost:${PORT}/admin`);
});
