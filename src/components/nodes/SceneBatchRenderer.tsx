/* === partitionObjects — split objects into batched vs individual groups === */
import type { SceneObject, BatchedGroup } from './sceneTypes';

export interface PartitionResult {
  cameras: SceneObject[];
  singletons: SceneObject[];       // unique figures (count=1 per model) + no-src figures
  batchedPrimitives: BatchedGroup[]; // grouped by type (box/sphere/cylinder/plane)
  batchedFigures: BatchedGroup[];    // Phase 2: same-model figures (count>1)
}

export function partitionObjects(objects: SceneObject[]): PartitionResult {
  const cameras: SceneObject[] = [];
  const figures: SceneObject[] = [];
  const primitives: SceneObject[] = [];

  for (const o of objects) {
    if (o.type === 'camera') cameras.push(o);
    else if (o.type === 'figure') figures.push(o);
    else primitives.push(o);
  }

  // Phase 2: Group figures by figureSrc — same model multi-instance → batched
  const bySrc = new Map<string, SceneObject[]>();
  const noSrcFigures: SceneObject[] = [];

  for (const f of figures) {
    if (f.figureSrc) {
      const arr = bySrc.get(f.figureSrc) || [];
      arr.push(f);
      bySrc.set(f.figureSrc, arr);
    } else {
      noSrcFigures.push(f);
    }
  }

  const singletons: SceneObject[] = [...noSrcFigures];
  const batchedFigures: BatchedGroup[] = [];

  for (const [src, objs] of bySrc) {
    if (objs.length === 1) {
      singletons.push(objs[0]);
    } else {
      batchedFigures.push({
        groupKey: `figure:${src}`,
        objects: objs,
        transforms: objs.map(o => ({
          position: o.position,
          rotation: o.rotation,
          scale: o.scale,
        })),
        modelUrl: src,
        format: objs[0].figureFmt || 'glb',
      });
    }
  }

  // Group primitives by type — batch ALL of same type
  const byType = new Map<string, SceneObject[]>();
  for (const p of primitives) {
    const arr = byType.get(p.type) || [];
    arr.push(p);
    byType.set(p.type, arr);
  }

  const batchedPrimitives: BatchedGroup[] = [];
  for (const [type, objs] of byType) {
    batchedPrimitives.push({
      groupKey: `primitive:${type}`,
      objects: objs,
      transforms: objs.map(o => ({
        position: o.position,
        rotation: o.rotation,
        scale: o.scale,
      })),
    });
  }

  return { cameras, singletons, batchedPrimitives, batchedFigures };
}
