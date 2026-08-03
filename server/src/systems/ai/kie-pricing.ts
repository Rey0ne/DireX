/* === Kie.ai Model Pricing Lookup ===
 *
 * Source of truth: Kie website pricing (creditPrice, creditUnit)
 * NOT the Kie API `creditsConsumed` field — that's an unrelated internal unit.
 *
 * Exchange rate: 1 Kie credit = $0.005 USD = 1 DireX credit (at par)
 * Markup: 1.6× → DireX credits = ceil(Kie credits × 1.6)
 *
 * Pricing data source: .tmp_kie_pricing.json (381 entries, scraped from Kie website)
 * Last verified: 2026-08-01
 */

export const IMAGE_DIREX_MARKUP = 2.0;  // 100% markup on image models
export const VIDEO_DIREX_MARKUP = 1.6;  // 60% markup on video models
export const TEXT_DIREX_MARKUP = 2.0;   // 100% markup on text/LLM models
export const USD_PER_KIECREDIT = 0.005;

export interface PricingEntry {
  /** Kie credit price (from website creditPrice field) */
  kieCredits: number;
  /** "per image" | "per second" | "per video" | "per request" | "per 4 images" | "per 6 images" */
  unit: string;
  /** USD equivalent at $0.005/credit */
  usdPrice: number;
  /** Resolved DireX credits (kieCredits × DIREX_MARKUP, with duration multiplier if per-second) */
  direxCredits: number;
}

// ─── IMAGE MODEL PRICING ──────────────────────────────────────────
// Key format: "modelId_resolution"
// Resolution keys: "1k" | "2k" | "4k" | "default"
// Special keys for quality-tiered models: "modelId_high" | "modelId_medium"

interface ImagePriceEntry { credits: number; unit: string; }

