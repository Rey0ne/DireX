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
  { type: 'world.3d', icon: '🧊', label: '3D 世界', sub: 'UE5虚拟拍摄', badge: '3D' },
  { type: 'scene.3d', icon: '🎬', label: '3D 场景', sub: '轻量场景搭建+虚拟摄像', badge: 'NEW' },
  { type: 'scene.3d.babylon', icon: '🧪', label: '3D 场景(Babylon)', sub: 'Babylon引擎测试', badge: 'TEST' },
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
const CONNECT_ACTIONS: { type: string; icon: string; label: string }[] = [
  { type: 'image.generate', icon: 'img', label: '图片' },
  { type: 'video.generate', icon: 'vid', label: '视频' },
  { type: 'audio.generate', icon: 'aud', label: '音频' },
  { type: 'shot', icon: 'txt', label: '文本' },
];

interface ConnectCreateMenuProps {
  x: number; y: number;
  flowX: number; flowY: number;
  sourceNodeId: string; sourcePortId: string;
  onSelect: (type: string) => void;
  onClose: () => void;
}

export function ConnectCreateMenu({ x, y, onSelect, onClose }: ConnectCreateMenuProps) {
  const menuW = 150;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
  const left = x + menuW > vw ? x - menuW : x;
  const top = y - 200;

  return (
    <>
      <div onClick={onClose} onContextMenu={e => { e.preventDefault(); onClose(); }} style={{ position: 'fixed', inset: 0, zIndex: 99998 }} />
      <div onClick={e => e.stopPropagation()}
        style={{ position: 'fixed', left, top, zIndex: 99999, width: menuW, padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px', userSelect: 'none', animation: 'tap-scale-in 120ms var(--tap-ease)', background: 'rgba(23, 23, 23, 0.96)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px' }}>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', padding: '4px 8px 6px', fontWeight: 500 }}>连接到新节点</div>
        {CONNECT_ACTIONS.map((item, i) => (
          <div key={item.type}
            onClick={() => onSelect(item.type)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', color: 'var(--tap-text-2)', transition: `all var(--tap-dur-fast) var(--tap-ease)`, borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tap-text-2)'; }}>
            <span style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><MiniIcon type={item.icon} /></span>
            <span style={{ fontSize: '12px', fontWeight: 500 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── DoubleClickMenu (grid layout, different from right-click) ──
const DOUBLE_CLICK_ACTIONS: CreateMenuAction[] = [
  { type: 'image.generate', icon: 'img', label: '图片', sub: '' },
  { type: 'video.generate', icon: 'vid', label: '视频', sub: '' },
  { type: 'audio.generate', icon: 'aud', label: '音频', sub: '' },
  { type: 'shot', icon: 'txt', label: '文本', sub: '' },
  { type: 'world.3d', icon: '3d', label: '3D 世界', sub: '' },
];

function MiniIcon({ type }: { type: string }) {
  const s: React.CSSProperties = { display: 'block' };
  switch (type) {
    case 'img': return <svg width="14" height="14" viewBox="0 0 14 14" style={s}><rect x="1" y="1" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2"/><circle cx="5" cy="5" r="1.2" fill="currentColor" opacity="0.5"/><path d="M13 10L9 6l-4 7" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg>;
    case 'vid': return <svg width="14" height="14" viewBox="0 0 14 14" style={s}><rect x="1" y="1" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2"/><polygon points="5.5,4 10,7 5.5,10" fill="currentColor" opacity="0.6"/></svg>;
    case 'aud': return <svg width="14" height="14" viewBox="0 0 14 14" style={s}><rect x="1" y="1" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2"/><line x1="4" y1="7" x2="4" y2="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="7" y1="7" x2="7" y2="2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="10" y1="7" x2="10" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
    case 'txt': return <svg width="14" height="14" viewBox="0 0 14 14" style={s}><rect x="1" y="1" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2"/><line x1="3.5" y1="5" x2="10.5" y2="5" stroke="currentColor" strokeWidth="1" opacity="0.5"/><line x1="3.5" y1="7" x2="9" y2="7" stroke="currentColor" strokeWidth="1" opacity="0.5"/><line x1="3.5" y1="9" x2="10.5" y2="9" stroke="currentColor" strokeWidth="1" opacity="0.5"/></svg>;
    case '3d': return <svg width="14" height="14" viewBox="0 0 14 14" style={s}><rect x="1" y="1" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2"/><path d="M2 10L7 2l5 8z" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg>;
    default: return <svg width="14" height="14" viewBox="0 0 14 14" style={s}><rect x="1" y="1" width="12" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.2"/><circle cx="7" cy="7" r="2" fill="none" stroke="currentColor" strokeWidth="1"/></svg>;
  }
}

interface DoubleClickMenuProps {
  x: number; y: number;
  onSelect: (type: string) => void;
  onClose: () => void;
}

export function DoubleClickMenu({ x, y, onSelect, onClose }: DoubleClickMenuProps) {
  const menuW = 130, menuH = 200;
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
          padding: '6px', display: 'flex', flexDirection: 'column', gap: '2px',
          userSelect: 'none', animation: 'tap-scale-in 120ms var(--tap-ease)',
          background: 'rgba(23, 23, 23, 0.96)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}>
        {DOUBLE_CLICK_ACTIONS.map(item => (
          <div key={item.type} onClick={() => onSelect(item.type)}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '7px 10px', borderRadius: 'var(--tap-r-sm)',
              cursor: 'pointer', background: 'transparent',
              fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-3)',
              transition: `all var(--tap-dur-fast) var(--tap-ease)`,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--tap-hover)'; e.currentTarget.style.color = 'var(--tap-text-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tap-text-3)'; }}
          >
            <MiniIcon type={item.icon} />
            <span>{item.label}</span>
          </div>
        ))}
      </Panel>
    </>
  );
}
