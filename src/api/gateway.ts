/* === Model API Gateway === */
/* Sends generation requests to the TapNow backend proxy server */
/* Backend handles API keys securely and proxies to model providers */

import type { GenerateRequest, GenerateResult, AgentGenerateRequest, AgentGenerateResult } from '../../shared/api-types.js';
export type { GenerateRequest, GenerateResult };
export { mapModelNameToProviderId } from '../../shared/api-types.js';

// All GPT Image2 variants map to the same provider ID — mode+resolution handled separately


// Backend URL — relative during dev (via Vite proxy), absolute in production
const BACKEND_URL = import.meta.env.VITE_API_URL || '';

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
  {
    id: 'nano-banana',
    name: 'Nano Banana',
    type: 'image',
    capabilities: ['generate', 'inpaint', 'multi-angle'],
    maxResolution: '4K',
    badges: ['推荐'],
  },
  {
    id: 'gpt-image2',
    name: 'GPT Image2',
    type: 'image',
    capabilities: ['text-to-image', 'image-to-image', '1K', '2K', '4K'],
    maxResolution: '4K',
    badges: ['热门'],
  },
  {
    id: 'kling-video',
    name: 'Kling 2.1',
    type: 'video',
    capabilities: ['text2video', 'image2video'],
    maxResolution: '1080P',
    badges: [],
  },
  {
    id: 'seedance-2',
    name: 'Seedance 2.0',
    type: 'video',
    capabilities: ['text2video', 'image2video'],
    maxResolution: '4K',
    badges: ['热门'],
  },
];

// ─── Generate (via backend proxy) ──────────────────────
export async function generateImage(req: GenerateRequest): Promise<GenerateResult> {
  // Use relative URL in dev (Vite proxy), absolute in production
  const url = BACKEND_URL ? `${BACKEND_URL}/api/generate` : '/api/generate';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getSharedApiKey()}`,
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: `Server: ${response.status} ${text}` };
    }

    return await response.json() as GenerateResult;
  } catch (err) {
    return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: String(err) };
  }
}

// ─── Generate with Agent (DeepSeek compile → Image API) ──
export async function generateWithAgent(req: AgentGenerateRequest): Promise<AgentGenerateResult> {
  const url = BACKEND_URL ? `${BACKEND_URL}/api/agent/generate` : '/api/agent/generate';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getSharedApiKey()}`,
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      return {
        compiled: { en: '', cn: '', negative: '', debug: [] },
        result: { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: `Server: ${response.status}` },
      };
    }

    return await response.json() as AgentGenerateResult;
  } catch (err) {
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
      headers: { Authorization: `Bearer ${getSharedApiKey()}` },
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
  const url = BACKEND_URL ? `${BACKEND_URL}/api/agent/visual-extract` : '/api/agent/visual-extract';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getSharedApiKey()}`,
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      return {
        compiled: { en: '', cn: '', negative: '', debug: [] },
        result: { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: `Server: ${response.status}` },
      };
    }

    return await response.json() as AgentGenerateResult;
  } catch (err) {
    return {
      compiled: { en: '', cn: '', negative: '', debug: [] },
      result: { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: String(err) },
    };
  }
}

// ─── Text analysis (single Agent, fast) ──
export async function analyzeText(req: AgentGenerateRequest): Promise<AgentGenerateResult> {
  const url = BACKEND_URL ? `${BACKEND_URL}/api/agent/text` : '/api/agent/text';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getSharedApiKey()}`,
      },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      return {
        compiled: { en: '', cn: '', negative: '', debug: [] },
        result: { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: `Server: ${response.status}` },
      };
    }

    return await response.json() as AgentGenerateResult;
  } catch (err) {
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
  error?: string;
}

export async function analyzeFull(scriptText: string, visualStyle?: string): Promise<FullPipelineApiResponse> {
  const url = BACKEND_URL ? `${BACKEND_URL}/api/agent/full` : '/api/agent/full';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getSharedApiKey()}`,
      },
      body: JSON.stringify({ rawText: scriptText, visualStyle }),
    });

    if (!response.ok) {
      const text = await response.text();
      return { success: false, error: `Server: ${response.status} ${text}` };
    }

    return await response.json() as FullPipelineApiResponse;
  } catch (err) {
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
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getSharedApiKey()}`,
      },
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
