/* === BoneController — skeleton visualization + bone selection + rotate gizmo === */
import React, { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { SkeletonData } from './types';

// ─── BoneSphere — clickable sphere tracking a single bone ──
function BoneSphere({ bone, isSelected, onClick, color }: {
  bone: THREE.Bone; isSelected: boolean; onClick: () => void; color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current) return;
    const wp = new THREE.Vector3();
    bone.getWorldPosition(wp);
    ref.current.position.copy(wp);
  });
  return (
    <mesh ref={ref} onClick={e => { e.stopPropagation(); onClick(); }}
      scale={isSelected ? 1.4 : 1}>
      <sphereGeometry args={[0.07, 12, 12]} />
      <meshBasicMaterial color={isSelected ? '#ffcc00' : color} transparent opacity={0.85} />
    </mesh>
  );
}

// ─── BoneLine — connects a bone to its parent ─────────────
const tempA = new THREE.Vector3();
const tempB = new THREE.Vector3();
function BoneLine({ bone, parentBone, color }: {
  bone: THREE.Bone; parentBone: THREE.Bone | null; color: string;
}) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (!ref.current || !parentBone) return;
    bone.getWorldPosition(tempA);
    parentBone.getWorldPosition(tempB);
    const mid = tempA.clone().add(tempB).multiplyScalar(0.5);
    const dir = tempA.clone().sub(tempB);
    const len = dir.length();
    if (len < 0.001) { ref.current.visible = false; return; }
    ref.current.visible = true;
    ref.current.position.copy(mid);
    ref.current.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0), dir.normalize());
    ref.current.scale.set(0.025, len / 2, 0.025);
  });
  return (
    <mesh ref={ref}>
      <cylinderGeometry args={[1, 1, 2, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0.45} />
    </mesh>
  );
}

// ─── BoneController — renders full skeleton gizmo ─────────
export function BoneController({ skeleton, selectedBone, onSelectBone, gizmoRef }: {
  skeleton: SkeletonData;
  selectedBone: string | null;
  onSelectBone: (name: string | null) => void;
  gizmoRef: React.MutableRefObject<THREE.Object3D | null>;
}) {
  // Build parent lookup: bone name → parent bone
  const parentMap = useMemo(() => {
    const m = new Map<string, THREE.Bone | null>();
    for (const info of skeleton.bones) {
      const p = info.bone.parent;
      m.set(info.name, p instanceof THREE.Bone ? p : null);
    }
    return m;
  }, [skeleton]);

  // Colors: selected gets yellow, others get a gradient based on depth
  const boneColor = useCallback((name: string, depth: number) => {
    if (name === selectedBone) return '#ffcc00';
    // Depth-based color: spine/hips = warm, limbs = cool
    const t = Math.min(1, depth / 5);
    const r = Math.round(180 + 40 * t);
    const g = Math.round(140 - 40 * t);
    const b = Math.round(180 - 60 * t);
    return `rgb(${r},${g},${b})`;
  }, [selectedBone]);

  // Compute depth for each bone
  const depths = useMemo(() => {
    const d = new Map<string, number>();
    const walk = (b: THREE.Bone, depth: number) => {
      d.set(b.name, depth);
      for (const child of b.children) {
        if (child instanceof THREE.Bone) walk(child, depth + 1);
      }
    };
    walk(skeleton.rootBone, 0);
    return d;
  }, [skeleton]);

  // Get the currently selected bone's Object3D for TransformControls
  const selBoneObj = useMemo(() => {
    if (!selectedBone) return null;
    const info = skeleton.bones.find(b => b.name === selectedBone);
    return info?.bone ?? null;
  }, [selectedBone, skeleton]);

  // Forward the selected bone ref for PiP cam tracking (future use)
  useFrame(() => {
    gizmoRef.current = selBoneObj;
  });

  return (
    <group>
      {/* Bone-to-parent connecting lines */}
      {skeleton.bones.map(info => {
        const parent = parentMap.get(info.name);
        return (
          <BoneLine key={`ln_${info.name}`} bone={info.bone}
            parentBone={parent ?? null}
            color={info.name === selectedBone ? '#ffcc00' : '#8090a0'} />
        );
      })}

      {/* Clickable bone spheres */}
      {skeleton.bones.map(info => {
        const depth = depths.get(info.name) ?? 0;
        return (
          <BoneSphere key={`sp_${info.name}`} bone={info.bone}
            isSelected={info.name === selectedBone}
            onClick={() => onSelectBone(info.name === selectedBone ? null : info.name)}
            color={boneColor(info.name, depth)} />
        );
      })}

      {/* TransformControls on selected bone (rotate only) */}
      {selBoneObj && (
        <TransformControls object={selBoneObj} mode="rotate" size={0.6}
          onObjectChange={() => {
            // Bone rotation changed — dispatch event for future keyframe recording
            window.dispatchEvent(new CustomEvent('bone-transformed', {
              detail: { boneName: selectedBone },
            }));
          }}
        />
      )}
    </group>
  );
}
