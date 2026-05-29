/* === Model API Gateway === */
/* Unified routing, cost tracking, user-provided API keys */

export interface ModelProvider {
  id: string;
  name: string;
  type: 'image' | 'video' | 'text' | '3d';
  endpoint: string;
  apiKeyEnv: string; // env var name for the key
  capabilities: string[]; // eg. ['inpaint', 'relight', 'multi-angle']
  maxResolution: string;
  badges: string[];
}

export const MODEL_PROVIDERS: ModelProvider[] = [
  {
    id: 'gpt-image2',
    name: 'GPT Image2',
    type: 'image',
    endpoint: 'https://api.openai.com/v1/images/generations',
    apiKeyEnv: 'OPENAI_API_KEY',
    capabilities: ['generate', 'inpaint', 'multi-angle'],
    maxResolution: '4K',
    badges: ['热门'],
  },
  {
    id: 'flux-pro',
    name: 'Flux Pro',
    type: 'image',
    endpoint: 'https://api.bfl.ml/v1/flux-pro',
    apiKeyEnv: 'BFL_API_KEY',
    capabilities: ['generate', 'multi-angle'],
    maxResolution: '2K',
    badges: [],
  },
  {
    id: 'gemini-image',
    name: 'Gemini Image',
    type: 'image',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
    apiKeyEnv: 'GEMINI_API_KEY',
    capabilities: ['generate', 'inpaint', 'relight'],
    maxResolution: '2K',
    badges: ['新'],
  },
  {
    id: 'kling-video',
    name: 'Kling 2.1',
    type: 'video',
    endpoint: 'https://api.klingai.com/v1/videos/text2video',
    apiKeyEnv: 'KLING_API_KEY',
    capabilities: ['text2video', 'image2video'],
    maxResolution: '1080P',
    badges: ['3折'],
  },
];

// ─── Job runner (simulated for MVP) ────────────
export interface GenerateRequest {
  providerId: string;
  prompt: string;
  negativePrompt?: string;
  aspect?: string;
  resolution?: string;
  referenceImage?: string;
  seed?: number;
}

export interface GenerateResult {
  success: boolean;
  assetUrls: string[];
  cost: number;
  durationMs: number;
  seed: number;
  error?: string;
}

// Simulated generation — replace with real API calls
export async function generateImage(req: GenerateRequest): Promise<GenerateResult> {
  const provider = MODEL_PROVIDERS.find(p => p.id === req.providerId);
  if (!provider) return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: 'Unknown provider' };

  const apiKey = getApiKey(provider.apiKeyEnv);
  if (!apiKey) {
    // For MVP without API key, return mock results
    return mockGenerate(req, provider);
  }

  // Real API call (implementation per provider)
  return callProvider(req, provider, apiKey);
}

function getApiKey(envVar: string): string | null {
  // Check localStorage for user-provided keys
  try {
    const keys = JSON.parse(localStorage.getItem('tapnow-api-keys') || '{}');
    return keys[envVar] || null;
  } catch {
    return null;
  }
}

export function setApiKey(envVar: string, key: string) {
  try {
    const keys = JSON.parse(localStorage.getItem('tapnow-api-keys') || '{}');
    keys[envVar] = key;
    localStorage.setItem('tapnow-api-keys', JSON.stringify(keys));
  } catch { /* noop */ }
}

export function getConfiguredProviders(): ModelProvider[] {
  return MODEL_PROVIDERS.filter(p => {
    const key = getApiKey(p.apiKeyEnv);
    return !!key;
  });
}

// ─── Mock generator ────────────────────────────
async function mockGenerate(req: GenerateRequest, provider: ModelProvider): Promise<GenerateResult> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1500));

  const seed = req.seed || Math.floor(Math.random() * 999999);
  const mockImages = [
    `https://picsum.photos/seed/${seed}/800/600`,
    `https://picsum.photos/seed/${seed + 1}/800/600`,
    `https://picsum.photos/seed/${seed + 2}/800/600`,
  ];

  return {
    success: true,
    assetUrls: mockImages,
    cost: provider.type === 'video' ? 0.15 : 0.03,
    durationMs: 1200,
    seed,
  };
}

// ─── Real provider call (stub) ─────────────────
async function callProvider(req: GenerateRequest, provider: ModelProvider, apiKey: string): Promise<GenerateResult> {
  try {
    const response = await fetch(provider.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        prompt: req.prompt,
        n: 3,
        size: req.resolution || '1024x1024',
      }),
    });

    if (!response.ok) {
      return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const urls = data.data?.map((d: { url: string }) => d.url) || [];

    return {
      success: true,
      assetUrls: urls,
      cost: 0.03,
      durationMs: 1500,
      seed: req.seed || 0,
    };
  } catch (err) {
    return { success: false, assetUrls: [], cost: 0, durationMs: 0, seed: 0, error: String(err) };
  }
}
