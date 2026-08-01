/* === DireX Model Pricing Store === */
/* Real pricing data extracted from Kie.ai market API × 1.6 markup (60%) */
/* Exchange rate: 1 credit = $0.005 USD (fixed, never changes) */
/* DireX markup: 1.6× Kie credit price (applied to credits, not exchange rate) */

// ── Kie Model ID Map (DireX name → Kie API model string) ──
// Scraped 2026-08 from kie.ai model detail pages.
// Kie uses a unified API: POST /api/v1/jobs/createTask with { model: "<kieId>", ... }
// Then polls GET /api/v1/jobs/recordInfo?taskId=...
export const KIE_MODEL_IDS: Record<string, { t2i?: string; i2i?: string; t2v?: string; i2v?: string; default: string }> = {
  // === Image Models ===
  'Nano Banana 2':        { t2i: 'google/nano-banana', i2i: 'google/nano-banana', default: 'google/nano-banana' },
  'Nano Banana Pro':      { t2i: 'google/nano-banana-pro', i2i: 'google/nano-banana-pro', default: 'google/nano-banana-pro' },
  'Nano Banana 2 Lite':   { t2i: 'google/nano-banana-2-lite', default: 'google/nano-banana-2-lite' },
  'Seedream 5 Pro':       { t2i: 'seedream/5-pro-text-to-image', i2i: 'seedream/5-pro-image-to-image', default: 'seedream/5-pro-text-to-image' },
  'Seedream 4.5':         { t2i: 'seedream/4.5', i2i: 'seedream/4.5-edit', default: 'seedream/4.5' },
  'Seedream 5.0 Lite':    { t2i: 'seedream/5-lite-text-to-image', i2i: 'seedream/5-lite-image-to-image', default: 'seedream/5-lite-text-to-image' },
  'GPT Image 2':          { t2i: 'gpt-image-2-text-to-image', i2i: 'gpt-image-2-image-to-image', default: 'gpt-image-2-text-to-image' },
  'GPT Image 1.5':        { t2i: 'gpt-image/1.5-text-to-image', i2i: 'gpt-image/1.5-image-to-image', default: 'gpt-image/1.5-text-to-image' },
  'Grok Imagine':         { t2i: 'grok-imagine/text-to-image', i2i: 'grok-imagine/image-to-image', default: 'grok-imagine/text-to-image' },
  'Qwen Z-Image':         { t2i: 'qwen/text-to-image', default: 'qwen/text-to-image' },
  'Qwen Image 2':         { t2i: 'qwen2/image-edit', default: 'qwen2/image-edit' },
  'Ideogram V3':          { t2i: 'ideogram/v3-text-to-image', i2i: 'ideogram/v3-image-to-image', default: 'ideogram/v3-text-to-image' },
  'Flux 2 Pro':           { t2i: 'flux-2/pro-text-to-image', i2i: 'flux-2/pro-image-to-image', default: 'flux-2/pro-text-to-image' },
  'Flux 2 Flex':          { t2i: 'flux-2/flex-text-to-image', default: 'flux-2/flex-text-to-image' },
  'Wan 2.7 Image Pro':    { t2i: 'wan/2-7-image-pro', i2i: 'wan/2-7-image-pro', default: 'wan/2-7-image-pro' },
  'Wan 2.7 Image':        { t2i: 'wan/2-7-image', default: 'wan/2-7-image' },
  '4o Image':             { t2i: 'gpt-image/1-text-to-image', i2i: 'gpt-image/1-image-to-image', default: 'gpt-image/1-text-to-image' },
  'Imagen 4':             { t2i: 'google/imagen4-fast', default: 'google/imagen4-fast' },
  'Imagen 4 Ultra':       { t2i: 'google/imagen4-ultra', default: 'google/imagen4-ultra' },

  // === Video Models ===
  'Kling 3.0':            { t2v: 'kling-3.0/video', i2v: 'kling-3.0/video', default: 'kling-3.0/video' },
  'Kling 2.6':            { t2v: 'kling/2-6-text-to-video', i2v: 'kling/2-6-image-to-video', default: 'kling/2-6-text-to-video' },
  'Kling 2.5 Turbo':      { t2v: 'kling/v2-5-turbo-text-to-video-pro', i2v: 'kling/v2-5-turbo-image-to-video-pro', default: 'kling/v2-5-turbo-text-to-video-pro' },
  'Kling 2.1':            { t2v: 'kling/v2-1-master-text-to-video', i2v: 'kling/v2-1-master-image-to-video', default: 'kling/v2-1-master-text-to-video' },
  'Kling 3.0 Omni':       { t2v: 'kling-3-omni/text-to-video', i2v: 'kling-3-omni/image-to-video', default: 'kling-3-omni/text-to-video' },
  'Seedance 2.0':         { t2v: 'bytedance/seedance-2', i2v: 'bytedance/seedance-2', default: 'bytedance/seedance-2' },
  'Seedance 2.0 Mini':    { t2v: 'bytedance/seedance-2-mini', default: 'bytedance/seedance-2-mini' },
  'Seedance 1.5 Pro':     { t2v: 'bytedance/seedance-1.5-pro', i2v: 'bytedance/seedance-1.5-pro', default: 'bytedance/seedance-1.5-pro' },
  'Wan 2.7 Video':        { t2v: 'wan/2-7-text-to-video', i2v: 'wan/2-7-image-to-video', default: 'wan/2-7-text-to-video' },
  'Wan 2.6 Video':        { t2v: 'wan/2-6-text-to-video', i2v: 'wan/2-6-image-to-video', default: 'wan/2-6-text-to-video' },
  'Wan 2.5 Video':        { t2v: 'wan/2-5-text-to-video', i2v: 'wan/2-5-image-to-video', default: 'wan/2-5-text-to-video' },
  'Hailuo 2.3':           { t2v: 'hailuo/2-3-text-to-video-standard', i2v: 'hailuo/2-3-image-to-video-standard', default: 'hailuo/2-3-text-to-video-standard' },
  'Hailuo 2.3 Fast':      { t2v: 'hailuo/2-3-fast-text-to-video', i2v: 'hailuo/2-3-fast-image-to-video', default: 'hailuo/2-3-fast-text-to-video' },
  'Hailuo 02':            { t2v: 'hailuo/02-text-to-video-pro', i2v: 'hailuo/02-image-to-video-pro', default: 'hailuo/02-text-to-video-pro' },
  'Runway Gen-4 Turbo':   { t2v: 'runway/gen-4-turbo-text-to-video', i2v: 'runway/gen-4-turbo-image-to-video', default: 'runway/gen-4-turbo-text-to-video' },
  'Runway Aleph':         { t2v: 'runway/extend-ai-video', default: 'runway/extend-ai-video' },
  'Veo 3.1':              { t2v: 'google/veo-3.1', default: 'google/veo-3.1' },
  'Veo 3.1 Fast':         { t2v: 'google/veo-3.1-fast', default: 'google/veo-3.1-fast' },
  'OmniHuman 1.5':        { t2v: 'bytedance/omnihuman-1.5', default: 'bytedance/omnihuman-1.5' },
  'HappyHorse 1.0':       { t2v: 'happyhorse/text-to-video', i2v: 'happyhorse/image-to-video', default: 'happyhorse/text-to-video' },
  'Vidu Q2':              { t2v: 'vidu/q2-text-to-video', default: 'vidu/q2-text-to-video' },
  'Pixverse V5':          { t2v: 'pixverse/v5-text-to-video', default: 'pixverse/v5-text-to-video' },
  'Luma Ray3':            { t2v: 'luma/ray3-text-to-video', default: 'luma/ray3-text-to-video' },
};

