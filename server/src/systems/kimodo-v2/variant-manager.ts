/* === Kimodo v2 — Variant Manager ===
 * Creates sessions with N variants (different seeds, same prompt).
 * Accept/reject workflow with disk cleanup.
 *
 * Storage:
 *   data/kimodo-v2/sessions/{sessionId}/
 *     session.json
 *     bvh/v0.bvh, v1.bvh, ...
 *
 * Accepted BVHs are promoted to data/bvh/ (reuse v1 static route).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { callKimodoGenerate } from './kimodo-client.js';
import { parseBVH } from './bvh-parser.js';
import {
  readSession,
  writeSession,
  writeSessionBvh,
} from './session-store.js';
import { appendHistory } from './session-store.js';
import type {
  KimodoV2Session,
  VariantRecord,
  GenerateVariantsRequest,
  AcceptVariantRequest,
  RejectVariantRequest,
} from './types.js';

// ── Paths ────────────────────────────────────────

const __rootdir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const BVH_PROMOTE_DIR = path.join(__rootdir, 'data', 'bvh');

// ── Create variant session ───────────────────────

export interface CreateVariantsOptions {
  sessionId: string;
  request: GenerateVariantsRequest;
  onProgress?: (variantIndex: number, variant: VariantRecord, total: number) => void;
}

export async function createVariants(
  opts: CreateVariantsOptions,
): Promise<KimodoV2Session> {
  const { sessionId, request } = opts;
  const numVariants = Math.min(Math.max(request.numVariants, 2), 6);
  const seedBase = request.seed != null ? request.seed : Math.floor(Math.random() * 2_000_000_000);

  // Create session
  const session: KimodoV2Session = {
    sessionId,
    type: 'variants',
    status: 'generating',
    label: request.sessionLabel,
    prompt: request.prompt,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    variants: [],
    numVariants,
  };
  writeSession(session);

  const variants: VariantRecord[] = [];
  let totalTime = 0;

  for (let i = 0; i < numVariants; i++) {
    const seed = seedBase + i;

    console.log(`[kimodo-v2] Variant ${i + 1}/${numVariants}: seed=${seed}`);

    const gen = await callKimodoGenerate({
      prompt: request.prompt,
      numFrames: request.numFrames || 90,
      denoisingSteps: request.denoisingSteps || 50,
      seed,
      firstHeadingAngle: request.firstHeadingAngle ?? 0,
    });

    // Save BVH
    const bvhBuffer = Buffer.from(gen.bvhBase64, 'base64');
    const bvhPath = writeSessionBvh(sessionId, `v${i}.bvh`, bvhBuffer);

    const variant: VariantRecord = {
      variantId: `v${i}`,
      seedUsed: gen.seedUsed,
      numFrames: gen.numFrames,
      generationTimeS: gen.generationTimeS,
      bvhPath,
      fileSizeBytes: bvhBuffer.length,
      previewFrame: gen.posedJoints[0] || [], // first frame for thumbnail
      status: 'generated',
    };

    variants.push(variant);
    totalTime += gen.generationTimeS;

    // Update session after each variant (for crash recovery)
    session.variants = variants;
    session.status = 'pending';
    session.totalGenerationTimeS = totalTime;
    writeSession(session);

    opts.onProgress?.(i, variant, numVariants);
  }

  return session;
}

// ── Accept variant ───────────────────────────────

export interface AcceptVariantResult {
  acceptedVariantId: string;
  promotedBvhUrl: string;
  rejected: { variantId: string; cleanedUp: boolean }[];
  sessionId: string;
}

export function acceptVariant(req: AcceptVariantRequest): AcceptVariantResult | null {
  const session = readSession(req.sessionId);
  if (!session) {
    console.warn(`[kimodo-v2] Accept failed: session ${req.sessionId} not found`);
    return null;
  }

  const variants = session.variants || [];
  const acceptedVar = variants.find(v => v.variantId === req.variantId);
  if (!acceptedVar) {
    console.warn(`[kimodo-v2] Accept failed: variant ${req.variantId} not found in session ${req.sessionId}`);
    return null;
  }

  // Promote accepted BVH to data/bvh/
  if (!fs.existsSync(BVH_PROMOTE_DIR)) fs.mkdirSync(BVH_PROMOTE_DIR, { recursive: true });

  const bvhBuffer = fs.readFileSync(acceptedVar.bvhPath);
  const promotedName = `kimodo_v2_accepted_${req.sessionId.slice(0, 8)}_${req.variantId}.bvh`;
  const promotedPath = path.join(BVH_PROMOTE_DIR, promotedName);
  fs.copyFileSync(acceptedVar.bvhPath, promotedPath);
  const promotedUrl = `/api/models/bvh/${promotedName}`;

  // Update variant status
  acceptedVar.status = 'accepted';
  session.acceptedVariantId = req.variantId;
  session.status = 'accepted';
  session.promotedBvhUrl = promotedUrl;

  // Clean up rejected variants
  const rejected: { variantId: string; cleanedUp: boolean }[] = [];
  const keepRejected = req.keepRejected === true;

  for (const v of variants) {
    if (v.variantId === req.variantId) continue;

    v.status = 'rejected';
    if (!keepRejected) {
      try {
        if (fs.existsSync(v.bvhPath)) fs.unlinkSync(v.bvhPath);
        rejected.push({ variantId: v.variantId, cleanedUp: true });
      } catch (e: any) {
        rejected.push({ variantId: v.variantId, cleanedUp: false });
      }
    } else {
      rejected.push({ variantId: v.variantId, cleanedUp: false });
    }
  }

  writeSession(session);

  // Log to history
  appendHistory({
    sessionId: req.sessionId,
    type: session.type,
    label: req.saveAs || session.label,
    createdAt: session.createdAt,
    acceptedAt: new Date().toISOString(),
    acceptedVariantId: req.variantId,
    bvhUrl: promotedUrl,
    numFrames: acceptedVar.numFrames,
    prompt: session.prompt,
  });

  console.log(`[kimodo-v2] Accepted variant ${req.variantId} of session ${req.sessionId} → ${promotedUrl}`);

  return {
    acceptedVariantId: req.variantId,
    promotedBvhUrl: promotedUrl,
    rejected,
    sessionId: req.sessionId,
  };
}

// ── Reject variant ───────────────────────────────

export interface RejectVariantResult {
  rejectedVariantId: string;
  remainingVariants: string[];
  sessionId: string;
}

export function rejectVariant(req: RejectVariantRequest): RejectVariantResult | null {
  const session = readSession(req.sessionId);
  if (!session) return null;

  const variants = session.variants || [];
  const target = variants.find(v => v.variantId === req.variantId);
  if (!target) return null;

  target.status = 'rejected';

  // Delete the BVH file
  try {
    if (fs.existsSync(target.bvhPath)) fs.unlinkSync(target.bvhPath);
  } catch {}

  writeSession(session);

  const remaining = variants
    .filter(v => v.status !== 'rejected')
    .map(v => v.variantId);

  return {
    rejectedVariantId: req.variantId,
    remainingVariants: remaining,
    sessionId: req.sessionId,
  };
}
