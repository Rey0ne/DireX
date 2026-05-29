/* === ImageTools — crop, inpaint, relight, multi-angle modals === */
/* Each tool opens as a modal overlay on the canvas */

import { useState, useRef } from 'react';
import { Panel } from './shared';

// ─── Shared types ────────────────────────────────
interface ToolBaseProps {
  imageUrl?: string;
  onApply: (result: unknown) => void;
  onClose: () => void;
}

// ─── Crop Tool ─────────────────────────────────────
const CROP_RATIOS = [
  { label: '自由', w: 0, h: 0 },
  { label: '1:1', w: 1, h: 1 },
  { label: '4:3', w: 4, h: 3 },
  { label: '3:4', w: 3, h: 4 },
  { label: '16:9', w: 16, h: 9 },
  { label: '9:16', w: 9, h: 16 },
];

interface CropState {
  x: number; y: number; w: number; h: number;
}

export function CropTool({ imageUrl, onApply, onClose }: ToolBaseProps) {
  const [ratio, setRatio] = useState(CROP_RATIOS[0]);
  const [crop] = useState<CropState>({ x: 10, y: 10, w: 80, h: 80 });
  const [isDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const applyCrop = () => {
    onApply({ tool: 'crop', crop, ratio: ratio.label });
    onClose();
  };

  return (
    <ToolOverlay title="裁切" onClose={onClose}>
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Crop canvas */}
        <div ref={containerRef} style={{
          flex: 1,
          background: '#000',
          borderRadius: 'var(--tap-r-lg)',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '300px',
        }}>
          {imageUrl ? (
            <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.6 }} />
          ) : (
            <div style={{
              width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--tap-text-3)', fontSize: 'var(--tap-fs-meta)',
            }}>
              拖拽选择裁切区域
            </div>
          )}

          {/* Crop overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            clipPath: `polygon(
              0% 0%, 0% 100%, ${crop.x}% 100%, ${crop.x}% ${crop.y}%,
              ${crop.x + crop.w}% ${crop.y}%, ${crop.x + crop.w}% ${crop.y + crop.h}%,
              ${crop.x}% ${crop.y + crop.h}%, ${crop.x}% 100%,
              100% 100%, 100% 0%
            )`,
          }} />

          {/* Crop border */}
          <div style={{
            position: 'absolute',
            left: `${crop.x}%`, top: `${crop.y}%`,
            width: `${crop.w}%`, height: `${crop.h}%`,
            border: '2px solid rgba(255,255,255,0.8)',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}>
            {/* Corner handles */}
            {['nw', 'ne', 'sw', 'se'].map(corner => (
              <div key={corner} style={{
                position: 'absolute',
                width: '12px', height: '12px',
                background: '#fff',
                borderRadius: '50%',
                boxShadow: 'var(--tap-shadow-sm)',
                cursor: `${corner.includes('n') ? 'n' : 's'}${corner.includes('w') ? 'w' : 'e'}-resize`,
                top: corner.includes('n') ? '-6px' : undefined,
                bottom: corner.includes('s') ? '-6px' : undefined,
                left: corner.includes('w') ? '-6px' : undefined,
                right: corner.includes('e') ? '-6px' : undefined,
              }} />
            ))}
          </div>
        </div>

        {/* Ratio sidebar */}
        <div style={{ width: '100px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-3)', marginBottom: '4px', fontWeight: 600 }}>
            比例
          </div>
          {CROP_RATIOS.map(r => (
            <button
              key={r.label}
              onClick={() => setRatio(r)}
              style={{
                height: '32px', borderRadius: 'var(--tap-r-sm)',
                background: ratio.label === r.label ? 'var(--tap-active)' : 'transparent',
                color: ratio.label === r.label ? 'var(--tap-text-1)' : 'var(--tap-text-2)',
                fontSize: 'var(--tap-fs-meta)', cursor: 'pointer', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: `all var(--tap-dur-fast) var(--tap-ease)`,
              }}
              onMouseEnter={e => { if (ratio.label !== r.label) e.currentTarget.style.background = 'var(--tap-hover)'; }}
              onMouseLeave={e => { if (ratio.label !== r.label) e.currentTarget.style.background = 'transparent'; }}
            >
              {r.label}
            </button>
          ))}

          <div style={{ flex: 1 }} />
          <button onClick={applyCrop} style={applyBtnStyle}>应用裁切</button>
        </div>
      </div>
    </ToolOverlay>
  );
}

