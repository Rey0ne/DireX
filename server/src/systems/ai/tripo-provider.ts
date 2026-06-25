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
  mode: 'text-to-model' | 'image-to-model';
  prompt?: string;
  input?: string;
  model?: string;
  model_seed?: number;
  face_limit?: number;
  texture?: boolean;
  pbr?: boolean;
  texture_quality?: 'standard' | 'detailed' | 'extreme';
  auto_size?: boolean;
  compress?: 'geometry';
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
  if (req.input !== undefined) body.input = req.input;
  if (req.model !== undefined) body.model = req.model;
  if (req.model_seed !== undefined) body.model_seed = req.model_seed;
  if (req.face_limit !== undefined) body.face_limit = req.face_limit;
  if (req.texture !== undefined) body.texture = req.texture;
  if (req.pbr !== undefined) body.pbr = req.pbr;
  if (req.texture_quality !== undefined) body.texture_quality = req.texture_quality;
  if (req.auto_size !== undefined) body.auto_size = req.auto_size;
  if (req.compress !== undefined) body.compress = req.compress;

  const resp = await tripoFetch(`${BASE_URL}/generation/${req.mode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  const json = await resp.json();
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

// ─── Download model ──────────────────────────────
export async function downloadModel(modelUrl: string, destPath: string): Promise<string> {
  const resp = await fetch(modelUrl);
  if (!resp.ok) throw new Error(`Download failed: HTTP ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());
  const { writeFileSync } = await import('fs');
  writeFileSync(destPath, buffer);
  return destPath;
}
