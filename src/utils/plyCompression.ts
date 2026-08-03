/* === PLY Auto-Compression Utility ===
 * Large PLY files (3D scans, LiDAR, photogrammetry) can have millions of vertices.
 * Without compression, rendering crashes due to GPU memory exhaustion or browser freeze.
 *
 * Strategy:
 *   - ≤ 100K vertices → no compression needed
 *   - 100K-500K vertices → light decimation (target: 30% reduction)
 *   - 500K-2M vertices → moderate decimation (target: 60% reduction)
 *   - > 2M vertices → aggressive decimation (target: 90% reduction)
 *
 * Mesh vs point cloud detection:
 *   - If PLYLoader creates geometry.index → the PLY has face elements → treat as mesh.
 *     Use indexed triangle sampling to reduce face count while preserving structure.
 *   - If no index → genuine point cloud (or PLY with faces in a format PLYLoader
 *     can't parse). DO NOT guess triangles from sequential vertices — that produces
 *     garbled faces connecting spatially unrelated points. Use uniform point sampling.
 *
 * SimplifyModifier (QSlim) is only used for ≤200K vertex meshes where it won't
 * freeze the main thread. Above that, we use fast O(n) triangle sampling.
 */

import * as THREE from 'three';

// ─── PLY Type Detection ───

export type PlyType = 'mesh' | 'pointcloud' | '3dgs';


/**
 * Auto-detect the type of PLY geometry by inspecting vertex attributes.
 * - Has geometry.index with face data → 'mesh'
 * - Has 3DGS-specific attributes (f_dc_*, opacity, scale_*, rot_*) → '3dgs'
 * - Otherwise → 'pointcloud'
 */
export function detectPlyType(geometry: THREE.BufferGeometry): PlyType {
  // Check for face index — definitive mesh indicator
  if (geometry.index && geometry.index.count > 0) {
    return 'mesh';
  }

  // Check for 3DGS attributes
  const attrNames = new Set<string>();
  for (const key of Object.keys(geometry.attributes)) {
    attrNames.add(key);
  }
  // Need at least position + opacity + scale + rotation for 3DGS
  const hasGsPosition = attrNames.has('position');
  const hasGsOpacity = attrNames.has('opacity');
  const hasGsScale = attrNames.has('scale_0') && attrNames.has('scale_1') && attrNames.has('scale_2');
  const hasGsRot = attrNames.has('rot_0') && attrNames.has('rot_1') && attrNames.has('rot_2') && attrNames.has('rot_3');
  const hasGsColor = attrNames.has('f_dc_0');

  if (hasGsPosition && hasGsOpacity && hasGsScale && hasGsRot && hasGsColor) {
    return '3dgs';
  }

  return 'pointcloud';
}

/**
 * Extract 3DGS data from geometry into a typed structure for the splat renderer.
 * Returns null if the geometry isn't a valid 3DGS PLY.
 */
export interface GaussianSplatData {
  positions: Float32Array;
  scales: Float32Array;
  rotations: Float32Array;  // quaternion xyzw
  colors: Float32Array;     // SH DC: r,g,b
  opacities: Float32Array;
  count: number;
}

