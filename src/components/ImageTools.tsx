/* === ImageTools — crop, inpaint, relight, multi-angle modals === */
/* Each tool opens as a modal overlay on the canvas */

import { useState, useRef, useEffect } from 'react';
import { Panel } from './shared';

// ─── Shared types ────────────────────────────────
interface ToolBaseProps {
  imageUrl?: string;
  onApply: (result: unknown) => void;
  onClose: () => void;
}

// ─── Crop Tool ─────────────────────────────────────
const CROP_RATIOS = [
  { label: '自由', w: 0, h: 0 },
  { label: '1:1', w: 1, h: 1 },
  { label: '4:3', w: 4, h: 3 },
  { label: '3:4', w: 3, h: 4 },
  { label: '16:9', w: 16, h: 9 },
  { label: '9:16', w: 9, h: 16 },
];

interface CropState {
  x: number; y: number; w: number; h: number;
}

export function CropTool({ imageUrl, onApply, onClose }: ToolBaseProps) {
  const [ratio, setRatio] = useState(CROP_RATIOS[0]);
  const [crop] = useState<CropState>({ x: 10, y: 10, w: 80, h: 80 });
  const [isDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const applyCrop = () => {
    onApply({ tool: 'crop', crop, ratio: ratio.label });
    onClose();
  };

  return (
    <ToolOverlay title="裁切" onClose={onClose}>
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Crop canvas */}
        <div ref={containerRef} style={{
          flex: 1,
          background: '#000',
          borderRadius: 'var(--tap-r-lg)',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '300px',
        }}>
          {imageUrl ? (
            <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: 0.6 }} />
          ) : (
            <div style={{
              width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--tap-text-3)', fontSize: 'var(--tap-fs-meta)',
            }}>
              拖拽选择裁切区域
            </div>
          )}

          {/* Crop overlay */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            clipPath: `polygon(
              0% 0%, 0% 100%, ${crop.x}% 100%, ${crop.x}% ${crop.y}%,
              ${crop.x + crop.w}% ${crop.y}%, ${crop.x + crop.w}% ${crop.y + crop.h}%,
              ${crop.x}% ${crop.y + crop.h}%, ${crop.x}% 100%,
              100% 100%, 100% 0%
            )`,
          }} />

          {/* Crop border */}
          <div style={{
            position: 'absolute',
            left: `${crop.x}%`, top: `${crop.y}%`,
            width: `${crop.w}%`, height: `${crop.h}%`,
            border: '2px solid rgba(255,255,255,0.8)',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}>
            {/* Corner handles */}
            {['nw', 'ne', 'sw', 'se'].map(corner => (
              <div key={corner} style={{
                position: 'absolute',
                width: '12px', height: '12px',
                background: '#fff',
                borderRadius: '50%',
                boxShadow: 'var(--tap-shadow-sm)',
                cursor: `${corner.includes('n') ? 'n' : 's'}${corner.includes('w') ? 'w' : 'e'}-resize`,
                top: corner.includes('n') ? '-6px' : undefined,
                bottom: corner.includes('s') ? '-6px' : undefined,
                left: corner.includes('w') ? '-6px' : undefined,
                right: corner.includes('e') ? '-6px' : undefined,
              }} />
            ))}
          </div>
        </div>

        {/* Ratio sidebar */}
        <div style={{ width: '100px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-3)', marginBottom: '4px', fontWeight: 600 }}>
            比例
          </div>
          {CROP_RATIOS.map(r => (
            <button
              key={r.label}
              onClick={() => setRatio(r)}
              style={{
                height: '32px', borderRadius: 'var(--tap-r-sm)',
                background: ratio.label === r.label ? 'var(--tap-active)' : 'transparent',
                color: ratio.label === r.label ? 'var(--tap-text-1)' : 'var(--tap-text-2)',
                fontSize: 'var(--tap-fs-meta)', cursor: 'pointer', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: `all var(--tap-dur-fast) var(--tap-ease)`,
              }}
              onMouseEnter={e => { if (ratio.label !== r.label) e.currentTarget.style.background = 'var(--tap-hover)'; }}
              onMouseLeave={e => { if (ratio.label !== r.label) e.currentTarget.style.background = 'transparent'; }}
            >
              {r.label}
            </button>
          ))}

          <div style={{ flex: 1 }} />
          <button onClick={applyCrop} style={applyBtnStyle}>应用裁切</button>
        </div>
      </div>
    </ToolOverlay>
  );
}