/** Look up the Kie model ID for a DireX model name + mode */
export function getKieModelId(modelName: string, mode: string): string {
  const entry = KIE_MODEL_IDS[modelName];
  if (!entry) {
    console.warn(`[pricing] Unknown model: ${modelName}, using raw name`);
    return modelName;
  }
  if (mode.includes('image-to-image') && entry.i2i) return entry.i2i;
  if (mode.includes('text-to-image') && entry.t2i) return entry.t2i;
  if (mode.includes('image-to-video') && entry.i2v) return entry.i2v;
  if (mode.includes('text-to-video') && entry.t2v) return entry.t2v;
  return entry.default;
}

export interface ModelPricing {
  /** Kie model description (e.g. "seedream 5 Pro, text-to-image, 2K") */
  modelDescription: string;
  /** Provider name */
  provider: string;
  /** Interface type: image | video */
  interfaceType: 'image' | 'video';
  /** Kie credit price per unit */
  kieCredits: number;
  /** Credit unit (per image, per second, etc.) */
  creditUnit: string;
  /** Kie USD price per unit */
  kieUsd: number;
  /** Computed: DireX credits (Kie × 1.5, rounded to 1 decimal) */
  direxCredits: number;
  /** Computed: DireX USD (Kie × 1.5) */
  direxUsd: number;
  /** Anchor URL for model detail page on Kie.ai */
  anchor?: string;
  /** Discount rate from Kie's reference price */
  discountRate?: number;
}

