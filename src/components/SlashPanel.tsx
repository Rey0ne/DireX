/* === SlashPanel — / command palette === */
/* Unified command palette for node creation, tools, templates, agent actions */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Panel } from './shared';

interface Command {
  id: string;
  icon: string;
  title: string;
  desc: string;
  shortcut?: string;
  badge?: string;
  action: () => void;
}

interface SlashPanelProps {
  onSelect: (type: string) => void;
  onCommand: (cmd: string) => void;
  onClose: () => void;
}

export function SlashPanel({ onSelect, onCommand, onClose }: SlashPanelProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commands: Command[] = [
    { id: 'shot', icon: '🎬', title: '新建镜头节点', desc: '结构化分镜描述，景别/运镜/打光', shortcut: 'N', action: () => onSelect('shot') },
    { id: 'image.generate', icon: '🖼️', title: '新建图片生成节点', desc: '文生图、图生图、风格复刻', shortcut: 'I', action: () => onSelect('image.generate') },
    { id: 'image.editor', icon: '✏️', title: '新建图片编辑器', desc: '裁切/擦除/打光/多角度', badge: 'Stage 2', action: () => onSelect('image.editor') },
    { id: 'compile', icon: '🔮', title: '编译镜头 → Prompt', desc: '将 shot 结构化字段编译为提示词', action: () => onCommand('compile') },
    { id: 'crop', icon: '✂️', title: '裁切工具', desc: 'PS-like 裁切模式', action: () => onCommand('crop') },
    { id: 'inpaint', icon: '🖌️', title: '擦除/重绘', desc: '涂抹遮罩后重绘', action: () => onCommand('inpaint') },
    { id: 'relight', icon: '💡', title: '打光', desc: '调整光源方向与色温', action: () => onCommand('relight') },
    { id: 'multi-angle', icon: '🔄', title: '多角度', desc: '批量生成不同视角', action: () => onCommand('multiAngle') },
    { id: 'auto-layout', icon: '📐', title: '自动排布', desc: '按类型网格排列所有节点', action: () => onCommand('autoLayout') },
    { id: 'export', icon: '📥', title: '导出资产', desc: '导出选定资产为 PNG/MP4', action: () => onCommand('export') },
  ];

  const filtered = query.trim()
    ? commands.filter(c =>
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.desc.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  const clampedIndex = Math.min(selectedIndex, Math.max(0, filtered.length - 1));

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[clampedIndex]) {
        filtered[clampedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [filtered, clampedIndex, onClose]);

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(0,0,0,0.3)' }} />

      <Panel style={{
        position: 'fixed',
        top: '15vh',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        width: '480px',
        maxHeight: '480px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Search input */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 16px', borderBottom: '1px solid var(--tap-divider)',
        }}>
          <span style={{ fontSize: 'var(--tap-icon-size)', color: 'var(--tap-text-3)' }}>/</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="搜索节点、工具、模板…"
            style={{
              flex: 1, fontSize: 'var(--tap-fs-body)', color: 'var(--tap-text-1)',
              background: 'transparent', border: 'none', outline: 'none',
            }}
          />
          <span onClick={onClose} style={{
            fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-3)',
            cursor: 'pointer', padding: '2px 6px',
          }}>
            Esc
          </span>
        </div>

        {/* Results */}
        <div style={{
          flex: 1, overflowY: 'auto', padding: 'var(--tap-space-2)',
          display: 'flex', flexDirection: 'column', gap: '2px',
        }}>
          {filtered.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--tap-text-3)', fontSize: 'var(--tap-fs-body)' }}>
              无匹配结果
            </div>
          )}
          {filtered.map((cmd, i) => (
            <div key={cmd.id}
              onClick={cmd.action}
              onMouseEnter={() => setSelectedIndex(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--tap-space-3)',
                height: '42px', padding: '0 var(--tap-space-3)',
                borderRadius: 'var(--tap-r-md)',
                background: i === clampedIndex ? 'var(--tap-hover)' : 'transparent',
                cursor: 'pointer',
                transition: `background var(--tap-dur-fast) var(--tap-ease)`,
              }}
            >
              <span style={{ fontSize: 'var(--tap-icon-size)', width: '22px', textAlign: 'center', flexShrink: 0 }}>
                {cmd.icon}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 'var(--tap-fs-body)', color: 'var(--tap-text-1)', fontWeight: 500 }}>
                  {cmd.title}
                </div>
                <div style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cmd.desc}
                </div>
              </div>
              {cmd.shortcut && (
                <span style={{
                  fontSize: '10px', color: 'var(--tap-text-3)', fontFamily: 'var(--tap-font-mono)',
                  background: 'var(--tap-hover)', padding: '2px 6px', borderRadius: 'var(--tap-r-sm)',
                }}>
                  {cmd.shortcut}
                </span>
              )}
              {cmd.badge && (
                <span style={{
                  fontSize: '10px', fontWeight: 500, color: 'var(--tap-text-3)',
                  background: 'var(--tap-hover)', padding: '2px 6px', borderRadius: 'var(--tap-r-full)',
                }}>
                  {cmd.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
