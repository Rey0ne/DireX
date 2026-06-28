/* === Tripo3D AI Provider === */
const BASE_URL = process.env.TRIPO_BASE_URL || 'https://openapi.tripo3d.ai/v3';

let _proxyAgentClass: any = undefined;
let _proxyAgentLoaded = false;

async function getProxyAgent(): Promise<any> {
  if (_proxyAgentLoaded) return _proxyAgentClass;
  _proxyAgentLoaded = true;
  try { const undici = await import("undici"); _proxyAgentClass = undici.ProxyAgent; }
  catch (e: any) { console.log("[tripo] undici import failed:", e.message); }
  return _proxyAgentClass;
}

async function tripoFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
  if (proxy) {
    const ProxyAgent = await getProxyAgent();
    if (ProxyAgent) {
      return fetch(url, { ...options, dispatcher: new ProxyAgent(proxy) } as any);
    }
  }
  return fetch(url, options);
}

function getApiKey(): string | undefined {
  return process.env.TRIPO_API_KEY;
}

// ─── Types ───────────────────────────────────────
export interface TripoRequest {
  mode: 'text-to-model' | 'image-to-model' | 'multiview-to-model';
  prompt?: string;
  input?: string;
  inputs?: string[];       // multiview: [front, left, back, right] URLs
  model?: string;
  model_seed?: number;
  face_limit?: number;
  texture?: boolean;
  pbr?: boolean;
  texture_quality?: 'standard' | 'detailed' | 'extreme';
  auto_size?: boolean;
  compress?: 'geometry';
  format?: string;       // glb, fbx, obj, usd, stl, 3mf
}

export interface TripoTaskResult {
  task_id: string;
  status: string;
  progress: number;
  output?: { model_url?: string; rendered_image_url?: string };
  credits_consumed?: number;
  error?: string;
}

// ─── Submit ──────────────────────────────────────
export async function submitTask(req: TripoRequest): Promise<{ task_id: string }> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Tripo API Key not configured');

  const body: Record<string, unknown> = {};
  if (req.prompt !== undefined) body.prompt = req.prompt;
  if (req.mode === 'multiview-to-model' && req.inputs?.length) {
    body.inputs = req.inputs;  // positional: [front, left, back, right]
  } else if (req.input !== undefined) {
    body.input = req.input;
  }
  if (req.model !== undefined) body.model = req.model;
  if (req.model_seed !== undefined) body.model_seed = req.model_seed;
  if (req.face_limit !== undefined) body.face_limit = req.face_limit;
  if (req.texture !== undefined) body.texture = req.texture;
  if (req.pbr !== undefined) body.pbr = req.pbr;
  if (req.texture_quality !== undefined) body.texture_quality = req.texture_quality;
  if (req.auto_size !== undefined) body.auto_size = req.auto_size;
  if (req.compress !== undefined) body.compress = req.compress;

  const url = `${BASE_URL}/generation/${req.mode}`;
  const payload = JSON.stringify(body);
  console.log('[tripo] POST', url, payload.slice(0, 300));
  const resp = await tripoFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: payload,
  });
  const json = await resp.json();
  console.log('[tripo] Response:', JSON.stringify(json).slice(0, 300));
  if (json.code !== 0) throw new Error(`Tripo error (${json.code}): ${json.message}`);
  return { task_id: json.data.task_id };
}

