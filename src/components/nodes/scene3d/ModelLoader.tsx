/* === ModelLoader — GLB/FBX loading, pose registry init === */
import { useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { KNOWN_POSES, PF, PoseEntry, poseRegistry, poseInitDone, markPoseInitDone, ErrorBoundary } from './shared';

// ─── Init pose registry (HEAD-check known poses) ───────────
export async function initPoseRegistry() {
  if (poseInitDone) return;
  markPoseInitDone();
  const r = await Promise.all(KNOWN_POSES.map(async id => {
    try { const r = await fetch(`/models/${id}.glb`, { method: 'HEAD' }); if (r.ok) return { id, ext: 'glb' }; } catch { }
    return null;
  }));
  r.filter(Boolean).forEach(x => {
    if (x) poseRegistry.set(x.id, { name: PF[x.id] || x.id, src: `/models/${x.id}.glb` });
  });
}

// ─── File import (drag-drop .glb/.fbx) ────────────────────
export function importFile(file: File, done: (entry: PoseEntry, poseId: string) => void) {
  const name = file.name.replace(/\.(glb|fbx)$/i, '');
  const id = name.toLowerCase().replace(/[^a-z0-9]/g, '_') || `pose_${Date.now()}`;
  const ext = file.name.endsWith('.fbx') ? 'fbx' : 'glb';
  // Use Object URL for FBX (FBXLoader needs a real URL, not base64)
  if (ext === 'fbx') {
    const url = URL.createObjectURL(file);
    const e: PoseEntry = { name, src: url, format: 'fbx' };
    poseRegistry.set(id, e);
    done(e, id);
    return;
  }
  const r = new FileReader();
  r.onload = () => { const src = r.result as string; const e: PoseEntry = { name, src, format: 'glb' }; poseRegistry.set(id, e); done(e, id); };
  r.readAsDataURL(file);
}

// ─── Material conversion helper ───────────────────────────
export function lambertize(child: any) {
  if (child.isMesh && child.material?.isMeshStandardMaterial) {
    const old = child.material;
    const L = new THREE.MeshLambertMaterial();
    L.color.copy(old.color);
    L.map = old.map;
    child.material = L;
  }
}

// ─── GLB Model (wraps useGLTF, clones + lambertizes) ─────
export function GLBModel({ src }: { src: string }) {
  const { scene } = useGLTF(src);
  const cloned = useMemo(() => {
    const s = scene.clone(true);
    s.traverse(lambertize);
    return s;
  }, [scene]);
  const wrapped = useMemo(() => {
    const g = new THREE.Group();
    g.add(cloned.clone(true));
    return g;
  }, [cloned]);
  return <primitive object={wrapped} />;
}

// ─── SafeModel: tries GLB load, falls back on error/404 ──
export function SafeModel({ poseId, figureSrc, fallback }: {
  poseId: string; figureSrc?: string; fallback: import('react').ReactNode;
}) {
  const src = figureSrc || (poseRegistry.get(poseId)?.src);
  const [exists, setExists] = useState<boolean | string>('loading');
  useEffect(() => {
    if (!src) { setExists(false); return; }
    if (src.startsWith('data:') || src.startsWith('blob:')) { setExists(src); return; }
    let c = false;
    fetch(src, { method: 'HEAD' }).then(r => { if (!c) setExists(r.ok ? src : false); })
      .catch(() => { if (!c) setExists(false); });
    return () => { c = true; };
  }, [src]);
  if (exists === 'loading') return null;
  if (!exists || typeof exists !== 'string') return <>{fallback}</>;
  return <ErrorBoundary fallback={fallback}><GLBModel src={exists as string} /></ErrorBoundary>;
}
