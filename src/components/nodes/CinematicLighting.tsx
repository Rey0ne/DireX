/* === DireX Cinematic Lighting System ===
   PMREMGenerator-based environment lighting + PCFSoft shadows + exposure control */
import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { type LightingPreset, kelvinToRGB } from './LightingPresets';

/* ── Procedural equirectangular env map from preset ── */
function buildEquirect(preset: LightingPreset, sunColor: THREE.Color): HTMLCanvasElement {
  const W = 512, H = 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;

  // Sky gradient (top half)
  const skyTop = new THREE.Color(preset.skyColor);
  const skyMid = new THREE.Color('#8899bb');
  const gnd = new THREE.Color(preset.groundColor);
  const horizonY = H * 0.48;
  const skyGrad = ctx.createLinearGradient(0, 0, 0, horizonY);
  skyGrad.addColorStop(0, `rgb(${Math.floor(skyTop.r * 255)},${Math.floor(skyTop.g * 255)},${Math.floor(skyTop.b * 255)})`);
  skyGrad.addColorStop(0.7, `rgb(${Math.floor(skyMid.r * 255)},${Math.floor(skyMid.g * 255)},${Math.floor(skyMid.b * 255)})`);
  skyGrad.addColorStop(1, `rgb(${Math.floor(gnd.r * 160)},${Math.floor(gnd.g * 160)},${Math.floor(gnd.b * 160)})`);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, W, horizonY);

  // Ground gradient (bottom half)
  const gndGrad = ctx.createLinearGradient(0, horizonY, 0, H);
  gndGrad.addColorStop(0, `rgb(${Math.floor(gnd.r * 160)},${Math.floor(gnd.g * 160)},${Math.floor(gnd.b * 160)})`);
  gndGrad.addColorStop(1, `rgb(0,0,0)`);
  ctx.fillStyle = gndGrad;
  ctx.fillRect(0, horizonY, W, H - horizonY);

  // Sun hotspot on equirect
  const elRad = THREE.MathUtils.degToRad(preset.sunElevation);
  const azRad = THREE.MathUtils.degToRad(preset.sunAzimuth);
  const u = ((azRad / (Math.PI * 2)) * W + W * 0.25) % W;
  const v = (1 - elRad / (Math.PI / 2)) * horizonY;
  const spotR = W * 0.12;
  const sg = ctx.createRadialGradient(u, v, 0, u, v, spotR);
  const sr = Math.floor(sunColor.r * 255), sgC = Math.floor(sunColor.g * 255), sb = Math.floor(sunColor.b * 255);
  sg.addColorStop(0, `rgba(${sr},${sgC},${sb},0.9)`);
  sg.addColorStop(0.3, `rgba(${sr},${sgC},${sb},0.4)`);
  sg.addColorStop(0.6, `rgba(${sr},${sgC},${sb},0.1)`);
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0, W, horizonY);

  // Subtle horizon glow
  const hg = ctx.createLinearGradient(0, horizonY - 6, 0, horizonY + 3);
  hg.addColorStop(0, 'rgba(255,255,255,0)');
  hg.addColorStop(0.5, `rgba(${sr},${Math.floor(sgC*0.7)},${Math.floor(sb*0.4)},0.3)`);
  hg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, horizonY - 6, W, 9);

  return c;
}

/* ── Main lighting component ── */
interface CinematicLightingProps {
  preset: LightingPreset;
}

export function CinematicLighting({ preset }: CinematicLightingProps) {
  const { gl, scene } = useThree();
  const pmremRef = useRef<THREE.PMREMGenerator | null>(null);
  const prevEnvRef = useRef<THREE.Texture | null>(null);

  // Compute light parameters from preset
  const { sunColor, sunDir } = useMemo(() => {
    const rgb = kelvinToRGB(preset.sunColorTemp);
    const color = new THREE.Color(rgb.r, rgb.g, rgb.b);
    const elRad = THREE.MathUtils.degToRad(preset.sunElevation);
    const azRad = THREE.MathUtils.degToRad(preset.sunAzimuth);
    const dir = new THREE.Vector3().setFromSphericalCoords(20, Math.PI / 2 - elRad, azRad);
    return { sunColor: color, sunDir: dir };
  }, [preset.sunColorTemp, preset.sunElevation, preset.sunAzimuth]);

  // Configure renderer (shadow map type, tone mapping, exposure)
  useEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
  }, [gl]);

  useEffect(() => {
    gl.toneMappingExposure = preset.exposure;
  }, [gl, preset.exposure]);

  // Generate environment map via PMREMGenerator
  useEffect(() => {
    if (!pmremRef.current) {
      pmremRef.current = new THREE.PMREMGenerator(gl);
    }
    const pmrem = pmremRef.current;

    // Dispose previous env map
    if (prevEnvRef.current) {
      prevEnvRef.current.dispose();
      prevEnvRef.current = null;
    }

    // Build procedural equirect canvas
    const canvas = buildEquirect(preset, sunColor);
    const equiTex = new THREE.CanvasTexture(canvas);
    equiTex.colorSpace = THREE.SRGBColorSpace;
    equiTex.needsUpdate = true;

    // Generate PMREM
    const rt = pmrem.fromEquirectangular(equiTex);
    equiTex.dispose(); // Canvas source no longer needed

    scene.environment = rt.texture;
    // Set neutral background — ProcSky handles the visible sky
    scene.background = null;
    prevEnvRef.current = rt.texture;

    return () => {
      // Cleanup handled next time preset changes (above) or in component cleanup below
    };
  }, [preset.sunColorTemp, preset.sunElevation, preset.sunAzimuth, preset.skyColor, preset.groundColor, gl, scene, sunColor]);

  // Final cleanup on unmount
  useEffect(() => {
    return () => {
      scene.environment = null;
      if (prevEnvRef.current) { prevEnvRef.current.dispose(); prevEnvRef.current = null; }
      if (pmremRef.current) { pmremRef.current.dispose(); pmremRef.current = null; }
    };
  }, [scene]);

  return (
    <>
      {/* Hemisphere ambient */}
      <hemisphereLight
        args={[preset.skyColor, preset.groundColor, preset.ambientIntensity]}
      />
      {/* Main directional sun */}
      <directionalLight
        position={[sunDir.x, sunDir.y, sunDir.z]}
        intensity={preset.sunIntensity}
        color={sunColor}
        castShadow
        shadow-mapSize-width={preset.shadowMapSize}
        shadow-mapSize-height={preset.shadowMapSize}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-camera-near={0.5}
        shadow-camera-far={200}
        shadow-bias={preset.shadowBias}
      />
    </>
  );
}
