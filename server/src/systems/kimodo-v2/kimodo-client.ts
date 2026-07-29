/* === Kimodo v2 — Python Server HTTP Client ===
 * Wraps fetch calls to the Kimodo Python server.
 * Supports both v1 (port 8000) and optional v2 (port 8001).
 * Serializes requests to avoid GPU OOM (concurrency = 1).
 *
 * When v2 is available on port 8001:
 *   - /generate-advanced with multi_prompt + constraint_lst
 *   - Native multi-segment (no TS-side blending needed)
 *   - Native constraint support (root_path, keyframes, end_effectors)
 */

import type { KimodoV2Capabilities } from './types.js';

// ── Configuration ────────────────────────────────

const KIMODO_V1_URL = process.env.KIMODO_URL || 'http://127.0.0.1:8000';
const KIMODO_V2_URL = process.env.KIMODO_V2_URL || 'http://127.0.0.1:8001';

// ── Concurrency limiter — serializes GPU access ──

let _queue: Promise<void> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const task = _queue.then(fn, fn);
  _queue = task.then(() => {}, () => {});
  return task;
}

// ── v2 availability cache ────────────────────────

let _v2Available: boolean | null = null;
let _v2CheckTime = 0;

async function isV2Available(): Promise<boolean> {
  if (_v2Available !== null && Date.now() - _v2CheckTime < 30_000) {
    return _v2Available;
  }
  try {
    const resp = await fetch(`${KIMODO_V2_URL}/health`, { signal: AbortSignal.timeout(3000) });
    _v2Available = resp.ok;
  } catch {
    _v2Available = false;
  }
  _v2CheckTime = Date.now();
  return _v2Available;
}

// ── Types ────────────────────────────────────────

export interface KimodoGenerateParams {
  prompt: string;
  numFrames: number;
  denoisingSteps: number;
  seed: number;
  firstHeadingAngle: number;
}

export interface KimodoGenerateResult {
  bvhBase64: string;
  posedJoints: number[][][];
  jointNames: string[];
  numFrames: number;
  fps: number;
  generationTimeS: number;
  seedUsed: number;
}

export interface KimodoAdvancedParams {
  prompt?: string;
  segments?: { prompt: string; durationFrames: number }[];
  numFrames?: number;
  denoisingSteps?: number;
  seed?: number;
  firstHeadingAngle?: number;
  numSamples?: number;
  rootPath?: { frames: number[]; positionsXz: [number, number][] };
  keyframes?: {
    frame: number;
    jointRotations: Record<string, number[]>;
    rootPosition?: [number, number, number];
    fillMode?: string;
  }[];
  endEffectorPins?: {
    joint: string;
    position: [number, number, number];
    frameRange: [number, number];
  }[];
  numTransitionFrames?: number;
  postProcessing?: boolean;
}

// ── v1 generate ──────────────────────────────────

export async function callKimodoGenerate(
  params: KimodoGenerateParams,
  timeoutMs = 600_000,
): Promise<KimodoGenerateResult> {
  return enqueue(async () => {
    const resp = await fetch(`${KIMODO_V1_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: params.prompt,
        num_frames: params.numFrames,
        num_denoising_steps: params.denoisingSteps,
        seed: params.seed != null ? params.seed : -1,
        first_heading_angle: params.firstHeadingAngle || 0.0,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Kimodo generate failed: HTTP ${resp.status} — ${errText.slice(0, 300)}`);
    }

    const data = await resp.json();

    return {
      bvhBase64: data.bvh_base64,
      posedJoints: data.posed_joints?.[0] ?? data.posed_joints,
      jointNames: data.joint_names,
      numFrames: data.num_frames,
      fps: data.fps,
      generationTimeS: data.generation_time_s,
      seedUsed: data.seed_used,
    };
  });
}

// ── v2 advanced generate ─────────────────────────

/**
 * Call Kimodo v2 /generate-advanced when available.
 * Falls back to v1 if v2 is not running.
 */
