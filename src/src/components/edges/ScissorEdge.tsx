/* === ScissorEdge — mousemove + viewport-aware proximity === */

import { useState, useRef, useEffect } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, type EdgeProps, useStore } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '../../store/useCanvasStore';

export function ScissorEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition, markerEnd } = props;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const [showScissors, setShowScissors] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { deleteElements } = useReactFlow();
  const viewport = useStore(s => s.transform); // [x, y, zoom]

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // Convert flow coords to screen coords
      const mx = (sourceX + targetX) / 2;
      const my = (sourceY + targetY) / 2;
      const sx = mx * viewport[2] + viewport[0];
      const sy = my * viewport[2] + viewport[1];
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 50) {
        if (!timerRef.current) {
          timerRef.current = setTimeout(() => setShowScissors(true), 1500);
        }
      } else {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        setShowScissors(false);
      }
    };
    document.addEventListener('mousemove', onMove);
    return () => {
      document.removeEventListener('mousemove', onMove);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [sourceX, sourceY, targetX, targetY, viewport]);

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={{ stroke: 'rgba(180,180,185,0.4)', strokeWidth: 1.5 }} markerEnd={markerEnd} />
      {showScissors && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all', zIndex: 9999,
            }}
            className="nodrag nopan"
          >
            <div
              onClick={(e) => {
                e.stopPropagation(); e.preventDefault();
                deleteElements({ edges: [{ id }] });
                useCanvasStore.getState().removeEdge(id);
                setShowScissors(false);
              }}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(180,180,185,0.85)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 0 10px rgba(180,180,185,0.35)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="7" cy="7" r="3" />
                <circle cx="7" cy="17" r="3" />
                <line x1="9" y1="9" x2="18" y2="18" />
                <line x1="18" y1="6" x2="9" y2="15" />
              </svg>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
