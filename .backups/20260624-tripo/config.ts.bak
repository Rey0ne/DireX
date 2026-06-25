/* === Server Config === */
/* .env + persisted keys + agent profile */
import 'dotenv/config';
import { readJSON, writeJSON } from './systems/db/store.js';

const CONFIG_PATH = 'data/agent-config.json';

// ─── Key labels ────────────────────────────────
export const KEY_LABELS: Record<string, string> = {
  HTTP_PROXY: 'HTTP 代理地址',
  KIE_BASE_URL: 'Kie.ai 基础 URL',
  KIE_API_KEY: 'Kie.ai API Key',
  DEEPSEEK_API_KEY: 'DeepSeek V4 Pro (官方)',
  GEMINI_API_KEY: 'Gemini 3 Pro (Kie.ai)',
  TRIPO_API_KEY: 'Tripo3D API Key',
};

// ─── Agent Profile ─────────────────────────────
const DEFAULT_PROFILE = {
  name: 'TapNow 助手',
  avatar: '🤖',
  translationStyle: 'cinematic',
  defaultModel: 'nano-banana',
  defaultResolution: '2K',
  promptEnhancement: true,
  systemPrompt: 'You are a professional cinematography prompt engineer. Deeply analyze the Chinese scene description and compose a detailed, cinematic English image-generation prompt.',
  polishPrompt: 'You are a world-class prompt refinement specialist. Polish the draft prompt to cinematic perfection while preserving artistic intent.',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

let _profile: any = null;
let _profileTime = 0;

export function getProfile(): any {
  if (_profile && Date.now() - _profileTime < 5000) return _profile;
  _profile = { ...DEFAULT_PROFILE, ...readJSON(CONFIG_PATH) };
  _profileTime = Date.now();
  return _profile;
}

export function updateProfile(patch: Record<string, unknown>): any {
  const current = getProfile();
  const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
  writeJSON(CONFIG_PATH, updated);
  _profile = updated;
  _profileTime = Date.now();
  return updated;
}

// ─── Persisted Keys ────────────────────────────
export function loadKeys(): void {
  const profile = getProfile();
  const keys = profile._keys || {};
  for (const [k, v] of Object.entries(keys)) {
    if (v && !process.env[k]) process.env[k] = v as string;
  }
  if (Object.keys(keys).length > 0) console.log(`[config] Loaded ${Object.keys(keys).length} persisted keys`);
}

export function persistKey(envVar: string, value: string): void {
  const profile = getProfile();
  if (!profile._keys) profile._keys = {};
  profile._keys[envVar] = value;
  updateProfile({ _keys: profile._keys });
}

export function clearPersistedKey(envVar: string): void {
  const profile = getProfile();
  if (profile._keys) { delete profile._keys[envVar]; updateProfile({ _keys: profile._keys }); }
}

// ─── Hidden Keys ───────────────────────────────
export function getHiddenKeys(): string[] {
  return getProfile().hiddenKeys || [];
}

export function hideKeySlot(envVar: string): void {
  const hidden = getHiddenKeys();
  if (!hidden.includes(envVar)) updateProfile({ hiddenKeys: [...hidden, envVar] });
  clearPersistedKey(envVar);
}

export function restoreKeySlot(envVar: string): void {
  updateProfile({ hiddenKeys: getHiddenKeys().filter((k: string) => k !== envVar) });
}
