/* === Stub provider for providers without real API access === */
import type { GenerateRequest, GenerateResult } from '../../../../shared/api-types.js';

let _mockSeed = 0;

export async function stubGenerate(req: GenerateRequest, providerName: string): Promise<GenerateResult> {
  // Simulate network delay
  const delay = 600 + Math.random() * 1400;
  await new Promise(resolve => setTimeout(resolve, delay));

  const seed = req.seed || Math.floor(Math.random() * 999999);
  _mockSeed++;

  // Use picsum for semi-random visually distinct images
  const mockImages = [
    `https://picsum.photos/seed/${seed}_0/800/600`,
    `https://picsum.photos/seed/${seed}_1/800/600`,
    `https://picsum.photos/seed/${seed}_2/800/600`,
  ];

  console.log(`[stub:${providerName}] Generated ${mockImages.length} mock images (seed: ${seed})`);

  return {
    success: true,
    assetUrls: mockImages,
    cost: 0.03,
    durationMs: Math.round(delay),
    seed,
  };
}