const IMAGE_PRICES: Record<string, ImagePriceEntry> = {
  // ── Nano Banana Pro ──
  // Source: .tmp_kie_pricing.json — "Google nano banana pro, 1/2K=18cr, 4K=24cr"
  'nano-banana-pro_1k':      { credits: 18, unit: 'per image' },
  'nano-banana-pro_2k':      { credits: 18, unit: 'per image' },
  'nano-banana-pro_4k':      { credits: 24, unit: 'per image' },
  'nano-banana-pro_default': { credits: 18, unit: 'per image' },

  // ── Nano Banana 2 ──
  // Source: .tmp_kie_pricing.json — "Google nano banana 2, 1K=8cr, 2K=12cr, 4K=18cr"
  'google/nano-banana_1k':   { credits: 8,  unit: 'per image' },
  'google/nano-banana_2k':   { credits: 12, unit: 'per image' },
  'google/nano-banana_4k':   { credits: 18, unit: 'per image' },
  'google/nano-banana_default': { credits: 8, unit: 'per image' },

  // ── GPT Image 2 ──
  // Source: .tmp_kie_pricing.json — t2i/i2i all same: 1K=6cr, 2K=10cr, 4K=16cr
  'gpt-image2_1k':           { credits: 6,  unit: 'per image' },
  'gpt-image2_2k':           { credits: 10, unit: 'per image' },
  'gpt-image2_4k':           { credits: 16, unit: 'per image' },
  'gpt-image2_default':      { credits: 6,  unit: 'per image' },

  // ── GPT Image 1.5 ──
  // ⚠️ We auto-inject quality: 'high' in kie-provider.ts → use HIGH pricing
  // Source: .tmp_kie_pricing.json — high=22cr, medium=4cr
  'gpt-image/1.5-text-to-image_1k':   { credits: 22, unit: 'per image' },
  'gpt-image/1.5-text-to-image_2k':   { credits: 22, unit: 'per image' },
  'gpt-image/1.5-text-to-image_4k':   { credits: 22, unit: 'per image' },
  'gpt-image/1.5-text-to-image_default': { credits: 22, unit: 'per image' },

  // ── Seedream 5 Pro ──
  // Source: .tmp_kie_pricing.json — 1K=7cr, 2K=14cr. No 4K tier on Kie.
  'seedream/5-pro-text-to-image_1k':  { credits: 7,  unit: 'per image' },
  'seedream/5-pro-text-to-image_2k':  { credits: 14, unit: 'per image' },
  'seedream/5-pro-text-to-image_default': { credits: 7, unit: 'per image' },

  // ── Seedream 4.5 ──
  // Source: .tmp_kie_pricing.json — 6.5cr flat (no resolution tiers)
  'seedream/4.5-text-to-image_1k':    { credits: 6.5, unit: 'per image' },
  'seedream/4.5-text-to-image_default': { credits: 6.5, unit: 'per image' },

  // ── Seedream 5 Lite ──
  // Source: .tmp_kie_pricing.json — 5.5cr flat (no resolution tiers)
  'seedream/5-lite-text-to-image_default': { credits: 5.5, unit: 'per image' },

  // ── Grok Imagine ──
  // Source: .tmp_kie_pricing.json — t2i=4cr/6 images, t2i(quality)=5cr/4 images, i2i=4cr/image
  // No resolution tiers on Kie. Flat per-pack pricing.
  'grok-imagine/text-to-image_1k':   { credits: 4, unit: 'per pack (up to 6)' },
  'grok-imagine/text-to-image_default': { credits: 4, unit: 'per pack (up to 6)' },

  // ── Flux 2 Pro ──
  // Source: .tmp_kie_pricing.json — 1K=5cr, 2K=7cr. NO 4K tier on Kie.
  'flux-2/pro-text-to-image_1k':    { credits: 5, unit: 'per image' },
  'flux-2/pro-text-to-image_2k':    { credits: 7, unit: 'per image' },
  'flux-2/pro-text-to-image_default': { credits: 5, unit: 'per image' },

  // ── Flux 2 Flex ──
  // Source: .tmp_kie_pricing.json — 1K=14cr, 2K=24cr
  'flux-2/flex-text-to-image_1k':   { credits: 14, unit: 'per image' },
  'flux-2/flex-text-to-image_2k':   { credits: 24, unit: 'per image' },
  'flux-2/flex-text-to-image_default': { credits: 14, unit: 'per image' },

  // ── Wan 2.7 Image Pro ──
  // Source: .tmp_kie_pricing.json — 12cr (no resolution tiers on Kie pricing, single tier)
  'wan/2-7-image-pro_1k':           { credits: 12, unit: 'per image' },
  'wan/2-7-image-pro_default':      { credits: 12, unit: 'per image' },

  // ── Imagen 4 ──
  // Source: .tmp_kie_pricing.json — Fast=4cr/request, default=8cr/request, Ultra=12cr/image
  // We use "Fast" variant (google/imagen4-fast model ID)
  'google/imagen4-fast_1k':         { credits: 4,  unit: 'per request' },
  'google/imagen4-fast_default':    { credits: 4,  unit: 'per request' },

  // ── Legacy / Not in current UI ──
  // 4o Image — removed from UI but keep server entry
  'gpt-image/1-text-to-image_1k':   { credits: 6, unit: 'per image' },
  'gpt-image/1-text-to-image_default': { credits: 6, unit: 'per image' },
  // Qwen Z-Image
  'qwen/text-to-image_1k':          { credits: 0.8, unit: 'per image' },
  'qwen/text-to-image_default':     { credits: 0.8, unit: 'per image' },
  // Qwen Image 2
  'qwen2/text-to-image_1k':         { credits: 5.6, unit: 'per image' },
  'qwen2/text-to-image_default':    { credits: 5.6, unit: 'per image' },
  // Ideogram V3
  'ideogram/v3-text-to-image_1k':   { credits: 7, unit: 'per image' },
  'ideogram/v3-text-to-image_default': { credits: 7, unit: 'per image' },

  // ── Utility / Special ──
  'recraft/remove-background_default': { credits: 4, unit: 'per image' },
  'recraft/crisp-upscale_default': { credits: 3, unit: 'per image' },
  'topaz/image-upscale_default': { credits: 6, unit: 'per image' },
};

// ─── AUDIO / SUNO PRICING ────────────────────────────────────────

interface AudioPriceEntry { credits: number; unit: string; }

const AUDIO_PRICES: Record<string, AudioPriceEntry> = {
  // Suno — Generate Music
  // Source: Suno, Generate Music = 12cr/request
  'suno': { credits: 12, unit: 'per request' },
  // Suno instrumental
  'suno-instrumental': { credits: 12, unit: 'per request' },
  // Default Suno
  'suno_default': { credits: 12, unit: 'per request' },
};

