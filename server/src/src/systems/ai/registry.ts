/* === AI Provider Registry === */
import type { GenerateRequest, GenerateResult } from '../../../../shared/api-types.js';
import { kieGenerate } from './kie-provider.js';
import { stubGenerate } from './stub.js';

export type ProviderHandler = (req: GenerateRequest) => Promise<GenerateResult>;

const registry = new Map<string, ProviderHandler>();

// All image/video models → Kie.ai
registry.set('nano-banana', kieGenerate);
registry.set('gpt-image2', kieGenerate);
registry.set('kling-video', kieGenerate);
registry.set('seedance-2', kieGenerate);

// Stub fallbacks
registry.set('flux-pro', (req) => stubGenerate(req, 'flux-pro'));
registry.set('banana-pro', (req) => stubGenerate(req, 'banana-pro'));
registry.set('jimeng-4.5', (req) => stubGenerate(req, 'jimeng-4.5'));
registry.set('suno-v4', (req) => stubGenerate(req, 'suno-v4'));
registry.set('udio', (req) => stubGenerate(req, 'udio'));
registry.set('stable-audio', (req) => stubGenerate(req, 'stable-audio'));

export function getProvider(id: string): ProviderHandler | undefined {
  return registry.get(id);
}

export function listProviders(): string[] {
  return Array.from(registry.keys());
}
