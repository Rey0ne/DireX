/* === FullscreenImage === */
/* Dark panel overlay with pop-up animation */

import { useState, useEffect } from 'react';

interface FullscreenImageProps {
  imageUrl: string;
  prompt?: string;
  model?: string;
  quality?: string;
  aspect?: string;
  onClose: () => void;
}

export function FullscreenImage({
  imageUrl, onClose,
  prompt = '', model = '', quality = '', aspect = '',
}: FullscreenImageProps) {
  const [isFull, setIsFull] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (isFull) setIsFull(false); else onClose(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, isFull]);

  // Full fullscreen — just the image
  if (isFull) {
    return (
      <div
        onClick={() => setIsFull(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(0, 0, 0, 0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'zoom-out',
        }}
      >
        <img src={imageUrl} alt=""
          style={{ maxWidth: '100vw', maxHeight: '100vh', objectFit: 'contain' }}
        />
        <span onClick={e => { e.stopPropagation(); onClose(); }}
          style={{ position: 'absolute', top: '20px', right: '28px', fontSize: '16px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', lineHeight: 1 }}
        >x</span>
      </div>
    );
  }

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(18px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'tap-fade-in 0.2s var(--tap-ease)',
      }}
    >
      {/* 21:9 panel */}
      <div style={{
        width: '90vw',
        height: '52vh',
        background: '#1a1c20',
        borderRadius: '14px',
        boxShadow: '0 30px 80px rgba(0,0,0,0.7)',
        display: 'flex',
        overflow: 'hidden',
        animation: 'tap-scale-in 0.3s var(--tap-ease-spring)',
        position: 'relative',
      }}>
        {/* Image — click to go full screen */}
        <div
          onClick={() => setIsFull(true)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#0a0a0c', cursor: 'zoom-in',
          }}
        >
          <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }} />
        </div>

        {/* Info panel */}
        <div style={{ width: '300px', padding: '32px 24px', display: 'flex', flexDirection: 'column', gap: '24px', borderLeft: '1px solid rgba(255,255,255,0.06)', overflowY: 'auto' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '8px', fontWeight: 600, letterSpacing: '0.04em' }}>提示词</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>{prompt || '无'}</div>
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginBottom: '10px', fontWeight: 600, letterSpacing: '0.04em' }}>信息</div>
            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {model && <InfoRow label="模型" value={model} />}
              {quality && <InfoRow label="质量" value={quality} />}
              {aspect && <InfoRow label="宽高比" value={aspect} />}
            </div>
          </div>
        </div>

        {/* X close */}
        <span onClick={e => { e.stopPropagation(); onClose(); }}
          style={{
            position: 'absolute', top: '16px', right: '20px',
            fontSize: '16px', color: 'rgba(255,255,255,0.35)',
            cursor: 'pointer', lineHeight: 1, userSelect: 'none',
          }}
        >x</span>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</span>
      <span style={{ color: 'rgba(255,255,255,0.55)' }}>{value}</span>
    </div>
  );
}
