/* === CameraGizmo — Camera GLB model + fallback === */
import { useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { Vec3, ErrorBoundary } from './shared';

export function CameraGLB({ pos, tgt }: { pos: Vec3; tgt: Vec3 }) {
  const { scene } = useGLTF('/models/IMAXX%20%E6%91%84%E5%83%8F%E6%9C%BA.glb');
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.rotation.set(0, Math.PI - 13 * Math.PI / 180, 0);
    c.traverse((ch: any) => {
      if (ch.isMesh) {
        ch.castShadow = true;
        if (ch.material) {
          ch.material.roughness = 0.5;
          ch.material.metalness = 0;
          ch.material.emissive = ch.material.emissive || new THREE.Color('#444');
          ch.material.emissiveIntensity = 0.3;
        }
      }
    });
    return c;
  }, [scene]);
  return <primitive object={cloned} position={pos} lookAt={tgt} scale={1.5} />;
}

export function FallbackCamera({ pos, tgt }: { pos: Vec3; tgt: Vec3 }) {
  return (
    <group position={pos as [number, number, number]}>
      <mesh lookAt={tgt}>
        <boxGeometry args={[0.45, 0.28, 0.4]} />
        <meshStandardMaterial color="#3a3a44" roughness={0.5} />
      </mesh>
      <mesh lookAt={tgt} position={[0, -0.04, 0.22]}>
        <boxGeometry args={[0.38, 0.16, 0.2]} />
        <meshStandardMaterial color="#f44" emissive="#f22" emissiveIntensity={0.6} />
      </mesh>
      <mesh lookAt={tgt} position={[0, 0, 0.28]}>
        <cylinderGeometry args={[0.09, 0.07, 0.16, 12]} />
        <meshStandardMaterial color="#555" roughness={0.3} />
      </mesh>
    </group>
  );
}

/** Convenience wrapper: CameraGLB with error boundary + suspense. Renders at local origin — parent group handles world positioning. */
export function CameraObject() {
  return (
    <>
      {/* Direction line + look-at indicator */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, -0.6]}>
        <cylinderGeometry args={[0.01, 0.01, 1, 8]} />
        <meshBasicMaterial color="#ff4444" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 0.2, -3]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#ff4444" transparent opacity={0.5} />
      </mesh>
      <ErrorBoundary fallback={<FallbackCamera pos={[0, 0.2, 0]} tgt={[0, 0.2, -3]} />}>
        <Suspense fallback={null}>
          <CameraGLB pos={[0, 0.2, 0]} tgt={[0, 0, -3]} />
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
