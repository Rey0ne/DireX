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
  const [scale, setScale] = useState(1);          // zoom 1x–5x
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const undoStackRef = useRef<ImageData[]>([]);
  const spaceHeld = useRef(false);

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
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
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
    // Right button, Ctrl+left, or Space+left = pan (when zoomed)
    if (e.button === 2 || (e.button === 0 && (e.ctrlKey || spaceHeld.current))) {
      e.preventDefault();
      if (scale <= 1) return;
      isPanning.current = true;
      if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
      lastPan.current = { x: e.clientX, y: e.clientY };
      return;
    }
    saveUndoState(); // save state before this stroke
    setIsDrawing(true);
    drawDot(getPos(e).x, getPos(e).y);
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - lastPan.current.x;
      const dy = e.clientY - lastPan.current.y;
      setPanX(p => p + dx);
      setPanY(p => p + dy);
      lastPan.current = { x: e.clientX, y: e.clientY };
      return;
    }
    if (isDrawing) drawDot(getPos(e).x, getPos(e).y);
  };
  const handleMouseUp = () => {
    setIsDrawing(false);
    isPanning.current = false;
    if (canvasRef.current) canvasRef.current.style.cursor = spaceHeld.current ? 'grab' : '';
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    undoStackRef.current = [];
    setHasMask(false);
  };

  // Keyboard: Ctrl+Z undo + Space pan toggle + Ctrl+0 reset zoom
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        spaceHeld.current = true;
        if (canvasRef.current && scale > 1) canvasRef.current.style.cursor = 'grab';
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setScale(1); setPanX(0); setPanY(0);
      }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        spaceHeld.current = false;
        if (canvasRef.current) canvasRef.current.style.cursor = '';
      }
    };
    // Also reset on blur (user Alt+Tabs while holding Space)
    const onBlur = () => { spaceHeld.current = false; if (canvasRef.current) canvasRef.current.style.cursor = ''; };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [scale]);

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
        }} onContextMenu={e => e.preventDefault()}>
          {imageUrl ? (
            <>
              {/* Scaled container — image + canvas under zoom transform */}
              <div style={{
                transform: `scale(${scale}) translate(${panX / scale}px, ${panY / scale}px)`,
                transformOrigin: 'center center',
                position: 'relative',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img ref={imgRef} src={imageUrl} alt="" onLoad={initCanvas}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', userSelect: 'none', pointerEvents: 'none' }}
                />
                <canvas ref={canvasRef}
                  onMouseDown={handleMouseDown} onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
                  style={{
                    position: 'absolute', pointerEvents: 'auto',
                    cursor: scale > 1
                      ? `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${brushSize}" height="${brushSize}"><circle cx="${brushSize/2}" cy="${brushSize/2}" r="${brushSize/2-1}" fill="none" stroke="white" stroke-width="1.5" stroke-dasharray="3,2"/></svg>') ${brushSize/2} ${brushSize/2}, crosshair`
                      : `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="${brushSize}" height="${brushSize}"><circle cx="${brushSize/2}" cy="${brushSize/2}" r="${brushSize/2-1}" fill="none" stroke="white" stroke-width="1.5" stroke-dasharray="3,2"/></svg>') ${brushSize/2} ${brushSize/2}, crosshair`,
                  }}
                />
              </div>
              {/* Overlay: hint */}
              <div style={{ position: 'absolute', top: '8px', left: '8px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', background: 'rgba(0,0,0,0.6)', padding: '3px 8px', borderRadius: '4px', pointerEvents: 'none' }}>
                涂抹要修改的区域{scale > 1 ? `  ·  ${Math.round(scale * 100)}%` : ''}
              </div>
              {/* Overlay: mask status */}
              {hasMask && (
                <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--tap-success)', background: 'rgba(0,0,0,0.7)', padding: '3px 8px', borderRadius: '4px' }}>已标记</span>
                  <button onClick={clearMask} style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', background: 'rgba(0,0,0,0.7)', padding: '3px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>清除</button>
                </div>
              )}
              {/* Zoom controls — bottom-right */}
              <div style={{ position: 'absolute', bottom: '8px', right: '8px', display: 'flex', gap: '2px', background: 'rgba(0,0,0,0.7)', borderRadius: '6px', overflow: 'hidden' }}>
                <button onClick={() => { setScale(s => Math.max(0.5, s - 0.5)); setPanX(0); setPanY(0); }}
                  disabled={scale <= 1}
                  style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: scale <= 1 ? 'rgba(255,255,255,0.2)' : '#fff', cursor: scale <= 1 ? 'default' : 'pointer', fontSize: '14px', lineHeight: 1 }}>−</button>
                <button onClick={() => { setScale(1); setPanX(0); setPanY(0); }}
                  style={{ width: '30px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: scale === 1 ? 'rgba(255,255,255,0.3)' : '#fff', cursor: 'pointer', fontSize: '10px', lineHeight: 1, borderLeft: '1px solid rgba(255,255,255,0.1)', borderRight: '1px solid rgba(255,255,255,0.1)' }}>{Math.round(scale * 100)}%</button>
                <button onClick={() => { setScale(s => Math.min(5, s + 0.5)); }}
                  disabled={scale >= 5}
                  style={{ width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: scale >= 5 ? 'rgba(255,255,255,0.2)' : '#fff', cursor: scale >= 5 ? 'default' : 'pointer', fontSize: '14px', lineHeight: 1 }}>+</button>
              </div>
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
const HORIZONTAL_ANGLES = [0, 45, 90, 135, 180, -45, -90, -135];
const VERTICAL_ANGLES = [0, 45, 90, 135, 180];

export function RelightTool({ imageUrl, onApply, onClose }: ToolBaseProps) {
  const sphereSize = 220;
  const [horizAngle, setHorizAngle] = useState(45);   // light direction
  const [vertAngle, setVertAngle] = useState(45);
  const [viewH, setViewH] = useState(0);                // camera/view angle (fixed by presets)
  const [viewV, setViewV] = useState(0);
  const [colorTemp, setColorTemp] = useState(5500); // Kelvin 2000-10000
  const [brightness, setBrightness] = useState(70); // 0-100
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

  // Map light direction → thumbnail 3D rotation (top-right view for perspective presets)
  // ── 3D orthographic projection of wireframe (uses view angle, NOT light angle) ──
  const vHRad = (viewH * Math.PI) / 180;
  const vVRad = (viewV * Math.PI) / 180;
  // Equator: circle in XZ plane → projects as horizontal ellipse, controlled by vertical view angle
  const eqRy = Math.max(2, r * Math.abs(Math.sin(vVRad)) + 2);
  // Meridian: circle in YZ plane → projects as vertical ellipse, controlled by horizontal view angle
  const mRx = Math.max(2, r * Math.abs(Math.sin(vHRad)) + 2);
  // Front intersection of equator & meridian — the point facing the viewer
  const fx = sphereSize/2 + r * Math.sin(vHRad);
  const fy = sphereSize/2 - r * Math.cos(vHRad) * Math.sin(vVRad);
  // Back intersection — opposite side of the sphere
  const bx = sphereSize/2 - r * Math.sin(vHRad);
  const by = sphereSize/2 + r * Math.cos(vHRad) * Math.sin(vVRad);

  // Image card rotation — faces front intersection, scaled for natural look
  const thumbRotateY = -viewH * 0.55;
  const thumbRotateX = -viewV * 0.45;

  // Color temperature (K) → RGB
  const kelvinRgb = (k: number): [number,number,number] => {
    const t = k / 100;
    let r: number, g: number, b: number;
    if (t <= 66) {
      r = 255;
      g = Math.max(0, Math.min(255, 99.47 * Math.log(t) - 161.12));
      b = t <= 19 ? 0 : Math.max(0, Math.min(255, 138.52 * Math.log(t - 10) - 305.04));
    } else {
      r = Math.max(0, Math.min(255, 329.7 * Math.pow(t - 60, -0.1332)));
      g = Math.max(0, Math.min(255, 288.12 * Math.pow(t - 60, -0.0755)));
      b = 255;
    }
    return [Math.round(r), Math.round(g), Math.round(b)];
  };
  const [lr, lg, lb] = kelvinRgb(colorTemp);
  const dotSize = 10; // fixed small dot
  const fanAlpha = brightness / 100 * 0.85; // fan sector opacity driven by brightness
  const glowIntensity = 0.2 + (brightness / 100) * 0.8; // still used for dot glow

  // Precompute fan polygon points + gradient
  const fanData = (() => {
    const cx = sphereSize/2;
    const cy = sphereSize/2;
    const lx = cx + dotX;
    const ly = cy + dotY;
    const dx = cx - lx;
    const dy = cy - ly;
    const d = Math.sqrt(dx*dx + dy*dy);
    if (d < 1 || !isFinite(d)) return null;
    const ux = dx/d, uy = dy/d;        // unit vector from light dot → center
    const px = -uy, py = ux;            // perpendicular
    const fanW = d * Math.tan(25 * Math.PI / 180); // half-width at distance d
    const ext = 1.15;                   // extend past center
    // Apex at light dot, two wing tips extend past center
    const ax = lx, ay = ly;
    const ex1 = lx + dx*ext + px*fanW;
    const ey1 = ly + dy*ext + py*fanW;
    const ex2 = lx + dx*ext - px*fanW;
    const ey2 = ly + dy*ext - py*fanW;
    if (![ax,ay,ex1,ey1,ex2,ey2].every(isFinite)) return null;
    // Gradient: bright at light dot, fades toward wing-tip midpoint
    const gx1 = ax, gy1 = ay;
    const gx2 = (ex1 + ex2) / 2;
    const gy2 = (ey1 + ey2) / 2;
    return { ax, ay, ex1, ey1, ex2, ey2, gx1, gy1, gx2, gy2 };
  })();
  const fanVisible = fanData !== null;

  const getDotPosition = (e: React.MouseEvent) => {
    const el = sphereRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedR = Math.min(dist, r - 4); // 4px margin avoids atan2 singularity at sphere edge
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

  // ═══════════════════════════════════════════════════
  //  Lighting Agent — 球体坐标 → 视觉结果语言
  //  不描述光源在哪里，描述画面必须发生什么变化
  // ═══════════════════════════════════════════════════
  const buildLightingPrompt = (): string => {
    const az = horizAngle;          // -180 ~ 180
    const el = vertAngle;           // -180 ~ 180
    const intens = brightness;      // 5 ~ 100
    const kelvin = colorTemp;       // 2000 ~ 10000

    // ── 1. 光源方向 → 摄影灯光风格 ──
    const absAz = Math.abs(az);
    let lightStyle = '';
    let shadowDir = '';
    let highlightZone = '';
    let rimDesc = '';

    if (el > 60) {
      // 顶光
      lightStyle = 'overhead dramatic lighting';
      shadowDir = 'cast downward, eyes in shadow, strong brow shadow';
      highlightZone = 'top of head, shoulders, and nose bridge';
      rimDesc = 'hair light from above, crown glow';
    } else if (el < -60) {
      // 底光
      lightStyle = 'low-angle horror lighting';
      shadowDir = 'cast upward, unnatural upward shadows on face';
      highlightZone = 'underside of chin, cheekbones, and brow ridge';
      rimDesc = 'under-glow along jawline';
    } else if (absAz > 150) {
      // 逆光 / 轮廓光
      lightStyle = 'dramatic backlight / rim light photography';
      shadowDir = 'cast forward toward the viewer, subject in deep shadow';
      highlightZone = 'edges facing the light — hair, shoulders, outline silhouette';
      rimDesc = 'strong glowing rim light around the entire subject silhouette, edge glow, hair light';
    } else if (absAz < 15) {
      // 正面光
      lightStyle = 'flat front lighting, beauty / fashion key light';
      shadowDir = 'cast directly behind the subject, minimal visible shadow';
      highlightZone = 'center of face — forehead, nose bridge, chin, catchlights in both eyes';
      rimDesc = 'subtle edge definition, no strong rim';
    } else if (az > 60 && az <= 150) {
      // 右侧光
      lightStyle = 'dramatic side lighting from the right';
      shadowDir = 'cast toward the left, strong falloff on the left side of the face and body';
      highlightZone = 'right cheek, right shoulder, right-side hair and clothing texture';
      rimDesc = 'right-side rim light defining the profile edge';
    } else if (az < -60 && az >= -150) {
      // 左侧光
      lightStyle = 'dramatic side lighting from the left';
      shadowDir = 'cast toward the right, strong falloff on the right side of the face and body';
      highlightZone = 'left cheek, left shoulder, left-side hair and clothing texture';
      rimDesc = 'left-side rim light defining the profile edge';
    } else if (az < 0) {
      // 左前 3/4
      lightStyle = 'classic Rembrandt / 3/4 portrait lighting from front-left';
      shadowDir = 'cast toward the right-front, triangular cheek highlight on the shadow side';
      highlightZone = 'left side of face, left eye catchlight, cheekbone, collarbone';
      rimDesc = 'subtle left-side hair light, depth separation from background';
    } else {
      // 右前 3/4 (default)
      lightStyle = 'classic Rembrandt / 3/4 portrait lighting from front-right';
      shadowDir = 'cast toward the left-front, triangular cheek highlight on the shadow side';
      highlightZone = 'right side of face, right eye catchlight, cheekbone, collarbone';
      rimDesc = 'subtle right-side hair light, depth separation from background';
    }

    // ── 2. 高度 → 灯光高度描述 ──
    let heightDesc = '';
    if (el > 60) heightDesc = 'high-angle overhead';
    else if (el > 30) heightDesc = 'elevated';
    else if (el > -30) heightDesc = 'eye-level';
    else if (el > -60) heightDesc = 'low-angle';
    else heightDesc = 'extreme low-angle';

    // ── 3. 强度 → 光质与距离 ──
    let intensityDesc = '';
    if (intens >= 90) intensityDesc = 'very strong, hard light with sharp shadows, short falloff, close source distance';
    else if (intens >= 70) intensityDesc = 'strong key light with defined shadows, moderate falloff';
    else if (intens >= 40) intensityDesc = 'medium-soft light, diffused shadows, medium falloff';
    else intensityDesc = 'soft gentle light, very diffused shadows, long falloff, distant source';

    // ── 4. 色温 → 灯光颜色与情绪 ──
    let colorDesc = '';
    if (kelvin < 2800) colorDesc = 'very warm candlelight / tungsten orange glow, intimate atmosphere';
    else if (kelvin < 3800) colorDesc = 'warm tungsten golden light, cinematic warm amber tone';
    else if (kelvin < 4800) colorDesc = 'early morning / late afternoon warm white, natural golden hour feel';
    else if (kelvin < 5800) colorDesc = 'neutral daylight white, clean balanced color';
    else if (kelvin < 7000) colorDesc = 'cool daylight, overcast sky tone, slightly blue cast';
    else colorDesc = 'cold blue skylight / moonlight, cool crisp atmosphere';

    // ── 5. 组合 → 完整视觉结果指令 ──
    const parts = [
      `Convert the lighting setup to: ${lightStyle}.`,
      `${heightDesc} ${colorDesc}.`,
      `${intensityDesc}.`,
      `Highlights concentrated on: ${highlightZone}.`,
      `Shadows: ${shadowDir}.`,
      `Rim lighting: ${rimDesc}.`,
      'Recalculate all highlights, contact shadows, and ambient occlusion according to the new lighting direction.',
      'Recalculate reflections on all reflective surfaces (eyes, skin, metal, glass).',
      'Rebuild facial shading and form shadows based on the new key light position.',
      'Preserve subject identity, composition, pose, and all non-lighting content.',
    ];

    const full = parts.join(' ');

    // ── 6. 用户自定义叠加 ──
    if (relightPrompt.trim()) {
      return `${full} Additional instructions: ${relightPrompt.trim()}`;
    }
    return full;
  };

  const handleSend = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    onApply({ tool: 'relight', horizAngle, vertAngle, brightness, colorTemp, prompt: buildLightingPrompt() });
  };

  return (
    <ToolOverlay title="重打光" onClose={onClose}>
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* 3D Light Sphere */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
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
          {/* View angle toggles */}
          <div style={{ display: 'flex', gap: '6px', zIndex: 10 }}>
            <button onClick={() => { setViewH(0); setViewV(0); }} style={{
              padding: '4px 14px', borderRadius: '14px', fontSize: '12px', fontWeight: 500,
              background: (viewH===0 && viewV===0) ? 'var(--tap-active)' : 'rgba(255,255,255,0.05)',
              color: (viewH===0 && viewV===0) ? '#fff' : 'var(--tap-text-3)',
              border: (viewH===0 && viewV===0) ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
              cursor: 'pointer',
            }}>正面</button>
            <button onClick={() => { setViewH(35); setViewV(45); }} style={{
              padding: '4px 14px', borderRadius: '14px', fontSize: '12px', fontWeight: 500,
              background: (viewH===35 && viewV===45) ? 'var(--tap-active)' : 'rgba(255,255,255,0.05)',
              color: (viewH===35 && viewV===45) ? '#fff' : 'var(--tap-text-3)',
              border: (viewH===35 && viewV===45) ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
              cursor: 'pointer',
            }}>透视</button>
          </div>
          <div ref={sphereRef} style={{
            width: sphereSize, height: sphereSize, position: 'relative',
          }}>
            {/* Shading + wireframe as SVG — outer circle always round, internals rotate */}
            <svg width={sphereSize} height={sphereSize} style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none' }}>
              <defs>
                <radialGradient id="sphShade" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="70%" stopColor="rgba(180,180,180,0.06)" />
                  <stop offset="85%" stopColor="rgba(180,180,180,0.18)" />
                  <stop offset="100%" stopColor="rgba(170,170,170,0.32)" />
                </radialGradient>
                <clipPath id="sphClip">
                  <circle cx={sphereSize/2} cy={sphereSize/2} r={r} />
                </clipPath>
                {fanData && (
                  <linearGradient id="fanGrad" gradientUnits="userSpaceOnUse"
                    x1={fanData.gx1} y1={fanData.gy1} x2={fanData.gx2} y2={fanData.gy2}>
                    <stop offset="0%" stopColor={`rgba(${lr},${lg},${lb},${fanAlpha})`} />
                    <stop offset="50%" stopColor={`rgba(${lr},${lg},${lb},${fanAlpha * 0.25})`} />
                    <stop offset="100%" stopColor={`rgba(${lr},${lg},${lb},0)`} />
                  </linearGradient>
                )}
              </defs>
              {/* Volume shading — static, always circular */}
              <circle cx={sphereSize/2} cy={sphereSize/2} r={r} fill="url(#sphShade)" />
              {/* Wireframe — equator + meridian with proper 3D projection */}
              <g clipPath="url(#sphClip)">
                {/* Fan sector — gradient fill, bright at light dot, fades to transparent; base invisible */}
                <polygon
                  points={fanData ? `${fanData.ax},${fanData.ay} ${fanData.ex1},${fanData.ey1} ${fanData.ex2},${fanData.ey2}` : '0,0 0,0 0,0'}
                  fill="url(#fanGrad)"
                  style={{ opacity: fanVisible ? 1 : 0 }}
                />
                {/* Equator — horizontal ellipse */}
                <ellipse cx={sphereSize/2} cy={sphereSize/2} rx={r} ry={eqRy}
                  fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" />
                {/* Meridian — vertical ellipse */}
                <ellipse cx={sphereSize/2} cy={sphereSize/2} rx={mRx} ry={r}
                  fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.6" />
                {/* Front intersection dot — where lines cross on front surface */}
                <circle cx={fx} cy={fy} r={3.5}
                  fill="rgba(255,255,255,0.9)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                {/* Back intersection dot — opposite side, dimmer */}
                <circle cx={bx} cy={by} r={2.5}
                  fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
              </g>
              {/* Outer silhouette — always a perfect circle */}
              <circle cx={sphereSize/2} cy={sphereSize/2} r={r} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.6" />
            </svg>

            {/* Thumbnail at sphere center — rotates to face the front intersection */}
            {imageUrl && <div style={{
              position: 'absolute',
              left: '50%', top: '50%',
              transform: `translate(-50%, -50%) perspective(400px) rotateY(${thumbRotateY}deg) rotateX(${thumbRotateX}deg)`,
              transition: 'transform 0.5s cubic-bezier(0.22, 0.61, 0.36, 1)',
              width: 65, height: 65,
              borderRadius: '6px', overflow: 'hidden',
              border: '2px solid rgba(255,255,255,0.4)',
              boxShadow: '4px 8px 20px rgba(0,0,0,0.65)',
              pointerEvents: 'none',
              zIndex: 2,
              background: '#1a1a1a',
            }}>
              <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
            </div>}

            {/* Light dot on the sphere */}
            <div style={{
              position: 'absolute',
              left: sphereSize/2 + dotX - dotSize/2,
              top: sphereSize/2 + dotY - dotSize/2,
              width: dotSize, height: dotSize, borderRadius: '50%',
              background: `rgba(${lr},${lg},${lb},${glowIntensity})`,
              boxShadow: `0 0 ${6 + fanAlpha * 40}px rgba(${lr},${lg},${lb},${glowIntensity})`,
              border: `2px solid rgba(${lr},${lg},${lb},${Math.min(1, glowIntensity + 0.2)})`,
              pointerEvents: 'none',
              transition: isDragging ? 'none' : 'all 0.15s',
              zIndex: 3,
            }} />
            {/* Center dot */}
            <div style={{
              position: 'absolute',
              left: sphereSize/2 - 2, top: sphereSize/2 - 2,
              width: 4, height: 4, borderRadius: '50%',
              background: 'rgba(255,255,255,0.3)',
              pointerEvents: 'none',
              zIndex: 3,
            }} />
          </div>
          {/* Hint */}
          <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}>
            拖拽光点调整方向 · H:{horizAngle}° V:{vertAngle}°
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

          {/* Direction presets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--tap-text-3)' }}>光源方向</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '4px' }}>
              {([
                ['左侧', -90, 0],
                ['顶部', 0, 90],
                ['右侧', 90, 0],
                ['前方', 0, 0],
                ['底部', 0, -90],
                ['后方', 180, 0],
                ['轮廓光', 180, 30],
              ] as [string, number, number][]).map(([label, h, v]) => {
                const active = horizAngle === h && vertAngle === v;
                return (
                  <button key={label} onClick={() => { setHorizAngle(h); setVertAngle(v); }}
                    style={{
                      padding: '5px 0', borderRadius: '6px', fontSize: '11px', fontWeight: 500,
                      background: active ? 'var(--tap-active)' : 'rgba(255,255,255,0.04)',
                      color: active ? 'var(--tap-text-1)' : 'var(--tap-text-3)',
                      border: active ? '1px solid var(--tap-border-light)' : '1px solid var(--tap-border)',
                      cursor: 'pointer',
                    }}
                  >{label}</button>
                );
              })}
            </div>
          </div>

          {/* Brightness slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--tap-text-3)', display: 'flex', justifyContent: 'space-between' }}>
              <span>亮度</span><span>{brightness}%</span>
            </div>
            <input type="range" min={5} max={100} step={5} value={brightness}
              onChange={e => setBrightness(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--tap-accent)' }}
            />
          </div>

          {/* Color temperature slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--tap-text-3)', display: 'flex', justifyContent: 'space-between' }}>
              <span>色温</span><span>{colorTemp}K</span>
            </div>
            <input type="range" min={2000} max={10000} step={100} value={colorTemp}
              onChange={e => setColorTemp(Number(e.target.value))}
              style={{ width: '100%', accentColor: colorTemp < 4000 ? '#ffb74d' : colorTemp < 6000 ? '#fff' : '#90caf9' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--tap-text-4)' }}>
              <span>暖光</span><span>日光</span><span>冷光</span>
            </div>
          </div>

          {/* Prompt + send */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 10px', flexShrink: 0,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 'var(--tap-r-lg)',
          }}>
            <textarea
              value={relightPrompt}
              onChange={e => setRelightPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="描述光照效果（可选，留空自动生成）…"
              rows={2}
              style={{
                flex: 1, background: 'transparent', border: 'none',
                padding: '4px 0', fontSize: 'var(--tap-fs-body)',
                color: 'var(--tap-text-1)', resize: 'none', outline: 'none',
                lineHeight: 1.5,
              }}
            />
            <button
              onClick={handleSend}
              disabled={isProcessing}
              style={{
                width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                background: isProcessing ? 'var(--tap-warning)' : 'var(--tap-accent)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: isProcessing ? '16px' : '13px',
                cursor: 'pointer', border: 'none',
                animation: isProcessing ? 'tap-pulse-glow 1.5s ease infinite' : 'none',
              }}
            >{isProcessing ? '⏳' : '↑'}</button>
          </div>
        </div>
      </div>
    </ToolOverlay>
  );
}

// ─── Multi-Angle Tool ──────────────────────────────
// Camera/view angle presets for multi-angle sphere
const CAMERA_PRESETS: [string, number, number][] = [
  ['正面', 0, 0],
  ['左前45°', -45, 0],
  ['右前45°', 45, 0],
  ['左侧', -90, 0],
  ['右侧', 90, 0],
  ['后方', 180, 0],
  ['俯视', 0, 60],
  ['仰视', 0, -60],
];

export function MultiAngleTool({ imageUrl, onApply, onClose }: ToolBaseProps) {
  const sphereSize = 220;
  const [horizAngle, setHorizAngle] = useState(0);
  const [vertAngle, setVertAngle] = useState(0);
  const [count, setCount] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const sphereRef = useRef<HTMLDivElement>(null);

  const hRad = (horizAngle * Math.PI) / 180;
  const vRad = (vertAngle * Math.PI) / 180;
  const r = sphereSize / 2 - 10;
  const dotX = r * Math.cos(vRad) * Math.sin(hRad);
  const dotY = -r * Math.sin(vRad);

  const vHRad = hRad; const vVRad = vRad;
  const eqRy = Math.max(2, r * Math.abs(Math.sin(vVRad)) + 2);
  const mRx = Math.max(2, r * Math.abs(Math.sin(vHRad)) + 2);
  const fx = sphereSize/2 + r * Math.sin(vHRad);
  const fy = sphereSize/2 - r * Math.cos(vHRad) * Math.sin(vVRad);
  const bx = sphereSize/2 - r * Math.sin(vHRad);
  const by = sphereSize/2 + r * Math.cos(vHRad) * Math.sin(vVRad);
  const thumbRotateY = -horizAngle * 0.55;
  const thumbRotateX = -vertAngle * 0.45;
  const dotSize = 10;

  const getDotPosition = (e: React.MouseEvent) => {
    const el = sphereRef.current; if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx, dy = e.clientY - cy;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const clampedR = Math.min(dist, r - 4);
    const scale = dist > 0 ? clampedR / dist : 0;
    return { dx: dx*scale, dy: dy*scale, cx, cy, r };
  };

  const updateAnglesFromPos = (pos: { dx: number; dy: number; r: number }) => {
    const h = Math.atan2(pos.dx, Math.sqrt(pos.r*pos.r - pos.dx*pos.dx - pos.dy*pos.dy)) * 180 / Math.PI;
    const v = -Math.asin(Math.max(-1, Math.min(1, pos.dy / pos.r))) * 180 / Math.PI;
    setHorizAngle(Math.round(h/5)*5); setVertAngle(Math.round(v/5)*5);
  };

  const handleMouseDown = (e: React.MouseEvent) => { setIsDragging(true); const p = getDotPosition(e); if (p) updateAnglesFromPos(p); };
  const handleMouseMove = (e: React.MouseEvent) => { if (!isDragging) return; const p = getDotPosition(e); if (p) updateAnglesFromPos(p); };
  const handleMouseUp = () => setIsDragging(false);
  useEffect(() => { if (!isDragging) return; const up = () => setIsDragging(false); window.addEventListener('mouseup', up); return () => window.removeEventListener('mouseup', up); }, [isDragging]);

  const handleApply = () => { if (isProcessing) return; setIsProcessing(true); onApply({ tool: 'multiAngle', horizAngle, vertAngle, count }); };

  return (
    <ToolOverlay title="多角度生成" onClose={onClose}>
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* 3D Camera Sphere */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#1a1a1e', borderRadius: 'var(--tap-r-lg)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '4px', width: `${sphereSize}px` }}>
            {CAMERA_PRESETS.map(([label, h, v]) => {
              const active = horizAngle === h && vertAngle === v;
              return (<button key={label} onClick={() => { setHorizAngle(h); setVertAngle(v); }} style={{ padding: '3px 6px', fontSize: '11px', borderRadius: 'var(--tap-r-sm)', background: active ? 'var(--tap-accent)' : 'rgba(255,255,255,0.06)', color: active ? '#fff' : 'var(--tap-text-3)', border: active ? '1px solid var(--tap-accent)' : '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', transition: 'all 0.15s' }}>{label}</button>);
            })}
          </div>
          <div ref={sphereRef} style={{ width: sphereSize, height: sphereSize, position: 'relative', cursor: isDragging ? 'grabbing' : 'grab' }}
            onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
            <svg width={sphereSize} height={sphereSize} style={{ position: 'absolute', top: 0, left: 0, zIndex: 1, pointerEvents: 'none' }}>
              <defs>
                <radialGradient id="maShade" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0)" /><stop offset="50%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="70%" stopColor="rgba(180,180,180,0.06)" /><stop offset="85%" stopColor="rgba(180,180,180,0.18)" />
                  <stop offset="100%" stopColor="rgba(170,170,170,0.32)" />
                </radialGradient>
                <clipPath id="maClip"><circle cx={sphereSize/2} cy={sphereSize/2} r={r} /></clipPath>
              </defs>
              <circle cx={sphereSize/2} cy={sphereSize/2} r={r} fill="url(#maShade)" />
              <g clipPath="url(#maClip)">
                <ellipse cx={sphereSize/2} cy={sphereSize/2} rx={r} ry={eqRy} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.8" />
                <ellipse cx={sphereSize/2} cy={sphereSize/2} rx={mRx} ry={r} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.6" />
                <circle cx={fx} cy={fy} r={3.5} fill="rgba(255,255,255,0.9)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
                <circle cx={bx} cy={by} r={2.5} fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
              </g>
              <circle cx={sphereSize/2} cy={sphereSize/2} r={r} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.6" />
            </svg>
            {imageUrl && <div style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) perspective(400px) rotateY(${thumbRotateY}deg) rotateX(${thumbRotateX}deg)`, transition: 'transform 0.5s cubic-bezier(0.22, 0.61, 0.36, 1)', width: 65, height: 65, borderRadius: '6px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.4)', boxShadow: '4px 8px 20px rgba(0,0,0,0.65)', pointerEvents: 'none', zIndex: 2, background: '#1a1a1a' }}><img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} /></div>}
            <div style={{ position: 'absolute', left: sphereSize/2 + dotX - dotSize/2, top: sphereSize/2 + dotY - dotSize/2, width: dotSize, height: dotSize, borderRadius: '50%', background: 'rgba(100,180,255,0.85)', boxShadow: '0 0 12px rgba(100,180,255,0.6)', border: '2px solid rgba(180,220,255,0.9)', pointerEvents: 'none', transition: isDragging ? 'none' : 'all 0.15s', zIndex: 3 }} />
            <div style={{ position: 'absolute', left: sphereSize/2 - 2, top: sphereSize/2 - 2, width: 4, height: 4, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', pointerEvents: 'none', zIndex: 3 }} />
          </div>
          <div style={{ position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)', fontSize: '11px', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }}>拖拽光点选择相机视角 · H:{horizAngle}° V:{vertAngle}°</div>
        </div>
        {/* Controls */}
        <div style={{ width: '160px', display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 0' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--tap-text-3)' }}>生成数量</div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1,2,4].map(n => (<button key={n} onClick={() => setCount(n)} style={{ flex: 1, padding: '6px 0', borderRadius: 'var(--tap-r-sm)', background: count===n ? 'var(--tap-accent)' : 'rgba(255,255,255,0.06)', color: count===n ? '#fff' : 'var(--tap-text-2)', fontSize: '13px', fontWeight: count===n?600:400, cursor: 'pointer', border: count===n ? '1px solid var(--tap-accent)' : '1px solid rgba(255,255,255,0.08)' }}>{n}张</button>))}
            </div>
          </div>
          <button onClick={handleApply} disabled={isProcessing} style={{ ...applyBtnStyle, opacity: isProcessing ? 0.5 : 1, cursor: isProcessing ? 'default' : 'pointer', marginTop: 'auto' }}>{isProcessing ? '生成中...' : `生成 ${count} 张`}</button>
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