// ─── Inpaint / Erase Tool ──────────────────────────
export function InpaintTool({ imageUrl, onApply, onClose }: ToolBaseProps) {
  const [brushSize, setBrushSize] = useState(30);
  const [mode, setMode] = useState<'erase' | 'restore'>('erase');

  return (
    <ToolOverlay title="擦除 / 重绘" onClose={onClose}>
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Paint canvas */}
        <div style={{
          flex: 1,
          background: '#000',
          borderRadius: 'var(--tap-r-lg)',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '300px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {imageUrl ? (
            <img src={imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <span style={{ color: 'var(--tap-text-3)', fontSize: 'var(--tap-fs-meta)' }}>
              在图像上涂抹以创建遮罩
            </span>
          )}

          {/* Mask overlay hint */}
          <div style={{
            position: 'absolute', top: '12px', left: '12px',
            fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-text-3)',
            background: 'rgba(0,0,0,0.6)', borderRadius: 'var(--tap-r-sm)',
            padding: '4px 8px',
          }}>
            涂抹选择要{ mode === 'erase' ? '擦除' : '恢复' }的区域
          </div>
        </div>

        {/* Controls */}
        <div style={{ width: '120px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-3)', fontWeight: 600 }}>模式</div>
            <button
              onClick={() => setMode('erase')}
              style={{
                ...modeBtnStyle, background: mode === 'erase' ? 'var(--tap-active)' : 'transparent',
                color: mode === 'erase' ? 'var(--tap-text-1)' : 'var(--tap-text-2)',
              }}
            >◐ 擦除</button>
            <button
              onClick={() => setMode('restore')}
              style={{
                ...modeBtnStyle, background: mode === 'restore' ? 'var(--tap-active)' : 'transparent',
                color: mode === 'restore' ? 'var(--tap-text-1)' : 'var(--tap-text-2)',
              }}
            >↺ 恢复</button>
          </div>

          {/* Brush size */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-3)', fontWeight: 600 }}>
              画笔大小: {brushSize}px
            </div>
            <input
              type="range"
              min={5}
              max={150}
              value={brushSize}
              onChange={e => setBrushSize(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--tap-accent)' }}
            />
          </div>

          <div style={{ flex: 1 }} />
          <button onClick={() => { onApply({ tool: 'inpaint', brushSize, mode }); onClose(); }} style={applyBtnStyle}>
            应用擦除
          </button>
        </div>
      </div>
    </ToolOverlay>
  );
}

// ─── Relight Tool ──────────────────────────────────
const LIGHT_PRESETS = [
  { id: 'top', label: '顶光', icon: '↑', angle: 90 },
  { id: 'side', label: '侧光', icon: '→', angle: 0 },
  { id: 'bottom', label: '底光', icon: '↓', angle: -90 },
  { id: 'rim', label: '逆光', icon: '←', angle: 180 },
  { id: 'soft', label: '柔光', icon: '◈', angle: 45 },
  { id: 'neon', label: '霓虹', icon: '✦', angle: 30 },
];

const COLOR_TEMPS = [
  { label: '暖色', color: '#ffb74d' },
  { label: '中性', color: '#ffffff' },
  { label: '冷色', color: '#90caf9' },
  { label: '霓虹紫', color: '#ce93d8' },
  { label: '霓虹蓝', color: '#42a5f5' },
  { label: '金色', color: '#ffd54f' },
];

