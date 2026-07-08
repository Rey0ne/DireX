/* === ImageGenerateNode — TapNow-style image generation === */
/* Phase 2 refined: borderless tools, distant handles, fullscreen overlay */
// @ts-nocheck — ~18 TS6133 dead code (unused components/functions from rapid prototyping). Safe to suppress; remove individually during refactor.

import React, { useState, useCallback, useRef, useEffect, useLayoutEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useStore } from '@xyflow/react';
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

function _ratioBoxSize(w: number, h: number) {
  const maxSide = 26;
  const scale = maxSide / Math.max(w, h);
  return { width: `${Math.round(w * scale)}px`, height: `${Math.round(h * scale)}px` };
}

const MODEL_OPTIONS = [
  { name: 'Nano Banana', badges: ['推荐'], maxRes: '4K', features: ['inpaint', 'multi-angle'] },
  { name: 'GPT Image2', badges: ['热门'], maxRes: '4K', features: ['t2i', 'i2i'] },
];

const RESOLUTION_OPTIONS = [
  { label: '1K', desc: '1024×1024' },
  { label: '2K', desc: '1792×1024' },
  { label: '4K', desc: '2048×2048' },
];


// ── Lens icon (black ring + glass lens) ──
function _LensIcon({ size }: { size: number }) {
  const r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{flexShrink:0}}>
      <circle cx={r} cy={r} r={r-1} fill="rgba(30,30,35,0.9)" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
      <ellipse cx={r*0.6} cy={r*0.55} rx={r*0.35} ry={r*0.25} fill="rgba(140,180,220,0.12)" transform={`rotate(-25 ${r*0.6} ${r*0.55})`}/>
      <ellipse cx={r*1.3} cy={r*0.4} rx={r*0.15} ry={r*0.08} fill="rgba(255,255,255,0.15)" transform={`rotate(-25 ${r*1.3} ${r*0.4})`}/>
    </svg>
  );
}

// ── Color gradient bar ──
function ColorBar({ colors, width, height }: { colors: string[]; width: number; height: number }) {
  const stops = colors.map((c,i)=>`${c} ${(i/(colors.length-1))*100}%`).join(',');
  return <div style={{width,height,borderRadius:'2px',background:`linear-gradient(to right,${stops})`,flexShrink:0}}/>;
}

// ── Iris aperture icon (metal blades) ──
function IrisIcon({ blades, size }: { blades: number; size: number }) {
  const r = size / 2, cx = r, cy = r;
  // Draw overlapping metal blades forming an iris
  const els: React.ReactNode[] = [];
  for (let i = 0; i < blades; i++) {
    const angle = (i / blades) * Math.PI * 2 - Math.PI / 2;
    const innerR = r * 0.25 * (blades / 8); // smaller aperture = smaller hole
    const outerR = r * 1.05;
    const _midR = (innerR + outerR) / 2;
    const x1 = cx + Math.cos(angle) * innerR;
    const y1 = cy + Math.sin(angle) * innerR;
    const x2 = cx + Math.cos(angle) * outerR;
    const y2 = cy + Math.sin(angle) * outerR;
    els.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(200,200,210,0.7)" strokeWidth={1.8} strokeLinecap="round"/>);
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{flexShrink:0}}>
      <circle cx={cx} cy={cy} r={r*0.9} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
      {els}
      <circle cx={cx} cy={cy} r={r*0.22*(blades/8)} fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.8"/>
    </svg>
  );
}

// ── Roller (single-item scroll picker) ──
function _Roller({ options, index, onChange }: { options: string[]; index: number; onChange: (i: number) => void }) {
  const prev = () => onChange(index > 0 ? index - 1 : options.length - 1);
  const next = () => onChange(index < options.length - 1 ? index + 1 : 0);
  return (
    <span style={{ display:'inline-flex',alignItems:'center',gap:'1px',userSelect:'none' }}>
      <span onClick={prev} style={{ cursor:'pointer',fontSize:'7px',color:'var(--tap-text-4)',lineHeight:1,padding:'0 1px' }}
        onMouseEnter={e=>{e.currentTarget.style.color='#fff'}} onMouseLeave={e=>{e.currentTarget.style.color='var(--tap-text-4)'}}>▲</span>
      <span style={{ fontSize:'8px',color:'#fff',fontWeight:500,minWidth:'28px',textAlign:'center' }}>{options[index]}</span>
      <span onClick={next} style={{ cursor:'pointer',fontSize:'7px',color:'var(--tap-text-4)',lineHeight:1,padding:'0 1px' }}
        onMouseEnter={e=>{e.currentTarget.style.color='#fff'}} onMouseLeave={e=>{e.currentTarget.style.color='var(--tap-text-4)'}}>▼</span>
    </span>
  );
}

