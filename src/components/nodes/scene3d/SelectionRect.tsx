/* === SelectionRect — left-drag rectangle selection in 3D viewport === */
import { useState, useCallback, useEffect } from 'react';

export { screenRectContains };

interface SelectionRectProps {
  containerRef: React.RefObject<HTMLDivElement>;
  onSelect: (ids: string[]) => void;
}

export function SelectionRect({ containerRef, onSelect }: SelectionRectProps) {
  const [rect, setRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  const onMouseDown = useCallback((e: MouseEvent) => {
    if (e.button !== 0) return; // Left button only
    if (e.shiftKey || e.ctrlKey || e.metaKey) return; // Modifier keys skip
    setStartPos({ x: e.clientX, y: e.clientY });
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!startPos) return;
    const dx = e.clientX - startPos.x;
    const dy = e.clientY - startPos.y;
    if (Math.abs(dx) < 3 && Math.abs(dy) < 3) { setRect(null); return; }
    setRect({
      x: Math.min(startPos.x, e.clientX),
      y: Math.min(startPos.y, e.clientY),
      w: Math.abs(dx),
      h: Math.abs(dy),
    });
  }, [startPos]);

  const onMouseUp = useCallback(() => {
    setStartPos(null);
    setRect(null);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [containerRef, onMouseDown, onMouseMove, onMouseUp]);

  if (!rect || rect.w < 4 || rect.h < 4) return null;

  return (
    <div style={{
      position: 'fixed', left: rect.x, top: rect.y,
      width: rect.w, height: rect.h,
      border: '1px solid rgba(94,234,212,0.5)',
      background: 'rgba(94,234,212,0.08)',
      pointerEvents: 'none', zIndex: 1000,
    }} />
  );
}

/** Check if an object's screen-space bounding box intersects the selection rect */
export function screenRectContains(
  screenX: number, screenY: number,
  rect: { x: number; y: number; w: number; h: number },
  radius = 20
): boolean {
  return (
    screenX + radius > rect.x &&
    screenX - radius < rect.x + rect.w &&
    screenY + radius > rect.y &&
    screenY - radius < rect.y + rect.h
  );
}
