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
    if (genRunningRef.current || !prompt.trim()) return;
    if (prompt.length > 200) { handleScriptAnalysis(); return; }
    genRunningRef.current = true; setGenRunning(true);
    patch('prompt', prompt);
    Promise.resolve(data.onGenerate?.()).finally(() => { genRunningRef.current = false; setGenRunning(false); });
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
          {phase === 'overview' && scriptOverview && (
            <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
              {/* 角色清单 */}
              {scriptOverview.characterProfiles && Object.keys(scriptOverview.characterProfiles).length > 0 && (<>
                <div style={{ fontSize:10,color:'var(--tap-text-4)' }}>👥 {Object.keys(scriptOverview.characterProfiles).length} 个角色</div>
                <div style={{ display:'flex',flexWrap:'wrap',gap:4 }}>
                  {Object.entries(scriptOverview.characterProfiles).map(([name,info]:[string,any]) => (
                    <span key={name} style={{ fontSize:9,padding:'1px 6px',borderRadius:10,
                      background:info.role==='主角'?'rgba(100,180,255,0.12)':info.role==='反派'?'rgba(255,100,100,0.12)':'rgba(255,255,255,0.06)',
                      color:info.role==='主角'?'#88bbff':info.role==='反派'?'#ff8888':'var(--tap-text-3)' }}>{name}</span>
                  ))}
                </div>
                <div onClick={async()=>{
                  const p=scriptOverview.characterProfiles;const st2=useCanvasStore.getState();const next2=new Map(st2.nodes);
                  const baseX2=(st2.nodes.get(id)?.pos?.x||0)+360;let ci2=0;const COLS=4;
                  for(const [name,info] of Object.entries(p) as [string,any][]){
                    const gm=name.match(/^(.+)\((\d+)人\)$/);const c2=gm?parseInt(gm[2]):1;const bn=gm?gm[1]:name;
                    for(let g=0;g<c2;g++){const gn=c2>1?`${bn}#${g+1}`:bn;
                      next2.set('c_'+Date.now()+'_'+ci2,{id:'c_'+Date.now()+'_'+ci2,type:'image.generate',title:'🎭 '+gn,pos:{x:baseX2+(ci2%COLS)*220,y:(st2.nodes.get(id)?.pos?.y||0)+Math.floor(ci2/COLS)*220},size:{w:200,h:200},ports:[],status:'idle',meta:{gen:{prompt:`角色设定图：${gn}。${(info as any).appearance||''}。白色背景。三视图（正面侧面背面）。武器道具和表情设定。完整角色参考图。`,model:'GPT Image2',aspect:'3:2',resolution:'2K',quality:'high'}},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});ci2++;}
                  }
                  useCanvasStore.setState({nodes:next2});canvasStore.triggerSync();
                }} style={{fontSize:10,fontWeight:600,cursor:'pointer',textAlign:'center',padding:'6px',borderRadius:8,background:'rgba(100,180,255,0.08)',border:'1px solid rgba(100,180,255,0.2)',color:'#88bbff',marginTop:2}}>
                  🎭 生成角色设定图，共{Object.keys(scriptOverview.characterProfiles).length}个角色
                </div>
              </>)}
              {/* 段落分镜按钮 */}
              {scriptOverview.scenes && scriptOverview.scenes.length>0 && <>
                <div style={{ fontSize:10,color:'var(--tap-accent)',fontWeight:600 }}>📝 分镜段落 — {scriptOverview.scenes.length} 段</div>
                {scriptOverview.scenes.map((s:any,i:number) => (
                <button key={i} onClick={()=>handleSceneShot(i)} style={{
                  padding:'6px 12px',borderRadius:6,cursor:'pointer',fontSize:10,fontWeight:500,textAlign:'left',width:'100%',
                  background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'var(--tap-text-2)',
                }} onMouseEnter={e=>{e.currentTarget.style.background='rgba(100,180,255,0.1)';e.currentTarget.style.borderColor='rgba(100,180,255,0.3)'}}
                   onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'}}>
                  📝 第{i+1}段：{s.sceneHeader}  <span style={{color:'var(--tap-text-4)',fontSize:9}}>~{s.estimatedShots}镜</span>
                </button>
              ))}</>}
            </div>
          )}

          {/* Loading / Status */}
          {genRunning && phase !== 'overview' && (
            <div style={{ minHeight:40,display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
              <div style={{ width:16,height:16,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.1)',borderTopColor:'var(--tap-accent)',animation:'tap-spin 0.8s linear infinite' }} />
              <span style={{ fontSize:10,color:'var(--tap-text-4)' }}>Agent 分析中…</span>
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
            <div style={{ padding: '4px 12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
              placeholder="粘贴完整剧本文本…&#10;&#10;例：&#10;酒吧内景 - 夜&#10;A一脚踹开大门，大步走进酒吧。所有人转头看向他。&#10;沉默。&#10;A走向吧台，坐下。"
              rows={18}
              style={{
                width: '100%', background: 'transparent', border: 'none',
                padding: '12px 14px', fontSize: 'var(--tap-fs-body)',
                color: 'var(--tap-text-1)', resize: 'vertical', outline: 'none',
                lineHeight: 1.5, overflowY: 'scroll', minHeight: '360px',
              }}
            />
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px', borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ fontSize: 'var(--tap-fs-xs)', color: 'var(--tap-text-4)', flex: 1 }}>
                {phase==='overview'?'📋 点击场景卡片生成分镜':phase==='shots'?'✅ 分镜完成':'粘贴剧本，回车分析'}
              </span>
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
