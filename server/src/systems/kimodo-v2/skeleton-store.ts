/* === Kimodo v2 — Skeleton Store ===
 * Custom skeleton upload and validation.
 * Parses uploaded BVH to extract joint hierarchy, validates structure,
 * computes compatibility report with Kimodo's somaskel77 skeleton.
 *
 * Storage: data/kimodo-v2/skeletons/{skeletonId}.bvh + .json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { v4 as uuid } from 'uuid';
import { parseBVH } from './bvh-parser.js';
import type { SkeletonRecord, SkeletonCompatReport } from './types.js';

// ── Paths ────────────────────────────────────────

const __rootdir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const SKELETONS_DIR = path.join(__rootdir, 'data', 'kimodo-v2', 'skeletons');

// ── Known Kimodo somaskel77 joint names ──────────

// Kimodo SOMA skeleton 77 joints (canonical names)
const SOMASKEL77_JOINTS = new Set([
  'Hips',
  'Spine', 'Spine1', 'Spine2',
  'Neck', 'Neck1', 'Head', 'HeadEnd',
  'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'LeftHandThumb1', 'LeftHandThumb2', 'LeftHandThumb3', 'LeftHandThumb4', 'LeftHandIndex1', 'LeftHandIndex2', 'LeftHandIndex3', 'LeftHandIndex4', 'LeftHandMiddle1', 'LeftHandMiddle2', 'LeftHandMiddle3', 'LeftHandMiddle4', 'LeftHandRing1', 'LeftHandRing2', 'LeftHandRing3', 'LeftHandRing4', 'LeftHandPinky1', 'LeftHandPinky2', 'LeftHandPinky3', 'LeftHandPinky4',
  'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'RightHandThumb1', 'RightHandThumb2', 'RightHandThumb3', 'RightHandThumb4', 'RightHandIndex1', 'RightHandIndex2', 'RightHandIndex3', 'RightHandIndex4', 'RightHandMiddle1', 'RightHandMiddle2', 'RightHandMiddle3', 'RightHandMiddle4', 'RightHandRing1', 'RightHandRing2', 'RightHandRing3', 'RightHandRing4', 'RightHandPinky1', 'RightHandPinky2', 'RightHandPinky3', 'RightHandPinky4',
  'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToe', 'LeftToeEnd',
  'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToe', 'RightToeEnd',
]);

// ── Public API ───────────────────────────────────

/**
 * Store an uploaded BVH skeleton.
 * Parses the BVH to extract joints, validates, and computes compatibility.
 */
export function uploadSkeleton(
  bvhBuffer: Buffer,
  label?: string,
): { skeleton: SkeletonRecord; skeletonId: string } {
  const skeletonId = uuid();
  const bvhFileName = `${skeletonId}.bvh`;
  const bvhFilePath = path.join(SKELETONS_DIR, bvhFileName);

  // Save BVH
  fs.writeFileSync(bvhFilePath, bvhBuffer);

  // Parse
  const bvhText = bvhBuffer.toString('utf-8');
  let jointCount = 0;
  let jointNames: string[] = [];

  try {
    const bvhData = parseBVH(bvhText);
    jointNames = bvhData.jointNames;
    jointCount = jointNames.length;
  } catch (e: any) {
    // BVH parse failed — return basic info
    jointCount = 0;
    jointNames = [];
  }

  // Compute compatibility
  const compat = computeCompat(jointNames);

  const skeleton: SkeletonRecord = {
    skeletonId,
    label,
    jointCount,
    jointNames,
    bvhPath: bvhFilePath,
    fileSizeBytes: bvhBuffer.length,
    createdAt: new Date().toISOString(),
    somaskel77Compat: compat,
  };

  // Save metadata
  const metaPath = path.join(SKELETONS_DIR, `${skeletonId}.json`);
  fs.writeFileSync(metaPath, JSON.stringify(skeleton, null, 2), 'utf-8');

  return { skeleton, skeletonId };
}

/**
 * Compute compatibility between uploaded skeleton joints and Kimodo somaskel77.
 */
function computeCompat(jointNames: string[]): SkeletonCompatReport {
  const uploadedSet = new Set(jointNames.map(n => n.trim()));

  let mappedJoints = 0;
  const unmappedJoints: string[] = [];
  const missingSomaskel77Joints: string[] = [];

  // Count how many uploaded joints exist in somaskel77
  for (const name of uploadedSet) {
    if (SOMASKEL77_JOINTS.has(name)) {
      mappedJoints++;
    } else {
      unmappedJoints.push(name);
    }
  }

  // Count somaskel77 joints not in uploaded skeleton
  for (const name of SOMASKEL77_JOINTS) {
    if (!uploadedSet.has(name)) {
      missingSomaskel77Joints.push(name);
    }
  }

  const compatible = mappedJoints === SOMASKEL77_JOINTS.size && unmappedJoints.length === 0;

  // Retargeting is possible if major body chains map (hips, spine, limbs)
  const majorJoints = [
    'Hips', 'Spine', 'Spine1', 'Spine2', 'Neck', 'Head',
    'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand',
    'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand',
    'LeftUpLeg', 'LeftLeg', 'LeftFoot',
    'RightUpLeg', 'RightLeg', 'RightFoot',
  ];
  const majorMapped = majorJoints.filter(j => uploadedSet.has(j)).length;
  const canRetarget = majorMapped >= majorJoints.length * 0.8; // 80% of major joints

  return {
    compatible,
    mappedJoints,
    unmappedJoints: unmappedJoints.length,
    missingSomaskel77Joints: missingSomaskel77Joints.length,
    canRetarget,
  };
}

/**
 * Get a skeleton by ID. Returns null if not found.
 */
export function getSkeleton(skeletonId: string): SkeletonRecord | null {
  const metaPath = path.join(SKELETONS_DIR, `${skeletonId}.json`);
  if (!fs.existsSync(metaPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * List all uploaded skeletons.
 */
export function listSkeletons(): SkeletonRecord[] {
  if (!fs.existsSync(SKELETONS_DIR)) return [];

  return fs.readdirSync(SKELETONS_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        return JSON.parse(fs.readFileSync(path.join(SKELETONS_DIR, f), 'utf-8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean) as SkeletonRecord[];
}

/**
 * Get the BVH file path for a skeleton.
 */
export function getSkeletonBvhPath(skeletonId: string): string {
  return path.join(SKELETONS_DIR, `${skeletonId}.bvh`);
}

/**
 * Read a skeleton's BVH file as a Buffer.
 */
export function readSkeletonBvh(skeletonId: string): Buffer | null {
  const bvhPath = getSkeletonBvhPath(skeletonId);
  if (!fs.existsSync(bvhPath)) return null;
  return fs.readFileSync(bvhPath);
}
