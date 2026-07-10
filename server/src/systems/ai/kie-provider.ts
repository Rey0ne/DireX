/* === Kie.ai Unified Provider (OpenAI-compatible, Async) === */
/* All generation tasks are asynchronous: submit → poll → get result */

import type { GenerateRequest, GenerateResult } from '../../../../shared/api-types.js';
import { stubGenerate } from './stub.js';
import { execSync } from 'child_process';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const BASE_URL = process.env.KIE_BASE_URL || 'https://api.kie.ai/api/v1';

// ── Concurrency limiter: prevents Kie.ai rate-limiting when >4 tasks fire at once ──
const KIE_MAX_CONCURRENT = 3;
const kieQueue: Array<() => void> = [];
let kieRunning = 0;
function kieAcquire(): Promise<void> {
  if (kieRunning < KIE_MAX_CONCURRENT) { kieRunning++; return Promise.resolve(); }
  return new Promise(resolve => { kieQueue.push(() => { kieRunning++; resolve(); }); });
}
function kieRelease(): void {
  kieRunning--;
  const next = kieQueue.shift();
  if (next) next(); else kieRunning = Math.max(0, kieRunning);
}
export async function withKieLimit<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const t0 = Date.now();
  if (kieQueue.length > 0 || kieRunning >= KIE_MAX_CONCURRENT) {
    console.log(`[kie-limiter] ${label} queued (running=${kieRunning} queued=${kieQueue.length})`);
  }
  await kieAcquire();
  const waitMs = Date.now() - t0;
  if (waitMs > 500) console.log(`[kie-limiter] ${label} waited ${waitMs}ms`);
  try {
    return await fn();
  } finally {
    kieRelease();
  }
}

// Create fetch with proxy support — reads env dynamically
let _proxyAgentClass: any = undefined;
let _proxyAgentLoaded = false;

async function getProxyAgent(): Promise<any> {
  if (_proxyAgentLoaded) return _proxyAgentClass;
  _proxyAgentLoaded = true;
  try {
    const undici = await import("undici");
    _proxyAgentClass = undici.ProxyAgent;
  } catch (e: any) {
    console.log("[kie] undici import failed:", e.message);
  }
  return _proxyAgentClass;
}

async function kieFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
  console.log("[kie] proxy=" + (proxy ? proxy.slice(0,40) : "none"));
  if (proxy) {
    const ProxyAgent = await getProxyAgent();
    if (ProxyAgent) {
      console.log("[kie] using ProxyAgent");
      return fetch(url, { ...options, dispatcher: new ProxyAgent(proxy) } as any);
    }
  }
  return fetch(url, options);
}

// ─── Upload data: URL to public http URL ─────────
async function webmToMp4DataUrl(webmDataUrl: string): Promise<string | null> {
  const b64Idx = webmDataUrl.indexOf(';base64,');
  if (b64Idx < 0) return null;
  try {
    const dir = join(tmpdir(), 'tapnow-convert');
    mkdirSync(dir, { recursive: true });
    const webmPath = join(dir, `input_${Date.now()}.webm`);
    const mp4Path = join(dir, `output_${Date.now()}.mp4`);
    writeFileSync(webmPath, Buffer.from(webmDataUrl.slice(b64Idx + 8), 'base64'));
    execSync(`ffmpeg -y -i "${webmPath}" -c:v libx264 -preset fast -crf 28 -an "${mp4Path}"`, { timeout: 30000, stdio: 'pipe' });
    const mp4Buf = readFileSync(mp4Path);
    const mp4DataUrl = `data:video/mp4;base64,${mp4Buf.toString('base64')}`;
    try { unlinkSync(webmPath); unlinkSync(mp4Path); } catch {}
    return mp4DataUrl;
  } catch (e) {
    console.log('[convert] webm→mp4 failed:', String(e).slice(0, 80));
    return null;
  }
}

