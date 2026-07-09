/* === ZoomSlider — horizontal zoom scrubber below minimap === */
/* Slider -100..100 → zoom 1%..500%, controls ReactFlow viewport directly */

import { useCallback, useState } from 'react';
import { useReactFlow } from '@xyflow/react';

interface ZoomSliderProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  snapEnabled: boolean;
  onSnapToggle: () => void;
}

const ZOOM_MIN = 0.01;
const ZOOM_MAX = 5.0;
const ZOOM_MID = 1.0;

export function ZoomSlider({ zoom, onZoomChange, snapEnabled, onSnapToggle }: ZoomSliderProps) {
  const { fitView, setViewport, getViewport } = useReactFlow();
  const [hover, setHover] = useState(false);

  const applyZoom = useCallback((newZoom: number) => {
    const clamped = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, newZoom));
    const vp = getViewport();
    setViewport({ x: vp.x, y: vp.y, zoom: clamped });
    onZoomChange(clamped);
  }, [getViewport, setViewport, onZoomChange]);

  const sliderToZoom = (val: number) => {
    if (val <= 0) return ZOOM_MID + (val / 100) * (ZOOM_MID - ZOOM_MIN);
    return ZOOM_MID + (val / 100) * (ZOOM_MAX - ZOOM_MID);
  };

  const zoomToSlider = (z: number) => {
    if (z <= ZOOM_MID) return Math.round(((z - ZOOM_MID) / (ZOOM_MID - ZOOM_MIN)) * 100);
    return Math.round(((z - ZOOM_MID) / (ZOOM_MAX - ZOOM_MID)) * 100);
  };

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    applyZoom(sliderToZoom(parseFloat(e.target.value)));
  }, [applyZoom]);

  const pct = Math.round(zoom * 100);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '5px 10px',
        background: hover ? 'var(--tap-panel)' : 'var(--tap-panel)',
        border: '1px solid var(--tap-border-light)',
        borderRadius: 'var(--tap-r-sm)',
        backdropFilter: 'blur(12px)',
        transition: `all var(--tap-dur-fast) var(--tap-ease)`,
        boxShadow: 'var(--tap-shadow-sm)',
        userSelect: 'none',
        width: '260px',
      }}
    >
      {/* Snap toggle */}
      <button onClick={onSnapToggle} title={snapEnabled ? '关闭网格吸附' : '开启网格吸附'}
        style={{
          ...stepBtnStyle,
          color: snapEnabled ? 'var(--tap-accent)' : '#1B1B1B',
          fontSize: '15px',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--tap-hover)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >#</button>

      <button onClick={() => applyZoom(zoom - 0.15)} title="缩小" style={stepBtnStyle}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--tap-hover)'; e.currentTarget.style.color = '#1B1B1B'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#1B1B1B'; }}
      >−</button>

      <div style={{ flex: 1, height: '20px', display: 'flex', alignItems: 'center' }}>
        <input type="range" min={-100} max={100} value={zoomToSlider(zoom)} onChange={handleChange}
          style={{
            width: '100%', height: '4px',
            WebkitAppearance: 'none', appearance: 'none',
            background: 'rgba(255,255,255,0.12)', borderRadius: '2px',
            outline: 'none', cursor: 'pointer',
          }}
        />
        <style>{`
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none; width: 12px; height: 12px;
            border-radius: 50%; background: #1B1B1B; border: none;
            cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.25);
          }
        `}</style>
      </div>

      <button onClick={() => applyZoom(zoom + 0.15)} title="放大" style={stepBtnStyle}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--tap-hover)'; e.currentTarget.style.color = '#1B1B1B'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#1B1B1B'; }}
      >+</button>

      <span style={{ fontSize: 'var(--tap-fs-meta)', color: '#1B1B1B', flexShrink: 0, minWidth: '28px', textAlign: 'center' }}>{pct}%</span>

      <button onClick={() => fitView({ padding: 0.3, duration: 300 })} title="全局预览所有节点"
        style={{
          width: '18px', height: '18px', borderRadius: '4px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', color: '#1B1B1B', background: 'transparent',
          border: 'none', cursor: 'pointer', flexShrink: 0,
          transition: `all var(--tap-dur-fast) var(--tap-ease)`,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--tap-hover)'; e.currentTarget.style.color = '#1B1B1B'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#1B1B1B'; }}
      >⌂</button>
    </div>
  );
}

const stepBtnStyle: React.CSSProperties = {
  width: '16px', height: '16px', borderRadius: '3px',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: '13px', fontWeight: 700,
  color: '#1B1B1B', background: 'transparent',
  border: 'none', cursor: 'pointer', flexShrink: 0,
  transition: `all var(--tap-dur-fast) var(--tap-ease)`,
};
