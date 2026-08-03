/* === Model API Gateway === */
/* Sends generation requests to the TapNow backend proxy server */
/* Backend handles API keys securely and proxies to model providers */

import type { GenerateRequest, GenerateResult, AgentGenerateRequest, AgentGenerateResult } from '../../shared/api-types.js';
export type { GenerateRequest, GenerateResult };
export { mapModelNameToProviderId } from '../../shared/api-types.js';
import { BACKEND_URL } from './config';
import { useAuthStore } from '../store/useAuthStore';
import { getImageCost, getAudioDirexCost, getVideoCreditCost, estimateTextCost, estimateScriptAnalysisCost } from '../store/pricing';

// ─── Model provider metadata (for UI display only) ─────
export interface ModelProvider {
  id: string;
  name: string;
  type: 'image' | 'video' | 'text' | '3d';
  capabilities: string[];
  maxResolution: string;
  badges: string[];
}

export const MODEL_PROVIDERS: ModelProvider[] = [
  // === Image Models ===
  { id: 'nano-banana-pro',          name: 'Nano Banana Pro',    type: 'image', capabilities: ['t2i','i2i','inpaint'],              maxResolution: '4K', badges: ['推荐'] },
  { id: 'google/nano-banana',       name: 'Nano Banana 2',      type: 'image', capabilities: ['t2i','i2i','inpaint','multi-angle'], maxResolution: '4K', badges: ['热门'] },
  { id: 'gpt-image2',               name: 'GPT Image 2',        type: 'image', capabilities: ['t2i','i2i','1K','2K','4K'],          maxResolution: '4K', badges: ['热门'] },
  { id: 'seedream/5-pro-text-to-image', name: 'Seedream 5 Pro', type: 'image', capabilities: ['t2i','i2i'],                        maxResolution: '2K', badges: ['热门'] },
  { id: 'grok-imagine/text-to-image', name: 'Grok Imagine',     type: 'image', capabilities: ['t2i','i2i'],                        maxResolution: '2K', badges: [] },
  { id: 'flux-2/pro-text-to-image', name: 'Flux 2 Pro',         type: 'image', capabilities: ['t2i','i2i'],                        maxResolution: '4K', badges: [] },
  { id: 'flux-2/flex-text-to-image',name: 'Flux 2 Flex',        type: 'image', capabilities: ['t2i'],                              maxResolution: '1K', badges: [] },
  { id: 'wan/2-7-image-pro',        name: 'Wan 2.7 Image Pro',  type: 'image', capabilities: ['t2i','i2i'],                        maxResolution: '2K', badges: [] },
  { id: 'google/imagen4-fast',      name: 'Imagen 4',           type: 'image', capabilities: ['t2i'],                              maxResolution: '4K', badges: [] },
  // Utility image tools
  { id: 'recraft/remove-background',name: 'Recraft 抠图',       type: 'image', capabilities: ['remove-bg'],                        maxResolution: '4K', badges: [] },
  { id: 'recraft/crisp-upscale',    name: 'Recraft 放大',       type: 'image', capabilities: ['upscale'],                          maxResolution: '4K', badges: [] },
  { id: 'topaz/image-upscale',      name: 'Topaz 放大',         type: 'image', capabilities: ['upscale'],                          maxResolution: '4K', badges: [] },

  // === Video Models ===
  { id: 'kling-video',              name: 'Kling 3.0',          type: 'video', capabilities: ['t2v','i2v','motion'],              maxResolution: '1080P', badges: ['推荐'] },
  { id: 'kling-3-omni/text-to-video', name: 'Kling 3.0 Omni',   type: 'video', capabilities: ['t2v','i2v','omni','audio','edit'],  maxResolution: '1080P', badges: ['热门'] },
  { id: 'seedance-2',               name: 'Seedance 2.0',       type: 'video', capabilities: ['t2v','i2v','first-last','multi-ref','audio'], maxResolution: '1080P', badges: ['热门'] },
  { id: 'wan/2-7-text-to-video',    name: 'Wan 2.7 Video',      type: 'video', capabilities: ['t2v','i2v','r2v','edit'],          maxResolution: '1080P', badges: [] },
];

