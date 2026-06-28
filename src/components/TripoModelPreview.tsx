/* === TripoModelPreview — 全屏 3D 预览弹窗 === */
import { Suspense, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  modelUrl: string;
  modelName: string;
  onClose: () => void;
}

function ModelView({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((ch: any) => {
      if (ch.isMesh) {
        const mat = ch.material;
        if (mat) {
          // Ensure texture maps are properly assigned and sRGB-aware
          if (mat.map) { mat.map.colorSpace = THREE.SRGBColorSpace; mat.map.needsUpdate = true; }
          if (mat.emissiveMap) { mat.emissiveMap.colorSpace = THREE.SRGBColorSpace; }
          if (mat.roughnessMap || mat.metalnessMap) {
            // These are grayscale, no colorSpace needed
          }
          // Default PBR values if not set
          mat.roughness = mat.roughness ?? 0.4;
          mat.metalness = mat.metalness ?? 0.1;
          mat.needsUpdate = true;
        }
        ch.castShadow = true; ch.receiveShadow = true;
      }
    });
    // Scale + center
    const box = new THREE.Box3().setFromObject(c);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 5) c.scale.setScalar(5 / maxDim);
    const center = box.getCenter(new THREE.Vector3());
    c.position.set(-center.x, -center.y + size.y / 2, -center.z);
    return c;
  }, [scene]);
  return <primitive object={cloned} />;
}

export function TripoModelPreview({ modelUrl, modelName, onClose }: Props) {
  return createPortal(
    <div style={{ position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.92)',display:'flex',flexDirection:'column',fontFamily:'Inter, system-ui, sans-serif' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(255,255,255)" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </button>
          <button onClick={onClose}
            style={{ padding:'6px 16px',borderRadius:6,border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.05)',color:'#fff',cursor:'pointer',fontSize:13 }}>关闭 ✕</button>
        </div>
      </div>
      <div style={{ flex:1,minHeight:0 }}>
        <Canvas camera={{ position:[3,2,5],fov:45 }}
          gl={{
            preserveDrawingBuffer:false, antialias:true,
            outputColorSpace:THREE.SRGBColorSpace,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.1,
          }}
          shadows
          style={{ background:'radial-gradient(circle at center, #1a1a2e 0%, #0a0a12 100%)' }}>
          {/* Studio lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight position={[5,8,5]} intensity={2.5} castShadow
            shadow-mapSize-width={1024} shadow-mapSize-height={1024}
            shadow-camera-far={50} shadow-camera-left={-10} shadow-camera-right={10}
            shadow-camera-top={10} shadow-camera-bottom={-10} />
          <directionalLight position={[-3,2,-3]} intensity={0.6} />
          <directionalLight position={[0,1,5]} intensity={0.8} />
          {/* PBR environment map for realistic reflections */}
          <Environment preset="studio" environmentIntensity={0.8} />
          <ContactShadows position={[0,-0.5,0]} opacity={0.5} scale={10} blur={2} far={4} />
          <Suspense fallback={<mesh><sphereGeometry args={[0.5,16,16]} /><meshStandardMaterial color="#333" wireframe /></mesh>}>
            <ModelView url={modelUrl} />
          </Suspense>
          <OrbitControls enableDamping dampingFactor={0.1} />
        </Canvas>
      </div>
      <div style={{ padding:'8px 20px',flexShrink:0,borderTop:'1px solid rgba(255,255,255,0.06)',display:'flex',justifyContent:'center',gap:30,fontSize:11,color:'rgba(255,255,255,0.25)' }}>
        <span>🖱 左键旋转</span><span>🖱 滚轮缩放</span><span>🖱 右键平移</span>
      </div>
    </div>, document.body);
}
