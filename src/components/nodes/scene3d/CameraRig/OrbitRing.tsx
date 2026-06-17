/* === OrbitRing — circular camera path === */
import * as THREE from 'three';
import { CameraRig } from '../shared';

export function OrbitRing({ rig }: { rig: CameraRig }) {
  if (!rig.orbit) return null;
  const { center, radius, height, startAngle, endAngle } = rig.orbit;
  const steps = 64;
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = startAngle + (endAngle - startAngle) * i / steps;
    pts.push(new THREE.Vector3(
      center[0] + Math.cos(a) * radius,
      center[1] + height,
      center[2] + Math.sin(a) * radius));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const tubeGeom = new THREE.TubeGeometry(curve, 64, 0.05, 8, false);
  return (
    <group>
      <mesh>
        <primitive object={tubeGeom} attach="geometry" />
        <meshStandardMaterial color="#888" roughness={0.5} metalness={0.7} />
      </mesh>
    </group>
  );
}
