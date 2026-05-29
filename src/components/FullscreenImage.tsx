/* === FullscreenImage — image preview with zoom/pan === */
/* Click image card → fullscreen; 2-stage zoom; download */

import { useState, useRef, useCallback, useEffect } from 'react';

interface FullscreenImageProps {
  imageUrl: string;
  alt?: string;
  onClose: () => void;
}

export function FullscreenImage({ imageUrl, alt = '', onClose }: FullscreenImageProps) {
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
    e.stopPropagation();
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
      {/* Image — fit to screen */}
      <img
        src={imageUrl}
        alt={alt}
        draggable={false}
        onMouseDown={handleMouseDown}
        style={{
          maxWidth: '88vw',
          maxHeight: '88vh',
          objectFit: 'contain',
          borderRadius: 'var(--tap-r-lg)',
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transition: isDragging ? 'none' : `transform var(--tap-dur-fast) var(--tap-ease)`,
          boxShadow: 'var(--tap-shadow-xl)',
          userSelect: 'none',
        }}
      />

      {/* Close button — transparent circle with X */}
      <button
        onClick={onClose}
        title="关闭"
        style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          color: 'rgba(255,255,255,0.7)',
          background: 'rgba(0,0,0,0.3)',
          border: 'none',
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          zIndex: 10,
          transition: `all var(--tap-dur-fast) var(--tap-ease)`,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; e.currentTarget.style.color = '#fff'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.3)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
      >✕</button>
    </div>
  );
}