// ── RAW KIE PRICING DATA (image + video models only) ──
// Extracted 2026-07 via Playwright from kie.ai/pricing
const KIE_RAW: Array<{
  modelDescription: string;
  interfaceType: string;
  provider: string;
  creditPrice: string;
  creditUnit: string;
  usdPrice: string;
  falPrice?: string;
  discountRate?: number;
  anchor?: string;
  discountPrice?: boolean;
}> = [
  // === ByteDance / Seedream (3 variants) ===
  {"modelDescription":"seedream 5 Pro, input image, First image free","interfaceType":"image","provider":"ByteDance","creditPrice":"0.5","creditUnit":"per image","usdPrice":"0.0025","discountRate":16.67,"anchor":"","discountPrice":false},
  {"modelDescription":"seedream 5 Pro, text-to-image, 2K","interfaceType":"image","provider":"ByteDance","creditPrice":"14","creditUnit":"per image","usdPrice":"0.07","discountRate":22.22,"anchor":"https://kie.ai/seedream-5-0-pro?model=seedream%2F5-pro-text-to-image","discountPrice":false},
  {"modelDescription":"seedream 5 Pro, text-to-image, 1K","interfaceType":"image","provider":"ByteDance","creditPrice":"7","creditUnit":"per image","usdPrice":"0.035","discountRate":22.22,"anchor":"https://kie.ai/seedream-5-0-pro?model=seedream%2F5-pro-text-to-image","discountPrice":false},
  {"modelDescription":"seedream 5 Pro, image-to-image, 2K","interfaceType":"image","provider":"ByteDance","creditPrice":"14","creditUnit":"per image","usdPrice":"0.07","discountRate":22.22,"anchor":"https://kie.ai/seedream-5-0-pro","discountPrice":false},
  {"modelDescription":"seedream 5 Pro, image-to-image, 1K","interfaceType":"image","provider":"ByteDance","creditPrice":"7","creditUnit":"per image","usdPrice":"0.035","discountRate":22.22,"anchor":"https://kie.ai/seedream-5-0-pro","discountPrice":false},
  {"modelDescription":"seedream 4.5, text-to-image, 4K","interfaceType":"image","provider":"ByteDance","creditPrice":"28","creditUnit":"per image","usdPrice":"0.14","discountRate":22.22,"anchor":"https://kie.ai/seedream-4-5-4k?model=seedream-4-5-4k%2Ftext-to-image","discountPrice":false},
  {"modelDescription":"seedream 4.5, image-to-image, 4K","interfaceType":"image","provider":"ByteDance","creditPrice":"28","creditUnit":"per image","usdPrice":"0.14","discountRate":22.22,"anchor":"https://kie.ai/seedream-4-5-4k","discountPrice":false},
  {"modelDescription":"seedream 5.0 Lite, text-to-image, 4K","interfaceType":"image","provider":"ByteDance","creditPrice":"4","creditUnit":"per image","usdPrice":"0.02","discountRate":0,"anchor":"","discountPrice":false},
  {"modelDescription":"seedream 5.0 Lite, text-to-image, 2K","interfaceType":"image","provider":"ByteDance","creditPrice":"2.5","creditUnit":"per image","usdPrice":"0.0125","discountRate":0,"anchor":"","discountPrice":false},
  {"modelDescription":"seedream 5.0 Lite, image-to-image, 4K","interfaceType":"image","provider":"ByteDance","creditPrice":"4","creditUnit":"per image","usdPrice":"0.02","discountRate":0,"anchor":"","discountPrice":false},
  {"modelDescription":"seedream 5.0 Lite, image-to-image, 2K","interfaceType":"image","provider":"ByteDance","creditPrice":"2.5","creditUnit":"per image","usdPrice":"0.0125","discountRate":0,"anchor":"","discountPrice":false},

  // === Google / Nano Banana (6 variants) ===
  {"modelDescription":"nano-banana-2-lite, text-to-image, 4K","interfaceType":"image","provider":"Google","creditPrice":"2","creditUnit":"per image","usdPrice":"0.01","discountRate":66.67,"anchor":"https://kie.ai/nano-banana-2-lite","discountPrice":false},
  {"modelDescription":"Google nano banana 2, text-to-image, 4K","interfaceType":"image","provider":"Google","creditPrice":"2","creditUnit":"per image","usdPrice":"0.01","discountRate":0,"anchor":"https://kie.ai/nano-banana-2","discountPrice":false},
  {"modelDescription":"Google nano banana 2, text-to-image, 2K","interfaceType":"image","provider":"Google","creditPrice":"1.5","creditUnit":"per image","usdPrice":"0.0075","discountRate":0,"anchor":"https://kie.ai/nano-banana-2","discountPrice":false},
  {"modelDescription":"Google nano banana 2, text-to-image, 1K","interfaceType":"image","provider":"Google","creditPrice":"1.2","creditUnit":"per image","usdPrice":"0.006","discountRate":0,"anchor":"https://kie.ai/nano-banana-2","discountPrice":false},
  {"modelDescription":"Google nano banana 2, image-to-image, 4K","interfaceType":"image","provider":"Google","creditPrice":"2","creditUnit":"per image","usdPrice":"0.01","discountRate":0,"anchor":"https://kie.ai/nano-banana-2","discountPrice":false},
  {"modelDescription":"Google nano banana 2, image-to-image, 2K","interfaceType":"image","provider":"Google","creditPrice":"1.5","creditUnit":"per image","usdPrice":"0.0075","discountRate":0,"anchor":"https://kie.ai/nano-banana-2","discountPrice":false},
  {"modelDescription":"Google nano banana 2, image-to-image, 1K","interfaceType":"image","provider":"Google","creditPrice":"1.2","creditUnit":"per image","usdPrice":"0.006","discountRate":0,"anchor":"https://kie.ai/nano-banana-2","discountPrice":false},
  {"modelDescription":"Google nano banana pro, text-to-image, 4K","interfaceType":"image","provider":"Google","creditPrice":"5","creditUnit":"per image","usdPrice":"0.025","discountRate":0,"anchor":"https://kie.ai/nano-banana-pro","discountPrice":false},
  {"modelDescription":"Google nano banana pro, text-to-image, 2K","interfaceType":"image","provider":"Google","creditPrice":"4","creditUnit":"per image","usdPrice":"0.02","discountRate":0,"anchor":"https://kie.ai/nano-banana-pro","discountPrice":false},
  {"modelDescription":"Google nano banana pro, image-to-image, 4K","interfaceType":"image","provider":"Google","creditPrice":"5","creditUnit":"per image","usdPrice":"0.025","discountRate":0,"anchor":"https://kie.ai/nano-banana-pro","discountPrice":false},
  {"modelDescription":"Google nano banana pro, image-to-image, 2K","interfaceType":"image","provider":"Google","creditPrice":"4","creditUnit":"per image","usdPrice":"0.02","discountRate":0,"anchor":"https://kie.ai/nano-banana-pro","discountPrice":false},
  {"modelDescription":"Google nano banana edit, text + image edit","interfaceType":"image","provider":"Google","creditPrice":"2","creditUnit":"per image","usdPrice":"0.01","discountRate":0,"anchor":"","discountPrice":false},
  {"modelDescription":"google imagen4","interfaceType":"image","provider":"Google","creditPrice":"10","creditUnit":"per image","usdPrice":"0.05","discountRate":0,"anchor":"","discountPrice":false},

  // === OpenAI / GPT Image (4 variants) ===
  {"modelDescription":"gpt image 2, text-to-image, 2K","interfaceType":"image","provider":"OpenAI","creditPrice":"13","creditUnit":"per image","usdPrice":"0.065","discountRate":13.33,"anchor":"https://kie.ai/gpt-image-2?model=gpt-image-2%2Ftext-to-image","discountPrice":false},
  {"modelDescription":"gpt image 2, text-to-image, 1K","interfaceType":"image","provider":"OpenAI","creditPrice":"8","creditUnit":"per image","usdPrice":"0.04","discountRate":20,"anchor":"https://kie.ai/gpt-image-2?model=gpt-image-2%2Ftext-to-image","discountPrice":false},
  {"modelDescription":"gpt image 2, image-to-image, 4K","interfaceType":"image","provider":"OpenAI","creditPrice":"20","creditUnit":"per image","usdPrice":"0.1","discountRate":16.67,"anchor":"https://kie.ai/gpt-image-2?model=gpt-image-2%2Fimage-to-image","discountPrice":false},
  {"modelDescription":"gpt image 2, image-to-image, 2K","interfaceType":"image","provider":"OpenAI","creditPrice":"13","creditUnit":"per image","usdPrice":"0.065","discountRate":13.33,"anchor":"https://kie.ai/gpt-image-2?model=gpt-image-2%2Fimage-to-image","discountPrice":false},
  {"modelDescription":"gpt image 2, image-to-image, 1K","interfaceType":"image","provider":"OpenAI","creditPrice":"8","creditUnit":"per image","usdPrice":"0.04","discountRate":20,"anchor":"https://kie.ai/gpt-image-2?model=gpt-image-2%2Fimage-to-image","discountPrice":false},
  {"modelDescription":"gpt image 1.5, text-to-image","interfaceType":"image","provider":"OpenAI","creditPrice":"4","creditUnit":"per image","usdPrice":"0.02","discountRate":0,"anchor":"https://kie.ai/gpt-image-1-5","discountPrice":false},
  {"modelDescription":"gpt image 1.5, image-to-image","interfaceType":"image","provider":"OpenAI","creditPrice":"4","creditUnit":"per image","usdPrice":"0.02","discountRate":0,"anchor":"","discountPrice":false},
  {"modelDescription":"OpenAI 4o image, text-to-image, 2K","interfaceType":"image","provider":"OpenAI 4o","creditPrice":"8","creditUnit":"per image","usdPrice":"0.04","discountRate":0,"anchor":"","discountPrice":false},
  {"modelDescription":"OpenAI 4o image, text-to-image, 1K","interfaceType":"image","provider":"OpenAI 4o","creditPrice":"5","creditUnit":"per image","usdPrice":"0.025","discountRate":0,"anchor":"","discountPrice":false},

  // === Grok (3 variants) ===
  {"modelDescription":"grok-imagine, text-to-image(quality)","interfaceType":"image","provider":"Grok","creditPrice":"5","creditUnit":"per 4 images","usdPrice":"0.025","discountRate":50,"anchor":"https://kie.ai/grok-imagine?model=grok-imagine%2Ftext-to-image","discountPrice":false},
  {"modelDescription":"grok-imagine, image-to-image","interfaceType":"image","provider":"Grok","creditPrice":"4","creditUnit":"per image","usdPrice":"0.02","discountRate":9.09,"anchor":"https://kie.ai/grok-imagine?model=grok-imagine%2Fimage-to-image","discountPrice":false},
  {"modelDescription":"grok-imagine, text-to-image","interfaceType":"image","provider":"Grok","creditPrice":"4.0","creditUnit":"per 6 images","usdPrice":"0.02","discountRate":0,"anchor":"https://kie.ai/grok-imagine?model=grok-imagine%2Ftext-to-video","discountPrice":false},

  // === Qwen (2 variants) ===
  {"modelDescription":"Qwen z-image, text-to-image, 2K","interfaceType":"image","provider":"Qwen","creditPrice":"5","creditUnit":"per image","usdPrice":"0.025","discountRate":0,"anchor":"","discountPrice":false},
  {"modelDescription":"Qwen z-image, text-to-image, 1K","interfaceType":"image","provider":"Qwen","creditPrice":"3","creditUnit":"per image","usdPrice":"0.015","discountRate":0,"anchor":"","discountPrice":false},
  {"modelDescription":"Qwen Image, text-to-image","interfaceType":"image","provider":"Qwen","creditPrice":"3","creditUnit":"per image","usdPrice":"0.015","discountRate":0,"anchor":"","discountPrice":false},
  {"modelDescription":"Qwen Image, image-to-image","interfaceType":"image","provider":"Qwen","creditPrice":"3","creditUnit":"per image","usdPrice":"0.015","discountRate":0,"anchor":"","discountPrice":false},

  // === Ideogram (3 variants) ===
  {"modelDescription":"ideogram v3, text-to-image, 2K","interfaceType":"image","provider":"Ideogram","creditPrice":"5","creditUnit":"per image","usdPrice":"0.025","discountRate":0,"anchor":"","discountPrice":false},
  {"modelDescription":"ideogram v3, text-to-image, 1K","interfaceType":"image","provider":"Ideogram","creditPrice":"2.5","creditUnit":"per image","usdPrice":"0.0125","discountRate":0,"anchor":"","discountPrice":false},
  {"modelDescription":"ideogram v3, image-to-image, 2K","interfaceType":"image","provider":"Ideogram","creditPrice":"5","creditUnit":"per image","usdPrice":"0.025","discountRate":0,"anchor":"","discountPrice":false},

  // === Black Forest Labs / Flux (3 variants) ===
  {"modelDescription":"Black Forest Labs flux-2 pro, text-to-image, 4K","interfaceType":"image","provider":"Black Forest Labs","creditPrice":"10","creditUnit":"per image","usdPrice":"0.05","discountRate":0,"anchor":"","discountPrice":false},
  {"modelDescription":"Black Forest Labs flux-2 pro, image-to-image, 4K","interfaceType":"image","provider":"Black Forest Labs","creditPrice":"10","creditUnit":"per image","usdPrice":"0.05","discountRate":0,"anchor":"","discountPrice":false},
  {"modelDescription":"Black Forest Labs Flux 2 Flex, text-to-image, 1K","interfaceType":"image","provider":"Black Forest Labs","creditPrice":"3","creditUnit":"per image","usdPrice":"0.015","discountRate":0,"anchor":"","discountPrice":false},

  // === Wan (2 variants) ===
  {"modelDescription":"wan 2.7 image pro, text-to-image, 2K","interfaceType":"image","provider":"Wan","creditPrice":"6","creditUnit":"per image","usdPrice":"0.03","discountRate":0,"anchor":"","discountPrice":false},
  {"modelDescription":"wan 2.7 image pro, image-to-image, 2K","interfaceType":"image","provider":"Wan","creditPrice":"6","creditUnit":"per image","usdPrice":"0.03","discountRate":0,"anchor":"","discountPrice":false},
  {"modelDescription":"wan 2.7 image, text-to-image, 1K","interfaceType":"image","provider":"Wan","creditPrice":"3","creditUnit":"per image","usdPrice":"0.015","discountRate":0,"anchor":"","discountPrice":false},

  // === Recraft (utility models) ===
  {"modelDescription":"Recraft Remove Background","interfaceType":"image","provider":"Recraft","creditPrice":"1","creditUnit":"per image","usdPrice":"0.005","discountRate":0,"anchor":"","discountPrice":false},
  {"modelDescription":"Recraft Crisp Upscale","interfaceType":"image","provider":"Recraft","creditPrice":"2","creditUnit":"per image","usdPrice":"0.01","discountRate":0,"anchor":"","discountPrice":false},

  // === Topaz ===
  {"modelDescription":"Topaz Image Upscaler, 1K→2K","interfaceType":"image","provider":"Topaz","creditPrice":"3","creditUnit":"per image","usdPrice":"0.015","discountRate":0,"anchor":"","discountPrice":false},
  {"modelDescription":"Topaz Image Upscaler, 1K→4K","interfaceType":"image","provider":"Topaz","creditPrice":"5","creditUnit":"per image","usdPrice":"0.025","discountRate":0,"anchor":"","discountPrice":false},
];

