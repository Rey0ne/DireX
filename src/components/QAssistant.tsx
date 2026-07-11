/* === QAssistant — Floating Flat Button === */
import { useState, useCallback, useRef, useEffect } from 'react';

interface QAssistantProps {
  onToggleChat: () => void;
  onPositionChange?: (pos: { x: number; y: number }) => void;
}

export function QAssistant({ onToggleChat, onPositionChange }: QAssistantProps) {
  const [pos, setPos] = useState({ x: window.innerWidth - 100, y: window.innerHeight - 200 });
  const posRef = useRef(pos);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0, active: false, moved: false });

  posRef.current = pos;

  useEffect(() => {
    onPositionChange?.(pos);
  }, [pos, onPositionChange]);

  const onDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      startPosX: posRef.current.x, startPosY: posRef.current.y,
      active: true, moved: false,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }, []);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true;
    setPos({ x: dragRef.current.startPosX + dx, y: dragRef.current.startPosY + dy });
  }, []);

  const onUp = useCallback(() => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    if (!dragRef.current.moved) onToggleChat();
  }, [onToggleChat]);

  const SIZE = 64;

  return (
    <div
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      style={{
        position: 'fixed',
        left: pos.x, top: pos.y,
        width: SIZE, height: SIZE,
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        cursor: 'grab',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        borderRadius: '50%',
        background: 'linear-gradient(180deg, #80E8FF 0%, #00CFFF 40%, #009FBF 100%)',
        boxShadow: '0 4px 20px rgba(0,207,255,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <span style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 36, height: 36,
      }}>
        <span style={{
          position: 'absolute',
          fontSize: 30, fontWeight: 700,
          fontFamily: '"Silkscreen","Press Start 2P",monospace',
          color: '#fff', lineHeight: 1,
          transform: 'translateY(-1px)',
          animation: 'q-fade 4s ease-in-out infinite',
        }}>Q</span>
        <span style={{
          position: 'absolute',
          fontSize: 18, fontWeight: 400,
          fontFamily: '"Silkscreen","Press Start 2P",monospace',
          color: '#fff', lineHeight: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          animation: 'smile-fade 4s ease-in-out infinite',
        }}>
          <span style={{ display: 'flex', gap: '4px', lineHeight: 1 }}>
            <span>{'>'}</span>
            <span>{'<'}</span>
          </span>
          <span style={{ fontSize: 28, lineHeight: 1, marginTop: -9, transform: 'scaleX(0.7)' }}>⌣</span>
        </span>
      </span>
      <style>{`
        @keyframes q-fade {
          0%, 35%      { opacity: 1; }
          50%, 85%     { opacity: 0; }
          100%         { opacity: 1; }
        }
        @keyframes smile-fade {
          0%, 35%      { opacity: 0; }
          50%, 85%     { opacity: 1; }
          100%         { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