export async function uploadDataUrl(dataUrl: string): Promise<string | null> {
  const b64Idx = dataUrl.indexOf(';base64,');
  if (b64Idx < 0) return null;
  const mimeType = dataUrl.slice(5, b64Idx).split(';')[0];  // 'data:' prefix removed
  const b64Data = dataUrl.slice(b64Idx + 8);
  try {
    const buffer = Buffer.from(b64Data, 'base64');
    const ext = mimeType.includes('png')?'png':mimeType.includes('jpeg')||mimeType.includes('jpg')?'jpg':mimeType.includes('webm')?'webm':mimeType.includes('mp4')?'mp4':'webp';
    const boundary = '----TapNow' + Date.now();
    const header = Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="ref.${ext}"\r\nContent-Type: ${mimeType}\r\n\r\n`);
    const footer = Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n--${boundary}\r\nContent-Disposition: form-data; name="time"\r\n\r\n72h\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([header, buffer, footer]);

    const proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 60000);
    const opts: any = {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body,
      signal: controller.signal,
    };
    // Don't use proxy for file uploads (catbox)

    try {
      const resp = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', opts);
      clearTimeout(t);
      if (resp.ok) {
        const url = (await resp.text()).trim();
        if (url.startsWith('https://')) { console.log('[upload] →', url.slice(0, 60)); return url; }
      }
      console.log('[upload] Failed: HTTP', resp.status);
      return null;
    } catch (e: any) {
      clearTimeout(t);
      console.log('[upload] Error:', e.message?.slice(0, 80) || String(e).slice(0, 80));
      return null;
    }
  } catch(e) { console.log('[upload] Error:', String(e).slice(0, 60)); return null; }
}

// ─── Provider → Kie.ai model name ──────────────
function getKieModel(req: GenerateRequest): string {
  const mode = req.mode || 'text-to-image';
  switch (req.providerId) {
    case 'nano-banana': return 'nano-banana-pro';  // 请在 Playground 选 Nano Banana 确认模型名
    case 'gpt-image2':
      return mode === 'image-to-image'
        ? 'gpt-image-2-image-to-image'
        : 'gpt-image-2-text-to-image';
    case 'kling-video': return 'kling-3.0/video';
    case 'seedance-2':  return 'bytedance/seedance-2';
    default: return req.providerId;
  }
}

function getApiKey(): string | undefined {
  return process.env.KIE_API_KEY;
}

// ─── Polling helper ────────────────────────────
async function pollTask(taskId: string, apiKey: string, startTime: number): Promise<GenerateResult> {
  const pollUrl = `${BASE_URL}/jobs/recordInfo?taskId=${taskId}`;
  const maxAttempts = 75; // 75 checks over ~10 min
  const intervalMs = 8000; // 8 seconds between checks
  console.log(`[kie] Polling ${taskId}...`);

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs));

    try {
      const resp = await kieFetch(pollUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      const data = await resp.json().catch(() => ({}));
      // Log first response to debug
      if (i === 0) console.log('[kie] recordInfo HTTP', resp.status, ':', JSON.stringify(data).slice(0, 500));
      if (!resp.ok && !data.data) continue;

      const record = data.data || data;
      const state = record.state || record.status || record.task_status || '';

      if (state === 'fail' || state === 'failed' || state === 'error') {
        const failCode = record.failCode || record.fail_code || '';
        const failMsg = record.failMsg || record.fail_msg || record.error || '';
        const detail = [failCode, failMsg].filter(Boolean).join(': ') || '(no detail)';
        console.error(`[kie] Task ${taskId} FAILED: ${detail}`);
        return { success: false, assetUrls: [], cost: 0, durationMs: Date.now() - startTime, seed: 0, error: `Kie.ai: Generation failed — ${detail}` };
      }
      if (state === 'succeeded' || state === 'completed' || state === 'success' || state === 'SUCCESS' || state === 'done') {
        console.log('[kie] DONE! Full record:', JSON.stringify(record).slice(0, 1000));
        // Parse resultJson or result for image URLs
        let resultData: any = record.resultJson;
        if (typeof resultData === 'string' && resultData) {
          try { resultData = JSON.parse(resultData); } catch { /* raw string */ }
        }
        // Also check other fields
        const resultObj = record.result || resultData || record;
        let urls: string[] =
          resultObj?.resultUrls ||
          resultObj?.images?.map((i: any) => i.url || i) ||
          resultObj?.data?.map((d: any) => d.url || d) ||
          [];
        // Single URL string in result
        if (urls.length === 0 && typeof resultData === 'string' && resultData.startsWith('http')) {
          urls = [resultData];
        }
        console.log(`[kie] ${taskId} done: ${urls.length} assets, state=${state}`);
        return {
          success: urls.length > 0,
          assetUrls: urls,
          cost: (record.creditsConsumed || 18) / 100,
          durationMs: Date.now() - startTime,
          seed: 0,
        };
      }

      if (state === 'failed' || state === 'FAILED' || state === 'error') {
        return {
          success: false, assetUrls: [], cost: 0,
          durationMs: Date.now() - startTime, seed: 0,
          error: record.failMsg || record.failCode || 'Generation failed',
        };
      }

      if (i % 5 === 0) console.log(`[kie] ${taskId} state=${state} (${i + 1}/${maxAttempts})`);

    } catch {
      // Network glitch during polling — retry
    }
  }

  console.log(`[kie] ${taskId} timeout after ${maxAttempts} attempts`);
  return {
    success: false, assetUrls: [], cost: 0,
    durationMs: Date.now() - startTime, seed: 0,
    error: 'Kie.ai: Task timed out',
  };
}

// ─── Async task store (client-side polling for slow generations like video) ──
interface StoredTask {
  clientTaskId: string;
  kieTaskId: string;
  apiKey: string;
  providerId: string;
  status: 'submitted' | 'succeeded' | 'failed';
  compiledPrompt?: string;
  assetUrls?: string[];
  error?: string;
  startTime: number;
  nodeId?: string; // Associated canvas node for auto-update on recovery
}

const taskStore = new Map<string, StoredTask>();

// ── Disk persistence (survives server restart) ──
const TASK_STORE_FILE = 'data/task-store.json';

function loadTaskStore(): void {
  try {
    const { readJSON } = require('../db/store.js');
    const data = readJSON(TASK_STORE_FILE);
    if (data && data.tasks && Array.isArray(data.tasks)) {
      for (const t of data.tasks) {
        if (t.clientTaskId && t.status) {
          taskStore.set(t.clientTaskId, t as StoredTask);
        }
      }
      console.log(`[taskStore] Loaded ${taskStore.size} tasks from disk`);
    }
  } catch { /* file doesn't exist yet — first run */ }
}

function saveTaskStore(): void {
  try {
    const { writeJSON } = require('../db/store.js');
    const tasks = Array.from(taskStore.values());
    writeJSON(TASK_STORE_FILE, { tasks, updatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.warn('[taskStore] Failed to save to disk:', err.message?.slice(0, 80) || err);
  }
}

// Load persisted tasks on module import
loadTaskStore();

// Resume polling for tasks still in 'submitted' status after restart
function resumePendingTasks(): void {
  let pending = 0;
  for (const [clientTaskId, task] of taskStore) {
    if (task.status !== 'submitted') continue;
    if (!task.kieTaskId || !task.apiKey) {
      // Task was initialized but never submitted to Kie — mark as failed
      task.status = 'failed';
      task.error = 'Task lost on server restart (never submitted to Kie)';
      pending++;
      continue;
    }
    pending++;
    // Background polling — don't await, let it complete naturally
    pollStoredTask(clientTaskId).then(result => {
      if (result.status === 'succeeded') {
        console.log(`[taskStore] Resumed task ${clientTaskId.slice(0, 8)} completed after restart`);
      } else if (result.status === 'failed') {
        console.log(`[taskStore] Resumed task ${clientTaskId.slice(0, 8)} failed after restart`);
      } else {
        // Still 'submitted' — pollStoredTask already updated Kie status
        console.log(`[taskStore] Resumed task ${clientTaskId.slice(0, 8)} still processing`);
      }
    }).catch(() => {});
  }
  if (pending > 0) {
    console.log(`[taskStore] Resuming ${pending} pending tasks from previous session`);
    saveTaskStore(); // Save any status changes
  }
}
// Run after a short delay to let the server finish booting
setTimeout(resumePendingTasks, 3000);

export function initVideoTask(clientTaskId: string, providerId: string, nodeId?: string): void {
  taskStore.set(clientTaskId, {
    clientTaskId,
    kieTaskId: '',
    apiKey: '',
    providerId,
    status: 'submitted',
    startTime: Date.now(),
    nodeId,
  });
  saveTaskStore();
  console.log('[taskStore] init ' + clientTaskId + ' (' + providerId + ')' + (nodeId ? ' node=' + nodeId.slice(0, 8) : ''));
}

export function markTaskSubmitted(clientTaskId: string, kieTaskId: string, apiKey: string, compiledPrompt?: string): void {
  const task = taskStore.get(clientTaskId);
  if (!task) { console.error('[taskStore] markTaskSubmitted: unknown ' + clientTaskId); return; }
  task.kieTaskId = kieTaskId;
  task.apiKey = apiKey;
  if (compiledPrompt) task.compiledPrompt = compiledPrompt;
  saveTaskStore();
  console.log('[taskStore] submitted ' + clientTaskId + ' → kie:' + kieTaskId.slice(0, 12));
}

export function markTaskDone(clientTaskId: string, assetUrls: string[]): void {
  const task = taskStore.get(clientTaskId);
  if (!task) { console.error('[taskStore] markTaskDone: unknown ' + clientTaskId); return; }
  task.status = 'succeeded';
  task.assetUrls = assetUrls;
  saveTaskStore();
  console.log('[taskStore] done ' + clientTaskId + ': ' + assetUrls.length + ' assets');
}

export function markTaskFailed(clientTaskId: string, error: string): void {
  const task = taskStore.get(clientTaskId);
  if (!task) { console.error('[taskStore] markTaskFailed: unknown ' + clientTaskId); return; }
  task.status = 'failed';
  task.error = error;
  saveTaskStore();
  console.log('[taskStore] failed ' + clientTaskId + ': ' + error.slice(0, 80));
}

export async function pollStoredTask(clientTaskId: string): Promise<{ status: string; assetUrls?: string[]; compiledPrompt?: string; error?: string }> {
  const task = taskStore.get(clientTaskId);
  if (!task) {
    console.error('[taskStore] poll: unknown ' + clientTaskId);
    return { status: 'failed', error: 'Unknown task ID' };
  }

  if (task.status === 'succeeded') {
    return { status: 'succeeded', assetUrls: task.assetUrls, compiledPrompt: task.compiledPrompt };
  }
  if (task.status === 'failed') {
    return { status: 'failed', error: task.error };
  }

  // Status is 'submitted' — query Kie for current state
  const pollUrl = `${BASE_URL}/jobs/recordInfo?taskId=${task.kieTaskId}`;
  console.log('[taskStore] poll querying Kie: ' + task.kieTaskId.slice(0, 12));

  try {
    const resp = await kieFetch(pollUrl, {
      headers: { Authorization: `Bearer ${task.apiKey}` },
    });

    const data = await resp.json().catch(() => ({}));
    console.log('[taskStore] recordInfo HTTP ' + resp.status + ': ' + JSON.stringify(data).slice(0, 400));

    const record = data.data || data;
    const state = record.state || record.status || record.task_status || '';

    if (state === 'succeeded' || state === 'completed' || state === 'success' || state === 'SUCCESS' || state === 'done') {
      // Extract URLs — same logic as pollTask
      let resultData: any = record.resultJson;
      if (typeof resultData === 'string' && resultData) {
        try { resultData = JSON.parse(resultData); } catch { /* raw string */ }
      }
      const resultObj = record.result || resultData || record;
      let urls: string[] =
        resultObj?.resultUrls ||
        resultObj?.images?.map((i: any) => i.url || i) ||
        resultObj?.data?.map((d: any) => d.url || d) ||
        [];
      if (urls.length === 0 && typeof resultData === 'string' && resultData.startsWith('http')) {
        urls = [resultData];
      }
      // Check for video-specific URL fields
      if (urls.length === 0) {
        urls = resultObj?.video_url || resultObj?.video_urls || resultObj?.output_url || resultObj?.url
          ? [resultObj?.video_url || resultObj?.video_urls || resultObj?.output_url || resultObj?.url].flat()
          : [];
      }
      // Log full record for debugging
      if (urls.length === 0) {
        console.log('[taskStore] WARNING: No URLs found. Full record:', JSON.stringify(record).slice(0, 2000));
      }
      markTaskDone(clientTaskId, urls);
      return { status: 'succeeded', assetUrls: urls, compiledPrompt: task.compiledPrompt };
    }

    if (state === 'fail' || state === 'failed' || state === 'FAILED' || state === 'error') {
      const errMsg = record.failMsg || record.failCode || record.error || 'Generation failed';
      markTaskFailed(clientTaskId, errMsg);
      return { status: 'failed', error: errMsg };
    }

    // Still processing — return current state
    console.log('[taskStore] ' + clientTaskId + ' state=' + state + ' (still waiting)');
    return { status: 'submitted' };

  } catch (err: any) {
    console.log('[taskStore] poll network error: ' + (err.message?.slice(0, 80) || String(err).slice(0, 80)));
    return { status: 'submitted' }; // Keep waiting — network glitch
  }
}

// ─── Main generate function ────────────────────
export async function kieGenerate(req: GenerateRequest): Promise<GenerateResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(`[kie] No API key for ${req.providerId}, using stub`);
    return stubGenerate(req, req.providerId);
  }

  const mode = req.mode || 'text-to-image';
  const model = getKieModel(req);
  const resolution = req.resolution || '2K';

  const sizeMap: Record<string, string> = {
    '1K': '1024x1024', '2K': '1792x1024', '4K': '2048x2048', '1080P': '1920x1080',
  };

  const isNanoBanana = req.providerId === 'nano-banana';
  const isI2I = mode === 'image-to-image';

  // Upload video data URLs to hosting (same as images)
  let processedVideoUrls: string[] = [];
  if (req.videoUrls?.length) {
    console.log('[kie] Processing ' + req.videoUrls.length + ' video URLs...');
    for (const u of req.videoUrls) {
      if (typeof u === 'string' && u.startsWith('data:')) {
        const isWebm = u.startsWith('data:video/webm');
        console.log('[kie] Video data URL: ' + u.slice(0,40) + '... isWebm=' + isWebm);
        const toUpload = isWebm ? (await webmToMp4DataUrl(u)) || u : u;
        if (isWebm && toUpload !== u) console.log('[kie] Converted webm→mp4, new size=' + (toUpload.length/1024/1024).toFixed(1) + 'MB');
        else if (isWebm) console.log('[kie] webm→mp4 conversion failed, using original');
        console.log('[kie] Uploading video (' + (toUpload.length/1024/1024).toFixed(1) + 'MB) type=' + toUpload.slice(5,30) + '...');
        const uploaded = await uploadDataUrl(toUpload);
        if (uploaded) { processedVideoUrls.push(uploaded); console.log('[kie] Video uploaded: ' + uploaded.slice(0,60)); }
        else console.log('[kie] Video upload FAILED');
      } else {
        processedVideoUrls.push(u);
      }
    }
  }
  const isKling = req.providerId === 'kling-video';
  const isSeedance = req.providerId === 'seedance-2';
  const isVideo = isKling || isSeedance;

  // Build input params
  const inputParams: Record<string, unknown> = {
    prompt: req.prompt || '',
  };

  if (isVideo) {
    // Video models: Kling/Seedance natively analyze refs — pass directly
    inputParams.aspect_ratio = req.aspect || '16:9';
    inputParams.resolution = resolution;
    if (req.referenceUrls?.length) {
      inputParams.reference_image_urls = req.referenceUrls;
    }
    if (req.referenceImage && !(req.referenceUrls || []).includes(req.referenceImage)) {
      const urls = (inputParams.reference_image_urls as string[]) || [];
      urls.unshift(req.referenceImage);
      inputParams.reference_image_urls = urls;
    }
    if (processedVideoUrls.length) {
      inputParams.reference_video_urls = processedVideoUrls;
    }
  } else {
    // Image models
    inputParams.aspect_ratio = req.aspect || '1:1';
    inputParams.resolution = resolution;
  }

  // ── Kling-specific params ──
  if (isKling) {
    // mode: "std" or "pro" (not resolution — that's a different param)
    inputParams.mode = 'std';
    inputParams.duration = String(req.duration || '5').replace('s', '');
    inputParams.multi_shots = false;
    inputParams.sound = req.generateAudio ?? false;
    if (req.characterOrientation) {
      inputParams.character_orientation = req.characterOrientation;
    }
    if (req.keepOriginalSound !== undefined) {
      inputParams.keep_original_sound = req.keepOriginalSound;
    }
  }

  // ── Seedance-specific params ──
  if (isSeedance) {
    if (req.duration) {
      inputParams.duration = req.duration === 'auto' ? '-1' : String(req.duration).replace('s', '');
    }
    if (req.firstFrameUrl) {
      inputParams.first_frame_url = req.firstFrameUrl;
    }
    if (req.lastFrameUrl) {
      inputParams.last_frame_url = req.lastFrameUrl;
    }
    if (req.fixedCamera !== undefined) {
      inputParams.fixed_camera = req.fixedCamera;
    }
    if (req.generateAudio !== undefined) {
      inputParams.generate_audio = req.generateAudio;
    }
    if (req.webSearch !== undefined) {
      inputParams.web_search = req.webSearch;
    }
  }

  const body: Record<string, unknown> = { model, input: inputParams };

  // output_format: only supported by nano-banana-pro
  if (isNanoBanana) (body.input as any).output_format = 'png';

  if (req.negativePrompt) (body.input as any).negative_prompt = req.negativePrompt;

  // Reference images — upload data: URLs to public hosting
  const allRefs: string[] = [];
  if (req.referenceUrls?.length) {
    for (const u of req.referenceUrls) {
      if (typeof u === 'string' && u.startsWith('data:')) {
        const uploaded = await uploadDataUrl(u);
        if (uploaded) allRefs.push(uploaded);
      } else {
        allRefs.push(u);
      }
    }
  }
  if (req.referenceImage) allRefs.push(req.referenceImage); // always include primary ref
  if (req.styleImageUrl) {
    if (req.styleImageUrl.startsWith('data:')) {
      const uploaded = await uploadDataUrl(req.styleImageUrl);
      if (uploaded) allRefs.push(uploaded);
    } else {
      allRefs.push(req.styleImageUrl);
    }
  }
  const validRefs = allRefs.filter(u => u && (u.startsWith('http://') || u.startsWith('https://')));
  // Debug
  (globalThis as any).__kieUpload = { total: allRefs.length, valid: validRefs.length, samples: allRefs.slice(0, 5).map((u: string) => u.slice(0, 60)) };
  // Model-specific ref limits & parameter names (per Kie API docs)
  const maxRefs = isNanoBanana ? 8 : 16;  // NanoBanana: max 8, others: max 16
  if (validRefs.length > maxRefs) {
    console.warn(`[kie] Truncating ${validRefs.length} refs to ${maxRefs} (${req.providerId})`);
    validRefs.length = maxRefs;
  }
  // Dispatch refs with model-specific parameter names
  // Video refs are already set in inputParams above — skip for video
  if (!isVideo && validRefs.length > 0) {
    if (isNanoBanana) {
      (body.input as any).image_input = validRefs;           // Nano Banana Pro: image_input
    } else if (isI2I) {
      (body.input as any).input_urls = validRefs;            // GPT Image2 I2I: input_urls
    }
    console.log(`[kie] Refs: ${validRefs.length}/${maxRefs} → ${isNanoBanana ? 'image_input' : 'input_urls'}`);
  }

  // Upload mask data URL to public hosting (same as reference images)
  // Kie needs a public HTTP URL — client-generated data: URLs are not accessible
  let maskUrl: string | undefined;
  if (req.maskImage) {
    if (typeof req.maskImage === 'string' && req.maskImage.startsWith('data:')) {
      maskUrl = await uploadDataUrl(req.maskImage) || undefined;
      if (maskUrl) console.log('[kie] Mask uploaded: ' + maskUrl.slice(0, 60));
      else console.log('[kie] Mask upload FAILED');
    } else {
      maskUrl = req.maskImage;
    }
  }
  if (maskUrl) (body.input as any).mask_image = maskUrl;

  const startTime = Date.now();
  const submitUrl = `${BASE_URL}/jobs/createTask`;
  // Save last Kie request for debugging
  const debugRefs = (body.input as any).reference_image_urls || (body.input as any).image_input || [];
  (globalThis as any).__lastKieReq = { model: body.model, refs_count: debugRefs.length, refs_sample: debugRefs.slice(0, 5).map((u: string) => (typeof u === 'string' ? u.slice(0, 80) : String(u))), prompt_len: (body.input as any).prompt?.length || 0, url: submitUrl, refUrls_in: req.referenceUrls?.length || 0, refUrls_sample: (req.referenceUrls || []).slice(0, 3).map((u: unknown) => typeof u === 'string' ? u.slice(0, 80) : String(u)), refImg_in: req.referenceImage ? 1 : 0 };
  if (isVideo) {
    console.log(`[kie] reference_video_urls: ${JSON.stringify(processedVideoUrls.slice(0,3))}`);
    console.log(`[kie] reference_image_urls: ${JSON.stringify(validRefs.slice(0,3))}`);
  }
  console.log(`[kie] Submit: ${req.providerId}/${mode}/${resolution} → ${submitUrl} model=${model}`);

  try {
    const response = await kieFetch(submitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: 'Kie.ai: Rate limited (429)' };
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[kie] Submit error (${response.status}):`, errText.slice(0, 200));
      return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: `Kie.ai ${response.status}` };
    }

    const data = await response.json();
    console.log('[kie] HTTP', response.status, 'Body:', JSON.stringify(data).slice(0, 500));
    (globalThis as any).__lastKieResp = { status: response.status, body: data, model: body.model };

    // Kie.ai createTask returns: { code: 200, data: { taskId, recordId } }
    // Or: { taskId, recordId } directly, or { id } etc.
    const taskId = data.data?.taskId || data.data?.task_id || data.data?.id
      || data.data?.recordId
      || data.taskId || data.task_id || data.id || data.recordId
      || (typeof data.data === 'string' ? data.data : '')
      || '';
    if (!taskId) {
      console.error('[kie] No taskId. Full response:', JSON.stringify(data).slice(0, 2000));
      if (req.clientTaskId) markTaskFailed(req.clientTaskId, 'Kie.ai: No taskId');
      return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: 'Kie.ai: No taskId' };
    }

    // ── Async video tasks: store mapping, return immediately, client polls /api/task/:id/poll ──
    if (req.clientTaskId) {
      markTaskSubmitted(req.clientTaskId, taskId, apiKey, req.prompt || undefined);
      console.log('[kie] Async task submitted: client=' + req.clientTaskId + ' → kie=' + taskId);
      return {
        success: true, assetUrls: [], cost: 0, durationMs: 0, seed: 0,
        taskId: req.clientTaskId, needsPoll: true,
      };
    }

    return pollTask(taskId, apiKey, startTime);

  } catch (err) {
    console.log(`[kie] Unreachable, falling back to stub:`, String(err).slice(0, 60));
    return stubGenerate(req, req.providerId);
  }
}