// ─── Poll ────────────────────────────────────────
export async function pollTask(taskId: string, intervalMs = 2000, timeoutMs = 300000): Promise<TripoTaskResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Tripo API Key not configured');
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, intervalMs));
    const resp = await tripoFetch(`${BASE_URL}/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const json = await resp.json();
    if (json.code !== 0) throw new Error(`Tripo poll error: ${json.message}`);
    const task = json.data;
    if (task.status === 'success') {
      return { task_id: task.task_id, status: 'success', progress: 100, output: task.output, credits_consumed: task.credits_consumed };
    }
    if (['failed','cancelled','banned','expired'].includes(task.status)) {
      return { task_id: task.task_id, status: task.status, progress: task.progress||0, error: `Task ${task.status}` };
    }
  }
  throw new Error(`Tripo task ${taskId} timed out`);
}

// ─── Rig Types ────────────────────────────────────
export type RigType = 'biped' | 'quadruped' | 'hexapod' | 'octopod' | 'avian' | 'serpentine' | 'aquatic';

export interface RigCheckResult {
  task_id: string;         // rig-check task ID
  status: string;
  output?: {
    riggable?: boolean;
    rig_type?: RigType;
  };
  error?: string;
}

export const RIG_TYPE_LABELS: Record<RigType, string> = {
  biped: '双足人形',
  quadruped: '四足动物',
  hexapod: '六足生物',
  octopod: '八足生物',
  avian: '鸟类/有翼',
  serpentine: '蛇形',
  aquatic: '鱼类/水生',
};

// Animation presets per rig model version
export const ANIMATION_PRESETS: Record<string, string[]> = {
  'v2.5-20260210': [
    'preset:idle', 'preset:walk', 'preset:run', 'preset:dive', 'preset:climb',
    'preset:jump', 'preset:slash', 'preset:shoot', 'preset:hurt', 'preset:fall',
    'preset:turn', 'preset:quadruped:walk', 'preset:hexapod:walk',
    'preset:octopod:walk', 'preset:serpentine:march', 'preset:aquatic:march',
  ],
  'v1.0-20240301': [
    'preset:idle', 'preset:walk', 'preset:run', 'preset:dive', 'preset:climb',
    'preset:jump', 'preset:slash', 'preset:shoot', 'preset:hurt', 'preset:fall', 'preset:turn',
  ],
};

// ─── Rig Check ────────────────────────────────────
export async function checkRig(input: string): Promise<{ task_id: string }> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Tripo API Key not configured');

  const body = { input };
  const resp = await tripoFetch(`${BASE_URL}/animations/rig-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const json = await resp.json();
  console.log('[tripo] Rig-check response:', JSON.stringify(json).slice(0, 300));
  if (json.code !== 0) throw new Error(`Tripo rig-check error (${json.code}): ${json.message}`);
  return { task_id: json.data.task_id };
}

// ─── Auto Rig ─────────────────────────────────────
export async function submitRig(params: {
  input: string;
  model?: string;
  rig_type?: RigType;
  spec?: 'tripo' | 'mixamo';
  out_format?: 'glb' | 'fbx';
}): Promise<{ task_id: string }> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Tripo API Key not configured');

  const body: Record<string, unknown> = { input: params.input };
  if (params.model) body.model = params.model;
  if (params.rig_type) body.rig_type = params.rig_type;
  if (params.spec) body.spec = params.spec;
  if (params.out_format) body.out_format = params.out_format;

  const resp = await tripoFetch(`${BASE_URL}/animations/rig`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const json = await resp.json();
  console.log('[tripo] Rig response:', JSON.stringify(json).slice(0, 300));
  if (json.code !== 0) throw new Error(`Tripo rig error (${json.code}): ${json.message}`);
  return { task_id: json.data.task_id };
}

// ─── Animation Retarget ───────────────────────────
export async function retargetAnimation(params: {
  input: string;
  animation?: string;
  animations?: string[];
  out_format?: 'glb' | 'fbx';
  bake_animation?: boolean;
  export_with_geometry?: boolean;
  animate_in_place?: boolean;
}): Promise<{ task_id: string }> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Tripo API Key not configured');

  const body: Record<string, unknown> = { input: params.input };
  if (params.animation) body.animation = params.animation;
  if (params.animations) body.animations = params.animations;
  if (params.out_format) body.out_format = params.out_format;
  if (params.bake_animation !== undefined) body.bake_animation = params.bake_animation;
  if (params.export_with_geometry !== undefined) body.export_with_geometry = params.export_with_geometry;
  if (params.animate_in_place !== undefined) body.animate_in_place = params.animate_in_place;

  const resp = await tripoFetch(`${BASE_URL}/animations/retarget`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const json = await resp.json();
  console.log('[tripo] Retarget response:', JSON.stringify(json).slice(0, 300));
  if (json.code !== 0) throw new Error(`Tripo retarget error (${json.code}): ${json.message}`);
  return { task_id: json.data.task_id };
}

// ─── Download model ──────────────────────────────
export async function downloadModel(modelUrl: string, destPath: string): Promise<string> {
  const resp = await fetch(modelUrl);
  if (!resp.ok) throw new Error(`Download failed: HTTP ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  const { writeFileSync } = await import('fs');
  writeFileSync(destPath, buffer);
  return destPath;
}
