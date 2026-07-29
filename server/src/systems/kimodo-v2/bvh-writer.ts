/* === Kimodo v2 — BVH Writer ===
 * Serializes BvhData back to valid BVH text format.
 * Zero dependencies.
 */

import type { BvhData, JointNode } from './bvh-parser.js';

// ── Recursive hierarchy writer ───────────────────

function writeJoint(node: JointNode, indent: number, isRoot: boolean): string {
  const pad = ' '.repeat(indent);
  const keyword = isRoot ? 'ROOT' : 'JOINT';
  let out = `${pad}${keyword} ${node.name}\n`;
  out += `${pad}{\n`;

  // OFFSET
  out += `${pad}  OFFSET ${node.offset[0].toFixed(6)} ${node.offset[1].toFixed(6)} ${node.offset[2].toFixed(6)}\n`;

  // CHANNELS
  if (node.channels.length > 0) {
    const chNames = node.channels.map(c => c.name).join(' ');
    out += `${pad}  CHANNELS ${node.channels.length} ${chNames}\n`;
  }

  // Children
  for (const child of node.children) {
    out += writeJoint(child, indent + 2, false);
  }

  // End Site
  if (node.hasEndSite) {
    out += `${pad}  End Site\n`;
    out += `${pad}  {\n`;
    out += `${pad}    OFFSET ${node.endSiteOffset[0].toFixed(6)} ${node.endSiteOffset[1].toFixed(6)} ${node.endSiteOffset[2].toFixed(6)}\n`;
    out += `${pad}  }\n`;
  }

  out += `${pad}}\n`;
  return out;
}

// ── Motion writer ────────────────────────────────

function writeMotion(data: BvhData): string {
  const { motion } = data;
  let out = `MOTION\n`;
  out += `Frames: ${motion.frames}\n`;
  out += `Frame Time: ${motion.frameTime.toFixed(6)}\n`;

  for (const frame of motion.data) {
    // Format: 6 decimal places, space-separated
    out += frame.map(v => v.toFixed(6)).join(' ') + '\n';
  }

  return out;
}

// ── Public API ───────────────────────────────────

/**
 * Serialize BvhData to a complete BVH text string.
 */
export function writeBVH(data: BvhData): string {
  let out = 'HIERARCHY\n';
  out += writeJoint(data.hierarchy, 0, true);
  out += writeMotion(data);
  return out;
}

/**
 * Write a flat motion data array with a given hierarchy and frame info
 * (for blend output where we only have flat data + existing hierarchy from parser).
 */
export function writeBVHFromMotion(
  hierarchy: JointNode,
  motionData: number[][],
  frameTime: number,
): string {
  const bvhData: BvhData = {
    hierarchy,
    motion: {
      frames: motionData.length,
      frameTime,
      data: motionData,
    },
    channelMap: [], // not needed for writing
    jointNames: [], // not needed for writing
  };
  return writeBVH(bvhData);
}
