/* === VideoGenerateNode — model-specific UI aligned with official API docs === */
/* Kling 3.0: T2V / I2V / Motion Control (char_orientation, keep_sound)             */
/* Seedance 2.0: T2V / I2V / First+Last / Multi-Ref (fixed_cam, audio, web_search)  */

import { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useStore } from '@xyflow/react';
import { RefStrip } from '../shared/RefStrip';
import { useMention } from '../shared/useMention';

interface VideoGenMeta {
  prompt: string; model: string; duration: string; resolution: string;
  aspect?: string; seed?: number; negativePrompt?: string;
  genMode?: string;               // 't2v'|'i2v'|'motion'|'i2v-fl'|'multi-ref'
  firstFrameUrl?: string; lastFrameUrl?: string;
  multiFrames?: string[];
  fullRefs?: Record<string, string | null>;  // {'image-style'|'video-motion'|'audio-rhythm'}
  // Kling-specific
  characterOrientation?: 'image' | 'video';
  keepOriginalSound?: boolean;
  // Seedance-specific
  fixedCamera?: boolean;
  generateAudio?: boolean;
  webSearch?: boolean;
  resultAssetIds: string[];
}

interface VideoGenNodeData {
  videoUrl?: string;
  gen: VideoGenMeta;
  isConnecting?: boolean; isConnectTarget?: boolean;
  multiSelect?: boolean; isPickMode?: boolean; isPickTarget?: boolean;
  hasConnections?: boolean; refUrls?: string[]; styleImageUrl?: string | null;
  onChange?: (patch: Partial<VideoGenMeta>) => void;
  onGenerate?: () => void; onOpenTool?: (toolName: string) => void;
}

const MODELS = [
  { name: 'Kling 3.0', badges: ['推荐'], maxDur: '15s', provider: 'kling-video' },
  { name: 'Seedance 2.0', badges: ['热门'], maxDur: '15s', provider: 'seedance-2' },
];

// ── Per-model generation modes (matches official API capabilities) ──
const KLING_MODES = [
  { id: 't2v', label: '文生视频', desc: '纯文本提示词生成视频', icon: 'T' },
  { id: 'i2v', label: '图生视频', desc: '上传一张首帧图片', icon: '🖼' },
  { id: 'multi-ref', label: '全能参考', desc: '图+视频自由组合', icon: '⊞' },
];
const SEEDANCE_MODES = [
  { id: 't2v', label: '文生视频', desc: '纯文本提示词生成视频', icon: 'T' },
  { id: 'i2v', label: '图生视频', desc: '上传一张首帧图片', icon: '🖼' },
  { id: 'i2v-fl', label: '首尾帧', desc: '首帧+尾帧控制转场', icon: '⇢' },
  { id: 'multi-ref', label: '多模态参考', desc: '图+视频+音频自由组合', icon: '⊞' },
];

// ── Unified aspect ratios ──
const ALL_ASPECTS = ['1:1','2:3','3:2','3:4','4:3','16:9','9:16','21:9'];

const ASPECT_RECTS: Record<string, { w: number; h: number }> = {
  '1:1':{w:1,h:1},'2:3':{w:2,h:3},'3:2':{w:3,h:2},'3:4':{w:3,h:4},
  '4:3':{w:4,h:3},'16:9':{w:16,h:9},'9:16':{w:9,h:16},'21:9':{w:21,h:9},
};

// ── Per-model durations ──
const KLING_DURATIONS = ['3s','4s','5s','6s','7s','8s','9s','10s','11s','12s','13s','14s','15s'];
const SEEDANCE_DURATIONS = ['4s','5s','6s','7s','8s','9s','10s','11s','12s','13s','14s','15s'];

// ── Per-model resolutions ──
const KLING_RESOLUTIONS = ['720P', '1080P'];
const SEEDANCE_RESOLUTIONS = ['480P', '720P', '1080P'];


