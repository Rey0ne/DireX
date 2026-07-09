/* === Shared API Types === */
/* Imported by both frontend (src/api/gateway.ts) and backend (server/src/) */

export interface GenerateRequest {
  providerId: string;
  mode?: 'text-to-image' | 'image-to-image';  // for GPT Image2 variants
  prompt: string;
  negativePrompt?: string;
  aspect?: string;
  resolution?: string;
  referenceImage?: string;  // base64 or URL for image-to-image (primary)
  referenceUrls?: string[]; // multiple reference images
  maskImage?: string;       // base64 mask for inpainting
  styleImageUrl?: string;
  duration?: string;   // video: "5s", "8s", "10s"
  videoUrls?: string[]; // video URLs for motion reference (Kling/Seedance)
  seed?: number;
  // Kling-specific
  characterOrientation?: 'image' | 'video';
  keepOriginalSound?: boolean;
  // Seedance-specific
  fixedCamera?: boolean;
  generateAudio?: boolean;
  webSearch?: boolean;
  // Ref mode
  genMode?: string;  // 't2v'|'i2v'|'motion'|'i2v-fl'|'multi-ref'
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  // Audio (Suno)
  instrumental?: boolean; // true=纯音乐, false=人声
  lyrics?: string;        // 歌词文本（人声模式下作为 prompt 发送）
  // Audio (ElevenLabs)
  voice?: string;         // ElevenLabs 语音 ID
  language?: string;      // 语言代码（如 zh/en/ja），默认自动检测
  stability?: number;     // 稳定性 0.0 | 0.5 | 1.0
  dialogue?: { text: string; voice: string }[]; // ElevenLabs multi-dialogue
  clientTaskId?: string;    // for video: client's polling task ID
}

export interface GenerateResult {
  success: boolean;
  assetUrls: string[];
  cost: number;
  durationMs: number;
  seed: number;
  error?: string;
  taskId?: string;
  needsPoll?: boolean;
}

// ─── Provider IDs ──────────────────────────────
// Image models
// Video models
// Audio

export const PROVIDER_IDS = [
  // Image
  'nano-banana',
  'gpt-image2',
  // Video
  'kling-video',
  'seedance-2',
] as const;

export type ProviderId = typeof PROVIDER_IDS[number];

/** Map UI display model names → provider IDs */
export function mapModelNameToProviderId(modelName: string): string {
  const map: Record<string, string> = {
    // Image
    'Nano Banana': 'nano-banana',
    'GPT Image2': 'gpt-image2',
    'GPT Image2 I2I': 'gpt-image2',
    // Video
    'Kling 2.1': 'kling-video',
    'Kling 3.0': 'kling-video',
    'Seedance 2.0': 'seedance-2',
    // Audio
    'Suno v4': 'suno-v4',
    'Udio': 'udio',
    'Stable Audio': 'stable-audio',
    'ElevenLabs Dialogue v3': 'elevenlabs-text-to-dialogue-v3',
  };
  return map[modelName] || modelName.toLowerCase().replace(/\s+/g, '-');
}

// ─── Agent types ──────────────────────────────────

export interface AgentConfig {
  name: string;
  avatar: string;
  translationStyle: 'literal' | 'cinematic' | 'technical' | 'literary';
  defaultModel: string;
  defaultResolution: string;
  promptEnhancement: boolean;
  systemPrompt: string;       // DeepSeek system prompt for understanding
  polishPrompt: string;       // Gemini system prompt for final polish/translation
  createdAt: string;
  updatedAt: string;
}

export interface CompileRequest {
  shot?: Record<string, string>;
  rawText?: string;
  style?: string;
}

export interface CompiledPrompt {
  en: string;
  cn: string;
  negative: string;
  debug: { field: string; contribution: string }[];
}