export function extractGaussianSplatData(geometry: THREE.BufferGeometry): GaussianSplatData | null {
  const posAttr = geometry.attributes.position;
  if (!posAttr) return null;

  const count = posAttr.count;
  const positions = (posAttr.array as Float32Array).slice(0, count * 3);

  // Scales
  const s0 = geometry.attributes['scale_0']?.array as Float32Array | undefined;
  const s1 = geometry.attributes['scale_1']?.array as Float32Array | undefined;
  const s2 = geometry.attributes['scale_2']?.array as Float32Array | undefined;
  if (!s0 || !s1 || !s2) return null;
  const scales = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    scales[i * 3] = Math.exp(s0[i] ?? 0);   // scales are stored as log
    scales[i * 3 + 1] = Math.exp(s1[i] ?? 0);
    scales[i * 3 + 2] = Math.exp(s2[i] ?? 0);
  }

  // Rotations (quaternion)
  const r0 = geometry.attributes['rot_0']?.array as Float32Array | undefined;
  const r1 = geometry.attributes['rot_1']?.array as Float32Array | undefined;
  const r2 = geometry.attributes['rot_2']?.array as Float32Array | undefined;
  const r3 = geometry.attributes['rot_3']?.array as Float32Array | undefined;
  if (!r0 || !r1 || !r2 || !r3) return null;
  const rotations = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    rotations[i * 4] = r0[i] ?? 0;
    rotations[i * 4 + 1] = r1[i] ?? 0;
    rotations[i * 4 + 2] = r2[i] ?? 0;
    rotations[i * 4 + 3] = r3[i] ?? 0;
  }

  // Colors (SH DC)
  const fdc0 = geometry.attributes['f_dc_0']?.array as Float32Array | undefined;
  const fdc1 = geometry.attributes['f_dc_1']?.array as Float32Array | undefined;
  const fdc2 = geometry.attributes['f_dc_2']?.array as Float32Array | undefined;
  const colors = new Float32Array(count * 3);
  // SH DC → RGB: color = 0.5 + SH_C0 * f_dc
  const SH_C0 = 0.28209479177387814;
  for (let i = 0; i < count; i++) {
    colors[i * 3] = Math.max(0, Math.min(1, 0.5 + SH_C0 * (fdc0?.[i] ?? 0)));
    colors[i * 3 + 1] = Math.max(0, Math.min(1, 0.5 + SH_C0 * (fdc1?.[i] ?? 0)));
    colors[i * 3 + 2] = Math.max(0, Math.min(1, 0.5 + SH_C0 * (fdc2?.[i] ?? 0)));
  }

  // Opacities
  const opacities = (geometry.attributes['opacity']?.array as Float32Array)?.slice(0, count);
  if (!opacities) return null;
  // Opacity is stored as logit; apply sigmoid
  for (let i = 0; i < count; i++) {
    opacities[i] = 1 / (1 + Math.exp(-opacities[i]));
  }

  return { positions, scales, rotations, colors, opacities, count };
}
import { SimplifyModifier } from 'three/examples/jsm/modifiers/SimplifyModifier.js';

export interface PlyCompressionResult {
  geometry: THREE.BufferGeometry;
  originalVertices: number;
  simplifiedVertices: number;
  reductionPercent: number;
}

const LIGHT_THRESHOLD = 100_000;      // vertices — below this, skip compression entirely
const MODERATE_THRESHOLD = 500_000;    // vertices
const AGGRESSIVE_THRESHOLD = 2_000_000;
const SIMPLIFY_MAX_VERTS = 200_000;    // vertices — above this, QSlim freezes the main thread

// ─── Safety valve — always delivers a renderable geometry, never refuses ───
const SAFETY_TARGET_VERTS = 600_000;    // target vertex count — smooth 60fps on typical GPU

/**
 * Safety valve — lightweight stride sampling that guarantees a renderable geometry.
 *
 * Called from PLYModel / GroundPlyModel / SkyPlyDome after PLYLoader returns.
 * Unlike autoCompressPly, this is NOT a general optimization — it only activates
 * when vertex count exceeds the safe render target, and uses ONLY uniform stride
 * sampling (no QSlim, no mesh triangle processing).
 *
 * Principle: never refuse to load. A coarse point cloud is infinitely better than
 * a blank screen. If the user needs full precision, the backend .drx pipeline
 * handles that separately.
 *
 * Behavior:
 *   ≤ SAFETY_TARGET_VERTS  → returns as-is (no overhead)
 *   > SAFETY_TARGET_VERTS  → uniform stride to ~SAFETY_TARGET_VERTS
 */
