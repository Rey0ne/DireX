/* === EditLockController + WaypointMarkers ===
 * R3F components for P-key edit lock mode.
 *
 * EditLockController: invisible — controls cursor style + Ctrl key tracking.
 * WaypointMarkers: visual 3D markers on ground plane.
 *
 * Events (fired on window):
 *   editlock:ctrl-change → { detail: { held: boolean } }
 */

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

// ── Types ────────────────────────────────────────

export type EditLockMode = 'none' | 'path' | 'pose';

export interface Waypoint {
  id: string;
  x: number;
  z: number;
  frameAllocation: number;
}

// ── EditLockController (cursor + ctrl) ────────────

interface EditLockControllerProps {
  mode: EditLockMode;
  onCtrlChange?: (held: boolean) => void;
}

export function EditLockController({ onCtrlChange }: EditLockControllerProps) {
  const ctrlRef = useRef(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Control' && !ctrlRef.current) {
        ctrlRef.current = true;
        onCtrlChange?.(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.key === 'Control' && ctrlRef.current) {
        ctrlRef.current = false;
        onCtrlChange?.(false);
      }
    };
    // Also reset on blur (Ctrl can get stuck)
    const blur = () => {
      if (ctrlRef.current) {
        ctrlRef.current = false;
        onCtrlChange?.(false);
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, [onCtrlChange]);

  // Cursor feedback is handled by SceneContent's useEffect for simplicity
  return null;
}

// ── WaypointMarkers (3D visual) ───────────────────

interface WaypointMarkersProps {
  waypoints: Waypoint[];
  /** Called when user right-clicks a waypoint → delete */
  onDelete?: (id: string) => void;
}

export function WaypointMarkers({ waypoints, onDelete }: WaypointMarkersProps) {
  if (waypoints.length === 0) return null;

  return (
    <group>
      {waypoints.map((wp, i) => (
        <WaypointMarker
          key={wp.id}
          waypoint={wp}
          index={i}
          isLast={i === waypoints.length - 1}
          hasNext={i < waypoints.length - 1}
          nextWp={i < waypoints.length - 1 ? waypoints[i + 1] : undefined}
          onDelete={onDelete}
        />
      ))}
      {waypoints.length >= 2 && <WaypointPathLines waypoints={waypoints} />}
    </group>
  );
}

function WaypointMarker({ waypoint, index, isLast, hasNext, nextWp, onDelete }: {
  waypoint: Waypoint;
  index: number;
  isLast: boolean;
  hasNext: boolean;
  nextWp?: Waypoint;
  onDelete?: (id: string) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const color = index === 0 ? '#44ff88' : isLast ? '#ff6644' : '#ffcc44';

  return (
    <group position={[waypoint.x, 0.05, waypoint.z]}>
      {/* Pillar body */}
      <mesh
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onContextMenu={(e) => {
          e.stopPropagation();
          onDelete?.(waypoint.id);
        }}
      >
        <cylinderGeometry args={[0.12, 0.15, 0.25, 16]} />
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.2}
          emissive={hovered ? '#ffffff' : color}
          emissiveIntensity={hovered ? 0.5 : 0.15}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Top ring */}
      <mesh position={[0, 0.15, 0]}>
        <torusGeometry args={[0.14, 0.025, 8, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Number label — simplified as a colored dot pattern (no Text needed) */}
      <mesh position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
      {/* Arrow to next */}
      {hasNext && nextWp && (
        <ArrowBetween
          from={[waypoint.x, 0.12, waypoint.z]}
          to={[nextWp.x, 0.12, nextWp.z]}
          color={color}
        />
      )}
    </group>
  );
}

function WaypointPathLines({ waypoints }: { waypoints: Waypoint[] }) {
  const points = waypoints.map(wp => new THREE.Vector3(wp.x, 0.06, wp.z));
  const geoRef = useRef<THREE.BufferGeometry | null>(null);

  if (!geoRef.current) {
    geoRef.current = new THREE.BufferGeometry().setFromPoints(points);
  } else {
    geoRef.current.setFromPoints(points);
  }

  return (
    <line>
      <primitive object={geoRef.current} attach="geometry" />
      <lineDashedMaterial
        color="#5EEAD4"
        dashSize={0.5}
        gapSize={0.3}
        opacity={0.35}
        transparent
      />
    </line>
  );
}

function ArrowBetween({ from, to, color }: {
  from: [number, number, number];
  to: [number, number, number];
  color: string;
}) {
  const midX = (from[0] + to[0]) / 2;
  const midZ = (from[2] + to[2]) / 2;
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const angle = Math.atan2(dz, dx);

  return (
    <group position={[midX, from[1], midZ]} rotation={[0, -angle + Math.PI / 2, 0]}>
      <mesh>
        <coneGeometry args={[0.06, 0.15, 4]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.25} />
      </mesh>
    </group>
  );
}