// ── COMPUTED PRICING ──
const DIREX_MARKUP = 1.6; // Kie × 1.6 (60% markup)

function buildPricing(): ModelPricing[] {
  return KIE_RAW.map(r => ({
    modelDescription: r.modelDescription,
    provider: r.provider,
    interfaceType: r.interfaceType as 'image' | 'video',
    kieCredits: Number(r.creditPrice),
    creditUnit: r.creditUnit,
    kieUsd: Number(r.usdPrice),
    direxCredits: Math.ceil(Number(r.creditPrice) * DIREX_MARKUP),
    direxUsd: Math.ceil(Number(r.usdPrice) * DIREX_MARKUP * 1000) / 1000,
    anchor: r.anchor,
    discountRate: r.discountRate,
  }));
}

const ALL_PRICING: ModelPricing[] = buildPricing();

// ── MODEL FAMILY DEFINITIONS (for UI display) ──

export interface ModelFamily {
  /** Display name in the UI */
  name: string;
  /** Provider ID sent to backend */
  providerId: string;
  /** Provider display name */
  provider: string;
  /** Type */
  type: 'image' | 'video';
  /** Available generation modes */
  modes: string[];
  /** Available resolutions */
  resolutions: string[];
  /** Badges shown in picker */
  badges: string[];
  /** Max resolution the model supports */
  maxResolution: string;
  /** Features / capabilities */
  features: string[];
  /** Whether this model is not yet available on Kie */
  upcoming?: boolean;
}

