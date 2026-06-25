/* === Scene Diagnostics — 模型导入时自动分析性能指标 === */

export interface ModelStats {
  fileName: string;
  fileSizeMB: number;
  /* ── Geometry ── */
  meshCount: number;
  totalVertices: number;
  totalTriangles: number;
  /* ── Materials ── */
  materialCount: number;
  uniqueMaterials: number;       // 去重后材质数
  materialNames: string[];
  /* ── Textures ── */
  textureCount: number;
  totalTexturePixels: number;    // 所有贴图像素总和
  textureDetails: { name: string; width: number; height: number; type: string }[];
  /* ── Skeleton ── */
  boneCount: number;
  hasAnimations: boolean;
  animationCount: number;
  /* ── Draw Calls ── */
  estimatedDrawCalls: number;    // ≈ unique(mesh × material) per frame
  /* ── Memory ── */
  estimatedGPUMemMB: number;     // 粗略估算
  /* ── Warnings ── */
  warnings: string[];
}

function formatBytes(bytes: number): string {
  if (bytes > 1_000_000) return (bytes / 1_000_000).toFixed(1) + 'MB';
  if (bytes > 1_000) return (bytes / 1_000).toFixed(0) + 'KB';
  return bytes + 'B';
}

function estimateGPUMem(stats: Pick<ModelStats, 'totalVertices' | 'totalTriangles' | 'totalTexturePixels'>): number {
  // Vertex: ~32 bytes (pos+normal+uv), Index: ~4 bytes per tri × 3
  const geoMem = stats.totalVertices * 32 + stats.totalTriangles * 12;
  // Texture: RGBA8 = 4 bytes per pixel (rough, compressed formats vary)
  const texMem = stats.totalTexturePixels * 4;
  return (geoMem + texMem) / (1024 * 1024);
}

export function diagnoseModel(scene: THREE.Group, fileName?: string, fileSizeBytes?: number): ModelStats {
  let meshCount = 0;
  let totalVertices = 0;
  let totalTriangles = 0;
  let boneCount = 0;
  let animationCount = 0;
  let hasAnimations = false;

  const materialSet = new Set<string>();
  const materialNames: string[] = [];
  const textureMap = new Map<string, { width: number; height: number; type: string }>();
  let totalTexturePixels = 0;

  const warnings: string[] = [];

  scene.traverse((child: any) => {
    // ── Mesh ──
    if (child.isMesh) {
      meshCount++;
      if (child.geometry) {
        const geo = child.geometry;
        const vCount = geo.attributes?.position?.count || 0;
        totalVertices += vCount;
        totalTriangles += geo.index
          ? geo.index.count / 3
          : vCount / 3;
      }
      // Materials
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.filter(Boolean).forEach((m: any) => {
        materialSet.add(m.uuid);
        const name = m.name || m.type || 'unnamed';
        if (!materialNames.includes(name)) materialNames.push(name);
        // Textures per material
        ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap'].forEach(k => {
          const tex = m[k];
          if (tex && tex.image) {
            const key = tex.uuid || tex.name || k;
            if (!textureMap.has(key)) {
              const w = tex.image.width || 0;
              const h = tex.image.height || 0;
              textureMap.set(key, { width: w, height: h, type: k });
              totalTexturePixels += w * h;
            }
          }
        });
      });
    }
    // ── Bone ──
    if (child.isBone) boneCount++;
    // ── Animations ──
    if (child.animations?.length > 0) {
      hasAnimations = true;
      animationCount = Math.max(animationCount, child.animations.length);
    }
    // ── SkinnedMesh (bone-driven) ──
    if (child.isSkinnedMesh) {
      const sk = child as THREE.SkinnedMesh;
      if (sk.skeleton?.bones) boneCount = Math.max(boneCount, sk.skeleton.bones.length);
    }
  });

  const estimatedDrawCalls = meshCount; // 底线：每 mesh 至少 1 draw call（multi-material 会增加）

  const stats: ModelStats = {
    fileName: fileName || 'unknown',
    fileSizeMB: fileSizeBytes ? fileSizeBytes / (1024 * 1024) : 0,
    meshCount,
    totalVertices,
    totalTriangles: Math.floor(totalTriangles),
    materialCount: materialSet.size,
    uniqueMaterials: materialSet.size,
    materialNames,
    textureCount: textureMap.size,
    totalTexturePixels,
    textureDetails: Array.from(textureMap.entries()).map(([name, d]) => ({
      name, ...d,
    })),
    boneCount,
    hasAnimations,
    animationCount,
    estimatedDrawCalls,
    estimatedGPUMemMB: estimateGPUMem({ totalVertices, totalTriangles: Math.floor(totalTriangles), totalTexturePixels }),
    warnings,
  };

  // ── Auto-warnings ──
  if (stats.estimatedDrawCalls > 50) warnings.push(`高 DrawCall: ${stats.estimatedDrawCalls} — 建议 mesh merge`);
  if (stats.materialCount > 20) warnings.push(`材质过多: ${stats.materialCount} — 建议 texture atlas`);
  if (stats.totalTriangles > 1_000_000) warnings.push(`高面数: ${(stats.totalTriangles / 1_000_000).toFixed(1)}M — 建议生成 LOD`);
  if (stats.totalTexturePixels > 16_000_000) warnings.push(`贴图过大: ${(stats.totalTexturePixels / 1_000_000).toFixed(1)}MP — 建议压缩`);
  if (stats.boneCount > 0) warnings.push(`含骨骼动画: ${stats.boneCount} bones — 需 CPU 蒙皮`);
  if (stats.totalTriangles === 0 && stats.meshCount === 0) warnings.push('⚠ 未检测到可渲染几何体 — 可能导入失败');

  return stats;
}

/* ── 场景整体统计 ── */
export interface SceneSummary {
  modelCount: number;
  totalDrawCalls: number;
  totalTriangles: number;
  totalVertices: number;
  totalGPUMemMB: number;
  perModel: ModelStats[];
  worstOffender: ModelStats | null;
}

export function diagnoseScene(
  models: { group: THREE.Group; fileName?: string; fileSizeBytes?: number }[]
): SceneSummary {
  const perModel = models.map(m => diagnoseModel(m.group, m.fileName, m.fileSizeBytes));
  const worstOffender = perModel.reduce((worst, m) =>
    (!worst || m.totalTriangles > worst.totalTriangles) ? m : worst, null as ModelStats | null);

  return {
    modelCount: perModel.length,
    totalDrawCalls: perModel.reduce((s, m) => s + m.estimatedDrawCalls, 0),
    totalTriangles: perModel.reduce((s, m) => s + m.totalTriangles, 0),
    totalVertices: perModel.reduce((s, m) => s + m.totalVertices, 0),
    totalGPUMemMB: perModel.reduce((s, m) => s + m.estimatedGPUMemMB, 0),
    perModel,
    worstOffender,
  };
}
