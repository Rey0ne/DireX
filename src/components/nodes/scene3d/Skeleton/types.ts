/* === Skeleton types === */
import * as THREE from 'three';

/** Runtime reference to a bone in the scene */
export interface BoneInfo {
  bone: THREE.Bone;
  name: string;
  /** World position updated each frame (read-only for gizmo placement) */
  worldPos: THREE.Vector3;
}

/** Extracted skeleton data from a loaded SkinnedMesh */
export interface SkeletonData {
  bones: BoneInfo[];
  rootBone: THREE.Bone;
  skeleton: THREE.Skeleton;
  /** Rest-pose quaternions keyed by bone name */
  restRotations: Map<string, THREE.Quaternion>;
}
