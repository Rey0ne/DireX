/* === ShotNode — Script-to-storyboard text node === */
/* Unified panel: card + bottom prompt, centered layout */

import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';

interface ShotNodeData {
  title: string;
  shot: {
    intent_cn?: string;
    framing?: string;
    movement?: string;
    key?: string;
    lens?: string;
    angle?: string;
    mood?: string;
    color?: string;
  };
  isConnecting?: boolean;
  isConnectTarget?: boolean;
  multiSelect?: boolean;
  isPickMode?: boolean;
  isPickTarget?: boolean;
  hasConnections?: boolean;
  hasConnections?: boolean;
  onChange?: (patch: Record<string, unknown>) => void;
}

export function ShotNode({ data, selected }: { id: string; data: ShotNodeData; selected?: boolean }) {
  const shot = data.shot || {};
  const [hovered, setHovered] = useState(false);
  const [scriptInput, setScriptInput] = useState('');

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Card wrapper — handles position relative to this, NOT the full node */}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-20px', left: '8px', zIndex: 10, fontSize: '10px', fontWeight: 500, color: 'var(--tap-text-4)', letterSpacing: '0.05em' }}>TEXT</div>
        {/* Ports — centered on both sides */}
        <Handle type="target" position={Position.Left} id="refs-in"
          style={{
            width: '19px', height: '19px', background: 'var(--tap-panel)',
            border: '2px solid rgba(180,180,185,0.5)', borderRadius: '50%',
            left: '-20px', top: '50%', opacity: selected || data.isConnecting || data.hasConnections ? 1 : 0, opacity: selected || hovered || data.isConnecting || data.hasConnections ? 1 : 0, pointerEvents: "all", transition: 'opacity 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, lineHeight: 1, color: 'rgba(180,180,185,0.7)',
          }}
        ><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg></Handle>
        <Handle type="source" position={Position.Right} id="shot-out"
          style={{
            width: '19px', height: '19px', background: 'var(--tap-panel)',
            border: '2px solid rgba(180,180,185,0.5)', borderRadius: '50%',
            right: '-20px', top: '50%', opacity: selected || data.isConnecting || data.hasConnections ? 1 : 0, opacity: selected || hovered || data.isConnecting || data.hasConnections ? 1 : 0, pointerEvents: "all", transition: 'opacity 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, lineHeight: 1, color: 'rgba(180,180,185,0.7)',
          }}
        ><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg></Handle>

        {/* Main Card */}
        <div style={{
          width: '280px',
          background: 'var(--tap-panel)',
          border: data.isPickTarget
            ? '2px solid rgba(180,180,185,0.55)'
            : data.isPickMode
              ? '1px dashed rgba(180,180,185,0.3)'
              : data.isConnectTarget
                ? '1px solid rgba(180,180,185,0.5)'
                : selected ? '2px solid rgba(180,180,185,0.45)' : '1px solid var(--tap-border)',
          borderRadius: 'var(--tap-r-xl)',
          boxShadow: data.isPickTarget
            ? '0 0 28px rgba(180,180,185,0.25)'
            : data.isConnectTarget
              ? '0 0 28px rgba(180,180,185,0.2)'
              : selected ? '0 0 20px rgba(180,180,185,0.08)' : 'var(--tap-shadow-sm)',
          padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: `all var(--tap-dur-fast) var(--tap-ease)`,
      }}>
        {/* Title */}
        <input
          value={data.title || ''}
          onChange={e => { data.onChange?.({ title: e.target.value }); }}
          placeholder="分镜标题…"
          onPointerDownCapture={e => { e.stopPropagation() }}
          onMouseDownCapture={e => { e.stopPropagation() }}
          style={{
            fontSize: 'var(--tap-fs-h2)', fontWeight: 600,
            color: 'var(--tap-text-1)', background: 'transparent',
            border: 'none', outline: 'none', width: '100%',
          }}
        />

        {/* Content area — no nested box, text directly in card */}
        <div style={{
          minHeight: '100px',
          fontSize: 'var(--tap-fs-body)',
          color: shot.intent_cn ? 'var(--tap-text-1)' : 'var(--tap-text-4)',
          lineHeight: 1.8,
          whiteSpace: 'pre-wrap',
        }}>
          {shot.intent_cn || ''}
        </div>
      </div>
      </div>

      {/* ── Bottom Prompt Panel (absolute, no hitbox impact) ── */}
      {selected && !data.multiSelect && (
        <div
          onContextMenu={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
          style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '280px',
          marginTop: '10px',
          zIndex: 50,
          animation: 'tap-fade-up var(--tap-dur-fast) var(--tap-ease)',
        }}>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 'var(--tap-r-xl)',
          overflow: 'hidden',
        }}>
          <textarea
            value={scriptInput}
            onChange={e => setScriptInput(e.target.value)}
            onPointerDownCapture={e => { e.stopPropagation() }}
            onMouseDownCapture={e => { e.stopPropagation() }}
            placeholder="在此粘贴剧本或场景描述，大模型将自动解析并转换为分镜…"
            maxLength={5000}
            rows={4}
            style={{
              width: '100%', background: 'transparent', border: 'none',
              padding: '12px 14px', fontSize: 'var(--tap-fs-body)',
              color: 'var(--tap-text-1)', resize: 'none', outline: 'none',
              lineHeight: 1.5,
            }}
          />
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <span style={{ fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-text-4)', flex: 1 }}>
              剧本 → 分镜转换
            </span>
            <button
              onClick={() => {
                const words = scriptInput.trim();
                if (!words) return;
                const storyboard = `🎬 分镜 1：${words.slice(0, 60)}${words.length > 60 ? '...' : ''}\n\n景别：中景 | 运镜：推 | 打光：侧光\n\n画面描述：${words}`;
                data.onChange?.({ shot: { ...shot, intent_cn: storyboard } });
                setScriptInput('');
              }}
              style={{
                padding: '5px 14px', borderRadius: 'var(--tap-r-sm)',
                background: scriptInput.trim() ? 'var(--tap-accent)' : 'rgba(255,255,255,0.06)',
                color: scriptInput.trim() ? '#fff' : 'var(--tap-text-4)',
                fontSize: 'var(--tap-fs-meta)', fontWeight: 500,
                border: 'none', cursor: 'pointer',
                transition: `all var(--tap-dur-fast) var(--tap-ease)`,
              }}
              onMouseEnter={e => { if (scriptInput.trim()) e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
            >
              转换为分镜
            </button>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