// ─── Suno Music Generation via Kie.ai ───────────────────
// API: customMode=false → simplified mode (prompt only), instrumental mode for BGM

function getServerBaseUrl(): string {
  return process.env.SERVER_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
}

async function pollSunoTask(taskId: string, apiKey: string, startTime: number): Promise<GenerateResult> {
  // Poll for results — Kie.ai Suno uses /generate/record-info
  const pollUrl = process.env.KIE_SUNO_POLL_URL || `${BASE_URL}/generate/record-info?taskId=${taskId}`;
  const maxAttempts = 225; // 225 checks over ~30 min
  const intervalMs = 8000; // 8 seconds between checks
  console.log(`[kie-suno] Polling ${taskId}...`);

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs));

    try {
      const resp = await kieFetch(pollUrl, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });

      const data = await resp.json().catch(() => ({}));
      if (i === 0) console.log('[kie-suno] recordInfo HTTP', resp.status, ':', JSON.stringify(data).slice(0, 500));

      const record = data.data || data;
      const state = record.state || record.status || record.task_status || '';

      if (state === 'fail' || state === 'failed' || state === 'error') {
        return { success: false, assetUrls: [], cost: 0, durationMs: Date.now() - startTime, seed: 0, error: 'Kie.ai Suno: Generation failed' };
      }

      if (state === 'succeeded' || state === 'completed' || state === 'success' || state === 'SUCCESS' || state === 'done') {
        console.log('[kie-suno] DONE! Full record:', JSON.stringify(record).slice(0, 1000));

        let urls: string[] = [];
        // Parse resultJson
        let resultData: any = record.resultJson;
        if (typeof resultData === 'string' && resultData) {
          try { resultData = JSON.parse(resultData); } catch { /* raw string */ }
        }
        const resultObj = record.result || resultData || record;

        // Extract audio URLs — check all common field names
        // Suno v4: response.sunoData[].audioUrl
        const sunoData = resultObj?.response?.sunoData || resultObj?.sunoData;
        if (sunoData?.length) {
          urls = sunoData.map((s: any) => s.audioUrl || s.streamAudioUrl || s.sourceAudioUrl).filter(Boolean);
        }
        if (urls.length === 0) {
          urls = resultObj?.audio_urls
            || resultObj?.audioUrls
            || resultObj?.assetUrls
            || resultObj?.resultUrls
            || resultObj?.data?.map((d: any) => d.url || d)
            || resultObj?.audio?.map((a: any) => a.url || a)
            || [];
        }

        // Single URL string
        if (urls.length === 0 && typeof resultData === 'string' && resultData.startsWith('http')) {
          urls = [resultData];
        }
        // Check nested in record.resultUrls
        if (urls.length === 0 && record.resultUrls) {
          urls = Array.isArray(record.resultUrls) ? record.resultUrls : [record.resultUrls];
        }

        console.log(`[kie-suno] ${taskId} done: ${urls.length} audio URLs, state=${state}`);
        return {
          success: urls.length > 0,
          assetUrls: urls,
          cost: (record.creditsConsumed || 10) / 100,
          durationMs: Date.now() - startTime,
          seed: 0,
        };
      }

      if (i === 0 || i % 5 === 0) console.log(`[kie-suno] ${taskId} state=${state} (${i + 1}/${maxAttempts})`);
    } catch {
      // Network glitch during polling — retry
    }
  }

  console.log(`[kie-suno] ${taskId} timeout after ${maxAttempts} attempts`);
  return {
    success: false, assetUrls: [], cost: 0,
    durationMs: Date.now() - startTime, seed: 0,
    error: 'Kie.ai Suno: Task timed out',
  };
}

