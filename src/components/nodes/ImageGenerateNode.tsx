/* === ImageGenerateNode — TapNow-style image generation === */
/* Phase 2 refined: borderless tools, distant handles, fullscreen overlay */

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position } from '@xyflow/react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { Panel } from '../shared';
import type { ImageGenMeta, CropRect } from '../../types/graph';

interface ImageGenNodeData {
  imageUrl?: string;
  gen: ImageGenMeta;
  status?: string;
  thumbnails?: string[];
  isConnecting?: boolean;
  isConnectTarget?: boolean;
  multiSelect?: boolean;
  isPickMode?: boolean;
  isPickTarget?: boolean;
  refUrls?: string[];
  styleImageUrl?: string;
  onChange?: (patch: Partial<ImageGenMeta>) => void;
  onGenerate?: () => void;
  onFullscreen?: (url: string, prompt: string, model: string, aspect: string, quality: string) => void;
  // Crop mode
  isCropping?: boolean;
  onCropStart?: () => void;
  onCropApply?: (croppedDataUrl: string, cropW: number, cropH: number) => void;
  onCropCancel?: () => void;
  onOpenTool?: (toolName: string) => void;
}

const ASPECT_OPTIONS = [
  { label: '1:1', w: 1, h: 1 },
  { label: '2:3', w: 2, h: 3 },
  { label: '3:2', w: 3, h: 2 },
  { label: '3:4', w: 3, h: 4 },
  { label: '4:3', w: 4, h: 3 },
  { label: '4:5', w: 4, h: 5 },
  { label: '5:4', w: 5, h: 4 },
  { label: '9:16', w: 9, h: 16 },
  { label: '16:9', w: 16, h: 9 },
  { label: '9:21', w: 9, h: 21 },
  { label: '21:9', w: 21, h: 9 },
];

function ratioBoxSize(w: number, h: number) {
  const maxSide = 26;
  const scale = maxSide / Math.max(w, h);
  return { width: `${Math.round(w * scale)}px`, height: `${Math.round(h * scale)}px` };
}

const MODEL_OPTIONS = [
  { name: 'Nano Banana', badges: ['推荐'], maxRes: '4K', features: ['inpaint', 'multi-angle'] },
  { name: 'GPT Image2', badges: ['热门'], maxRes: '4K', features: ['t2i'] },
  { name: 'GPT Image2 I2I', badges: [], maxRes: '4K', features: ['i2i'] },
];

const RESOLUTION_OPTIONS = [
  { label: '1K', desc: '1024×1024' },
  { label: '2K', desc: '1792×1024' },
  { label: '4K', desc: '2048×2048' },
];

import { memo } from 'react';

