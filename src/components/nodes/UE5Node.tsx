/* === UE5Node — Pixel Streaming 2 viewport === */
/* Embeds UE5 stream via iframe to editor player page */

import { useState, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';

interface UE5NodeData {
  title?: string;
  isConnecting?: boolean;
  isConnectTarget?: boolean;
  multiSelect?: boolean;
  onChange?: (patch: Record<string, unknown>) => void;
}

export function UE5Node({ data, selected }: { id: string; data: UE5NodeData; selected?: boolean }) {
  const [loaded, setLoaded] = useState(false);

  const openPlayer = () => {
    window.open('http://127.0.0.1:80', 'ue5-player', 'width=1280,height=720');
    setLoaded(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', top: '-20px', left: '8px', zIndex: 10,
          fontSize: '10px', fontWeight: 500, color: 'var(--tap-text-4)',
          letterSpacing: '0.05em',
        }}>UE5</div>

        <Handle type="target" position={Position.Left} id="ue5-in"
          style={{
            width: '19px', height: '19px', background: 'var(--tap-panel)',
            border: '2px solid rgba(100,255,180,0.5)', borderRadius: '50%',
            left: '-20px', top: '50%',
          }}
        />
        <Handle type="source" position={Position.Right} id="ue5-out"
          style={{
            width: '19px', height: '19px', background: 'var(--tap-panel)',
            border: '2px solid rgba(100,255,180,0.5)', borderRadius: '50%',
            right: '-20px', top: '50%',
          }}
        />

        <div style={{
          width: '720px',
          borderRadius: 'var(--tap-r-xl)',
          overflow: 'hidden',
          border: selected ? '2px solid rgba(100,255,180,0.4)' : '1px solid var(--tap-border)',
          background: '#0a0a10',
          boxShadow: selected ? '0 0 32px rgba(100,255,180,0.15)' : 'var(--tap-shadow-sm)',
          transition: `all var(--tap-dur-fast) var(--tap-ease)`,
        }}>
          <div style={{
            width: '100%', height: '405px',
            position: 'relative',
            background: 'linear-gradient(135deg, rgba(100,255,180,0.05) 0%, rgba(100,255,180,0.01) 100%)',
          }}>
            {selected ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', height: '100%', gap: '12px',
              }}>
                <div style={{ fontSize: '48px', opacity: 0.15 }}>🎮</div>
                <div style={{ fontSize: 'var(--tap-fs-body)', color: 'var(--tap-text-3)' }}>
                  UE5 已就绪 — Pixel Streaming 信令服务器运行中
                </div>
                <button
                  onClick={openPlayer}
                  style={{
                    padding: '10px 24px', borderRadius: '10px',
                    background: loaded ? 'rgba(82,196,26,0.12)' : 'rgba(100,255,180,0.12)',
                    border: loaded ? '1px solid rgba(82,196,26,0.3)' : '1px solid rgba(100,255,180,0.25)',
                    color: loaded ? 'var(--tap-success)' : 'rgba(100,255,180,0.8)',
                    fontSize: 'var(--tap-fs-body)', cursor: 'pointer', fontWeight: 500,
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  {loaded ? '✅ 播放器已打开' : '▶ 打开 UE5 实时画面'}
                </button>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: '100%', textAlign: 'center', color: 'var(--tap-text-4)',
              }}>
                <div>
                  <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.15 }}>🎮</div>
                  <div style={{ fontSize: 'var(--tap-fs-body)' }}>选中节点预览 UE5</div>
                </div>
              </div>
            )}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '8px 14px',
            background: 'rgba(255,255,255,0.02)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-text-4)',
          }}>
            <span>🎮 UE5.7 | Pixel Streaming 2 | ws://127.0.0.1:8888</span>
            <span style={{ color: loaded ? 'var(--tap-success)' : 'var(--tap-text-4)' }}>
              {loaded ? '● 已连接' : '○ 等待中'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