// ─── VIDEO MODEL PRICING ──────────────────────────────────────────
// Key format: "modelId_resolution"
// unit: "per second" (multiply by duration) or "per video" (fixed price per generation)

interface VideoPriceEntry { credits: number; unit: string; }

const VIDEO_PRICES: Record<string, VideoPriceEntry> = {
  // ── Kling 3.0 ──
  // Source: kling 3.0 turbo, t2v/i2v, 720P=18cr/s, 1080P=22.5cr/s
  // Kling uses same model ID for t2v/i2v — pricing is identical for both
  // ⚠️ Standard (non-turbo) without audio: 720P=14cr/s, 1080P=18cr/s
  'kling-video_480p':        { credits: 14, unit: 'per second' },
  'kling-video_720p':        { credits: 14, unit: 'per second' },
  'kling-video_1080p':       { credits: 18, unit: 'per second' },
  'kling-video_default':     { credits: 14, unit: 'per second' },
  // Motion control (v2v): more expensive than t2v/i2v — 20cr/s@720p, 27cr/s@1080p
  'kling-video-v2v_480p':    { credits: 20, unit: 'per second' },
  'kling-video-v2v_720p':    { credits: 20, unit: 'per second' },
  'kling-video-v2v_1080p':   { credits: 27, unit: 'per second' },
  'kling-video-v2v_default': { credits: 20, unit: 'per second' },

  // ── Kling 3.0 Omni ──
  // Source: kling 3.0 omni, text-to-video with native audio + editing
  // Estimated: ~30% premium over standard Kling 3.0 for Omni features
  'kling-3-omni/text-to-video_480p':  { credits: 18, unit: 'per second' },
  'kling-3-omni/text-to-video_720p':  { credits: 18, unit: 'per second' },
  'kling-3-omni/text-to-video_1080p': { credits: 24, unit: 'per second' },
  'kling-3-omni/text-to-video_default': { credits: 18, unit: 'per second' },

  // ── Kling 2.6 ──
  // Source: kling 2.6, text-to-video, without audio, 5.0s=55cr, 10.0s=110cr
  // ⚠️ per-video pricing: same price for all resolutions at a given duration
  'kling-2.6/text-to-video_480p':  { credits: 55,  unit: 'per video (5s)' },
  'kling-2.6/text-to-video_720p':  { credits: 55,  unit: 'per video (5s)' },
  'kling-2.6/text-to-video_1080p': { credits: 55,  unit: 'per video (5s)' },
  'kling-2.6/text-to-video_default': { credits: 55, unit: 'per video (5s)' },

  // ── Kling 2.5 Turbo ──
  // Source: kling 2.5 turbo, text-to-video, Turbo Pro, 5.0s=42cr, 10.0s=84cr
  'kling/v2-5-turbo-text-to-video-pro_480p':  { credits: 42, unit: 'per video (5s)' },
  'kling/v2-5-turbo-text-to-video-pro_720p':  { credits: 42, unit: 'per video (5s)' },
  'kling/v2-5-turbo-text-to-video-pro_1080p': { credits: 42, unit: 'per video (5s)' },
  'kling/v2-5-turbo-text-to-video-pro_default': { credits: 42, unit: 'per video (5s)' },

  // ── Kling 2.1 ──
  // Source: Kling 2.1, video-generation, Standard, 5.0s=25cr, 10.0s=50cr
  'kling/v2-1-master-text-to-video_480p':  { credits: 25, unit: 'per video (5s)' },
  'kling/v2-1-master-text-to-video_720p':  { credits: 25, unit: 'per video (5s)' },
  'kling/v2-1-master-text-to-video_1080p': { credits: 50, unit: 'per video (5s)' },
  'kling/v2-1-master-text-to-video_default': { credits: 25, unit: 'per video (5s)' },

  // ── Seedance 2.0 ──
  // Source: bytedance/seedance-2 — two pricing tiers based on video input presence.
  // "no video input" (t2v/i2v/i2v-fl — images only): higher rate
  // "with video input" (v2v/motion/multi-ref with video refs): ~40% cheaper
  'seedance-2_480p':         { credits: 19,   unit: 'per second' },
  'seedance-2_720p':         { credits: 41,   unit: 'per second' },
  'seedance-2_1080p':        { credits: 102,  unit: 'per second' },
  'seedance-2_4k':           { credits: 208,  unit: 'per second' },
  'seedance-2_default':      { credits: 41,   unit: 'per second' },
  // V2V tier — with video input (motion control, multi-ref with video refs). ~40% cheaper than t2v/i2v.
  'seedance-2-v2v_480p':     { credits: 11.5, unit: 'per second' },
  'seedance-2-v2v_720p':     { credits: 25,   unit: 'per second' },
  'seedance-2-v2v_1080p':    { credits: 62,   unit: 'per second' },
  'seedance-2-v2v_4k':       { credits: 128,  unit: 'per second' },
  'seedance-2-v2v_default':  { credits: 25,   unit: 'per second' },

  // ── Seedance 1.5 Pro ──
  // Source: bytedance/seedance-1.5-pro, without audio, 480P=1.75cr/s, 720P=3.5cr/s, 1080P=7.5cr/s
  'bytedance/seedance-1.5-pro_480p':  { credits: 1.75, unit: 'per second' },
  'bytedance/seedance-1.5-pro_720p':  { credits: 3.5,  unit: 'per second' },
  'bytedance/seedance-1.5-pro_1080p': { credits: 7.5,  unit: 'per second' },
  'bytedance/seedance-1.5-pro_default': { credits: 3.5, unit: 'per second' },

  // ── Wan 2.7 Video ──
  // Source: wan 2.7 video, text-to-video, 720p=16cr/s, 1080p=24cr/s
  'wan/2-7-text-to-video_480p':  { credits: 16, unit: 'per second' },
  'wan/2-7-text-to-video_720p':  { credits: 16, unit: 'per second' },
  'wan/2-7-text-to-video_1080p': { credits: 24, unit: 'per second' },
  'wan/2-7-text-to-video_default': { credits: 16, unit: 'per second' },

  // ── Wan 2.6 Video ──
  // Source: wan 2.6, text to video, 5.0s-720p=70cr, 5.0s-1080p=104.5cr
  'wan/2-6-text-to-video_480p':  { credits: 70,    unit: 'per video (5s)' },
  'wan/2-6-text-to-video_720p':  { credits: 70,    unit: 'per video (5s)' },
  'wan/2-6-text-to-video_1080p': { credits: 104.5, unit: 'per video (5s)' },
  'wan/2-6-text-to-video_default': { credits: 70,  unit: 'per video (5s)' },

  // ── Wan 2.5 Video ──
  // Source: wan 2.5, text-to-video, 5.0s-720p=60cr, 5.0s-1080p=100cr
  'wan/2-5-text-to-video_480p':  { credits: 60,  unit: 'per video (5s)' },
  'wan/2-5-text-to-video_720p':  { credits: 60,  unit: 'per video (5s)' },
  'wan/2-5-text-to-video_1080p': { credits: 100, unit: 'per video (5s)' },
  'wan/2-5-text-to-video_default': { credits: 60, unit: 'per video (5s)' },

  // ── Hailuo 02 ──
  // Source: hailuo 02, text-to-video, Standard, 6.0s-768p=30cr, 10.0s-768p=50cr, Pro 6.0s-1080p=57cr
  'hailuo/02-text-to-video-pro_480p':  { credits: 30, unit: 'per video (6s)' },
  'hailuo/02-text-to-video-pro_720p':  { credits: 30, unit: 'per video (6s)' },
  'hailuo/02-text-to-video-pro_1080p': { credits: 57, unit: 'per video (6s)' },
  'hailuo/02-text-to-video-pro_default': { credits: 30, unit: 'per video (6s)' },
};