export function RelightTool({ imageUrl, onApply, onClose }: ToolBaseProps) {
  const [selectedPreset, setSelectedPreset] = useState(LIGHT_PRESETS[0].id);
  const [colorTemp, setColorTemp] = useState(COLOR_TEMPS[1].label);
  const [intensity, setIntensity] = useState(60);

  return (
    <ToolOverlay title="重打光" onClose={onClose}>
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Preview */}
        <div style={{
          flex: 1,
          background: '#000',
          borderRadius: 'var(--tap-r-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '300px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {imageUrl ? (
            <img src={imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <span style={{ color: 'var(--tap-text-3)', fontSize: 'var(--tap-fs-meta)' }}>预览区域</span>
          )}
          {/* Light direction indicator */}
          <div style={{
            position: 'absolute',
            top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80px', height: '80px',
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: colorTemp ? COLOR_TEMPS.find(c => c.label === colorTemp)?.color || '#fff' : '#fff',
              boxShadow: `0 0 20px ${colorTemp ? COLOR_TEMPS.find(c => c.label === colorTemp)?.color || '#fff' : '#fff'}80`,
            }} />
          </div>
        </div>

        {/* Controls */}
        <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Light direction */}
          <div>
            <div style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-3)', fontWeight: 600, marginBottom: '8px' }}>
              光源方向
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
              {LIGHT_PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPreset(p.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                    padding: '8px 4px', borderRadius: 'var(--tap-r-md)',
                    background: selectedPreset === p.id ? 'var(--tap-active)' : 'transparent',
                    border: selectedPreset === p.id ? '1px solid var(--tap-border-light)' : '1px solid transparent',
                    color: selectedPreset === p.id ? 'var(--tap-text-1)' : 'var(--tap-text-2)',
                    cursor: 'pointer', fontSize: 'var(--tap-fs-xs)',
                    transition: `all var(--tap-dur-fast) var(--tap-ease)`,
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color temp */}
          <div>
            <div style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-3)', fontWeight: 600, marginBottom: '8px' }}>
              色温
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {COLOR_TEMPS.map(ct => (
                <button
                  key={ct.label}
                  onClick={() => setColorTemp(ct.label)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '5px 8px', borderRadius: 'var(--tap-r-full)',
                    background: colorTemp === ct.label ? 'var(--tap-active)' : 'transparent',
                    border: colorTemp === ct.label ? '1px solid var(--tap-border-light)' : '1px solid transparent',
                    color: colorTemp === ct.label ? 'var(--tap-text-1)' : 'var(--tap-text-2)',
                    cursor: 'pointer', fontSize: 'var(--tap-fs-xs)',
                    transition: `all var(--tap-dur-fast) var(--tap-ease)`,
                  }}
                >
                  <span style={{
                    width: '10px', height: '10px', borderRadius: '50%',
                    background: ct.color, flexShrink: 0,
                  }} />
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          {/* Intensity */}
          <div>
            <div style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-3)', fontWeight: 600, marginBottom: '8px' }}>
              强度: {intensity}%
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={intensity}
              onChange={e => setIntensity(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--tap-accent)' }}
            />
          </div>

          <div style={{ flex: 1 }} />
          <button
            onClick={() => onApply({ tool: 'relight', preset: selectedPreset, colorTemp, intensity })}
            style={applyBtnStyle}
          >
            应用打光
          </button>
        </div>
      </div>
    </ToolOverlay>
  );
}

// ─── Multi-Angle Tool ──────────────────────────────
const ANGLE_PRESETS = [
  { id: 'front', label: '正面', icon: '👤', desc: '正前方视角' },
  { id: 'side', label: '侧面', icon: '👤', desc: '左侧45°' },
  { id: 'back', label: '背面', icon: '👤', desc: '正后方视角' },
  { id: 'top', label: '俯视', icon: '🔽', desc: '自上而下' },
  { id: 'bottom', label: '仰视', icon: '🔼', desc: '自下而上' },
  { id: 'isometric', label: '等轴侧', icon: '💎', desc: '30°等轴侧' },
  { id: 'closeup', label: '特写', icon: '🔍', desc: '局部特写' },
  { id: 'wide', label: '广角', icon: '🌐', desc: '超广角视野' },
];

export function MultiAngleTool({ imageUrl, onApply, onClose }: ToolBaseProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [count, setCount] = useState(4);

  const toggleAngle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <ToolOverlay title="多角度生成" onClose={onClose}>
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Preview */}
        <div style={{
          flex: 1,
          background: '#000',
          borderRadius: 'var(--tap-r-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '300px',
        }}>
          {imageUrl ? (
            <img src={imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 'var(--tap-r-md)' }} />
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--tap-text-3)' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔄</div>
              <div style={{ fontSize: 'var(--tap-fs-body)' }}>选择视角生成多角度图像</div>
              <div style={{ fontSize: 'var(--tap-fs-xs)', marginTop: '4px', color: 'var(--tap-text-4)' }}>
                已选 {selected.length} 个视角
              </div>
            </div>
          )}
        </div>

        {/* Angle grid */}
        <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-3)', fontWeight: 600,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>视角预设</span>
            <span style={{ fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-text-4)' }}>
              {selected.length}/{ANGLE_PRESETS.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
            {ANGLE_PRESETS.map(angle => (
              <button
                key={angle.id}
                onClick={() => toggleAngle(angle.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px', borderRadius: 'var(--tap-r-md)',
                  background: selected.includes(angle.id) ? 'var(--tap-accent-bg)' : 'transparent',
                  border: selected.includes(angle.id) ? '1px solid var(--tap-accent-border)' : '1px solid var(--tap-border)',
                  color: selected.includes(angle.id) ? 'var(--tap-accent)' : 'var(--tap-text-2)',
                  cursor: 'pointer', textAlign: 'left',
                  transition: `all var(--tap-dur-fast) var(--tap-ease)`,
                }}
              >
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{angle.icon}</span>
                <div>
                  <div style={{ fontSize: 'var(--tap-fs-body)', fontWeight: 500 }}>{angle.label}</div>
                  <div style={{ fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-text-3)' }}>{angle.desc}</div>
                </div>
                {selected.includes(angle.id) && (
                  <span style={{ marginLeft: 'auto', color: 'var(--tap-accent)', fontSize: '14px' }}>✓</span>
                )}
              </button>
            ))}
          </div>

          {/* Batch count */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-3)' }}>每视角数量</span>
            <div style={{ display: 'flex', gap: '2px' }}>
              {[1, 2, 4, 6].map(n => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  style={{
                    width: '28px', height: '28px', borderRadius: 'var(--tap-r-sm)',
                    background: count === n ? 'var(--tap-active)' : 'transparent',
                    color: count === n ? 'var(--tap-text-1)' : 'var(--tap-text-2)',
                    fontSize: 'var(--tap-fs-xs)', cursor: 'pointer', border: 'none',
                  }}
                >
                  {n}x
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onApply({ tool: 'multiAngle', angles: selected, count })}
            disabled={selected.length === 0}
            style={{
              ...applyBtnStyle,
              opacity: selected.length === 0 ? 0.4 : 1,
              cursor: selected.length === 0 ? 'default' : 'pointer',
            }}
          >
            生成 {selected.length * count} 张
          </button>
        </div>
      </div>
    </ToolOverlay>
  );
}

// ─── Shared ToolOverlay ────────────────────────────
function ToolOverlay({ title, children, onClose }: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99990,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'tap-fade-in var(--tap-dur-fast) var(--tap-ease)',
    }}>
      <Panel style={{
        width: '800px',
        height: '520px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--tap-divider)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 'var(--tap-fs-h2)', fontWeight: 'var(--tap-fw-h2)', color: 'var(--tap-text-1)' }}>
            {title}
          </span>
          <button onClick={onClose} style={{
            width: 'var(--tap-btn-size-sm)', height: 'var(--tap-btn-size-sm)',
            borderRadius: 'var(--tap-r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--tap-text-3)', fontSize: '18px', cursor: 'pointer',
            transition: `all var(--tap-dur-fast) var(--tap-ease)`, border: 'none', background: 'transparent',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--tap-hover)'; e.currentTarget.style.color = 'var(--tap-text-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tap-text-3)'; }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
          {children}
        </div>
      </Panel>
    </div>
  );
}

// ─── Shared styles ─────────────────────────────────
const applyBtnStyle: React.CSSProperties = {
  width: '100%',
  height: '36px',
  borderRadius: 'var(--tap-r-md)',
  background: 'var(--tap-accent)',
  color: '#fff',
  fontSize: 'var(--tap-fs-body)',
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: `all var(--tap-dur-fast) var(--tap-ease)`,
  flexShrink: 0,
};

const modeBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
  height: '32px', padding: '0 10px', borderRadius: 'var(--tap-r-sm)',
  fontSize: 'var(--tap-fs-meta)', cursor: 'pointer', border: 'none',
  transition: `all var(--tap-dur-fast) var(--tap-ease)`,
};
