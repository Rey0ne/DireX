/* === Shared types for 3D scene batch rendering === */

export type Vec3 = [number, number, number];

export interface SceneObject {
  id: string;
  type: 'box' | 'sphere' | 'cylinder' | 'plane' | 'figure' | 'camera';
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
  color?: string;
  figurePose?: string;
  figureSrc?: string;
  figureFmt?: string;
  // ── NEW optional fields (additive, backward-compatible) ──
  lodMode?: 'auto' | 'full' | 'simplified' | 'impostor';
  instanceGroup?: string;   // set internally by batch renderer
}

export interface InstancedTransform {
  position: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
}

export interface BatchedGroup {
  groupKey: string;          // e.g. "figure:/models/tree.glb" or "primitive:box"
  objects: SceneObject[];
  transforms: InstancedTransform[];
  modelUrl?: string;         // only for figures
  format?: 'glb' | 'fbx';   // only for figures
}
