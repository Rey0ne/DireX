/* === CinematicLighting — 电影灯光系统 R3F 组件 === */
import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { CinematicLightingState } from '../../data/lightingPresets';

interface Props {
  state: CinematicLightingState;
}

export function CinematicLighting({ state }: Props) {
  const { gl } = useThree();

  // ── Renderer 配置 (toneMapping / exposure / shadowMap) ──
  useEffect(() => {
    // PCFSoft shadow map
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;

    // Tone mapping
    switch (state.toneMapping) {
      case 'ACESFilmic':
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        break;
      case 'Cineon':
        gl.toneMapping = THREE.CineonToneMapping;
        break;
      case 'Reinhard':
        gl.toneMapping = THREE.ReinhardToneMapping;
        break;
      default:
        gl.toneMapping = THREE.LinearToneMapping;
    }
    gl.toneMappingExposure = state.exposure;
    gl.outputColorSpace = THREE.SRGBColorSpace;
  }, [gl, state.exposure, state.toneMapping]);

  // ── 太阳方向向量 ──
  const sunDir = useMemo(() => {
    if (!state.directional) return new THREE.Vector3(0, 1, 0);
    const az = THREE.MathUtils.degToRad(state.directional.azimuth);
    const el = THREE.MathUtils.degToRad(state.directional.elevation);
    const r = 20;
    return new THREE.Vector3(
      r * Math.cos(el) * Math.sin(az),
      r * Math.sin(el),
      r * Math.cos(el) * Math.cos(az),
    );
  }, [state.directional?.azimuth, state.directional?.elevation]);

  const { directional, point, spot, environment, fakeGI } = state;

  return (
    <>
      {/* ═══ Fake GI: Ambient + Hemisphere ═══ */}
      <ambientLight intensity={fakeGI.ambientIntensity} color={fakeGI.ambientColor} />
      <hemisphereLight
        color={fakeGI.hemisphereSkyColor}
        groundColor={fakeGI.hemisphereGroundColor}
        intensity={fakeGI.hemisphereSkyIntensity}
      />

      {/* ═══ Directional (太阳/主光) ═══ */}
      {directional && (
        <directionalLight
          position={[sunDir.x, sunDir.y, sunDir.z]}
          intensity={directional.intensity}
          color={directional.color}
          castShadow={directional.castShadow}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
          shadow-camera-near={0.5}
          shadow-camera-far={40}
          shadow-bias={directional.shadowBias ?? -0.0001}
        />
      )}

      {/* ═══ Point Light (灯泡/蜡烛) ═══ */}
      {point && (
        <pointLight
          position={point.position}
          intensity={point.intensity}
          color={point.color}
          distance={point.distance}
          decay={point.decay}
          castShadow={point.castShadow}
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
        />
      )}

      {/* ═══ Spot Light (聚光灯/舞台) ═══ */}
      {spot && (
        <spotLight
          position={spot.position}
          intensity={spot.intensity}
          color={spot.color}
          angle={spot.angle}
          penumbra={spot.penumbra}
          distance={spot.distance}
          decay={spot.decay}
          castShadow={spot.castShadow}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          lookAt={spot.target}
        />
      )}

      {/* ═══ HDRI Environment (PMREMGenerator) ═══ */}
      {environment.preset !== 'none' && (
        <Environment
          preset={environment.preset as any}
          environmentIntensity={environment.intensity}
          blur={environment.blur as number}
          background={false}
        />
      )}
    </>
  );
}
