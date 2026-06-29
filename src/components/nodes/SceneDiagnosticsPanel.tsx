/* === SceneStatsPanel — 场景诊断面板 UI === */
import type { ModelStats, SceneSummary } from './SceneDiagnostics';

const BAR_COLORS = { ok: '#44cc88', warn: '#ccaa44', bad: '#cc4444' };

function StatRow({ label, value, unit, warn }: { label: string; value: string | number; unit?: string; warn?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', fontSize: 9, width:'100%', color: warn ? BAR_COLORS.warn : 'rgba(255,255,255,0.6)' }}>
      <span>{label}</span>
      <span style={{ fontWeight: 600 }}>{typeof value === 'number' ? value.toLocaleString() : value}{unit || ''}</span>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 6, marginBottom: 2, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 4 }}>{title}</div>;
}

export function ModelDiagnosticsPanel({ stats }: { stats: ModelStats }) {
  return (
    <div style={{ padding: '4px 0', width:'100%' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', marginBottom: 4, wordBreak: 'break-all' }}>
        📊 {stats.fileName}
      </div>
      {stats.fileSizeMB > 0 && (
        <StatRow label="文件大小" value={stats.fileSizeMB.toFixed(1)} unit=" MB" />
      )}

      <SectionHeader title="几何" />
      <StatRow label="Mesh 数" value={stats.meshCount} />
      <StatRow label="顶点" value={stats.totalVertices} />
      <StatRow label="三角面" value={stats.totalTriangles} warn={stats.totalTriangles > 1_000_000} />
      {stats.boneCount > 0 && <StatRow label="骨骼" value={stats.boneCount} />}

      <SectionHeader title="材质 & 贴图" />
      <StatRow label="材质" value={stats.materialCount} warn={stats.materialCount > 20} />
      <StatRow label="贴图" value={stats.textureCount} />
      {stats.totalTexturePixels > 0 && (
        <StatRow label="贴图像素" value={(stats.totalTexturePixels / 1_000_000).toFixed(1)} unit=" MP" warn={stats.totalTexturePixels > 16_000_000} />
      )}

      <SectionHeader title="性能" />
      <StatRow label="Draw Call" value={stats.estimatedDrawCalls} warn={stats.estimatedDrawCalls > 10} />
      <StatRow label="GPU 内存" value={stats.estimatedGPUMemMB.toFixed(1)} unit=" MB" warn={stats.estimatedGPUMemMB > 200} />

      {stats.hasAnimations && (
        <SectionHeader title="动画" />
      )}
      {stats.hasAnimations && <StatRow label="动画数" value={stats.animationCount} />}

      {stats.warnings.length > 0 && (
        <div style={{ marginTop: 6 }}>
          {stats.warnings.map((w, i) => (
            <div key={i} style={{ fontSize: 8, color: BAR_COLORS.warn, background: 'rgba(200,160,0,0.08)', padding: '2px 4px', borderRadius: 3, marginBottom: 2 }}>
              ⚠ {w}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SceneSummaryPanel({ summary }: { summary: SceneSummary }) {
  return (
    <div style={{ padding: '4px 0', width:'100%' }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#5EEAD4', marginBottom: 4 }}>🎬 场景总览</div>
      <StatRow label="模型数" value={summary.modelCount} />
      <StatRow label="总 DrawCall" value={summary.totalDrawCalls} warn={summary.totalDrawCalls > 50} />
      <StatRow label="总三角面" value={(summary.totalTriangles / 1_000_000).toFixed(2)} unit=" M" warn={summary.totalTriangles > 5_000_000} />
      <StatRow label="GPU 内存" value={summary.totalGPUMemMB.toFixed(0)} unit=" MB" warn={summary.totalGPUMemMB > 500} />

      {summary.worstOffender && (
        <div style={{ marginTop: 4, padding: '4px 6px', background: 'rgba(200,60,60,0.06)', borderRadius: 4, border: '1px solid rgba(200,60,60,0.15)' }}>
          <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.25)' }}>最重模型</div>
          <div style={{ fontSize: 9, color: BAR_COLORS.bad, fontWeight: 600 }}>
            {summary.worstOffender.fileName} — {(summary.worstOffender.totalTriangles / 1_000_000).toFixed(1)}M 面 / {summary.worstOffender.estimatedDrawCalls} DC
          </div>
        </div>
      )}
    </div>
  );
}
