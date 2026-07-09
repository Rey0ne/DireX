/* === LeftToolbar — vertical canvas toolbar === */
/* Borderless, subtle icons that raise on hover */

import { useState } from 'react';

export type ToolMode = 'select' | 'crop' | 'inpaint' | 'relight' | 'multiAngle' | 'annotate' | 'expand' | 'extract' | 'enhance';

interface ToolDef {
  id: ToolMode;
  icon: string;
  label: string;
  shortcut: string;
  divider?: boolean;
}

const TOOLS: ToolDef[] = [
  { id: 'crop', icon: 'crop-svg', label: '裁切', shortcut: 'C' },
  { id: 'inpaint', icon: '◐', label: '擦除 / 重绘', shortcut: 'B' },
  { id: 'relight', icon: 'relight-svg', label: '重打光', shortcut: 'L' },
  { id: 'multiAngle', icon: 'multiangle-svg', label: '多角度', shortcut: 'A' },
  { id: 'expand', icon: '↕', label: '扩图', shortcut: 'E', divider: true },
  { id: 'extract', icon: '◌', label: '抠图', shortcut: 'X' },
  { id: 'enhance', icon: '◇', label: '画质增强', shortcut: 'U' },
  { id: 'annotate', icon: '⊕', label: '标注', shortcut: 'N' },
];

interface LeftToolbarProps {
  activeTool: ToolMode | null;
  onToolSelect: (tool: ToolMode) => void;
}

export function LeftToolbar({ activeTool, onToolSelect }: LeftToolbarProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Filter out dividers for flat index
  const flatTools = TOOLS.filter(() => true);

  return (
    <div style={{
      position: 'fixed',
      left: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      animation: 'tap-fade-in var(--tap-dur-slow) var(--tap-ease)',
    }}>
      {TOOLS.map((tool) => {
        const idx = flatTools.indexOf(tool);
        const d = hoveredIdx !== null ? idx - hoveredIdx : 999;
        const ad = Math.abs(d);
        const sign = d < 0 ? -1 : d > 0 ? 1 : 0;
        const sc = ad === 0 ? 1.38 : ad === 1 ? 1.10 : 1;
        const tx = ad === 0 ? 14 : 0;
        const ty = ad === 1 ? sign * 10 : ad === 2 ? sign * 4 : 0;

        return (
          <div key={tool.id} style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            <button
              onClick={() => onToolSelect(tool.id)}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              style={{
                width: '36px', height: '36px', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', flexShrink: 0,
                color: '#fff',
                background: activeTool === tool.id ? 'rgba(0,207,255,0.95)' : 'rgba(0,207,255,0.85)',
                border: 'none',
                cursor: 'pointer',
                transform: `translateX(${tx}px) translateY(${ty}px) scale(${sc})`,
                transformOrigin: 'left center',
                transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease',
                backdropFilter: 'blur(12px)',
                boxShadow: activeTool === tool.id
                  ? '0 3px 12px rgba(0,207,255,0.40)'
                  : '0 2px 8px rgba(0,0,0,0.25)',
                position: 'relative',
              }}
            >
              {tool.icon === 'crop-svg' ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                  stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                  <path d="M18 22V8a2 2 0 0 0-2-2H2" />
                </svg>
              ) : tool.icon === 'relight-svg' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="#fff" strokeWidth="1.1">
                  <circle cx="12" cy="13" r="7" />
                  <ellipse cx="12" cy="13" rx="11" ry="3.5" transform="rotate(-25 12 13)" />
                </svg>
              ) : tool.icon === 'multiangle-svg' ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                  stroke="#fff" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
                  <g transform="rotate(45, 12, 11)">
                    <polygon points="12,4 18,7.5 18,14.5 12,18 6,14.5 6,7.5" />
                    <line x1="12" y1="11" x2="6" y2="7.5" />
                    <line x1="12" y1="11" x2="12" y2="4" />
                    <line x1="12" y1="11" x2="18" y2="7.5" />
                  </g>
                  <path d="M20 9 A5 5 0 0 1 20 16" />
                  <polyline points="18,14 20,16 22,13.5" fill="none" />
                </svg>
              ) : (
                tool.icon
              )}
            </button>
            <span style={{
              fontSize: '11px', color: '#000',
              whiteSpace: 'nowrap', userSelect: 'none',
              opacity: idx === hoveredIdx ? 1 : 0,
              transform: `translateX(${tx}px)`,
              transition: 'opacity 0.15s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>{tool.label}</span>
          </div>
        );
      })}
    </div>
  );
}
