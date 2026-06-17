/* === Scene3DNode — node shell (thin wrapper) === */
import React, { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Canvas } from '@react-three/fiber';
import { useCanvasStore } from '../../store/useCanvasStore';
import { SceneObject, Vec3, GizmoMode, CameraRig, pickColor, poseRegistry, addPoseEntry } from './scene3d/shared';
import { initPoseRegistry } from './scene3d/ModelLoader';
import { EBtn } from './scene3d/EBtn';
import { SceneContent } from './scene3d/SceneContent';
import { Scene3DEditor } from './scene3d/Scene3DEditor';

// Re-export for external consumers
export { addPoseEntry };

const NODE_W = 500, NODE_H = 300;

export function Scene3DNode({ id, data, selected }: {
  id: string;
  data: { title?: string; isConnecting?: boolean; isConnectTarget?: boolean; multiSelect?: boolean; isPickMode?: boolean; isPickTarget?: boolean; onChange?: (p: Record<string, unknown>) => void; };
  selected?: boolean;
}) {
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [fs, setFs] = useState(false);
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('translate');
  const [rig, setRig] = useState<CameraRig | null>(null);
  const ctr = useRef(0);

  useEffect(() => { initPoseRegistry(); }, []);

  useEffect(() => {
    const h = (e: Event) => {
      const { id: oid, position, rotation, scale } = (e as CustomEvent).detail as { id: string; position: Vec3; rotation?: Vec3; scale?: Vec3 };
      setObjects(prev => prev.map(o => o.id === oid ? { ...o, position, rotation: rotation || o.rotation, scale: scale || o.scale } : o));
    };
    window.addEventListener('scene3d-object-moved', h);
    return () => window.removeEventListener('scene3d-object-moved', h);
  }, []);

  const addObj = useCallback((type: SceneObject['type']) => {
    ctr.current++;
    const y = type === 'figure' || type === 'plane' ? 0 : 0.5;
    const first = poseRegistry.size > 0 ? poseRegistry.keys().next().value as string : 'stand1';
    const rx = (Math.random() - 0.5) * 5;
    const rz = (Math.random() - 0.5) * 5;
    const obj: SceneObject = {
      id: `o_${ctr.current}`, type, position: [rx, y, rz], rotation: [0, 0, 0], scale: [1, 1, 1],
      color: pickColor(), figurePose: type === 'figure' ? first : undefined,
      figureSrc: type === 'figure' ? poseRegistry.get(first)?.src : undefined,
      figureFmt: type === 'figure' ? poseRegistry.get(first)?.format : undefined,
    };
    setObjects(prev => [...prev, obj]);
    setSelId(obj.id);
  }, []);

  const delSel = useCallback(() => {
    if (!selId) return;
    setObjects(prev => prev.filter(o => o.id !== selId));
    setSelId(null);
  }, [selId]);

  const hSnap = useCallback(() => {
    const c = document.querySelector('canvas');
    if (!c) return;
    const u = c.toDataURL('image/png');
    const store = useCanvasStore.getState();
    const n = store.nodes.get(id);
    if (n) {
      const m = (n.meta || {}) as Record<string, unknown>;
      store.updateNode(id, { meta: { ...m, gen: { ...((m.gen as Record<string, unknown>) || {}), imageUrl: u } } });
      store.triggerSync();
    }
  }, [id]);

  return (
    <>
      {fs && (
        <Scene3DEditor objects={objects} selectedId={selId} setObjects={setObjects}
          setSelectedId={setSelId} onSnapshot={hSnap} onClose={() => setFs(false)}
          nodeId={id} rig={rig} setRig={setRig} />
      )}
      <div style={{
        width: NODE_W,
        background: 'rgba(18,20,24,0.95)',
        border: selected ? '2px solid rgba(100,140,255,0.7)' : '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14, overflow: 'hidden',
        boxShadow: selected ? '0 0 24px rgba(100,140,255,0.18)' : '0 4px 16px rgba(0,0,0,0.3)',
        transition: 'border 0.15s, box-shadow 0.15s',
      }}>
        {/* Title bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600, flexShrink: 0,
        }}>
          <span>🎬 {data.title || '3D 场景'}</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{objects.length} 物体</span>
        </div>

        {/* Canvas */}
        <div style={{ width: '100%', height: NODE_H, position: 'relative', background: '#3a3a3a', overflow: 'hidden' }}>
          <Canvas shadows camera={{ position: [5, 4, 7], fov: 50, near: 0.1, far: 100 }}
            gl={{ preserveDrawingBuffer: true, antialias: false, powerPreference: 'high-performance' }}
            dpr={[0.5, 1.5]} style={{ width: '100%', height: '100%' }}>
            <Suspense fallback={null}>
              <SceneContent objects={objects} selectedId={selId} onSelect={setSelId} gizmoMode={gizmoMode} />
            </Suspense>
          </Canvas>
          {selected ? (
            <button onClick={() => setFs(true)} className="nodrag" style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              padding: '10px 24px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              background: 'rgba(100,140,255,0.15)', border: '1px solid rgba(100,140,255,0.3)',
              color: 'rgba(140,170,255,0.9)', cursor: 'pointer', zIndex: 5,
            }}>⛶ 全屏编辑</button>
          ) : (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
              justifyContent: 'center', background: 'rgba(0,0,0,0.4)', pointerEvents: 'none',
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, opacity: 0.15 }}>🎬</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>选中节点开始编辑</div>
              </div>
            </div>
          )}
        </div>

        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px',
          borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, overflowX: 'auto',
        }}>
          <EBtn label="立方体" onClick={() => addObj('box')} />
          <EBtn label="球体" onClick={() => addObj('sphere')} />
          <EBtn label="圆柱" onClick={() => addObj('cylinder')} />
          <EBtn label="平面" onClick={() => addObj('plane')} />
          <EBtn label="人物" onClick={() => addObj('figure')} />
          <span style={{ flex: 1 }} />
          <button onClick={() => setGizmoMode('translate')} title="移动" style={gmBtnSmall(gizmoMode === 'translate')}>↕</button>
          <button onClick={() => setGizmoMode('rotate')} title="旋转" style={gmBtnSmall(gizmoMode === 'rotate')}>↻</button>
          <button onClick={() => setGizmoMode('scale')} title="缩放" style={gmBtnSmall(gizmoMode === 'scale')}>⤡</button>
          {selId && <EBtn label="删除" onClick={delSel} />}
        </div>

        <Handle type="target" position={Position.Left} id="image-in"
          style={{ background: 'rgba(180,180,200,0.5)', width: 10, height: 10, border: 'none' }} />
        <Handle type="source" position={Position.Right} id="image-out"
          style={{ background: 'rgba(180,180,200,0.5)', width: 10, height: 10, border: 'none' }} />
      </div>
    </>
  );
}

function gmBtnSmall(active: boolean): React.CSSProperties {
  return {
    padding: '4px 8px', borderRadius: 5, fontSize: 11, cursor: 'pointer',
    background: active ? 'rgba(100,140,255,0.15)' : 'transparent',
    border: active ? '1px solid rgba(100,140,255,0.25)' : '1px solid transparent',
    color: active ? '#a0c0ff' : 'rgba(255,255,255,0.35)',
  };
}
