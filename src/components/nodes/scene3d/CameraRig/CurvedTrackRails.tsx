/* === CurvedTrackRails — CatmullRom spline with draggable control points === */
import { useRef } from 'react';
import * as THREE from 'three';
import { TransformControls } from '@react-three/drei';
import { CameraRig, Vec3 } from '../shared';

export function CurvedTrackRails({ rig, selCp, onSelCp, onMoveCp }: {
  rig: CameraRig; selCp: string | null;
  onSelCp: (id: string | null) => void;
  onMoveCp: (id: string, pos: Vec3) => void;
}) {
  if (!rig.curved || rig.curved.controlPoints.length < 2) return null;
  const pts = rig.curved.controlPoints.map(p => new THREE.Vector3(...p.position));
  const curve = new THREE.CatmullRomCurve3(pts);
  const tubeGeom = new THREE.TubeGeometry(curve, 64, 0.06, 8, false);
  const cpRefs = useRef<Map<string, THREE.Mesh>>(new Map());
  return (
    <group>
      <mesh>
        <primitive object={tubeGeom} attach="geometry" />
        <meshStandardMaterial color="#888" roughness={0.5} metalness={0.7} />
      </mesh>
      {rig.curved.controlPoints.map((cp) => {
        const mesh = cpRefs.current.get(cp.id);
        return (
          <group key={cp.id}>
            <mesh ref={el => { if (el) cpRefs.current.set(cp.id, el as any); }}
              position={cp.position} onClick={e => { e.stopPropagation(); onSelCp(cp.id); }}>
              <sphereGeometry args={[0.18, 12, 12]} />
              <meshStandardMaterial color={selCp === cp.id ? '#ffcc00' : '#fff'} roughness={0.3} />
            </mesh>
            {selCp === cp.id && mesh && <TransformControls object={mesh} mode="translate" size={0.5}
              onObjectChange={() => { const p = mesh?.position; if (p) onMoveCp(cp.id, [p.x, p.y, p.z]); }} />}
          </group>
        );
      })}
    </group>
  );
}
