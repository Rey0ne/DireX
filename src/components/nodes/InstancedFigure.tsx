/* === InstancedFigure — Phase 2: same-model multi-instance via InstancedMesh === */
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { BatchedGroup, Vec3 } from './sceneTypes';

/* ── temp objects for matrix compose (hot path, avoid allocation) ── */
const _mtx = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _pos = new THREE.Vector3();
const _scl = new THREE.Vector3();

function composeMatrix(pos: Vec3, rot?: Vec3, scl?: Vec3): THREE.Matrix4 {
  _pos.set(pos[0], pos[1], pos[2]);
  _scl.set(scl?.[0] ?? 1, scl?.[1] ?? 1, scl?.[2] ?? 1);
  if (rot) _euler.set(rot[0], rot[1], rot[2]);
  else _euler.set(0, 0, 0);
  _quat.setFromEuler(_euler);
  return _mtx.compose(_pos, _quat, _scl);
}

/* ── model cache (GLB + FBX) ── */
const modelCache = new Map<string, THREE.Group>();

function disposeMat(mat: any) {
  for (const k of Object.keys(mat)) {
    const v = mat[k];
    if (v && v.isTexture) v.dispose();
  }
  mat.dispose();
}

/* ── hook: load model once, cache forever ── */
function useCachedModel(src: string, format: 'glb' | 'fbx'): THREE.Group | null {
  const [scene, setScene] = useState<THREE.Group | null>(null);
  useEffect(() => {
    const key = `${format}:${src}`;
    if (modelCache.has(key)) {
      setScene(modelCache.get(key)!);
      return;
    }
    let cancelled = false;
    if (format === 'glb') {
      const loader = new GLTFLoader();
      loader.load(
        src,
        (gltf) => {
          if (cancelled) return;
          modelCache.set(key, gltf.scene);
          setScene(gltf.scene);
        },
        undefined,
        () => { if (!cancelled) setScene(new THREE.Group()); }
      );
    } else {
      const loader = new FBXLoader();
      loader.load(
        src,
        (fbx) => {
          if (cancelled) return;
          modelCache.set(key, fbx);
          setScene(fbx);
        },
        undefined,
        () => { if (!cancelled) setScene(new THREE.Group()); }
      );
    }
    return () => { cancelled = true; };
  }, [src, format]);
  return scene;
}

/* ── analyse model: has skeleton? extract static mesh groups ── */
interface MeshGroup {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

function analyseModel(scene: THREE.Group): { hasSkin: boolean; meshGroups: MeshGroup[] } {
  let hasSkin = false;
  const byMat = new Map<string, { geoms: THREE.BufferGeometry[]; mat: THREE.Material }>();

  scene.traverse((child: any) => {
    if (child.isSkinnedMesh) hasSkin = true;
    // Include BOTH regular Mesh and SkinnedMesh geometry (no-anim models don't need skeleton)
    if (child.isMesh && child.geometry) {
      const key = child.material.uuid;
      if (!byMat.has(key)) {
        byMat.set(key, { geoms: [], mat: child.material });
      }
      byMat.get(key)!.geoms.push(child.geometry.clone());
    }
  });

  const meshGroups: MeshGroup[] = [];
  for (const [, { geoms, mat }] of byMat) {
    const geo = geoms.length > 1 ? mergeGeometries(geoms, false) : geoms[0];
    meshGroups.push({ geometry: geo, material: mat.clone() });
  }

  // Only use skeleton fallback if model has skin AND no extractable meshes
  // (purely skeletal with no renderable geometry)
  return { hasSkin: hasSkin && meshGroups.length === 0, meshGroups };
}

/* ══════════════════════════════════════════════════════════════════════
   InstancedFigure
   ══════════════════════════════════════════════════════════════════════ */
interface Props {
  group: BatchedGroup;
  onSelectInstance?: (objectId: string) => void;
}

export function InstancedFigure({ group, onSelectInstance }: Props) {
  const modelUrl = group.modelUrl!;
  const format = group.format || 'glb';
  const scene = useCachedModel(modelUrl, format);

  // Analyse model once
  const analysis = useMemo(() => {
    if (!scene) return null;
    return analyseModel(scene);
  }, [scene]);

  // InstancedMeshes for static models
  const instancedMeshes = useMemo(() => {
    if (!analysis || analysis.hasSkin || analysis.meshGroups.length === 0) return null;
    const count = group.objects.length;
    return analysis.meshGroups.map(({ geometry, material }) => {
      const im = new THREE.InstancedMesh(geometry, material, count);
      im.castShadow = true;
      im.receiveShadow = true;
      im.name = `ifig_${modelUrl.slice(-20)}`;
      group.objects.forEach((obj, i) => {
        im.setMatrixAt(i, composeMatrix(obj.position, obj.rotation, obj.scale));
      });
      im.instanceMatrix.needsUpdate = true;
      return im;
    });
  }, [analysis, group.objects, modelUrl]);

  // Update matrices each frame (objects may move via gizmo)
  useFrame(() => {
    if (!instancedMeshes) return;
    instancedMeshes.forEach((im) => {
      let dirty = false;
      group.objects.forEach((obj, i) => {
        im.setMatrixAt(i, composeMatrix(obj.position, obj.rotation, obj.scale));
        dirty = true;
      });
      if (dirty) im.instanceMatrix.needsUpdate = true;
    });
  });

  // Click → objectId
  const handleClick = (e: any) => {
    if (!onSelectInstance) return;
    const { instanceId } = e;
    if (instanceId !== undefined) {
      for (const im of instancedMeshes || []) {
        if (e.object === im && instanceId < group.objects.length) {
          onSelectInstance(group.objects[instanceId].id);
          return;
        }
      }
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      instancedMeshes?.forEach((im) => {
        im.geometry.dispose();
        if (Array.isArray(im.material)) {
          (im.material as THREE.Material[]).forEach((m) => m.dispose());
        } else {
          (im.material as THREE.Material).dispose();
        }
      });
      analysis?.meshGroups.forEach(({ geometry, material }) => {
        // Only dispose if NOT owned by an InstancedMesh (which takes ownership)
        const owned = instancedMeshes?.some((im) => im.geometry === geometry);
        if (!owned) {
          geometry.dispose();
          disposeMat(material);
        }
      });
    };
  }, [instancedMeshes, analysis]);

  // ═══ Skeleton fallback: render individual copies ═══
  if (analysis?.hasSkin && scene) {
    return (
      <group>
        {group.objects.map((obj) => (
          <group
            key={obj.id}
            position={obj.position as [number, number, number]}
            rotation={obj.rotation as [number, number, number]}
            scale={obj.scale as [number, number, number]}
          >
            <primitive object={scene.clone(true)} />
          </group>
        ))}
      </group>
    );
  }

  // ═══ Static model: InstancedMesh ═══
  if (instancedMeshes && instancedMeshes.length > 0) {
    return (
      <group onClick={handleClick}>
        {instancedMeshes.map((im, i) => (
          <primitive key={i} object={im} />
        ))}
      </group>
    );
  }

  // Loading or empty
  return null;
}