export function guardLargePly(geometry: THREE.BufferGeometry): { geometry: THREE.BufferGeometry; wasCompressed: boolean } {
  const vertCount = geometry.attributes.position?.count || 0;

  if (vertCount <= SAFETY_TARGET_VERTS) {
    return { geometry, wasCompressed: false };
  }

  const targetCount = SAFETY_TARGET_VERTS;
  const step = Math.max(1, Math.floor(vertCount / targetCount));
  const actualCount = Math.min(targetCount, Math.ceil(vertCount / step));
  const reduction = Math.round((1 - actualCount / vertCount) * 100);

  console.log(
    `[PLY] Safety stride: ${vertCount.toLocaleString()} → ${actualCount.toLocaleString()} vertices ` +
    `(${reduction}% reduction). Full precision available via backend .drx pipeline.`
  );

  const positions = geometry.attributes.position.array as Float32Array;
  const newPositions = new Float32Array(actualCount * 3);
  const colors = geometry.attributes.color?.array as Float32Array | undefined;
  const newColors = colors ? new Float32Array(actualCount * 3) : undefined;

  for (let i = 0; i < actualCount; i++) {
    const srcIdx = Math.min(i * step, vertCount - 1) * 3;
    newPositions[i * 3] = positions[srcIdx];
    newPositions[i * 3 + 1] = positions[srcIdx + 1];
    newPositions[i * 3 + 2] = positions[srcIdx + 2];
    if (newColors && colors) {
      newColors[i * 3] = colors[srcIdx] || 1;
      newColors[i * 3 + 1] = colors[srcIdx + 1] || 1;
      newColors[i * 3 + 2] = colors[srcIdx + 2] || 1;
    }
  }

  const sampled = new THREE.BufferGeometry();
  sampled.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
  if (newColors) {
    sampled.setAttribute('color', new THREE.BufferAttribute(newColors, 3));
  }

  geometry.dispose();
  return { geometry: sampled, wasCompressed: true };
}

/**
 * Auto-compress PLY geometry based on vertex count.
 * Called immediately after PLYLoader returns geometry, before adding to scene.
 */
export function autoCompressPly(geometry: THREE.BufferGeometry): PlyCompressionResult {
  const vertCount = geometry.attributes.position?.count || 0;
  const hasIndex = !!(geometry.index && geometry.index.count > 0);

  const result: PlyCompressionResult = {
    geometry,
    originalVertices: vertCount,
    simplifiedVertices: vertCount,
    reductionPercent: 0,
  };

  // Trivially small — no compression needed
  if (vertCount <= LIGHT_THRESHOLD) {
    return result;
  }

  // Determine target ratio
  let targetRatio: number;
  if (vertCount > AGGRESSIVE_THRESHOLD) {
    targetRatio = 0.10; // keep 10% (90% reduction)
  } else if (vertCount > MODERATE_THRESHOLD) {
    targetRatio = 0.40; // keep 40% (60% reduction)
  } else {
    targetRatio = 0.70; // keep 70% (30% reduction) — light compression for 100K-500K
  }

  const targetCount = Math.max(10_000, Math.floor(vertCount * targetRatio));

  console.log(
    `[PLY] Auto-compressing: ${vertCount.toLocaleString()} → ~${targetCount.toLocaleString()} vertices ` +
    `(${Math.round((1 - targetRatio) * 100)}% reduction, ${hasIndex ? 'mesh' : 'point cloud'})`,
  );

  // ── Point cloud path (no face data) ──
  if (!hasIndex) {
    return samplePointCloud(geometry, targetCount, result);
  }

  // ── Mesh path (has face data via index) ──

  // For very large meshes, skip SimplifyModifier (QSlim freezes main thread)
  if (vertCount > SIMPLIFY_MAX_VERTS) {
    console.log(`[PLY] Skipping SimplifyModifier (${vertCount.toLocaleString()} > ${SIMPLIFY_MAX_VERTS.toLocaleString()} limit), using fast triangle sampling`);
    return sampleMeshTriangles(geometry, targetCount, result);
  }

  // Try SimplifyModifier for moderate-size meshes
  try {
    const removeCount = vertCount - targetCount;
    const modifier = new SimplifyModifier();
    const simplified = modifier.modify(geometry, removeCount);

    if (simplified && simplified.attributes.position) {
      simplified.computeVertexNormals();
      // Preserve vertex colors if original had them
      if (geometry.hasAttribute('color') && !simplified.hasAttribute('color')) {
        // SimplifyModifier may drop color attribute — accept it
      }
      result.geometry = simplified;
      result.simplifiedVertices = simplified.attributes.position.count;
      result.reductionPercent = Math.round((1 - result.simplifiedVertices / result.originalVertices) * 100);
      console.log(`[PLY] QSlim compressed: ${result.originalVertices.toLocaleString()} → ${result.simplifiedVertices.toLocaleString()} vertices (${result.reductionPercent}%)`);
      return result;
    }
  } catch (err) {
    console.warn('[PLY] SimplifyModifier failed, falling back to triangle sampling:', err);
  }

  return sampleMeshTriangles(geometry, targetCount, result);
}

// ─── Point cloud sampling (uniform stride, preserves colors) ───

