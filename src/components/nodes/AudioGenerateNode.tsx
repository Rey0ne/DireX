/* === AudioGenerateNode — TapNow-style audio/music generation === */

import { useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';

interface AudioGenMeta {
  prompt: string; model: string; duration: string; style: string;
  resultAssetIds: string[];
}

interface AudioGenNodeData {
  audioUrl?: string;
  gen: AudioGenMeta;
  isConnecting?: boolean;
  isConnectTarget?: boolean;
  multiSelect?: boolean;
  isPickMode?: boolean;
  isPickTarget?: boolean;
  hasConnections?: boolean;
  hasConnections?: boolean;
  onChange?: (patch: Partial<AudioGenMeta>) => void;
  onGenerate?: () => void;
}

const MODEL_OPTIONS = [
  { name: 'Suno v4', badges: ['热门'], maxDur: '4min' },
  { name: 'Udio', badges: ['新'], maxDur: '2min' },
  { name: 'Stable Audio', badges: [], maxDur: '90s' },
];

const DURATION_OPTIONS = ['30s', '60s', '90s', '2min'];
const STYLE_OPTIONS = ['流行', '电子', '古典', '摇滚', '氛围', '嘻哈', '爵士', '民谣'];

export function AudioGenerateNode({ data, selected }: { id: string; data: AudioGenNodeData; selected?: boolean }) {
  const gen = data.gen || {};
  const [hovered, setHovered] = useState(false);
  const [prompt, setPrompt] = useState(gen.prompt || '');
  const [currentModel, setCurrentModel] = useState(gen.model || 'Suno v4');
  const [currentDuration, setCurrentDuration] = useState(gen.duration || '60s');
  const [currentStyle, setCurrentStyle] = useState(gen.style || '');
  const [showModelPicker, setShowModelPicker] = useState(false);

  const patch = useCallback((k: string, v: unknown) => {
    data.onChange?.({ [k]: v });
  }, [data]);

  const handleGenerate = () => {
    patch('prompt', prompt);
    data.onGenerate?.();
  };

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-20px', left: '8px', zIndex: 10, fontSize: '10px', fontWeight: 500, color: 'var(--tap-text-4)', letterSpacing: '0.05em' }}>AUDIO</div>
        {/* Ports — same position as image node */}
        <Handle type="target" position={Position.Left} id="audio-in"
          style={{
            width: '20px', height: '20px', background: 'var(--tap-panel)',
            border: '2px solid rgba(180,180,185,0.5)', borderRadius: '50%',
            left: '-20px', top: '50%', opacity: selected || data.isConnecting || data.hasConnections ? 1 : 0, opacity: selected || hovered || data.isConnecting || data.hasConnections ? 1 : 0, pointerEvents: "all", transition: 'opacity 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, lineHeight: 1, color: 'rgba(180,180,185,0.7)',
          }}
        ><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg></Handle>
        <Handle type="source" position={Position.Right} id="audio-out"
          style={{
            width: '20px', height: '20px', background: 'var(--tap-panel)',
            border: '2px solid rgba(180,180,185,0.5)', borderRadius: '50%',
            right: '-20px', top: '50%', opacity: selected || data.isConnecting || data.hasConnections ? 1 : 0, opacity: selected || hovered || data.isConnecting || data.hasConnections ? 1 : 0, pointerEvents: "all", transition: 'opacity 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, lineHeight: 1, color: 'rgba(180,180,185,0.7)',
          }}
        ><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg></Handle>

        {/* Audio Card */}
        <div style={{
          width: '300px', borderRadius: 'var(--tap-r-xl)', overflow: 'hidden',
          border: data.isPickTarget ? '2px solid rgba(180,180,185,0.55)'
            : data.isPickMode ? '1px dashed rgba(180,180,185,0.3)'
            : data.isConnectTarget ? '1px solid rgba(180,180,185,0.5)'
            : selected ? '2px solid rgba(255,255,255,0.28)' : '1px solid var(--tap-border)',
          background: 'var(--tap-panel)',
          boxShadow: data.isPickTarget ? '0 0 32px rgba(180,180,185,0.25)'
            : data.isConnectTarget ? '0 0 32px rgba(180,180,185,0.2)'
            : selected ? 'var(--tap-shadow-md)' : 'var(--tap-shadow-sm)',
          transition: `border var(--tap-dur-fast) var(--tap-ease), box-shadow var(--tap-dur-fast) var(--tap-ease)`,
        }}>
          <div style={{
            width: '100%', height: '140px',
            background: 'linear-gradient(135deg, rgba(180,180,185,0.05) 0%, rgba(180,180,185,0.01) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          }}>
            {data.audioUrl ? (
              <audio src={data.audioUrl} controls style={{ width: '90%' }} />
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '8px', opacity: 0.2 }}>🎵</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '30px', justifyContent: 'center' }}>
                  {[0.6, 0.9, 0.4, 1, 0.7, 0.3, 0.8, 0.5, 0.9, 0.4, 0.7, 0.6].map((h, i) => (
                    <div key={i} style={{ width: '3px', height: `${h * 28}px`, background: 'rgba(180,180,185,0.15)', borderRadius: '2px' }} />
                  ))}
                </div>
                <div style={{ color: 'var(--tap-text-3)', fontSize: 'var(--tap-fs-meta)', marginTop: '8px' }}>音频将在此处生成</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom panel (absolute, no hitbox impact) */}
      {selected && !data.multiSelect && (
        <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', width: '300px', marginTop: '10px', zIndex: 50, animation: 'tap-fade-up var(--tap-dur-fast) var(--tap-ease)' }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 'var(--tap-r-xl)', overflow: 'hidden' }}>
          <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
            onPointerDownCapture={e => { e.stopPropagation() }} onMouseDownCapture={e => { e.stopPropagation() }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
            placeholder="描述音乐风格、乐器、情绪… (Enter 发送)" maxLength={1000} rows={4}
            style={{ width: '100%', background: 'transparent', border: 'none', padding: '12px 14px', fontSize: 'var(--tap-fs-body)', color: 'var(--tap-text-1)', resize: 'none', outline: 'none', lineHeight: 1.5 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <InlineChip label={currentModel} active={showModelPicker} onClick={() => setShowModelPicker(!showModelPicker)} />
              {showModelPicker && (
                <PickerDropdown onClose={() => setShowModelPicker(false)}>
                  {MODEL_OPTIONS.map(m => (
                    <div key={m.name} onClick={() => { setCurrentModel(m.name); patch('model', m.name); setShowModelPicker(false); }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '38px', padding: '0 12px', borderRadius: 'var(--tap-r-md)', cursor: 'pointer', color: 'var(--tap-text-1)', background: currentModel === m.name ? 'var(--tap-hover)' : 'transparent' }}
                      onMouseEnter={e => { if (currentModel !== m.name) e.currentTarget.style.background = 'var(--tap-hover)'; }}
                      onMouseLeave={e => { if (currentModel !== m.name) e.currentTarget.style.background = 'transparent'; }}>
                      <span>{m.name}</span><span style={{ fontSize: '10px', color: 'var(--tap-text-3)' }}>{m.maxDur}</span>
                    </div>
                  ))}
                </PickerDropdown>
              )}
            </div>
            {STYLE_OPTIONS.slice(0, 4).map(s => (
              <InlineChip key={s} label={s} active={currentStyle === s} onClick={() => { setCurrentStyle(s); patch('style', s); }} />
            ))}
            {DURATION_OPTIONS.map(d => (
              <InlineChip key={d} label={d} active={currentDuration === d} onClick={() => { setCurrentDuration(d); patch('duration', d); }} />
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={handleGenerate} style={{ width: '20px', height: '20px', borderRadius: '50%', background: prompt.trim() ? 'var(--tap-accent)' : 'rgba(255,255,255,0.08)', color: prompt.trim() ? '#fff' : 'var(--tap-text-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', cursor: 'pointer', border: 'none', transition: `all var(--tap-dur-fast) var(--tap-ease)` }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>↑</button>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}

function InlineChip({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return <span onClick={(e) => { e.stopPropagation(); onClick(); }}
    style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '4px 8px', borderRadius: 'var(--tap-r-sm)', fontSize: 'var(--tap-fs-meta)', color: active ? 'var(--tap-text-1)' : 'var(--tap-text-3)', background: active ? 'rgba(255,255,255,0.10)' : 'transparent', cursor: 'pointer', border: 'none', transition: `all var(--tap-dur-fast) var(--tap-ease)`, userSelect: 'none', whiteSpace: 'nowrap' }}
    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--tap-text-1)'; }}
    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tap-text-3)'; } }}>{label}</span>;
}

function PickerDropdown({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return <><div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
    <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: '220px', padding: 'var(--tap-space-2)', zIndex: 200, display: 'flex', flexDirection: 'column', background: 'var(--tap-panel)', border: '1px solid var(--tap-border)', borderRadius: 'var(--tap-r-xl)', boxShadow: 'var(--tap-shadow-lg)', backdropFilter: 'blur(var(--tap-blur))', animation: 'tap-fade-up var(--tap-dur-fast) var(--tap-ease)' }}>{children}</div></>;
}
