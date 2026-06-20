/* === UE5Node — Virtual Production viewport === */
/* Full UE5 control via Pixel Streaming + video import to canvas */

import { useState, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useCanvasStore } from '../../store/useCanvasStore';

interface UE5NodeData {
  title?: string;
  isConnecting?: boolean;
  isConnectTarget?: boolean;
  multiSelect?: boolean;
  isPickMode?: boolean;
  isPickTarget?: boolean;
  onChange?: (patch: Record<string, unknown>) => void;
}

export function UE5Node({ id, data, selected }: { id: string; data: UE5NodeData; selected?: boolean }) {
  const [fullscreen, setFullscreen] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nodeWidth = 480;
  const nodeHeight = 270;

  useEffect(() => {
    if (showImport) setTimeout(() => inputRef.current?.focus(), 100);
  }, [showImport]);

  // Esc to exit fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fullscreen]);

  const handleImport = () => {
    const url = videoUrl.trim();
    if (!url) return;
    setImporting(true);
    const store = useCanvasStore.getState();
    const currentNode = store.nodes.get(id);
    const newX = (currentNode?.pos?.x || 0) + nodeWidth + 60;
    const newY = (currentNode?.pos?.y || 0);
    const newId = store.addNode('video.generate', { x: newX, y: newY }, 'UE5 虚拟拍摄');
    store.updateNode(newId, {
      meta: {
        gen: {
          prompt: 'UE5 虚拟拍摄',
          model: 'Kling 2.1',
          duration: '10s',
          resolution: '1080P',
          videoUrl: url,
          resultAssetIds: [url],
        },
      },
    });
    store.addEdge(
      { nodeId: id, portId: 'ue5-out' },
      { nodeId: newId, portId: 'video-in' },
      'asset.image' as any,
    );
    store.triggerSync();
    store.setSelectedNodes([newId]);
    setVideoUrl('');
    setShowImport(false);
    setImporting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleImport();
    if (e.key === 'Escape') setShowImport(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', top: '-20px', left: '8px', zIndex: 10,
          fontSize: '10px', fontWeight: 500, color: 'var(--tap-text-4)',
          letterSpacing: '0.05em',
        }}>3D WORLD</div>

        <Handle type="target" position={Position.Left} id="ue5-in"
          style={{
            width: '19px', height: '19px', background: 'var(--tap-panel)',
            border: '2px solid rgba(100,255,180,0.5)', borderRadius: '50%',
            left: '-20px', top: '50%',
            opacity: selected ? 1 : 0, pointerEvents: 'all',
            transition: 'opacity 0.15s',
          }}
        />
        <Handle type="source" position={Position.Right} id="ue5-out"
          style={{
            width: '19px', height: '19px', background: 'var(--tap-panel)',
            border: '2px solid rgba(100,255,180,0.5)', borderRadius: '50%',
            right: '-20px', top: '50%',
            opacity: selected ? 1 : 0, pointerEvents: 'all',
            transition: 'opacity 0.15s',
          }}
        />

        <div style={{
          width: nodeWidth,
          borderRadius: 'var(--tap-r-xl)',
          overflow: 'hidden',
          border: data.isPickTarget
            ? '2px solid rgba(100,255,180,0.55)'
            : selected
              ? '2px solid rgba(100,255,180,0.4)'
              : '1px solid var(--tap-border)',
          background: '#2a2d33',
          boxShadow: selected ? '0 0 32px rgba(100,255,180,0.15)' : 'var(--tap-shadow-sm)',
          transition: `all var(--tap-dur-fast) var(--tap-ease)`,
        }}>
          <div style={{
            width: '100%', height: nodeHeight,
            position: 'relative', background: '#000',
            overflow: 'hidden',
          }}>
            {/* Always visible, always rendered. pointer-events:none = drag passes through */}
            <iframe
              ref={iframeRef}
              src="http://127.0.0.1:80/"
              className="nodrag nowheel"
              style={{
                width: '100%', height: '100%', border: 'none',
                opacity: selected ? 1 : 0.3,
                pointerEvents: 'none',
              }}
              allow="autoplay; camera; microphone; fullscreen; xr-spatial-tracking"
              title="UE5 Pixel Streaming"
            />
            {!selected && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--tap-text-4)', background: 'rgba(0,0,0,0.5)',
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', opacity: 0.12 }}>🎮</div>
                  <div style={{ fontSize: 'var(--tap-fs-body)', marginTop: '8px' }}>
                    选中节点启动 UE5
                  </div>
                </div>
              </div>
            )}
            {selected && (
              <button
                onClick={() => setFullscreen(true)}
                title="全屏操作 UE5"
                style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%,-50%)',
                  padding: '10px 24px', borderRadius: '10px',
                  fontSize: '13px', fontWeight: 600,
                  background: 'rgba(100,255,180,0.15)',
                  border: '1px solid rgba(100,255,180,0.3)',
                  color: 'rgba(100,255,180,0.9)',
                  cursor: 'pointer', zIndex: 5,
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(100,255,180,0.25)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(100,255,180,0.15)';
                  e.currentTarget.style.color = 'rgba(100,255,180,0.9)';
                }}
              >⛶ 全屏操作 UE5</button>
            )}
          </div>

          {/* Bottom bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px',
            background: '#1e2128',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-text-4)',
            minHeight: '36px',
          }}>
            <span style={{ fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-text-4)' }}>🎮 UE5.7</span>

            <span style={{ fontSize: '9px', color: 'var(--tap-text-4)', whiteSpace: 'nowrap', flex: 1, textAlign: 'center' }}>
              使用完毕后请关闭像素流送，减少费用消耗
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!showImport ? (
                <button
                  onClick={() => setShowImport(true)}
                  title="录制完成后，粘贴视频 URL 导入画布"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '4px 12px', borderRadius: '6px',
                    fontSize: '11px', fontWeight: 600,
                    background: 'rgba(100,255,180,0.12)',
                    border: '1px solid rgba(100,255,180,0.2)',
                    color: 'rgba(100,255,180,0.8)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(100,255,180,0.2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(100,255,180,0.12)'; }}
                >🎬 导入视频</button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    ref={inputRef}
                    value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="粘贴视频 URL…"
                    style={{
                      width: '180px', height: '26px',
                      padding: '0 8px', borderRadius: '4px',
                      fontSize: '11px', color: 'var(--tap-text-1)',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      outline: 'none',
                    }}
                  />
                  <button
                    onClick={handleImport}
                    disabled={!videoUrl.trim() || importing}
                    style={{
                      padding: '3px 10px', borderRadius: '4px',
                      fontSize: '11px', fontWeight: 600,
                      background: videoUrl.trim() ? 'var(--tap-accent)' : 'rgba(255,255,255,0.06)',
                      color: videoUrl.trim() ? '#fff' : 'var(--tap-text-4)',
                      border: 'none', cursor: videoUrl.trim() ? 'pointer' : 'default',
                      whiteSpace: 'nowrap',
                    }}
                  >{importing ? '...' : '✓'}</button>
                  <button
                    onClick={() => { setShowImport(false); setVideoUrl(''); }}
                    style={{
                      padding: '3px 6px', borderRadius: '4px',
                      fontSize: '11px', color: 'var(--tap-text-4)',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                    }}
                  >✕</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen overlay */}
      {fullscreen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99990,
          background: '#000',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Top bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 16px', flexShrink: 0,
            background: 'rgba(0,0,0,0.8)',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
              🎮 UE5 · Pixel Streaming
            </span>
            <button
              onClick={() => setFullscreen(false)}
              style={{
                width: '32px', height: '32px', borderRadius: '8px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '18px', color: 'rgba(255,255,255,0.6)',
                background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
            >✕</button>
          </div>
          {/* UE5 viewport — fills remaining space */}
          <iframe
            src="http://127.0.0.1:80/"
            style={{ flex: 1, width: '100%', border: 'none', pointerEvents: 'auto' }}
            allow="autoplay; camera; microphone; fullscreen; xr-spatial-tracking"
          />
          <div style={{
            textAlign: 'center', padding: '6px', flexShrink: 0,
            fontSize: '11px', color: 'rgba(255,255,255,0.3)',
            background: 'rgba(0,0,0,0.8)',
          }}>按 Esc 退出全屏</div>
        </div>
      )}
    </div>
  );
}