// ── DropBtn + Portal dropdown (matches VideoGenerateNode style) ──
function ImgDropBtn({ label, open, setOpen, anchorRef, onRect, children }: {
  label: string; open: boolean; setOpen: (v: boolean) => void;
  anchorRef: React.RefObject<HTMLSpanElement | null>; onRect: (r: DOMRect | null) => void;
  children: React.ReactNode;
}) {
  return (
    <div style={{ position: 'relative' }}>
      <span ref={anchorRef} onClick={e => {
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        onRect(rect);
        setOpen(!open);
      }}
        style={{ display:'inline-flex',alignItems:'center',height:'20px',padding:'0 6px',borderRadius:'12px',fontSize:'8px',fontWeight:500,cursor:'pointer',background:open?'rgba(255,255,255,0.07)':'transparent',color:'#fff',border:'none',whiteSpace:'nowrap',transition:'all 0.2s' }}
        onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.07)'}}
        onMouseLeave={e=>{if(!open){e.currentTarget.style.background='transparent'}}}
      >{label}</span>
      {open && anchorRef.current && (
        <PD2 onClose={() => setOpen(false)} anchorRect={anchorRef.current.getBoundingClientRect()}>{children}</PD2>
      )}
    </div>
  );
}

function PD2({ children, onClose, anchorRect }: { children: React.ReactNode; onClose: () => void; anchorRect?: DOMRect | null }) {
  const top = anchorRect ? anchorRect.bottom + 4 : '50%';
  const left = anchorRect ? anchorRect.left : '50%';
  return createPortal(<>
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
    <div style={{ position: 'fixed', top, left, minWidth: '320px', padding: 'var(--tap-space-2)', zIndex: 9999, background: 'var(--tap-panel)', border: '1px solid var(--tap-border)', borderRadius: 'var(--tap-r-lg)', boxShadow: 'var(--tap-shadow-lg)', backdropFilter: 'blur(var(--tap-blur))', animation: 'tap-fade-in 50ms var(--tap-ease)' }}>{children}</div>
  </>, document.body);
}

