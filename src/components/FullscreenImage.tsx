/* === FullscreenImage — image preview with zoom/pan === */
/* Click image card → fullscreen; 2-stage zoom; download */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Panel } from './shared';

interface FullscreenImageProps {
  imageUrl: string;
  alt?: string;
  onClose: () => void;
  onDownload?: () => void;
}

export function FullscreenImage({ imageUrl, alt = '', onClose, onDownload }: FullscreenImageProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom(z => Math.max(0.3, Math.min(4, z + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onClick={e => { if (e.target === containerRef.current) onClose(); }}
      onWheel={handleWheel}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99990,
        background: 'rgba(0, 0, 0, 0.92)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        animation: 'tap-fade-in var(--tap-dur-fast) var(--tap-ease)',
      }}
    >
      {/* Image */}
      <img
        src={imageUrl}
        alt={alt}
        draggable={false}
        onMouseDown={handleMouseDown}
        style={{
          maxWidth: '90vw',
          maxHeight: '85vh',
          objectFit: 'contain',
          borderRadius: 'var(--tap-r-lg)',
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transition: isDragging ? 'none' : `transform var(--tap-dur-fast) var(--tap-ease)`,
          boxShadow: 'var(--tap-shadow-xl)',
          userSelect: 'none',
        }}
      />

      {/* Top toolbar */}
      <Panel style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 10px',
        borderRadius: 'var(--tap-r-full)',
      }}>
        <button
          onClick={() => setZoom(z => Math.min(4, z + 0.25))}
          style={fsBtnStyle}
          title="放大"
        >
          +
        </button>
        <span style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-2)', minWidth: '44px', textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(z => Math.max(0.3, z - 0.25))}
          style={fsBtnStyle}
          title="缩小"
        >
          −
        </button>
        <button onClick={resetZoom} style={fsBtnStyle} title="重置">
          ↺
        </button>
        <div style={{ width: '1px', height: '20px', background: 'var(--tap-divider)', margin: '0 4px' }} />
        {onDownload && (
          <button onClick={onDownload} style={fsBtnStyle} title="下载">
            ↓
          </button>
        )}
        <button onClick={onClose} style={{ ...fsBtnStyle, fontSize: '16px' }} title="关闭">
          ✕
        </button>
      </Panel>

      {/* Bottom hint */}
      <div style={{
        position: 'absolute',
        bottom: '28px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: 'var(--tap-fs-meta)',
        color: 'var(--tap-text-4)',
        display: 'flex',
        gap: '16px',
      }}>
        <span>滚轮缩放</span>
        <span>拖拽平移</span>
        <span>Esc 关闭</span>
      </div>
    </div>
  );
}

const fsBtnStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '18px',
  color: 'var(--tap-text-2)',
  background: 'transparent',
  cursor: 'pointer',
  transition: `all var(--tap-dur-fast) var(--tap-ease)`,
  border: 'none',
};
