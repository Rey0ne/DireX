/* === SceneContent — 3D viewport contents: objects, lights, gizmos === */
import { useRef, useEffect, Suspense } from 'react';
import * as THREE from 'three';
import { OrbitControls, Grid, TransformControls } from '@react-three/drei';
import { SceneObject, Vec3, GizmoMode } from './shared';
import { RotationGizmo } from './RotationGizmo';
import { CameraObject } from './CameraGizmo';
import { SafeModel } from './ModelLoader';
import { StickFigure } from './StickFigure';
import { SafeSkinnedFigure } from './Skeleton/SkinnedFigure';
import { FBXFigure } from './FBXFigure';
import { ErrorBoundary } from './shared';
import { CheckerGround, ProcSky, CloudLayer, SunLight } from './EnvComponents';

// ─── Mover — syncs object transform to event bus ───────────
function mover(el: THREE.Object3D, obj: SceneObject) {
  const p: Vec3 = [el.position.x, el.position.y, el.position.z];
  const r: Vec3 = [el.rotation.x, el.rotation.y, el.rotation.z];
  const s: Vec3 = [el.scale.x, el.scale.y, el.scale.z];
  const fwd = new THREE.Vector3(0, 0, -1);
  el.localToWorld(fwd);
  window.dispatchEvent(new CustomEvent('scene3d-object-moved', {
    detail: { id: obj.id, position: p, rotation: r, scale: s, forward: [fwd.x, fwd.y, fwd.z] as Vec3, objRef: el },
  }));
}