function samplePointCloud(
  geometry: THREE.BufferGeometry,
  targetCount: number,
  result: PlyCompressionResult,
): PlyCompressionResult {
  const positions = geometry.attributes.position.array as Float32Array;
  const origCount = positions.length / 3;
  const step = Math.max(1, Math.floor(origCount / targetCount));
  const actualCount = Math.min(targetCount, Math.ceil(origCount / step));

  const newPositions = new Float32Array(actualCount * 3);
  const colors = geometry.attributes.color?.array as Float32Array | undefined;
  const newColors = colors ? new Float32Array(actualCount * 3) : undefined;

  for (let i = 0; i < actualCount; i++) {
    const srcIdx = Math.min(i * step, origCount - 1) * 3;
    newPositions[i * 3] = positions[srcIdx];
    newPositions[i * 3 + 1] = positions[srcIdx + 1];
    newPositions[i * 3 + 2] = positions[srcIdx + 2];
    if (newColors && colors) {
      newColors[i * 3] = colors[srcIdx] || 1;
      newColors[i * 3 + 1] = colors[srcIdx + 1] || 1;
      newColors[i * 3 + 2] = colors[srcIdx + 2] || 1;
    }
  }

  const sampled = new THREE.BufferGeometry();
  sampled.setAttribute('position', new THREE.BufferAttribute(newPositions, 3));
  if (newColors) {
    sampled.setAttribute('color', new THREE.BufferAttribute(newColors, 3));
  }

  // No index — PLYModel will detect this and render as Points
  result.geometry = sampled;
  result.simplifiedVertices = actualCount;
  result.reductionPercent = Math.round((1 - actualCount / result.originalVertices) * 100);
  console.log(`[PLY] Point cloud sampled: ${result.originalVertices.toLocaleString()} → ${actualCount.toLocaleString()} (${result.reductionPercent}%)`);
  return result;
}

// ─── Mesh triangle sampling (uses index to pick triangles, preserves colors) ───

function sampleMeshTriangles(
  geometry: THREE.BufferGeometry,
  targetCount: number,
  result: PlyCompressionResult,
): PlyCompressionResult {
  const positions = geometry.attributes.position.array as Float32Array;
  const indexAttr = geometry.index!; // caller ensures this exists
  const indices = indexAttr.array as Uint32Array | Uint16Array;
  const totalTris = indices.length / 3;

  // targetCount is desired vertex count; for mesh we care about triangle count.
  // Roughly: 1 triangle ≈ 3 vertices in the output (since we don't share vertices).
  const targetTris = Math.floor(targetCount / 3);
  const keepTris = Math.max(500, Math.min(totalTris, targetTris));
  const step = Math.max(1, Math.floor(totalTris / keepTris));

  const newPositions: number[] = [];
  const newIndices: number[] = [];

  // Preserve vertex colors if present
  const hasColors = geometry.hasAttribute('color');
  const srcColors = hasColors ? (geometry.attributes.color.array as Float32Array) : null;
  const newColors: number[] = [];

  for (let i = 0; i < keepTris && i * step < totalTris; i++) {
    const triIdx = i * step;
    for (let j = 0; j < 3; j++) {
      const vi = indices[triIdx * 3 + j];
      newPositions.push(
        positions[vi * 3],
        positions[vi * 3 + 1],
        positions[vi * 3 + 2],
      );
      newIndices.push(i * 3 + j);
      if (srcColors) {
        newColors.push(
          srcColors[vi * 3] ?? 1,
          srcColors[vi * 3 + 1] ?? 1,
          srcColors[vi * 3 + 2] ?? 1,
        );
      }
    }
  }

  const sampled = new THREE.BufferGeometry();
  sampled.setAttribute('position', new THREE.BufferAttribute(new Float32Array(newPositions), 3));
  sampled.setIndex(newIndices);
  if (srcColors && newColors.length > 0) {
    sampled.setAttribute('color', new THREE.BufferAttribute(new Float32Array(newColors), 3));
  }
  sampled.computeVertexNormals();

  const actualVerts = newPositions.length / 3;
  result.geometry = sampled;
  result.simplifiedVertices = actualVerts;
  result.reductionPercent = Math.round((1 - actualVerts / result.originalVertices) * 100);
  console.log(`[PLY] Mesh triangles sampled: ${result.originalVertices.toLocaleString()} → ${actualVerts.toLocaleString()} vertices, ${newIndices.length / 3} tris (${result.reductionPercent}%)`);
  return result;
}