export async function callKimodoAdvanced(
  params: KimodoAdvancedParams,
  timeoutMs = 600_000,
): Promise<KimodoGenerateResult> {
  const useV2 = await isV2Available();

  return enqueue(async () => {
    if (useV2) {
      const body: any = {
        prompt: params.prompt,
        num_frames: params.numFrames || 90,
        num_denoising_steps: params.denoisingSteps || 50,
        seed: params.seed != null ? params.seed : -1,
        first_heading_angle: params.firstHeadingAngle ?? 0,
        num_samples: params.numSamples || 1,
        num_transition_frames: params.numTransitionFrames || 5,
        post_processing: params.postProcessing || false,
      };

      if (params.segments && params.segments.length > 0) {
        body.segments = params.segments.map(s => ({
          prompt: s.prompt,
          duration_frames: s.durationFrames,
        }));
      }
      if (params.rootPath) {
        body.root_path = {
          frames: params.rootPath.frames,
          positions_xz: params.rootPath.positionsXz,
        };
      }
      if (params.keyframes) {
        body.keyframes = params.keyframes;
      }
      if (params.endEffectorPins) {
        body.end_effector_pins = params.endEffectorPins.map(p => ({
          joint: p.joint,
          position: p.position,
          frame_range: p.frameRange,
        }));
      }

      const resp = await fetch(`${KIMODO_V2_URL}/generate-advanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Kimodo v2 generate-advanced failed: HTTP ${resp.status} — ${errText.slice(0, 300)}`);
      }

      const data = await resp.json();
      return {
        bvhBase64: data.bvh_base64,
        posedJoints: data.posed_joints?.[0] ?? data.posed_joints,
        jointNames: data.joint_names,
        numFrames: data.num_frames,
        fps: data.fps,
        generationTimeS: data.generation_time_s,
        seedUsed: data.seed_used,
      };
    }

    // Fallback to v1
    const prompt = params.prompt || params.segments?.[0]?.prompt || 'walking';
    const numFrames = params.numFrames || params.segments?.[0]?.durationFrames || 90;

    console.log('[kimodo-v2] v2 not available, falling back to v1 for:', prompt.slice(0, 60));

    return callKimodoGenerate({
      prompt,
      numFrames,
      denoisingSteps: params.denoisingSteps || 50,
      seed: params.seed != null ? params.seed : -1,
      firstHeadingAngle: params.firstHeadingAngle ?? 0,
    }, timeoutMs);
  });
}

// ── Health checks ────────────────────────────────

export interface V1Health {
  status: 'healthy' | 'unreachable';
  gpu?: string;
  vramUsedGb?: number;
  vramTotalGb?: number;
  modelLoaded?: boolean;
  modelLoadTimeS?: number;
  error?: string;
}

export interface V2Health {
  status: 'healthy' | 'unreachable' | 'disabled';
  reason?: string;
  version?: string;
  capabilities?: Record<string, boolean>;
}

export interface KimodoHealth {
  status: 'ok' | 'degraded' | 'down';
  v1: V1Health;
  v2: V2Health;
  capabilities: KimodoV2Capabilities;
}

export async function checkHealth(): Promise<KimodoHealth> {
  // Check v1
  let v1: V1Health = { status: 'unreachable' };
  try {
    const resp = await fetch(`${KIMODO_V1_URL}/health`, { signal: AbortSignal.timeout(5000) });
    if (resp.ok) {
      const data = await resp.json();
      v1 = {
        status: 'healthy',
        gpu: data.gpu_name,
        vramUsedGb: data.gpu_mem_used_gb,
        vramTotalGb: data.gpu_mem_total_gb,
        modelLoaded: data.model_loaded,
        modelLoadTimeS: data.model_load_time_s,
      };
    } else {
      v1 = { status: 'unreachable', error: `HTTP ${resp.status}` };
    }
  } catch (e: any) {
    v1 = { status: 'unreachable', error: e.message?.slice(0, 100) };
  }

  // Check v2 (optional)
  let v2: V2Health = { status: 'disabled' };
  if (KIMODO_V2_URL !== KIMODO_V1_URL) {
    try {
      const resp = await fetch(`${KIMODO_V2_URL}/health`, { signal: AbortSignal.timeout(3000) });
      if (resp.ok) {
        const data = await resp.json();
        v2 = {
          status: 'healthy',
          version: data.version,
          capabilities: data.capabilities,
        };
      } else {
        v2 = { status: 'unreachable', reason: `HTTP ${resp.status}` };
      }
    } catch (e: any) {
      v2 = { status: 'unreachable', reason: e.message?.slice(0, 100) };
    }
  }

  const v2ok = v2.status === 'healthy';

  const capabilities: KimodoV2Capabilities = {
    blending: true,
    pathGuidance: true,
    variants: true,
    keyframePins: v2ok,
    endEffectorPinning: v2ok,
    customSkeleton: true,
  };

  const overall =
    v1.status === 'healthy' ? 'ok' :
    v2ok ? 'degraded' :
    'down';

  return { status: overall, v1, v2, capabilities };
}
