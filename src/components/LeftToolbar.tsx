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
  { id: 'crop', icon: '⊞', label: '裁切', shortcut: 'C', divider: true },
  { id: 'inpaint', icon: '◐', label: '擦除 / 重绘', shortcut: 'B' },
  { id: 'relight', icon: '✦', label: '重打光', shortcut: 'L' },
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
      gap: '2px',
      padding: '5px',
      background: 'rgba(18,22,28,0.85)',
      borderRadius: '10px',
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
            margin: '4px 8px',
          }} />}
          <Tooltip label={tool.label} shortcut={tool.shortcut}>
            <button
              onClick={() => onToolSelect(tool.id)}
              onMouseEnter={() => setHoveredTool(tool.id)}
              onMouseLeave={() => setHoveredTool(null)}
              style={{
                width: '26px',
                height: '26px',
                borderRadius: 'var(--tap-r-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '15px',
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
              {tool.icon}
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
