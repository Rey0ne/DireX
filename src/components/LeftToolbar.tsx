/* === LeftToolbar — vertical canvas toolbar === */
/* Borderless, subtle icons that raise on hover */

import { useState } from 'react';
import { Tooltip } from './shared';

export type ToolMode = 'select' | 'crop' | 'inpaint' | 'relight' | 'multiAngle' | 'annotate' | 'expand' | 'extract' | 'enhance';

interface ToolDef {
  id: ToolMode;
  icon: string;
  label: string;
  shortcut: string;
  divider?: boolean;
}

const TOOLS: ToolDef[] = [
  { id: 'select', icon: '⇱', label: '选择 / 移动', shortcut: 'V' },
  { id: 'crop', icon: 'crop-svg', label: '裁切', shortcut: 'C', divider: true },
  { id: 'inpaint', icon: '◐', label: '擦除 / 重绘', shortcut: 'B' },
  { id: 'relight', icon: 'relight-svg', label: '重打光', shortcut: 'L' },
  { id: 'multiAngle', icon: '⊿', label: '多角度', shortcut: 'A' },
  { id: 'expand', icon: '↕', label: '扩图', shortcut: 'E', divider: true },
  { id: 'extract', icon: '◌', label: '抠图', shortcut: 'X' },
  { id: 'enhance', icon: '◇', label: '画质增强', shortcut: 'U' },
  { id: 'annotate', icon: '⊕', label: '标注', shortcut: 'N', divider: true },
];

interface LeftToolbarProps {
  activeTool: ToolMode | null;
  onToolSelect: (tool: ToolMode) => void;
}

export function LeftToolbar({ activeTool, onToolSelect }: LeftToolbarProps) {
  const [hoveredTool, setHoveredTool] = useState<ToolMode | null>(null);

  return (
    <div style={{
      position: 'fixed',
      left: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      gap: '3px',
      padding: '6px',
      background: 'rgba(18,22,28,0.85)',
      borderRadius: '12px',
      backdropFilter: 'blur(16px)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      border: 'none',
      animation: 'tap-fade-in var(--tap-dur-slow) var(--tap-ease)',
    }}>
      {TOOLS.map(tool => (
        <div key={tool.id}>
          {tool.divider && <div style={{
            height: '1px',
            background: 'rgba(255,255,255,0.06)',
            margin: '5px 10px',
          }} />}
          <Tooltip label={tool.label} shortcut={tool.shortcut}>
            <button
              onClick={() => onToolSelect(tool.id)}
              onMouseEnter={() => setHoveredTool(tool.id)}
              onMouseLeave={() => setHoveredTool(null)}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--tap-r-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                color: activeTool === tool.id
                  ? 'var(--tap-accent)'
                  : hoveredTool === tool.id
                    ? 'var(--tap-text-1)'
                    : 'var(--tap-text-3)',
                background: activeTool === tool.id
                  ? 'var(--tap-accent-bg)'
                  : hoveredTool === tool.id
                    ? 'rgba(255,255,255,0.08)'
                    : 'transparent',
                border: 'none',
                transition: `all var(--tap-dur-fast) var(--tap-ease)`,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {tool.icon === 'crop-svg' ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none"
                  stroke={activeTool === tool.id ? 'var(--tap-accent)' : hoveredTool === tool.id ? 'var(--tap-text-1)' : 'var(--tap-text-3)'}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 2v14a2 2 0 0 0 2 2h14" />
                  <path d="M18 22V8a2 2 0 0 0-2-2H2" />
                </svg>
              ) : tool.icon === 'relight-svg' ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                  stroke={activeTool === tool.id ? 'var(--tap-accent)' : hoveredTool === tool.id ? 'var(--tap-text-1)' : 'var(--tap-text-3)'}
                  strokeWidth="1.1">
                  <circle cx="12" cy="13" r="7" />
                  <ellipse cx="12" cy="13" rx="11" ry="3.5" transform="rotate(-25 12 13)" />
                </svg>
              ) : (
                tool.icon
              )}
              {activeTool === tool.id && (
                <span style={{
                  position: 'absolute',
                  left: '-5px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '2px',
                  height: '16px',
                  borderRadius: 'var(--tap-r-full)',
                  background: 'var(--tap-accent)',
                }} />
              )}
            </button>
          </Tooltip>
        </div>
      ))}
    </div>
  );
}
