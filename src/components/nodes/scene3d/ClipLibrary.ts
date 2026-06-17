/* === ClipLibrary — animation clip storage === */
import * as THREE from 'three';

export interface ClipData {
  id: string;
  name: string;
  sourceUrl: string;
  duration: number;
  frameCount: number;
  clip: THREE.AnimationClip;
}

export const clipLibrary = new Map<string, ClipData>();

const clipListeners = new Set<() => void>();
export function onClipLibraryChange(fn: () => void) {
  clipListeners.add(fn);
  return () => { clipListeners.delete(fn); };
}
function notify() { clipListeners.forEach(fn => fn()); }

/** Extract clips from a loaded FBX/GLB group. Returns added clip IDs. */
export function extractClips(group: THREE.Group, sourceUrl: string, sourceName: string): string[] {
  const ids: string[] = [];
  if (!group.animations || group.animations.length === 0) return ids;

  for (const anim of group.animations) {
    const id = `clip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const targetName = anim.name && anim.name !== 'default' ? anim.name : sourceName;
    clipLibrary.set(id, {
      id, name: targetName, sourceUrl,
      duration: anim.duration,
      frameCount: Math.ceil(anim.duration * 30), // assuming 30fps
      clip: anim.clone(),
    });
    ids.push(id);
  }
  if (ids.length > 0) notify();
  return ids;
}

/** Create a ClipAction that's ready to play on a mixer */
export function createClipAction(clipId: string, mixer: THREE.AnimationMixer): THREE.AnimationAction | null {
  const data = clipLibrary.get(clipId);
  if (!data) return null;
  return mixer.clipAction(data.clip);
}

/** Get a readable display label for a clip */
export function getClipLabel(id: string): string {
  const data = clipLibrary.get(id);
  if (!data) return '?';
  const secs = data.duration.toFixed(1);
  return `${data.name}  ${secs}s  ${data.frameCount}f`;
}
