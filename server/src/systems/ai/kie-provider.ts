/* === Kie.ai Unified Provider (OpenAI-compatible, Async) === */
/* All generation tasks are asynchronous: submit → poll → get result */

import type { GenerateRequest, GenerateResult } from '../../../../shared/api-types.js';
import { stubGenerate } from './stub.js';
import { ProxyAgent } from 'undici';

const BASE_URL = process.env.KIE_BASE_URL || 'https://api.kie.ai/api/v1';

// Create fetch with proxy support — reads env dynamically
function kieFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.http_proxy;
  if (proxy) {
    console.log(`[kie] Using proxy: ${proxy}`);
    const agent = new ProxyAgent(proxy);
    return fetch(url, { ...options, dispatcher: agent });
  }
  console.log(`[kie] No proxy configured`);
  return fetch(url, options);
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
  const maxAttempts = 40; // ~2 minutes at 3s intervals
  console.log(`[kie] Polling ${taskId}...`);

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, 3000));

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

  const body: Record<string, unknown> = {
    model,
    input: {
      prompt: req.prompt,
      aspect_ratio: req.aspect || '1:1',
      resolution: resolution,
      output_format: 'png',
    },
  };

  if (req.negativePrompt) (body.input as any).negative_prompt = req.negativePrompt;
  if (req.referenceImage) (body.input as any).reference_image = req.referenceImage;

  const startTime = Date.now();
  const submitUrl = `${BASE_URL}/jobs/createTask`;
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
    console.log('[kie] Response:', JSON.stringify(data).slice(0, 300));

    // Kie.ai createTask returns: { code: 200, data: { taskId, recordId } }
    const taskId = data.data?.taskId || data.data?.task_id || data.data?.id || '';
    if (!taskId) {
      console.error('[kie] No taskId in response:', JSON.stringify(data));
      return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: 'Kie.ai: No taskId' };
    }

    return pollTask(taskId, apiKey, startTime);

  } catch (err) {
    console.log(`[kie] Unreachable, falling back to stub:`, String(err).slice(0, 60));
    return stubGenerate(req, req.providerId);
  }
}
