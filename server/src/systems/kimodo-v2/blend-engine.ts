/* === Kimodo v2 — BVH Blend Engine ===
 * Parses two BVH segments and produces a crossfade-blended output.
 * Algorithm:
 *   1. Parse both BVH texts via bvh-parser
 *   2. Validate skeleton match (joint names, hierarchy, channel layout)
 *   3. Extract tail of A + head of B = blend window
 *   4. For each frame in blend window:
 *      - Root position channels: lerp
 *      - Rotation channels: decompose Euler → quat → slerp → Euler back
 *   5. Assemble: A[0..lenA-blendFrames] + blend window + B[blendFrames..lenB-1]
 *   6. Serialize via bvh-writer
 */

import { parseBVH, getRootPositionIndices, getJointRotationIndices } from './bvh-parser.js';
import type { BvhData, ChannelMapping } from './bvh-parser.js';
import { writeBVHFromMotion } from './bvh-writer.js';
import { eulerToQuat, quatToEuler, slerp, lerpVec3, lerp } from './euler-quaternion.js';
import type { Vec3, Quat, EulerOrder } from './euler-quaternion.js';

// ── Validation ───────────────────────────────────

export function skeletonsMatch(a: BvhData, b: BvhData): { match: boolean; reason?: string } {
  if (a.jointNames.length !== b.jointNames.length) {
    return { match: false, reason: `Joint count mismatch: ${a.jointNames.length} vs ${b.jointNames.length}` };
  }

  for (let i = 0; i < a.jointNames.length; i++) {
    if (a.jointNames[i] !== b.jointNames[i]) {
      return { match: false, reason: `Joint name mismatch at index ${i}: "${a.jointNames[i]}" vs "${b.jointNames[i]}"` };
    }
  }

  if (a.channelMap.length !== b.channelMap.length) {
    return { match: false, reason: `Channel count mismatch: ${a.channelMap.length} vs ${b.channelMap.length}` };
  }

  for (let i = 0; i < a.channelMap.length; i++) {
    if (a.channelMap[i].channelName !== b.channelMap[i].channelName) {
      return { match: false, reason: `Channel ${i} mismatch: "${a.channelMap[i].channelName}" vs "${b.channelMap[i].channelName}"` };
    }
  }

  return { match: true };
}

// ── Channel grouping for blending ────────────────

interface ChannelGroup {
  jointName: string;
  /** Rotation channels (3 per joint, optional — root may have none) */
  rotationIndices: number[];
  rotationOrder: EulerOrder;
  /** Position channels (only root joint has these, 3 indices) */
  positionIndices: number[];
}

function groupChannels(data: BvhData): ChannelGroup[] {
  const groups: ChannelGroup[] = [];
  const seen = new Set<string>();

  for (const ch of data.channelMap) {
    if (seen.has(ch.jointName)) continue;
    seen.add(ch.jointName);

    const rotIndices = getJointRotationIndices(data, ch.jointName);
    const posIndices = (
      ch.jointName === data.jointNames[0]
        ? [
            data.channelMap.find(m => m.jointName === ch.jointName && m.channelName === 'Xposition')?.channelIndex ?? -1,
            data.channelMap.find(m => m.jointName === ch.jointName && m.channelName === 'Yposition')?.channelIndex ?? -1,
            data.channelMap.find(m => m.jointName === ch.jointName && m.channelName === 'Zposition')?.channelIndex ?? -1,
          ].filter(i => i >= 0)
        : []
    );

    groups.push({
      jointName: ch.jointName,
      rotationIndices: rotIndices,
      rotationOrder: ch.rotationOrder,
      positionIndices: posIndices,
    });
  }

  return groups;
}

// ── Main blend function ──────────────────────────

export interface BlendResult {
  blendedBvhText: string;
  totalFrames: number;
  segAFrames: number;
  segBFrames: number;
  blendFrames: number;
  frameTime: number;
}

/**
 * Blend two BVH texts with a crossfade transition.
 *
 * @param bvhTextA  - BVH text for segment A (played first)
 * @param bvhTextB  - BVH text for segment B (played second)
 * @param blendFrames - number of frames to crossfade (default 20)
 */