// ─── SceneContent ──────────────────────────────────────────
export function SceneContent({ objects, selectedId, onSelect, gizmoMode, rigActive, snapToTrack, selectedBone, onSelectBone, boneGizmoRef }: {
  objects: SceneObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  gizmoMode: GizmoMode;
  rigActive?: boolean;
  snapToTrack?: ((p: THREE.Vector3) => THREE.Vector3 | null);
  selectedBone?: string | null;
  onSelectBone?: (name: string | null) => void;
  boneGizmoRef?: React.MutableRefObject<THREE.Object3D | null>;
}) {
  const meshRefs = useRef<Map<string, THREE.Object3D>>(new Map());
  const orbitRef = useRef<any>(null);
  const dummyBoneRef = useRef<THREE.Object3D | null>(null);
  const bRef = boneGizmoRef || dummyBoneRef;

  useEffect(() => {
    const s = () => { if (orbitRef.current) orbitRef.current.enabled = false; };
    const e = () => { if (orbitRef.current) orbitRef.current.enabled = true; };
    window.addEventListener('gizmo-drag-start', s);
    window.addEventListener('gizmo-drag-end', e);
    return () => { window.removeEventListener('gizmo-drag-start', s); window.removeEventListener('gizmo-drag-end', e); };
  }, []);

  return (
    <>
      <CheckerGround />
      <ProcSky sunAzimuth={45} sunElevation={40} />
      <CloudLayer sunAzimuth={45} sunElevation={40} />
      <SunLight azimuth={45} elevation={40} />
      <mesh onClick={() => onSelect(null)} position={[0, -0.02, 0]}
        rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <planeGeometry args={[100, 100]} />
      </mesh>

      {objects.map(obj => {
        const sel = selectedId === obj.id;
        const bottomY = obj.type === 'figure' || obj.type === 'plane' ? 0 : 0.5;
        return (
          <group key={obj.id}>
            <group position={obj.position} rotation={obj.rotation} scale={obj.scale}
              ref={el => {
                if (el) {
                  meshRefs.current.set(obj.id, el);
                  if (obj.type === 'camera') {
                    const fwd = new THREE.Vector3(0, 0, -1);
                    el.localToWorld(fwd);
                    window.dispatchEvent(new CustomEvent('cam-ready', {
                      detail: { objRef: el, forward: [fwd.x, fwd.y, fwd.z] as Vec3 },
                    }));
                  }
                }
              }}
              onClick={e => { e.stopPropagation(); onSelect(obj.id); }}
            >
              {obj.type === 'figure' ? (
                obj.figureFormat === 'fbx' ? (
                  <ErrorBoundary fallback={<StickFigure poseId={obj.figurePose || 'stand'} color={obj.color || '#c0c8d0'} />}>
                    <Suspense fallback={null}>
                      <FBXFigure src={obj.figureSrc!} />
                    </Suspense>
                  </ErrorBoundary>
                ) : obj.figureSrc ? (
                  <SafeSkinnedFigure src={obj.figureSrc}
                    fallback={<StickFigure poseId={obj.figurePose || 'stand'} color={obj.color || '#c0c8d0'} />}
                    selectedBone={sel ? (selectedBone ?? null) : null}
                    onSelectBone={onSelectBone || (() => {})}
                    gizmoRef={bRef} />
                ) : (
                  <SafeModel poseId={obj.figurePose || ''} figureSrc={obj.figureSrc}
                    fallback={<StickFigure poseId={obj.figurePose || 'stand'} color={obj.color || '#c0c8d0'} />} />
                )
              ) : obj.type === 'camera' ? (
                <CameraObject />
              ) : (
                <mesh>
                  {obj.type === 'box' && <boxGeometry />}
                  {obj.type === 'sphere' && <sphereGeometry args={[0.5, 28, 28]} />}
                  {obj.type === 'cylinder' && <cylinderGeometry args={[0.5, 0.5, 1, 24]} />}
                  {obj.type === 'plane' && <planeGeometry />}
                  <meshLambertMaterial color={obj.color || '#8899aa'} />
                </mesh>
              )}
            </group>

            {/* Selection highlight */}
            {sel && (
              <lineSegments position={obj.position} rotation={obj.rotation}>
                <edgesGeometry args={[new THREE.BoxGeometry(0.6, 0.6, 0.6)]} />
                <lineBasicMaterial color="#60a0ff" opacity={0.8} transparent />
              </lineSegments>
            )}
            {sel && (
              <mesh position={[obj.position[0], obj.position[1] - bottomY, obj.position[2]]}>
                <sphereGeometry args={[0.2, 12, 12]} />
                <meshBasicMaterial color="#60a0ff" transparent opacity={0.7} />
              </mesh>
            )}

            {/* Gizmos */}
            {sel && gizmoMode === 'rotate' && (
              <RotationGizmo
                center={[obj.position[0], obj.position[1] - bottomY, obj.position[2]] as Vec3}
                onRotate={(axis, dx, dy) => {
                  const el = meshRefs.current.get(obj.id);
                  if (el) {
                    el.rotation[('xyz'[axis]) as 'x' | 'y' | 'z'] +=
                      (axis === 0 ? dy * 0.008 : axis === 1 ? dx * 0.008 : -dx * 0.008);
                    mover(el, obj);
                  }
                }}
              />
            )}
            {sel && gizmoMode === 'translate' && (
              <TransformControls
                object={meshRefs.current.get(obj.id) || undefined}
                mode="translate" size={0.65}
                onObjectChange={() => {
                  const el = meshRefs.current.get(obj.id);
                  if (el) {
                    if (rigActive && obj.type === 'camera' && snapToTrack) {
                      const wp = new THREE.Vector3(); el.getWorldPosition(wp);
                      const s = snapToTrack(wp);
                      if (s) {
                        el.position.copy(s);
                        window.dispatchEvent(new CustomEvent('cam-track-snap', {
                          detail: { worldPos: [s.x, s.y, s.z] },
                        }));
                      }
                    }
                    window.dispatchEvent(new CustomEvent('gizmo-drag-start'));
                    mover(el, obj);
                  }
                }}
                onMouseUp={() => { window.dispatchEvent(new CustomEvent('gizmo-drag-end')); }}
              />
            )}
            {sel && gizmoMode === 'scale' && (
              <TransformControls
                object={meshRefs.current.get(obj.id) || undefined}
                mode="scale" size={0.65}
                onObjectChange={() => {
                  const el = meshRefs.current.get(obj.id);
                  if (el) {
                    window.dispatchEvent(new CustomEvent('gizmo-drag-start'));
                    mover(el, obj);
                  }
                }}
                onMouseUp={() => { window.dispatchEvent(new CustomEvent('gizmo-drag-end')); }}
              />
            )}
          </group>
        );
      })}
      <OrbitControls ref={orbitRef} makeDefault enableDamping dampingFactor={0.08}
        minDistance={2} maxDistance={25} maxPolarAngle={Math.PI / 2 + 0.2} target={[0, 1, 0]}
        mouseButtons={{ LEFT: null as any, MIDDLE: 2, RIGHT: 0 }} />
    </>
  );
}
