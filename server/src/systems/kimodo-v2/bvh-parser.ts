/* === Kimodo v2 — BVH Parser ===
 * Parses BVH text format into structured data.
 * Handles: HIERARCHY block (recursive JOINT/End Site) + MOTION block (frame data).
 * Zero dependencies.
 *
 * BVH format reference:
 * HIERARCHY
 * ROOT <name>
 * {
 *   OFFSET x y z
 *   CHANNELS n <channel1> <channel2> ...
 *   JOINT <name>
 *   {
 *     ...
 *   }
 *   End Site
 *   {
 *     OFFSET x y z
 *   }
 * }
 * MOTION
 * Frames: N
 * Frame Time: 0.033333
 * 0.0 0.0 0.0 ...
 */

import type { EulerOrder } from './euler-quaternion.js';

// ── Parsed types ─────────────────────────────────

export interface JointNode {
  name: string;
  offset: [number, number, number];
  channels: ChannelDef[];
  children: JointNode[];
  hasEndSite: boolean;
  endSiteOffset: [number, number, number];
}

export interface ChannelDef {
  name: string;                // "Xposition", "Yrotation", etc.
  isPosition: boolean;
  axis: 'X' | 'Y' | 'Z';
}

export interface ChannelMapping {
  jointName: string;
  channelIndex: number;        // index into the flat channel data array
  channelName: string;         // "Xposition", "Yrotation", etc.
  rotationOrder: EulerOrder;   // for rotation channels, the order of the 3 rotation axes
}

export interface BvhData {
  hierarchy: JointNode;
  motion: {
    frames: number;
    frameTime: number;
    data: number[][];           // [frameIndex][channelIndex]
  };
  channelMap: ChannelMapping[];
  jointNames: string[];          // breadth-first joint name list
}

// ── Parser state ─────────────────────────────────

interface ParseState {
  lines: string[];
  pos: number;
}

function peek(s: ParseState): string {
  return s.pos < s.lines.length ? s.lines[s.pos] : '';
}

function consume(s: ParseState): string {
  return s.pos < s.lines.length ? s.lines[s.pos++] : '';
}

function isLineEmpty(line: string): boolean {
  return line.trim() === '' || line.trim().startsWith('#');
}

function skipEmpty(s: ParseState): void {
  while (s.pos < s.lines.length && isLineEmpty(peek(s))) {
    s.pos++;
  }
}

// ── Channel parsing ──────────────────────────────

function parseChannels(line: string): ChannelDef[] {
  // "CHANNELS 6 Xposition Yposition Zposition Zrotation Xrotation Yrotation"
  const parts = line.trim().split(/\s+/);
  const count = parseInt(parts[1], 10);
  const channels: ChannelDef[] = [];
  for (let i = 0; i < count; i++) {
    const name = parts[2 + i];
    const isPosition = name.toLowerCase().includes('position');
    // Last character is the axis: X, Y, or Z
    const axis = name[name.length - 1] as 'X' | 'Y' | 'Z';
    channels.push({ name, isPosition, axis });
  }
  return channels;
}

// ── Recursive hierarchy parsing ──────────────────

function parseJoint(s: ParseState): JointNode {
  skipEmpty(s);
  // Expect "JOINT <name>" or "ROOT <name>"
  const header = consume(s).trim();
  const parts = header.split(/\s+/);
  const name = parts.length >= 2 ? parts.slice(1).join(' ') : header;

  skipEmpty(s);
  const open = consume(s).trim();
  if (open !== '{') {
    throw new Error(`Expected '{' after joint "${name}", got "${open}" at line ${s.pos}`);
  }

  let offset: [number, number, number] = [0, 0, 0];
  let channels: ChannelDef[] = [];
  const children: JointNode[] = [];
  let hasEndSite = false;
  let endSiteOffset: [number, number, number] = [0, 0, 0];

  while (s.pos < s.lines.length) {
    skipEmpty(s);
    const line = consume(s).trim();

    if (line === '}') break;

    if (line.startsWith('OFFSET')) {
      const nums = line.split(/\s+/).slice(1).map(Number);
      offset = [nums[0] || 0, nums[1] || 0, nums[2] || 0];
    } else if (line.startsWith('CHANNELS')) {
      channels = parseChannels(line);
    } else if (line.startsWith('JOINT')) {
      // Push back the JOINT line so parseJoint can read it
      s.pos--;
      children.push(parseJoint(s));
    } else if (line.startsWith('End Site')) {
      hasEndSite = true;
      skipEmpty(s);
      const esOpen = consume(s).trim();
      if (esOpen !== '{') throw new Error(`Expected '{' after End Site, got "${esOpen}"`);
      skipEmpty(s);
      const esLine = consume(s).trim();
      if (esLine.startsWith('OFFSET')) {
        const nums = esLine.split(/\s+/).slice(1).map(Number);
        endSiteOffset = [nums[0] || 0, nums[1] || 0, nums[2] || 0];
      }
      skipEmpty(s);
      const esClose = consume(s).trim();
      if (esClose !== '}') throw new Error(`Expected '}' closing End Site, got "${esClose}"`);
    }
    // Ignore unknown lines (comments, etc.)
  }

  return { name, offset, channels, children, hasEndSite, endSiteOffset };
}