// ─── Generate (via backend proxy) ──────────────────────
export async function generateImage(req: GenerateRequest): Promise<GenerateResult> {
  if (isCreditBlocked()) return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: '积分不足，请充值' };
  const upfront = deductUpfront(req);
  const url = BACKEND_URL ? `${BACKEND_URL}/api/generate` : '/api/generate';
  const desc = `${req.providerId} ${req.resolution || ''}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      const text = await response.text();
      await settleCredits(upfront, 0, `${desc} — HTTP ${response.status}`);
      return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: `Server: ${response.status} ${text}` };
    }

    const result = await response.json() as GenerateResult;
    await settleCredits(upfront, result.cost || 0, desc);
    return result;
  } catch (err) {
    await settleCredits(upfront, 0, `${desc} — 网络错误`);
    return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: String(err) };
  }
}

// ─── Generate with Agent (DeepSeek compile → Image API) ──
export async function generateWithAgent(req: AgentGenerateRequest): Promise<AgentGenerateResult> {
  if (isCreditBlocked()) return creditBlockedResult();
  const upfront = deductUpfront(req);
  const url = BACKEND_URL ? `${BACKEND_URL}/api/agent/generate` : '/api/agent/generate';
  const desc = `${req.providerId} ${(req as any).resolution || ''}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      await settleCredits(upfront, 0, `${desc} — HTTP ${response.status}`);
      return {
        compiled: { en: '', cn: '', negative: '', debug: [] },
        result: { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: `Server: ${response.status}` },
      };
    }

    const agentResult = await response.json() as AgentGenerateResult;
    await settleCredits(upfront, agentResult.result?.cost || 0, desc);
    return agentResult;
  } catch (err) {
    await settleCredits(upfront, 0, `${desc} — 网络错误`);
    return {
      compiled: { en: '', cn: '', negative: '', debug: [] },
      result: { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: String(err) },
    };
  }
}

// ─── Client-side task polling (for long video generation) ──
export async function pollVideoTask(taskId: string): Promise<{ status: string; assetUrls?: string[]; compiledPrompt?: string; error?: string }> {
  const url = BACKEND_URL ? `${BACKEND_URL}/api/task/${taskId}/poll` : `/api/task/${taskId}/poll`;
  try {
    const response = await fetch(url, {
      headers: authHeaders(),
    });
    if (!response.ok) return { status: 'error', error: `HTTP ${response.status}` };
    return await response.json();
  } catch (err) {
    return { status: 'error', error: String(err) };
  }
}

// ─── Visual Extraction (GPT-5.4 analyzes refs → extracts subject → compiles prompt → generates) ──
// Routes to /api/agent/visual-extract when the user prompt indicates extraction intent
// Extraction intent detection — requires BOTH image reference + extraction action
const IMAGE_SOURCE_RE = /图中|图里|这张|那张|参考图|第.?[张个幅]|宫格|九宫格|某.?[张个幅]/i;
const EXTRACTION_ACTION_RE = /提取|抠出|单独抠|单独提取|单独提出|单独生成|单独拿|分离出|去除背景|去掉背景/i;
const STRONG_EXTRACTION_RE = /^提取|^抠出|^单独抠|^把.*提取|^把.*抠/i;

export function hasExtractionIntent(prompt: string): boolean {
  if (STRONG_EXTRACTION_RE.test((prompt || '').trim())) return true;
  if (IMAGE_SOURCE_RE.test(prompt || '') && EXTRACTION_ACTION_RE.test(prompt || '')) return true;
  // @mention 引用图片 + 提取动作 → 如 "将图片@xxx中右侧的小刀提取出来"
  if (/@\S+/.test(prompt || '') && EXTRACTION_ACTION_RE.test(prompt || '')) return true;
  return false;
}