export async function kieSunoGenerate(req: GenerateRequest): Promise<GenerateResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(`[kie-suno] No API key for ${req.providerId}, using stub`);
    return stubGenerate(req, req.providerId);
  }

  const prompt = (req.prompt || '').trim();
  const isVocal = req.instrumental === false && (req.lyrics || '').trim().length > 0;
  const lyrics = (req.lyrics || '').trim();

  if (!prompt) {
    return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: 'No prompt for Suno generation' };
  }

  const model = process.env.KIE_SUNO_MODEL || 'V4_5';
  const sunoUrl = process.env.KIE_SUNO_API_URL || `${BASE_URL}/generate`;
  const callBackUrl = process.env.KIE_SUNO_CALLBACK_URL || `${getServerBaseUrl()}/api/kie/suno-callback`;

  // Build Suno request body
  const body: Record<string, unknown> = isVocal ? {
    // Custom mode with lyrics: prompt = exact lyrics, style = music direction
    customMode: true,
    instrumental: false,
    model,
    prompt: lyrics.slice(0, 3000),          // V4: max 3000 chars for lyrics
    style: prompt.slice(0, 200),            // V4: max 200 chars for style
    title: lyrics.slice(0, 80).replace(/\n/g, ' ').trim() || 'Untitled',  // Max 80 chars
    callBackUrl,
  } : {
    // Non-custom mode: just prompt, auto-generated instrumental
    customMode: false,
    instrumental: true,
    model,
    prompt: prompt.slice(0, 500),           // Non-custom mode: max 500 chars
    callBackUrl,
  };

  const startTime = Date.now();
  console.log(`[kie-suno] Submit: model=${model} prompt="${prompt.slice(0, 100)}..." → ${sunoUrl}`);

  try {
    const response = await kieFetch(sunoUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: 'Kie.ai Suno: Rate limited (429)' };
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[kie-suno] Submit error (${response.status}):`, errText.slice(0, 300));
      return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: `Kie.ai Suno ${response.status}: ${errText.slice(0, 100)}` };
    }

    const data = await response.json();
    console.log('[kie-suno] HTTP', response.status, 'Body:', JSON.stringify(data).slice(0, 500));

    // Extract taskId from response
    const taskId = data?.data?.taskId
      || data?.data?.task_id
      || data?.data?.id
      || data?.data?.recordId
      || data?.taskId
      || data?.task_id
      || data?.id
      || (typeof data?.data === 'string' ? data.data : '')
      || '';

    if (!taskId) {
      console.error('[kie-suno] No taskId. Full response:', JSON.stringify(data).slice(0, 2000));
      return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: 'Kie.ai Suno: No taskId — raw: ' + JSON.stringify(data).slice(0, 500) };
    }

    console.log(`[kie-suno] Task created: ${taskId}`);
    return pollSunoTask(taskId, apiKey, startTime);

  } catch (err) {
    console.log(`[kie-suno] Unreachable, falling back to stub:`, String(err).slice(0, 80));
    return stubGenerate(req, req.providerId);
  }
}

// ─── ElevenLabs Text-to-Dialogue v3 via Kie.ai ───────────────────
// POST /api/v1/jobs/createTask → poll /api/v1/generate/record-info?taskId=...

export async function kieElevenLabsGenerate(req: GenerateRequest): Promise<GenerateResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.log(`[kie-elevenlabs] No API key, using stub`);
    return stubGenerate(req, req.providerId);
  }

  const dialogueEntries = (req as any).dialogue as { text: string; voice: string }[] | undefined;
  const useDialogueArr = dialogueEntries && dialogueEntries.length > 0;
  const text = (req.prompt || '').trim();
  if (!text && !useDialogueArr) {
    return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: 'No text for ElevenLabs generation' };
  }

  const defaultVoice = (req as any).voice || '';
  const language = (req as any).language || '';
  const stability = (req as any).stability ?? 0.5;

  const createUrl = process.env.KIE_ELEVENLABS_URL || `${BASE_URL}/jobs/createTask`;
  const callBackUrl = `${getServerBaseUrl()}/api/kie/suno-callback`;

  // Build dialogue array
  const dialogue = useDialogueArr
    ? dialogueEntries!.filter(d => d.text.trim()).map(d => ({ text: d.text.slice(0, 5000), voice: d.voice || defaultVoice }))
    : [{ text: text.slice(0, 5000), voice: defaultVoice }];

  if (dialogue.length === 0) {
    return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: 'No non-empty dialogue entries' };
  }

  const body: Record<string, unknown> = {
    model: 'elevenlabs/text-to-dialogue-v3',
    input: {
      dialogue,
      ...(language ? { language_code: language } : {}),
      stability,
    },
    callBackUrl,
  };

  const startTime = Date.now();
  console.log(`[kie-elevenlabs] Submit → ${createUrl} entries=${dialogue.length} voices=${dialogue.map(d=>d.voice).join(',')}`);

  try {
    const response = await kieFetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429) {
      return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: 'Kie.ai ElevenLabs: Rate limited (429)' };
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[kie-elevenlabs] Submit error (${response.status}):`, errText.slice(0, 300));
      return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: `Kie.ai ElevenLabs ${response.status}: ${errText.slice(0, 100)}` };
    }

    const data = await response.json();
    console.log('[kie-elevenlabs] HTTP', response.status, 'Body:', JSON.stringify(data).slice(0, 500));

    const taskId = data?.data?.taskId
      || data?.data?.task_id
      || data?.data?.id
      || data?.data?.recordId
      || data?.taskId
      || data?.task_id
      || data?.id
      || '';

    if (!taskId) {
      console.error('[kie-elevenlabs] No taskId. Full:', JSON.stringify(data).slice(0, 2000));
      return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: 'Kie.ai ElevenLabs: No taskId — raw: ' + JSON.stringify(data).slice(0, 500) };
    }

    console.log(`[kie-elevenlabs] Task created: ${taskId}`);
    return pollSunoTask(taskId, apiKey, startTime); // reuse same polling logic

  } catch (err) {
    console.log(`[kie-elevenlabs] Unreachable, falling back to stub:`, String(err).slice(0, 80));
    return stubGenerate(req, req.providerId);
  }
}
