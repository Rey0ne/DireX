/* === Kimodo v2 — Path Engine ===
 * Decomposes a 2D/3D path into segments with computed heading angles.
 *
 * For each waypoint pair:
 *   1. Compute Euclidean distance
 *   2. Distribute frames proportionally by distance
 *   3. Compute heading angle = atan2(dx, dy)  (Y-forward, Z-up convention)
 *   4. Optionally override prompt per waypoint label
 */

import type { PathWaypoint, PathMetadata, SegmentSpec } from './types.js';

// ── Configuration ────────────────────────────────

/** Default frames per waypoint segment */
const DEFAULT_FRAMES_PER_SEGMENT = 90;

// ── Public API ───────────────────────────────────

export interface DecomposePathResult {
  segments: SegmentSpec[];
  metadata: PathMetadata;
  totalFrames: number;
}

/**
 * Decompose a path into generation segments.
 *
 * @param waypoints  - ordered path waypoints
 * @param basePrompt - fallback prompt applied to all segments (overridden by waypoint.label)
 * @param totalFrames - optional total frame budget; if not set, uses waypoints * 90
 */
export function decomposePath(
  waypoints: PathWaypoint[],
  basePrompt: string,
  totalFrames?: number,
): DecomposePathResult {
  if (waypoints.length < 2) {
    throw new Error('Path needs at least 2 waypoints');
  }

  // Normalize waypoints (ensure z exists)
  const wps = waypoints.map(w => ({ x: w.x, y: w.y, z: w.z ?? 0 }));

  // Compute distances between consecutive waypoints
  const distances: number[] = [];
  for (let i = 0; i < wps.length - 1; i++) {
    const dx = wps[i + 1].x - wps[i].x;
    const dy = wps[i + 1].y - wps[i].y;
    const dz = wps[i + 1].z - wps[i].z;
    distances.push(Math.sqrt(dx * dx + dy * dy + dz * dz));
  }

  const totalDistance = distances.reduce((a, b) => a + b, 0);

  // Distribute frames — prefer per-waypoint frameAllocation, fall back to distance-proportional
  const hasFrameAllocation = waypoints.every(w => typeof w.frameAllocation === 'number');
  let segmentFrames: number[];
  if (hasFrameAllocation) {
    // waypoint[i+1].frameAllocation = frames for segment i
    segmentFrames = distances.map((_, i) =>
      Math.max(30, Math.round(waypoints[i + 1].frameAllocation!)),
    );
  } else {
    const computedTotal = totalFrames || waypoints.length * DEFAULT_FRAMES_PER_SEGMENT;
    segmentFrames = distances.map(d =>
      Math.max(30, Math.round(computedTotal * d / totalDistance)),
    );
  }

  // Compute heading angles (atan2 of displacement on XZ or XY plane)
  // Kimodo's first_heading_angle uses Y-up, Z-forward convention
  // atan2(dx, dz) gives the angle in the XZ plane
  const headingAngles = distances.map((_, i) =>
    Math.atan2(wps[i + 1].x - wps[i].x, wps[i + 1].y - wps[i].y),
  );

  // Build segment specs
  const segments: SegmentSpec[] = distances.map((_, i) => ({
    prompt: waypoints[i].label || basePrompt,
    durationFrames: segmentFrames[i],
    firstHeadingAngle: headingAngles[i],
  }));

  const metadata: PathMetadata = {
    waypoints: wps,
    segmentDistances: distances,
    segmentHeadingAngles: headingAngles,
    segmentFrames,
  };

  return {
    segments,
    metadata,
    totalFrames: segmentFrames.reduce((a, b) => a + b, 0),
  };
}