export function VideoGenerateNode({ id, data, selected }: { id: string; data: VideoGenNodeData; selected?: boolean }) {
  const gen = data.gen || {};
  const panelRef = useRef<HTMLDivElement>(null);
  const { showMention, setShowMention, mentionList, detectMention, insertMention } = useMention(data.refUrls, data.styleImageUrl);

  const [prompt, setPrompt] = useState(gen.prompt || '');
  const [curModel, setCurModel] = useState((gen.model && gen.model !== 'GPT Image2') ? gen.model : 'Seedance 2.0');
  const [genMode, setGenMode] = useState(gen.genMode || (curModel === 'Kling 3.0' ? 'multi-ref' : 'i2v'));
  const [curDuration, setCurDuration] = useState(gen.duration || '5s');
  const [curAspect, setCurAspect] = useState(gen.aspect || '16:9');
  const [curRes, setCurRes] = useState(gen.resolution || '1080P');
  // Refs
  const [firstFrame, setFirstFrame] = useState<string | null>(gen.firstFrameUrl || null);
  const [lastFrame, setLastFrame] = useState<string | null>(gen.lastFrameUrl || null);
  // Derived directly from gen — no local state (setter was never called, dead code)
  const multiFrames = (gen.multiFrames || []) as string[];
  const [fullRefs, _setFullRefs] = useState<Record<string, string | null>>(gen.fullRefs || {
    'image-style': null, 'video-motion': null, 'audio-rhythm': null,
  });
  // UI
  const [genRunning, setGenRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const zoom = useStore(s => s.transform[2]);

  const patch = useCallback((k: string, v: unknown) => { data.onChange?.({ [k]: v }); }, [data]);

  // ── Derived values per model ──
  const isKling = curModel === 'Kling 3.0';
  const [count, setCount] = useState(1);
  const [soundOn, setSoundOn] = useState(gen.keepOriginalSound ?? true);
  const durations = isKling ? KLING_DURATIONS : SEEDANCE_DURATIONS;
  const resolutions = isKling ? KLING_RESOLUTIONS : SEEDANCE_RESOLUTIONS;
  const modes = isKling ? KLING_MODES : SEEDANCE_MODES;
  // Sync genMode when switching models
  const switchModel = useCallback((m: string) => {
    setCurModel(m);
    patch('model', m);
    const defaultMode = 'multi-ref';
    setGenMode(defaultMode);
    patch('genMode', defaultMode);
    if (!((m === 'Kling 3.0') ? KLING_RESOLUTIONS : SEEDANCE_RESOLUTIONS).includes(curRes)) {
      setCurRes('1080P');
      patch('resolution', '1080P');
    }
  }, [curRes, patch]);

  const handleGenerate = () => {
    if (genRunning) return;
    setGenRunning(true);
    const map: Record<string, unknown> = {
      prompt, model: curModel, genMode, duration: curDuration,
      resolution: curRes, aspect: curAspect,
      firstFrameUrl: firstFrame, lastFrameUrl: lastFrame,
      multiFrames, fullRefs,
    };
    // Kling-specific
    if (isKling) {
      map.characterOrientation = 'video';
    } else {
      map.fixedCamera = false;
      map.generateAudio = true;
      map.webSearch = false;
    }
    Object.keys(map).forEach(k => patch(k, map[k]));
    Promise.resolve(data.onGenerate?.()).finally(() => setGenRunning(false));
  };

  const DropBtn = useCallback(({ v, picker }: { v: string; picker: string }) => {
    const hov = open === picker;
    return (
    <span onClick={e => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setAnchorRect(rect);
      setOpen(hov ? null : picker);
    }}
      style={{ display: 'inline-flex', alignItems: 'center', height: '20px', padding: '0 6px', borderRadius: '8px', fontSize: '8px', fontWeight: 500, cursor: 'pointer', background: hov ? 'rgba(0,207,255,0.10)' : 'transparent', color: 'var(--tap-text-1)', border: 'none', whiteSpace: 'nowrap', transition: 'all 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,207,255,0.10)'; }}
      onMouseLeave={e => { if (!hov) { e.currentTarget.style.background = 'transparent'; } }}
    >{v}</span>
  );}, [open]);

  return (
    <>
      <style>{`
        @keyframes direx-light-rim {
          0%   { box-shadow: 0 0 12px 6px rgba(255,114,255,0.10), 0 0 32px rgba(255,114,255,0.05); }
          50%  { box-shadow: 0 0 20px 10px rgba(255,114,255,0.22), 0 0 52px rgba(255,114,255,0.10); }
          100% { box-shadow: 0 0 12px 6px rgba(255,114,255,0.10), 0 0 32px rgba(255,114,255,0.05); }
        }
      `}</style>
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-20px', left: '8px', zIndex: 10, fontSize: '10px', fontWeight: 500, color: 'var(--tap-text-4)', letterSpacing: '0.05em' }}>VIDEO</div>
        <Handle type="target" position={Position.Left} id="video-in" style={{ width: '19px', height: '19px', background: 'var(--tap-panel)', border: '2px solid #41CCFA', borderRadius: '50%', left: '-20px', top: '50%', opacity: selected || data.isConnecting || data.hasConnections ? 1 : 0, pointerEvents: "all", transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, lineHeight: 1, color: '#41CCFA' }}><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg></Handle>
        <Handle type="source" position={Position.Right} id="video-out" style={{ width: '19px', height: '19px', background: 'var(--tap-panel)', border: '2px solid #41CCFA', borderRadius: '50%', right: '-20px', top: '50%', opacity: selected || data.isConnecting || data.hasConnections ? 1 : 0, pointerEvents: "all", transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, lineHeight: 1, color: '#41CCFA' }}><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg></Handle>

        {/* Toolbar */}
        {selected && data.videoUrl && (
            <div style={{ position: 'absolute', top: '-56px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', alignItems: 'center', gap: '2px', padding: '4px', background: 'rgba(22,26,34,0.92)', borderRadius: '12px', backdropFilter: 'blur(16px)', boxShadow: '0 8px 24px rgba(0,0,0,0.45)' }}>
              <ToolBtn icon="crop-svg" label="裁切" onClick={() => data.onOpenTool?.('crop')} />
              <ToolBtn icon="⊿" label="多角度" onClick={() => data.onOpenTool?.('multiAngle')} />
              <ToolBtn icon="◐" label="重绘" onClick={() => data.onOpenTool?.('inpaint')} />
              <ToolBtn icon="relight-svg" label="打光" onClick={() => data.onOpenTool?.('relight')} />
            </div>
        )}

        <div style={{ width: 'var(--tap-node-width)', borderRadius: 'var(--tap-node-radius)', overflow: 'hidden', border: selected ? '2px solid rgba(255,255,255,0.28)' : '1px solid var(--tap-border)', background: 'var(--tap-panel)', animation: selected ? 'direx-light-rim 5s ease-in-out infinite' : undefined, willChange: selected ? 'box-shadow' : undefined, boxShadow: selected ? 'var(--tap-shadow-md)' : 'var(--tap-shadow-sm)', transition: 'all var(--tap-dur-fast) var(--tap-ease)' }}>
          <div style={{ width: '100%', height: '220px', background: 'linear-gradient(135deg, rgba(180,180,185,0.05), rgba(180,180,185,0.01))', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            {data.videoUrl ? (
              <video src={data.videoUrl?.startsWith('http')?'/api/proxy-video?url='+encodeURIComponent(data.videoUrl):data.videoUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => console.warn('[VideoGen] Main video load failed:', data.videoUrl?.slice(0, 60))} />
            ) : (
              <div style={{ textAlign: 'center', opacity: 0.25 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"><polygon points="5,3 19,12 5,21" /></svg>
                <div style={{ fontSize: '11px', color: 'var(--tap-text-4)', marginTop: '8px' }}>视频将在此显示</div>
              </div>
            )}
            <div style={{ position: 'absolute', bottom: '8px', right: '8px', fontSize: '10px', color: 'var(--tap-text-4)', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', padding: '2px 6px' }}>{curDuration}</div>
          </div>
        </div>
      </div>

      {selected && !data.multiSelect && (
        <div ref={panelRef} style={{ position: 'absolute', top: '100%', left: '50%', transform: `translateX(-50%) scale(${1.5/zoom})`, transformOrigin: 'top center', width: 'var(--tap-node-width)', marginTop: `${10/zoom}px`, zIndex: 50, animation: 'tap-fade-in 50ms var(--tap-ease)' }}>
        <div style={{ background: '#fff', borderRadius: 'var(--tap-r-xl)', pointerEvents: 'auto', boxShadow: 'inset 0 0 0 1px rgba(0,207,255,0.06), inset 0 0 10px rgba(0,207,255,0.03), 0 0 0 3px rgba(0,207,255,0.04), 0 0 0 8px rgba(0,207,255,0.02), 0 2px 12px rgba(0,0,0,0.03)' }}>

          {/* ── Ref thumbnails row ── */}
          <div style={{ padding: '6px 8px 0', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
            <RefStrip nodeId={id} refUrls={data.refUrls} />
            {Object.entries(fullRefs).filter(([,v]) => v).map(([k, v]) => (
              <div key={k} title={k} style={{ width: 28, height: 28, borderRadius: 4, overflow: 'hidden', flexShrink: 0 }}>
                {k === 'video-motion'
                  ? <video src={v!} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => console.warn('[VideoGen] Ref video load failed')} />
                  : <img src={v!} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
            ))}
            {genMode === 'i2v-fl' && firstFrame && <Thumb url={firstFrame} num={1} onRemove={() => { setFirstFrame(null); patch('firstFrameUrl', null); }} />}
            {genMode === 'i2v-fl' && lastFrame && <Thumb url={lastFrame} num={2} onRemove={() => { setLastFrame(null); patch('lastFrameUrl', null); }} />}
            <div style={{ flex: 1 }} />
            <span onClick={() => setExpanded(!expanded)}
              style={{ fontSize: '10px', color: 'var(--tap-text-4)', cursor: 'pointer', padding: '1px 4px', flexShrink: 0 }}
            >{expanded ? '∧' : '∨'}</span>
          </div>

          {/* ── Prompt textarea ── */}
          <textarea value={prompt} onChange={e => { const v = e.target.value; setPrompt(v); detectMention(v, e.target.selectionStart || 0); }}
            onPointerDownCapture={e => e.stopPropagation()} onMouseDownCapture={e => e.stopPropagation()}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
            placeholder="" maxLength={2500} rows={expanded ? 12 : 3}
            style={{ width: '100%', background: '#fff', border: 'none', padding: expanded ? '16px 20px' : '10px 14px', fontSize: '8px', color: '#333', resize: 'none', outline: 'none', lineHeight: 1.5 }} />

          {/* ── Controls row: Model | Mode | Duration | Aspect·Res | Count | Send ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '4px 6px 8px' }}>
            {/* Model picker */}
            <div style={{ position: 'relative' }}><DropBtn v={curModel} picker="model" />
              {open === 'model' && <PD onClose={() => setOpen(null)} anchorRect={anchorRect}>{MODELS.map(m => (
                <div key={m.name} onClick={() => { switchModel(m.name); setOpen(null); }}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '32px', padding: '0 10px', borderRadius: 'var(--tap-r-md)', cursor: 'pointer', color: 'var(--tap-text-1)', background: curModel === m.name ? 'rgba(0,207,255,0.10)' : 'transparent' }}
                  onMouseEnter={e => { if (curModel !== m.name) e.currentTarget.style.background = 'rgba(0,207,255,0.10)'; }}
                  onMouseLeave={e => { if (curModel !== m.name) e.currentTarget.style.background = 'transparent'; }}>
                  <span style={{ fontSize: '11px' }}>{m.name}</span>
                  <span style={{ display: 'flex', gap: '2px' }}>{m.badges.map(b => <span key={b} style={{ fontSize: '8px', color: 'var(--tap-accent)', background: 'rgba(74,158,255,0.12)', padding: '1px 3px', borderRadius: '2px' }}>{b}</span>)}</span>
                </div>))}</PD>}
            </div>

            <span style={{ width: '1px', height: '14px', background: 'rgba(0,0,0,0.10)', flexShrink: 0 }} />
            {/* Mode picker */}
            <div style={{ position: 'relative' }}><DropBtn v={modes.find(m => m.id === genMode)?.label || genMode} picker="mode" />
              {open === 'mode' && <PD onClose={() => setOpen(null)} anchorRect={anchorRect}>{modes.map(m => (
                <div key={m.id} onClick={() => { setGenMode(m.id); patch('genMode', m.id); setOpen(null); }}
                  style={{ padding: '5px 10px', borderRadius: 'var(--tap-r-md)', cursor: 'pointer', color: 'var(--tap-text-1)', background: genMode === m.id ? 'rgba(0,207,255,0.10)' : 'transparent' }}
                  onMouseEnter={e => { if (genMode !== m.id) e.currentTarget.style.background = 'rgba(0,207,255,0.10)'; }}
                  onMouseLeave={e => { if (genMode !== m.id) e.currentTarget.style.background = 'transparent'; }}>
                  <span style={{ fontSize: '11px', fontWeight: 500 }}>{m.label}</span>
                  <span style={{ fontSize: '9px', color: 'var(--tap-text-3)', marginLeft: '4px' }}>{m.desc}</span>
                </div>))}</PD>}
            </div>

            <span style={{ width: '1px', height: '14px', background: 'rgba(0,0,0,0.10)', flexShrink: 0 }} />
            {/* Duration */}
            <div style={{ position: 'relative' }}><DropBtn v={curDuration} picker="dur" />
              {open === 'dur' && <PD onClose={() => setOpen(null)} anchorRect={anchorRect}>{durations.map(d => (
                <div key={d} onClick={() => { setCurDuration(d); patch('duration', d); setOpen(null); }}
                  style={{ height: '30px', padding: '0 10px', borderRadius: 'var(--tap-r-md)', cursor: 'pointer', color: 'var(--tap-text-1)', background: curDuration === d ? 'rgba(0,207,255,0.10)' : 'transparent', display: 'flex', alignItems: 'center', fontSize: '11px' }}
                  onMouseEnter={e => { if (curDuration !== d) e.currentTarget.style.background = 'rgba(0,207,255,0.10)'; }}
                  onMouseLeave={e => { if (curDuration !== d) e.currentTarget.style.background = 'transparent'; }}>
                  {d}
                </div>))}</PD>}
            </div>

            <span style={{ width: '1px', height: '14px', background: 'rgba(0,0,0,0.10)', flexShrink: 0 }} />
            {/* Aspect + Resolution */}
            <div style={{ position: 'relative' }}><DropBtn v={`${curAspect}·${curRes}`} picker="fmt" />
              {open === 'fmt' && <PD onClose={() => setOpen(null)} anchorRect={anchorRect}><div style={{ padding: '2px 0' }}>
                <div style={{ fontSize: '9px', color: 'var(--tap-text-4)', padding: '1px 10px' }}>画幅比例</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', padding: '0 8px', marginBottom: '6px' }}>
                  {ALL_ASPECTS.map(a => {
                    const ar = ASPECT_RECTS[a] || { w: 16, h: 9 };
                    const B = 20, s = Math.min(B / ar.w, B / ar.h);
                    const pw = Math.round(ar.w * s), ph = Math.round(ar.h * s);
                    const active = curAspect === a;
                    return (
                      <div key={a} onClick={() => { setCurAspect(a); patch('aspect', a); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer', background: active ? 'rgba(0,207,255,0.10)' : 'transparent', border: active ? '1px solid rgba(0,0,0,0.08)' : '1px solid transparent' }}>
                        <div style={{ width: B, height: B, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <div style={{ width: pw, height: ph, border: '1.5px solid ' + (active ? 'var(--tap-accent)' : 'rgba(0,0,0,0.18)'), borderRadius: '1px', background: active ? 'rgba(74,158,255,0.06)' : 'transparent' }} />
                        </div>
                        <span style={{ fontSize: '10px', color: active ? 'var(--tap-text-1)' : 'var(--tap-text-3)', fontWeight: active ? 600 : 400 }}>{a}</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ height: '1px', background: 'var(--tap-divider)', margin: '0 10px' }} />
                <div style={{ fontSize: '9px', color: 'var(--tap-text-4)', padding: '3px 10px 1px' }}>分辨率</div>
                <div style={{ display: 'flex', gap: '2px', padding: '0 6px 3px' }}>{resolutions.map(r => (
                  <span key={r} onClick={() => { setCurRes(r); patch('resolution', r); }}
                    style={{ flex: 1, padding: '3px 5px', borderRadius: '3px', fontSize: '10px', cursor: 'pointer', textAlign: 'center', background: curRes === r ? 'rgba(0,207,255,0.10)' : 'transparent', color: curRes === r ? 'var(--tap-text-1)' : 'var(--tap-text-3)' }}>{r}</span>
                ))}</div>
                <div style={{ height: '1px', background: 'var(--tap-divider)', margin: '0 10px' }} />
                <div onClick={() => { setSoundOn(!soundOn); patch(isKling ? 'keepOriginalSound' : 'generateAudio', !soundOn); }}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', cursor: 'pointer', fontSize: '10px' }}>
                  <span style={{ color: 'var(--tap-text-2)' }}>音乐</span>
                  <span style={{ width: '24px', height: '14px', borderRadius: '7px', background: soundOn ? '#f80' : 'rgba(255,255,255,0.12)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <span style={{ position: 'absolute', top: '2px', left: soundOn ? '12px' : '2px', width: '10px', height: '10px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </span>
                </div>
              </div></PD>}
            </div>

            <div style={{ flex: 1 }} />
            {/* Count */}
            <span style={{ width: '1px', height: '14px', background: 'rgba(0,0,0,0.10)', flexShrink: 0 }} />
            <div style={{ position: 'relative' }}><DropBtn v={`×${count}`} picker="cnt" />
              {open === 'cnt' && <PD onClose={() => setOpen(null)} anchorRect={anchorRect}>
                {[1, 2].map(c => (
                  <div key={c} onClick={() => { setCount(c); setOpen(null); }}
                    style={{ height: '28px', padding: '0 10px', borderRadius: 'var(--tap-r-md)', cursor: 'pointer', color: 'var(--tap-text-1)', background: count === c ? 'rgba(0,207,255,0.10)' : 'transparent', display: 'flex', alignItems: 'center', fontSize: '11px', gap: '6px' }}
                    onMouseEnter={e => { if (count !== c) e.currentTarget.style.background = 'rgba(0,207,255,0.10)'; }}
                    onMouseLeave={e => { if (count !== c) e.currentTarget.style.background = 'transparent'; }}>
                    ×{c}
                  </div>))}
              </PD>}
            </div>
            <span style={{ width: '1px', height: '14px', background: 'rgba(0,0,0,0.10)', flexShrink: 0 }} />
            {/* Send */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', width: '50px', height: '20px', borderRadius: '10px', background: 'linear-gradient(135deg,rgba(0,0,0,0.03) 0%,rgba(0,0,0,0.01) 50%,rgba(0,0,0,0.03) 100%)', border: '1px solid var(--tap-divider)', boxShadow: '0 0 10px rgba(0,0,0,0.02),inset 0 1px 0 rgba(0,0,0,0.03)', flexShrink: 0, paddingRight: '2px' }}>
              {genRunning && <span style={{color:'#00CFFF',fontSize:'10px',fontWeight:500,marginRight:'4px'}}>-80 积分</span>}
              <button onClick={handleGenerate} disabled={genRunning}
                style={{ width: '16px', height: '16px', borderRadius: '50%', background: genRunning ? 'var(--tap-warning)' : '#FFF65D', color: genRunning ? '#fff' : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: genRunning ? '8px' : '9px', cursor: genRunning ? 'wait' : 'pointer', border: 'none', boxShadow: '0 1.5px 4px rgba(0,0,0,0.2), 0 1px 1.5px rgba(0,0,0,0.12)', transition: 'transform 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => { if (!genRunning) { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.22)'; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1.5px 4px rgba(0,0,0,0.2), 0 1px 1.5px rgba(0,0,0,0.12)'; }}
              >{genRunning ? '⏳' : '↑'}</button>
            </div>
          </div>

          {showMention && mentionList.length > 0 && createPortal(
            <div onMouseDown={e => e.preventDefault()} style={{ position: 'fixed', bottom: panelRef.current ? window.innerHeight - panelRef.current.getBoundingClientRect().top + 4 : 200, left: panelRef.current ? panelRef.current.getBoundingClientRect().left : '25vw', width: 360, background: 'var(--tap-panel)', border: '1px solid var(--tap-border)', borderRadius: 'var(--tap-r-lg)', padding: '8px', zIndex: 99999, maxHeight: '180px', overflowY: 'auto', boxShadow: 'var(--tap-shadow-lg)' }}>
              <div style={{ fontSize: 10, color: 'var(--tap-text-4)', padding: '2px 6px' }}>选择参考图</div>
              {mentionList.map((m, i) => (<div key={i} onClick={() => { setPrompt(insertMention(m, prompt)); setShowMention(false); }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,207,255,0.10)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 6, borderRadius: 'var(--tap-r-sm)', cursor: 'pointer', background: 'transparent' }}>
                <img src={m.url} style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover' }} />
                <div><div style={{ fontSize: 'var(--tap-fs-body)', color: 'var(--tap-text-1)', fontWeight: 500 }}>{m.name}</div></div>
              </div>))}
            </div>, document.body)}
        </div>
        </div>
      )}
    </div>
  </>
  );
}

function Thumb({ url, num, onRemove }: { url: string; num?: number; onRemove: () => void }) {
  return <div style={{ width: '22px', height: '22px', borderRadius: '3px', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
    <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    {num && <span style={{ position: 'absolute', bottom: 0, left: 0, fontSize: '6px', color: '#fff', background: 'rgba(0,0,0,0.7)', padding: '0 1px' }}>{num}</span>}
    <span onClick={e => { e.stopPropagation(); onRemove(); }} style={{ position: 'absolute', top: 0, right: 0, width: '10px', height: '10px', background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.4)', fontSize: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</span>
  </div>;
}

function ToolBtn({ icon, label, active, onClick }: { icon: string; label: string; active?: boolean; onClick: () => void }) {
  const [hover, setHover] = useState(false); const fg = active || hover ? 'var(--tap-text-1)' : 'var(--tap-text-2)';
  return <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} title={label}
    style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', color: fg, background: active ? 'rgba(255,255,255,0.12)' : hover ? 'rgba(255,255,255,0.08)' : 'transparent', border: 'none', cursor: 'pointer', transition: `all var(--tap-dur-fast) var(--tap-ease)` }}>
    {icon === 'crop-svg' ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M18 22V8a2 2 0 0 0-2-2H2" /></svg>
    : icon === 'relight-svg' ? <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={fg} strokeWidth="1.1"><circle cx="12" cy="13" r="7" /><ellipse cx="12" cy="13" rx="11" ry="3.5" transform="rotate(-25 12 13)" /></svg>
    : icon}</button>;
}

function PD({ children, onClose, anchorRect }: { children: React.ReactNode; onClose: () => void; anchorRect?: DOMRect | null }) {
  const top = anchorRect ? anchorRect.bottom + 4 : '50%';
  const left = anchorRect ? anchorRect.left : '50%';
  return createPortal(<>
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
    <div style={{ position: 'fixed', top, left, minWidth: '200px', padding: 'var(--tap-space-2)', zIndex: 9999, background: 'var(--tap-panel)', border: '1px solid var(--tap-border)', borderRadius: 'var(--tap-r-lg)', boxShadow: 'var(--tap-shadow-lg)', backdropFilter: 'blur(var(--tap-blur))', animation: 'tap-fade-in 50ms var(--tap-ease)' }}>{children}</div>
  </>, document.body);
}