// ─── Inpaint / Erase Tool ──────────────────────────
export function InpaintTool({ imageUrl, onApply, onClose }: ToolBaseProps) {
  const [brushSize, setBrushSize] = useState(40);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasMask, setHasMask] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inpaintPrompt, setInpaintPrompt] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const undoStackRef = useRef<ImageData[]>([]);

  const saveUndoState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    undoStackRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    // Keep max 50 undo steps
    if (undoStackRef.current.length > 50) undoStackRef.current.shift();
  };

  const undo = () => {
    const canvas = canvasRef.current;
    if (!canvas || undoStackRef.current.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const prev = undoStackRef.current.pop()!;
    ctx.putImageData(prev, 0, 0);
    // Check if canvas is now empty
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const hasPixels = data.data.some((v, i) => i % 4 === 3 && v > 0);
    setHasMask(hasPixels);
  };

  const initCanvas = () => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas) return;
    const rect = img.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
  };

  const getPos = (e: React.MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const drawDot = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = 'rgba(255, 60, 60, 0.4)';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    setHasMask(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    saveUndoState(); // save state before this stroke
    setIsDrawing(true);
    drawDot(getPos(e).x, getPos(e).y);
  };
  const handleMouseMove = (e: React.MouseEvent) => { if (isDrawing) drawDot(getPos(e).x, getPos(e).y); };
  const handleMouseUp = () => { setIsDrawing(false); };

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    undoStackRef.current = [];
    setHasMask(false);
  };

  // Ctrl+Z undo for painting
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleSend = () => {
    if (isProcessing || !inpaintPrompt.trim()) return;
    setIsProcessing(true);
    // Save mask as data URL before sending (for persistence)
    const canvas = canvasRef.current;
    const maskUrl = canvas ? canvas.toDataURL() : '';
    onApply({ tool: 'inpaint', brushSize, hasMask, prompt: inpaintPrompt, maskUrl });
    // App.tsx will call onClose when done — don't close here
  };

  return (
    <ToolOverlay title="重绘" onClose={onClose}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        {/* Image + mask area — takes most space */}
        <div style={{
          flex: 1, position: 'relative', background: '#111',
          borderRadius: 'var(--tap-r-lg)', overflow: 'hidden',
          minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {imageUrl ? (
            <>
              <img ref={imgRef} src={imageUrl} alt="" onLoad={initCanvas}
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none' }}
              />
              <canvas ref={canvasRef}
                onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                style={{
                  position: 'absolute', pointerEvents: 'auto',
                  cursor: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${brushSize}" height="${brushSize}"><circle cx="${brushSize/2}" cy="${brushSize/2}" r="${brushSize/2-1}" fill="none" stroke="white" stroke-width="1.5" stroke-dasharray="3,2"/></svg>') ${brushSize/2} ${brushSize/2}, crosshair`,
                }}
              />
              <div style={{ position: 'absolute', top: '8px', left: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', background: 'rgba(0,0,0,0.6)', padding: '3px 8px', borderRadius: '4px', pointerEvents: 'none' }}>
                涂抹要修改的区域
              </div>
              {hasMask && (
                <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--tap-success)', background: 'rgba(0,0,0,0.7)', padding: '3px 8px', borderRadius: '4px' }}>已标记</span>
                  <button onClick={clearMask} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', background: 'rgba(0,0,0,0.7)', padding: '3px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>清除</button>
                </div>
              )}
            </>
          ) : (
            <span style={{ color: 'var(--tap-text-3)', fontSize: 'var(--tap-fs-meta)' }}>无图片</span>
          )}
        </div>

        {/* Brush size slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', color: 'var(--tap-text-4)', whiteSpace: 'nowrap' }}>画笔</span>
          <input type="range" min={10} max={200} value={brushSize}
            onChange={e => setBrushSize(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--tap-accent)' }}
          />
          <span style={{ fontSize: '11px', color: 'var(--tap-text-3)', minWidth: '35px', textAlign: 'right' }}>{brushSize}px</span>
        </div>

        {/* Prompt input + send button — same style as ImageGenerateNode */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px', flexShrink: 0,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 'var(--tap-r-lg)',
        }}>
          <textarea
            value={inpaintPrompt}
            onChange={e => setInpaintPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="描述你想在涂抹区域生成的内容…"
            rows={2}
            style={{
              flex: 1, background: 'transparent', border: 'none',
              padding: '6px 0', fontSize: 'var(--tap-fs-body)',
              color: 'var(--tap-text-1)', resize: 'none', outline: 'none',
              lineHeight: 1.5,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inpaintPrompt.trim() || isProcessing}
            style={{
              width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
              background: isProcessing ? 'var(--tap-warning)'
                : inpaintPrompt.trim() ? 'var(--tap-accent)' : 'rgba(255,255,255,0.08)',
              color: (isProcessing || inpaintPrompt.trim()) ? '#fff' : 'var(--tap-text-4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: isProcessing ? '16px' : '13px',
              cursor: isProcessing ? 'wait' : 'pointer', border: 'none',
              animation: isProcessing ? 'tap-pulse-glow 1.5s ease infinite' : 'none',
            }}
          >{isProcessing ? '⏳' : '↑'}</button>
        </div>
      </div>
    </ToolOverlay>
  );
}

// ─── Relight Tool ──────────────────────────────────
const LIGHT_PRESETS = [
  { id: 'top', label: '顶光', icon: '↑', angle: 90 },
  { id: 'side', label: '侧光', icon: '→', angle: 0 },
  { id: 'bottom', label: '底光', icon: '↓', angle: -90 },
  { id: 'rim', label: '逆光', icon: '←', angle: 180 },
  { id: 'soft', label: '柔光', icon: '◈', angle: 45 },
  { id: 'neon', label: '霓虹', icon: '✦', angle: 30 },
];

const COLOR_TEMPS = [
  { label: '暖色', color: '#ffb74d' },
  { label: '中性', color: '#ffffff' },
  { label: '冷色', color: '#90caf9' },
  { label: '霓虹紫', color: '#ce93d8' },
  { label: '霓虹蓝', color: '#42a5f5' },
  { label: '金色', color: '#ffd54f' },
];

const HORIZONTAL_ANGLES = [0, 45, 90, 135, 180, -45, -90, -135];
const VERTICAL_ANGLES = [0, 45, 90, 135, 180];

export function RelightTool({ imageUrl, onApply, onClose }: ToolBaseProps) {
  const sphereSize = 220;
  const [horizAngle, setHorizAngle] = useState(45);
  const [vertAngle, setVertAngle] = useState(45);
  const [distance, setDistance] = useState(60); // 0-100, affects intensity
  const [colorTemp, setColorTemp] = useState('neutral');
  const [showHPresets, setShowHPresets] = useState(false);
  const [showVPresets, setShowVPresets] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const sphereRef = useRef<HTMLDivElement>(null);
  const [relightPrompt, setRelightPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Convert angles to dot position on the 2D sphere
  const hRad = (horizAngle * Math.PI) / 180;
  const vRad = (vertAngle * Math.PI) / 180;
  const r = sphereSize / 2 - 10;
  const dotX = r * Math.cos(vRad) * Math.sin(hRad);
  const dotY = -r * Math.sin(vRad);
  const dotZ = r * Math.cos(vRad) * Math.cos(hRad); // for brightness
  const dotBrightness = 0.3 + 0.7 * Math.max(0, dotZ / r);

  const getDotPosition = (e: React.MouseEvent) => {
    const el = sphereRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedR = Math.min(dist, r);
    const scale = dist > 0 ? clampedR / dist : 0;
    return { dx: dx * scale, dy: dy * scale, cx, cy, r };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const pos = getDotPosition(e);
    if (pos) updateAnglesFromPos(pos);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const pos = getDotPosition(e);
    if (pos) updateAnglesFromPos(pos);
  };

  const handleMouseUp = () => setIsDragging(false);

  const updateAnglesFromPos = (pos: { dx: number; dy: number; r: number }) => {
    const h = Math.atan2(pos.dx, Math.sqrt(pos.r * pos.r - pos.dx * pos.dx - pos.dy * pos.dy)) * 180 / Math.PI;
    const v = -Math.asin(Math.max(-1, Math.min(1, pos.dy / pos.r))) * 180 / Math.PI;
    setHorizAngle(Math.round(h / 5) * 5);
    setVertAngle(Math.round(v / 5) * 5);
  };

  const handleSend = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    const ctemp = colorTemp === 'warm' ? '暖色' : colorTemp === 'cool' ? '冷色' : '中性';
    const prompt = relightPrompt || `relight from h${horizAngle}° v${vertAngle}° distance ${distance}% tone ${ctemp}`;
    onApply({ tool: 'relight', horizAngle, vertAngle, distance, colorTemp, prompt });
  };

  return (
    <ToolOverlay title="重打光" onClose={onClose}>
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* 3D Light Sphere */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#1a1a1e', borderRadius: 'var(--tap-r-lg)',
          position: 'relative', overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div ref={sphereRef} style={{
            width: sphereSize, height: sphereSize, position: 'relative',
          }}>
            {/* Outer sphere rings */}
            <svg width={sphereSize} height={sphereSize} style={{ position: 'absolute', top: 0, left: 0 }}>
              {/* Main circle */}
              <circle cx={sphereSize/2} cy={sphereSize/2} r={r} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              {/* Horizontal ellipse guides */}
              {[-r*0.6, -r*0.2, r*0.2, r*0.6].map((vy, i) => {
                const w = Math.sqrt(Math.max(0, r*r - vy*vy));
                return <ellipse key={i} cx={sphereSize/2} cy={sphereSize/2} rx={w} ry={Math.abs(vy)*0.3+2}
                  fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
              })}
              {/* Vertical ellipse guides */}
              {[-r*0.75, -r*0.35, r*0.05, r*0.45, r*0.85].map((vx, i) => {
                const h = Math.sqrt(Math.max(0, r*r - vx*vx));
                return <ellipse key={'v'+i} cx={sphereSize/2+vx} cy={sphereSize/2} rx={Math.abs(vx)*0.15+2} ry={h}
                  fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
              })}
              {/* Cross lines */}
              <line x1={sphereSize/2-r} y1={sphereSize/2} x2={sphereSize/2+r} y2={sphereSize/2} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <line x1={sphereSize/2} y1={sphereSize/2-r} x2={sphereSize/2} y2={sphereSize/2+r} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            </svg>

            {/* Light dot on the sphere */}
            <div style={{
              position: 'absolute',
              left: sphereSize/2 + dotX - 8,
              top: sphereSize/2 + dotY - 8,
              width: 16, height: 16, borderRadius: '50%',
              background: `rgba(255,255,200,${0.5 + dotBrightness * 0.5})`,
              boxShadow: `0 0 ${12 + dotBrightness * 16}px rgba(255,255,200,${0.3 + dotBrightness * 0.5})`,
              border: '2px solid rgba(255,255,255,0.8)',
              pointerEvents: 'none',
              transition: isDragging ? 'none' : 'all 0.15s',
            }} />
            {/* Center dot */}
            <div style={{
              position: 'absolute',
              left: sphereSize/2 - 2, top: sphereSize/2 - 2,
              width: 4, height: 4, borderRadius: '50%',
              background: 'rgba(255,255,255,0.3)',
              pointerEvents: 'none',
            }} />
          </div>
          {/* Hint */}
          <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}>
            拖拽光点调整方向 · H:{horizAngle}° V:{vertAngle}° D:{distance}%
          </div>
        </div>

        {/* Controls */}
        <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Horizontal angle presets */}
          <div>
            <button onClick={() => setShowHPresets(!showHPresets)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 10px', borderRadius: 'var(--tap-r-md)',
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--tap-border)',
              color: 'var(--tap-text-1)', fontSize: '12px', cursor: 'pointer',
            }}>
              <span>水平角度</span>
              <span style={{ color: 'var(--tap-accent)', fontWeight: 600 }}>{horizAngle}°</span>
            </button>
            {showHPresets && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                {HORIZONTAL_ANGLES.map(a => (
                  <button key={a} onClick={() => { setHorizAngle(a); setShowHPresets(false); }}
                    style={{
                      padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                      background: horizAngle === a ? 'var(--tap-active)' : 'rgba(255,255,255,0.03)',
                      color: horizAngle === a ? 'var(--tap-text-1)' : 'var(--tap-text-3)',
                      border: horizAngle === a ? '1px solid var(--tap-border-light)' : '1px solid transparent',
                      cursor: 'pointer',
                    }}
                  >{a}°</button>
                ))}
              </div>
            )}
          </div>

          {/* Vertical angle presets */}
          <div>
            <button onClick={() => setShowVPresets(!showVPresets)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 10px', borderRadius: 'var(--tap-r-md)',
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--tap-border)',
              color: 'var(--tap-text-1)', fontSize: '12px', cursor: 'pointer',
            }}>
              <span>垂直角度</span>
              <span style={{ color: 'var(--tap-accent)', fontWeight: 600 }}>{vertAngle}°</span>
            </button>
            {showVPresets && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                {VERTICAL_ANGLES.map(a => (
                  <button key={a} onClick={() => { setVertAngle(a); setShowVPresets(false); }}
                    style={{
                      padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                      background: vertAngle === a ? 'var(--tap-active)' : 'rgba(255,255,255,0.03)',
                      color: vertAngle === a ? 'var(--tap-text-1)' : 'var(--tap-text-3)',
                      border: vertAngle === a ? '1px solid var(--tap-border-light)' : '1px solid transparent',
                      cursor: 'pointer',
                    }}
                  >{a}°</button>
                ))}
              </div>
            )}
          </div>

          {/* Distance slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--tap-text-3)', display: 'flex', justifyContent: 'space-between' }}>
              <span>光源距离</span><span>{distance}%</span>
            </div>
            <input type="range" min={10} max={100} value={distance}
              onChange={e => setDistance(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--tap-accent)' }}
            />
          </div>

          {/* Color temperature */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--tap-text-3)' }}>色温</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[{id:'warm',label:'暖色',color:'#ffb74d'},{id:'neutral',label:'中性',color:'#fff'},{id:'cool',label:'冷色',color:'#90caf9'}].map(ct => (
                <button key={ct.id} onClick={() => setColorTemp(ct.id)} style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '5px 8px', borderRadius: '6px', fontSize: '11px',
                  background: colorTemp === ct.id ? 'rgba(255,255,255,0.08)' : 'transparent',
                  border: colorTemp === ct.id ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
                  color: colorTemp === ct.id ? '#fff' : 'var(--tap-text-3)',
                  cursor: 'pointer',
                }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: ct.color }} />
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* Prompt + send */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 'var(--tap-r-lg)',
          }}>
            <textarea value={relightPrompt} onChange={e => setRelightPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="描述光照效果…"
              rows={2}
              style={{
                flex: 1, background: 'transparent', border: 'none', padding: '4px 0',
                fontSize: 'var(--tap-fs-body)', color: 'var(--tap-text-1)',
                resize: 'none', outline: 'none', lineHeight: 1.5,
              }}
            />
            <button onClick={handleSend} disabled={isProcessing} style={{
              width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
              background: isProcessing ? 'var(--tap-warning)' : 'var(--tap-accent)',
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: isProcessing ? '16px' : '13px',
              cursor: 'pointer', border: 'none',
              animation: isProcessing ? 'tap-pulse-glow 1.5s ease infinite' : 'none',
            }}>{isProcessing ? '⏳' : '↑'}</button>
          </div>
        </div>
      </div>
    </ToolOverlay>
  );
}

