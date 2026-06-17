/* === DollyRails — straight track with draggable endpoints === */
import { useRef } from 'react';
import * as THREE from 'three';
import { TransformControls } from '@react-three/drei';
import { CameraRig, Vec3 } from '../shared';

export function DollyRails({ rig, selCp, onSelCp, onMoveCp }: {
  rig: CameraRig; selCp: string | null;
  onSelCp: (id: string | null) => void;
  onMoveCp: (id: string, pos: Vec3) => void;
}) {
  if (!rig.dolly) return null;
  const { pointA, pointB } = rig.dolly;
  const dir = new THREE.Vector3(pointB[0] - pointA[0], pointB[1] - pointA[1], pointB[2] - pointA[2]);
  const len = dir.length(); dir.normalize();
  const mid: Vec3 = [(pointA[0] + pointB[0]) / 2, (pointA[1] + pointB[1]) / 2, (pointA[2] + pointB[2]) / 2];
  const aRef = useRef<THREE.Mesh>(null);
  const bRef = useRef<THREE.Mesh>(null);
  return (
    <group>
      <mesh position={[mid[0], mid[1] + 0.05, mid[2]]}
        quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)}>
        <cylinderGeometry args={[0.08, 0.08, len, 8]} />
        <meshStandardMaterial color="#aaa" roughness={0.5} metalness={0.8} />
      </mesh>
      <mesh ref={aRef} position={pointA} onClick={e => { e.stopPropagation(); onSelCp('A'); }}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial color={selCp === 'A' ? '#ffcc00' : '#fff'} roughness={0.3} />
      </mesh>
      {selCp === 'A' && aRef.current && <TransformControls object={aRef.current} mode="translate" size={0.5}
        onObjectChange={() => { const p = aRef.current?.position; if (p) onMoveCp('A', [p.x, p.y, p.z]); }} />}
      <mesh ref={bRef} position={pointB} onClick={e => { e.stopPropagation(); onSelCp('B'); }}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial color={selCp === 'B' ? '#ffcc00' : '#fff'} roughness={0.3} />
      </mesh>
      {selCp === 'B' && bRef.current && <TransformControls object={bRef.current} mode="translate" size={0.5}
        onObjectChange={() => { const p = bRef.current?.position; if (p) onMoveCp('B', [p.x, p.y, p.z]); }} />}
    </group>
  );
}
