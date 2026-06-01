/* === TapNow Canvas API Server === */
import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuid } from 'uuid';

import { KEY_LABELS, getProfile, updateProfile, loadKeys, persistKey, getHiddenKeys, hideKeySlot, restoreKeySlot } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { getProvider, listProviders } from './systems/ai/registry.js';
import { compilePrompt } from './systems/agent/compiler.js';
import { addLog, getLogs } from './systems/task/manager.js';
import { handleDownload } from './systems/file/download.js';
import type { KeyStatus, CompileRequest, AgentGenerateRequest, AgentGenerateResult, GenerateResult } from '../../shared/api-types.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

// ─── Middleware ───────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', methods: ['GET','POST','PUT','DELETE'], allowedHeaders: ['Content-Type','Authorization'] }));
app.use(express.json({ limit: '50mb' }));
app.use(authMiddleware);

// ─── Startup ──────────────────────────────────
loadKeys(); // Restore persisted API keys

// ═══════════════════════════════════════════════
// API Routes
// ═══════════════════════════════════════════════

// ─── Health ───────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

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
  res.json({ compiled: await compilePrompt(body.shot, body.rawText) });
});

app.post('/api/agent/generate', async (req: Request, res: Response) => {
  const body = req.body as AgentGenerateRequest;
  if (!body.providerId) { res.status(400).json({ error: 'Missing providerId' }); return; }

  const handler = getProvider(body.providerId);
  if (!handler) { res.status(400).json({ error: `Unknown provider: ${body.providerId}` }); return; }

  const config = getProfile();
  const compiled = await compilePrompt(body.shot, body.rawText);
  console.log(`[agent] Generate: ${body.providerId} "${compiled.en.slice(0,60)}..."`);

  const t0 = Date.now();
  const result: GenerateResult = await handler({
    providerId: body.providerId, mode: body.mode, prompt: compiled.en,
    negativePrompt: compiled.negative, aspect: body.aspect || '16:9',
    resolution: body.resolution || config.defaultResolution,
    referenceImage: body.referenceImage, styleImageUrl: body.styleImageUrl,
  });
  result.durationMs = Date.now() - t0;

  addLog({
    id: uuid(), timestamp: new Date().toISOString(), providerId: body.providerId,
    prompt: compiled.en, compiledPrompt: compiled.en,
    status: result.success ? 'succeeded' : 'failed',
    assetUrls: result.assetUrls, cost: result.cost, durationMs: result.durationMs, error: result.error,
  });

  res.json({ compiled, result } as AgentGenerateResult);
});

app.get('/api/agent/logs', (_req, res) => res.json({ logs: getLogs() }));

// ─── Kie.ai Callback ──────────────────────────
app.post('/api/kie-callback', (req, res) => {
  console.log('[kie-callback] Received:', JSON.stringify(req.body).slice(0, 300));
  res.json({ code: 200, msg: 'ok' });
});

// ─── Download ────────────────────────────────
app.get('/api/download', handleDownload);

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

app.listen(PORT, () => {
  console.log(`[server] TapNow API → http://localhost:${PORT}`);
  console.log(`[server] Admin → http://localhost:${PORT}/admin`);
});
