/* === VideoGenerateNode — video generation with ref modes === */

import { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useStore } from '@xyflow/react';
import { RefStrip } from '../shared/RefStrip';
import { useMention } from '../shared/useMention';

interface VideoGenMeta {
  prompt: string; model: string; duration: string; resolution: string;
  aspect?: string; seed?: number; negativePrompt?: string;
  refMode?: string;
  firstFrameUrl?: string; lastFrameUrl?: string;
  multiFrames?: string[];
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

const MODELS = [{ name: 'Seedance 2.0', badges: ['热门'], maxDur: '16s' }, { name: 'Kling 3.0', badges: ['推荐'], maxDur: '10s' }];
const DURATIONS = ['4s', '5s', '6s', '8s', '10s', '12s', '15s'];
const ASPECTS = [
  { label: '21:9', w: 21, h: 9 },
  { label: '16:9', w: 16, h: 9 },
  { label: '4:3', w: 4, h: 3 },
  { label: '1:1', w: 1, h: 1 },
  { label: '3:4', w: 3, h: 4 },
  { label: '9:16', w: 9, h: 16 },
];
const RESOLUTIONS = ['720P', '1080P'];
const REF_MODES = [
  { id: 'first', label: '首帧', desc: '上传一张起始画面' },
  { id: 'first-last', label: '首尾帧', desc: '上传起始和结束画面' },
  { id: 'smart-multi', label: '智能多帧', desc: '按序上传多张参考图' },
  { id: 'full-ref', label: '全能参考', desc: '图片·视频·音频·文本自由组合' },
];

const FULL_REF_TYPES = [
  { id: 'image-style', label: '图片定风格', desc: '上传一张图，AI精准还原角色外貌、服装和画面风格', icon: '🖼️', accept: 'image/*' },
  { id: 'video-motion', label: '视频定动作', desc: '参考一段视频，复刻复杂动作、运镜和创意特效', icon: '🎬', accept: 'video/*' },
  { id: 'audio-rhythm', label: '音频定节奏', desc: '提供音频，生成匹配画面节奏和氛围，可对口型', icon: '🎵', accept: 'audio/*' },
];

export function VideoGenerateNode({ id, data, selected }: { id: string; data: VideoGenNodeData; selected?: boolean }) {
  const gen = data.gen || {};
  const panelRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const { showMention, setShowMention, mentionList, detectMention, insertMention } = useMention(data.refUrls, data.styleImageUrl);

  const [prompt, setPrompt] = useState(gen.prompt || '');
  const [curModel, setCurModel] = useState((gen.model && gen.model !== 'GPT Image2') ? gen.model : 'Seedance 2.0');
  const [curDuration, setCurDuration] = useState(gen.duration || '5s');
  const [curAspect, setCurAspect] = useState(gen.aspect || '16:9');
  const [curRes, setCurRes] = useState(gen.resolution || '1080P');
  const [refMode, setRefMode] = useState(gen.refMode || 'first');
  const [firstFrame, setFirstFrame] = useState<string | null>(gen.firstFrameUrl || null);
  const [lastFrame, setLastFrame] = useState<string | null>(gen.lastFrameUrl || null);
  const [multiFrames, setMultiFrames] = useState<string[]>(gen.multiFrames || []);
  const [fullRefs, setFullRefs] = useState<Record<string, string | null>>({
    'image-style': null, 'video-motion': null, 'audio-rhythm': null,
  });
  const [genRunning, setGenRunning] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [musicOn, setMusicOn] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const zoom = useStore(s => s.transform[2]);

  const patch = useCallback((k: string, v: unknown) => { data.onChange?.({ [k]: v }); }, [data]);

  const handleGenerate = () => {
    if (genRunning) return;
    setGenRunning(true);
    const map: Record<string, unknown> = { prompt, model: curModel, duration: curDuration, resolution: curRes, aspect: curAspect, refMode, firstFrameUrl: firstFrame, lastFrameUrl: lastFrame, multiFrames };
    Object.keys(map).forEach(k => patch(k, map[k]));
    Promise.resolve(data.onGenerate?.()).finally(() => setGenRunning(false));
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    const refType = e.target.dataset.refType || '';
    r.onload = () => {
      const url = r.result as string;
      if (refType) { const u = { ...fullRefs, [refType]: url }; setFullRefs(u); patch('fullRefs', u); }
      else if (refMode === 'first') { setFirstFrame(url); patch('firstFrameUrl', url); }
      else if (refMode === 'first-last') {
        if (!firstFrame) { setFirstFrame(url); patch('firstFrameUrl', url); }
        else { setLastFrame(url); patch('lastFrameUrl', url); }
      } else if (refMode === 'smart-multi') {
        const u = [...multiFrames, url]; setMultiFrames(u); patch('multiFrames', u);
      }
    };
    r.readAsDataURL(file);
    e.target.value = '';
  };

  const DropBtn = ({ v, picker }: { v: string; picker: string }) => (
    <span onClick={e => {
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      setAnchorRect(rect);
      setOpen(open === picker ? null : picker);
    }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '4px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 500, cursor: 'pointer', background: open === picker ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)', color: 'var(--tap-text-1)', border: '1px solid rgba(255,255,255,0.08)', whiteSpace: 'nowrap' }}>
      {v} <span style={{ fontSize: '8px', opacity: 0.5 }}>▼</span>
    </span>
  );

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-20px', left: '8px', zIndex: 10, fontSize: '10px', fontWeight: 500, color: 'var(--tap-text-4)', letterSpacing: '0.05em' }}>VIDEO</div>
        <Handle type="target" position={Position.Left} id="video-in" style={{ width: '19px', height: '19px', background: 'var(--tap-panel)', border: '2px solid rgba(180,180,185,0.5)', borderRadius: '50%', left: '-20px', top: '50%', opacity: selected || data.isConnecting || data.hasConnections ? 1 : 0, pointerEvents: "all", transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, lineHeight: 1, color: 'rgba(180,180,185,0.7)' }}><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg></Handle>
        <Handle type="source" position={Position.Right} id="video-out" style={{ width: '19px', height: '19px', background: 'var(--tap-panel)', border: '2px solid rgba(180,180,185,0.5)', borderRadius: '50%', right: '-20px', top: '50%', opacity: selected || data.isConnecting || data.hasConnections ? 1 : 0, pointerEvents: "all", transition: 'opacity 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, lineHeight: 1, color: 'rgba(180,180,185,0.7)' }}><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg></Handle>

        {/* Toolbar area: upload bar (no content) or tools (has content) */}
        {selected && (
          data.videoUrl ? (
            <div style={{ position: 'absolute', top: '-56px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', alignItems: 'center', gap: '2px', padding: '4px', background: 'rgba(22,26,34,0.92)', borderRadius: '12px', backdropFilter: 'blur(16px)', boxShadow: '0 8px 24px rgba(0,0,0,0.45)' }}>
              <ToolBtn icon="crop-svg" label="裁切" onClick={() => data.onOpenTool?.('crop')} />
              <ToolBtn icon="⊿" label="多角度" onClick={() => data.onOpenTool?.('multiAngle')} />
              <ToolBtn icon="◐" label="重绘" onClick={() => data.onOpenTool?.('inpaint')} />
              <ToolBtn icon="relight-svg" label="打光" onClick={() => data.onOpenTool?.('relight')} />
            </div>
          ) : (
            <div onClick={() => uploadRef.current?.click()} style={{ position: 'absolute', top: '-56px', left: '50%', transform: 'translateX(-50%)', zIndex: 100, display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', background: 'rgba(22,26,34,0.92)', borderRadius: '14px', backdropFilter: 'blur(16px)', boxShadow: '0 8px 24px rgba(0,0,0,0.45)', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', borderBottomLeftRadius: '0', borderBottomRightRadius: '0' }}>
              <span style={{ fontSize: '16px' }}>↑</span>
              <span style={{ fontSize: '11px', fontWeight: 500, color: 'var(--tap-text-2)' }}>上传</span>
            </div>
          )
        )}

        <div style={{ width: 'var(--tap-node-width)', borderRadius: 'var(--tap-node-radius)', overflow: 'hidden', border: selected ? '2px solid rgba(255,255,255,0.28)' : '1px solid var(--tap-border)', background: 'var(--tap-panel)', boxShadow: selected ? 'var(--tap-shadow-md)' : 'var(--tap-shadow-sm)', transition: `all var(--tap-dur-fast) var(--tap-ease)` }}>
          <div style={{ width: '100%', height: '220px', background: 'linear-gradient(135deg, rgba(180,180,185,0.05), rgba(180,180,185,0.01))', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
            {data.videoUrl ? (
              <video src={data.videoUrl} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 'var(--tap-r-xl)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px 0', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
            <RefStrip nodeId={id} refUrls={data.refUrls} />
            {/* Full-ref mode: show 3 upload slots */}
            {refMode === 'full-ref' ? (
              FULL_REF_TYPES.map(t => (
                <div key={t.id} onClick={() => uploadRef.current?.click()}
                  data-ref-type={t.id}
                  title={t.desc}
                  style={{ width: '40px', height: '40px', borderRadius: '6px', border: fullRefs[t.id] ? '1px solid rgba(100,255,180,0.3)' : '1px dashed rgba(255,255,255,0.12)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, gap: '1px', background: fullRefs[t.id] ? 'rgba(100,255,180,0.06)' : 'transparent', overflow: 'hidden', position: 'relative' }}>
                  {fullRefs[t.id] ? (
                    <>
                      {(t.id === 'audio-rhythm') ? (
                        <span style={{ fontSize: '16px' }}>🎵</span>
                      ) : (
                        <img src={fullRefs[t.id]!} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute' }} />
                      )}
                      <span style={{ fontSize: '8px', color: 'rgba(100,255,180,0.8)', zIndex: 1, background: 'rgba(0,0,0,0.6)', padding: '0 3px', borderRadius: '2px' }}>✓</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '12px' }}>{t.icon}</span>
                      <span style={{ fontSize: '7px', color: 'var(--tap-text-4)' }}>{t.label.slice(0,2)}</span>
                    </>
                  )}
                </div>
              ))
            ) : (
              <div onClick={() => uploadRef.current?.click()} title="上传本地文件"
                style={{ width: '40px', height: '40px', borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: '11px', color: 'var(--tap-text-4)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.color = 'var(--tap-text-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'var(--tap-text-4)'; }}
              >本地</div>
            )}
            <div style={{ flex: 1 }} />
            <span onClick={() => setExpanded(!expanded)} title={expanded ? '收起' : '展开'}
              style={{ fontSize: '12px', color: 'var(--tap-text-4)', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--tap-text-2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tap-text-4)'; }}
            >{expanded ? '↥' : '↧'}</span>
          </div>
          <textarea value={prompt} onChange={e => { const v=e.target.value; setPrompt(v); detectMention(v, e.target.selectionStart||0); }}
            onPointerDownCapture={e => e.stopPropagation()} onMouseDownCapture={e => e.stopPropagation()}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
            placeholder="描述你想生成的视频内容…" maxLength={4000} rows={expanded ? 8 : 3}
            style={{ width: '100%', background: 'transparent', border: 'none', padding: '8px 14px', fontSize: 'var(--tap-fs-body)', color: 'var(--tap-text-1)', resize: 'none', outline: 'none', lineHeight: 1.5 }} />

          {/* Single controls row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', flexWrap: 'wrap' }}>
            {/* Model */}
            <div style={{ position: 'relative' }}><DropBtn v={curModel} picker="model" />
              {open === 'model' && <PD onClose={() => setOpen(null)} anchorRect={anchorRect}>{MODELS.map(m => <div key={m.name} onClick={() => { setCurModel(m.name); patch('model', m.name); setOpen(null); }} style={{ display: 'flex', justifyContent: 'space-between', height: '36px', padding: '0 12px', borderRadius: 'var(--tap-r-md)', cursor: 'pointer', color: 'var(--tap-text-1)', background: curModel === m.name ? 'var(--tap-hover)' : 'transparent' }} onMouseEnter={e => { if (curModel !== m.name) e.currentTarget.style.background = 'var(--tap-hover)'; }} onMouseLeave={e => { if (curModel !== m.name) e.currentTarget.style.background = 'transparent'; }}><span>{m.name}</span><span style={{ fontSize: '10px', color: 'var(--tap-text-3)' }}>{m.maxDur}</span></div>)}</PD>}
            </div>

            {/* Duration */}
            <div style={{ position: 'relative' }}><DropBtn v={curDuration} picker="dur" />
              {open === 'dur' && <PD onClose={() => setOpen(null)} anchorRect={anchorRect}>{DURATIONS.map(d => <div key={d} onClick={() => { setCurDuration(d); patch('duration', d); setOpen(null); }} style={{ height: '34px', padding: '0 12px', borderRadius: 'var(--tap-r-md)', cursor: 'pointer', color: 'var(--tap-text-1)', background: curDuration === d ? 'var(--tap-hover)' : 'transparent', display: 'flex', alignItems: 'center' }} onMouseEnter={e => { if (curDuration !== d) e.currentTarget.style.background = 'var(--tap-hover)'; }} onMouseLeave={e => { if (curDuration !== d) e.currentTarget.style.background = 'transparent'; }}>{d}</div>)}</PD>}
            </div>

            {/* Aspect + Res */}
            <div style={{ position: 'relative' }}><DropBtn v={`${curAspect}·${curRes}`} picker="fmt" />
              {open === 'fmt' && <PD onClose={() => setOpen(null)} anchorRect={anchorRect}><div style={{ padding: '4px 0' }}>
                <div style={{ fontSize: '10px', color: 'var(--tap-text-4)', padding: '2px 12px' }}>画幅比例</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', padding: '0 12px', marginBottom: '8px' }}>{ASPECTS.map(a => {
  const B = 36; // uniform box size
  const s = Math.min(B / a.w, B / a.h);
  const pw = a.w * s * 0.55, ph = a.h * s * 0.55;
  return (
  <div key={a.label} onClick={() => { setCurAspect(a.label); patch('aspect', a.label); }}
    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '6px 4px', borderRadius: '6px', cursor: 'pointer', background: curAspect === a.label ? 'var(--tap-hover)' : 'transparent', border: curAspect === a.label ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent' }}>
    <div style={{ width: B * 0.55, height: B * 0.55, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: pw, height: ph, border: '1.5px solid ' + (curAspect === a.label ? 'var(--tap-accent)' : 'rgba(255,255,255,0.25)'), borderRadius: '2px', background: curAspect === a.label ? 'rgba(74,158,255,0.08)' : 'transparent' }} />
    </div>
    <span style={{ fontSize: '10px', color: curAspect === a.label ? 'var(--tap-text-1)' : 'var(--tap-text-3)', fontWeight: curAspect === a.label ? 600 : 400 }}>{a.label}</span>
  </div>
)} )}</div>
                <div style={{ height: '1px', background: 'var(--tap-divider)', margin: '0 12px' }} />
                <div style={{ fontSize: '10px', color: 'var(--tap-text-4)', padding: '4px 12px 2px' }}>分辨率</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px', padding: '0 8px 4px' }}>{RESOLUTIONS.map(r => <span key={r} onClick={() => { setCurRes(r); patch('resolution', r); }} style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', textAlign: 'center', background: curRes === r ? 'var(--tap-hover)' : 'transparent', color: curRes === r ? 'var(--tap-text-1)' : 'var(--tap-text-3)' }}>{r}</span>)}</div>
                <div style={{ height: '1px', background: 'var(--tap-divider)', margin: '0 12px' }} />
                <div onClick={() => { setMusicOn(!musicOn); patch('musicOn', !musicOn); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', cursor: 'pointer', fontSize: '11px' }}>
                  <span style={{ color: 'var(--tap-text-2)' }}>背景音乐</span>
                  <span style={{ width: '28px', height: '16px', borderRadius: '8px', background: musicOn ? '#f80' : 'rgba(255,255,255,0.15)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <span style={{ position: 'absolute', top: '2px', left: musicOn ? '14px' : '2px', width: '12px', height: '12px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </span>
                </div>
              </div></PD>}
            </div>

            {/* Ref mode */}
            <div style={{ position: 'relative' }}><DropBtn v={REF_MODES.find(r => r.id === refMode)?.label || '首帧'} picker="ref" />
              {open === 'ref' && <PD onClose={() => setOpen(null)} anchorRect={anchorRect}>{REF_MODES.map(r => <div key={r.id} onClick={() => { setRefMode(r.id); setOpen(null); }} style={{ padding: '8px 12px', borderRadius: 'var(--tap-r-md)', cursor: 'pointer', color: 'var(--tap-text-1)', background: refMode === r.id ? 'var(--tap-hover)' : 'transparent' }} onMouseEnter={e => { if (refMode !== r.id) e.currentTarget.style.background = 'var(--tap-hover)'; }} onMouseLeave={e => { if (refMode !== r.id) e.currentTarget.style.background = 'transparent'; }}><div style={{ fontSize: 'var(--tap-fs-body)', fontWeight: 500 }}>{r.label}</div><div style={{ fontSize: '10px', color: 'var(--tap-text-3)' }}>{r.desc}</div></div>)}</PD>}
            </div>

            <div style={{ flex: 1 }} />
            <button onClick={handleGenerate} disabled={genRunning}
              style={{ width: '28px', height: '28px', borderRadius: '50%', background: genRunning ? 'var(--tap-warning)' : prompt.trim() ? 'var(--tap-accent)' : 'rgba(255,255,255,0.08)', color: genRunning || prompt.trim() ? '#fff' : 'var(--tap-text-4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: genRunning ? '16px' : '13px', cursor: genRunning ? 'wait' : 'pointer', border: 'none', animation: genRunning ? 'tap-pulse-glow 1.5s ease infinite' : 'none' }}
            >{genRunning ? '⏳' : '↑'}</button>
          </div>
          <input ref={uploadRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleUpload} />
          {showMention && mentionList.length > 0 && createPortal(
            <div onMouseDown={e=>e.preventDefault()} style={{position:'fixed',bottom:panelRef.current?window.innerHeight-panelRef.current.getBoundingClientRect().top+4:200,left:panelRef.current?panelRef.current.getBoundingClientRect().left:'25vw',width:360,background:'var(--tap-panel)',border:'1px solid var(--tap-border)',borderRadius:'var(--tap-r-lg)',padding:'8px',zIndex:99999,maxHeight:'180px',overflowY:'auto',boxShadow:'var(--tap-shadow-lg)'}}>
              <div style={{fontSize:10,color:'var(--tap-text-4)',padding:'2px 6px'}}>选择参考图</div>
              {mentionList.map((m,i)=>(<div key={i} onClick={()=>{setPrompt(insertMention(m,prompt));setShowMention(false)}} onMouseEnter={e=>e.currentTarget.style.background='var(--tap-hover)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} style={{display:'flex',alignItems:'center',gap:10,padding:6,borderRadius:'var(--tap-r-sm)',cursor:'pointer',background:'transparent'}}><img src={m.url} style={{width:36,height:36,borderRadius:4,objectFit:'cover'}}/><div><div style={{fontSize:'var(--tap-fs-body)',color:'var(--tap-text-1)',fontWeight:500}}>{m.name}</div></div></div>))}
            </div>, document.body)}
        </div>
        </div>
      )}
    </div>
  );
}

function Thumb({ url, num, onRemove }: { url: string; num?: number; onRemove: () => void }) {
  return <div style={{ width: '26px', height: '26px', borderRadius: '4px', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
    <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    {num && <span style={{ position: 'absolute', bottom: 0, left: 0, fontSize: '7px', color: '#fff', background: 'rgba(0,0,0,0.7)', padding: '0 2px' }}>{num}</span>}
    <span onClick={e => { e.stopPropagation(); onRemove(); }} style={{ position: 'absolute', top: 0, right: 0, width: '12px', height: '12px', background: 'rgba(0,0,0,0.7)', color: 'rgba(255,255,255,0.5)', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>✕</span>
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