export const IMAGE_MODEL_FAMILIES: ModelFamily[] = [
  // ── Available on Kie ──
  {
    name: 'Nano Banana 2',
    providerId: 'nano-banana',
    provider: 'Google',
    type: 'image',
    modes: ['text-to-image', 'image-to-image'],
    resolutions: ['1K', '2K', '4K'],
    badges: ['推荐'],
    maxResolution: '4K',
    features: ['t2i', 'i2i', 'inpaint', 'multi-angle'],
  },
  {
    name: 'Nano Banana Pro',
    providerId: 'nano-banana-pro',
    provider: 'Google',
    type: 'image',
    modes: ['text-to-image', 'image-to-image'],
    resolutions: ['2K', '4K'],
    badges: ['专业'],
    maxResolution: '4K',
    features: ['t2i', 'i2i', 'inpaint'],
  },
  {
    name: 'Seedream 5 Pro',
    providerId: 'seedream-5-pro',
    provider: 'ByteDance',
    type: 'image',
    modes: ['text-to-image', 'image-to-image'],
    resolutions: ['1K', '2K'],
    badges: ['热门'],
    maxResolution: '2K',
    features: ['t2i', 'i2i'],
  },
  {
    name: 'GPT Image 2',
    providerId: 'gpt-image2',
    provider: 'OpenAI',
    type: 'image',
    modes: ['text-to-image', 'image-to-image'],
    resolutions: ['1K', '2K', '4K'],
    badges: ['热门'],
    maxResolution: '4K',
    features: ['t2i', 'i2i'],
  },
  {
    name: 'Grok Imagine',
    providerId: 'grok-imagine',
    provider: 'Grok',
    type: 'image',
    modes: ['text-to-image', 'image-to-image'],
    resolutions: ['1K'],
    badges: [],
    maxResolution: '1K',
    features: ['t2i', 'i2i'],
  },
  {
    name: 'Flux 2 Pro',
    providerId: 'flux-2-pro',
    provider: 'Black Forest Labs',
    type: 'image',
    modes: ['text-to-image', 'image-to-image'],
    resolutions: ['1K', '2K'],
    badges: [],
    maxResolution: '2K',
    features: ['t2i', 'i2i'],
  },
  {
    name: 'Wan 2.7 Image Pro',
    providerId: 'wan-2.7-image-pro',
    provider: 'Wan',
    type: 'image',
    modes: ['text-to-image', 'image-to-image'],
    resolutions: ['2K'],
    badges: [],
    maxResolution: '2K',
    features: ['t2i', 'i2i'],
  },
  {
    name: 'Imagen 4',
    providerId: 'imagen4',
    provider: 'Google',
    type: 'image',
    modes: ['text-to-image'],
    resolutions: ['4K'],
    badges: [],
    maxResolution: '4K',
    features: ['t2i'],
  },
  // ── 已发布但 Kie 未上架 ──
  {
    name: 'Qwen Image 3',
    providerId: 'qwen-image-3',
    provider: 'Alibaba',
    type: 'image',
    modes: ['text-to-image', 'image-to-image'],
    resolutions: ['1K', '2K'],
    badges: [],
    maxResolution: '2K',
    features: ['t2i', 'edit'],
    upcoming: true,
  },
  {
    name: 'Ideogram 4.0',
    providerId: 'ideogram-4',
    provider: 'Ideogram',
    type: 'image',
    modes: ['text-to-image', 'image-to-image'],
    resolutions: ['1K', '2K'],
    badges: [],
    maxResolution: '2K',
    features: ['t2i', 'i2i'],
    upcoming: true,
  },
];

