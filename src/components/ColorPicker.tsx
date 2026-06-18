/* === ColorPicker — PS style hue/SV selector === */
import { useState, useRef, useEffect, useCallback } from 'react';

interface ColorPickerProps {
  initialColor: string;
  onConfirm: (hex: string) => void;
  onClose: () => void;
}

function hexToHsv(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, max === 0 ? 0 : d / max, max];
}

function hsvToHex(h: number, s: number, v: number): string {
  const i = Math.floor(h / 60) % 6;
  const f = h / 60 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0, g = 0, b = 0;
  switch (i) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  const toHex = (n: number) => Math.round(n * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function ColorPicker({ initialColor, onConfirm, onClose }: ColorPickerProps) {
  const [hsv, setHsv] = useState(() => hexToHsv(initialColor));
  const [hex, setHex] = useState(initialColor);
  const svRef = useRef<HTMLDivElement>(null);

  const updateFromSV = useCallback((e: React.MouseEvent) => {
    const rect = svRef.current!.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    const newHex = hsvToHex(hsv[0], x, y);
    setHsv([hsv[0], x, y]);
    setHex(newHex);
  }, [hsv]);

  const updateHue = useCallback((e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = Math.max(0, Math.min(360, ((e.clientX - rect.left) / rect.width) * 360));
    const newHex = hsvToHex(x, hsv[1], hsv[2]);
    setHsv([x, hsv[1], hsv[2]]);
    setHex(newHex);
  }, [hsv]);

  const handleHexInput = (value: string) => {
    setHex(value);
    if (/^#[0-9a-fA-F]{6}$/.test(value)) {
      setHsv(hexToHsv(value));
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        width: 280, padding: 16, borderRadius: 12,
        background: 'rgba(24,26,30,0.97)', border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', gap: 12,
      }} onClick={e => e.stopPropagation()}>
        {/* SV square */}
        <div ref={svRef} onMouseDown={e => { updateFromSV(e);
          const mv = (me: MouseEvent) => updateFromSV(me as any);
          const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
          window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
        }} style={{
          width: '100%', height: 180, borderRadius: 6, cursor: 'crosshair', position: 'relative',
          background: `linear-gradient(to right, #fff, hsl(${hsv[0]},100%,50%))`,
        }}>
          {/* Vertical gradient: white at top, black at bottom */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: 6,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,1))' }} />
          {/* SV cursor */}
          <div style={{
            position: 'absolute',
            left: `${hsv[1] * 100}%`, top: `${(1 - hsv[2]) * 100}%`,
            width: 14, height: 14, borderRadius: '50%',
            border: '2px solid #fff', boxShadow: '0 0 4px rgba(0,0,0,0.5)',
            transform: 'translate(-50%,-50%)', pointerEvents: 'none',
            background: hex,
          }} />
        </div>

        {/* Hue bar */}
        <div onMouseDown={e => { updateHue(e);
          const mv = (me: MouseEvent) => updateHue(me as any);
          const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
          window.addEventListener('mousemove', mv); window.addEventListener('mouseup', up);
        }} style={{
          width: '100%', height: 14, borderRadius: 7, cursor: 'pointer', position: 'relative',
          background: 'linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
        }}>
          <div style={{
            position: 'absolute', left: `${(hsv[0] / 360) * 100}%`, top: -2,
            width: 18, height: 18, borderRadius: '50%',
            border: '2px solid #fff', boxShadow: '0 0 4px rgba(0,0,0,0.5)',
            transform: 'translateX(-50%)', pointerEvents: 'none',
          }} />
        </div>

        {/* Preview + Hex input */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: 6, background: hex, border: '1px solid rgba(255,255,255,0.1)' }} />
          <input value={hex} onChange={e => handleHexInput(e.target.value)}
            style={{
              flex: 1, padding: '6px 10px', borderRadius: 6,
              background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', fontSize: 13, fontFamily: 'monospace', outline: 'none',
            }} />
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)', color: '#ccc', cursor: 'pointer', fontSize: 12,
          }}>取消</button>
          <button onClick={() => { onConfirm(hex); onClose(); }} style={{
            padding: '8px 24px', borderRadius: 6, border: 'none',
            background: '#5EEAD4', color: '#000', cursor: 'pointer', fontSize: 12, fontWeight: 700,
          }}>确认</button>
        </div>
      </div>
    </div>
  );
}
