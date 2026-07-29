/* === Kimodo API Gateway ===
 * Self-contained API layer for Kimodo motion generation.
 * All Kimodo frontend→backend calls live here, not in the shared gateway.ts.
 */

import { BACKEND_URL } from './config';
import { getSharedApiKey } from './gateway';

// ─── Types ────────────────────────────────────────

export interface KimodoApiWaypoint {
  x: number;
  z: number;
  frameAllocation: number;
}

export interface KimodoPathResult {
  sessionId: string;
  bvhBase64?: string;
  blendedBvhBase64?: string;
  posedJoints?: number[][][];
  jointNames?: string[];
  totalFrames?: number;
  fps?: number;
  durationSeconds?: number;
  pathMetadata?: { waypoints: { x: number; y: number; z: number }[]; segmentDistances: number[]; segmentHeadingAngles: number[]; segmentFrames: number[] };
  totalGenerationTimeS?: number;
  error?: string;
}

export interface KimodoVariantItem {
  variantId: string;
  seedUsed: number;
  numFrames: number;
  generationTimeS: number;
  bvhUrl: string;
  previewFrame?: number[][];
  fileSizeBytes?: number;
}

export interface KimodoVariantsResult {
  sessionId: string;
  numVariants: number;
  variants: KimodoVariantItem[];
  totalGenerationTimeS: number;
  error?: string;
}

export interface KimodoAcceptResult {
  acceptedVariantId: string;
  promotedBvhUrl: string;
  sessionId: string;
  error?: string;
}

export interface SkeletonCompatReport {
  compatible: boolean;
  mappedJoints: number;
  unmappedJoints: number;
  missingSomaskel77Joints: number;
  canRetarget: boolean;
}

export interface UploadSkeletonResult {
  skeletonId: string;
  label: string;
  jointCount: number;
  jointNames: string[];
  bvhUrl: string;
  fileSizeBytes: number;
  createdAt: string;
  somaskel77Compat: SkeletonCompatReport;
  error?: string;
}

export interface SkeletonListItem {
  skeletonId: string;
  label?: string;
  jointCount: number;
  bvhUrl: string;
  fileSizeBytes: number;
  createdAt: string;
  somaskel77Compat: SkeletonCompatReport;
}

// ─── API Functions ─────────────────────────────────

/** POST /api/kimodo-v2/generate-path — path-guided motion generation */
export async function generateKimodoPath(params: {
  prompt: string;
  waypoints: KimodoApiWaypoint[];
  totalFrames?: number;
  blendFrames?: number;
}): Promise<KimodoPathResult> {
  const url = BACKEND_URL ? `${BACKEND_URL}/api/kimodo-v2/generate-path` : '/api/kimodo-v2/generate-path';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getSharedApiKey()}`,
      },
      body: JSON.stringify({
        prompt: params.prompt,
        waypoints: params.waypoints.map(w => ({ x: w.x, y: w.z, z: 0 })),
        totalFrames: params.totalFrames,
        blendFrames: params.blendFrames || 20,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      return { sessionId: '', error: `Server ${response.status}: ${text.slice(0, 200)}` };
    }
    return await response.json() as KimodoPathResult;
  } catch (err) {
    return { sessionId: '', error: String(err) };
  }
}

/** POST /api/kimodo-v2/generate-variants — N-variant batch */
export async function generateKimodoVariants(params: {
  prompt: string;
  numVariants: number;
  numFrames?: number;
}): Promise<KimodoVariantsResult> {
  const url = BACKEND_URL ? `${BACKEND_URL}/api/kimodo-v2/generate-variants` : '/api/kimodo-v2/generate-variants';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getSharedApiKey()}`,
      },
      body: JSON.stringify({
        prompt: params.prompt,
        numVariants: params.numVariants,
        numFrames: params.numFrames || 90,
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      return { sessionId: '', numVariants: 0, variants: [], totalGenerationTimeS: 0, error: `Server ${response.status}: ${text.slice(0, 200)}` };
    }
    return await response.json() as KimodoVariantsResult;
  } catch (err) {
    return { sessionId: '', numVariants: 0, variants: [], totalGenerationTimeS: 0, error: String(err) };
  }
}