// ─── TEXT / LLM MODEL PRICING ───────────────────────────────────────
// Source: .tmp_kie_pricing.json — per-million-token rates
// Kie charges separately for input and output tokens.
// Token estimation: CJK ≈ 1.5 chars/token, ASCII ≈ 4 chars/token
// Default output ratio assumption: 25% of input tokens (typical for analysis tasks)
//
// Formula: Kie cr = (inTokens/M) × inputRate + (outTokens/M) × outputRate
//          DireX = ceil(Kie cr × 1.6)

interface TextModelPriceEntry { inputCrPerM: number; outputCrPerM: number; }

const TEXT_MODEL_PRICES: Record<string, TextModelPriceEntry> = {
  // GPT-5.x family (primary models for script analysis)
  'gpt-5.4':       { inputCrPerM: 140,  outputCrPerM: 1120 },
  'gpt-5.5':       { inputCrPerM: 280,  outputCrPerM: 1680 },
  'gpt-5.6-luna':  { inputCrPerM: 11.2, outputCrPerM: 67.2 },
  'gpt-5.6-terra': { inputCrPerM: 112,  outputCrPerM: 672 },
  'gpt-5.6-sol':   { inputCrPerM: 280,  outputCrPerM: 1680 },
  // Claude family
  'claude-opus-5':  { inputCrPerM: 400,  outputCrPerM: 2000 },
  'claude-sonnet-5':{ inputCrPerM: 170,  outputCrPerM: 855 },
  'claude-haiku-4.5':{ inputCrPerM: 55,  outputCrPerM: 285 },
  // Gemini family
  'gemini-3-flash': { inputCrPerM: 30,   outputCrPerM: 180 },
  'gemini-3-pro':   { inputCrPerM: 100,  outputCrPerM: 700 },
  'gemini-3.6-flash':{ inputCrPerM: 90,  outputCrPerM: 450 },
  // Grok family
  'grok-4-3':      { inputCrPerM: 100,  outputCrPerM: 200 },
  // Default / unknown
  'default':       { inputCrPerM: 100,  outputCrPerM: 700 },
};

