/* === Kie.ai Unified Provider (OpenAI-compatible, Async) === */
/* All generation tasks are asynchronous: submit → poll → get result */

import type { GenerateRequest, GenerateResult } from '../../../../shared/api-types.js';
import { stubGenerate } from './stub.js';
import { execSync } from 'child_process';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const BASE_URL = process.env.KIE_BASE_URL || 'https://api.kie.ai/api/v1';

// Create fetch with proxy support — reads env dynamically
function kieFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Use system-level proxy — undici ProxyAgent unreliable with local proxies
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
  const maxAttempts = 5; // 5 checks over 10 minutes
  const intervalMs = 120000; // 2 minutes between checks
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
        return { success: false, assetUrls: [], cost: 0, durationMs: Date.now() - startTime, seed: 0, error: 'Kie.ai: Generation failed' };
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
    if (req.referenceUrls?.length) {
      inputParams.input_urls = req.referenceUrls;
    }
    if (req.referenceImage && !(req.referenceUrls || []).includes(req.referenceImage)) {
      const urls = (inputParams.input_urls as string[]) || [];
      urls.unshift(req.referenceImage);
      inputParams.input_urls = urls;
    }
    if (processedVideoUrls.length) {
      inputParams.video_urls = processedVideoUrls;
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
    inputParams.duration = (req.duration || '5').replace('s', '');
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
      inputParams.duration = req.duration === 'auto' ? '-1' : req.duration.replace('s', '');
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

  if (req.maskImage) (body.input as any).mask_image = req.maskImage;

  const startTime = Date.now();
  const submitUrl = `${BASE_URL}/jobs/createTask`;
  // Save last Kie request for debugging
  const debugRefs = (body.input as any).input_urls || (body.input as any).image_input || [];
  (globalThis as any).__lastKieReq = { model: body.model, refs_count: debugRefs.length, refs_sample: debugRefs.slice(0, 5).map((u: string) => (typeof u === 'string' ? u.slice(0, 80) : String(u))), prompt_len: (body.input as any).prompt?.length || 0, url: submitUrl, refUrls_in: req.referenceUrls?.length || 0, refUrls_sample: (req.referenceUrls || []).slice(0, 3).map((u: unknown) => typeof u === 'string' ? u.slice(0, 80) : String(u)), refImg_in: req.referenceImage ? 1 : 0 };
  if (isVideo) {
    console.log(`[kie] video_urls: ${JSON.stringify(processedVideoUrls.slice(0,3))}`);
    console.log(`[kie] input_urls: ${JSON.stringify(validRefs.slice(0,3))}`);
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
      return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: 'Kie.ai: No taskId' };
    }

    return pollTask(taskId, apiKey, startTime);

  } catch (err) {
    console.log(`[kie] Unreachable, falling back to stub:`, String(err).slice(0, 60));
    return stubGenerate(req, req.providerId);
  }
}