export function blendBVH(
  bvhTextA: string,
  bvhTextB: string,
  blendFrames: number = 20,
): BlendResult {
  const dataA = parseBVH(bvhTextA);
  const dataB = parseBVH(bvhTextB);

  // Validate
  const validation = skeletonsMatch(dataA, dataB);
  if (!validation.match) {
    throw new Error(`BVH blend failed: skeletons don't match — ${validation.reason}`);
  }

  const lenA = dataA.motion.frames;
  const lenB = dataB.motion.frames;
  const frameTime = dataA.motion.frameTime;

  // Clamp blend frames
  const maxBlend = Math.min(lenA, lenB, blendFrames);
  const actualBlendFrames = Math.max(1, maxBlend);

  // Group channels
  const groups = groupChannels(dataA);

  // Extract tail of A and head of B
  const tailA = dataA.motion.data.slice(lenA - actualBlendFrames);
  const headB = dataB.motion.data.slice(0, actualBlendFrames);

  // Build blended frames
  const blendedWindow: number[][] = [];

  for (let i = 0; i < actualBlendFrames; i++) {
    const t = actualBlendFrames > 1 ? i / (actualBlendFrames - 1) : 0.5;
    const frameA = tailA[i];
    const frameB = headB[i];
    const blendFrame: number[] = new Array(frameA.length);

    for (const group of groups) {
      // Blend position channels (root only) with lerp
      for (const posIdx of group.positionIndices) {
        blendFrame[posIdx] = lerp(frameA[posIdx], frameB[posIdx], t);
      }

      // Blend rotation channels with slerp
      if (group.rotationIndices.length === 3) {
        const [r0, r1, r2] = group.rotationIndices;
        const eulerA: Vec3 = [frameA[r0], frameA[r1], frameA[r2]];
        const eulerB: Vec3 = [frameB[r0], frameB[r1], frameB[r2]];

        const quatA = eulerToQuat(eulerA, group.rotationOrder);
        const quatB = eulerToQuat(eulerB, group.rotationOrder);
        const quatBlend = slerp(quatA, quatB, t);
        const eulerBlend = quatToEuler(quatBlend, group.rotationOrder);

        blendFrame[r0] = eulerBlend[0];
        blendFrame[r1] = eulerBlend[1];
        blendFrame[r2] = eulerBlend[2];
      }
    }

    blendedWindow.push(blendFrame);
  }

  // Assemble final motion data
  const aBody = dataA.motion.data.slice(0, lenA - actualBlendFrames);
  const bBody = dataB.motion.data.slice(actualBlendFrames);
  const mergedMotion = [...aBody, ...blendedWindow, ...bBody];

  // Serialize
  const bvhText = writeBVHFromMotion(dataA.hierarchy, mergedMotion, frameTime);

  return {
    blendedBvhText: bvhText,
    totalFrames: mergedMotion.length,
    segAFrames: lenA,
    segBFrames: lenB,
    blendFrames: actualBlendFrames,
    frameTime,
  };
}

/**
 * Chain-blend N BVH texts sequentially.
 * Blends A+B first, then (A+B) with C, etc.
 */
export function blendChain(
  bvhTexts: string[],
  blendFrames: number = 20,
): BlendResult {
  if (bvhTexts.length === 0) {
    throw new Error('blendChain: no BVH texts provided');
  }
  if (bvhTexts.length === 1) {
    const data = parseBVH(bvhTexts[0]);
    return {
      blendedBvhText: bvhTexts[0],
      totalFrames: data.motion.frames,
      segAFrames: data.motion.frames,
      segBFrames: 0,
      blendFrames: 0,
      frameTime: data.motion.frameTime,
    };
  }

  let current = bvhTexts[0];
  let totalA = 0;
  let totalB = 0;
  let firstFrameTime = 0;
  let lastBlend = 0;

  for (let i = 1; i < bvhTexts.length; i++) {
    const result = blendBVH(current, bvhTexts[i], blendFrames);
    current = result.blendedBvhText;
    totalA = i === 1 ? result.segAFrames : totalA;
    totalB += result.segBFrames;
    lastBlend = result.blendFrames;
    if (i === 1) firstFrameTime = result.frameTime;
  }

  return {
    blendedBvhText: current,
    totalFrames: parseBVH(current).motion.frames,
    segAFrames: totalA,
    segBFrames: totalB,
    blendFrames: lastBlend,
    frameTime: firstFrameTime,
  };
}
