/* === RetargetController — BVH → Model Bone Driver ===
 * React Three Fiber component. Attach to a scene to drive a 3D model
 * with Kimodo BVH motion data.
 *
 * Modes (auto-detected from model):
 *   'full'       — model has skeleton, drives individual bones
 *   'root-only'  — model has no skeleton, follows Hips transform
 *   'stick-figure' — no model, BVHSkeleton renders directly (no controller needed)
 *
 * Usage:
 *   <RetargetController
 *     posedJoints={bvhData.posedJoints}
 *     jointNames={bvhData.jointNames}
 *     modelRef={modelGroupRef}
 *     playing={isPlaying}
 *     fps={30}
 *   />
 */

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  buildRetargetMapping,
  computeFramePose,
  computeRootOnly,
  determineRetargetMode,
  mappingReport,
  quatSlerp,
  type RetargetMapping,
  type Quat,
} from './retarget-engine';

// ── Types ────────────────────────────────────────

export interface RetargetControllerProps {
  /** Kimodo output: [frames, joints, 3] in meters */
  posedJoints: number[][][];
  /** Joint names matching posedJoints dimension 1 */
  jointNames: string[];
  /** Ref to the target model's root Object3D */
  modelRef: React.RefObject<THREE.Object3D | null>;
  /** Whether playback is active */
  playing?: boolean;
  /** Frames per second (Kimodo default: 30) */
  fps?: number;
  /** Playback speed multiplier */
  speed?: number;
  /** Callback when retarget mapping is built */
  onMappingReady?: (mode: string, report: string[], quality: number) => void;
}

export interface RetargetState {
  mode: 'full' | 'root-only' | 'stick-figure';
  mapping: RetargetMapping | null;
  boneRefs: Map<string, THREE.Bone>;
  skeletonRoot: THREE.Bone | null;
  report: string[];
  quality: number;
}

// ── Skeleton scanner ─────────────────────────────

/**
 * Traverse a Three.js Object3D tree and collect all Bone objects.
 * Returns { boneNames[], boneMap: name→Bone, skeletonRoot: Bone|null }
 */
function scanSkeleton(root: THREE.Object3D): {
  boneNames: string[];
  boneMap: Map<string, THREE.Bone>;
  skeletonRoot: THREE.Bone | null;
} {
  const boneNames: string[] = [];
  const boneMap = new Map<string, THREE.Bone>();
  let skeletonRoot: THREE.Bone | null = null;

  root.traverse((child) => {
    if (child instanceof THREE.Bone) {
      const name = child.name || `bone_${boneNames.length}`;
      boneNames.push(name);
      boneMap.set(name, child);

      // The root-most bone is the skeleton root
      if (!skeletonRoot || child.parent === root || !(child.parent instanceof THREE.Bone)) {
        skeletonRoot = child;
      }
    }
  });

  // If no Bones found, try getting skeleton from SkinnedMesh
  if (boneNames.length === 0) {
    root.traverse((child) => {
      if (child instanceof THREE.SkinnedMesh && child.skeleton) {
        for (const bone of child.skeleton.bones) {
          const name = bone.name || `bone_${boneNames.length}`;
          if (!boneMap.has(name)) {
            boneNames.push(name);
            boneMap.set(name, bone);
          }
        }
        if (!skeletonRoot && child.skeleton.bones.length > 0) {
          skeletonRoot = child.skeleton.bones[0];
          // Walk up to actual root
          let b: THREE.Bone = skeletonRoot;
          while (b.parent instanceof THREE.Bone) b = b.parent;
          skeletonRoot = b;
        }
      }
    });
  }

  return { boneNames, boneMap, skeletonRoot };
}

// ── Main Component ───────────────────────────────

