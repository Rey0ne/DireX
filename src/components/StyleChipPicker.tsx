/* === StyleChipPicker — visual style preset selector === */
/* Categories: film, photography, anime, illustration, concept art */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Panel } from './shared';

export interface StylePreset {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  color: string;
}

const STYLE_CATEGORIES_INTERNAL = [
  {
    name: '电影感',
    icon: '🎬',
    styles: [
      { id: 'cinematic', name: '电影质感', icon: '🎥', description: '好莱坞电影级调色与布光', color: '#e8a850' },
      { id: 'noir', name: '黑色电影', icon: '🕶️', description: '高对比度、低调光、阴影浓重', color: '#888888' },
      { id: 'scifi', name: '科幻风格', icon: '🚀', description: '赛博朋克、霓虹灯、冷调金属', color: '#50c8e8' },
      { id: 'period', name: '年代剧', icon: '📜', description: '复古色调、胶片颗粒感', color: '#c8a878' },
    ],
  },
  {
    name: '摄影',
    icon: '📷',
    styles: [
      { id: 'portrait', name: '人像摄影', icon: '👤', description: '柔光、浅景深、肤色优化', color: '#e89090' },
      { id: 'landscape', name: '风光摄影', icon: '🏔️', description: '广角、高动态范围、自然色彩', color: '#90c878' },
      { id: 'macro', name: '微距摄影', icon: '🔍', description: '极浅景深、细节突出', color: '#90e878' },
      { id: 'street', name: '街头摄影', icon: '🚶', description: '抓拍感、自然光、颗粒', color: '#c8c8a0' },
    ],
  },
  {
    name: '动画/二次元',
    icon: '🎨',
    styles: [
      { id: 'anime', name: '日式动画', icon: '🌸', description: '赛璐璐风格、干净线条', color: '#e890c8' },
      { id: 'ghibli', name: '吉卜力风', icon: '🌿', description: '柔和手绘、自然色调', color: '#90d8a0' },
      { id: '3dcg', name: '3D CG', icon: '💎', description: 'PBR材质、次表面散射', color: '#8090e8' },
      { id: 'pixel', name: '像素艺术', icon: '👾', description: '复古像素、有限色板', color: '#e0c870' },
    ],
  },
  {
    name: '概念艺术',
    icon: '🖌️',
    styles: [
      { id: 'matte', name: 'Matte Painting', icon: '🏙️', description: '遮罩绘画、宏大场景', color: '#7098c8' },
      { id: 'sketch', name: '速写概念', icon: '✏️', description: '线稿风格、快速表达', color: '#c0c0c0' },
      { id: 'oil', name: '油画风格', icon: '🖼️', description: '厚涂笔触、纹理丰富', color: '#c89060' },
      { id: 'watercolor', name: '水彩风格', icon: '🎨', description: '透明感、柔和渐变', color: '#90c0e0' },
    ],
  },
] as const;

// Map to include category in each style
const STYLE_CATEGORIES = STYLE_CATEGORIES_INTERNAL.map(cat => ({
  ...cat,
  styles: cat.styles.map(s => ({ ...s, category: cat.name })),
}));

interface StyleChipPickerProps {
  selectedStyle: string | null;
  onSelect: (style: StylePreset) => void;
  onClose: () => void;
  anchorRect?: DOMRect | null; // portal to body, positioned above the trigger
}

export function StyleChipPicker({ selectedStyle, onSelect, onClose, anchorRect }: StyleChipPickerProps) {
  const [activeCat, setActiveCat] = useState<string>(STYLE_CATEGORIES[0].name);

  const activeStyles = STYLE_CATEGORIES.find(c => c.name === activeCat)?.styles || [];

  const panelStyle: React.CSSProperties = anchorRect
    ? {
        position: 'fixed',
        bottom: window.innerHeight - anchorRect.top + 8, // above the trigger
        left: anchorRect.left,
      }
    : {
        position: 'absolute',
        bottom: '100%',
        left: 0,
        marginBottom: '8px',
      };

  const panel = (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 499 }} />
      <Panel style={{
        ...panelStyle,
        width: '360px',
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 500,
        animation: 'tap-fade-up var(--tap-dur-fast) var(--tap-ease)',
      }}>
        {/* Category tabs */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
          {STYLE_CATEGORIES.map(cat => (
            <button
              key={cat.name}
              onClick={() => setActiveCat(cat.name)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '6px 10px',
                borderRadius: 'var(--tap-r-full)',
                fontSize: 'var(--tap-fs-meta)',
                fontWeight: activeCat === cat.name ? 600 : 400,
                color: activeCat === cat.name ? 'var(--tap-text-1)' : 'var(--tap-text-3)',
                background: activeCat === cat.name ? 'var(--tap-active)' : 'transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: `all var(--tap-dur-fast) var(--tap-ease)`,
                border: 'none',
              }}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        <div style={{ height: '1px', background: 'var(--tap-divider)', margin: '0 -4px' }} />

        {/* Style grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {activeStyles.map(style => (
            <button
              key={style.id}
              onClick={() => onSelect(style)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '10px 12px',
                borderRadius: 'var(--tap-r-lg)',
                background: selectedStyle === style.id ? 'var(--tap-active)' : 'var(--tap-bg-glass)',
                border: selectedStyle === style.id
                  ? `1px solid ${style.color}40`
                  : '1px solid var(--tap-border)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: `all var(--tap-dur-fast) var(--tap-ease)`,
              }}
            >
              <span style={{
                width: '36px', height: '36px', borderRadius: 'var(--tap-r-md)',
                background: `${style.color}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', flexShrink: 0,
              }}>
                {style.icon}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 'var(--tap-fs-body)', fontWeight: 500, color: 'var(--tap-text-1)', marginBottom: '2px' }}>
                  {style.name}
                </div>
                <div style={{ fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-text-3)', lineHeight: 1.3 }}>
                  {style.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </Panel>
    </>
  );

  return anchorRect ? createPortal(panel, document.body) : panel;
}

// Re-export for convenience
export { STYLE_CATEGORIES };