// ── LOOKUP FUNCTIONS ──

/**
 * VERIFIED PRICING — source of truth, aligned with server/src/systems/ai/kie-pricing.ts.
 * Keys: model family name (lowercase) → resolution → Kie credits.
 * These override the scraped KIE_RAW data for models where the scrape was inaccurate.
 */
const VERIFIED_IMAGE_PRICES: Record<string, Record<string, number>> = {
  // Sourced from .tmp_kie_pricing.json (scraped from kie.ai/pricing) — 2026-08
  // DireX = Math.ceil(Kie × 1.6)
  'nano banana 2':     { '1K': 8,  '2K': 12, '4K': 18 },
  'nano banana pro':   { '2K': 18, '4K': 24 },
  'gpt image 2':       { '1K': 6,  '2K': 10, '4K': 16 },
  'seedream 5 pro':    { '1K': 7,  '2K': 14 },
  'grok-imagine':      { '1K': 4 },                              // flat per-pack, no resolution tiers
  'flux 2 pro':        { '1K': 5,  '2K': 7 },                    // NO 4K on Kie
  'flux 2 flex':       { '1K': 14, '2K': 24 },
  'wan 2.7 image pro': { '2K': 12 },                             // single tier on Kie
  'imagen4':           { '4K': 4 },                              // Fast variant
};

/**
 * Find the best matching pricing entry for a model family + mode + resolution.
 * Returns DireX credit cost.
 */
export function getImageCreditCost(
  modelFamily: string,
  mode: string,
  resolution: string,
): number {
  // Normalize inputs
  const resKey = resolution.toUpperCase();
  const modeKey = mode.toLowerCase().replace(/_/g, '-');
  const familyKey = modelFamily.toLowerCase();

  // 1. Check verified prices first (source of truth, matches server)
  const verified = VERIFIED_IMAGE_PRICES[familyKey];
  if (verified) {
    const kieCredits = verified[resKey] ?? verified[Object.keys(verified)[0]];
    if (kieCredits) return Math.ceil(kieCredits * DIREX_MARKUP);
  }

  // 2. Fallback: try exact match from scraped KIE_RAW
  let match = ALL_PRICING.find(p => {
    const desc = p.modelDescription.toLowerCase();
    const hasModel = desc.includes(familyKey);
    const hasMode = modeKey.includes('image-to-image')
      ? desc.includes('image-to-image')
      : desc.includes('text-to-image');
    const hasRes = desc.includes(resKey.toLowerCase());
    return hasModel && hasMode && hasRes;
  });

  // 3. Fallback: match by model family only (any mode/res)
  if (!match) {
    match = ALL_PRICING.find(p =>
      p.modelDescription.toLowerCase().includes(familyKey)
    );
  }

  if (!match) {
    console.warn(`[pricing] No match for ${modelFamily} / ${mode} / ${resolution}, using default`);
    return 10;
  }

  return match.direxCredits;
}

/**
 * Get Kie credit cost (before markup) for display.
 */
export function getKieCreditCost(
  modelFamily: string,
  mode: string,
  resolution: string,
): number {
  const match = ALL_PRICING.find(p => {
    const desc = p.modelDescription.toLowerCase();
    const hasModel = desc.includes(modelFamily.toLowerCase());
    const hasMode = mode.toLowerCase().includes('image-to-image')
      ? desc.includes('image-to-image')
      : desc.includes('text-to-image');
    const hasRes = desc.includes(resolution.toLowerCase());
    return hasModel && hasMode && hasRes;
  });
  return match?.kieCredits ?? 0;
}

/**
 * Get all pricing entries for a given model family.
 */
export function getModelPricingEntries(modelFamily: string): ModelPricing[] {
  return ALL_PRICING.filter(p =>
    p.modelDescription.toLowerCase().includes(modelFamily.toLowerCase())
  );
}

// ── DISPLAY HELPERS ──

/** Get credit cost for the old ImageGenerateNode API (model name + resolution + count) */
export function getImageCost(modelName: string, resolution: string, imgCount: number): number {
  // Map display name to model family key
  const nameMap: Record<string, string> = {
    'Nano Banana 2': 'nano banana 2',
    'Nano Banana Pro': 'nano banana pro',
    'GPT Image 2': 'gpt image 2',
    'Seedream 5 Pro': 'seedream 5 pro',
    'Grok Imagine': 'grok-imagine',
    'Flux 2 Pro': 'flux 2 pro',
    'Flux 2 Flex': 'flux 2 flex',
    'Wan 2.7 Image Pro': 'wan 2.7 image pro',
    'Imagen 4': 'imagen4',
  };

  const familyKey = nameMap[modelName] || modelName.toLowerCase();
  const cost = getImageCreditCost(familyKey, 'text-to-image', resolution);
  return Math.ceil(cost * imgCount);
}

/** Get USD cost for display purposes */
export function getImageUsdCost(modelName: string, resolution: string): number {
  const nameMap: Record<string, string> = {
    'Nano Banana': 'nano banana 2',
    'GPT Image2': 'gpt image 2',
  };
  const familyKey = nameMap[modelName] || modelName.toLowerCase();
  const match = ALL_PRICING.find(p =>
    p.modelDescription.toLowerCase().includes(familyKey) &&
    p.modelDescription.toLowerCase().includes(resolution.toLowerCase())
  );
  return match?.direxUsd ?? 0.05;
}