function parseRoot(s: ParseState): JointNode {
  skipEmpty(s);
  const line = consume(s).trim();
  if (!line.startsWith('ROOT') && !line.startsWith('HIERARCHY')) {
    // Skip HIERARCHY header if present
    if (line === 'HIERARCHY') {
      return parseRoot(s);
    }
    throw new Error(`Expected 'ROOT' or 'HIERARCHY', got "${line}" at line ${s.pos}`);
  }
  if (line === 'HIERARCHY') {
    return parseRoot(s);
  }

  // Push back the ROOT line so parseJoint can read it
  s.pos--;
  return parseJoint(s);
}

// ── Motion parsing ───────────────────────────────

function parseMotion(s: ParseState): { frames: number; frameTime: number; data: number[][] } {
  skipEmpty(s);
  let line = consume(s).trim();
  if (line !== 'MOTION') {
    throw new Error(`Expected 'MOTION', got "${line}" at line ${s.pos}`);
  }

  skipEmpty(s);
  line = consume(s).trim();
  const framesMatch = line.match(/Frames:\s*(\d+)/i);
  if (!framesMatch) throw new Error(`Expected 'Frames: N', got "${line}"`);
  const frames = parseInt(framesMatch[1], 10);

  skipEmpty(s);
  line = consume(s).trim();
  const ftMatch = line.match(/Frame Time:\s*([0-9.]+)/i);
  if (!ftMatch) throw new Error(`Expected 'Frame Time: X', got "${line}"`);
  const frameTime = parseFloat(ftMatch[1]);

  const data: number[][] = [];
  for (let i = 0; i < frames; i++) {
    skipEmpty(s);
    if (s.pos >= s.lines.length) break;
    const raw = consume(s).trim();
    if (!raw) continue;
    const values = raw.split(/\s+/).map(Number);
    data.push(values);
  }

  return { frames, frameTime, data };
}

// ── Build flat channel map and joint name list ───

function buildChannelMap(root: JointNode): { map: ChannelMapping[]; names: string[] } {
  const map: ChannelMapping[] = [];
  const names: string[] = [];
  let flatIndex = 0;

  function walk(joint: JointNode): void {
    names.push(joint.name);

    // Collect rotation channels to determine order
    const rotChannels = joint.channels.filter(c => !c.isPosition);
    const rotOrder: EulerOrder = rotChannels.length === 3
      ? (rotChannels.map(c => c.axis).join('') as EulerOrder)
      : 'ZXY'; // default for Kimodo

    for (const ch of joint.channels) {
      map.push({
        jointName: joint.name,
        channelIndex: flatIndex,
        channelName: ch.name,
        rotationOrder: rotOrder,
      });
      flatIndex++;
    }

    for (const child of joint.children) {
      walk(child);
    }
  }

  walk(root);
  return { map, names };
}

// ── Public API ───────────────────────────────────

/**
 * Parse a BVH text string into structured data.
 * Throws on invalid input.
 */
export function parseBVH(text: string): BvhData {
  const lines = text.split('\n');
  const state: ParseState = { lines, pos: 0 };

  const hierarchy = parseRoot(state);
  const motion = parseMotion(state);
  const { map, names } = buildChannelMap(hierarchy);

  return { hierarchy, motion, channelMap: map, jointNames: names };
}

/**
 * Extract the 3 position channels' indices for the root joint.
 * Returns [-1, -1, -1] if not found.
 */
export function getRootPositionIndices(data: BvhData): [number, number, number] {
  const rootName = data.jointNames[0];
  const x = data.channelMap.find(m => m.jointName === rootName && m.channelName === 'Xposition');
  const y = data.channelMap.find(m => m.jointName === rootName && m.channelName === 'Yposition');
  const z = data.channelMap.find(m => m.jointName === rootName && m.channelName === 'Zposition');
  return [
    x?.channelIndex ?? -1,
    y?.channelIndex ?? -1,
    z?.channelIndex ?? -1,
  ];
}

/**
 * Get the rotation channel indices for a specific joint.
 * Returns the 3 indices in the joint's rotation order.
 */
export function getJointRotationIndices(data: BvhData, jointName: string): number[] {
  return data.channelMap
    .filter(m => m.jointName === jointName && !m.channelName.includes('position'))
    .map(m => m.channelIndex);
}