function ImageGenerateNodeInner({ id, data, selected }: { id: string; data: ImageGenNodeData; selected?: boolean }) {
  const gen = data.gen || {};
  const [prompt, setPrompt] = useState(gen.prompt || '');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showRatioPicker, setShowRatioPicker] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [currentModel, setCurrentModel] = useState(gen.model || 'GPT Image2');
  const [currentAspect, setCurrentAspect] = useState(gen.aspect || '16:9');
  const [currentResolution, setCurrentResolution] = useState(gen.resolution || '2K');
  const [showResolutionPicker, setShowResolutionPicker] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // @mention — reference connected nodes
  const [showAtMention, setShowAtMention] = useState(false);
  const [atMentions, setAtMentions] = useState<{name: string; url: string}[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const [imgHeight, setImgHeight] = useState(220);
  const [cardRect, setCardRect] = useState<DOMRect | null>(null);
  const readyRef = useRef(false);
  const zoom = useCanvasStore(s => s.viewport.zoom);
  // ─── Picker trigger refs (for portal positioning outside overflow:hidden) ──
  const modelChipRef = useRef<HTMLSpanElement>(null);
  const ratioChipRef = useRef<HTMLSpanElement>(null);
  const resolutionChipRef = useRef<HTMLSpanElement>(null);
  const styleChipRef = useRef<HTMLSpanElement>(null);
  const styleFileRef = useRef<HTMLInputElement>(null);
  const [modelChipRect, setModelChipRect] = useState<DOMRect | null>(null);
  const [ratioChipRect, setRatioChipRect] = useState<DOMRect | null>(null);
  const [resolutionChipRect, setResolutionChipRect] = useState<DOMRect | null>(null);
  const [styleImgUrl, setStyleImgUrl] = useState<string | null>(data.gen?.styleImageUrl as string || null);

  // ─── Crop state ────────────────────────────────
  const CROP_RATIOS = [
    { label: '自由', w: 0, h: 0 },
    { label: '1:1', w: 1, h: 1 },
    { label: '4:3', w: 4, h: 3 },
    { label: '3:4', w: 3, h: 4 },
    { label: '16:9', w: 16, h: 9 },
    { label: '9:16', w: 9, h: 16 },
  ];
  const [cropRect, setCropRect] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
  const [cropRatio, setCropRatio] = useState(CROP_RATIOS[0]);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startRect: { x: 0, y: 0, w: 0, h: 0 }, handle: '' });
  const imgRef = useRef<HTMLImageElement>(null);

  // Build @mention list from connected refUrls
  const getMentionList = useCallback(() => {
    const list: {name: string; url: string}[] = [];
    if (data.refUrls) {
      const store = useCanvasStore.getState();
      data.refUrls.forEach(url => {
        store.nodes.forEach(node => {
          const imgUrl = (node.meta?.gen as any)?.imageUrl;
          if (imgUrl === url && !list.find(m => m.url === url)) {
            list.push({ name: node.title || 'IMAGE', url });
          }
        });
      });
    }
    if (styleImgUrl) list.push({ name: '风格参考', url: styleImgUrl });
    return list;
  }, [data.refUrls, styleImgUrl]);

  // Capture trigger rect when picker opens — portal renders outside overflow
  useEffect(() => { if (showModelPicker && modelChipRef.current) setModelChipRect(modelChipRef.current.getBoundingClientRect()); }, [showModelPicker]);
  useEffect(() => { if (showRatioPicker && ratioChipRef.current) setRatioChipRect(ratioChipRef.current.getBoundingClientRect()); }, [showRatioPicker]);
  useEffect(() => { if (showResolutionPicker && resolutionChipRef.current) setResolutionChipRect(resolutionChipRef.current.getBoundingClientRect()); }, [showResolutionPicker]);

  useEffect(() => {
    if (!selected || !cardRef.current) { setCardRect(null); readyRef.current = false; return; }
    readyRef.current = false;
    setCardRect(null);
    let raf = 0;
    const update = () => {
      if (cardRef.current) {
        setCardRect(cardRef.current.getBoundingClientRect());
        readyRef.current = true;
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [selected]);

  useEffect(() => {
    if (!cardRef.current) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width;
      const [rw, rh] = currentAspect.split(':').map(Number);
      if (rw && rh && w > 100) setImgHeight(Math.round(w * rh / rw));
    });
    ro.observe(cardRef.current);
    return () => ro.disconnect();
  }, [currentAspect]);

  // ─── Crop: initialize rect when entering crop mode ──
  useEffect(() => {
    if (data.isCropping && cardRef.current) {
      const cw = cardRef.current.offsetWidth;
      const ch = imgHeight;
      const margin = 0.1;
      setCropRect({
        x: cw * margin,
        y: ch * margin,
        w: cw * (1 - 2 * margin),
        h: ch * (1 - 2 * margin),
      });
      setCropRatio(CROP_RATIOS[0]);
    }
  }, [data.isCropping]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Crop: ratio change → snap crop rect to match ──
  useEffect(() => {
    if (!data.isCropping) return;
    if (cropRatio.w === 0 || cropRatio.h === 0) return; // free mode
    const container = cardRef.current;
    if (!container) return;
    const cw = container.offsetWidth;
    const ch = imgHeight;
    const targetRatio = cropRatio.w / cropRatio.h;

    // Keep center, MAXIMIZE area within container
    const cx = cropRect.x + cropRect.w / 2;
    const cy = cropRect.y + cropRect.h / 2;
    // How far can we expand from center to each edge?
    const maxHalfW = Math.min(cx, cw - cx);
    const maxHalfH = Math.min(cy, ch - cy);
    // Fit ratio into available space
    let halfW = maxHalfW;
    let halfH = halfW / targetRatio;
    if (halfH > maxHalfH) { halfH = maxHalfH; halfW = halfH * targetRatio; }
    // Minimum 20px total
    halfW = Math.max(10, halfW);
    halfH = Math.max(10, halfH);

    setCropRect({
      x: cx - halfW,
      y: cy - halfH,
      w: halfW * 2,
      h: halfH * 2,
    });
  }, [cropRatio]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Crop: drag gesture ──
  useEffect(() => {
    if (!isDragging) return;
    const container = cardRef.current;
    if (!container) return;
    const cw = container.offsetWidth;
    const ch = imgHeight;

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const sr = dragRef.current.startRect;
      const h = dragRef.current.handle;
      let newRect = { x: sr.x, y: sr.y, w: sr.w, h: sr.h };

      // ── Move ──
      if (h === 'move') {
        newRect.x = Math.max(0, Math.min(cw - sr.w, sr.x + dx));
        newRect.y = Math.max(0, Math.min(ch - sr.h, sr.y + dy));
      }

      // ── Resize: corner handles (anchor = opposite corner) ──
      if (h === 'se') { newRect.w = Math.max(20, sr.w + dx); newRect.h = Math.max(20, sr.h + dy); }
      if (h === 'sw') { newRect.x = Math.min(sr.x + sr.w - 20, sr.x + dx); newRect.w = sr.x + sr.w - newRect.x; newRect.h = Math.max(20, sr.h + dy); }
      if (h === 'ne') { newRect.w = Math.max(20, sr.w + dx); newRect.y = Math.min(sr.y + sr.h - 20, sr.y + dy); newRect.h = sr.y + sr.h - newRect.y; }
      if (h === 'nw') { newRect.x = Math.min(sr.x + sr.w - 20, sr.x + dx); newRect.w = sr.x + sr.w - newRect.x; newRect.y = Math.min(sr.y + sr.h - 20, sr.y + dy); newRect.h = sr.y + sr.h - newRect.y; }

      // ── Resize: edge handles ──
      if (h === 'e') { newRect.w = Math.max(20, sr.w + dx); }
      if (h === 'w') { newRect.x = Math.min(sr.x + sr.w - 20, sr.x + dx); newRect.w = sr.x + sr.w - newRect.x; }
      if (h === 's') { newRect.h = Math.max(20, sr.h + dy); }
      if (h === 'n') { newRect.y = Math.min(sr.y + sr.h - 20, sr.y + dy); newRect.h = sr.y + sr.h - newRect.y; }

      // ── Container clamp + ratio constraint ──
        const shiftHeld = e.shiftKey;
        let targetRatio: number | null = null;
        if (cropRatio.w > 0 && cropRatio.h > 0) {
          targetRatio = cropRatio.w / cropRatio.h;
        } else if (shiftHeld) {
          targetRatio = sr.w / sr.h;
        }

        if (h !== 'move') {
          // Step 1: clamp raw resize to container (never exceed bounds)
          newRect.x = Math.max(0, newRect.x);
          newRect.y = Math.max(0, newRect.y);
          newRect.w = Math.min(cw - newRect.x, Math.max(20, newRect.w));
          newRect.h = Math.min(ch - newRect.y, Math.max(20, newRect.h));

          if (targetRatio) {
            if (h === 'se' || h === 'ne' || h === 'sw' || h === 'nw') {
              // CORNER: anchor is opposite corner — shrink oversized dimension
              if (newRect.w / newRect.h > targetRatio) {
                const oldW = newRect.w;
                newRect.w = newRect.h * targetRatio;
                if (h === 'sw' || h === 'nw') newRect.x += oldW - newRect.w;
              } else {
                const oldH = newRect.h;
                newRect.h = newRect.w / targetRatio;
                if (h === 'ne' || h === 'nw') newRect.y += oldH - newRect.h;
              }
            } else if (h === 'e' || h === 'w') {
              // EDGE (horizontal): height from center, capped by container
              const centerY = sr.y + sr.h / 2;
              newRect.h = newRect.w / targetRatio;
              if (newRect.h > ch) { newRect.h = ch; newRect.w = ch * targetRatio; }
              newRect.y = Math.max(0, Math.min(ch - newRect.h, centerY - newRect.h / 2));
            } else {
              // EDGE (vertical): width from center, capped by container
              const centerX = sr.x + sr.w / 2;
              newRect.w = newRect.h * targetRatio;
              if (newRect.w > cw) { newRect.w = cw; newRect.h = cw / targetRatio; }
              newRect.x = Math.max(0, Math.min(cw - newRect.w, centerX - newRect.w / 2));
            }
          }
          // Final boundary safety
          newRect.x = Math.max(0, newRect.x);
          newRect.y = Math.max(0, newRect.y);
          if (newRect.x + newRect.w > cw) newRect.w = cw - newRect.x;
          if (newRect.y + newRect.h > ch) newRect.h = ch - newRect.y;
          newRect.w = Math.max(20, newRect.w);
          newRect.h = Math.max(20, newRect.h);
        }

        setCropRect({ x: newRect.x, y: newRect.y, w: newRect.w, h: newRect.h });
    };

    const onUp = () => { setIsDragging(false); };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [isDragging, imgHeight, cropRatio]); // eslint-disable-line react-hooks/exhaustive-deps

  const startDrag = (e: React.PointerEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startRect: { ...cropRect }, handle };
    setIsDragging(true);
  };

  // ─── Crop: apply (canvas crop → data URL) ──
  // Use refs so this callback is stable — never changes, no effect thrashing
  const cropRectRef = useRef(cropRect);
  cropRectRef.current = cropRect;
  const imgHeightRef = useRef(imgHeight);
  imgHeightRef.current = imgHeight;
  const onCropApplyRef = useRef(data.onCropApply);
  onCropApplyRef.current = data.onCropApply;
  const onCropCancelRef = useRef(data.onCropCancel);
  onCropCancelRef.current = data.onCropCancel;

  const [cropError, setCropError] = useState<string | null>(null);
  const [cropSuccess, setCropSuccess] = useState(false);

  const handleCropApply = useCallback(() => {
    setCropError(null);
    const img = imgRef.current;
    const container = cardRef.current;
    console.log('[crop] handleCropApply called. img:', !!img, 'container:', !!container);
    if (!img || !container) { setCropError('图片元素未找到'); return; }
    const cw = container.offsetWidth;
    const ch = imgHeightRef.current;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    console.log('[crop] container:', cw, 'x', ch, 'image natural:', iw, 'x', ih);
    if (!iw || !ih) { setCropError('图片未完全加载，请稍后重试'); return; }

    const rect = cropRectRef.current;
    console.log('[crop] cropRect:', rect);
    // object-fit:contain math
    const containerAspect = cw / ch;
    const imageAspect = iw / ih;
    let displayW: number, displayH: number, offsetX: number, offsetY: number;
    if (imageAspect > containerAspect) {
      displayW = cw;
      displayH = cw / imageAspect;
      offsetX = 0;
      offsetY = (ch - displayH) / 2;
    } else {
      displayH = ch;
      displayW = ch * imageAspect;
      offsetX = (cw - displayW) / 2;
      offsetY = 0;
    }

    const scaleX = iw / displayW;
    const scaleY = ih / displayH;
    const srcX = Math.max(0, (rect.x - offsetX) * scaleX);
    const srcY = Math.max(0, (rect.y - offsetY) * scaleY);
    const srcW = Math.min(iw - srcX, rect.w * scaleX);
    const srcH = Math.min(ih - srcY, rect.h * scaleY);
    console.log('[crop] source region:', Math.round(srcX), Math.round(srcY), Math.round(srcW), Math.round(srcH));

    if (srcW < 1 || srcH < 1) { setCropError('裁切区域太小'); return; }

    // Use backend proxy to bypass CORS for external images
    const doCrop = (source: CanvasImageSource) => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(srcW);
      canvas.height = Math.round(srcH);
      const ctx = canvas.getContext('2d');
      if (!ctx) { setCropError('Canvas 创建失败'); return; }
      ctx.drawImage(source, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
      const dataUrl = canvas.toDataURL('image/png');
      const cropW = Math.round(srcW);
      const cropH = Math.round(srcH);
      console.log('[crop] SUCCESS: ' + cropW + 'x' + cropH + ', dataUrl length: ' + dataUrl.length);
      setCropSuccess(true);
      onCropApplyRef.current?.(dataUrl, cropW, cropH);
    };

    const imgSrc = img.src;
    // data: URLs and same-origin images work directly
    if (imgSrc.startsWith('data:') || imgSrc.startsWith(window.location.origin)) {
      try {
        const testCanvas = document.createElement('canvas');
        testCanvas.width = 1; testCanvas.height = 1;
        const testCtx = testCanvas.getContext('2d');
        testCtx?.drawImage(img, 0, 0, 1, 1, 0, 0, 1, 1);
        testCanvas.toDataURL();
        doCrop(img);
        return;
      } catch (_e) { /* tainted, fall through to proxy */ }
    }

    // External images — proxy through backend to avoid CORS
    console.log('[crop] Using backend proxy for:', imgSrc.slice(0, 80));
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imgSrc)}`;
    const proxyImg = new Image();
    proxyImg.onload = () => {
      console.log('[crop] Proxy image loaded');
      doCrop(proxyImg);
    };
    proxyImg.onerror = () => {
      setCropError('图片代理加载失败，请稍后重试');
      console.warn('[crop] Proxy image load failed');
    };
    proxyImg.src = proxyUrl;
  }, []); // stable — never changes

  // ─── Crop: keyboard (Enter/Escape) ──
  useEffect(() => {
    if (!data.isCropping) return;
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Enter') { e.preventDefault(); handleCropApply(); }
      if (e.key === 'Escape') { onCropCancelRef.current?.(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [data.isCropping, handleCropApply]); // handleCropApply is now stable (empty deps)

  const patch = useCallback((k: keyof ImageGenMeta, v: unknown) => {
    data.onChange?.({ [k]: v });
  }, [data]);

  const [genRunning, setGenRunning] = useState(false);
  const genRunningRef = useRef(false);

  const handleGenerate = () => {
    if (genRunningRef.current || !prompt.trim()) return;
    genRunningRef.current = true;
    setGenRunning(true);
    patch('prompt', prompt);
    // onGenerate is async but we fire-and-forget — button stays ⏳ until node remounts with imageUrl
    Promise.resolve(data.onGenerate?.()).finally(() => {
      genRunningRef.current = false;
      setGenRunning(false);
    });
  };

  const handleDownload = () => {
    if (!data.imageUrl) return;
    // Proxy through backend to force download (cross-origin URLs won't download directly)
    const isData = data.imageUrl.startsWith('data:');
    const a = document.createElement('a');
    a.href = isData ? data.imageUrl : `/api/download?url=${encodeURIComponent(data.imageUrl)}`;
    a.download = `viewlab-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const toolbarActions = [
    { icon: 'crop-svg', label: '裁切', shortcut: 'C', onClick: () => { console.log('[crop] toolbar button clicked, onCropStart:', !!data.onCropStart); data.onCropStart?.(); } },
    { icon: '⊿', label: '多角度', shortcut: 'A', onClick: () => data.onOpenTool?.('multiAngle') },
    { icon: '◐', label: '重绘', shortcut: 'B', onClick: () => data.onOpenTool?.('inpaint') },
    { icon: 'relight-svg', label: '打光', shortcut: 'L', onClick: () => data.onOpenTool?.('relight') },
  ];

  const toolbarRight = [
    { icon: '⛶', label: '全屏', onClick: () => { if (data.onFullscreen) data.onFullscreen(data.imageUrl || '', prompt, currentModel, currentAspect, gen.resolution || '2K'); } },
    { icon: '↓', label: '下载', onClick: handleDownload },
  ];

  const moreActions = [
    { icon: '↕️', label: '扩图', onClick: () => data.onOpenTool?.('expand') },
    { icon: '◌', label: '抠图', onClick: () => data.onOpenTool?.('extract') },
    { icon: '⊕', label: '标注', onClick: () => data.onOpenTool?.('annotate') },
    { icon: '◇', label: '画质增强', onClick: () => data.onOpenTool?.('enhance') },
    { icon: '⊡', label: '像素调整', onClick: () => data.onOpenTool?.('resize') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Card wrapper — handles position relative to card, not full node */}
      <div style={{ position: 'relative' }}>
        <NodeLabel nodeId={id} initial={useCanvasStore(s => s.nodes.get(id)?.title) || 'IMAGE'} />
        {/* Ports — centered on both sides, close to node */}
        <Handle type="target" position={Position.Left} id="image-in"
          style={{
            width: '19px', height: '19px', background: 'var(--tap-panel)',
            border: '2px solid rgba(180,180,185,0.5)', borderRadius: '50%',
            left: '-20px', top: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, lineHeight: 1, color: 'rgba(180,180,185,0.7)',
          }}
        ><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg></Handle>
        <Handle type="source" position={Position.Right} id="image-out"
          style={{
            width: '19px', height: '19px', background: 'var(--tap-panel)',
            border: '2px solid rgba(180,180,185,0.5)', borderRadius: '50%',
            right: '-20px', top: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, lineHeight: 1, color: 'rgba(180,180,185,0.7)',
          }}
        ><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg></Handle>

        {/* ── Upload bar (portal) — shown when no image */}
        {selected && !data.multiSelect && cardRect && !data.imageUrl && createPortal(
        <div onClick={() => { /* trigger file upload via hidden input or drop */ }}
          style={{ position: 'fixed', left: cardRect.left + cardRect.width / 2, top: cardRect.top - 8, transform: 'translateX(-50%) translateY(-100%)', zIndex: 9998, display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 20px', background: 'rgba(22,26,34,0.92)', borderRadius: '14px 14px 0 0', backdropFilter: 'blur(16px)', boxShadow: '0 8px 24px rgba(0,0,0,0.45)', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none' }}>
          <span style={{ fontSize: '16px' }}>↑</span>
          <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--tap-text-2)' }}>上传</span>
        </div>,
        document.body
        )}
        {/* ── Floating Toolbar (portal) — shown when has image */}
        {selected && !data.multiSelect && cardRect && data.imageUrl && createPortal(
        <div style={{
          position: 'fixed',
          left: cardRect ? cardRect.left + cardRect.width / 2 : -9999,
          top: cardRect ? cardRect.top - 40 : -9999,
          transform: 'translateX(-50%) translateY(-100%)',
          zIndex: 9998,
          opacity: 1,
          pointerEvents: 'auto',
          transition: 'opacity 0.1s',
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          padding: '4px',
          background: 'rgba(22,26,34,0.92)',
          borderRadius: '12px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
          animation: 'tap-fade-down var(--tap-dur-fast) var(--tap-ease)',
        }}>
            {toolbarActions.map((a, i) => (
              <span key={a.label} style={{ display: 'flex' }}>
                <ToolBtn icon={a.icon} label={a.label} onClick={a.onClick} />
                {i === 3 && (
                  <span style={{ display: 'inline-block', width: '1px', height: '16px', background: 'rgba(255,255,255,0.08)', margin: '6px 2px', verticalAlign: 'middle' }} />
                )}
              </span>
            ))}
            {/* More */}
            <span style={{ position: 'relative', display: 'flex' }}>
              <ToolBtn icon="⋯" label="更多工具" active={showMore}
                onClick={() => { setShowMore(!showMore); setShowModelPicker(false); setShowRatioPicker(false); }}
              />
              {showMore && (
                <Panel style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: '200px',
                  padding: 'var(--tap-space-2)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  zIndex: 200,
                  animation: 'tap-fade-up var(--tap-dur-fast) var(--tap-ease)',
                }}>
                  {moreActions.map(a => (
                    <div key={a.label}
                      onClick={() => { a.onClick(); setShowMore(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        height: '36px', padding: '0 12px', borderRadius: 'var(--tap-r-md)',
                        cursor: 'pointer', fontSize: 'var(--tap-fs-body)', color: 'var(--tap-text-2)',
                        transition: `all var(--tap-dur-fast) var(--tap-ease)`,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--tap-hover)'; e.currentTarget.style.color = 'var(--tap-text-1)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tap-text-2)'; }}
                    >
                      <span style={{ fontSize: 'var(--tap-icon-size)' }}>{a.icon}</span>
                      <span>{a.label}</span>
                    </div>
                  ))}
                </Panel>
              )}
            </span>

            {/* Right-side actions (fullscreen, download) */}
            <span style={{ display: 'inline-block', width: '1px', height: '16px', background: 'rgba(255,255,255,0.08)', margin: '6px 2px', verticalAlign: 'middle' }} />
            {toolbarRight.map(a => (
              <span key={a.label} style={{ display: 'flex' }}>
                <ToolBtn icon={a.icon} label={a.label} onClick={a.onClick} />
              </span>
            ))}
        </div>,
        document.body
      )}

        {/* ── Image Card (width based on aspect ratio) ── */}
        <div
        ref={cardRef}
        style={{
          width: 'var(--tap-node-width)',
          borderRadius: 'var(--tap-node-radius)',
          overflow: 'auto',
          resize: 'horizontal',
          border: data.isPickTarget
            ? '2px solid rgba(180,180,185,0.55)'
            : data.isPickMode
              ? '1px dashed rgba(180,180,185,0.3)'
              : data.isConnectTarget
                ? '1px solid rgba(180,180,185,0.5)'
                : selected ? '2px solid rgba(255,255,255,0.28)' : '1px solid var(--tap-border)',
          background: 'var(--tap-panel)',
          boxShadow: data.isPickTarget
            ? '0 0 32px rgba(180,180,185,0.25)'
            : data.isConnectTarget
              ? '0 0 32px rgba(180,180,185,0.2)'
              : selected ? 'var(--tap-shadow-md)' : 'var(--tap-shadow-sm)',
          transition: `border var(--tap-dur-fast) var(--tap-ease), box-shadow var(--tap-dur-fast) var(--tap-ease)`,
          cursor: data.isPickMode && !data.isPickTarget ? 'pointer' : 'default',
          position: 'relative',
        }}
      >
        {/* Image area — height follows aspect ratio */}
        <div style={{
          width: '100%',
          height: imgHeight,
          background: data.imageUrl ? '#0a0a10' : 'linear-gradient(135deg, rgba(180,180,185,0.05) 0%, rgba(180,180,185,0.01) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {data.imageUrl ? (
            <img ref={imgRef} src={data.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          ) : (
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              border: '2px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0.25,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}

          {/* ── Photoshop-style Crop Overlay ── */}
          {data.isCropping && (() => {
            const handles = [
              { id: 'nw', top: -4, left: -4, cursor: 'nwse-resize' },
              { id: 'n',  top: -4, left: '50%', ml: -4, cursor: 'ns-resize' },
              { id: 'ne', top: -4, right: -4, cursor: 'nesw-resize' },
              { id: 'e',  top: '50%', mt: -4, right: -4, cursor: 'ew-resize' },
              { id: 'se', bottom: -4, right: -4, cursor: 'nwse-resize' },
              { id: 's',  bottom: -4, left: '50%', ml: -4, cursor: 'ns-resize' },
              { id: 'sw', bottom: -4, left: -4, cursor: 'nesw-resize' },
              { id: 'w',  top: '50%', mt: -4, left: -4, cursor: 'ew-resize' },
            ];
            const borderColor = 'rgba(255,255,255,0.8)';
            return (
              <>
                {/* Dark overlay + crop window (box-shadow creates the dark outside) */}
                <div
                  onPointerDown={(e) => { e.stopPropagation(); startDrag(e, 'move'); }}
                  style={{
                    position: 'absolute', zIndex: 20,
                    left: cropRect.x, top: cropRect.y,
                    width: cropRect.w, height: cropRect.h,
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.62)',
                    cursor: 'move',
                    pointerEvents: 'auto',
                  }}
                >
                  {/* Border line */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    border: `1px solid ${borderColor}`,
                    pointerEvents: 'none',
                  }} />
                  {/* Inner shadow for depth */}
                  <div style={{
                    position: 'absolute', inset: 1,
                    border: '1px solid rgba(0,0,0,0.25)',
                    pointerEvents: 'none',
                  }} />
                </div>

                {/* Handle + guide container — positioned exactly at crop rect */}
                <div style={{
                  position: 'absolute', zIndex: 25,
                  left: cropRect.x, top: cropRect.y,
                  width: cropRect.w, height: cropRect.h,
                  pointerEvents: 'none',
                }}>
                  {/* Resize handles — now relative to crop rect */}
                  {handles.map(h => (
                    <div key={h.id}
                      onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); startDrag(e, h.id); }}
                      style={{
                        position: 'absolute',
                        width: 8, height: 8,
                        background: '#fff',
                        border: '1px solid rgba(0,0,0,0.5)',
                        boxShadow: '0 0 2px rgba(0,0,0,0.3)',
                        cursor: h.cursor,
                        top: h.top, bottom: h.bottom,
                        left: h.left, right: h.right,
                        marginTop: h.mt, marginLeft: h.ml,
                        pointerEvents: 'auto',
                      }}
                    />
                  ))}
                  {/* Rule-of-thirds guides */}
                  {[1/3, 2/3].map((f, i) => (
                    <div key={i}>
                      <div style={{ position: 'absolute', top: `${f * 100}%`, left: 0, right: 0, borderTop: '1px solid rgba(255,255,255,0.08)' }} />
                      <div style={{ position: 'absolute', left: `${f * 100}%`, top: 0, bottom: 0, borderLeft: '1px solid rgba(255,255,255,0.08)' }} />
                    </div>
                  ))}
                </div>
              </>
            );
          })()}

        </div>
      </div>

      {/* ── Crop floating toolbar (portal above the card, Photoshop-style options bar) ── */}
      {data.isCropping && cardRect && (() => {
        const cw = cardRef.current?.offsetWidth || 380;
        return createPortal(
        <div style={{
          position: 'fixed',
          left: cardRect.left + cw / 2,
          top: cardRect.top - 48,
          transform: 'translateX(-50%)',
          zIndex: 9999,
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 12px',
          background: 'rgba(30,32,38,0.96)',
          borderRadius: '10px',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          pointerEvents: 'auto',
          animation: 'tap-fade-down var(--tap-dur-fast) var(--tap-ease)',
        }}>
          <span style={{ fontSize: '11px', color: 'var(--tap-text-4)', fontWeight: 500, marginRight: '4px' }}>比例</span>
          {CROP_RATIOS.map(r => {
            const isActive = cropRatio.label === r.label;
            return (
              <button key={r.label}
                onClick={() => setCropRatio(r)}
                style={{
                  padding: '3px 12px', borderRadius: '6px',
                  fontSize: '12px', fontWeight: isActive ? 600 : 400,
                  background: isActive ? 'rgba(255,255,255,0.14)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--tap-text-3)',
                  border: 'none', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--tap-text-3)'; }}
              >{r.label}</button>
            );
          })}
          <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
          <button
            onClick={handleCropApply}
            style={{
              padding: '5px 16px', borderRadius: '7px',
              fontSize: '12px', fontWeight: 600,
              background: 'var(--tap-accent)', color: '#fff',
              border: 'none', cursor: 'pointer',
              letterSpacing: '0.02em',
            }}
          >Enter ↵</button>
          <button
            onClick={() => data.onCropCancel?.()}
            style={{
              padding: '4px 10px', borderRadius: '7px',
              fontSize: '11px', fontWeight: 500,
              background: 'transparent', color: 'var(--tap-text-3)',
              border: 'none', cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--tap-text-3)'; e.currentTarget.style.background = 'transparent'; }}
          >Esc 取消</button>
          {/* Crop status feedback */}
          {cropError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--tap-danger)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cropError}</span>
              <span onClick={() => setCropError(null)} style={{ fontSize: '12px', color: 'var(--tap-text-4)', cursor: 'pointer' }}>✕</span>
            </div>
          )}
          {cropSuccess && (
            <span style={{ fontSize: '11px', color: 'var(--tap-success)', fontWeight: 500 }}>✓ 裁切完成</span>
          )}
        </div>,
        document.body
      );})()}

      {/* ── Bottom Prompt Panel (inline — scales with zoom) ── */}
      {selected && !data.multiSelect && (
        <div
          onContextMenu={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
          style={{
          position: 'absolute',
          top: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          transformOrigin: 'top center',
          width: `${380/zoom}px`,
          fontSize: `${14/zoom}px`,
          marginTop: `${10/zoom}px`,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Reference strip */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '6px', minHeight: 44, alignItems: 'center' }}>
            {data.refUrls && data.refUrls.map((uri, i) => (
              <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                <img src={uri} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                {/* Number badge — used in prompt as #1, #2, ... */}
                <div style={{ position: 'absolute', top: -5, left: -5, width: 15, height: 15, borderRadius: '50%', background: 'var(--tap-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, lineHeight: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>#{i + 1}</div>
                <span onClick={e => {
                  e.stopPropagation();
                  e.preventDefault();
                  const store = useCanvasStore.getState();
                  const toRemove: string[] = [];
                  store.edges.forEach(edge => {
                    if (edge.to.nodeId === id) {
                      const src = store.nodes.get(edge.from.nodeId);
                      if (src && (src.meta?.gen as any)?.imageUrl === uri) toRemove.push(edge.id);
                    }
                  });
                  toRemove.forEach(eid => store.removeEdge(eid));
                  // Keep node selected
                  store.setSelectedNodes([id]);
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
            {/* Style image thumbnail — also gets a number slot */}
            {styleImgUrl && (() => {
              const styleNum = (data.refUrls?.length || 0) + 1;
              return (
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img src={styleImgUrl} alt="风格参考" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', border: '1.5px solid rgba(200,160,100,0.4)' }} />
                <div style={{ position: 'absolute', top: -5, left: -5, width: 15, height: 15, borderRadius: '50%', background: 'rgba(200,160,100,0.85)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, lineHeight: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>#{styleNum}</div>
                <span
                  onClick={e => {
                    e.stopPropagation();
                    e.preventDefault();
                    setStyleImgUrl(null);
                    data.onChange?.({ styleImageUrl: null } as any);
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
                <div style={{ position: 'absolute', bottom: -2, left: -2, fontSize: '8px', color: 'rgba(200,160,100,0.8)', background: 'rgba(0,0,0,0.6)', borderRadius: '2px', padding: '0 3px', lineHeight: '12px' }}>风格</div>
              </div>
            );})()}
            {/* Slot counter + add button */}
            {(() => {
              const KIE_MAX = 16;
              const refCount = (data.refUrls?.length || 0) + (styleImgUrl ? 1 : 0);
              const slotsLeft = KIE_MAX - refCount;
              const isFull = slotsLeft <= 0;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  {/* Counter badge */}
                  {refCount > 0 && (
                    <span style={{
                      fontSize: '10px', fontWeight: 500, color: isFull ? 'var(--tap-warning)' : 'var(--tap-text-4)',
                      padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)',
                      whiteSpace: 'nowrap',
                    }}>{refCount}/{KIE_MAX}</span>
                  )}
                  {!isFull && (
                    <div
                      onClick={e => {
                        e.stopPropagation();
                        e.preventDefault();
                        useCanvasStore.getState().setPendingConnection(id);
                      }}
                      onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
                      onPointerDown={e => { e.stopPropagation(); e.preventDefault(); }}
                      title={`点击选择参考图节点 (剩余 ${slotsLeft} 个槽位)`}
                      style={{
                        width: 36, height: 36, borderRadius: 6,
                        border: '1px dashed rgba(255,255,255,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--tap-text-4)', fontSize: 16, flexShrink: 0,
                        cursor: 'pointer',
                        transition: `all var(--tap-dur-fast) var(--tap-ease)`,
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
                  {isFull && (
                    <div
                      title="参考图槽位已满 (16/16)"
                      style={{
                        width: 36, height: 36, borderRadius: 6,
                        border: '1px dashed rgba(255,100,80,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'rgba(255,100,80,0.3)', fontSize: 16, flexShrink: 0,
                        cursor: 'not-allowed',
                      }}
                    >⊘</div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Unified input panel — textarea wrapping all controls */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 'var(--tap-r-xl)',
            pointerEvents: 'auto',
          }}>
            {/* Textarea */}
            <div style={{ position: 'relative' }}>
              <textarea
                value={prompt}
                onChange={e => {
                  const val = e.target.value;
                  setPrompt(val);
                  // Detect @ trigger
                  const cursorPos = e.target.selectionStart || 0;
                  const textBefore = val.slice(0, cursorPos);
                  const atIdx = textBefore.lastIndexOf('@');
                  if (atIdx >= 0) {
                    const query = textBefore.slice(atIdx + 1);
                    if (!query.includes(' ')) {
                      const list = getMentionList();
                      console.log('[Mention] @ detected, list:', list?.length, 'items');
                      setShowAtMention(true);
                      setAtMentions(list);
                    } else {
                      setShowAtMention(false);
                    }
                  } else {
                    setShowAtMention(false);
                  }
                }}
                onPointerDownCapture={e => { e.stopPropagation() }}
                onMouseDownCapture={e => { e.stopPropagation() }}
                ref={el => { if (el) { el.onwheel = (e) => { e.stopPropagation(); }; } }}
                onKeyDown={e => {
                  if (showAtMention && e.key === 'Escape') { setShowAtMention(false); return; }
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
                }}
                placeholder=""
                maxLength={5000}
                rows={expanded ? 16 : 4}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--tap-r-xl) var(--tap-r-xl) 0 0',
                  padding: '12px 14px',
                  paddingRight: '40px',
                  fontSize: 'var(--tap-fs-body)',
                  color: 'var(--tap-text-1)',
                  resize: 'none',
                  outline: 'none',
                  lineHeight: 1.5,
                }}
              />
              {/* @mention popup */}
              {showAtMention && atMentions.length > 0 && (
                <div onMouseDown={e => e.preventDefault()} style={{
                  position: 'absolute', bottom: '100%', left: 0, right: 0,
                  background: 'var(--tap-panel)', border: '1px solid var(--tap-border)',
                  borderRadius: 'var(--tap-r-lg)', padding: '8px',
                  zIndex: 200, maxHeight: '180px', overflowY: 'auto',
                  display: 'flex', flexDirection: 'column', gap: '4px',
                  boxShadow: 'var(--tap-shadow-lg)',
                }}>
                  <div style={{ fontSize:'10px',color:'var(--tap-text-4)',padding:'2px 6px' }}>选择参考图 — 在 prompt 中用 #编号 指定每张图的用途</div>
                  {atMentions.map((m, i) => (
                    <div key={i}
                      onClick={() => {
                        const atIdx = prompt.lastIndexOf('@');
                        const before = prompt.slice(0, atIdx);
                        const after = prompt.slice(prompt.indexOf(' ', atIdx) > 0 ? prompt.indexOf(' ', atIdx) : prompt.length);
                        setPrompt(before + '@' + m.name + ' ' + after);
                        setShowAtMention(false);
                        // Add to reference images in generate request
                        const refs = [...(atMentions.filter(r => r.url !== m.url).map(r => r.url)), m.url];
                        data.onChange?.({ referenceUrls: refs } as any);
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--tap-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '6px', borderRadius: 'var(--tap-r-sm)',
                        cursor: 'pointer', background: 'transparent',
                        transition: `background var(--tap-dur-fast)`,
                      }}
                    >
                      <img src={m.url} alt="" style={{ width:36,height:36,borderRadius:4,objectFit:'cover' }} />
                      <div>
                        <div style={{ fontSize:'var(--tap-fs-body)',color:'var(--tap-text-1)',fontWeight:500 }}>@{m.name}</div>
                        <div style={{ fontSize:'10px',color:'var(--tap-text-4)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'200px' }}>{m.url}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Expand/collapse */}
              <button
                onClick={() => setExpanded(!expanded)}
                title={expanded ? '收起' : '展开'}
                style={{
                  position: 'absolute',
                  top: '10px', right: '10px',
                  width: '24px', height: '24px',
                  borderRadius: '4px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '12px',
                  color: 'var(--tap-text-4)',
                  background: 'transparent',
                  border: 'none', cursor: 'pointer',
                  transition: `all var(--tap-dur-fast) var(--tap-ease)`,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--tap-text-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tap-text-4)'; }}
              >
                {expanded ? '∧' : '∨'}
              </button>
              {prompt.length > 4500 && (
                <div style={{
                  position: 'absolute', bottom: '8px', right: '12px',
                  fontSize: 'var(--tap-fs-xs)',
                  color: prompt.length > 4900 ? 'var(--tap-danger)' : 'var(--tap-text-4)',
                }}>
                  {prompt.length}/5000
                </div>
              )}
            </div>

            {/* Bottom bar: model | ratio | style | send — all inline */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 12px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              flexWrap: 'wrap',
            }}>
              {/* Model picker */}
              <div style={{ position: 'relative' }}>
                <span ref={modelChipRef} style={{ display: 'inline-flex' }}>
                  <InlineChip
                    label={currentModel}
                    active={showModelPicker}
                    onClick={() => { setShowModelPicker(!showModelPicker); setShowRatioPicker(false); }}
                  />
                </span>
                {showModelPicker && (
                  <PickerDropdown onClose={() => setShowModelPicker(false)} anchorRect={modelChipRect}>
                    {MODEL_OPTIONS.map(m => (
                      <div key={m.name}
                        onClick={() => { setCurrentModel(m.name); patch('model', m.name); setShowModelPicker(false); }}
                        style={dropdownItemStyle(currentModel === m.name)}
                        onMouseEnter={e => { if (currentModel !== m.name) e.currentTarget.style.background = 'var(--tap-hover)'; }}
                        onMouseLeave={e => { if (currentModel !== m.name) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span>{m.name}</span>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          {m.badges.map(b => (
                            <span key={b} style={badgeStyle}>{b}</span>
                          ))}
                          <span style={{ fontSize: '10px', color: 'var(--tap-text-3)' }}>{m.maxRes}</span>
                        </div>
                      </div>
                    ))}
                  </PickerDropdown>
                )}
              </div>

              {/* Ratio picker */}
              <div style={{ position: 'relative' }}>
                <span ref={ratioChipRef} style={{ display: 'inline-flex' }}>
                  <InlineChip
                    label={currentAspect}
                    active={showRatioPicker}
                    onClick={() => { setShowRatioPicker(!showRatioPicker); setShowModelPicker(false); }}
                  />
                </span>
                {showRatioPicker && (
                  <PickerDropdown onClose={() => setShowRatioPicker(false)} anchorRect={ratioChipRect}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', padding: '6px' }}>
                      {ASPECT_OPTIONS.map(r => (
                        <div key={r.label}
                          onClick={() => { setCurrentAspect(r.label); patch('aspect', r.label); setShowRatioPicker(false); }}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                            padding: '8px 6px', borderRadius: 'var(--tap-r-md)',
                            cursor: 'pointer',
                            background: currentAspect === r.label ? 'var(--tap-hover)' : 'transparent',
                          }}
                          onMouseEnter={e => { if (currentAspect !== r.label) e.currentTarget.style.background = 'var(--tap-hover)'; }}
                          onMouseLeave={e => { if (currentAspect !== r.label) e.currentTarget.style.background = 'transparent'; }}
                        >
                          <div style={{
                            ...ratioBoxSize(r.w, r.h),
                            border: '1.5px solid var(--tap-text-2)',
                            borderRadius: '2px',
                          }} />
                          <span style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-1)' }}>{r.label}</span>
                        </div>
                      ))}
                    </div>
                  </PickerDropdown>
                )}
              </div>

              {/* Resolution picker (1K/2K/4K) */}
              <div style={{ position: 'relative' }}>
                <span ref={resolutionChipRef} style={{ display: 'inline-flex' }}>
                  <InlineChip
                    label={currentResolution}
                    active={showResolutionPicker}
                    onClick={() => { setShowResolutionPicker(!showResolutionPicker); setShowModelPicker(false); setShowRatioPicker(false); }}
                  />
                </span>
                {showResolutionPicker && (
                  <PickerDropdown onClose={() => setShowResolutionPicker(false)} anchorRect={resolutionChipRect}>
                    {RESOLUTION_OPTIONS.map(r => (
                      <div key={r.label}
                        onClick={() => { setCurrentResolution(r.label); patch('resolution', r.label); setShowResolutionPicker(false); }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          height: '38px', padding: '0 12px', borderRadius: 'var(--tap-r-md)',
                          cursor: 'pointer',
                          background: currentResolution === r.label ? 'var(--tap-hover)' : 'transparent',
                          color: 'var(--tap-text-1)', fontSize: 'var(--tap-fs-body)',
                        }}
                        onMouseEnter={e => { if (currentResolution !== r.label) e.currentTarget.style.background = 'var(--tap-hover)'; }}
                        onMouseLeave={e => { if (currentResolution !== r.label) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ fontWeight: 500 }}>{r.label}</span>
                        <span style={{ fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-text-4)' }}>{r.desc}</span>
                      </div>
                    ))}
                  </PickerDropdown>
                )}
              </div>

              {/* Style image upload — opens local file picker */}
              <div style={{ position: 'relative' }}>
                <span ref={styleChipRef} style={{ display: 'inline-flex' }}>
                  <InlineChip
                    label={styleImgUrl ? '风格 ✓' : '风格'}
                    active={!!styleImgUrl}
                    onClick={() => { styleFileRef.current?.click(); }}
                  />
                </span>
                <input
                  ref={styleFileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      const url = reader.result as string;
                      setStyleImgUrl(url);
                      data.onChange?.({ styleImageUrl: url } as any);
                    };
                    reader.readAsDataURL(file);
                    // Reset so same file can be re-selected
                    e.target.value = '';
                  }}
                />
              </div>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Send button — shows spinner when running */}
              <button
                onClick={handleGenerate}
                disabled={genRunning}
                title={genRunning ? '生成中...' : '发送'}
                style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: genRunning ? 'var(--tap-warning)' : prompt.trim() ? 'var(--tap-accent)' : 'rgba(255,255,255,0.08)',
                  color: genRunning || prompt.trim() ? '#fff' : 'var(--tap-text-4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: genRunning ? '16px' : '13px',
                  cursor: genRunning ? 'wait' : 'pointer',
                  transition: `all var(--tap-dur-fast) var(--tap-ease)`,
                  flexShrink: 0,
                  border: 'none',
                  animation: genRunning ? 'tap-pulse-glow 1.5s ease infinite' : 'none',
                }}
                onMouseEnter={e => { if (!genRunning) e.currentTarget.style.transform = 'scale(1.12)'; }}
                onMouseLeave={e => { if (!genRunning) e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {genRunning ? '⏳' : '↑'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

export const ImageGenerateNode = memo(ImageGenerateNodeInner);

// ─── Editable node label ──────────────────────────
function NodeLabel({ nodeId, initial }: { nodeId: string; initial: string }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = value.trim();
    if (trimmed && trimmed !== initial) {
      useCanvasStore.getState().updateNode(nodeId, { title: trimmed });
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        onPointerDown={e => e.stopPropagation()}
        style={{
          position: 'absolute', top: '-20px', left: '4px', zIndex: 10,
          fontSize: '10px', fontWeight: 500, color: 'var(--tap-text-1)',
          background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '4px', padding: '1px 4px', outline: 'none',
          width: '80px', letterSpacing: '0.05em',
        }}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      style={{
        position: 'absolute', top: '-20px', left: '8px', zIndex: 10,
        fontSize: '10px', fontWeight: 500, color: 'var(--tap-text-4)',
        letterSpacing: '0.05em', cursor: 'text',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--tap-text-2)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--tap-text-4)'; }}
    >{value}</div>
  );
}

// ─── Tool button (borderless, hover-only raise) ────
function ToolBtn({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false);
  const isActive = active || hover;
  const fg = isActive ? 'var(--tap-text-1)' : 'var(--tap-text-2)';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={label}
      style={{
        width: '30px', height: '30px', borderRadius: '8px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '16px',
        color: fg,
        background: active ? 'rgba(255,255,255,0.12)' : hover ? 'rgba(255,255,255,0.08)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: `all var(--tap-dur-fast) var(--tap-ease)`,
      }}
    >
      {icon === 'crop-svg' ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2v14a2 2 0 0 0 2 2h14" />
          <path d="M18 22V8a2 2 0 0 0-2-2H2" />
        </svg>
      ) : icon === 'relight-svg' ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="1.1">
          <circle cx="12" cy="13" r="7" />
          <ellipse cx="12" cy="13" rx="11" ry="3.5" transform="rotate(-25 12 13)" />
        </svg>
      ) : (
        icon
      )}
    </button>
  );
}

// ─── Overlay button (fullscreen/download on image hover) ──
// ─── InlineChip (seamless, for the unified input bar) ──
function InlineChip({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <span
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        padding: '4px 8px', borderRadius: 'var(--tap-r-sm)',
        fontSize: 'var(--tap-fs-meta)', color: active ? 'var(--tap-text-1)' : 'var(--tap-text-3)',
        background: active ? 'rgba(255,255,255,0.10)' : 'transparent',
        cursor: 'pointer', border: 'none',
        transition: `all var(--tap-dur-fast) var(--tap-ease)`,
        userSelect: 'none', whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--tap-text-1)'; }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tap-text-3)'; } }}
    >
      {label}
    </span>
  );
}

const dropdownItemStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  height: '38px', padding: '0 12px', borderRadius: 'var(--tap-r-md)',
  cursor: 'pointer', fontSize: 'var(--tap-fs-body)', color: 'var(--tap-text-1)',
  background: isActive ? 'var(--tap-hover)' : 'transparent',
});

const badgeStyle: React.CSSProperties = {
  fontSize: '10px', color: 'var(--tap-success)',
  background: 'rgba(82,196,26,0.12)', padding: '1px 5px',
  borderRadius: 'var(--tap-r-full)',
};

// ─── PickerDropdown (portal to body to escape overflow:hidden) ──
function PickerDropdown({ children, onClose, anchorRect }: { children: React.ReactNode; onClose: () => void; anchorRect?: DOMRect | null }) {
  const panelStyle: React.CSSProperties = anchorRect
    ? {
        position: 'fixed',
        top: anchorRect.bottom + 6,
        left: anchorRect.left,
      }
    : {
        position: 'absolute',
        top: 'calc(100% + 6px)',
        left: 0,
      };

  const panel = (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
      <Panel style={{
        ...panelStyle,
        minWidth: '220px',
        padding: 'var(--tap-space-2)',
        zIndex: 200,
        display: 'flex',
        flexDirection: 'column',
        animation: 'tap-fade-up var(--tap-dur-fast) var(--tap-ease)',
      }}>
        {children}
      </Panel>
    </>
  );

  return anchorRect ? createPortal(panel, document.body) : panel;
}
