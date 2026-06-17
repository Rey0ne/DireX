/* === SkinnedFigure — loads GLB, extracts skeleton, renders model + bone gizmos === */
import React, { useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { BoneController } from './BoneController';
import { SkeletonData, BoneInfo } from './types';
import { ErrorBoundary } from '../shared';

// ─── Skeleton extraction (from CLONED scene) ────────
function extractSkeleton(root: THREE.Object3D): SkeletonData | null {
  const skinnedMeshes: THREE.SkinnedMesh[] = [];
  root.traverse(child => {
    if ((child as any).isSkinnedMesh) skinnedMeshes.push(child as THREE.SkinnedMesh);
  });
  if (skinnedMeshes.length === 0) return null;

  const sm = skinnedMeshes[0];
  const { skeleton } = sm;
  if (!skeleton || skeleton.bones.length === 0) return null;

  // Find the true root bone (walk up past intermediate groups)
  let rootBone = skeleton.bones[0];
  while (rootBone.parent && rootBone.parent !== root &&
    (rootBone.parent as any).isBone) {
    rootBone = rootBone.parent as THREE.Bone;
  }

  const bones: BoneInfo[] = skeleton.bones.map(bone => ({
    bone,
    name: bone.name,
    worldPos: new THREE.Vector3(),
  }));

  const restRotations = new Map<string, THREE.Quaternion>();
  for (const bone of skeleton.bones) {
    restRotations.set(bone.name, bone.quaternion.clone());
  }

  return { bones, rootBone, skeleton, restRotations };
}

// ─── Lambertize helper (Material conversion) ───────
function lambertize(child: any) {
  if (child.isMesh && child.material?.isMeshStandardMaterial) {
    const L = new THREE.MeshLambertMaterial();
    L.color.copy(child.material.color);
    L.map = child.material.map;
    child.material = L;
  }
}

// ─── SkinnedFigure ──────────────────────────────────
export function SkinnedFigure({ src, selectedBone, onSelectBone, gizmoRef }: {
  src: string;
  selectedBone: string | null;
  onSelectBone: (name: string | null) => void;
  gizmoRef: React.MutableRefObject<THREE.Object3D | null>;
}) {
  // useGLTF caches globally — we clone so each instance is independent
  const { scene } = useGLTF(src);

  const { cloned, skeleton } = useMemo(() => {
    const s = scene.clone(true);
    s.traverse(lambertize);
    const sk = extractSkeleton(s);
    return { cloned: s, skeleton: sk };
  }, [scene]);

  // Wrap cloned scene so it renders
  const wrapped = useMemo(() => {
    const g = new THREE.Group();
    g.add(cloned);
    return g;
  }, [cloned]);

  return (
    <group>
      <primitive object={wrapped} />
      {skeleton && (
        <BoneController skeleton={skeleton} selectedBone={selectedBone}
          onSelectBone={onSelectBone} gizmoRef={gizmoRef} />
      )}
    </group>
  );
}

// ─── SafeSkinnedFigure — with error boundary + fallback ──
export function SafeSkinnedFigure({ src, fallback, selectedBone, onSelectBone, gizmoRef }: {
  src: string;
  fallback: React.ReactNode;
  selectedBone: string | null;
  onSelectBone: (name: string | null) => void;
  gizmoRef: React.MutableRefObject<THREE.Object3D | null>;
}) {
  return (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={null}>
        <SkinnedFigure src={src}
          selectedBone={selectedBone} onSelectBone={onSelectBone}
          gizmoRef={gizmoRef} />
      </Suspense>
    </ErrorBoundary>
  );
}
