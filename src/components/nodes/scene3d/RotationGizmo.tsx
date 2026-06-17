/* === RotationGizmo — custom 3-axis rotation rings === */
import { useRef, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { Vec3, SCALE_FACTOR } from './shared';

export function RotationGizmo({ center, onRotate }: {
  center: Vec3;
  onRotate: (axis: 0 | 1 | 2, dx: number, dy: number) => void;
}) {
  const { gl, camera } = useThree();
  const gRef = useRef<THREE.Group>(null);
  const drag = useRef<{ axis: 0 | 1 | 2; lastX: number; lastY: number } | null>(null);

  useFrame(() => {
    if (!gRef.current) return;
    const d = camera.position.distanceTo(new THREE.Vector3(...center));
    gRef.current.scale.setScalar(d * SCALE_FACTOR);
  });

  const onDown = useCallback((axis: 0 | 1 | 2) => (e: any) => {
    e.stopPropagation();
    if (drag.current) return;
    window.dispatchEvent(new CustomEvent('gizmo-drag-start'));
    drag.current = { axis, lastX: e.clientX, lastY: e.clientY };
    (gl.domElement as any).style.cursor = 'grabbing';
  }, [gl.domElement]);

  useEffect(() => {
    const mv = (e: PointerEvent) => {
      if (!drag.current) return;
      const dx = e.clientX - drag.current.lastX, dy = e.clientY - drag.current.lastY;
      drag.current.lastX = e.clientX; drag.current.lastY = e.clientY;
      onRotate(drag.current.axis, dx, dy);
    };
    const up = () => {
      if (!drag.current) return;
      (gl.domElement as any).style.cursor = '';
      window.dispatchEvent(new CustomEvent('gizmo-drag-end'));
      drag.current = null;
    };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
    return () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
  }, [onRotate, gl.domElement]);

  const W = 0.05;
  return (
    <group ref={gRef} position={center as [number, number, number]}>
      {/* Z axis ring (blue) */}
      <group onPointerDown={onDown(2)}>
        <mesh><ringGeometry args={[1 - W, 1 + W, 32, 1, 0, Math.PI / 2]} />
          <meshBasicMaterial color="#4488ff" transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>
      </group>
      {/* Y axis ring (yellow) */}
      <group onPointerDown={onDown(1)} rotation={[Math.PI / 2, 0, 0]}>
        <mesh><ringGeometry args={[1 - W, 1 + W, 32, 1, 0, Math.PI / 2]} />
          <meshBasicMaterial color="#ddbb00" transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>
      </group>
      {/* X axis ring (red) */}
      <group onPointerDown={onDown(0)} rotation={[0, -Math.PI / 2, 0]}>
        <mesh><ringGeometry args={[1 - W, 1 + W, 32, 1, 0, Math.PI / 2]} />
          <meshBasicMaterial color="#ff4444" transparent opacity={0.6} side={THREE.DoubleSide} /></mesh>
      </group>
    </group>
  );
}
