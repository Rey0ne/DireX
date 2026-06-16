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
      const text = await response.text();
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

// ─── Auth token: JWT if logged in, otherwise shared dev key ──
export function getSharedApiKey(): string {
  // 动态读取，避免 zustand import 循环依赖 — 直接从 localStorage 读
  try {
    const saved = localStorage.getItem('direx_auth');
    if (saved) {
      const { token } = JSON.parse(saved);
      if (token) return token;
    }
  } catch {}
  return import.meta.env.VITE_SHARED_API_KEY || 'tapnow-dev-key';
}

// ─── Auth API helpers ──
const BACKEND = import.meta.env.VITE_API_URL || '';

export async function spendCredits(amount: number, type: string, description: string) {
  const key = getSharedApiKey();
  const resp = await fetch(`${BACKEND}/api/auth/credits/spend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ amount, type, description }),
  });
  return resp.json();
}

export async function fetchCredits() {
  const key = getSharedApiKey();
  const resp = await fetch(`${BACKEND}/api/auth/credits`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  return resp.json();
}
