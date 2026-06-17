/* === ClipEditor — popup modal for editing clip block properties === */
import { useState } from 'react';
import { ClipBlock } from './shared';
import { clipLibrary, getClipLabel } from './ClipLibrary';

interface ClipEditorProps {
  block: ClipBlock;
  onApply: (updated: ClipBlock) => void;
  onDelete: () => void;
  onClose: () => void;
}

export function ClipEditor({ block, onApply, onDelete, onClose }: ClipEditorProps) {
  const clip = clipLibrary.get(block.clipId);
  const [repeat, setRepeat] = useState(block.repeatCount);
  const [speed, setSpeed] = useState(block.timeScale);
  const [fade, setFade] = useState(block.crossfadeDuration);
  const [offY, setOffY] = useState(block.rootOffsetY);
  const [offX, setOffX] = useState(block.rootOffsetX);

  const handleApply = () => {
    onApply({ ...block, repeatCount: repeat, timeScale: speed, crossfadeDuration: fade, rootOffsetY: offY, rootOffsetX: offX });
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div style={{
        width: 320, padding: 24, borderRadius: 14,
        background: 'rgba(18,21,25,0.96)', border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>剪辑片段</div>
          <button onClick={onClose} style={{ color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>×</button>
        </div>

        {clip && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
            {getClipLabel(block.clipId)}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Row label="重复次数">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Button onClick={() => setRepeat(Math.max(1, repeat - 1))}>−</Button>
              <span style={{ color: '#fff', minWidth: 24, textAlign: 'center', fontSize: 13 }}>{repeat}</span>
              <Button onClick={() => setRepeat(repeat + 1)}>+</Button>
            </div>
          </Row>

          <Row label="播放速度">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Button onClick={() => setSpeed(Math.max(0.25, +(speed - 0.25).toFixed(2)))}>−</Button>
              <span style={{ color: '#fff', minWidth: 36, textAlign: 'center', fontSize: 13 }}>{speed}x</span>
              <Button onClick={() => setSpeed(Math.min(3, +(speed + 0.25).toFixed(2)))}>+</Button>
            </div>
          </Row>

          <Row label="过渡时长">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Button onClick={() => setFade(Math.max(0, +(fade - 0.1).toFixed(1)))}>−</Button>
              <span style={{ color: '#fff', minWidth: 30, textAlign: 'center', fontSize: 13 }}>{fade}s</span>
              <Button onClick={() => setFade(Math.min(2, +(fade + 0.1).toFixed(1)))}>+</Button>
            </div>
          </Row>

          <Row label="根偏移 Y">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Button onClick={() => setOffY(+(offY - 0.05).toFixed(2))}>−</Button>
              <span style={{ color: '#fff', minWidth: 36, textAlign: 'center', fontSize: 13 }}>{offY.toFixed(2)}</span>
              <Button onClick={() => setOffY(+(offY + 0.05).toFixed(2))}>+</Button>
            </div>
          </Row>

          <Row label="根偏移 X">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Button onClick={() => setOffX(+(offX - 0.05).toFixed(2))}>−</Button>
              <span style={{ color: '#fff', minWidth: 36, textAlign: 'center', fontSize: 13 }}>{offX.toFixed(2)}</span>
              <Button onClick={() => setOffX(+(offX + 0.05).toFixed(2))}>+</Button>
            </div>
          </Row>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <button onClick={onDelete} style={{
            padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,80,80,0.3)',
            background: 'rgba(255,80,80,0.1)', color: '#f66', cursor: 'pointer', fontSize: 12,
          }}>删除此段</button>
          <button onClick={handleApply} style={{
            padding: '8px 24px', borderRadius: 8, border: 'none',
            background: '#5EEAD4', color: '#000', cursor: 'pointer', fontSize: 12, fontWeight: 700,
          }}>应用</button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{label}</span>
      {children}
    </div>
  );
}

function Button({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      width: 26, height: 26, borderRadius: 6,
      border: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(255,255,255,0.05)',
      color: '#fff', cursor: 'pointer', fontSize: 14,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>{children}</button>
  );
}