export interface AgentGenerateRequest {
  shot?: Record<string, string>;
  rawText?: string;
  providerId: string;
  mode?: 'text-to-image' | 'image-to-image';
  aspect?: string;
  resolution?: string;
  referenceImage?: string;
  maskImage?: string;       // base64 mask for inpainting
  referenceUrls?: string[];
  styleImageUrl?: string;
  videoUrls?: string[];     // video URLs for motion reference (Kling/Seedance)
  duration?: string;        // video duration: "5s", "8s", etc.
  // Kling-specific
  characterOrientation?: 'image' | 'video';
  keepOriginalSound?: boolean;
  // Seedance-specific
  fixedCamera?: boolean;
  generateAudio?: boolean;
  webSearch?: boolean;
  // Ref mode
  genMode?: string;  // 't2v'|'i2v'|'motion'|'i2v-fl'|'multi-ref'
  firstFrameUrl?: string;
  lastFrameUrl?: string;
  referencePrompts?: string[];
  // Camera kit
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  filmStock?: string;
  // Visual extraction mode: 'character' | 'prop' | 'scene' | 'auto'
  extractMode?: string;
}

export interface AgentGenerateResult {
  compiled: CompiledPrompt;
  result: {
    success: boolean;
    assetUrls: string[];
    cost: number;
    durationMs: number;
    seed: number;
    error?: string;
    taskId?: string;
    needsPoll?: boolean;
  };
}

export interface UserProfile {
  userId: string;
  email: string;
  plan: 'free' | 'creator' | 'pro' | 'elite' | 'ultra' | 'pro_base' | 'pro_mid' | 'pro_high' | 'pro_pro' | 'pro_max';
  credits: number;
}

export interface KeyStatus {
  key: string;
  label: string;
  configured: boolean;
  masked: string;
}

export interface GenerationLog {
  id: string;
  timestamp: string;
  providerId: string;
  prompt: string;
  compiledPrompt?: string;
  status: 'succeeded' | 'failed';
  assetUrls: string[];
  credits: number;
  durationMs: number;
  error?: string;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'signup_bonus' | 'plan_monthly' | 'topup_pack' | 'spend_image' | 'spend_video' | 'spend_audio' | 'spend_3d' | string;
  description: string;
  balanceAfter: number;
  createdAt: string;
}

// ── 小Q API Response Types ──────────────────────

export interface QProjectResponse {
  project: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    scriptText: string;
    canvasNodeCount: number;
    progress: {
      shotsGenerated: number;
      totalShots: number;
      totalCreditsSpent: number;
      avgGenerationMs: number;
    };
    sessions: {
      id: string;
      startedAt: string;
      endedAt: string | null;
    }[];
  };
  completionRate: number;
  openDeviations: {
    total: number;
    violations: number;
    deviations: number;
    discrepancies: number;
    criticalThreshold: boolean;
  };
  memoryStats: {
    episodic: number;
    semantic: number;
    reflective: number;
  };
}

export interface QDeviationResponse {
  deviations: {
    id: string;
    projectId: string;
    shotNumber: number;
    severity: 'DISCREPANCY' | 'DEVIATION' | 'VIOLATION';
    category: string;
    expected: string;
    observed: string;
    suggestion: string;
    assetUrls: string[];
    nodeId: string | null;
    status: 'open' | 'acknowledged' | 'resolved' | 'autofixed';
    detectedAt: string;
    resolvedAt: string | null;
  }[];
  total: number;
}

export interface QNotification {
  id: string;
  type: 'GENERATION_COMPLETE' | 'GENERATION_FAILED' | 'DEVIATION_DETECTED' | 'PROGRESS_UPDATE' | 'PIPELINE_COMPLETE' | 'SYSTEM_ALERT' | 'SUGGESTION';
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  body: string;
  actionable: boolean;
  actionId: string | null;
  actionLabel: string | null;
  sound: string | null;
  timestamp: string;
  read: boolean;
}

export interface QMemoryStats {
  episodic: { total: number; unconsolidated: number; oldestEntry: string };
  semantic: { total: number; byType: Record<string, number> };
  reflective: { total: number; byType: Record<string, number> };
}

export interface QProgressResponse {
  progress: {
    shotsGenerated: number;
    totalShots: number;
    totalCreditsSpent: number;
    avgGenerationMs: number;
  };
  completionRate: number;
  openDeviations: number;
}