export default function RetargetController({
  posedJoints,
  jointNames,
  modelRef,
  playing = true,
  fps = 30,
  speed = 1,
  onMappingReady,
}: RetargetControllerProps) {
  const stateRef = useRef<RetargetState>({
    mode: 'stick-figure',
    mapping: null,
    boneRefs: new Map(),
    skeletonRoot: null,
    report: [],
    quality: 0,
  });
  const frameRef = useRef(0);
  const prevPlaying = useRef(false);
  const initialized = useRef(false);

  // ── Initialize: scan model, build mapping ──────
  useEffect(() => {
    const model = modelRef.current;
    if (!model) {
      stateRef.current = { ...stateRef.current, mode: 'stick-figure', report: ['无目标模型'], quality: 0 };
      initialized.current = true;
      onMappingReady?.('stick-figure', ['无目标模型 — 使用火柴人渲染'], 0);
      return;
    }

    const { boneNames, boneMap, skeletonRoot } = scanSkeleton(model);

    if (boneNames.length === 0) {
      // No skeleton — root-follow mode
      stateRef.current = {
        mode: 'root-only',
        mapping: null,
        boneRefs: new Map(),
        skeletonRoot: null,
        report: ['模型无骨骼 — 根骨骼跟随模式'],
        quality: 0,
      };
      initialized.current = true;
      onMappingReady?.('root-only', ['模型无骨骼 — 整体跟随运动轨迹'], 0);
      console.log('[retarget] root-only mode — no skeleton found in model');
      return;
    }

    // Build mapping
    const mapping = buildRetargetMapping(boneNames);
    const report = mappingReport(mapping);
    const mode = determineRetargetMode(boneNames);

    // Filter boneRefs to only mapped bones
    const mappedBones = new Map<string, THREE.Bone>();
    for (const [, tgtName] of mapping.reverseMap) {
      const bone = boneMap.get(tgtName);
      if (bone) mappedBones.set(tgtName, bone);
    }

    stateRef.current = {
      mode,
      mapping,
      boneRefs: mappedBones,
      skeletonRoot,
      report,
      quality: mapping.quality,
    };
    initialized.current = true;

    console.log(`[retarget] mode=${mode} quality=${Math.round(mapping.quality * 100)}% bones=${mappedBones.size}/${boneNames.length}`);
    console.log('[retarget]', report.join(' | '));

    onMappingReady?.(mode, report, mapping.quality);
  }, [modelRef.current, posedJoints, jointNames]);

  // ── Reset frame counter on play start ──────────
  useEffect(() => {
    if (playing && !prevPlaying.current) {
      frameRef.current = 0;
    }
    prevPlaying.current = playing;
  }, [playing]);

  // ── Per-frame bone driving ────────────────────
  useFrame((_, delta) => {
    const state = stateRef.current;
    if (!initialized.current || !playing || posedJoints.length === 0) return;

    const totalFrames = posedJoints.length;
    frameRef.current += delta * fps * speed;

    // Loop
    while (frameRef.current >= totalFrames) frameRef.current -= totalFrames;
    while (frameRef.current < 0) frameRef.current += totalFrames;

    const f0 = Math.floor(frameRef.current);
    const f1 = Math.min(f0 + 1, totalFrames - 1);
    const frac = frameRef.current - f0;

    const frameA = posedJoints[f0];
    const frameB = posedJoints[f1];

    if (state.mode === 'root-only') {
      // ── Root-follow: apply Hips transform to entire model ──
      const rootA = computeRootOnly(posedJoints, jointNames, f0);
      const rootB = computeRootOnly(posedJoints, jointNames, f1);
      if (!rootA && !rootB) return;

      const model = modelRef.current;
      if (!model) return;

      if (rootA && rootB) {
        // Interpolate position
        model.position.set(
          rootA.position[0] + (rootB.position[0] - rootA.position[0]) * frac,
          rootA.position[1] + (rootB.position[1] - rootA.position[1]) * frac,
          rootA.position[2] + (rootB.position[2] - rootA.position[2]) * frac,
        );
        // Slerp rotation
        const q = quatSlerp(rootA.quaternion, rootB.quaternion, frac);
        model.quaternion.set(q[0], q[1], q[2], q[3]);
      } else {
        const root = rootA || rootB!;
        model.position.set(root.position[0], root.position[1], root.position[2]);
        model.quaternion.set(root.quaternion[0], root.quaternion[1], root.quaternion[2], root.quaternion[3]);
      }
      return;
    }

    if (state.mode === 'full' && state.mapping) {
      // ── Full retarget: drive individual bones ──
      const poseA = computeFramePose(frameA, jointNames, state.mapping);
      const poseB = computeFramePose(frameB, jointNames, state.mapping);

      const boneMapA = new Map<string, Quat>();
      for (const bp of poseA.bones) boneMapA.set(bp.name, bp.localQuaternion);
      const boneMapB = new Map<string, Quat>();
      for (const bp of poseB.bones) boneMapB.set(bp.name, bp.localQuaternion);

      // Drive each mapped bone
      for (const [tgtName, bone] of state.boneRefs) {
        const qA = boneMapA.get(tgtName);
        const qB = boneMapB.get(tgtName);

        if (qA && qB) {
          const q = quatSlerp(qA, qB, frac);
          bone.quaternion.set(q[0], q[1], q[2], q[3]);
        } else if (qA) {
          bone.quaternion.set(qA[0], qA[1], qA[2], qA[3]);
        }
      }

      // Root bone position
      const rootPosA = poseA.root.position;
      const rootPosB = poseB.root.position;
      const rootQuatA = poseA.root.quaternion;
      const rootQuatB = poseB.root.quaternion;

      // Find the root bone (usually Hips mapped bone)
      const hipsTgtName = state.mapping.jointMap.get('Hips');
      if (hipsTgtName && state.boneRefs.has(hipsTgtName)) {
        const rootBone = state.boneRefs.get(hipsTgtName)!;
        rootBone.position.set(
          rootPosA[0] + (rootPosB[0] - rootPosA[0]) * frac,
          rootPosA[1] + (rootPosB[1] - rootPosA[1]) * frac,
          rootPosA[2] + (rootPosB[2] - rootPosA[2]) * frac,
        );
        const rootQ = quatSlerp(rootQuatA, rootQuatB, frac);
        rootBone.quaternion.set(rootQ[0], rootQ[1], rootQ[2], rootQ[3]);
      }
    }
  });

  return null; // Invisible controller — renders nothing
}

// ── Utility hook: useRetargetState ────────────────

/**
 * Convenience hook for components that need to react to retarget state changes.
 */
export function createRetargetState(): {
  mode: 'full' | 'root-only' | 'stick-figure';
  report: string[];
  quality: number;
  onMappingReady: (mode: string, report: string[], quality: number) => void;
} {
  let state = { mode: 'stick-figure' as const, report: [] as string[], quality: 0 };
  return {
    get mode() { return state.mode; },
    get report() { return state.report; },
    get quality() { return state.quality; },
    onMappingReady(mode: string, report: string[], quality: number) {
      state = { mode: mode as any, report, quality };
    },
  };
}