// ── Token estimation ─────────────────────────────────────────────────

/** Count CJK (Chinese/Japanese/Korean) characters in text */
function countCJK(text: string): number {
  return (text.match(/[一-鿿㐀-䶿぀-ゟ゠-ヿ가-힯]/g) || []).length;
}

/** Estimate token count from text.
 *  CJK: ~1.7 tokens/char (GPT tokenizers use 1-2 tokens per Chinese character)
 *  ASCII/other: ~0.25 tokens/char (~4 chars/token, ~1.3 tokens/word)
 *  Verified against actual Kie.ai GPT-5.6 Sol usage: 13,602-char script = ~23,000 input tokens.
 *  This is an approximation — actual tokenization varies by model tokenizer.
 */
export function estimateTokens(text: string): number {
  const cjk = countCJK(text);
  const other = text.length - cjk;
  return Math.ceil(cjk * 1.7 + other / 4);
}

// ── Text pricing lookup ──────────────────────────────────────────────

export interface TextPricingResult extends PricingEntry {
  inputTokens: number;
  estimatedOutputTokens: number;
  inputCr: number;
  outputCr: number;
  modelId: string;
}

/**
 * Calculate Kie credit cost for a text/LLM request.
 * @param modelId — Kie model ID (e.g. 'gpt-5.4', 'gpt-5.6-sol')
 * @param inputText — the prompt/input text
 * @param estimatedOutputTokens — override output token estimate (default: 50% of input tokens)
 */
export function getTextKiePrice(
  modelId: string,
  inputText: string,
  estimatedOutputTokens?: number,
): TextPricingResult {
  const prices = TEXT_MODEL_PRICES[modelId] || TEXT_MODEL_PRICES['default'];
  const inputTokens = estimateTokens(inputText);
  const outTokens = estimatedOutputTokens ?? Math.ceil(inputTokens * 0.5);

  const inputCr = (inputTokens / 1_000_000) * prices.inputCrPerM;
  const outputCr = (outTokens / 1_000_000) * prices.outputCrPerM;
  const totalCr = inputCr + outputCr;

  return {
    modelId,
    inputTokens,
    estimatedOutputTokens: outTokens,
    inputCr: +inputCr.toFixed(4),
    outputCr: +outputCr.toFixed(4),
    kieCredits: +totalCr.toFixed(4),
    unit: 'per request',
    usdPrice: +(totalCr * USD_PER_KIECREDIT).toFixed(4),
    direxCredits: Math.ceil(totalCr * TEXT_DIREX_MARKUP),
  };
}

/**
 * Calculate Kie credit cost for script/full-pipeline analysis.
 * Script analysis generates ~1.4-1.5× output (shots + characters + scenes + music prompts).
 * Verified against 13,602-char script consuming 62.41 Kie credits via GPT-5.6 Sol.
 */