/** Build a compact label: "12cr (~$0.06)" */
export function formatCreditCost(modelName: string, resolution: string, imgCount: number): string {
  const credits = getImageCost(modelName, resolution, imgCount);
  const usd = getImageUsdCost(modelName, resolution) * imgCount;
  return `${credits}cr (~$${usd.toFixed(3)})`;
}

// ── VIDEO PRICING ──────────────────────────────────────
// Kie credit cost per second at 1080P (text-to-video, representative variant).
// Extracted 2026-08 from kie.ai/pricing. For models not in Kie market, estimates used.
// All values are Kie raw credits; DireX credits = Kie × DIREX_MARKUP (1.6×).

export interface VideoPricingEntry {
  modelName: string;
  kieCreditsPerSecond: number;  // Kie credits per second at 1080P (default display tier)
  kieUsdPerSecond: number;
  direxCreditsPerSecond: number;
  direxUsdPerSecond: number;
  // Per-resolution rate map. Keys: '480p'|'720p'|'1080p'|'4k'
  // Falls back to kieCreditsPerSecond if resolution not in map.
  crPerSecByRes: Record<string, number>;
  source: 'kie' | 'estimate';
}

interface VideoRawEntry {
  name: string;
  crPerSec: Record<string, number>; // resolution → cr/s
  src: 'kie' | 'estimate';
}

function buildVideoPricing(): Record<string, VideoPricingEntry> {
  // Aligned with server/src/systems/ai/kie-pricing.ts VIDEO_PRICES.
  // crPerSec is a map: { '480p': X, '720p': Y, '1080p': Z, ... }
  // 1080p rate is used for the flat display fields (backward compat).
  const raw: VideoRawEntry[] = [
    // Kling family — turbo t2v/i2v (same rate for both)
    { name: 'Kling 3.0',         crPerSec: { '480p': 14, '720p': 14, '1080p': 18 },                src: 'kie' },
    { name: 'Kling 3.0 V2V',     crPerSec: { '480p': 20, '720p': 20, '1080p': 27 },                src: 'kie' },
    { name: 'Kling 3.0 Omni',    crPerSec: { '480p': 18, '720p': 18, '1080p': 24 },                src: 'kie' },
    // Seedance family — t2v/i2v (no video input): higher rate at all resolutions
    { name: 'Seedance 2.0',      crPerSec: { '480p': 19, '720p': 41, '1080p': 102 },               src: 'kie' },
    // Seedance v2v (with video input): ~40% cheaper at all resolutions
    { name: 'Seedance 2.0 V2V',  crPerSec: { '480p': 11.5, '720p': 25, '1080p': 62 },             src: 'kie' },
    // Wan family — flat pricing across modes (480p=720p same rate)
    { name: 'Wan 2.7 Video',     crPerSec: { '480p': 16, '720p': 16, '1080p': 24 },                src: 'kie' },
  ];

  const out: Record<string, VideoPricingEntry> = {};
  for (const r of raw) {
    const cr1080 = r.crPerSec['1080p'] || Object.values(r.crPerSec)[0] || 20;
    const usd1080 = +(cr1080 * 0.005).toFixed(4); // 1 Kie cr = $0.005
    out[r.name] = {
      modelName: r.name,
      kieCreditsPerSecond: cr1080,
      kieUsdPerSecond: usd1080,
      direxCreditsPerSecond: Math.ceil(cr1080 * DIREX_MARKUP),
      direxUsdPerSecond: Math.round(usd1080 * DIREX_MARKUP * 10000) / 10000,
      crPerSecByRes: r.crPerSec,
      source: r.src,
    };
  }
  return out;
}

const VIDEO_PRICING: Record<string, VideoPricingEntry> = buildVideoPricing();

/** Normalize resolution string to pricing key */
function normalizeVideoRes(res?: string): string {
  if (!res) return '1080p';
  const r = res.toUpperCase();
  if (r === '1K' || r === '1024X1024') return '1k';
  if (r === '2K' || r === '1792X1024') return '2k';
  if (r === '4K' || r === '2048X2048') return '4k';
  return r.toLowerCase();
}

// ── Seedance 2.0 V2V Token-based Pricing (aligns with server) ──
const SEEDANCE_V2V_KIE_CR_PER_M_TOKENS = 784;
const SEEDANCE_TOKEN_FACTOR = 24 / 1024;

function getSeedanceV2VTokens(h: number, w: number, refDur: number, outDur: number): number {
  return (h * w * (refDur + outDur) * SEEDANCE_TOKEN_FACTOR);
}

function getSeedanceV2VDirexCost(h: number, w: number, refDur: number, outDur: number): number {
  const tokens = getSeedanceV2VTokens(h, w, refDur, outDur);
  const kieCr = (tokens / 1_000_000) * SEEDANCE_V2V_KIE_CR_PER_M_TOKENS;
  return Math.ceil(kieCr * DIREX_MARKUP);
}

function getSeedanceResDims(res?: string): { h: number; w: number } {
  switch ((res || '1080p').toLowerCase()) {
    case '480p': return { h: 854, w: 480 };
    case '720p': return { h: 1280, w: 720 };
    case '1080p': return { h: 1920, w: 1080 };
    case '4k': return { h: 3840, w: 2160 };
    default: return { h: 1920, w: 1080 };
  }
}

/**
 * Get DireX credit cost for a video generation.
 * @param modelName — display model name (e.g. 'Seedance 2.0', 'Kling 3.0')
 * @param durationSeconds — video duration in seconds
 * @param genMode — 't2v'|'i2v'|'motion'|'i2v-fl'|'multi-ref' (used for mode-specific pricing)
 * @param resolution — '480P'|'720P'|'1080P' (used for resolution-specific pricing)
 * @param refVideoDuration — total reference video duration in seconds (for Seedance V2V token pricing)
 */
