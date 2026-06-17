/* === EnvComponents — sky, ground, clouds, sun === */
import React, { useRef, useMemo, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Vec3, CameraRig } from './shared';

const animMixers: Set<THREE.AnimationMixer> = new Set();
const animSpeed = 0.7;

// ─── Cloud texture generator ──────────────────────
function mkCloudTex(sz: number, cnt: number, szRange: number, dim: number): THREE.CanvasTexture {
  const cvs = document.createElement('canvas'); cvs.width = cvs.height = sz;
  const ctx = cvs.getContext('2d')!;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, sz, sz);
  for (let i = 0; i < cnt; i++) {
    const x = Math.random() * sz, y = Math.random() * sz;
    const r = (Math.random() * szRange + 2) * (sz / dim);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${0.6 + Math.random() * 0.4})`);
    g.addColorStop(0.5, `rgba(255,255,255,${0.2 + Math.random() * 0.3})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, sz, sz);
  }
  const tex = new THREE.CanvasTexture(cvs); tex.needsUpdate = true; return tex;
}

// ─── TileGround ────────────────────────────────────
export function TileGround() {
  const { scene } = useThree();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const geom = useMemo(() => {
    const shape = new THREE.Shape(); const s = 0.49;
    shape.moveTo(-s, -s); shape.lineTo(s, -s); shape.lineTo(s, s); shape.lineTo(-s, s); shape.closePath();
    const eg = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 });
    eg.rotateX(-Math.PI / 2); eg.translate(0, -0.06, 0); return eg;
  }, []);
  useEffect(() => {
    if (!meshRef.current) return;
    const m = meshRef.current; const dummy = new THREE.Object3D(); const half = 30; let idx = 0;
    for (let x = -half; x < half; x++) for (let z = -half; z < half; z++) {
      dummy.position.set(x + 0.5, -0.06, z + 0.5); dummy.updateMatrix(); m.setMatrixAt(idx++, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, []);
  return <instancedMesh ref={meshRef} args={[geom, undefined!, 3600] as any} receiveShadow frustumCulled={false}>
    <meshStandardMaterial color="#c0c0c0" roughness={0.35} metalness={0.02} />
  </instancedMesh>;
}

// ─── CheckerGround ─────────────────────────────────
export function CheckerGround() { return <TileGround />; }

// ─── ProcSky ───────────────────────────────────────
export function ProcSky({ sunAzimuth, sunElevation }: { sunAzimuth: number; sunElevation: number }) {
  const az = sunAzimuth || 45; const el = sunElevation || 40;
  const sunDir = useMemo(() => {
    const phi = THREE.MathUtils.degToRad(90 - el); const theta = THREE.MathUtils.degToRad(az);
    return new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
  }, [az, el]);
  const skyMesh = useMemo(() => {
    const geo = new THREE.SphereGeometry(55, 64, 32);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uSunDir: { value: sunDir.clone() } },
      vertexShader: `varying vec3 vWorldPos;void main(){vec4 wp=modelMatrix*vec4(position,1.0);vWorldPos=wp.xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `varying vec3 vWorldPos;uniform vec3 uSunDir;void main(){vec3 dir=normalize(vWorldPos);float h=dir.y;float t=smoothstep(-0.05,0.35,h);vec3 zenith=vec3(0.35,0.62,0.98);vec3 horizon=vec3(0.72,0.90,1.0);vec3 col=mix(horizon,zenith,t)*1.3;float sunDot=clamp(dot(dir,uSunDir),0.0,1.0);float glow=pow(sunDot,80.0)*0.25;gl_FragColor=vec4(col+glow*vec3(1.0,0.9,0.7),1.0);}`,
      side: THREE.BackSide, depthWrite: false,
    });
    const m = new THREE.Mesh(geo, mat); m.renderOrder = -1; m.frustumCulled = false; return m;
  }, []);
  useEffect(() => { skyMesh.material.uniforms.uSunDir.value.copy(sunDir); }, [sunDir, skyMesh]);
  return <primitive object={skyMesh} />;
}

// ─── SunLight ──────────────────────────────────────
export function SunLight({ azimuth, elevation }: { azimuth: number; elevation: number }) {
  const radAz = (azimuth * Math.PI) / 180; const radEl = (elevation * Math.PI) / 180; const dist = 20;
  const x = dist * Math.cos(radEl) * Math.sin(radAz);
  const y = dist * Math.sin(radEl);
  const z = dist * Math.cos(radEl) * Math.cos(radAz);
  return <><hemisphereLight args={['#dde8f4', '#aa9988', 1.8]} /><directionalLight position={[x, y, z]} intensity={3.5} color="#fff5e8" castShadow /></>;
}

// ─── CloudLayer ────────────────────────────────────
export function CloudLayer({ sunAzimuth, sunElevation }: { sunAzimuth: number; sunElevation: number }) {
  const az = sunAzimuth || 45; const el = sunElevation || 40;
  const phi = THREE.MathUtils.degToRad(90 - el); const theta = THREE.MathUtils.degToRad(az);
  const sunDir = useMemo(() => new THREE.Vector3().setFromSphericalCoords(1, phi, theta), [az, el]);
  const texHi = useMemo(() => mkCloudTex(40, 5, 0.45, 5.0), []);
  const texMid = useMemo(() => mkCloudTex(28, 8, 0.42, 4.0), []);
  const texLo = useMemo(() => mkCloudTex(18, 10, 0.40, 3.5), []);
  const mHi = useRef<THREE.ShaderMaterial>(null), mMid = useRef<THREE.ShaderMaterial>(null), mLo = useRef<THREE.ShaderMaterial>(null);
  const mats = [mHi, mMid, mLo];
  useEffect(() => { mats.forEach(r => { if (r.current) r.current.uniforms.uSunDir.value.copy(sunDir); }); }, [sunDir]);
  const _cs = [0.022, 0.014, 0.008];
  useFrame((_, delta) => { mats.forEach((r, i) => { if (!r.current) return; const spd = _cs[i]; r.current.uniforms.uOffset.value.y += delta * spd; r.current.uniforms.uOffset.value.x += delta * spd * 0.15; }); });
  const vs = `varying vec2 vUv;varying vec3 vWorldPos;void main(){vec4 wp=modelMatrix*vec4(position,1.0);vWorldPos=wp.xyz;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`;
  const fs = `varying vec2 vUv;varying vec3 vWorldPos;uniform sampler2D uTex;uniform vec3 uSunDir;uniform vec2 uOffset;uniform float uOpacity;void main(){vec2 uv=vUv+uOffset;float c=texture2D(uTex,uv).a;if(c<0.01)discard;vec3 n=normalize(vWorldPos);float sunDot=clamp(dot(n,uSunDir),0.0,1.0);float bright=0.4+sunDot*0.6;float edge=pow(1.0-abs(sunDot-0.5)*2.0,3.0);float silver=pow(c,2.0)*edge*0.3;float alpha=c*uOpacity;gl_FragColor=vec4(vec3(1.0)*bright+silver,alpha);}`;
  const mkLayer = (r: number, tex: THREE.CanvasTexture, op: number, ref: React.RefObject<THREE.ShaderMaterial>) => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: tex }, uSunDir: { value: sunDir.clone() }, uOffset: { value: new THREE.Vector2(0, 0) }, uOpacity: { value: op } },
      vertexShader: vs, fragmentShader: fs, transparent: true, depthWrite: false, side: THREE.BackSide,
    });
    return <mesh frustumCulled={false}><sphereGeometry args={[r, 64, 32]} /><primitive object={mat} ref={ref} attach="material" /></mesh>;
  };
  return <>{mkLayer(60, texHi, 0.6, mHi)}{mkLayer(54, texMid, 0.7, mMid)}{mkLayer(49, texLo, 0.75, mLo)}</>;
}

// ─── FrustumGate ───────────────────────────────────
const RENDER_DIST = 50;
export function FrustumGate({ pos, children }: { pos: Vec3; children: React.ReactNode }) {
  const { camera } = useThree(); const [vis, setVis] = useState(true); const vRef = useRef(true);
  useFrame(() => {
    const d = Math.sqrt(Math.pow(pos[0] - camera.position.x, 2) + Math.pow(pos[2] - camera.position.z, 2));
    const s = d < RENDER_DIST; if (vRef.current !== s) { vRef.current = s; setVis(s); }
  });
  return vis ? <>{children}</> : null;
}

// ─── AnimationSync ─────────────────────────────────
export function AnimationSync({ time, active, rig }: { time: number; active: boolean; rig: CameraRig | null }) {
  useEffect(() => {
    if (!active) { animMixers.forEach(m => { m.time = 0; (Object.values as any)((m as any)._actions).forEach((a: any) => a.paused = true); }); return; }
    animMixers.forEach((m) => {
      if (rig?.animTracks?.length) {
        const trk = rig.animTracks[0]; const inRange = time >= trk.start && time < trk.start + trk.dur;
        Object.values((m as any)._actions).forEach((a: any) => a.paused = !inRange);
      } else { Object.values((m as any)._actions).forEach((a: any) => a.paused = true); }
    });
  }, [active, time, rig]);
  useFrame((_, delta) => {
    if (!active || !rig || !rig.animTracks?.length) return;
    animMixers.forEach((m) => { m.update(delta * animSpeed); });
  });
  return null;
}
