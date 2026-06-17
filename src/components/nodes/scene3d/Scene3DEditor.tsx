/* === Scene3DEditor — Fullscreen 3D editor portal === */
import React, { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { SceneObject, Vec3, GizmoMode, TrackType, CameraRig, AnimationTimeline, poseRegistry, pickColor } from './shared';
import { initPoseRegistry, importFile } from './ModelLoader';
import { EBtn } from './EBtn';
import { SceneContent } from './SceneContent';
import { DollyRails, CurvedTrackRails, OrbitRing } from './CameraRig';
import { PiPViewer } from './PiPViewer';
import { Timeline } from './Timeline';
import { PlaybackEngine } from './PlaybackEngine';

export function Scene3DEditor({ objects, selectedId, setObjects, setSelectedId, onSnapshot, onClose, nodeId, rig, setRig }: {
  objects: SceneObject[];
  selectedId: string | null;
  setObjects: React.Dispatch<React.SetStateAction<SceneObject[]>>;
  setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
  onSnapshot: () => void;
  onClose: () => void;
  nodeId: string;
  rig: CameraRig | null;
  setRig: React.Dispatch<React.SetStateAction<CameraRig | null>>;
}) {
  const counter = useRef(objects.length);
  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('translate');
  const undoStack = useRef<SceneObject[][]>([]);
  const redoStack = useRef<SceneObject[][]>([]);
  const dragSaved = useRef(false);
  const [showCam, setShowCam] = useState(false);
  const [vcamLens, setVcamLens] = useState('50');
  const [vcamAperture, setVcamAperture] = useState(2.8);
  const activeCamRef = useRef<THREE.Object3D | null>(null);
  const [playing, setPlaying] = useState(false);
  const [playTime, setPlayTime] = useState(0);
  const animCamPos = useRef(new THREE.Vector3());
  const animCamLook = useRef(new THREE.Vector3(0, 1, 0));
  const camObjIdRef = useRef<string | null>(null);
  const [trackCpId, setTrackCpId] = useState<string | null>(null);
  const [timelineH, setTimelineH] = useState(120);
  const [zoom, setZoom] = useState(60);
  const [animTimeline, setAnimTimeline] = useState<AnimationTimeline | null>(null);
  const engineRef = useRef(new PlaybackEngine());
  const rigRef = useRef(rig);
  rigRef.current = rig;

  // ─── Bone selection ────────────────────────────────
  const [selectedBone, setSelectedBone] = useState<string | null>(null);
  const boneGizmoRef = useRef<THREE.Object3D | null>(null);
  // Reset bone selection when switching objects
  useEffect(() => { setSelectedBone(null); }, [selectedId]);

  // ─── Snap camera to track ─────────────────────────
  const snapToTrack = useCallback((pos: THREE.Vector3): THREE.Vector3 | null => {
    const r = rigRef.current; if (!r) return null;
    if (r.type === 'dolly' && r.dolly) {
      const A = new THREE.Vector3(...r.dolly.pointA), B = new THREE.Vector3(...r.dolly.pointB);
      const dir = B.clone().sub(A); const len = dir.length();
      if (len < 0.001) return A.clone().add(new THREE.Vector3(0, 0.13, 0));
      dir.normalize();
      const t = Math.max(0, Math.min(1, pos.clone().sub(A).dot(dir) / len));
      const pt = A.clone().add(dir.clone().multiplyScalar(t * len)); pt.y += 0.13;
      return pt;
    }
    if (r.type === 'curved' && r.curved && r.curved.controlPoints.length >= 2) {
      const pts = r.curved.controlPoints.map(p => new THREE.Vector3(...p.position));
      const curve = new THREE.CatmullRomCurve3(pts);
      let best = Infinity; const r2 = new THREE.Vector3();
      for (let i = 0; i <= 100; i++) {
        const pt = curve.getPointAt(i / 100); const d = pos.distanceToSquared(pt);
        if (d < best) { best = d; r2.copy(pt); }
      }
      r2.y += 0.13; return r2;
    }
    if (r.type === 'orbit' && r.orbit) {
      const { center, radius, height } = r.orbit; const c = new THREE.Vector3(...center);
      const dx = pos.x - c.x, dz = pos.z - c.z; const a = Math.atan2(dz, dx);
      return new THREE.Vector3(c.x + Math.cos(a) * radius, c.y + height + 0.13, c.z + Math.sin(a) * radius);
    }
    return null;
  }, []);

  // ─── Get camera position on track at progress ─────
  const getTrackCamera = useCallback((prog: number): any => {
    const r = rigRef.current; if (!r) return null;
    const sc = r.speedCurve.sort((a, b) => a.time - b.time);
    let sp = 1; const targetTime = prog * r.duration;
    if (sc.length >= 2) {
      let i0 = 0;
      for (let i = 1; i < sc.length; i++) { if (sc[i].time <= targetTime) i0 = i; else break; }
      let i1 = Math.min(i0 + 1, sc.length - 1);
      const st = sc[i1].time > sc[i0].time ? (targetTime - sc[i0].time) / (sc[i1].time - sc[i0].time) : 0;
      sp = sc[i0].speed + (sc[i1].speed - sc[i0].speed) * st;
    } else if (sc.length === 1) sp = sc[0].speed;
    const pp = Math.max(0, Math.min(1, prog * sp));
    let pitch: number | undefined, yaw: number | undefined;
    const rk = r.rotationKeys.sort((a, b) => a.time - b.time);
    if (rk.length >= 2) {
      const tt = pp * r.duration; let i0 = 0;
      for (let i = 1; i < rk.length; i++) { if (rk[i].time <= tt) i0 = i; else break; }
      let i1 = Math.min(i0 + 1, rk.length - 1);
      const st = rk[i1].time > rk[i0].time ? (tt - rk[i0].time) / (rk[i1].time - rk[i0].time) : 0;
      pitch = rk[i0].pitch + (rk[i1].pitch - rk[i0].pitch) * st;
      yaw = rk[i0].yaw + (rk[i1].yaw - rk[i0].yaw) * st;
    } else if (rk.length === 1) { pitch = rk[0].pitch; yaw = rk[0].yaw; }
    if (r.type === 'dolly' && r.dolly) {
      const A = new THREE.Vector3(...r.dolly.pointA), B = new THREE.Vector3(...r.dolly.pointB);
      const pos = A.clone().lerp(B, pp); pos.y += 0.13;
      return { pos, look: pos.clone().add(new THREE.Vector3(0, 0, -1)), pitch, yaw };
    }
    if (r.type === 'curved' && r.curved && r.curved.controlPoints.length >= 2) {
      const pts = r.curved.controlPoints.map(p => new THREE.Vector3(...p.position));
      const curve = new THREE.CatmullRomCurve3(pts);
      const pos = curve.getPointAt(pp); const tgt = curve.getTangentAt(pp);
      return { pos, look: pos.clone().add(tgt), pitch, yaw };
    }
    if (r.type === 'orbit' && r.orbit) {
      const { center, radius, height, startAngle, endAngle } = r.orbit;
      const angle = startAngle + (endAngle - startAngle) * pp;
      const pos = new THREE.Vector3(center[0] + Math.cos(angle) * radius, center[1] + height, center[2] + Math.sin(angle) * radius);
      return { pos, look: new THREE.Vector3(...center), pitch, yaw };
    }
    return null;
  }, []);

  // ─── Bind PlaybackEngine to figure ──────────────
  useEffect(() => {
    const engine = engineRef.current;
    if (!animTimeline || animTimeline.blocks.length === 0) { engine.stop(); return; }
    const figObj = objects.find(o => o.id === animTimeline.targetFigureId);
    if (!figObj) return;
    const onReady = (e: Event) => {
      const { id: figId, mesh } = (e as CustomEvent).detail as { id: string; mesh: THREE.Object3D };
      if (figId === animTimeline.targetFigureId) engine.bind(mesh, animTimeline);
    };
    window.addEventListener('figure-mesh-ready', onReady);
    return () => window.removeEventListener('figure-mesh-ready', onReady);
  }, [animTimeline, objects]);

  // ─── Playback loop ────────────────────────────────
  const playTimeRef = useRef(0);
  useEffect(() => { playTimeRef.current = playTime; }, [playTime]);
  useEffect(() => {
    if (!playing || !rig) return;
    const camObj = objects.find(o => o.type === 'camera'); camObjIdRef.current = camObj?.id || null;
    const startTime = performance.now(); const startPlay = playTimeRef.current;
    let lastT = startTime;
    let raf: number;
    const loop = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      const delta = Math.min(0.1, (now - lastT) / 1000); lastT = now;
      // Drive clip playback
      engineRef.current.update(delta);
      let p = (startPlay + elapsed) / rig.duration;
      if (p >= 1) { p = 1; setPlaying(false); setPlayTime(rig.duration); }
      else { setPlayTime(p * rig.duration); }
      const cam = getTrackCamera(p);
      if (cam) {
        animCamPos.current.copy(cam.pos); animCamLook.current.copy(cam.look);
        if (camObjIdRef.current && activeCamRef.current) {
          activeCamRef.current.position.copy(cam.pos);
          if (cam.pitch !== undefined) activeCamRef.current.rotation.set(cam.pitch, cam.yaw, 0);
          const cid = camObjIdRef.current;
          const rot: Vec3 | undefined = cam.pitch !== undefined ? ([cam.pitch, cam.yaw, 0] as Vec3) : undefined;
          setObjects(prev => prev.map(o => o.id === cid ? { ...o, position: [cam.pos.x, cam.pos.y, cam.pos.z] as Vec3, rotation: rot || o.rotation } : o));
        }
      }
      if (p < 1) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, rig, getTrackCamera, setObjects]);

  // ─── Seek update (non-playing) ────────────────────
  useEffect(() => {
    if (playing || !rig) return;
    const r = rigRef.current; if (!r) return;
    const p = playTime / Math.max(0.1, r.duration);
    const cam = getTrackCamera(Math.min(1, p));
    if (cam) { animCamPos.current.copy(cam.pos); animCamLook.current.copy(cam.look); if (activeCamRef.current) activeCamRef.current.position.copy(cam.pos); }
  }, [playTime, playing, getTrackCamera]);

  // ─── Undo/redo ────────────────────────────────────
  const pushUndo = useCallback((snap: SceneObject[]) => { undoStack.current.push(snap); if (undoStack.current.length > 50) undoStack.current.shift(); redoStack.current = []; }, []);
  const doUndo = useCallback(() => { const prev = undoStack.current.pop(); if (!prev) return; redoStack.current.push(objects); setObjects(prev); }, [objects]);
  const doRedo = useCallback(() => { const next = redoStack.current.pop(); if (!next) return; undoStack.current.push(objects); setObjects(next); }, [objects]);
  useEffect(() => { const h = () => { if (!dragSaved.current) { pushUndo(objects); dragSaved.current = true; } }; window.addEventListener('gizmo-drag-start', h); return () => window.removeEventListener('gizmo-drag-start', h); }, [objects, pushUndo]);
  useEffect(() => { const h = () => { dragSaved.current = false; }; window.addEventListener('gizmo-drag-end', h); return () => window.removeEventListener('gizmo-drag-end', h); }, []);

  // ─── Event listeners ──────────────────────────────
  useEffect(() => { initPoseRegistry(); }, []);
  useEffect(() => {
    const h = (e: Event) => {
      const { id, position, rotation, scale, objRef } = (e as CustomEvent).detail as { id: string; position: Vec3; rotation?: Vec3; scale?: Vec3; objRef?: THREE.Object3D };
      setObjects(prev => prev.map(o => o.id === id ? { ...o, position, rotation: rotation || o.rotation, scale: scale || o.scale } : o));
      if (objRef && (objRef as any).type === 'camera') {
        activeCamRef.current = objRef;
        if (rig && !playing) {
          const wp = new THREE.Vector3(); objRef.getWorldPosition(wp); const dur = rig.duration;
          let bestT = 0, bestD = Infinity;
          for (let i = 0; i <= 100; i++) { const t = i / 100; const c = getTrackCamera(t); if (c) { const d = wp.distanceToSquared(c.pos); if (d < bestD) { bestD = d; bestT = t; } } }
          setPlayTime(bestT * dur);
        }
      }
    };
    window.addEventListener('scene3d-object-moved', h);
    return () => window.removeEventListener('scene3d-object-moved', h);
  }, [setObjects, rig, playing, getTrackCamera]);
  useEffect(() => {
    const h = (e: Event) => { const { objRef } = (e as CustomEvent).detail as { objRef: THREE.Object3D }; if (objRef) activeCamRef.current = objRef; };
    window.addEventListener('cam-ready', h); return () => window.removeEventListener('cam-ready', h);
  }, []);
  useEffect(() => {
    const h = (e: Event) => {
      const wp = (e as CustomEvent).detail.worldPos as number[];
      if (!rig || playing) return; const dur = rig.duration;
      let bt = 0, bd = Infinity;
      for (let i = 0; i <= 100; i++) { const t = i / 100; const c = getTrackCamera(t); if (c) { const d = Math.pow(wp[0] - c.pos.x, 2) + Math.pow(wp[1] - c.pos.y, 2) + Math.pow(wp[2] - c.pos.z, 2); if (d < bd) { bd = d; bt = t; } } }
      setPlayTime(bt * dur);
    };
    window.addEventListener('cam-track-snap', h); return () => window.removeEventListener('cam-track-snap', h);
  }, [rig, playing, getTrackCamera]);

  // ─── Object CRUD ──────────────────────────────────
  const addObj = useCallback((type: SceneObject['type']) => {
    counter.current++;
    const y = type === 'figure' || type === 'plane' ? 0 : 0.5;
    const first = poseRegistry.size > 0 ? poseRegistry.keys().next().value as string : 'stand1';
    const obj: SceneObject = { id: `o_${counter.current}`, type, position: [0, y, 0], rotation: [0, 0, 0], scale: [1, 1, 1], color: pickColor(), figurePose: type === 'figure' ? first : undefined, figureSrc: type === 'figure' ? poseRegistry.get(first)?.src : undefined };
    pushUndo(objects); setObjects(prev => [...prev, obj]); setSelectedId(obj.id);
  }, [setObjects, setSelectedId, objects, pushUndo]);
  const makeRig = (type: TrackType) => {
    const cam = objects.find(o => o.type === 'camera'); if (!cam) return;
    const py = cam.position[1], px = cam.position[0], pz = cam.position[2];
    if (type === 'dolly') setRig({ type: 'dolly', duration: 8, speedCurve: [{ time: 0, speed: 1 }, { time: 8, speed: 1 }], rotationKeys: [], dolly: { pointA: [px + 4, py, pz], pointB: [px - 4, py, pz] } });
    if (type === 'curved') setRig({ type: 'curved', duration: 8, speedCurve: [{ time: 0, speed: 1 }, { time: 8, speed: 1 }], rotationKeys: [], curved: { controlPoints: [{ id: 'c0', position: [px + 4, py, pz] }, { id: 'c1', position: [px, py, pz + 3] }, { id: 'c2', position: [px - 4, py, pz] }] } });
    if (type === 'orbit') setRig({ type: 'orbit', duration: 8, speedCurve: [{ time: 0, speed: 1 }, { time: 8, speed: 1 }], rotationKeys: [], orbit: { center: [px, py, pz - 3], radius: 4, height: 0, startAngle: 0, endAngle: Math.PI * 2 } });
    setTimeout(() => {
      const start = getTrackCamera(0);
      if (start && cam && activeCamRef.current) {
        activeCamRef.current.position.copy(start.pos);
        setObjects(prev => prev.map(o => o.id === cam.id ? { ...o, position: [start.pos.x, start.pos.y, start.pos.z] as Vec3 } : o));
      }
    }, 50);
    setSelectedId(cam.id);
  };
  const addCamera = useCallback(() => {
    counter.current++;
    const obj: SceneObject = { id: `o_${counter.current}`, type: 'camera', position: [8, 2, 5], rotation: [0, 0, 0], scale: [1, 1, 1] };
    pushUndo(objects); setObjects(prev => [...prev, obj]); setSelectedId(obj.id);
  }, [setObjects, setSelectedId, objects, pushUndo]);
  const updatePose = useCallback((pose: string) => {
    const e = poseRegistry.get(pose);
    setObjects(prev => prev.map(o => o.id === selectedId && o.type === 'figure' ? { ...o, figurePose: pose, figureSrc: e?.src } : o));
  }, [selectedId, setObjects]);
  const selObj = objects.find(o => o.id === selectedId);

  // ─── Keyboard ─────────────────────────────────────
  const onKey = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key === 'z') { e.preventDefault(); doUndo(); return; }
    if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); doRedo(); return; }
    if (e.key === 'Escape') { if (selectedId) setSelectedId(null); else onClose(); }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
      e.preventDefault(); e.stopPropagation();
      pushUndo(objects); setObjects(prev => prev.filter(o => o.id !== selectedId)); setSelectedId(null);
    }
  };

  // ─── Render ───────────────────────────────────────
  return createPortal(
    <div onKeyDown={onKey} tabIndex={-1} ref={el => el?.focus()}
      style={{ position: 'fixed', inset: 0, zIndex: 99999, outline: 'none', background: '#3a3a3a', display: 'flex', flexDirection: 'column', animation: 'tap-fade-in 0.15s ease' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', background: 'rgba(0,0,0,0.3)', flexShrink: 0 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#ccc' }}>3D 场景编辑器</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <EBtn label="截图" onClick={onSnapshot} />
          <button onClick={onClose} style={{ padding: '6px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#ccc', cursor: 'pointer', fontSize: 13 }}>退出</button>
        </div>
      </div>

      {/* Body: toolbar | viewport | properties */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left toolbar */}
        <div style={{ width: 90, display: 'flex', flexDirection: 'column', gap: 5, padding: '10px 7px', borderRight: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', flexShrink: 0, alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>几何体</div>
          <EBtn label="立方体" onClick={() => addObj('box')} />
          <EBtn label="球体" onClick={() => addObj('sphere')} />
          <EBtn label="圆柱" onClick={() => addObj('cylinder')} />
          <EBtn label="平面" onClick={() => addObj('plane')} />
          <div style={{ width: '70%', height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>人物</div>
          <EBtn label="添加人物" onClick={() => addObj('figure')} />
          {selObj?.type === 'figure' && (
            <select value={selObj.figurePose || ''} onChange={e => updatePose(e.target.value)}
              style={{ marginTop: 4, width: '100%', padding: 5, background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#ccc', fontSize: 10, cursor: 'pointer' }}>
              {[...poseRegistry.entries()].map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
          )}
          <div style={{ width: '70%', height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>摄像</div>
          <EBtn label="加摄像机" onClick={addCamera} />
          <EBtn label={showCam ? '关取景器' : '开取景器'} onClick={() => setShowCam(!showCam)} active={showCam} />
          <div style={{ width: '70%', height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>轨道</div>
          <EBtn label="直线推轨" active={rig?.type === 'dolly'} onClick={() => makeRig('dolly')} />
          <EBtn label="曲线轨道" active={rig?.type === 'curved'} onClick={() => makeRig('curved')} />
          <EBtn label="环绕轨道" active={rig?.type === 'orbit'} onClick={() => makeRig('orbit')} />
          {rig && (rig.type === 'curved' || rig.type === 'orbit') && (
            <EBtn label="+控制点" onClick={() => {
              setRig(prev => {
                if (!prev) return prev;
                if (prev.type === 'curved' && prev.curved && prev.curved.controlPoints.length >= 2) {
                  const last = prev.curved.controlPoints[prev.curved.controlPoints.length - 1];
                  const mid: Vec3 = [(last.position[0] + prev.curved.controlPoints[0].position[0]) / 2, last.position[1], (last.position[2] + prev.curved.controlPoints[0].position[2]) / 2];
                  const newCp = { id: 'cp_' + Date.now(), position: mid };
                  return { ...prev, curved: { ...prev.curved, controlPoints: [...prev.curved.controlPoints.slice(0, -1), newCp, last] } };
                }
                if (prev.type === 'orbit' && prev.orbit) {
                  // Orbit doesn't support adding CPs in the same way — no-op
                }
                return prev;
              });
            }} />
          )}
          {rig && <EBtn label="清除轨道" onClick={() => setRig(null)} />}
        </div>

        {/* Viewport */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}
          onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
          onDrop={e => {
            e.preventDefault(); e.stopPropagation();
            const f = e.dataTransfer.files[0];
            if (!f || !f.name.match(/\.(glb|fbx)$/i)) return;
            importFile(f, (entry, poseId) => {
              counter.current++;
              const obj: SceneObject = { id: `o_${counter.current}`, type: 'figure', position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], color: pickColor(), figurePose: poseId, figureSrc: entry.src };
              pushUndo(objects); setObjects(prev => [...prev, obj]); setSelectedId(obj.id);
            });
          }}
        >
          <Canvas shadows camera={{ position: [5, 4, 7], fov: 50, near: 0.1, far: 100 }}
            gl={{ preserveDrawingBuffer: true, antialias: false, powerPreference: 'high-performance' }}
            dpr={[0.5, 1.5]} style={{ width: '100%', height: '100%' }}>
            <Suspense fallback={null}>
              <SceneContent objects={objects} selectedId={selectedId} onSelect={setSelectedId}
                gizmoMode={gizmoMode} rigActive={!!rig} snapToTrack={snapToTrack}
                selectedBone={selectedBone} onSelectBone={setSelectedBone}
                boneGizmoRef={boneGizmoRef} />
              {rig?.type === 'dolly' && (
                <DollyRails rig={rig} selCp={trackCpId} onSelCp={setTrackCpId}
                  onMoveCp={(id, pos) => {
                    setRig(prev => prev && prev.dolly ? { ...prev, dolly: { ...prev.dolly, pointA: id === 'A' ? pos : prev.dolly.pointA, pointB: id === 'B' ? pos : prev.dolly.pointB } } : prev);
                  }} />
              )}
              {rig?.type === 'curved' && (
                <CurvedTrackRails rig={rig} selCp={trackCpId} onSelCp={setTrackCpId}
                  onMoveCp={(id, pos) => {
                    setRig(prev => {
                      if (!prev?.curved) return prev;
                      const cps = prev.curved.controlPoints.map(cp => cp.id === id ? { ...cp, position: pos } : cp);
                      return { ...prev, curved: { ...prev.curved, controlPoints: cps } };
                    });
                  }} />
              )}
              {rig?.type === 'orbit' && <OrbitRing rig={rig} />}
            </Suspense>
          </Canvas>
        </div>

        {/* Right properties panel */}
        <div style={{ width: 160, padding: '10px', borderLeft: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto', flexShrink: 0, background: 'rgba(0,0,0,0.15)' }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>属性</div>
          {selObj ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                类型:<span style={{ color: '#ccc' }}>{selObj.type === 'box' ? '立方体' : selObj.type === 'sphere' ? '球体' : selObj.type === 'cylinder' ? '圆柱' : selObj.type === 'plane' ? '平面' : selObj.type === 'camera' ? '摄像机' : '人物'}</span>
              </div>
              {selObj.type === 'figure' && (
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                  姿态:<span style={{ color: '#ccc' }}>{poseRegistry.get(selObj.figurePose || '')?.name || selObj.figurePose}</span>
                </div>
              )}
              {/* Bone selection info */}
              {selectedBone && (
                <div style={{
                  padding: '6px 8px', borderRadius: 6,
                  background: 'rgba(255,200,0,0.08)', border: '1px solid rgba(255,200,0,0.2)',
                }}>
                  <div style={{ fontSize: 9, color: 'rgba(255,200,0,0.5)', textTransform: 'uppercase', marginBottom: 2 }}>选中骨骼</div>
                  <div style={{ fontSize: 11, color: '#ffcc00', fontWeight: 600, wordBreak: 'break-all' }}>
                    {selectedBone.replace(/^mixamorig:/, '')}
                  </div>
                  <button onClick={() => setSelectedBone(null)} style={{
                    marginTop: 4, padding: '3px 8px', borderRadius: 4, fontSize: 9, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', width: '100%',
                  }}>取消选中</button>
                </div>
              )}
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setGizmoMode('translate')} style={gmBtn(gizmoMode === 'translate')}>移动</button>
                <button onClick={() => setGizmoMode('rotate')} style={gmBtn(gizmoMode === 'rotate')}>旋转</button>
                <button onClick={() => setGizmoMode('scale')} style={gmBtn(gizmoMode === 'scale')}>缩放</button>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
                位置<br />
                <span style={{ color: '#ccc', fontSize: 10 }}>X:{selObj.position[0].toFixed(1)} Y:{selObj.position[1].toFixed(1)} Z:{selObj.position[2].toFixed(1)}</span>
              </div>
              <button onClick={() => { pushUndo(objects); setObjects(prev => prev.map(o => o.id === selectedId ? { ...o, position: [0, o.type === 'figure' || o.type === 'plane' ? 0 : 0.5, 0] as Vec3, rotation: [0, 0, 0] as Vec3 } : o)); }}
                style={{ padding: 6, borderRadius: 6, fontSize: 10, cursor: 'pointer', background: 'rgba(200,160,0,0.08)', border: '1px solid rgba(200,160,0,0.2)', color: '#886600', width: '100%' }}>复位</button>
              <button onClick={() => { pushUndo(objects); setObjects(prev => prev.filter(o => o.id !== selectedId)); setSelectedId(null); }}
                style={{ padding: 7, background: 'rgba(200,60,60,0.08)', border: '1px solid rgba(200,60,60,0.2)', borderRadius: 8, color: '#664444', fontSize: 11, cursor: 'pointer', width: '100%' }}>删除</button>
            </div>
          ) : (
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
              点击物体选中<br />拖GLB导入<br />右键旋转视角<br />Esc取消选中<br />Del删除选中
            </div>
          )}
        </div>
      </div>

      {/* PiP Viewfinder */}
      <PiPViewer activeCamRef={activeCamRef} objects={objects} nodeId={nodeId}
        visible={showCam} lens={vcamLens} aperture={vcamAperture}
        onLensChange={setVcamLens} onApertureChange={setVcamAperture} />

      {/* Timeline */}
      {rig && (
        <Timeline rig={rig} playing={playing} playTime={playTime} zoom={zoom}
          timelineH={timelineH} animTimeline={animTimeline}
          setRig={setRig} setPlaying={setPlaying}
          setPlayTime={setPlayTime} setZoom={setZoom} setTimelineH={setTimelineH}
          setAnimTimeline={setAnimTimeline}
          activeCamRef={activeCamRef} getTrackCamera={getTrackCamera} />
      )}

      {/* Bottom shortcut bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, padding: '5px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, fontSize: 10, color: 'rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.15)' }}>
        <span>左键选中</span><span>移动/旋转/缩放</span><span>右键视角</span><span>Esc取消</span><span>Ctrl+Z撤销</span>
      </div>
    </div>, document.body);
}

// ─── Gizmo mode button helper ─────────────────────
function gmBtn(active: boolean): React.CSSProperties {
  return {
    flex: 1, padding: '6px 4px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer',
    background: active ? 'rgba(100,140,255,0.2)' : 'rgba(255,255,255,0.04)',
    border: active ? '1px solid rgba(100,140,255,0.3)' : '1px solid rgba(255,255,255,0.06)',
    color: active ? '#a0c0ff' : 'rgba(255,255,255,0.4)',
  };
}