export async function visualExtract(req: AgentGenerateRequest): Promise<AgentGenerateResult> {
  if (isCreditBlocked()) return creditBlockedResult();
  const upfront = deductUpfront(req);
  const url = BACKEND_URL ? `${BACKEND_URL}/api/agent/visual-extract` : '/api/agent/visual-extract';
  const desc = `${req.providerId} ${(req as any).resolution || ''} (extract)`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      await settleCredits(upfront, 0, `${desc} — HTTP ${response.status}`);
      return {
        compiled: { en: '', cn: '', negative: '', debug: [] },
        result: { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: `Server: ${response.status}` },
      };
    }

    const agentResult = await response.json() as AgentGenerateResult;
    await settleCredits(upfront, agentResult.result?.cost || 0, desc);
    return agentResult;
  } catch (err) {
    await settleCredits(upfront, 0, `${desc} — 网络错误`);
    return {
      compiled: { en: '', cn: '', negative: '', debug: [] },
      result: { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: String(err) },
    };
  }
}

// ─── Text analysis (single Agent, fast) ──
export async function analyzeText(req: AgentGenerateRequest): Promise<AgentGenerateResult> {
  if (isCreditBlocked()) return creditBlockedResult();
  const upfront = deductUpfront(req);
  const url = BACKEND_URL ? `${BACKEND_URL}/api/agent/text` : '/api/agent/text';
  const desc = `GPT-5.6 Sol (text)`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      await settleCredits(upfront, 0, `${desc} — HTTP ${response.status}`);
      return {
        compiled: { en: '', cn: '', negative: '', debug: [] },
        result: { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: `Server: ${response.status}` },
      };
    }

    const agentResult = await response.json() as AgentGenerateResult;
    await settleCredits(upfront, agentResult.result?.cost || 0, desc);
    return agentResult;
  } catch (err) {
    await settleCredits(upfront, 0, `${desc} — 网络错误`);
    return {
      compiled: { en: '', cn: '', negative: '', debug: [] },
      result: { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: String(err) },
    };
  }
}

// ─── Full pipeline (one GPT-5 call → 6 categories) ──────────
export interface FullPipelineApiResponse {
  success: boolean;
  characters?: Record<string, string> | null;
  scenes?: Record<string, string> | null;
  sceneArchitecture?: Record<string, string> | null;
  props?: Record<string, string> | null;
  music?: { scenes: Record<string, string>; sunoPrompts: Record<string, string> } | null;
  shots?: Array<{
    shotNumber: number;
    scene: string;
    shotType: string;
    angle: string;
    lens: string;
    composition: string;
    foreground: string;
    midground: string;
    background: string;
    blocking: string;
    action: string;
    emotion: string;
    cameraMovement: string;
    focusPoint: string;
    visualPrompt: string;
    contentCN: string;
  }>;
  totalDurationMs?: number;
  /** DireX credit cost (from backend GPT-5.6 Sol consumption) */
  cost?: number;
  error?: string;
}

export async function analyzeFull(scriptText: string, visualStyle?: string): Promise<FullPipelineApiResponse> {
  if (isCreditBlocked()) return { success: false, error: '积分不足，请充值' };

  // Estimate script analysis cost upfront (GPT-5.6 Sol, 1.44× output ratio)
  const estimate = estimateScriptAnalysisCost(scriptText);
  const upfront = estimate.direxCredits;
  let deducted = 0;
  if (upfront > 0) {
    const ok = useAuthStore.getState().deductLocalCredits(upfront);
    const auth = useAuthStore.getState();
    if (auth.isLoggedIn()) {
      auth.spendCredits(upfront, 'spend_text', 'Script analysis (upfront)');
    }
    deducted = ok ? upfront : 0;
  }

  const url = BACKEND_URL ? `${BACKEND_URL}/api/agent/full` : '/api/agent/full';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ rawText: scriptText, visualStyle }),
    });

    if (!response.ok) {
      const text = await response.text();
      if (deducted > 0) {
        await useAuthStore.getState().refundCredits(deducted, `失败退款: Script analysis — HTTP ${response.status}`);
      }
      return { success: false, error: `Server: ${response.status} ${text}` };
    }

    const result = await response.json() as FullPipelineApiResponse;

    // Settle: if backend returned cost, use it; otherwise keep upfront estimate
    if (deducted > 0 && result.cost !== undefined) {
      await settleCredits(deducted, result.cost, 'Script analysis');
    } else if (!result.success && deducted > 0) {
      await useAuthStore.getState().refundCredits(deducted, '失败退款: Script analysis');
    } else if (!result.success && deducted === 0 && result.cost && result.cost > 0) {
      // No upfront was deducted but backend charged → deduct now
      useAuthStore.getState().spendCredits(result.cost, 'spend_text', 'Script analysis');
    }

    return result;
  } catch (err) {
    if (deducted > 0) {
      await useAuthStore.getState().refundCredits(deducted, '失败退款: Script analysis — 网络错误');
    }
    return { success: false, error: String(err) };
  }
}