function ImageGenerateNodeInner({ id, data, selected }: { id: string; data: ImageGenNodeData; selected?: boolean }) {
  const gen = data.gen || {};
  const [prompt, setPrompt] = useState(gen.prompt || '');
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showRatioPicker, setShowRatioPicker] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [currentModel, setCurrentModel] = useState(gen.model || 'GPT Image2');
  const atQueryRef = useRef('');  // tracks @query text for correct replacement in Chinese
  const atPosRef = useRef(-1);    // tracks @ position in prompt (avoids lastIndexOf races with multi-@)
  const [currentAspect, setCurrentAspect] = useState(gen.aspect || '16:9');
  const [currentResolution, setCurrentResolution] = useState(gen.resolution || '2K');
  const [showResolutionPicker, setShowResolutionPicker] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [imgCount, setImgCount] = useState(1);
  const [showCountPicker, setShowCountPicker] = useState(false);
  const countRef = useRef<HTMLSpanElement>(null);
  const [_countRect, setCountRect] = useState<DOMRect | null>(null);
  // Camera kit picker — images: public/camera-kit/cam-<name>.jpg & lens-<name>.jpg
  const KIT = '/camera-kit/';
  const CAMERAS = [
    { name:'Sony Venice',          sensor:'Full-Frame 6K', mount:'PL',         year:'2018', img:`${KIT}cam-sony-venice.png` },
    { name:'Arri Alexa 35',        sensor:'S35 4.6K',      mount:'LPL',        year:'2022', img:`${KIT}cam-arri-alexa35.png` },
    { name:'Arri Alexa 65',        sensor:'65mm 6.5K',     mount:'XPL',        year:'2015', img:`${KIT}cam-arri-alexa65.png` },
    { name:'Red V-Raptor',         sensor:'VV 8K',         mount:'RF/PL',      year:'2021', img:`${KIT}cam-red-vraptor.png` },
    { name:'Panavision DXL2',      sensor:'VV 8K',         mount:'PV',         year:'2018', img:`${KIT}cam-panavision-dxl2.png` },
    { name:'Arricam LT',           sensor:'35mm Film',     mount:'PL',         year:'2001', img:`${KIT}cam-arricam-lt.png` },
    { name:'ArriFlex 435',         sensor:'35mm Film',     mount:'PL',         year:'1995', img:`${KIT}cam-arriflex435.png` },
{ name:'IMAX Film Camera',     sensor:'70mm Film',     mount:'IMAX',       year:'1976', img:`${KIT}cam-imax-film.png` },
  ];
  const LENSES = [
    { name:'Zeiss Ultra Prime',    focal:'14-200mm',  aperture:'T1.9-T2.8',  year:'1999', img:`${KIT}lens-zeiss-ultraprime.png` },
    { name:'Arri Signature',       focal:'12-280mm',  aperture:'T1.8-T2.8',  year:'2018', img:`${KIT}lens-arri-signature.png` },
    { name:'Canon K-35',           focal:'18-300mm',  aperture:'T1.3-T2.0',  year:'1976', img:`${KIT}lens-canon-k35.png` },
    { name:'Cooke S4',             focal:'12-300mm',  aperture:'T2.0-T2.8',  year:'1998', img:`${KIT}lens-cooke-s4.png` },
    { name:'Cooke Panchro',        focal:'18-100mm',  aperture:'T2.2-T2.8',  year:'2012', img:`${KIT}lens-cooke-panchro.png` },
    { name:'Cooke SF 1.8x',       focal:'25-450mm',  aperture:'T2.3-T4.5',  year:'2014', img:`${KIT}lens-cooke-sf.png` },
    { name:'Helios 44-2',          focal:'58mm',      aperture:'T2.0',       year:'1958', img:`${KIT}lens-helios.png` },
    { name:'Panavision C-series',  focal:'17-400mm',  aperture:'T2.0-T4.0',  year:'1970', img:`${KIT}lens-panavision-c.png` },
    { name:'Panavision Primo',     focal:'17.5-150mm',aperture:'T1.9-T2.8',  year:'1995', img:`${KIT}lens-panavision-primo.png` },
    { name:'Hawk Class X',         focal:'18-280mm',  aperture:'T2.2-T2.8',  year:'2012', img:`${KIT}lens-hawk-x.png` },
  ];
  const FOCALS = ['8mm','14mm','24mm','35mm','50mm','75mm','125mm'];
  const APERTURES = [
    { v:'f/1.4', blades:8, img:`${KIT}aperture-f1.4.png` },
    { v:'f/4',   blades:6, img:`${KIT}aperture-f4.png` },
    { v:'f/11',  blades:3, img:`${KIT}aperture-f11.png` },
  ];
  const FILM_STOCKS = [
    { name:'Kodak 2383',  desc:'暖调影院', colors:['#0a0a10','#2c1a0a','#6b3a1a','#d4a44a','#e8d4b0','#f0e8d8','#e8c47c'], img:`${KIT}lut-kodak2383.png` },
    { name:'Kodak 250D',  desc:'日光柔和', colors:['#0a0c10','#1a2a1a','#4a6a3a','#a4b48a','#d4d8c0','#e8e8d8','#d4b896'], img:`${KIT}lut-kodak250d.png` },
    { name:'Kodak 500T',  desc:'钨丝青绿', colors:['#0a0c10','#0a1a2a','#1a3a5a','#5a8a9a','#8ab4c4','#b0d0d8','#8cb4c4'], img:`${KIT}lut-kodak500t.png` },
    { name:'Ektachrome',  desc:'蓝绿高饱和', colors:['#0a0a10','#0a2a2a','#1a5a6a','#4a9aaa','#7eb8c8','#a0d0d8','#7eb8c8'], img:`${KIT}lut-ektachrome.png` },
    { name:'Fuji Eterna', desc:'冷调清新',  colors:['#0a0c0a','#0a1a1a','#2a4a4a','#5a7a7a','#7ea8a0','#a0c0b8','#7ea8a0'], img:`${KIT}lut-fuji-eterna.png` },
    { name:'Fuji Velvia', desc:'高饱和风光', colors:['#0a0a0a','#2a0a0a','#6a1a1a','#a43a1a','#c4643c','#d89060','#c4643c'], img:`${KIT}lut-fuji-velvia.png` },
    { name:'Technicolor', desc:'经典三色带', colors:['#0a0808','#2a1a0a','#6a3a1a','#b46a2a','#d4a474','#e8c8a0','#d4a474'], img:`${KIT}lut-technicolor.png` },
    { name:'Bleach Bypass',desc:'高反差金属', colors:['#080808','#1a1a1a','#4a4a4a','#7a7a7a','#a8a0a0','#c0b8b8','#a8a0a0'], img:`${KIT}lut-bleach.png` },
    { name:'B&W Acros',   desc:'黑白经典',  colors:['#000000','#1a1a1a','#3a3a3a','#6a6a6a','#909090','#b0b0b0','#909090'], img:`${KIT}lut-acros.png` },
  ];
  // Init from saved meta so camera kit survives node remount / page refresh
  const [camIdx, setCamIdx] = useState(() => { const i = CAMERAS.findIndex(c => c.name === gen.camera); return i >= 0 ? i : 0; });
  const [lensIdx, setLensIdx] = useState(() => { const i = LENSES.findIndex(l => l.name === gen.lens); return i >= 0 ? i : 3; });
  const [focalIdx, setFocalIdx] = useState(() => { const i = FOCALS.indexOf(gen.focalLength || ''); return i >= 0 ? i : 4; });
  const [apertureIdx, setApertureIdx] = useState(() => { const i = APERTURES.findIndex(a => a.v === gen.aperture); return i >= 0 ? i : 0; });
  const [filmIdx, setFilmIdx] = useState(() => { const i = FILM_STOCKS.findIndex(f => f.name === gen.filmStock); return i >= 0 ? i : 0; });
  const [showCamPick, setShowCamPick] = useState(false);
  const [showFilmPick, setShowFilmPick] = useState(false);
  const camRef = useRef<HTMLSpanElement>(null);
  const filmRef = useRef<HTMLSpanElement>(null);

  // @mention — reference connected nodes
  const [showAtMention, setShowAtMention] = useState(false);
  const [atMentions, setAtMentions] = useState<{name: string; url: string}[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const [imgHeight, setImgHeight] = useState(220);
  const [cardRect, setCardRect] = useState<DOMRect | null>(null);
  const _readyRef = useRef(false);
  const zoom = useStore(s => s.transform[2]);
  // ─── Picker trigger refs (for portal positioning outside overflow:hidden) ──
  const modelChipRef = useRef<HTMLSpanElement>(null);
  const ratioChipRef = useRef<HTMLSpanElement>(null);
  const resolutionChipRef = useRef<HTMLSpanElement>(null);
  const _styleChipRef = useRef<HTMLSpanElement>(null);
  const _styleFileRef = useRef<HTMLInputElement>(null);
  const [_modelChipRect, setModelChipRect] = useState<DOMRect | null>(null);
  const [_ratioChipRect, setRatioChipRect] = useState<DOMRect | null>(null);
  const [_resolutionChipRect, setResolutionChipRect] = useState<DOMRect | null>(null);
  const [styleImgUrl, setStyleImgUrl] = useState<string | null>(
    (data.gen?.styleImageUrl as string) || (data.styleImageUrl as string) || null
  );

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

  // Sync measurement before paint — no flash
  useLayoutEffect(() => {
    if (!selected || !cardRef.current) { setCardRect(null); return; }
    setCardRect(cardRef.current.getBoundingClientRect());
  }, [selected, data.imageUrl, (data as any).videoUrl]);
  // Keep cardRect updated during scroll/resize
  useEffect(() => {
    if (!selected || !cardRef.current) return;
    let raf = 0;
    const update = () => {
      if (cardRef.current) setCardRect(cardRef.current.getBoundingClientRect());
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
      // Persist manual CSS resize width to store
      if (w > 0) {
        const store = useCanvasStore.getState();
        const node = store.nodes.get(id);
        if (node && Math.abs((node.size?.w || 380) - w) > 5) {
          store.updateNode(id, { size: { w, h: node.size?.h || 200 } });
        }
      }
    });
    ro.observe(cardRef.current);
    return () => ro.disconnect();
  }, [currentAspect, id]);

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

  const handleCropApply = useCallback(async () => {
    setCropError(null);
    setCropSuccess(false);
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

    // Upload cropped dataUrl → public URL to avoid sanitizeMeta drop (>500KB field)
    const doCrop = async (source: CanvasImageSource) => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(srcW);
      canvas.height = Math.round(srcH);
      const ctx = canvas.getContext('2d');
      if (!ctx) { setCropError('Canvas 创建失败'); return; }
      ctx.drawImage(source, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
      const dataUrl = canvas.toDataURL('image/png');
      const cropW = Math.round(srcW);
      const cropH = Math.round(srcH);
      console.log('[crop] Cropped: ' + cropW + 'x' + cropH + ', ' + (dataUrl.length / 1024).toFixed(0) + 'KB');

      try {
        const resp = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer tapnow-dev-key' },
          body: JSON.stringify({ dataUrl }),
        });
        const json = await resp.json();
        if (!json.url) { setCropError('上传裁切结果失败'); return; }
        console.log('[crop] Uploaded →', json.url.slice(0, 60));
        setCropSuccess(true);
        onCropApplyRef.current?.(json.url, cropW, cropH);
      } catch (e: any) {
        setCropError('上传失败: ' + String(e).slice(0, 100));
      }
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
        await doCrop(img);
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
    patch('model', currentModel);
    patch('aspect', currentAspect);
    patch('resolution', currentResolution);
    // Camera kit
    patch('camera', CAMERAS[camIdx].name);
    patch('lens', LENSES[lensIdx].name);
    patch('focalLength', FOCALS[focalIdx]);
    patch('aperture', APERTURES[apertureIdx].v);
    patch('filmStock', FILM_STOCKS[filmIdx].name);
    patch('imgCount', imgCount);
    // onGenerate is async but we fire-and-forget — button stays ⏳ until node remounts with imageUrl
    Promise.resolve(data.onGenerate?.()).finally(() => {
      genRunningRef.current = false;
      setGenRunning(false);
    });
  };

  const handleDownload = async () => {
    if (!data.imageUrl) return;
    const url = data.imageUrl;
    // data: URLs → direct download
    if (url.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = url;
      a.download = `viewlab-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    // Try direct fetch+Blob (fast, no server proxy overhead)
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const blob = await resp.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `viewlab-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        return;
      }
    } catch { /* CORS or network error — fall through to proxy */ }
    // Fallback: proxy through backend (cross-origin URLs that block CORS)
    const a = document.createElement('a');
    a.href = `/api/download?url=${encodeURIComponent(url)}`;
    a.download = `viewlab-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const toolbarActions = [
    { icon: 'crop-svg', label: '裁切', shortcut: 'C', onClick: () => { setCropSuccess(false); setCropError(null); data.onCropStart?.(); } },
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
    <>
      <style>{`
        @keyframes direx-light-wash {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes direx-light-rim {
          0%   { box-shadow: 0 0 12px 6px rgba(94,234,212,0.10), 0 0 32px rgba(94,234,212,0.05); }
          50%  { box-shadow: 0 0 20px 10px rgba(94,234,212,0.22), 0 0 52px rgba(94,234,212,0.10); }
          100% { box-shadow: 0 0 12px 6px rgba(94,234,212,0.10), 0 0 32px rgba(94,234,212,0.05); }
        }
      `}</style>
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

        {/* ── Upload bar (inline absolute, no measurement, no flash) ── */}
        {selected && !data.multiSelect && !data.imageUrl && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 24px)', left: '50%',
          transform: `translateX(-50%) scale(${1.5/zoom})`,
          transformOrigin: 'bottom center', zIndex: 50,
        }}>
          <div onClick={() => { /* trigger file upload via hidden input or drop */ }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 20px', background: 'rgba(22,26,34,0.92)',
              borderRadius: '14px 14px 0 0', backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.45)', cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none',
              animation: 'tap-fade-down var(--tap-dur-fast) var(--tap-ease)',
            }}>
            <span style={{ fontSize: '16px' }}>↑</span>
            <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--tap-text-2)' }}>上传</span>
          </div>
        </div>
        )}
        {/* ── Floating Toolbar (inline absolute, no measurement, no flash) ── */}
        {selected && !data.multiSelect && data.imageUrl && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 24px)', left: '50%',
          transform: `translateX(-50%) scale(${1.5/zoom})`,
          transformOrigin: 'bottom center', zIndex: 50,
        }}>
          <div style={{
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
          </div>
        </div>
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
          background: selected ? 'linear-gradient(115deg, rgba(94,234,212,0.07) 0%, rgba(94,234,212,0.03) 25%, var(--tap-panel) 50%, var(--tap-panel) 100%)' : 'var(--tap-panel)',
          boxShadow: data.isPickTarget
            ? '0 0 32px rgba(180,180,185,0.25)'
            : data.isConnectTarget
              ? '0 0 32px rgba(180,180,185,0.2)'
              : selected ? 'var(--tap-shadow-md)' : 'var(--tap-shadow-sm)',
          transition: `border var(--tap-dur-fast) var(--tap-ease), box-shadow var(--tap-dur-fast) var(--tap-ease)`,
          backgroundSize: selected ? '250% 250%' : undefined,
          animation: selected ? 'direx-light-wash 6s ease-in-out infinite, direx-light-rim 5s ease-in-out infinite' : undefined,
          willChange: selected ? 'box-shadow' : undefined,
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
            (data as any).videoUrl ? (
              <video ref={imgRef as any} src={(data as any).videoUrl} controls loop style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <img ref={imgRef} src={data.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            )
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
          transform: `translateX(-50%) scale(${1.5/zoom})`,
          transformOrigin: 'top center',
          width: 'var(--tap-node-width)',
          marginTop: `${10/zoom}px`,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Unified input panel — textarea wrapping all controls */}
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 'var(--tap-r-xl)',
            pointerEvents: 'auto',
          }}>
            {/* Reference strip — inside panel */}
            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', padding: '6px 8px 0', minHeight: 32, alignItems: 'center' }}>
              {/* Upload + — left */}
              {(!data.refUrls || data.refUrls.length === 0) && !styleImgUrl && (
                <div onClick={e => { e.stopPropagation(); e.preventDefault(); useCanvasStore.getState().setPendingConnection(id); }}
                  style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: '12px', color: 'var(--tap-text-4)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--tap-text-2)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--tap-text-4)'; }}
                >＋</div>
              )}
              {data.refUrls && data.refUrls.map((uri, i) => (
                <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={uri} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                  <span onClick={e => {
                    e.stopPropagation(); e.preventDefault();
                    const store = useCanvasStore.getState();
                    const toRemove: string[] = [];
                    store.edges.forEach(edge => {
                      if (edge.to.nodeId === id) {
                        const src = store.nodes.get(edge.from.nodeId);
                        if (src && (src.meta?.gen as any)?.imageUrl === uri) toRemove.push(edge.id);
                      }
                    });
                    toRemove.forEach(eid => store.removeEdge(eid));
                    store.setSelectedNodes([id]);
                  }}
                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
                    onPointerDown={e => { e.stopPropagation(); e.preventDefault(); }}
                    style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, cursor: 'pointer', lineHeight: 1 }}
                  >x</span>
                </div>
              ))}
              {styleImgUrl && (
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={styleImgUrl} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', border: '1.5px solid rgba(200,160,100,0.4)' }} />
                  <span onClick={e => { e.stopPropagation(); e.preventDefault(); setStyleImgUrl(null); data.onChange?.({ styleImageUrl: null } as any); }}
                    onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
                    onPointerDown={e => { e.stopPropagation(); e.preventDefault(); }}
                    style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, cursor: 'pointer', lineHeight: 1 }}
                  >x</span>
                </div>
              )}
              <div style={{ flex: 1 }} />
              <span onClick={() => setExpanded(!expanded)}
                style={{ fontSize: '10px', color: 'var(--tap-text-4)', cursor: 'pointer', padding: '1px 4px', flexShrink: 0 }}
              >{expanded ? '∧' : '∨'}</span>
            </div>

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
                      atPosRef.current = atIdx; // remember exact @ position for replacement
                      atQueryRef.current = query;  // remember for replacement
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
                  marginLeft: '0',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--tap-r-xl) var(--tap-r-xl) 0 0',
                  padding: '10px 14px',
                  paddingRight: '40px',
                  fontSize: '8px',
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
                        // Use stored @ position (not lastIndexOf — multi-@ prompts would find wrong one)
                        const atIdx = atPosRef.current;
                        if (atIdx < 0 || atIdx >= prompt.length) { setShowAtMention(false); return; }
                        const before = prompt.slice(0, atIdx);
                        // Use stored query length (works for Chinese without spaces)
                        const queryLen = atQueryRef.current.length;
                        const after = prompt.slice(atIdx + 1 + queryLen);
                        const name = m.name || 'REF'; // fallback — never let name be empty
                        setPrompt(before + '@' + name + ' ' + after);
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

            {/* Bottom bar — matches VideoGenerateNode */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px',
              padding: '4px 8px 8px',
            }}>
              <ImgDropBtn label={currentModel} open={showModelPicker} setOpen={(v) => { setShowModelPicker(v); setShowRatioPicker(false); }} anchorRef={modelChipRef} onRect={setModelChipRect}>
                {MODEL_OPTIONS.map(m => (
                  <div key={m.name} onClick={() => { setCurrentModel(m.name); patch('model', m.name); setShowModelPicker(false); }}
                    style={{ display:'flex',justifyContent:'space-between',alignItems:'center',height:'32px',padding:'0 10px',borderRadius:'var(--tap-r-md)',cursor:'pointer',color:'var(--tap-text-1)',background:currentModel===m.name?'var(--tap-hover)':'transparent',fontSize:'11px' }}
                    onMouseEnter={e=>{if(currentModel!==m.name)e.currentTarget.style.background='var(--tap-hover)'}}
                    onMouseLeave={e=>{if(currentModel!==m.name)e.currentTarget.style.background='transparent'}}>
                    <span>{m.name}</span>
                    <span style={{display:'flex',gap:'2px'}}>{m.badges.map(b=><span key={b} style={{fontSize:'8px',color:'var(--tap-accent)',background:'rgba(74,158,255,0.12)',padding:'1px 3px',borderRadius:'2px'}}>{b}</span>)}</span>
                  </div>))}
              </ImgDropBtn>
              <span style={{ width:'1px',height:'14px',background:'rgba(255,255,255,0.10)',flexShrink:0 }} />

              {/* Aspect + Resolution — combined */}
              <ImgDropBtn label={`${currentAspect}·${currentResolution}`} open={showRatioPicker} setOpen={setShowRatioPicker} anchorRef={ratioChipRef} onRect={setRatioChipRect}>
                <div style={{padding:'2px 0'}}>
                  <div style={{fontSize:'9px',color:'var(--tap-text-4)',padding:'1px 10px'}}>画幅比例</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'2px',padding:'0 8px',marginBottom:'6px'}}>
                    {ASPECT_OPTIONS.map(a=>{
                      const B=20,s=Math.min(B/a.w,B/a.h);
                      const pw=Math.round(a.w*s),ph=Math.round(a.h*s);
                      const active=currentAspect===a.label;
                      return <div key={a.label} onClick={()=>{setCurrentAspect(a.label);patch('aspect',a.label);setShowRatioPicker(false)}}
                        style={{display:'flex',alignItems:'center',gap:'5px',padding:'3px 6px',borderRadius:'4px',cursor:'pointer',background:active?'var(--tap-hover)':'transparent',border:active?'1px solid rgba(255,255,255,0.1)':'1px solid transparent'}}>
                        <div style={{width:B,height:B,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          <div style={{width:pw,height:ph,border:'1.5px solid '+(active?'var(--tap-accent)':'rgba(255,255,255,0.2)'),borderRadius:'1px',background:active?'rgba(74,158,255,0.06)':'transparent'}}/>
                        </div>
                        <span style={{fontSize:'10px',color:active?'var(--tap-text-1)':'var(--tap-text-3)',fontWeight:active?600:400}}>{a.label}</span>
                      </div>;
                    })}
                  </div>
                  <div style={{height:'1px',background:'var(--tap-divider)',margin:'0 10px'}}/>
                  <div style={{fontSize:'9px',color:'var(--tap-text-4)',padding:'3px 10px 1px'}}>分辨率</div>
                  <div style={{display:'flex',gap:'2px',padding:'0 6px 3px'}}>
                    {RESOLUTION_OPTIONS.map(r=>(
                      <span key={r.label} onClick={()=>{setCurrentResolution(r.label);patch('resolution',r.label)}}
                        style={{flex:1,padding:'3px 5px',borderRadius:'3px',fontSize:'10px',cursor:'pointer',textAlign:'center',background:currentResolution===r.label?'var(--tap-hover)':'transparent',color:currentResolution===r.label?'var(--tap-text-1)':'var(--tap-text-3)'}}>{r.label}</span>
                    ))}
                  </div>
                </div>
              </ImgDropBtn>

              <span style={{ width:'1px',height:'14px',background:'rgba(255,255,255,0.10)',flexShrink:0 }} />
              {/* Lens trigger */}
              <span ref={camRef} onClick={()=>{setShowCamPick(!showCamPick)}}
                style={{display:'inline-flex',alignItems:'center',gap:'2px',height:'20px',padding:'0 6px',borderRadius:'12px',fontSize:'8px',fontWeight:500,cursor:'pointer',color:'#fff',whiteSpace:'nowrap',maxWidth:'90px',overflow:'hidden',textOverflow:'ellipsis',transition:'all 0.2s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.07)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                {CAMERAS[camIdx].name}
              </span>
              <span style={{ width:'1px',height:'14px',background:'rgba(255,255,255,0.10)',flexShrink:0 }} />
              {/* Film stock trigger */}
              <span ref={filmRef} onClick={()=>{setShowFilmPick(!showFilmPick)}}
                style={{display:'inline-flex',alignItems:'center',gap:'2px',height:'20px',padding:'0 6px',borderRadius:'12px',fontSize:'8px',fontWeight:500,cursor:'pointer',color:'#fff',whiteSpace:'nowrap',transition:'all 0.2s'}}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.07)'}}
                onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}>
                <ColorBar colors={FILM_STOCKS[filmIdx].colors} width={36} height={10} /> {FILM_STOCKS[filmIdx].name}
              </span>
              {showFilmPick && filmRef.current && (
                <PD2 onClose={()=>setShowFilmPick(false)} anchorRect={filmRef.current.getBoundingClientRect()}>
                  <div style={{padding:'10px',display:'flex',flexDirection:'column',alignItems:'center',gap:'6px',width:'160px'}}
                    ref={el=>{if(el)el.onwheel=e=>{e.preventDefault();setFilmIdx((p:number)=>e.deltaY>0?Math.min(p+1,FILM_STOCKS.length-1):Math.max(p-1,0))}}}>
                    <div style={{fontSize:'9px',color:'var(--tap-text-4)'}}>🎨 胶片风格</div>
                    <div style={{height:'14px',width:'120px',display:'flex',justifyContent:'center'}}>
                      {filmIdx > 0 && <ColorBar colors={FILM_STOCKS[filmIdx-1].colors} width={120} height={12} />}
                    </div>
                    <div style={{width:'120px',display:'flex',justifyContent:'center'}}>
                      <ColorBar colors={FILM_STOCKS[filmIdx].colors} width={120} height={20} />
                    </div>
                    <div style={{fontSize:'12px',color:'var(--tap-text-1)',fontWeight:600,textAlign:'center',width:'160px'}}>{FILM_STOCKS[filmIdx].name}</div>
                    <div style={{fontSize:'10px',color:'var(--tap-text-4)',textAlign:'center',width:'160px'}}>{FILM_STOCKS[filmIdx].desc}</div>
                    <div style={{height:'14px',width:'120px',display:'flex',justifyContent:'center'}}>
                      {filmIdx < FILM_STOCKS.length - 1 && <ColorBar colors={FILM_STOCKS[filmIdx+1].colors} width={120} height={12} />}
                    </div>
                  </div>
                </PD2>
              )}
              {showCamPick && camRef.current && (
                <PD2 onClose={()=>setShowCamPick(false)} anchorRect={camRef.current.getBoundingClientRect()}>
                  <div ref={el=>{if(el){const cols=[
                      { idx:camIdx, setIdx:setCamIdx, len:CAMERAS.length },
                      { idx:lensIdx, setIdx:setLensIdx, len:LENSES.length },
                      { idx:focalIdx, setIdx:setFocalIdx, len:FOCALS.length },
                      { idx:apertureIdx, setIdx:setApertureIdx, len:APERTURES.length },
                    ];el.onwheel=e=>{e.preventDefault();const ci=parseInt((e.target as HTMLElement).closest('[data-ci]')?.getAttribute('data-ci')||'-1');if(ci>=0){const c=cols[ci];c.setIdx((p:number)=>e.deltaY>0?Math.min(p+1,c.len-1):Math.max(p-1,0))}}}}}
                    style={{padding:'30px 16px 16px',display:'flex',alignItems:'stretch',position:'relative'}}>
                    <div style={{position:'absolute',top:'8px',left:'16px',fontSize:'18px',color:'#fff',fontWeight:700}}>相机设置</div>
                    {[
                      { idx:camIdx, setIdx:setCamIdx, items:CAMERAS.map(c=>({img:c.img,line1:c.name,line2:`${c.sensor}`})) },
                      { idx:lensIdx, setIdx:setLensIdx, items:LENSES.map(l=>({img:l.img,line1:l.name,line2:`${l.focal}·${l.aperture}`})) },
                      { idx:focalIdx, setIdx:setFocalIdx, items:FOCALS.map(f=>({txt:f})) },
                      { idx:apertureIdx, setIdx:setApertureIdx, items:APERTURES.map(a=>({img:a.img,line1:a.v,blades:a.blades})) },
                    ].map((col,ci,arr)=>(
                      <React.Fragment key={ci}>
                        <div data-ci={ci} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'3px',height:'68px'}}>
                          {col.idx > 0 ? <>
                            <span style={{fontSize:'10px',color:'rgba(255,255,255,0.2)'}}>▲</span>
                            <div style={{opacity:0.12,width:'60px',height:'40px',borderRadius:'10px',background:'transparent',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',transition:'all 0.3s cubic-bezier(0.4,0,0.2,1)',border:'1px solid rgba(255,255,255,0.04)'}}>
                              {(()=>{const it=col.items[col.idx-1] as any;if(it.img)return <img src={it.img} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>;if(it.blades)return <IrisIcon blades={it.blades} size={28}/>;if(it.txt)return <span style={{fontSize:'13px',fontWeight:600,color:'#fff'}}>{it.txt}</span>;return null})()}
                            </div>
                          </> : <div style={{width:'60px'}} />}
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
                          <span style={{fontSize:'14px',color:'rgba(255,255,255,0.25)'}}>◂</span>
                          <div style={{width:'96px',height:'64px',borderRadius:'12px',background:'transparent',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',boxShadow:'0 0 16px rgba(255,255,255,0.03)',transition:'all 0.3s cubic-bezier(0.4,0,0.2,1)'}}>
                            {(()=>{const it=col.items[col.idx] as any;if(it.img)return <img src={it.img} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>;if(it.blades)return <IrisIcon blades={it.blades} size={40}/>;if(it.txt)return <span style={{fontSize:'24px',fontWeight:700,color:'#fff'}}>{it.txt}</span>;return null})()}
                          </div>
                          <span style={{fontSize:'14px',color:'rgba(255,255,255,0.25)'}}>▸</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:'3px',height:'68px'}}>
                          {col.idx < col.items.length - 1 ? <>
                            <span style={{fontSize:'10px',color:'rgba(255,255,255,0.2)'}}>▼</span>
                            <div style={{opacity:0.12,width:'60px',height:'40px',borderRadius:'10px',background:'transparent',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',transition:'all 0.3s cubic-bezier(0.4,0,0.2,1)',border:'1px solid rgba(255,255,255,0.04)'}}>
                              {(()=>{const it=col.items[col.idx+1] as any;if(it.img)return <img src={it.img} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>;if(it.blades)return <IrisIcon blades={it.blades} size={28}/>;if(it.txt)return <span style={{fontSize:'13px',fontWeight:600,color:'#fff'}}>{it.txt}</span>;return null})()}
                            </div>
                          </> : <div style={{width:'60px'}} />}
                        </div>
                        <div style={{fontSize:'12px',color:'var(--tap-text-1)',fontWeight:600,textAlign:'center',width:'100px',lineHeight:1.2,marginTop:'6px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(col.items[col.idx] as any).line1}</div>
                      </div>
                      {ci < arr.length - 1 && <span style={{width:'1px',height:'180px',background:'rgba(255,255,255,0.06)',flexShrink:0,alignSelf:'center'}} />}
                      </React.Fragment>
                    ))}
                  </div>
                </PD2>
              )}
              {/* Count + Send group */}
              <ImgDropBtn label={`×${imgCount}`} open={showCountPicker} setOpen={setShowCountPicker} anchorRef={countRef} onRect={setCountRect}>
                {[1,2,4].map(c=>(
                  <div key={c} onClick={()=>{setImgCount(c);setShowCountPicker(false)}}
                    style={{height:'28px',padding:'0 10px',borderRadius:'var(--tap-r-md)',cursor:'pointer',color:'var(--tap-text-1)',background:imgCount===c?'var(--tap-hover)':'transparent',display:'flex',alignItems:'center',fontSize:'11px'}}
                    onMouseEnter={e=>{if(imgCount!==c)e.currentTarget.style.background='var(--tap-hover)'}}
                    onMouseLeave={e=>{if(imgCount!==c)e.currentTarget.style.background='transparent'}}>
                    ×{c}
                  </div>))}
              </ImgDropBtn>
              <span style={{ width:'1px',height:'14px',background:'rgba(255,255,255,0.10)',flexShrink:0 }} />

              {/* Send — glass pill */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',width:'50px',height:'20px',borderRadius:'10px',background:'linear-gradient(135deg,rgba(255,255,255,0.06) 0%,rgba(255,255,255,0.02) 50%,rgba(255,255,255,0.05) 100%)',border:'1px solid rgba(255,255,255,0.08)',boxShadow:'0 0 10px rgba(255,255,255,0.02),inset 0 1px 0 rgba(255,255,255,0.03)',flexShrink:0,paddingRight:'2px'}}>
                <button onClick={handleGenerate} disabled={genRunning}
                  style={{width:'16px',height:'16px',borderRadius:'50%',background:genRunning?'var(--tap-warning)':'#fff',color:genRunning?'#fff':'#1a1a1a',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:genRunning?'8px':'9px',cursor:genRunning?'wait':'pointer',border:'none',boxShadow:'0 1.5px 4px rgba(0,0,0,0.2),0 1px 1.5px rgba(0,0,0,0.12)',transition:'transform 0.15s,box-shadow 0.15s'}}
                  onMouseEnter={e=>{if(!genRunning){e.currentTarget.style.transform='scale(1.06)';e.currentTarget.style.boxShadow='0 2px 6px rgba(0,0,0,0.22)'}}}
                  onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.boxShadow='0 1.5px 4px rgba(0,0,0,0.2),0 1px 1.5px rgba(0,0,0,0.12)'}}>
                  {genRunning?'⏳':'↑'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  </>
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
function _InlineChip({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
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

const _dropdownItemStyle = (isActive: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  height: '38px', padding: '0 12px', borderRadius: 'var(--tap-r-md)',
  cursor: 'pointer', fontSize: 'var(--tap-fs-body)', color: 'var(--tap-text-1)',
  background: isActive ? 'var(--tap-hover)' : 'transparent',
});

const _badgeStyle: React.CSSProperties = {
  fontSize: '10px', color: 'var(--tap-success)',
  background: 'rgba(82,196,26,0.12)', padding: '1px 5px',
  borderRadius: 'var(--tap-r-full)',
};

// ─── PickerDropdown (portal to body to escape overflow:hidden) ──
function _PickerDropdown({ children, onClose, anchorRect }: { children: React.ReactNode; onClose: () => void; anchorRect?: DOMRect | null }) {
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