// ─── Multi-Angle Tool ──────────────────────────────
const ANGLE_PRESETS = [
  { id: 'front', label: '正面', icon: '👤', desc: '正前方视角' },
  { id: 'side', label: '侧面', icon: '👤', desc: '左侧45°' },
  { id: 'back', label: '背面', icon: '👤', desc: '正后方视角' },
  { id: 'top', label: '俯视', icon: '🔽', desc: '自上而下' },
  { id: 'bottom', label: '仰视', icon: '🔼', desc: '自下而上' },
  { id: 'isometric', label: '等轴侧', icon: '💎', desc: '30°等轴侧' },
  { id: 'closeup', label: '特写', icon: '🔍', desc: '局部特写' },
  { id: 'wide', label: '广角', icon: '🌐', desc: '超广角视野' },
];

export function MultiAngleTool({ imageUrl, onApply, onClose }: ToolBaseProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [count, setCount] = useState(4);

  const toggleAngle = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <ToolOverlay title="多角度生成" onClose={onClose}>
      <div style={{ display: 'flex', gap: '16px', flex: 1, minHeight: 0 }}>
        {/* Preview */}
        <div style={{
          flex: 1,
          background: '#000',
          borderRadius: 'var(--tap-r-lg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '300px',
        }}>
          {imageUrl ? (
            <img src={imageUrl} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 'var(--tap-r-md)' }} />
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--tap-text-3)' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔄</div>
              <div style={{ fontSize: 'var(--tap-fs-body)' }}>选择视角生成多角度图像</div>
              <div style={{ fontSize: 'var(--tap-fs-xs)', marginTop: '4px', color: 'var(--tap-text-4)' }}>
                已选 {selected.length} 个视角
              </div>
            </div>
          )}
        </div>

        {/* Angle grid */}
        <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{
            fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-3)', fontWeight: 600,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>视角预设</span>
            <span style={{ fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-text-4)' }}>
              {selected.length}/{ANGLE_PRESETS.length}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto' }}>
            {ANGLE_PRESETS.map(angle => (
              <button
                key={angle.id}
                onClick={() => toggleAngle(angle.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px', borderRadius: 'var(--tap-r-md)',
                  background: selected.includes(angle.id) ? 'var(--tap-accent-bg)' : 'transparent',
                  border: selected.includes(angle.id) ? '1px solid var(--tap-accent-border)' : '1px solid var(--tap-border)',
                  color: selected.includes(angle.id) ? 'var(--tap-accent)' : 'var(--tap-text-2)',
                  cursor: 'pointer', textAlign: 'left',
                  transition: `all var(--tap-dur-fast) var(--tap-ease)`,
                }}
              >
                <span style={{ fontSize: '20px', flexShrink: 0 }}>{angle.icon}</span>
                <div>
                  <div style={{ fontSize: 'var(--tap-fs-body)', fontWeight: 500 }}>{angle.label}</div>
                  <div style={{ fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-text-3)' }}>{angle.desc}</div>
                </div>
                {selected.includes(angle.id) && (
                  <span style={{ marginLeft: 'auto', color: 'var(--tap-accent)', fontSize: '14px' }}>✓</span>
                )}
              </button>
            ))}
          </div>

          {/* Batch count */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-3)' }}>每视角数量</span>
            <div style={{ display: 'flex', gap: '2px' }}>
              {[1, 2, 4, 6].map(n => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  style={{
                    width: '28px', height: '28px', borderRadius: 'var(--tap-r-sm)',
                    background: count === n ? 'var(--tap-active)' : 'transparent',
                    color: count === n ? 'var(--tap-text-1)' : 'var(--tap-text-2)',
                    fontSize: 'var(--tap-fs-xs)', cursor: 'pointer', border: 'none',
                  }}
                >
                  {n}x
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onApply({ tool: 'multiAngle', angles: selected, count })}
            disabled={selected.length === 0}
            style={{
              ...applyBtnStyle,
              opacity: selected.length === 0 ? 0.4 : 1,
              cursor: selected.length === 0 ? 'default' : 'pointer',
            }}
          >
            生成 {selected.length * count} 张
          </button>
        </div>
      </div>
    </ToolOverlay>
  );
}

// ─── Shared ToolOverlay ────────────────────────────
function ToolOverlay({ title, children, onClose }: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99990,
      background: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      animation: 'tap-fade-in var(--tap-dur-fast) var(--tap-ease)',
    }}>
      <Panel style={{
        width: '800px',
        height: '520px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--tap-divider)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 'var(--tap-fs-h2)', fontWeight: 'var(--tap-fw-h2)', color: 'var(--tap-text-1)' }}>
            {title}
          </span>
          <button onClick={onClose} style={{
            width: 'var(--tap-btn-size-sm)', height: 'var(--tap-btn-size-sm)',
            borderRadius: 'var(--tap-r-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--tap-text-3)', fontSize: '18px', cursor: 'pointer',
            transition: `all var(--tap-dur-fast) var(--tap-ease)`, border: 'none', background: 'transparent',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--tap-hover)'; e.currentTarget.style.color = 'var(--tap-text-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tap-text-3)'; }}
          >✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'auto' }}>
          {children}
        </div>
      </Panel>
    </div>
  );
}

// ─── Shared styles ─────────────────────────────────
const applyBtnStyle: React.CSSProperties = {
  width: '100%',
  height: '36px',
  borderRadius: 'var(--tap-r-md)',
  background: 'var(--tap-accent)',
  color: '#fff',
  fontSize: 'var(--tap-fs-body)',
  fontWeight: 600,
  cursor: 'pointer',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: `all var(--tap-dur-fast) var(--tap-ease)`,
  flexShrink: 0,
};

const modeBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '6px',
  height: '32px', padding: '0 10px', borderRadius: 'var(--tap-r-sm)',
  fontSize: 'var(--tap-fs-meta)', cursor: 'pointer', border: 'none',
  transition: `all var(--tap-dur-fast) var(--tap-ease)`,
};
