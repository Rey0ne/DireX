/* === BottomStatusBar — canvas-wide status display === */
/* Shows node/edge count, auto-save status, viewport info */

import { useState, useEffect } from 'react';
import { useCanvasStore } from '../store/useCanvasStore';

export function BottomStatusBar() {
  const nodeCount = useCanvasStore(s => s.nodes.size);
  const edgeCount = useCanvasStore(s => s.edges.size);
  const viewport = useCanvasStore(s => s.viewport);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'pending'>('saved');

  // Simulate auto-save indicator
  useEffect(() => {
    const interval = setInterval(() => {
      setSaveStatus('saving');
      setTimeout(() => setSaveStatus('saved'), 600);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 'var(--tap-statusbar-h)',
      zIndex: 200,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      background: 'rgba(14, 14, 18, 0.78)',
      borderTop: '1px solid var(--tap-divider)',
      backdropFilter: 'blur(12px)',
      fontSize: 'var(--tap-fs-xs)',
      color: 'var(--tap-text-3)',
    }}>
      {/* Left: graph stats */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span>节点 {nodeCount}</span>
        <span>连线 {edgeCount}</span>
        <span style={{ color: 'var(--tap-text-4)' }}>
          · 视口 {Math.round(viewport.zoom * 100)}%
        </span>
      </div>

      {/* Center: tool hints */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span><kbd style={kbdStyle}>/</kbd> 命令面板</span>
        <span><kbd style={kbdStyle}>Space</kbd> AI 助手</span>
        <span><kbd style={kbdStyle}>N</kbd> 镜头节点</span>
        <span><kbd style={kbdStyle}>I</kbd> 图片生成</span>
      </div>

      {/* Right: save indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: saveStatus === 'saved' ? 'var(--tap-success)' :
                      saveStatus === 'saving' ? 'var(--tap-warning)' :
                      'var(--tap-text-4)',
          transition: `background var(--tap-dur-fast) var(--tap-ease)`,
        }} />
        {saveStatus === 'saved' ? '已保存' : saveStatus === 'saving' ? '保存中…' : '待保存'}
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '18px',
  height: '16px',
  padding: '0 4px',
  borderRadius: '3px',
  background: 'rgba(255,255,255,0.08)',
  fontSize: '10px',
  fontFamily: 'var(--tap-font-mono)',
  color: 'var(--tap-text-3)',
  lineHeight: 1,
};
