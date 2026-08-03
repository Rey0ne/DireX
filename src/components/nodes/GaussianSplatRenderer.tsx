// @ts-nocheck — Spark 2.0: SplatMesh extends THREE.Object3D, compatible with R3F scene
/* === Gaussian Splat Renderer (3DGS) — Spark 2.0 ===
 * Powered by World Labs' @sparkjsdev/spark (MIT).
 *
 * Spark 2.0 handles (so we don't reinvent):
 *   - Auto-detection: .ply / .spz / .splat / .ksplat / .sog
 *   - Continuous LoD: adaptive splat budget per frame, steady FPS
 *   - Progressive streaming via .RAD format
 *   - GPU virtual memory paging (16M splat pool, LRU)
 *   - Rust/WASM parsing in Web Worker (non-blocking)
 *   - Spherical Harmonics, opacity, scale activation
 *   - 100M+ splats on phones
 *
 * Architecture:
 *   SparkRenderer — singleton per WebGLRenderer, added to scene once
 *   SplatMesh — one per splat file, position/rotation/scale via Object3D
 */

import React, { useEffect, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';

interface Props {
  src: string;
  color?: string;
  maxGaussians?: number;
}

// ─── SparkRenderer pool — one per WebGLRenderer (main viewport + PiP) ───
const _sparks = new Map<any, SparkRenderer>();

function getSpark(gl: any, scene: any): SparkRenderer {
  let s = _sparks.get(gl);
  if (s) return s;
  s = new SparkRenderer({ renderer: gl });
  scene.add(s);
  _sparks.set(gl, s);
  return s;
}

export function SparkSplatModel({ src, color: _color, maxGaussians: _mg }: Props) {
  const { scene, gl } = useThree();
  const splatRef = useRef<SplatMesh | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadIdRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    loadIdRef.current += 1;
    const loadId = loadIdRef.current;

    // Ensure SparkRenderer is on the scene
    getSpark(gl, scene);

    // Dispose previous splat
    if (splatRef.current) {
      try { splatRef.current.dispose(); } catch {}
      scene.remove(splatRef.current);
      splatRef.current = null;
    }
    setError(null);

    const splat = new SplatMesh({ url: src });
    splatRef.current = splat;
    // Prevent frustum culling — SplatMesh has no bounding volume by default,
    // so THREE.js incorrectly culls it when camera moves (WASD pan).
    splat.frustumCulled = false;
    scene.add(splat);

    splat.initialized
      .then(() => {
        if (cancelled || loadId !== loadIdRef.current) {
          try { splat.dispose(); } catch {}
          scene.remove(splat);
          return;
        }
        console.log(`[Spark] Loaded: ${src.slice(0, 50)}...`);
      })
      .catch((err: any) => {
        if (cancelled || loadId !== loadIdRef.current) return;
        console.warn('[Spark] Load failed:', err?.message || err);
        setError(err?.message || 'Unknown error');
        if (splatRef.current === splat) {
          try { splat.dispose(); } catch {}
          scene.remove(splat);
          splatRef.current = null;
        }
      });

    return () => {
      cancelled = true;
    };
  }, [src, scene, gl]);

  // Final unmount cleanup
  useEffect(() => {
    return () => {
      if (splatRef.current) {
        try { splatRef.current.dispose(); } catch {}
        scene.remove(splatRef.current);
        splatRef.current = null;
      }
    };
  }, [scene]);

  // Spark renders directly to scene, no React element needed.
  // But if there's an error, render a small indicator.
  if (error) {
    return (
      <mesh>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial color="#ff4444" transparent opacity={0.4} />
      </mesh>
    );
  }
  return null;
}

// Backward-compatible alias
export { SparkSplatModel as GaussianSplatModel };
export default SparkSplatModel;