export function getScriptAnalysisKiePrice(
  modelId: string,
  inputText: string,
): TextPricingResult {
  const inputTokens = estimateTokens(inputText);
  // Script analysis output is ~144% of input (verified: 13602-char → ~33K out tokens)
  const outTokens = Math.ceil(inputTokens * 1.44);
  return getTextKiePrice(modelId, inputText, outTokens);
}

/**
 * Convenience: returns just the DireX credit cost for a text request.
 */
export function getTextDirexCost(
  modelId: string,
  inputText: string,
  estimatedOutputTokens?: number,
): number {
  return getTextKiePrice(modelId, inputText, estimatedOutputTokens).direxCredits;
}

// ─── Lookup functions ─────────────────────────────────────────────

function normalizeRes(resolution?: string): string {
  if (!resolution) return 'default';
  const r = resolution.toUpperCase();
  if (r === '1K' || r === '1024X1024') return '1k';
  if (r === '2K' || r === '1792X1024') return '2k';
  if (r === '4K' || r === '2048X2048') return '4k';
  if (r === '480P' || r === '854X480') return '480p';
  if (r === '720P' || r === '1280X720') return '720p';
  if (r === '1080P' || r === '1920X1080') return '1080p';
  return r.toLowerCase();
}

function makeEntry(credits: number, unit: string, markup: number = VIDEO_DIREX_MARKUP): PricingEntry {
  return {
    kieCredits: credits,
    unit,
    usdPrice: +(credits * USD_PER_KIECREDIT).toFixed(4),
    direxCredits: Math.ceil(credits * markup),
  };
}

function lookupPrice(
  prices: Record<string, ImagePriceEntry | VideoPriceEntry>,
  modelId: string,
  resolution?: string,
): ImagePriceEntry | VideoPriceEntry {
  const lowerModel = modelId.toLowerCase();
  const res = normalizeRes(resolution);

  // Exact match: modelId_resolution
  const exactKey = `${lowerModel}_${res}`;
  if (prices[exactKey]) return prices[exactKey];

  // Fallback: modelId_default
  const defaultKey = `${lowerModel}_default`;
  if (prices[defaultKey]) return prices[defaultKey];

  // Ultimate fallback
  return { credits: 10, unit: 'per image' };
}

/**
 * Get Kie credit price for an image generation.
 */
export function getImageKiePrice(modelId: string, resolution?: string): PricingEntry {
  const entry = lookupPrice(IMAGE_PRICES, modelId, resolution);
  return makeEntry(entry.credits, entry.unit, IMAGE_DIREX_MARKUP);
}

// ── Seedance 2.0 V2V Token-based Pricing ─────────────────────────
// Seedance 2.0 bills by tokens under the hood, not flat per-second.
// Formula: tokens = (H × W × (refVideoDuration + outputDuration) × 24) / 1024
// Source: Volcengine direct API pricing — 28 CNY/M tokens (with video input) × 0.14 USD/CNY ÷ 0.005 USD/Kie cr = 784 Kie cr/M
// This is much more accurate than Kie's simplified "62cr/s" listing for V2V.

const SEEDANCE_V2V_KIE_CR_PER_M_TOKENS = 784;
const SEEDANCE_TOKEN_FACTOR = 24 / 1024;

function getSeedanceResolutionDims(resolution?: string): { h: number; w: number } {
  const res = (resolution || '1080p').toLowerCase();
  switch (res) {
    case '480p': return { h: 854, w: 480 };
    case '720p': return { h: 1280, w: 720 };
    case '1080p': return { h: 1920, w: 1080 };
    case '4k': return { h: 3840, w: 2160 };
    default: return { h: 1920, w: 1080 };
  }
}

/**
 * Calculate Kie credits for Seedance 2.0 V2V using the actual token formula.
 * @param resolution — '480p'|'720p'|'1080p'|'4k'
 * @param refVideoDuration — total seconds of reference/input video
 * @param outputDuration — desired output video duration in seconds
 */
