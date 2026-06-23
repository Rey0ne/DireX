/* === InstancedPrimitives — batch all primitives by type into 1-4 draw calls === */
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { BatchedGroup, Vec3 } from './sceneTypes';

const _mtx = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _pos = new THREE.Vector3();
const _scl = new THREE.Vector3();

const PRIMITIVE_GEOS: Record<string, THREE.BufferGeometry> = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(0.5, 28, 28),
  cylinder: new THREE.CylinderGeometry(0.5, 0.5, 1, 24),
  plane: new THREE.PlaneGeometry(1, 1),
};

const PRIMITIVE_LABELS: Record<string, string> = {
  box: '立方体', sphere: '球体', cylinder: '圆柱', plane: '平面',
};

interface Props {
  groups: BatchedGroup[];
  onSelectInstance?: (objectId: string) => void;
}

function composeMatrix(pos: Vec3, rot?: Vec3, scl?: Vec3): THREE.Matrix4 {
  _pos.set(pos[0], pos[1], pos[2]);
  _scl.set(scl?.[0] ?? 1, scl?.[1] ?? 1, scl?.[2] ?? 1);
  if (rot) _euler.set(rot[0], rot[1], rot[2]);
  else _euler.set(0, 0, 0);
  _quat.setFromEuler(_euler);
  return _mtx.compose(_pos, _quat, _scl);
}

export function InstancedPrimitives({ groups, onSelectInstance }: Props) {
  const meshRefs = useRef<Map<string, THREE.InstancedMesh>>(new Map());

  // Create one InstancedMesh per primitive type
  const instances = useMemo(() => {
    return groups.map(group => {
      const type = group.groupKey.replace('primitive:', '');
      const geo = PRIMITIVE_GEOS[type];
      if (!geo) return null;

      const count = group.objects.length;
      const mat = new THREE.MeshStandardMaterial({
        color: '#8899aa',
        roughness: 0.35,
        metalness: 0.25,
      });

      const im = new THREE.InstancedMesh(geo, mat, count);
      im.castShadow = true;
      im.receiveShadow = true;
      im.name = `instanced_${type}`;

      // Set initial matrices and colors
      const color = new THREE.Color();
      group.objects.forEach((obj, i) => {
        const matrix = composeMatrix(obj.position, obj.rotation, obj.scale);
        im.setMatrixAt(i, matrix);
        if (obj.color) {
          color.set(obj.color);
          im.setColorAt(i, color);
        }
      });
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;

      meshRefs.current.set(type, im);
      return { type, im, objects: group.objects };
    }).filter(Boolean) as { type: string; im: THREE.InstancedMesh; objects: import('./sceneTypes').SceneObject[] }[];
  }, [groups]);

  // Update matrices each frame (objects may have moved via gizmo)
  useFrame(() => {
    instances.forEach(({ im, objects }) => {
      const color = new THREE.Color();
      let dirty = false;
      let colorDirty = false;
      objects.forEach((obj, i) => {
        const matrix = composeMatrix(obj.position, obj.rotation, obj.scale);
        im.setMatrixAt(i, matrix);
        if (obj.color) {
          color.set(obj.color);
          im.setColorAt(i, color);
          colorDirty = true;
        }
        dirty = true;
      });
      if (dirty) im.instanceMatrix.needsUpdate = true;
      if (colorDirty && im.instanceColor) im.instanceColor.needsUpdate = true;
    });
  });

  // Raycast → objectId mapping for click selection
  const handleClick = (e: any) => {
    if (!onSelectInstance) return;
    const { instanceId } = e;
    if (instanceId !== undefined) {
      // Find which InstancedMesh and which instance was clicked
      for (const { im, objects } of instances) {
        if (e.object === im && instanceId < objects.length) {
          onSelectInstance(objects[instanceId].id);
          return;
        }
      }
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      instances.forEach(({ im }) => {
        im.geometry.dispose();
        if (Array.isArray(im.material)) {
          (im.material as THREE.Material[]).forEach(m => m.dispose());
        } else {
          (im.material as THREE.Material).dispose();
        }
      });
      meshRefs.current.clear();
    };
  }, [instances]);

  return (
    <group onClick={handleClick}>
      {instances.map(({ im }) => (
        <primitive key={(im as any).uuid ?? im.name} object={im} />
      ))}
    </group>
  );
}
