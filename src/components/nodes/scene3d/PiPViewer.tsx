/* === PiPViewer — Picture-in-picture camera viewfinder === */
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useCanvasStore } from '../../../store/useCanvasStore';
import { LENSES } from './shared';
import { SceneObject } from './shared';
import { GLBModel } from './ModelLoader';

// ─── PiPCam — syncs main camera to the PiP view ───────────
export function PiPCam({ camRef }: { camRef: import('react').MutableRefObject<THREE.Object3D | null> }) {
  const { camera } = useThree();
  useFrame(() => {
    const el = camRef.current;
    if (!el) return;
    camera.position.copy(el.position);
    const fwd = new THREE.Vector3(0, 0, -1);
    el.localToWorld(fwd);
    camera.lookAt(fwd);
  });
  return null;
}

// ─── PiPViewer — the REC overlay panel ────────────────────
export function PiPViewer({ activeCamRef, objects, nodeId, visible, lens, aperture, onLensChange, onApertureChange }: {
  activeCamRef: import('react').MutableRefObject<THREE.Object3D | null>;
  objects: SceneObject[];
  nodeId: string;
  visible: boolean;
  lens: string;
  aperture: number;
  onLensChange: (lens: string) => void;
  onApertureChange: (a: number) => void;
}) {
  const pipCanvasRef = useRef<HTMLDivElement>(null);
  if (!visible) return null;
  const lensData = LENSES[lens];

  return createPortal(
    <div style={{
      position: 'absolute', bottom: 40, right: 16, zIndex: 100, width: 680,
      background: '#111', borderRadius: 12, overflow: 'hidden',
      border: '2px solid #333', boxShadow: '0 0 20px rgba(0,0,0,0.5)',
    }}>
      {/* REC bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '4px 8px', background: '#1a1a1a', gap: 4,
      }}>
        <span style={{ fontSize: 10, color: '#e44', fontWeight: 600 }}>● REC</span>
        <select value={lens} onChange={e => onLensChange(e.target.value)}
          style={{ background: '#222', border: '1px solid #444', borderRadius: 4, color: '#ccc', fontSize: 10, padding: '2px 4px' }}>
          {Object.entries(LENSES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </select>
        <select value={aperture} onChange={e => onApertureChange(Number(e.target.value))}
          style={{ background: '#222', border: '1px solid #444', borderRadius: 4, color: '#ccc', fontSize: 10, padding: '2px 4px' }}>
          {[1.3, 1.4, 2, 2.8, 4, 5.6, 8, 11, 16, 22].map(v => <option key={v} value={v}>T{v}</option>)}
        </select>
        <button onClick={() => {
          const c = pipCanvasRef.current?.querySelector('canvas');
          if (!c) return;
          const u = c.toDataURL('image/png');
          const s = useCanvasStore.getState();
          const cn = s.nodes.get(nodeId);
          const nx = (cn?.pos?.x || 0) + 540;
          const ny = cn?.pos?.y || 0;
          const nid = s.addNode('image.generate', { x: nx, y: ny }, 'PiP ' + lens + ' T' + aperture);
          s.updateNode(nid, { meta: { gen: { imageUrl: u, prompt: '', model: 'GPT Image2', aspect: '16:9', resolution: '2K', quality: 'high', resultAssetIds: [] } } });
          s.triggerSync();
        }} style={{
          background: '#c44', border: '1px solid #e66', borderRadius: 4, color: '#fff',
          fontSize: 10, padding: '2px 8px', cursor: 'pointer', fontWeight: 600,
        }}>📸</button>
        <span style={{ fontSize: 9, color: '#888' }}>ARRI S35</span>
      </div>
      {/* PiP Canvas */}
      <div ref={pipCanvasRef} style={{ position: 'relative', width: '100%', height: 380 }}>
        <Canvas key={lens}
          camera={{ position: [0, 0, 0], fov: lensData.fov, near: 0.1, far: 100 }}
          gl={{ antialias: true, preserveDrawingBuffer: true }}
          style={{ width: '100%', height: '100%' }}>
          <PiPCam camRef={activeCamRef} />
          <ambientLight intensity={0.35} />
          <hemisphereLight args={['#ffffff', '#606060', 0.65]} />
          <Grid position={[0, -0.01, 0]} args={[20, 20]} cellSize={1} cellThickness={0.5}
            cellColor="#666" sectionSize={5} sectionThickness={1.5} sectionColor="#999"
            fadeDistance={25} infiniteGrid />
          {objects.map(o => (
            <group key={o.id} position={o.position} rotation={o.rotation} scale={o.scale}>
              {o.type === 'figure' ? (o.figureSrc ? <GLBModel src={o.figureSrc} /> : null) :
                o.type === 'box' ? <mesh><boxGeometry /><meshLambertMaterial color={o.color || '#8899aa'} /></mesh> :
                  o.type === 'sphere' ? <mesh><sphereGeometry args={[0.5, 16, 16]} /><meshLambertMaterial color={o.color || '#8899aa'} /></mesh> :
                    o.type === 'cylinder' ? <mesh><cylinderGeometry args={[0.5, 0.5, 1, 16]} /><meshLambertMaterial color={o.color || '#8899aa'} /></mesh> :
                      o.type === 'plane' ? <mesh><planeGeometry /><meshLambertMaterial color={o.color || '#8899aa'} /></mesh> : null}
            </group>
          ))}
        </Canvas>
        {/* Framing overlay */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: '80%', height: '80%', border: '1px solid rgba(255,255,255,0.3)' }} />
        </div>
      </div>
    </div>, document.body);
}