// ─── Q Brain Central Decision ──────────────────────
export interface QDecideResponse {
  intent: {
    understood: string;
    confidence: number;
    category: 'generate' | 'analyze' | 'fix' | 'query' | 'unknown';
  };
  routing: {
    route: string;
    reasoning: string;
    alternatives: string[];
  };
  context: {
    memoriesRecalled: number;
    relevantMemories: { content: string; layer: string }[];
    knownIssues: string[];
  };
  execution?: {
    success: boolean;
    result: unknown;
    durationMs: number;
  };
  validation?: {
    deviationsFound: number;
    violationsFound: number;
    suggestions: string[];
  };
  planOnly: boolean;
  trace: { step: string; description: string; durationMs: number }[];
}

/** POST /api/q/decide — Q brain analyzes intent, routes, executes, validates. */
export async function qDecide(params: {
  action: string;
  scriptText?: string;
  nodeId?: string;
  projectId?: string;
  autoExecute?: boolean;
  extraParams?: Record<string, unknown>;
}): Promise<QDecideResponse | null> {
  const url = BACKEND_URL ? `${BACKEND_URL}/api/q/decide` : '/api/q/decide';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        action: params.action,
        scriptText: params.scriptText,
        nodeId: params.nodeId,
        projectId: params.projectId || 'default',
        params: params.extraParams,
        autoExecute: params.autoExecute !== false,
      }),
    });

    if (!response.ok) {
      console.warn('[qDecide] Server returned', response.status);
      return null;
    }

    return await response.json() as QDecideResponse;
  } catch (err) {
    console.warn('[qDecide] Failed:', err);
    return null;
  }
}

/** Q-gated generation wrapper — asks Q brain to decide the pipeline, falls back to direct API on failure. */
export async function generateWithQGatekeeper(params: {
  action: string;
  scriptText: string;
  nodeId?: string;
  visualStyle?: string;
  onQInsight?: (response: QDecideResponse) => void;
}): Promise<{ usedQBrain: boolean; qResponse: QDecideResponse | null }> {
  const qResponse = await qDecide({
    action: params.action,
    scriptText: params.scriptText,
    nodeId: params.nodeId,
    autoExecute: true,
    extraParams: { visualStyle: params.visualStyle },
  });

  if (qResponse) {
    params.onQInsight?.(qResponse);
    if (qResponse.execution?.success) {
      console.log('[Q Gatekeeper] Q executed pipeline:', qResponse.routing.route, 'in', qResponse.execution.durationMs, 'ms');
      return { usedQBrain: true, qResponse };
    }
    console.log('[Q Gatekeeper] Q decided but execution skipped/failed. Route:', qResponse.routing.route);
  }

  return { usedQBrain: false, qResponse };
}

// ─── Shared API key (frontend ↔ backend auth, NOT provider keys) ──
export function getSharedApiKey(): string {
  return import.meta.env.VITE_SHARED_API_KEY || 'tapnow-dev-key';
}

