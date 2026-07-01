/* === TripoModelPreview — 全屏 3D 预览弹窗 === */
import { Suspense, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  modelUrl: string;
  modelName: string;
  onClose: () => void;
}

function ModelView({ url, animRef }: { url: string; animRef: React.MutableRefObject<{ mixer: THREE.AnimationMixer; actions: Record<string, THREE.AnimationAction>; duration: number } | null> }) {
  const { scene, animations } = useGLTF(url);
  const groupRef = useRef(new THREE.Group());
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const playingRef = useRef(false);
  const speedRef = useRef(1);

  // Apply PBR fixes + wrap in Group for scale/center (don't clone — clone breaks SkinnedMesh.skeleton)
  useEffect(() => {
    const g = groupRef.current;
    // Clear previous children in case of StrictMode remount
    while (g.children.length > 0) g.remove(g.children[0]);
    g.scale.setScalar(1);
    g.position.set(0, 0, 0);

    // Fix PBR on original scene (idempotent)
    scene.traverse((ch: any) => {
      if (ch.isMesh) {
        const mat = ch.material;
        if (mat) {
          if (mat.map) { mat.map.colorSpace = THREE.SRGBColorSpace; mat.map.needsUpdate = true; }
          if (mat.emissiveMap) { mat.emissiveMap.colorSpace = THREE.SRGBColorSpace; }
          mat.roughness = mat.roughness ?? 0.4;
          mat.metalness = mat.metalness ?? 0.1;
          mat.needsUpdate = true;
        }
        ch.castShadow = true; ch.receiveShadow = true;
      }
    });

    // Scale + center via wrapper Group (don't mutate scene)
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 5) g.scale.setScalar(5 / maxDim);
    const center = box.getCenter(new THREE.Vector3());
    g.position.set(-center.x, -center.y + size.y / 2, -center.z);

    g.add(scene);
  }, [scene]);

  // Manual AnimationMixer on ORIGINAL scene (keeps skeleton → mesh binding intact)
  useEffect(() => {
    const mixer = new THREE.AnimationMixer(scene);
    const acts: Record<string, THREE.AnimationAction> = {};
    animations.forEach((clip) => {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.play();
      action.paused = true;
      acts[clip.name] = action;
    });
    mixerRef.current = mixer;
    const maxDur = animations.length > 0 ? Math.max(...animations.map(c => c.duration)) : 0;
    animRef.current = animations.length > 0 ? { mixer, actions: acts, duration: maxDur } : null;
    (mixer as any)._tripoPlayingRef = playingRef;
    (mixer as any)._tripoSpeedRef = speedRef;
    return () => { mixer.stopAllAction(); mixerRef.current = null; animRef.current = null; };
  }, [scene, animations, animRef]);

  useFrame((_, delta) => {
    if (!playingRef.current || !mixerRef.current) return;
    mixerRef.current.update(delta * speedRef.current);
  });

  return <primitive object={groupRef.current} />;
}

