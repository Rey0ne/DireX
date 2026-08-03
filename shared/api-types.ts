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
  refVideoDuration?: number;  // total duration of reference videos in seconds (for Seedance V2V token pricing)
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
    // Image — Nano Banana family
    'Nano Banana':        'google/nano-banana',
    'Nano Banana 2':      'google/nano-banana',
    'Nano Banana Pro':    'nano-banana-pro',
    // Image — GPT family
    'GPT Image2':         'gpt-image-2-text-to-image',
    'GPT Image2 I2I':     'gpt-image-2-image-to-image',
    'GPT Image 2':        'gpt-image-2-text-to-image',
    // Image — Seedream family
    'Seedream 5 Pro':     'seedream/5-pro-text-to-image',
    // Image — Other
    'Grok Imagine':       'grok-imagine/text-to-image',
    'Flux 2 Pro':         'flux-2/pro-text-to-image',
    'Flux 2 Flex':        'flux-2/flex-text-to-image',
    'Wan 2.7 Image Pro':  'wan/2-7-image-pro',
    'Imagen 4':           'google/imagen4-fast',
    // Image — Utility
    'Recraft 抠图':        'recraft/remove-background',
    'Recraft 放大':        'recraft/crisp-upscale',
    'Topaz 放大':          'topaz/image-upscale',
    // Video — Kling family
    'Kling 3.0':          'kling-3.0/video',
    'Kling 3.0 Omni':     'kling-3-omni/text-to-video',
    // Video — Seedance family
    'Seedance 2.0':       'bytedance/seedance-2',
    // Video — Wan family
    'Wan 2.7 Video':      'wan/2-7-text-to-video',
    // Audio
    'Suno v4':            'suno-v4',
    'Udio':               'udio',
    'Stable Audio':       'stable-audio',
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
  refVideoDuration?: number;  // total duration of reference videos in seconds (for Seedance V2V token pricing)
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
  phone?: string;              // 脱敏后（如 +86 138****1234）
  nickname: string;
  accountType: 'individual' | 'company';
  companyCode?: string;
  plan: 'free' | 'creator' | 'pro' | 'elite' | 'ultra' | 'pro_base' | 'pro_mid' | 'pro_high' | 'pro_pro' | 'pro_max';
  credits: number;
  createdAt?: string;
}

// ── 身份证件类型 ──
export type IdType =
  | 'cn-id'        // 中国居民身份证
  | 'us-ssn'       // 美国社会安全号
  | 'ja-mynumber'  // 日本个人番号
  | 'de-pa'        // 德国身份证
  | 'fr-cni'       // 法国身份证
  | 'it-ci'        // 意大利身份证
  | 'passport';    // 护照（国际通用）

export const ID_TYPE_LABELS: Record<IdType, string> = {
  'cn-id': '居民身份证',
  'us-ssn': 'Social Security Number',
  'ja-mynumber': 'マイナンバー',
  'de-pa': 'Personalausweis',
  'fr-cni': 'Carte Nationale d\'Identité',
  'it-ci': 'Carta d\'Identità',
  'passport': 'Passport / 护照',
};

export interface RegisterRequest {
  // 注册方式（二选一）
  email?: string;
  phone?: string;
  phoneCountry?: string;    // 国际区号，如 '+86'
  password: string;

  // 必填 — 所有用户
  nickname: string;
  accountType: 'individual' | 'company';

  // 个人用户必填
  idType?: IdType;
  idNumber?: string;
  realName?: string;
  address?: string;

  // 公司用户必填
  companyCode?: string;
}

export interface LoginRequest {
  account: string;           // email 或 phone
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: UserProfile;
  error?: string;
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