/** POST /api/kimodo-v2/accept-variant — accept one variant */
export async function acceptKimodoVariant(sessionId: string, variantId: string): Promise<KimodoAcceptResult> {
  const url = BACKEND_URL ? `${BACKEND_URL}/api/kimodo-v2/accept-variant` : '/api/kimodo-v2/accept-variant';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getSharedApiKey()}`,
      },
      body: JSON.stringify({ sessionId, variantId }),
    });
    if (!response.ok) {
      const text = await response.text();
      return { acceptedVariantId: '', promotedBvhUrl: '', sessionId: '', error: `Server ${response.status}: ${text.slice(0, 200)}` };
    }
    return await response.json() as KimodoAcceptResult;
  } catch (err) {
    return { acceptedVariantId: '', promotedBvhUrl: '', sessionId: '', error: String(err) };
  }
}

/** POST /api/kimodo-v2/reject-variant — reject one variant */
export async function rejectKimodoVariant(sessionId: string, variantId: string): Promise<{ rejectedVariantId: string; remainingVariants: string[]; error?: string }> {
  const url = BACKEND_URL ? `${BACKEND_URL}/api/kimodo-v2/reject-variant` : '/api/kimodo-v2/reject-variant';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getSharedApiKey()}`,
      },
      body: JSON.stringify({ sessionId, variantId }),
    });
    if (!response.ok) {
      const text = await response.text();
      return { rejectedVariantId: '', remainingVariants: [], error: `Server ${response.status}: ${text.slice(0, 200)}` };
    }
    return await response.json();
  } catch (err) {
    return { rejectedVariantId: '', remainingVariants: [], error: String(err) };
  }
}

/** POST /api/kimodo-v2/upload-skeleton — upload custom BVH skeleton */
export async function uploadKimodoSkeleton(
  file: File,
  label?: string,
): Promise<UploadSkeletonResult> {
  const url = BACKEND_URL ? `${BACKEND_URL}/api/kimodo-v2/upload-skeleton` : '/api/kimodo-v2/upload-skeleton';
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (label) formData.append('label', label);

    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getSharedApiKey()}` },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      return { skeletonId: '', label: '', jointCount: 0, jointNames: [], bvhUrl: '', fileSizeBytes: 0, createdAt: '', somaskel77Compat: { compatible: false, mappedJoints: 0, unmappedJoints: 0, missingSomaskel77Joints: 0, canRetarget: false }, error: `Server ${response.status}: ${text.slice(0, 200)}` };
    }
    return await response.json() as UploadSkeletonResult;
  } catch (err) {
    return { skeletonId: '', label: '', jointCount: 0, jointNames: [], bvhUrl: '', fileSizeBytes: 0, createdAt: '', somaskel77Compat: { compatible: false, mappedJoints: 0, unmappedJoints: 0, missingSomaskel77Joints: 0, canRetarget: false }, error: String(err) };
  }
}

/** GET /api/kimodo-v2/skeletons — list uploaded skeletons */
export async function listKimodoSkeletons(): Promise<{ skeletons: SkeletonListItem[]; total: number; error?: string }> {
  const url = BACKEND_URL ? `${BACKEND_URL}/api/kimodo-v2/skeletons` : '/api/kimodo-v2/skeletons';
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${getSharedApiKey()}` },
    });
    if (!response.ok) {
      const text = await response.text();
      return { skeletons: [], total: 0, error: `Server ${response.status}: ${text.slice(0, 200)}` };
    }
    return await response.json();
  } catch (err) {
    return { skeletons: [], total: 0, error: String(err) };
  }
}