function getSeedanceV2VTokenKieCr(resolution: string, refVideoDuration: number, outputDuration: number): number {
  const { h, w } = getSeedanceResolutionDims(resolution);
  const totalDuration = refVideoDuration + outputDuration;
  const tokens = (h * w * totalDuration * 24) / 1024;
  const kieCr = (tokens / 1_000_000) * SEEDANCE_V2V_KIE_CR_PER_M_TOKENS;
  return kieCr;
}

/**
 * Get Kie credit price for a video generation.
 * Handles mode-specific pricing tiers: different per-second rates for t2v vs v2v.
 * - Seedance 2.0 V2V: uses token formula when refVideoDuration is available (most accurate)
 * - Seedance 2.0: "with video input" (v2v) is ~40% cheaper than "no video" (t2v)
 * - Kling 3.0: motion control (v2v) is ~20% more expensive than turbo (t2v/i2v)
 * @param genMode — 't2v'|'i2v'|'motion'|'i2v-fl'|'multi-ref'
 * @param durationSeconds — video duration in seconds (default 5)
 * @param refVideoDuration — total reference video duration in seconds (for Seedance V2V token pricing)
 */
export function getVideoKiePrice(
  modelId: string,
  resolution?: string,
  durationSeconds?: number,
  genMode?: string,
  refVideoDuration?: number,
): PricingEntry {
  const duration = durationSeconds || 5;
  let lookupModelId = modelId.toLowerCase();

  // Seedance 2.0 V2V with reference video duration → use token formula (most accurate)
  if ((lookupModelId === 'bytedance/seedance-2' || lookupModelId === 'seedance-2') &&
      (genMode === 'motion' || genMode === 'multi-ref') &&
      refVideoDuration && refVideoDuration > 0) {
    const kieCr = getSeedanceV2VTokenKieCr(resolution || '1080p', refVideoDuration, duration);
    return makeEntry(kieCr, `per token (${refVideoDuration}s ref + ${duration}s out)`);
  }

  // Select pricing tier based on genMode (fallback when refVideoDuration unavailable)
  if (genMode) {
    // Seedance 2.0: "motion" and "multi-ref" modes use video input → cheaper V2V tier
    if ((lookupModelId === 'bytedance/seedance-2' || lookupModelId === 'seedance-2') &&
        (genMode === 'motion' || genMode === 'multi-ref')) {
      lookupModelId = lookupModelId + '-v2v';
    }
    // Kling 3.0: "motion" mode uses video-to-video → more expensive "-v2v" tier
    if ((lookupModelId === 'kling-3.0/video' || lookupModelId === 'kling-video') &&
        genMode === 'motion') {
      lookupModelId = lookupModelId + '-v2v';
    }
  }

  const entry = lookupPrice(VIDEO_PRICES, lookupModelId, resolution);

  const baseCredits = entry.unit === 'per second'
    ? entry.credits * duration
    : entry.credits;

  return makeEntry(baseCredits, entry.unit);
}

/**
 * Get Kie credit price for Suno/audio generation.
 */
export function getAudioKiePrice(providerId?: string): PricingEntry {
  const key = (providerId || 'suno').toLowerCase();
  const entry = AUDIO_PRICES[key] || AUDIO_PRICES['suno_default'] || { credits: 12, unit: 'per request' };
  return makeEntry(entry.credits, entry.unit);
}

/**
 * One-stop lookup: returns DireX credit cost for any model.
 * @param modelId — Kie model ID (e.g. 'gpt-image2', 'kling-video')
 * @param mode — generation mode (e.g. 'text-to-image', 'text-to-video')
 * @param resolution — '1K'|'2K'|'4K'|'480P'|'720P'|'1080P'
 * @param duration — video duration in seconds
 * @param genMode — 't2v'|'i2v'|'motion'|'i2v-fl'|'multi-ref' (used for seedance-2 tier selection)
 * @param refVideoDuration — total reference video duration in seconds (for Seedance V2V token pricing)
 */
export function getDirexCost(
  modelId: string,
  mode: string,
  resolution?: string,
  duration?: number,
  genMode?: string,
  refVideoDuration?: number,
): PricingEntry {
  const isVideo = mode?.includes('video')
    || modelId.includes('video')
    || modelId.includes('/text-to-video')
    || modelId.includes('/image-to-video');

  if (isVideo) {
    return getVideoKiePrice(modelId, resolution, duration, genMode, refVideoDuration);
  }
  return getImageKiePrice(modelId, resolution);
}
