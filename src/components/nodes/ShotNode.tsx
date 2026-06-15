/* === ShotNode — Text generation node === */
/* Agent decides output type (storyboard / image-prompt / etc.) based on user input */

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useStore } from '@xyflow/react';
import { RefStrip } from '../shared/RefStrip';
import { useMention } from '../shared/useMention';
import { useCanvasStore } from '../../store/useCanvasStore';
import { getSharedApiKey } from '../../api/gateway';

interface ShotNodeData {
  title: string;
  shot?: {
    intent_cn?: string;
    framing?: string;
    movement?: string;
    key?: string;
    lens?: string;
    angle?: string;
    aperture?: number;
    mood?: string;
    color?: string;
    lighting?: string;
    composition?: string;
    blocking?: string;
  };
  gen?: {
    prompt?: string;
    model?: string;
    [key: string]: unknown;
  };
  imageUrl?: string;
  isConnecting?: boolean;
  isConnectTarget?: boolean;
  multiSelect?: boolean;
  isPickMode?: boolean;
  isPickTarget?: boolean;
  hasConnections?: boolean;
  refUrls?: string[];
  styleImageUrl?: string | null;
  onChange?: (patch: Record<string, unknown>) => void;
  onGenerate?: () => void;
}

export function ShotNode({ id, data, selected }: { id: string; data: ShotNodeData; selected?: boolean }) {
  const shot = data.shot || {};
  const gen = data.gen || {};
  const panelRef = useRef<HTMLDivElement>(null);
  const { showMention, setShowMention, mentionList, detectMention, insertMention } = useMention(data.refUrls, data.styleImageUrl);
  const [hovered, setHovered] = useState(false);
  const [prompt, setPrompt] = useState(gen.prompt || (data as any).prompt || '');
  const [expanded, setExpanded] = useState(false);
  const [genRunning, setGenRunning] = useState(false);
  const [scriptMode, setScriptMode] = useState(false);
  const [visualStyle, setVisualStyle] = useState('真人电影');
  const [scriptOverview, setScriptOverview] = useState<any>(null); // Phase 1 result
  const [scriptResult, setScriptResult] = useState<any>(null);
  const [phase, setPhase] = useState<'input'|'overview'|'shots'>('input');
  const zoom = useStore(s => s.transform[2]);
  const genRunningRef = useRef(false);
  const mentionedUrlsRef = useRef<string[]>([]);
  const canvasStore = useCanvasStore();
  const tagStyle = { fontSize:'9px', fontWeight:600, color:'var(--tap-accent)', background:'rgba(74,158,255,0.1)', padding:'1px 6px', borderRadius:'var(--tap-r-full)' } as const;

  const patch = useCallback((k: string, v: unknown) => {
    data.onChange?.({ [k]: v });
  }, [data]);

  // 自动保存输入框内容（200ms 防抖）
  const promptRef = useRef(prompt);
  promptRef.current = prompt;
  useEffect(() => {
    const t = setTimeout(() => { if (promptRef.current) patch('prompt', promptRef.current); }, 200);
    return () => clearTimeout(t);
  }, [prompt]);
  // 组件卸载时立即保存
  useEffect(() => () => { if (promptRef.current) patch('prompt', promptRef.current); }, []);

  const handleGenerate = () => {
    if (genRunningRef.current) return;
    if (scriptMode) {
      handleScriptAnalysis();
      return;
    }
    // Allow empty prompt when reference images are connected (reverse-prompt mode)
    if (!prompt.trim() && (!(data as any).refUrls || (data as any).refUrls.length === 0)) return;
    genRunningRef.current = true;
    setGenRunning(true);
    patch('prompt', prompt);
    Promise.resolve(data.onGenerate?.()).finally(() => {
      genRunningRef.current = false;
      setGenRunning(false);
    });
  };

  const handleScriptAnalysis = async () => {
    if (!prompt.trim()) return;
    genRunningRef.current = true;
    setGenRunning(true);
    try {
      const resp = await fetch('/api/agent/script/overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSharedApiKey()}` },
        body: JSON.stringify({ scriptText: prompt, visualStyle }),
      });
      const json = await resp.json();
      if (json.success) {
        setScriptOverview(json);
        setPhase('overview');
        console.log('[overview] ' + json.scenes?.length + ' scenes');
      }
    } catch (err) { console.error('[overview] Error:', err); }
    finally { genRunningRef.current = false; setGenRunning(false); }
  };

  const handleSceneShot = async (sceneIndex: number) => {
    const overview = scriptOverview;
    if (!overview) return;
    const scene = overview.scenes[sceneIndex];
    if (!scene) return;
    genRunningRef.current = true;
    setGenRunning(true);
    try {
      // Extract script excerpt for this scene (send full text, agent filters)
      const resp = await fetch('/api/agent/script/scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSharedApiKey()}` },
        body: JSON.stringify({
          scene, scriptExcerpt: prompt,
          visualBible: overview.visualBible,
          characterProfiles: overview.characterProfiles,
        }),
      });
      const json = await resp.json();
      if (json.success && json.shots?.length > 0) {
        setScriptResult(json);
        setPhase('shots');
        // Create image nodes from shots
        const cx = canvasStore.nodes.get(id);
        if (cx) {
          const COLS = 4;
          const baseX = (cx.pos?.x || 0) + 340;
          const baseY = (cx.pos?.y || 0) + 200;
          const now = new Date().toISOString();
          const st = useCanvasStore.getState();
          const next = new Map(st.nodes);
          json.shots.forEach((shot: any, shi: number) => {
            const row = Math.floor(shi / COLS);
            const col = shi % COLS;
            const label = shot.shotType + ' #' + (scene.sceneNumber||'') + '-' + shot.shotNumber;
            const nid = 'img_' + Date.now() + '_s' + sceneIndex + '_' + shi;
            next.set(nid, {
                  id: nid, type: 'image.generate', title: label,
                  pos: { x: baseX + col * 340, y: baseY + row * 400 },
                  size: { w: 380, h: 200 }, ports: [], status: 'idle',
                  meta: {
                    gen: {
                      prompt: shot.visualPrompt,
                      videoPrompt: shot.videoPrompt || '',
                      model: 'GPT Image2', aspect: '16:9',
                      resolution: '2K', quality: 'high',
                    },
                    characters: scene.characters || [],  // 场景角色标签
                    sceneType: scene.sceneType || '',     // establishing/action/dialogue
                    shot: {
                      shotType: shot.shotType,
                      cameraMovement: shot.cameraMovement,
                      angle: shot.angle, aperture: shot.aperture,
                      writerIntent: shot.writerIntent || '',
                      lighting: shot.lighting || '',
                      composition: shot.composition || '',
                      blocking: shot.blocking || '',
                      role: shot.role || '',
                    },
                  },
                  createdAt: now, updatedAt: now,
                });
                useCanvasStore.setState({ nodes: next });
          });
          canvasStore.triggerSync();
        }
      }
    } catch (err) { console.error('[scene-shot] Error:', err); }
    finally { genRunningRef.current = false; setGenRunning(false); }
  };

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Card wrapper */}
      <div style={{ position: 'relative' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div style={{ position: 'absolute', top: '-20px', left: '8px', zIndex: 10, fontSize: '10px', fontWeight: 500, color: 'var(--tap-text-4)', letterSpacing: '0.05em' }}>TEXT</div>

        <Handle type="target" position={Position.Left} id="refs-in"
          style={{
            width: '19px', height: '19px', background: 'var(--tap-panel)',
            border: '2px solid rgba(180,180,185,0.5)', borderRadius: '50%',
            left: '-20px', top: '50%', opacity: selected || hovered || data.isConnecting || data.hasConnections ? 1 : 0, pointerEvents: "all", transition: 'opacity 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, lineHeight: 1, color: 'rgba(180,180,185,0.7)',
          }}
        ><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg></Handle>
        <Handle type="source" position={Position.Right} id="shot-out"
          style={{
            width: '19px', height: '19px', background: 'var(--tap-panel)',
            border: '2px solid rgba(180,180,185,0.5)', borderRadius: '50%',
            right: '-20px', top: '50%', opacity: selected || hovered || data.isConnecting || data.hasConnections ? 1 : 0, pointerEvents: "all", transition: 'opacity 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, lineHeight: 1, color: 'rgba(180,180,185,0.7)',
          }}
        ><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg></Handle>

        {/* Main Card */}
        <div style={{
          width: '280px',
          background: 'var(--tap-panel)',
          border: data.isPickTarget
            ? '2px solid rgba(180,180,185,0.55)'
            : data.isPickMode
              ? '1px dashed rgba(180,180,185,0.3)'
              : data.isConnectTarget
                ? '1px solid rgba(180,180,185,0.5)'
                : selected ? '2px solid rgba(180,180,185,0.45)' : '1px solid var(--tap-border)',
          borderRadius: 'var(--tap-r-xl)',
          boxShadow: data.isPickTarget
            ? '0 0 28px rgba(180,180,185,0.25)'
            : data.isConnectTarget
              ? '0 0 28px rgba(180,180,185,0.2)'
              : selected ? '0 0 20px rgba(180,180,185,0.08)' : 'var(--tap-shadow-sm)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          transition: `all var(--tap-dur-fast) var(--tap-ease)`,
        }}>
          {/* Title */}
          <textarea
            value={data.title || ''}
            onChange={e => { data.onChange?.({ title: e.target.value }); }}
            placeholder="标题…"
            onPointerDownCapture={e => { e.stopPropagation() }}
            onMouseDownCapture={e => { e.stopPropagation() }}
            rows={1}
            style={{
              fontSize: 'var(--tap-fs-h2)', fontWeight: 600,
              color: 'var(--tap-text-1)', background: 'transparent',
              border: 'none', outline: 'none', width: '100%',
              resize: 'none', overflow: 'hidden', lineHeight: 1.4,
            }}
            onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
          />

          {/* Phase 1 result: Scene overview list */}
          {scriptMode && phase === 'overview' && scriptOverview?.scenes && (
            <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
              <div style={{ fontSize:10,color:'var(--tap-accent)',fontWeight:600 }}>📋 {scriptOverview.scriptTitle} — {scriptOverview.scenes.length} 个场景</div>
              {/* 角色清单 — 让用户确认 Agent 判断 */}
              {scriptOverview.characterProfiles && Object.keys(scriptOverview.characterProfiles).length > 0 && (
                <div style={{ display:'flex',flexWrap:'wrap',gap:4,padding:'4px 0' }}>
                  <span style={{ fontSize:9,color:'var(--tap-text-4)' }}>角色：</span>
                  {Object.entries(scriptOverview.characterProfiles).map(([name,info]:[string,any]) => (
                    <span key={name} style={{ fontSize:9,padding:'1px 6px',borderRadius:10,
                      background:info.role==='主角'?'rgba(100,180,255,0.12)':info.role==='反派'?'rgba(255,100,100,0.12)':'rgba(255,255,255,0.06)',
                      color:info.role==='主角'?'#88bbff':info.role==='反派'?'#ff8888':'var(--tap-text-3)' }}>
                      {name} ({info.role})
                    </span>
                  ))}
                </div>
              )}
              {/* 一键生成角色设定图 */}
              {scriptOverview.characterProfiles && Object.keys(scriptOverview.characterProfiles).length>0 && (
                <div onClick={async () => {
                  const profiles = scriptOverview.characterProfiles;
                  const st2 = useCanvasStore.getState();
                  const next2 = new Map(st2.nodes);
                  const baseX = (st2.nodes.get(id)?.pos?.x||0)+340;
                  const baseY = (st2.nodes.get(id)?.pos?.y||0)-100;
                  let ci = 0;
                  for(const [name,info] of Object.entries(profiles) as [string,any][]){
                    const nid='char_'+Date.now()+'_'+ci;
                    next2.set(nid,{id:nid,type:'image.generate',title:'🎭 '+name,
                      pos:{x:baseX+ci*340,y:baseY},size:{w:380,h:200},ports:[],status:'idle',
                      meta:{gen:{prompt:'Character design sheet: '+name+', '+((info as any).appearance||''),model:'GPT Image2',aspect:'3:2',resolution:'2K',quality:'high'},charRole:(info as any).role||'配角'},
                      createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
                    ci++;
                  }
                  useCanvasStore.setState({nodes:next2});canvasStore.triggerSync();
                }} style={{
                  fontSize:10,fontWeight:600,cursor:'pointer',textAlign:'center',
                  padding:'6px 12px',borderRadius:8,marginTop:2,
                  background:'rgba(100,180,255,0.08)',border:'1px solid rgba(100,180,255,0.2)',
                  color:'#88bbff',
                }} onMouseEnter={e=>{e.currentTarget.style.background='rgba(100,180,255,0.14)'}}
                   onMouseLeave={e=>{e.currentTarget.style.background='rgba(100,180,255,0.08)'}}>
                  🎭 一键生成 {Object.keys(scriptOverview.characterProfiles).length} 个角色设定图
                </div>
              )}
              {scriptOverview.scenes.map((s:any,i:number) => (
                <div key={i} onClick={()=>handleSceneShot(i)} style={{
                  padding:'8px 10px',borderRadius:8,cursor:'pointer',
                  background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',
                  display:'flex',justifyContent:'space-between',alignItems:'center',
                }} onMouseEnter={e=>{e.currentTarget.style.background='rgba(100,180,255,0.08)';e.currentTarget.style.borderColor='rgba(100,180,255,0.25)'}}
                   onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'}}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:11,fontWeight:600,color:'var(--tap-text-1)' }}>{s.sceneHeader}</div>
                    <div style={{ fontSize:9,color:'var(--tap-text-4)',marginTop:2 }}>{s.location} · {s.timeOfDay} · {s.sceneType} · ~{s.estimatedShots}镜</div>
                    {s.characters?.length > 0 && <div style={{ fontSize:9,color:'var(--tap-accent)',marginTop:1 }}>角色：{s.characters.join(', ')}</div>}
                    <div style={{ fontSize:9,color:'var(--tap-text-4)',marginTop:1 }}>{s.summary}</div>
                  </div>
                  <span style={{ fontSize:16,color:'var(--tap-text-4)',flexShrink:0 }}>→</span>
                </div>
              ))}
            </div>
          )}

          {/* Content — Agent output area */}
          {scriptMode && phase === 'overview' ? null : genRunning ? (
            <div style={{
              minHeight: '80px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.1)',
                borderTopColor: 'var(--tap-accent)',
                animation: 'tap-spin 0.8s linear infinite',
              }} />
              <div style={{ fontSize: 'var(--tap-fs-meta)', color: 'var(--tap-text-4)' }}>
                Agent 分析中…
              </div>
            </div>
          ) : (shot.intent_cn || (gen.compiledPromptCn as string) || gen.compiledPrompt) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {/* Shot metadata tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {shot.framing && <span style={tagStyle}>{shot.framing}</span>}
                {shot.movement && <span style={tagStyle}>{shot.movement}</span>}
                {shot.lens && <span style={tagStyle}>{shot.lens}</span>}
                {shot.aperture && <span style={tagStyle}>T{shot.aperture}</span>}
                {shot.mood && <span style={{...tagStyle, background:'rgba(180,140,80,0.12)', color:'#c8a060'}}>{shot.mood}</span>}
              </div>
              {/* Writer Intent */}
              {shot.key && <div style={{ fontSize:'11px', color:'#c8a060', lineHeight:1.5, padding:'4px 6px', background:'rgba(180,140,80,0.06)', borderRadius:6, borderLeft:'2px solid rgba(180,140,80,0.3)' }}>📝 {shot.key}</div>}
              {/* Technical details */}
              {(shot.lighting || shot.composition || shot.blocking) && <div style={{ fontSize:'10px', color:'var(--tap-text-3)', lineHeight:1.6, display:'flex', flexDirection:'column', gap:'2px' }}>
                {shot.lighting && <div>💡 光线：{shot.lighting}</div>}
                {shot.composition && <div>📐 构图：{shot.composition}</div>}
                {shot.blocking && <div>🎭 调度：{shot.blocking}</div>}
              </div>}
              {/* Full visual prompt */}
              <div
                onPointerDownCapture={e => e.stopPropagation()}
                onMouseDownCapture={e => e.stopPropagation()}
                style={{
                  overflowY: 'auto',
                  fontSize: 'var(--tap-fs-body)',
                  color: 'var(--tap-text-1)', lineHeight: 1.8,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all', overflowWrap: 'anywhere',
                  userSelect: 'text', cursor: 'text',
                }}>
                {shot.intent_cn || (gen.compiledPromptCn as string) || (gen.compiledPrompt as string)}
              </div>
            </div>
          ) : (
            <div style={{
              minHeight: '80px', fontSize: 'var(--tap-fs-body)',
              color: 'var(--tap-text-4)', lineHeight: 1.8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              输入需求，Agent 自动分析并输出文本
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Prompt Panel ── */}
      {selected && !data.multiSelect && (
        <div
          ref={panelRef}
          onContextMenu={e => e.stopPropagation()}
          onDoubleClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: `translateX(-50%) scale(${1.5/zoom})`,
            transformOrigin: 'top center',
            width: '280px',
            marginTop: `${10/zoom}px`,
            zIndex: 50,
            animation: 'tap-fade-in 50ms var(--tap-ease)',
          }}>
          <div style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 'var(--tap-r-xl)',
            overflow: 'hidden',
          }}>
            {scriptMode && <div style={{ padding: '6px 12px 0' }}>
              <input value={visualStyle} onChange={e=>setVisualStyle(e.target.value)}
                placeholder="视觉风格，如：新海诚动漫、BBC自然纪录片、1970年代意大利铅黄电影、赛博朋克…"
                style={{ width:'100%',background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:6,color:'#ccc',fontSize:10,padding:'4px 8px',outline:'none' }}
                onPointerDownCapture={e=>e.stopPropagation()} onMouseDownCapture={e=>e.stopPropagation()} />
            </div>}
            <div style={{ padding: scriptMode?'4px 12px 0':'8px 12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <RefStrip nodeId={id} refUrls={data.refUrls} />
              <span onClick={() => setExpanded(!expanded)} title={expanded ? '收起' : '展开'}
                style={{ fontSize: '12px', color: 'var(--tap-text-4)', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--tap-text-2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tap-text-4)'; }}
              >{expanded ? '↥' : '↧'}</span>
            </div>
            <textarea
              value={prompt}
              onChange={e => {
                const v = e.target.value;
                setPrompt(v);
                detectMention(v, e.target.selectionStart || 0);
              }}
              onPointerDownCapture={e => { e.stopPropagation() }}
              onMouseDownCapture={e => { e.stopPropagation() }}
              onWheel={e => e.stopPropagation()}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder={scriptMode ? "粘贴完整剧本文本…\n\n例：\n酒吧内景 - 夜\nA一脚踹开大门，大步走进酒吧。所有人转头看向他。\n沉默。\nA走向吧台，坐下。" : "输入需求或场景描述…"}
              rows={scriptMode ? 18 : expanded ? 8 : 4}
              style={{
                width: '100%', background: 'transparent', border: 'none',
                padding: '12px 14px', fontSize: 'var(--tap-fs-body)',
                color: 'var(--tap-text-1)', resize: 'vertical', outline: 'none',
                lineHeight: 1.5, overflowY: 'scroll', minHeight: scriptMode ? '360px' : 'auto',
              }}
            />
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-text-4)', flex: 1 }}>
                {scriptMode ? (phase==='overview'?'📋 点击场景生成分镜':phase==='shots'?'✅ 分镜已生成':'📜 剧本 → 概览') : '✏️ 文本分析'}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setScriptMode(!scriptMode); setScriptResult(null); }}
                style={{
                  fontSize: '10px', fontWeight: 600, cursor: 'pointer',
                  background: scriptMode ? 'rgba(255,180,60,0.15)' : 'rgba(255,255,255,0.04)',
                  border: scriptMode ? '1px solid rgba(255,180,60,0.3)' : '1px solid rgba(255,255,255,0.08)',
                  color: scriptMode ? '#ffaa44' : 'var(--tap-text-4)',
                  borderRadius: 'var(--tap-r-full)', padding: '3px 10px',
                  whiteSpace: 'nowrap',
                }}
              >{scriptMode ? '📜 剧本分析' : '✏️ 文本'}</button>
              {scriptMode && <button onClick={async (e) => {
                e.stopPropagation();
                if (!prompt.trim()||genRunningRef.current) return;
                genRunningRef.current=true;setGenRunning(true);
                try {
                  const resp=await fetch('/api/agent/script/characters',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${getSharedApiKey()}`},body:JSON.stringify({scriptText:prompt})});
                  const json=await resp.json();
                  if(json.success){
                    setScriptOverview({...scriptOverview,characterProfiles:json.characters,scriptTitle:scriptOverview?.scriptTitle||'角色分析'});setPhase('overview');
                    // 自动创建角色设定图节点
                    const chars=json.characters;const st2=useCanvasStore.getState();const next2=new Map(st2.nodes);
                    const baseX=(st2.nodes.get(id)?.pos?.x||0)+340;const baseY=(st2.nodes.get(id)?.pos?.y||0)-100;
                    let ci=0;const COLS2=5;
                    for(const [name,info] of Object.entries(chars) as [string,any][]){
                      const nid='char_'+Date.now()+'_'+ci;
                      next2.set(nid,{id:nid,type:'image.generate',title:'🎭 '+name,
                        pos:{x:baseX+(ci%COLS2)*200,y:baseY+Math.floor(ci/COLS2)*100},size:{w:180,h:80},ports:[],status:'idle',
                        meta:{gen:{prompt:'Character design sheet: '+name+', '+((info as any).appearance||''),model:'GPT Image2',aspect:'3:2',resolution:'2K',quality:'high'},charRole:(info as any).role||'配角',charSide:(info as any).side||''},
                        createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
                      ci++;
                    }
                    useCanvasStore.setState({nodes:next2});canvasStore.triggerSync();
                  }
                }catch{}finally{genRunningRef.current=false;setGenRunning(false);}
              }} style={{
                fontSize:'10px',fontWeight:600,cursor:'pointer',
                background:'rgba(100,200,180,0.08)',border:'1px solid rgba(100,200,180,0.2)',
                color:'#88ccbb',borderRadius:'var(--tap-r-full)',padding:'3px 10px',whiteSpace:'nowrap',
              }}>👥 角色分析</button>}
              {showMention && mentionList.length > 0 && createPortal(
                <div onMouseDown={e => e.preventDefault()} style={{
                  position: 'fixed',
                  bottom: panelRef.current ? window.innerHeight - panelRef.current.getBoundingClientRect().top + 4 : 200,
                  left: panelRef.current ? panelRef.current.getBoundingClientRect().left : '25vw',
                  width: 360, background: 'var(--tap-panel)',
                  border: '1px solid var(--tap-border)', borderRadius: 'var(--tap-r-lg)',
                  padding: '8px', zIndex: 99999, maxHeight: '180px', overflowY: 'auto',
                  boxShadow: 'var(--tap-shadow-lg)',
                }}>
                  <div style={{ fontSize: 10, color: 'var(--tap-text-4)', padding: '2px 6px' }}>选择参考图</div>
                  {mentionList.map((m, i) => (
                    <div key={i} onClick={() => {
                      setPrompt(insertMention(m, prompt));
                      if (!mentionedUrlsRef.current.includes(m.url)) {
                        mentionedUrlsRef.current.push(m.url);
                        patch('referenceUrls', [...mentionedUrlsRef.current]);
                      }
                      setShowMention(false);
                    }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--tap-hover)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 6, borderRadius: 'var(--tap-r-sm)', cursor: 'pointer', background: 'transparent' }}>
                      <img src={m.url} style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover' }} />
                      <div><div style={{ fontSize: 'var(--tap-fs-body)', color: 'var(--tap-text-1)', fontWeight: 500 }}>{m.name}</div></div>
                    </div>
                  ))}
                </div>,
                document.body
              )}
              <button
                onClick={handleGenerate}
                disabled={genRunning}
                style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: genRunning ? 'var(--tap-warning)' : prompt.trim() ? 'var(--tap-accent)' : 'rgba(255,255,255,0.08)',
                  color: (genRunning || prompt.trim()) ? '#fff' : 'var(--tap-text-4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '13px',
                  cursor: genRunning ? 'wait' : 'pointer', border: 'none',
                  flexShrink: 0,
                  transition: `all var(--tap-dur-fast) var(--tap-ease)`,
                  animation: genRunning ? 'tap-pulse-glow 1.5s var(--tap-ease) infinite' : 'none',
                }}
                onMouseEnter={e => { if (!genRunning) e.currentTarget.style.transform = 'scale(1.12)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {genRunning ? '⏳' : '↑'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