export function getVideoCreditCost(
  modelName: string,
  durationSeconds: number,
  genMode?: string,
  resolution?: string,
  refVideoDuration?: number,
): number {
  // Seedance 2.0 V2V with known reference video duration → use token formula (exact)
  if (modelName === 'Seedance 2.0' &&
      (genMode === 'motion' || genMode === 'multi-ref') &&
      refVideoDuration && refVideoDuration > 0) {
    const { h, w } = getSeedanceResDims(normalizeVideoRes(resolution));
    return getSeedanceV2VDirexCost(h, w, refVideoDuration, durationSeconds);
  }

  // Select mode-specific pricing tier (flat rate fallback)
  let lookupName = modelName;
  if (genMode) {
    // Seedance 2.0: "motion" and "multi-ref" use video input → cheaper V2V tier
    if (modelName === 'Seedance 2.0' && (genMode === 'motion' || genMode === 'multi-ref')) {
      lookupName = 'Seedance 2.0 V2V';
    }
    // Kling 3.0: "motion" uses video-to-video → more expensive V2V tier
    if (modelName === 'Kling 3.0' && genMode === 'motion') {
      lookupName = 'Kling 3.0 V2V';
    }
  }

  const entry = VIDEO_PRICING[lookupName] || VIDEO_PRICING[modelName];
  if (!entry) {
    console.warn(`[pricing] No video pricing for "${lookupName}", using default 20cr/s`);
    return Math.ceil(20 * DIREX_MARKUP * durationSeconds);
  }

  // Resolution-aware: look up per-resolution rate, fall back to flat 1080p rate
  const resKey = normalizeVideoRes(resolution);
  const crPerSec = entry.crPerSecByRes[resKey] || entry.kieCreditsPerSecond;
  const direxPerSec = Math.ceil(crPerSec * DIREX_MARKUP);
  return Math.ceil(direxPerSec * durationSeconds);
}

/** Get all video pricing entries for display. */
export function getVideoPricingEntries(): VideoPricingEntry[] {
  return Object.values(VIDEO_PRICING);
}

/** Look up a single video pricing entry. */
export function getVideoPricing(modelName: string): VideoPricingEntry | undefined {
  return VIDEO_PRICING[modelName];
}

// ── EXPORT FOR OTHER CONSUMERS ──
export { ALL_PRICING, DIREX_MARKUP, VIDEO_PRICING };

// ── TEXT / LLM PRICING ─────────────────────────────────────
// Source: .tmp_kie_pricing.json — per-million-token rates on Kie
// Token estimation: CJK ≈ 1.5 chars/token, ASCII ≈ 4 chars/token
// Formula: Kie cr = (inTokens/M) × inputRate + (outTokens/M) × outputRate
//          DireX = ceil(Kie cr × 1.6)

export interface TextModelPricing {
  modelId: string;
  displayName: string;
  inputCrPerM: number;
  outputCrPerM: number;
}

export const TEXT_MODELS: TextModelPricing[] = [
  // GPT-5.x (primary for script analysis)
  { modelId: 'gpt-5.4',       displayName: 'GPT-5.4',       inputCrPerM: 140,  outputCrPerM: 1120 },
  { modelId: 'gpt-5.5',       displayName: 'GPT-5.5',       inputCrPerM: 280,  outputCrPerM: 1680 },
  { modelId: 'gpt-5.6-luna',  displayName: 'GPT-5.6 Luna',  inputCrPerM: 11.2, outputCrPerM: 67.2 },
  { modelId: 'gpt-5.6-terra', displayName: 'GPT-5.6 Terra', inputCrPerM: 112,  outputCrPerM: 672 },
  { modelId: 'gpt-5.6-sol',   displayName: 'GPT-5.6 Sol',   inputCrPerM: 280,  outputCrPerM: 1680 },
];

const TEXT_MODEL_MAP: Record<string, TextModelPricing> = {};
for (const m of TEXT_MODELS) TEXT_MODEL_MAP[m.modelId] = m;

/** Count CJK characters for token estimation */
function countCJK(text: string): number {
  return (text.match(/[一-鿿㐀-䶿぀-ゟ゠-ヿ가-힯]/g) || []).length;
}

/** Estimate token count: CJK ~1.5/tok, ASCII ~4/tok */
export function estimateTokens(text: string): number {
  const cjk = countCJK(text);
  const other = text.length - cjk;
  return Math.ceil(cjk / 1.5 + other / 4);
}

export interface TextCostEstimate {
  modelId: string;
  inputChars: number;
  inputTokens: number;
  estimatedOutputTokens: number;
  kieCredits: number;
  direxCredits: number;
}

/**
 * Estimate DireX credit cost for a text/LLM request.
 * @param modelId — Kie model ID
 * @param inputText — the prompt/input text
 * @param estimatedOutputTokens — override output tokens directly
 * @param outputRatio — output/input ratio (default: 0.25 = 25%)
 */
export function estimateTextCost(
  modelId: string,
  inputText: string,
  estimatedOutputTokens?: number,
  outputRatio?: number,
): TextCostEstimate {
  const model = TEXT_MODEL_MAP[modelId] || TEXT_MODEL_MAP['gpt-5.4'];
  const inputTokens = estimateTokens(inputText);
  const outTokens = estimatedOutputTokens ?? Math.ceil(inputTokens * (outputRatio ?? 0.25));

  const inputCr = (inputTokens / 1_000_000) * model.inputCrPerM;
  const outputCr = (outTokens / 1_000_000) * model.outputCrPerM;
  const kieCr = inputCr + outputCr;

  return {
    modelId,
    inputChars: inputText.length,
    inputTokens,
    estimatedOutputTokens: outTokens,
    kieCredits: Math.round(kieCr * 100) / 100,
    direxCredits: Math.ceil(kieCr * DIREX_MARKUP),
  };
}

/**
 * Format text cost as a display string: "~48cr (约800 tokens)"
 */
export function formatTextCost(estimate: TextCostEstimate): string {
  return `~${estimate.direxCredits}cr (${estimate.inputTokens}+${estimate.estimatedOutputTokens} tokens)`;
}
