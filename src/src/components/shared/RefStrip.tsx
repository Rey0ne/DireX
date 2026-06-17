/* === RefStrip — Reference image thumbnails + pick button === */
/* Used by Image/Video/Audio/Shot nodes above their prompt panel */

import { useCanvasStore } from '../../store/useCanvasStore';

interface RefStripProps {
  nodeId: string;
  refUrls?: string[];
  styleImageUrl?: string | null;
}

export function RefStrip({ nodeId, refUrls, styleImageUrl }: RefStripProps) {
  return (
    <div style={{
      display: 'flex', gap: '4px', overflowX: 'hidden',
      paddingBottom: '4px', minHeight: 30, alignItems: 'center',
    }}>
      {refUrls && refUrls.map((uri, i) => {
        const isVid = uri.startsWith('data:video/') || uri.endsWith('.mp4') || uri.endsWith('.webm');
        return (<div key={i} style={{ position: 'relative', flexShrink: 0 }}>
          {isVid
            ? <video src={uri} muted preload="metadata" style={{width:28,height:28,borderRadius:4,objectFit:'cover',border:'1px solid rgba(255,255,255,0.1)',pointerEvents:'none'}}/>
            : <img src={uri} alt="" style={{width:28,height:28,borderRadius:4,objectFit:'cover',border:'1px solid rgba(255,255,255,0.1)'}}/>}
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
        </div>);
      })}

      {/* Style thumbnail */}
      {styleImageUrl && (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img src={styleImageUrl} alt="" style={{
            width: 28, height: 28, borderRadius: 4,
            objectFit: 'cover', border: '1.5px solid rgba(200,160,100,0.4)',
          }} />
        </div>
      )}

    </div>
  );
}
