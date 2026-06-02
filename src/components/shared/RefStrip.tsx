/* === RefStrip — Reference image thumbnails + pick button === */
/* Used by Image/Video/Audio/Shot nodes above their prompt panel */

import { useCanvasStore } from '../../store/useCanvasStore';

interface RefStripProps {
  nodeId: string;
  refUrls?: string[];
  styleImageUrl?: string | null;
}

export function RefStrip({ nodeId, refUrls, styleImageUrl }: RefStripProps) {
  const hasRoom = !refUrls || refUrls.length < 20;

  return (
    <div style={{
      display: 'flex', gap: '6px', overflowX: 'auto',
      paddingBottom: '6px', minHeight: 44, alignItems: 'center',
    }}>
      {refUrls && refUrls.map((uri, i) => (
        <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
          <img src={uri} alt="" style={{
            width: 40, height: 40, borderRadius: 6,
            objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)',
          }} />
          <span onClick={e => {
            e.stopPropagation(); e.preventDefault();
            const store = useCanvasStore.getState();
            const toRemove: string[] = [];
            store.edges.forEach(edge => {
              if (edge.to.nodeId === nodeId) {
                const src = store.nodes.get(edge.from.nodeId);
                if (src && (src.meta?.gen as any)?.imageUrl === uri) toRemove.push(edge.id);
              }
            });
            toRemove.forEach(eid => store.removeEdge(eid));
            store.setSelectedNodes([nodeId]);
          }}
            onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
            onPointerDown={e => { e.stopPropagation(); e.preventDefault(); }}
            style={{
              position: 'absolute', top: -4, right: -4,
              width: 14, height: 14, borderRadius: '50%',
              background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, cursor: 'pointer', lineHeight: 1,
            }}
          >x</span>
        </div>
      ))}

      {/* Style thumbnail */}
      {styleImageUrl && (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img src={styleImageUrl} alt="" style={{
            width: 40, height: 40, borderRadius: 6,
            objectFit: 'cover', border: '1.5px solid rgba(200,160,100,0.4)',
          }} />
        </div>
      )}

      {/* + pick button */}
      {hasRoom && (
        <div onClick={e => {
          e.stopPropagation(); e.preventDefault();
          useCanvasStore.getState().setPendingConnection(nodeId);
        }}
          onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
          onPointerDown={e => { e.stopPropagation(); e.preventDefault(); }}
          title="点击后在画布中选择一个节点来建立连线"
          style={{
            width: 40, height: 40, borderRadius: 6,
            border: '1px dashed rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--tap-text-4)', fontSize: 16, flexShrink: 0,
            cursor: 'pointer', transition: 'all var(--tap-dur-fast) var(--tap-ease)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
            e.currentTarget.style.color = 'var(--tap-text-2)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            e.currentTarget.style.color = 'var(--tap-text-4)';
          }}
        >+</div>
      )}
    </div>
  );
}
