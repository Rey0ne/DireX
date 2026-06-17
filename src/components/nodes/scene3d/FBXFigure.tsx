/* === FBXFigure — loads FBX for display + clip extraction === */
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { extractClips } from './ClipLibrary';

const fbxModelCache = new Map<string, THREE.Group>();

function lambertize(child: any) {
  if (child.isMesh && child.material?.isMeshStandardMaterial) {
    const L = new THREE.MeshLambertMaterial();
    L.color.copy(child.material.color);
    L.map = child.material.map;
    child.material = L;
  }
}

/**
 * Loads FBX from URL, lambertizes, caches, extracts clips.
 * Throws promise for Suspense while loading.
 */
export function useFBXModel(src: string, sourceName?: string): THREE.Group | null {
  const [group, setGroup] = useState<THREE.Group | null>(() => fbxModelCache.get(src) || null);
  const [error, setError] = useState<Error | null>(null);
  const [promise, setPromise] = useState<Promise<void> | null>(null);

  useEffect(() => {
    if (fbxModelCache.has(src)) return;
    let cancelled = false;

    const load = async () => {
      const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
      if (cancelled) return;
      const loader = new FBXLoader();

      return new Promise<void>((resolve) => {
        loader.load(src,
          (g) => {
            if (cancelled) return;
            g.traverse(lambertize);
            fbxModelCache.set(src, g);

            // Extract animation clips
            const displayName = sourceName || src.split('/').pop()?.replace(/\.fbx$/i, '') || 'anim';
            extractClips(g, src, displayName);

            setGroup(g);
            resolve();
          },
          undefined,
          (e) => {
            if (cancelled) return;
            setError(e instanceof Error ? e : new Error(String(e)));
            resolve();
          },
        );
      });
    };

    const p = load();
    setPromise(p);
    return () => { cancelled = true; };
  }, [src, sourceName]);

  if (error) throw error;
  if (promise && !group) throw promise;
  return group;
}

/** Renders a cached FBX group (memoized + wrapped) */
export function FBXFigure({ src }: { src: string }) {
  const group = useFBXModel(src);
  const wrapped = useMemo(() => {
    if (!group) return null;
    const g = new THREE.Group();
    g.add(group.clone(true));
    return g;
  }, [group]);
  if (!wrapped) return null;
  return <primitive object={wrapped} />;
}
