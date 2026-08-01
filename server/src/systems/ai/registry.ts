/* === AI Provider Registry === */
import type { GenerateRequest, GenerateResult } from '../../../../shared/api-types.js';
import { kieGenerate, kieSunoGenerate, kieElevenLabsGenerate } from './kie-provider.js';
import { stubGenerate } from './stub.js';

export type ProviderHandler = (req: GenerateRequest) => Promise<GenerateResult>;

const registry = new Map<string, ProviderHandler>();

// Stub fallbacks (non-Kie providers)
registry.set('flux-pro', (req) => stubGenerate(req, 'flux-pro'));
registry.set('banana-pro', (req) => stubGenerate(req, 'banana-pro'));
registry.set('jimeng-4.5', (req) => stubGenerate(req, 'jimeng-4.5'));
registry.set('udio', (req) => stubGenerate(req, 'udio'));
registry.set('stable-audio', (req) => stubGenerate(req, 'stable-audio'));

// Kie.ai unified API models
// All Kie models use the same API (POST /api/v1/jobs/createTask) — detected by pattern below.
// Legacy IDs kept for backward compat with old canvas state.
const KIE_LEGACY_IDS = ['nano-banana', 'gpt-image2', 'kling-video', 'seedance-2'];

// Kie model IDs that are bare slugs (no "/") — not covered by patterns below
// These are the ACTUAL Kie API model names used in createTask body.model field
const KIE_BARE_IDS = ['nano-banana-pro', 'omnihuman-1-5'];

// Kie model ID patterns: contain "/" (e.g. "google/nano-banana", "kling-3.0/video")
// or match known provider prefixes (seedream, grok, ideogram, flux, wan, etc.)
const KIE_PATTERNS = [
  /^google\//, /^seedream\//, /^grok-/,
  /^qwen/, /^ideogram\//, /^flux-/,
  /^wan\//, /^kling/, /^bytedance\//,
  /^hailuo\//, /^vidu\//,
  /^pixverse\//, /^luma\//, /^gpt-image/,
  /^recraft\//, /^topaz\//, /^happyhorse/,
  /^veo\//, /^omnihuman/, /^runway\//,
];

function isKieProvider(id: string): boolean {
  if (KIE_LEGACY_IDS.includes(id)) return true;
  if (KIE_BARE_IDS.includes(id)) return true;
  if (id.includes('/')) return true; // New Kie model IDs have / (e.g., "google/nano-banana")
  return KIE_PATTERNS.some(p => p.test(id));
}

// Audio providers (specific handlers)
const AUDIO_PROVIDERS: Record<string, ProviderHandler> = {
  'suno-v4': kieSunoGenerate,
  'elevenlabs-text-to-dialogue-v3': kieElevenLabsGenerate,
};

export function getProvider(id: string): ProviderHandler | undefined {
  // 1. Check explicit registry entries first
  const explicit = registry.get(id);
  if (explicit) return explicit;

  // 2. Check audio providers
  if (AUDIO_PROVIDERS[id]) return AUDIO_PROVIDERS[id];

  // 3. Route any Kie model (new or legacy) to kieGenerate
  if (isKieProvider(id)) return kieGenerate;

  // 4. Unknown
  return undefined;
}

export function listProviders(): string[] {
  return Array.from(registry.keys());
}
