/* === CreateMenu — node creation menus === */
/* CreateMenu: right-click (list) | ConnectCreateMenu: port-drag (list) | DoubleClickMenu: dbl-click (grid) */

import { Panel, MenuItem, Divider } from './shared';

export interface CreateMenuAction {
  type: string;
  icon: string;
  label: string;
  sub: string;
  badge?: string;
}

const MENU_ACTIONS: CreateMenuAction[] = [
  { type: 'shot', icon: '🎬', label: '镜头节点', sub: '结构化分镜，景别/运镜/打光', badge: 'N' },
  { type: 'image.generate', icon: '🖼️', label: '图片生成', sub: '文生图、图生图、风格复刻', badge: 'I' },
  { type: 'video.generate', icon: '🎥', label: '视频生成', sub: '文生视频、图生视频', badge: 'V' },
  { type: 'audio.generate', icon: '🎵', label: '音频生成', sub: '音乐、音效、配音', badge: 'U' },
  { type: 'image.editor', icon: '✏️', label: '图片编辑器', sub: '裁切/重绘/打光/多角度', badge: 'E' },
  { type: 'world.3d', icon: '🧊', label: '3D 世界', sub: '3D模型与场景搭建', badge: '3D' },
];

// ─── CreateMenu (right-click) ─────────────────────
interface CreateMenuProps {
  x: number; y: number;
  onSelect: (type: string) => void;
  onClose: () => void;
}

export function CreateMenu({ x, y, onSelect, onClose }: CreateMenuProps) {
  const menuW = 270, menuH = 360;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
  const left = x + menuW > vw ? x - menuW : x;
  const top = y + menuH > vh ? y - menuH : y;

  return (
    <>
      <div onClick={onClose} onContextMenu={e => { e.preventDefault(); onClose(); }}
        style={{ position: 'fixed', inset: 0, zIndex: 99998 }} />
      <Panel onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', left, top, zIndex: 99999, width: menuW,
          padding: 'var(--tap-space-2)', display: 'flex', flexDirection: 'column', gap: '2px',
          userSelect: 'none', animation: 'tap-scale-in 120ms var(--tap-ease)',
        }}>
        <div style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-3)', padding: '6px 12px 2px', fontWeight: 600 }}>
          添加节点
        </div>
        <Divider />
        {MENU_ACTIONS.map(item => (
          <MenuItem key={item.type} icon={item.icon} label={item.label} shortcut={item.badge}
            onClick={() => onSelect(item.type)} />
        ))}
      </Panel>
    </>
  );
}

// ─── ConnectCreateMenu (port drag → blank) ─────────
const CONNECT_ACTIONS: CreateMenuAction[] = [
  { type: 'image.generate', icon: '🖼️', label: '图片生成', sub: '', badge: 'I' },
  { type: 'video.generate', icon: '🎥', label: '视频生成', sub: '', badge: 'V' },
  { type: 'audio.generate', icon: '🎵', label: '音频生成', sub: '', badge: 'U' },
  { type: 'shot', icon: '🎬', label: '镜头节点', sub: '', badge: 'N' },
];

interface ConnectCreateMenuProps {
  x: number; y: number;
  flowX: number; flowY: number;
  sourceNodeId: string; sourcePortId: string;
  onSelect: (type: string) => void;
  onClose: () => void;
}

export function ConnectCreateMenu({ x, y, onSelect, onClose }: ConnectCreateMenuProps) {
  const menuW = 240, menuH = 260;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
  const left = x + menuW > vw ? x - menuW : x;
  const top = y + menuH > vh ? y - menuH : y;

  return (
    <>
      <div onClick={onClose} onContextMenu={e => { e.preventDefault(); onClose(); }}
        style={{ position: 'fixed', inset: 0, zIndex: 99998 }} />
      <Panel onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', left, top, zIndex: 99999, width: menuW,
          padding: 'var(--tap-space-2)', display: 'flex', flexDirection: 'column', gap: '2px',
          userSelect: 'none', animation: 'tap-scale-in 120ms var(--tap-ease)',
        }}>
        <div style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-3)', padding: '6px 12px 2px', fontWeight: 600 }}>
          连接到新节点…
        </div>
        <Divider />
        {CONNECT_ACTIONS.map(item => (
          <MenuItem key={item.type} icon={item.icon} label={item.label} shortcut={item.badge}
            onClick={() => onSelect(item.type)} />
        ))}
      </Panel>
    </>
  );
}

// ─── DoubleClickMenu (grid layout, different from right-click) ──
const DOUBLE_CLICK_ACTIONS: CreateMenuAction[] = [
  { type: 'image.generate', icon: '🖼️', label: '图片生成', sub: '文生图、图生图' },
  { type: 'video.generate', icon: '🎥', label: '视频生成', sub: '文生视频、图生视频' },
  { type: 'audio.generate', icon: '🎵', label: '音频生成', sub: '音乐、音效、配音' },
  { type: 'shot', icon: '🎬', label: '文本转分镜', sub: '剧本 → 分镜' },
  { type: 'world.3d', icon: '🧊', label: '3D 世界', sub: '3D模型场景' },
  { type: 'image.editor', icon: '✏️', label: '图片编辑器', sub: '裁切/重绘/打光' },
];

interface DoubleClickMenuProps {
  x: number; y: number;
  onSelect: (type: string) => void;
  onClose: () => void;
}

export function DoubleClickMenu({ x, y, onSelect, onClose }: DoubleClickMenuProps) {
  const menuW = 400, menuH = 320;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
  const left = x + menuW > vw ? x - menuW : x;
  const top = y + menuH > vh ? y - menuH : y;

  return (
    <>
      <div onClick={onClose} onContextMenu={e => { e.preventDefault(); onClose(); }}
        style={{ position: 'fixed', inset: 0, zIndex: 99998 }} />
      <Panel onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', left, top, zIndex: 99999, width: menuW,
          padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px',
          userSelect: 'none', animation: 'tap-scale-in 120ms var(--tap-ease)',
        }}>
        <div style={{ fontSize: 'var(--tap-fs-body)', color: 'var(--tap-text-3)', fontWeight: 600, textAlign: 'center' }}>
          选择创建类型
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
          {DOUBLE_CLICK_ACTIONS.map(item => (
            <div key={item.type} onClick={() => onSelect(item.type)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                padding: '16px 10px', borderRadius: 'var(--tap-r-lg)',
                cursor: 'pointer', background: 'transparent',
                transition: `all var(--tap-dur-fast) var(--tap-ease)`,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--tap-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ fontSize: '28px' }}>{item.icon}</span>
              <span style={{ fontSize: 'var(--tap-fs-body)', color: 'var(--tap-text-1)', fontWeight: 500 }}>{item.label}</span>
              <span style={{ fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-text-4)', textAlign: 'center', lineHeight: 1.3 }}>{item.sub}</span>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