/** Build headers for backend requests: shared API key + optional user JWT for credit deduction. */
function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${getSharedApiKey()}`,
  };
  const userToken = useAuthStore.getState().token;
  if (userToken) {
    headers['X-User-Token'] = `Bearer ${userToken}`;
  }
  return headers;
}

/** Minimum credits required to generate. Returns true if blocked (panel shown). */
const MIN_GEN_CREDITS = 6;
function isCreditBlocked(): boolean {
  const credits = useAuthStore.getState().user?.credits ?? 0;
  if (credits < MIN_GEN_CREDITS) {
    (window as any).__showCreditPanel?.();
    return true;
  }
  return false;
}

/** Stub result returned when credit check fails. */
function creditBlockedResult(): AgentGenerateResult {
  return {
    compiled: { en: '', cn: '', negative: '', debug: [] },
    result: { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: '积分不足，请充值' },
  };
}

/** Map providerId → display model name for frontend pricing estimate. */
function providerToModelName(providerId: string): string {
  const m: Record<string, string> = {
    'nano-banana-pro': 'Nano Banana Pro',
    'google/nano-banana': 'Nano Banana 2',
    'gpt-image-2-text-to-image': 'GPT Image 2',
    'gpt-image-2-image-to-image': 'GPT Image 2',
    'seedream/5-pro-text-to-image': 'Seedream 5 Pro',
    'grok-imagine/text-to-image': 'Grok Imagine',
    'flux-2/pro-text-to-image': 'Flux 2 Pro',
    'flux-2/flex-text-to-image': 'Flux 2 Flex',
    'wan/2-7-image-pro': 'Wan 2.7 Image Pro',
    'google/imagen4-fast': 'Imagen 4',
    'kling-video': 'Kling 3.0',
    'seedance-2': 'Seedance 2.0',
    'suno-v4': 'Suno v4',
  };
  return m[providerId] || '';
}

/** Estimate DireX credit cost from request params (deducted upfront, adjusted after API). */
function estimateCost(req: AgentGenerateRequest | GenerateRequest): number {
  const pid = (req as any).providerId || '';
  const model = providerToModelName(pid);
  const resolution = ((req as any).resolution as string) || '2K';
  const duration = Number((req as any).duration) || 5;
  const genMode = (req as any).genMode as string | undefined;

  // Text / LLM — use GPT-5.6 Sol token pricing
  // CJK: 1.7 tokens/char, ASCII: 0.25 tokens/char. Output ratio: 50% default.
  if (pid === 'text') {
    const inputText = ((req as any).rawText as string) || ((req as any).prompt as string) || '';
    if (!inputText) return 0;
    return estimateTextCost('gpt-5.6-sol', inputText).direxCredits;
  }

  // Video
  if (pid === 'kling-video' || pid === 'seedance-2') {
    return getVideoCreditCost(model, duration, genMode, resolution, (req as any).refVideoDuration);
  }
  // Audio / Suno
  if (pid === 'suno-v4' || pid === 'elevenlabs') {
    return getAudioDirexCost('Suno v4');
  }
  // Image (1 image per call)
  if (model) {
    return getImageCost(model, resolution, 1);
  }
  // Text / unknown: don't deduct upfront
  return 0;
}

/** Deduct credits upfront, returns the amount deducted (0 if skipped). */
function deductUpfront(req: AgentGenerateRequest | GenerateRequest): number {
  const cost = estimateCost(req);
  if (cost <= 0) return 0;
  const ok = useAuthStore.getState().deductLocalCredits(cost);
  // Also try server-side for logged-in users
  const auth = useAuthStore.getState();
  if (auth.isLoggedIn()) {
    auth.spendCredits(cost, 'spend_image', `${(req as any).providerId} (upfront)`);
  }
  return ok ? cost : 0;
}

/** After API response: adjust deduction — keep if success with cost, refund otherwise. */
async function settleCredits(upfrontCost: number, resultCost: number, desc: string): Promise<void> {
  if (upfrontCost <= 0) {
    // No upfront deduction — if API returned a cost, deduct now (success case)
    if (resultCost > 0) {
      useAuthStore.getState().spendCredits(resultCost, 'spend_image', desc);
    }
    return;
  }
  // Upfront was deducted. If API failed or cost is 0 → refund.
  if (resultCost <= 0) {
    await useAuthStore.getState().refundCredits(upfrontCost, `失败退款: ${desc}`);
    return;
  }
  // Both upfront and API have costs. Adjust difference.
  if (resultCost > upfrontCost) {
    // API charged more — deduct the difference
    const diff = resultCost - upfrontCost;
    useAuthStore.getState().spendCredits(diff, 'spend_image', `${desc} (补扣差额)`);
  } else if (resultCost < upfrontCost) {
    // API charged less — refund the difference
    const diff = upfrontCost - resultCost;
    await useAuthStore.getState().refundCredits(diff, `多退少补: ${desc}`);
  }
  // Equal: no adjustment needed
}
