/* === LightingPanel — 右侧灯光面板 (180px) === */
import React from 'react';
import { LIGHTING_PRESETS, type LightPresetId, type CinematicLightingState } from '../../data/lightingPresets';

interface Props {
  state: CinematicLightingState;
  onPresetSelect: (id: LightPresetId) => void;
}

function SectionLabel({ title }: { title: string }) {
  return (
    <div style={{
      fontSize: 9,
      color: 'rgba(255,255,255,0.25)',
      textTransform: 'uppercase',
      letterSpacing: '0.05em',
      marginBottom: 2,
      width: '100%',
      textAlign: 'center',
    }}>
      {title}
    </div>
  );
}

function Divider() {
  return <div style={{ width: '70%', height: 1, background: 'rgba(255,255,255,0.06)', margin: '6px 0' }} />;
}

function PresetButton({ preset, active, onClick }: { preset: { id: string; label: string; description: string }; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '5px 8px',
        borderRadius: 6,
        border: active ? '1px solid rgba(94,234,212,0.35)' : '1px solid rgba(255,255,255,0.06)',
        background: active ? 'rgba(94,234,212,0.08)' : 'rgba(255,255,255,0.02)',
        color: active ? '#5EEAD4' : 'rgba(255,255,255,0.45)',
        cursor: 'pointer',
        fontSize: 10,
        fontWeight: active ? 600 : 400,
        textAlign: 'left',
        transition: 'all 0.15s',
      }}
      title={preset.description}
    >
      {preset.label}
    </button>
  );
}

function StatLabel({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 9, color: 'rgba(255,255,255,0.4)', padding: '1px 0' }}>
      <span>{label}</span>
      <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.6)' }}>{value}</span>
    </div>
  );
}

export function LightingPanel({ state, onPresetSelect }: Props) {
  const presets = Object.values(LIGHTING_PRESETS);

  return (
    <div style={{
      width: 180,
      display: 'flex',
      flexDirection: 'column',
      gap: 3,
      padding: '10px 7px',
      borderLeft: '1px solid rgba(255,255,255,0.06)',
      overflowY: 'auto',
      flexShrink: 0,
      alignItems: 'center',
      background: 'rgba(0,0,0,0.2)',
    }}>
      {/* ═══ 预设按钮 ═══ */}
      <SectionLabel title="💡 灯光预设" />
      {presets.map(p => (
        <PresetButton
          key={p.id}
          preset={p}
          active={state.activePreset === p.id}
          onClick={() => onPresetSelect(p.id)}
        />
      ))}

      <Divider />

      {/* ═══ 当前主光信息 ═══ */}
      <SectionLabel title="☀ 当前主光" />
      {state.directional ? (
        <>
          <StatLabel label="方位" value={`${state.directional.azimuth}°`} />
          <StatLabel label="仰角" value={`${state.directional.elevation}°`} />
          <StatLabel label="强度" value={state.directional.intensity.toFixed(1)} />
          <StatLabel label="阴影" value={state.directional.castShadow ? '开' : '关'} />
        </>
      ) : (
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', padding: 2 }}>无主光</div>
      )}

      {state.point && (
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 2, width: '100%', textAlign: 'center' }}>
          💡 点光源 · {state.point.color}
        </div>
      )}
      {state.spot && (
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', marginTop: 1, width: '100%', textAlign: 'center' }}>
          🔦 聚光灯 · {state.spot.color}
        </div>
      )}

      <Divider />

      {/* ═══ 环境 ═══ */}
      <SectionLabel title="🌐 环境" />
      <StatLabel label="HDRI" value={state.environment.preset} />
      <StatLabel label="强度" value={state.environment.intensity.toFixed(2)} />

      <Divider />

      {/* ═══ 曝光 ═══ */}
      <SectionLabel title="◉ 曝光" />
      <StatLabel label="值" value={state.exposure.toFixed(2)} />
      <StatLabel label="映射" value={state.toneMapping} />
    </div>
  );
}