export function TripoModelPreview({ modelUrl, modelName, onClose }: Props) {
  const animRef = useRef<{ mixer: THREE.AnimationMixer; actions: Record<string, THREE.AnimationAction>; duration: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [animTime, setAnimTime] = useState(0);
  const [totalDur, setTotalDur] = useState(0);
  const [animSpeed, setAnimSpeed] = useState(1);
  const rafRef = useRef(0);

  // ── Poll time while playing ──
  useEffect(() => {
    if (!playing) { cancelAnimationFrame(rafRef.current); return; }
    const poll = () => {
      const m = animRef.current?.mixer as any;
      if (m) setAnimTime(Math.min(m.time, animRef.current!.duration));
      rafRef.current = requestAnimationFrame(poll);
    };
    rafRef.current = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  // ── Update total duration when animations load ──
  useEffect(() => {
    const check = setInterval(() => {
      if (animRef.current) { setTotalDur(animRef.current.duration); clearInterval(check); }
    }, 100);
    return () => clearInterval(check);
  }, []);

  // ── Controls ──
  const togglePlay = useCallback(() => {
    const a = animRef.current;
    if (!a) return;
    if (playing) {
      // Pause
      Object.values(a.actions).forEach(ac => { ac.paused = true; });
      (a.mixer as any)._tripoPlayingRef.current = false;
      setPlaying(false);
    } else {
      // Play (restart if at end)
      if (a.mixer.time >= a.duration - 0.05) { a.mixer.setTime(0); setAnimTime(0); }
      Object.values(a.actions).forEach(ac => { ac.paused = false; });
      (a.mixer as any)._tripoPlayingRef.current = true;
      (a.mixer as any)._tripoSpeedRef.current = animSpeed;
      setPlaying(true);
    }
  }, [playing, animSpeed]);

  const handleStop = useCallback(() => {
    const a = animRef.current;
    if (!a) return;
    a.mixer.setTime(0);
    setAnimTime(0);
    Object.values(a.actions).forEach(ac => { ac.paused = true; });
    (a.mixer as any)._tripoPlayingRef.current = false;
    setPlaying(false);
  }, []);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const a = animRef.current;
    if (!a || a.duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * a.duration;
    a.mixer.setTime(t);
    setAnimTime(t);
  }, []);

  const handleSpeed = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const s = Number(e.target.value);
    setAnimSpeed(s);
    const a = animRef.current;
    if (a) (a.mixer as any)._tripoSpeedRef.current = s;
  }, []);

  const showTimeline = totalDur > 0;

  return createPortal(
    <div style={{ position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.92)',display:'flex',flexDirection:'column',fontFamily:'Inter, system-ui, sans-serif' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {/* ── Top Bar ── */}
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'14px 20px',flexShrink:0,borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
        <div>
          <div style={{ color:'#fff',fontSize:16,fontWeight:600 }}>3D 模型预览</div>
          <div style={{ color:'rgba(255,255,255,0.4)',fontSize:12,marginTop:2 }}>{modelName}</div>
        </div>
        <div style={{ display:'flex',gap:8,alignItems:'center' }}>
          <button onClick={() => {
            fetch(modelUrl).then(r => r.blob()).then(blob => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = modelName.replace(/[^a-zA-Z0-9一-鿿]/g, '_') + '.glb';
              a.click();
              URL.revokeObjectURL(url);
            }).catch(() => { window.open(modelUrl, '_blank'); });
          }} title="下载模型"
            style={{ width:34,height:34,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:6,border:'1px solid rgba(94,234,212,0.2)',background:'rgba(94,234,212,0.08)',color:'#5EEAD4',cursor:'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5EEAD4" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </button>
          <button onClick={onClose}
            style={{ padding:'6px 16px',borderRadius:6,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)',color:'#fff',cursor:'pointer',fontSize:13 }}>关闭 ✕</button>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div style={{ flex:1,minHeight:0 }}>
        <Canvas camera={{ position:[3,2,5],fov:45 }}
          gl={{ preserveDrawingBuffer:false, antialias:true, outputColorSpace:THREE.SRGBColorSpace, toneMapping:THREE.ACESFilmicToneMapping, toneMappingExposure:1.1 }}
          shadows
          style={{ background:'radial-gradient(circle at center, #1a1a2e 0%, #0a0a12 100%)' }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5,8,5]} intensity={2.5} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-far={50} shadow-camera-left={-10} shadow-camera-right={10} shadow-camera-top={10} shadow-camera-bottom={-10} />
          <directionalLight position={[-3,2,-3]} intensity={0.6} />
          <directionalLight position={[0,1,5]} intensity={0.8} />
          <Environment preset="studio" environmentIntensity={0.8} />
          <ContactShadows position={[0,-0.5,0]} opacity={0.5} scale={10} blur={2} far={4} />
          <Suspense fallback={<mesh><sphereGeometry args={[0.5,16,16]} /><meshStandardMaterial color="#333" wireframe /></mesh>}>
            <ModelView url={modelUrl} animRef={animRef} />
          </Suspense>
          <OrbitControls enableDamping dampingFactor={0.1} />
        </Canvas>
      </div>

      {/* ── Animation Timeline (only when clips exist) ── */}
      {showTimeline && (
        <div style={{ padding:'6px 20px',flexShrink:0,borderTop:'1px solid rgba(255,255,255,0.06)',background:'rgba(0,0,0,0.3)',display:'flex',flexDirection:'column',gap:4 }}>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <button onClick={togglePlay}
              style={{ padding:'4px 10px',borderRadius:5,fontSize:12,fontWeight:600,cursor:'pointer',background:playing?'rgba(200,160,0,0.15)':'rgba(100,255,100,0.1)',border:playing?'1px solid rgba(200,160,0,0.3)':'1px solid rgba(100,255,100,0.2)',color:playing?'#cc0':'#0c0' }}>
              {playing ? '⏸ 暂停' : '▶ 播放'}
            </button>
            <button onClick={handleStop}
              style={{ padding:'4px 10px',borderRadius:5,fontSize:12,cursor:'pointer',background:'rgba(255,80,80,0.08)',border:'1px solid rgba(255,80,80,0.2)',color:'#c44' }}>
              ■ 停止
            </button>
            <select value={animSpeed} onChange={handleSpeed}
              style={{ padding:'2px 4px',borderRadius:4,fontSize:10,background:'rgba(0,0,0,0.3)',border:'1px solid rgba(255,255,255,0.1)',color:'#ccc',cursor:'pointer' }}>
              <option value={0.3}>0.3x</option><option value={0.5}>0.5x</option><option value={0.7}>0.7x</option>
              <option value={1}>1x</option><option value={1.5}>1.5x</option><option value={2}>2x</option>
            </select>
            <span style={{ fontSize:11,color:'#ccc',fontWeight:600,marginLeft:8,minWidth:120 }}>
              {animTime.toFixed(1)}s / {totalDur.toFixed(1)}s
            </span>
          </div>
          {/* Scrubber */}
          <div onClick={handleSeek}
            style={{ position:'relative',height:24,background:'rgba(255,255,255,0.05)',borderRadius:4,cursor:'pointer',overflow:'hidden' }}>
            <div style={{
              position:'absolute',left:0,top:0,height:'100%',
              width:`${totalDur>0?(animTime/totalDur)*100:0}%`,
              background:'rgba(94,234,212,0.15)',borderRight:'2px solid #5EEAD4',pointerEvents:'none',
            }} />
            {(() => {
              const step = totalDur<=5?1:totalDur<=15?2:totalDur<=30?5:10;
              const labels:React.ReactNode[]=[];
              for(let s=0;s<=totalDur;s+=step) labels.push(
                <div key={s} style={{ position:'absolute',left:`${(s/totalDur)*100}%`,top:2,transform:'translateX(-50%)',fontSize:8,color:'rgba(255,255,255,0.35)',pointerEvents:'none' }}>{s}s</div>
              );
              return labels;
            })()}
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div style={{ padding:'8px 20px',flexShrink:0,borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',justifyContent:'center',gap:30,fontSize:11,color:'rgba(255,255,255,0.25)' }}>
        <span>🖱 左键旋转</span><span>🖱 滚轮缩放</span><span>🖱 右键平移</span>
        {showTimeline && <span>🎬 点击进度条跳转</span>}
      </div>
    </div>, document.body);
}
