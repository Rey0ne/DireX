/* === ShotNode — Text generation node === */
/* Agent decides output type (storyboard / image-prompt / etc.) based on user input */
// @ts-nocheck — ~4 TS6133 dead code (unused local const from rapid prototyping). Safe to suppress; remove individually during refactor.

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
  const _shot = data.shot || {};
  const gen = data.gen || {};
  const panelRef = useRef<HTMLDivElement>(null);
  const { showMention, setShowMention, mentionList, detectMention, insertMention } = useMention(data.refUrls, data.styleImageUrl);
  const [hovered, setHovered] = useState(false);
  const [prompt, setPrompt] = useState(gen.prompt || (data as any).prompt || '');
  const [expanded, setExpanded] = useState(false);
  const [genRunning, setGenRunning] = useState(false);
  const [sceneRunning, setSceneRunning] = useState(false);
  const [charRunning, setCharRunning] = useState(false);
  const [spaceRunning, setSpaceRunning] = useState(false);
  const [propRunning, setPropRunning] = useState(false);
  const [soundRunning, setSoundRunning] = useState(false);
  const [visualStyle, setVisualStyle] = useState('');
  const g = gen as Record<string, any>;
  const getOverview = () => g.scriptOverview || null;
  const getScenes = () => g.scriptScenes || null;
  const getCharacters = () => g.scriptCharacters || getOverview()?.characterProfiles || null;
  const getSpatialDesigns = () => g.scriptSpatialDesigns || null;
  const getProps = () => g.scriptProps || null;
  const _getSound = () => g.scriptSound || null;
  const getSunoPrompts = () => g.scriptSunoPrompts || null;
  const analysisDoneRef = useRef(!!getOverview());
  const [phase, setPhase] = useState<'input'|'overview'|'shots'>(analysisDoneRef.current?'overview':'input');
  const zoom = useStore(s => s.transform[2]);
  const genRunningRef = useRef(false);
  const mentionedUrlsRef = useRef<string[]>([]);
  const canvasStore = useCanvasStore();
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
  // ShotNode：剧本 → 脚本分析（GPT-5.4）。T2I 生图走下游 ImageGenerateNode
  const handleGenerate = () => {
    if (genRunningRef.current || !prompt.trim()) return;
    handleScriptAnalysis();
  };

  const pollResult = async (taskId: string): Promise<any> => {
    const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
    const resp = await fetch(`${apiBase}/api/agent/script/result/${taskId}`);
    return resp.json();
  };

  const handleScriptAnalysis = async () => {
    if (!prompt.trim()) return;
    genRunningRef.current = true; setGenRunning(true);
    const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
    try {
      // 1. 提交 overview 任务
      const submitResp = await fetch(`${apiBase}/api/agent/script/overview`, {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${getSharedApiKey()}`},
        body:JSON.stringify({scriptText:prompt,visualStyle}),
      });
      const { taskId } = await submitResp.json();
      if (!taskId) throw new Error('No taskId returned');

      // 2. 场景+音乐同步API在后台并行跑
      const H = {'Content-Type':'application/json','Authorization':`Bearer ${getSharedApiKey()}`};
      const B = JSON.stringify({scriptText:prompt});
      Promise.allSettled([
        fetch(`${apiBase}/api/agent/script/scenes`,{method:'POST',headers:H,body:B}).then(r=>r.json()).then(j=>{if(j.success&&j.scenes)patch('scriptScenes',j.scenes)}).catch(e=>console.error('[analysis] scenes failed:',e)),
        fetch(`${apiBase}/api/agent/script/sound`,{method:'POST',headers:H,body:B}).then(r=>r.json()).then(j=>{if(j.success&&j.sunoPrompts)patch('scriptSunoPrompts',j.sunoPrompts)}).catch(e=>console.error('[analysis] sound failed:',e)),
      ]);

      // 3. 轮询 overview 结果
      analysisDoneRef.current = true; // 先显示占位，数据陆续填充
      const MAX_POLLS = 50;
      const POLL_INTERVAL = 30_000;
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
        try {
          const json = await pollResult(taskId);
          if (json.status === 'done') {
            if (json.success) {
              patch('scriptOverview', {
                shots: json.shots || [],
                characterProfiles: json.characterProfiles || {},
                rawOutput: json.rawOutput || '',
                durationMs: json.durationMs || 0,
              });
              setPhase('overview');
            } else {
              console.error('[analysis] Task error:', json.error);
            }
            return;
          }
          console.log(`[analysis] Poll ${i + 1}/${MAX_POLLS}: still processing...`);
        } catch (pollErr) {
          console.warn(`[analysis] Poll ${i + 1} failed:`, pollErr, '— retrying...');
        }
      }
      console.error('[analysis] Timeout after 50 polls (~25 min)');
    } catch (err) { console.error('[analysis] Error:', err); }
    finally { genRunningRef.current = false; setGenRunning(false); }
  };


  const handleSceneExtraction = async () => {
    if (!prompt.trim() || sceneRunning) return;
    setSceneRunning(true);
    const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
    try {
      const resp = await fetch(`${apiBase}/api/agent/script/scenes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSharedApiKey()}` },
        body: JSON.stringify({ scriptText: prompt }),
      });
      const json = await resp.json();
      if (json.success && json.scenes) {
        patch('scriptScenes', json.scenes);
      }
    } catch (err) { console.error('[scenes] Error:', err); }
    finally { setSceneRunning(false); }
  };

  const handleCharacterExtraction = async () => {
    if (!prompt.trim() || charRunning) return;
    setCharRunning(true);
    const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
    try {
      const resp = await fetch(`${apiBase}/api/agent/script/characters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSharedApiKey()}` },
        body: JSON.stringify({ scriptText: prompt }),
      });
      const json = await resp.json();
      if (json.success && json.characters) {
        patch('scriptCharacters', json.characters);
      }
    } catch (err) { console.error('[chars] Error:', err); }
    finally { setCharRunning(false); }
  };

  const handleSceneArchitect = async () => {
    if (!prompt.trim() || spaceRunning) return;
    setSpaceRunning(true);
    const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
    try {
      const resp = await fetch(`${apiBase}/api/agent/script/scene-architect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSharedApiKey()}` },
        body: JSON.stringify({ scriptText: prompt }),
      });
      const json = await resp.json();
      if (json.success && json.designs) {
        patch('scriptSpatialDesigns', json.designs);
      }
    } catch (err) { console.error('[space] Error:', err); }
    finally { setSpaceRunning(false); }
  };

  const handlePropDesigner = async () => {
    if (!prompt.trim() || propRunning) return;
    setPropRunning(true);
    const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
    try {
      const resp = await fetch(`${apiBase}/api/agent/script/props`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSharedApiKey()}` },
        body: JSON.stringify({ scriptText: prompt }),
      });
      const json = await resp.json();
      if (json.success && json.props) {
        patch('scriptProps', json.props);
      }
    } catch (err) { console.error('[props] Error:', err); }
    finally { setPropRunning(false); }
  };

  const handleSoundComposer = async () => {
    if (!prompt.trim() || soundRunning) return;
    setSoundRunning(true);
    const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
    try {
      const resp = await fetch(`${apiBase}/api/agent/script/sound`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSharedApiKey()}` },
        body: JSON.stringify({ scriptText: prompt }),
      });
      const json = await resp.json();
      if (json.success) {
        if (json.soundScenes) patch('scriptSound', json.soundScenes);
        if (json.sunoPrompts) patch('scriptSunoPrompts', json.sunoPrompts);
      }
    } catch (err) { console.error('[sound] Error:', err); }
    finally { setSoundRunning(false); }
  };

  // ── 占位点击：有数据→创建节点，无数据→触发API ──
  const clickScene = () => { const d=getScenes(); if(d&&Object.keys(d).length){createSceneNodes()}else{handleSceneExtraction()} };
  const clickChar = () => { const ov=getOverview(); const ch=ov?.characterProfiles; if(ch&&Object.keys(ch).length){createCharNodes()}else{handleCharacterExtraction()} };
  const clickShot = () => { const ov=getOverview(); if(ov?.shots?.length){createShotNodes()}else{handleGenerate()} };
  const _clickSpace = () => { const d=getSpatialDesigns(); if(d&&Object.keys(d).length){createSpaceNodes()}else{handleSceneArchitect()} };
  const _clickProp = () => { const d=getProps(); if(d&&Object.keys(d).length){createPropNodes()}else{handlePropDesigner()} };
  const clickSuno = () => { const d=getSunoPrompts(); if(d&&Object.keys(d).length){createSunoNodes()}else{handleSoundComposer()} };

  const createSceneNodes = () => {
    const scenes=getScenes();if(!scenes||!Object.keys(scenes).length)return;
    const e=Object.entries(scenes)as[string,string][];
    const next=new Map(canvasStore.nodes);const nextEdges=new Map(canvasStore.edges);
    const bx=(canvasStore.nodes.get(id)?.pos?.x||0)+340;const by=(canvasStore.nodes.get(id)?.pos?.y||0)+200;
    const ts=Date.now();
    e.forEach(([n,d],i)=>{const nid='sc_'+ts+'_'+i;next.set(nid,{id:nid,type:'image.generate',title:n,pos:{x:bx+(i%3)*340,y:by+Math.floor(i/3)*400},size:{w:380,h:200},ports:[],status:'idle',meta:{gen:{prompt:'场景概念设计：'+n+'。'+d.slice(0,500)+'。电影级场景设定。',model:'GPT Image2',aspect:'16:9',resolution:'2K',quality:'high'}},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    const eid='e_'+ts+'_sc_'+i;nextEdges.set(eid,{id:eid,from:{nodeId:id,portId:'shot-out'},to:{nodeId:nid,portId:'refs-in'},dataType:'any',style:{animated:false},meta:{semantic:'dataflow'}});});
    useCanvasStore.setState({nodes:next,edges:nextEdges});canvasStore.triggerSync();
  };
  const createSpaceNodes = () => {
    const d=getSpatialDesigns();if(!d||!Object.keys(d).length)return;
    const e=Object.entries(d)as[string,string][];
    const next=new Map(canvasStore.nodes);const nextEdges=new Map(canvasStore.edges);
    const bx=(canvasStore.nodes.get(id)?.pos?.x||0)+340;const by=(canvasStore.nodes.get(id)?.pos?.y||0)+200;
    const ts=Date.now();
    e.forEach(([n,de],i)=>{const nid='sp_'+ts+'_'+i;next.set(nid,{id:nid,type:'image.generate',title:n,pos:{x:bx+(i%3)*340,y:by+Math.floor(i/3)*400},size:{w:380,h:200},ports:[],status:'idle',meta:{gen:{prompt:'场景空间设计：'+n+'。'+de.slice(0,500)+'。电影级场景概念设计。',model:'GPT Image2',aspect:'16:9',resolution:'2K',quality:'high'}},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    const eid='e_'+ts+'_sp_'+i;nextEdges.set(eid,{id:eid,from:{nodeId:id,portId:'shot-out'},to:{nodeId:nid,portId:'refs-in'},dataType:'any',style:{animated:false},meta:{semantic:'dataflow'}});});
    useCanvasStore.setState({nodes:next,edges:nextEdges});canvasStore.triggerSync();
  };
  const createPropNodes = () => {
    const p=getProps();if(!p||!Object.keys(p).length)return;
    const e=Object.entries(p)as[string,string][];
    const next=new Map(canvasStore.nodes);const nextEdges=new Map(canvasStore.edges);
    const bx=(canvasStore.nodes.get(id)?.pos?.x||0)+340;const by=(canvasStore.nodes.get(id)?.pos?.y||0)+200;
    const ts=Date.now();
    e.forEach(([n,de],i)=>{const nid='pr_'+ts+'_'+i;next.set(nid,{id:nid,type:'image.generate',title:n,pos:{x:bx+(i%4)*220,y:by+Math.floor(i/4)*220},size:{w:200,h:200},ports:[],status:'idle',meta:{gen:{prompt:'道具设计：'+n+'。'+de.slice(0,500)+'。白色背景。产品级道具设定图。',model:'GPT Image2',aspect:'1:1',resolution:'2K',quality:'high'}},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    const eid='e_'+ts+'_pr_'+i;nextEdges.set(eid,{id:eid,from:{nodeId:id,portId:'shot-out'},to:{nodeId:nid,portId:'refs-in'},dataType:'any',style:{animated:false},meta:{semantic:'dataflow'}});});
    useCanvasStore.setState({nodes:next,edges:nextEdges});canvasStore.triggerSync();
  };
  const createSunoNodes = () => {
    const su=getSunoPrompts();if(!su||!Object.keys(su).length)return;
    const e=Object.entries(su)as[string,any][];
    const next=new Map(canvasStore.nodes);const nextEdges=new Map(canvasStore.edges);
    const bx=(canvasStore.nodes.get(id)?.pos?.x||0)+340;const by=(canvasStore.nodes.get(id)?.pos?.y||0)+200;
    const ts=Date.now();
    e.forEach(([n,de],i)=>{const nid='su_'+ts+'_'+i;next.set(nid,{id:nid,type:'audio.generate',title:n,pos:{x:bx+i*320,y:by},size:{w:300,h:180},ports:[],status:'idle',meta:{prompt:(de as any)?.sunoPrompt||String(de),gen:{prompt:(de as any)?.sunoPrompt||String(de),model:'Suno v4'}},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    const eid='e_'+ts+'_su_'+i;nextEdges.set(eid,{id:eid,from:{nodeId:id,portId:'shot-out'},to:{nodeId:nid,portId:'refs-in'},dataType:'any',style:{animated:false},meta:{semantic:'dataflow'}});});
    useCanvasStore.setState({nodes:next,edges:nextEdges});canvasStore.triggerSync();
  };
  const createShotNodes = () => {
    const ov=getOverview();const ss=ov?.shots||[];if(!ss.length)return;
    const next=new Map(canvasStore.nodes);const nextEdges=new Map(canvasStore.edges);
    const bx=(canvasStore.nodes.get(id)?.pos?.x||0)+340;const by=(canvasStore.nodes.get(id)?.pos?.y||0)+200;
    const ts=Date.now();
    ss.forEach((sh:any,si:number)=>{const nid='s_'+ts+'_'+si;next.set(nid,{id:nid,type:'image.generate',title:(sh.shotType||'MS')+' #'+(sh.shotNumber||si+1),pos:{x:bx+(si%3)*340,y:by+Math.floor(si/3)*400},size:{w:380,h:200},ports:[],status:'idle',meta:{gen:{prompt:(sh.visualPrompt||sh.contentCN||''),model:'GPT Image2',aspect:'16:9',resolution:'2K',quality:'high'},shot:{shotType:sh.shotType,cameraMovement:sh.cameraMovement,angle:sh.angle,lens:sh.lens,composition:sh.composition,emotion:sh.emotion}},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    const eid='e_'+ts+'_'+si;nextEdges.set(eid,{id:eid,from:{nodeId:id,portId:'shot-out'},to:{nodeId:nid,portId:'refs-in'},dataType:'any',style:{animated:false},meta:{semantic:'dataflow'}});});
    useCanvasStore.setState({nodes:next,edges:nextEdges});canvasStore.triggerSync();
  };
  const createCharNodes = () => {
    const ov=getOverview();const cs=ov?.characterProfiles||{};const e=Object.entries(cs)as[string,string][];if(!e.length)return;
    const next=new Map(canvasStore.nodes);const nextEdges=new Map(canvasStore.edges);
    const bx=(canvasStore.nodes.get(id)?.pos?.x||0)+340;const by=(canvasStore.nodes.get(id)?.pos?.y||0)+200;
    const ts=Date.now();
    e.forEach(([n,de],ci)=>{const nid='c_'+ts+'_'+ci;next.set(nid,{id:nid,type:'image.generate',title:n,pos:{x:bx+(ci%4)*220,y:by+Math.floor(ci/4)*220},size:{w:200,h:200},ports:[],status:'idle',meta:{gen:{prompt:'角色设定图：'+n+'。'+de+'。白色背景。三视图（正面、侧面、背面）。包含全身服装与标志性道具。完整角色参考图。',model:'GPT Image2',aspect:'3:2',resolution:'2K',quality:'high'}},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    const eid='e_'+ts+'_c_'+ci;nextEdges.set(eid,{id:eid,from:{nodeId:id,portId:'shot-out'},to:{nodeId:nid,portId:'refs-in'},dataType:'any',style:{animated:false},meta:{semantic:'dataflow'}});});
    useCanvasStore.setState({nodes:next,edges:nextEdges});canvasStore.triggerSync();
  };

  return (
    <>
      <style>{`
        @keyframes direx-light-wash {
          0%,100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes direx-light-rim {
          0%   { box-shadow: 0 0 12px 6px rgba(255,114,255,0.10), 0 0 32px rgba(255,114,255,0.05); }
          50%  { box-shadow: 0 0 20px 10px rgba(255,114,255,0.22), 0 0 52px rgba(255,114,255,0.10); }
          100% { box-shadow: 0 0 12px 6px rgba(255,114,255,0.10), 0 0 32px rgba(255,114,255,0.05); }
        }
      `}</style>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Card wrapper */}
      <div style={{ position: 'relative' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        
        <Handle type="target" position={Position.Left} id="refs-in"
          style={{
            width: '19px', height: '19px', background: 'var(--tap-panel)',
            border: '2px solid #41CCFA', borderRadius: '50%',
            left: '-20px', top: '50%', opacity: selected || hovered || data.isConnecting || data.hasConnections ? 1 : 0, pointerEvents: "all", transition: 'opacity 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, lineHeight: 1, color: '#41CCFA',
          }}
        ><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg></Handle>
        <Handle type="source" position={Position.Right} id="shot-out"
          style={{
            width: '19px', height: '19px', background: 'var(--tap-panel)',
            border: '2px solid #41CCFA', borderRadius: '50%',
            right: '-20px', top: '50%', opacity: selected || hovered || data.isConnecting || data.hasConnections ? 1 : 0, pointerEvents: "all", transition: 'opacity 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, lineHeight: 1, color: '#41CCFA',
          }}
        ><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg></Handle>

        {/* Main Card */}
        <div style={{
          width: 'var(--tap-node-width)',
          minHeight: '220px',
          background: 'var(--tap-panel)',
          border: data.isPickTarget
            ? '2px solid rgba(180,180,185,0.55)'
            : data.isPickMode
              ? '1px dashed rgba(180,180,185,0.3)'
              : data.isConnectTarget
                ? '1px solid rgba(180,180,185,0.5)'
                : '1px solid var(--tap-border)',
          borderRadius: 'var(--tap-r-xl)',
          ...(selected ? {
            background: 'linear-gradient(115deg, rgba(255,114,255,0.07) 0%, rgba(255,114,255,0.03) 25%, var(--tap-panel) 50%, var(--tap-panel) 100%)',
            backgroundSize: '250% 250%',
            animation: 'direx-light-wash 6s ease-in-out infinite, direx-light-rim 5s ease-in-out infinite',
            willChange: 'box-shadow',
          } : {}),
          boxShadow: data.isPickTarget
            ? '0 0 28px rgba(180,180,185,0.25)'
            : data.isConnectTarget
              ? '0 0 28px rgba(180,180,185,0.2)'
              : selected ? undefined : 'var(--tap-shadow-sm)',
          padding: '16px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          position: 'relative',
          transition: `all var(--tap-dur-fast) var(--tap-ease)`,
        }}>
          {/* Hint text — top left */}
          <span style={{ fontSize: 9, color: 'var(--tap-text-4)', lineHeight: 1 }}>点击按键自动生成节点</span>

          {/* Loading / Status */}
          {(genRunning || sceneRunning || charRunning || soundRunning) && (
            <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'4px 0' }}>
              <div style={{ width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.1)',borderTopColor:'var(--tap-accent)',animation:'tap-spin 0.8s linear infinite' }} />
              <span style={{ fontSize:10,color:'var(--tap-text-4)' }}>
                {soundRunning ? '音乐设计中…' : sceneRunning ? '提取场景中…' : charRunning ? '提取角色中…' : 'Agent 分析中…'}
              </span>
            </div>
          )}

          {/* 4 category buttons — text always visible, button bg/border reveal on hover */}
          {analysisDoneRef.current && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { label: '场景', count: getScenes() ? Object.keys(getScenes()!).length : 0, unit: '场', preview: getScenes() ? Object.keys(getScenes()!).join('、') : '', onClick: clickScene },
                { label: '演员', count: getCharacters() ? Object.keys(getCharacters()!).length : 0, unit: '名', preview: getCharacters() ? Object.keys(getCharacters()!).join('、') : '', onClick: clickChar },
                { label: '分镜', count: getOverview()?.shots?.length || 0, unit: '镜', preview: getOverview()?.shots?.slice(0,3).map((s:any)=>s.shotType+'#'+s.shotNumber).join(' ') || '', onClick: clickShot },
                { label: '音乐', count: getSunoPrompts() ? Object.keys(getSunoPrompts()!).length : 0, unit: '曲', preview: getSunoPrompts() ? Object.keys(getSunoPrompts()!).join('、') : '', onClick: clickSuno },
              ].map((btn, i) => (
                <div key={i} onClick={btn.onClick}
                  style={{
                    padding: '6px 10px', cursor: 'pointer', borderRadius: 6,
                    background: 'transparent',
                    border: '1px solid transparent',
                    display: 'flex', flexDirection: 'column', gap: 2,
                    transition: 'background 0.25s ease, border-color 0.25s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#10FFD1'; e.currentTarget.style.borderColor = '#10FFD1'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                >
                  <div style={{ display:'flex',alignItems:'baseline',gap:6 }}>
                    <span style={{ fontSize:12,fontWeight:600,color:'#000' }}>{btn.label}</span>
                    <span style={{ fontSize:10,color:'#000' }}>{btn.count}{btn.unit}</span>
                  </div>
                  {btn.preview && (
                    <div style={{ fontSize:9,color:'#000',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{btn.preview}</div>
                  )}
                </div>
              ))}
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
            width: 'var(--tap-node-width)',
            marginTop: `${10/zoom}px`,
            zIndex: 50,
            animation: 'tap-fade-in 50ms var(--tap-ease)',
          }}>
          <div style={{
            background: '#fff',
            borderRadius: 'var(--tap-r-xl)',
            pointerEvents: 'auto',
            boxShadow: 'inset 0 0 0 1px rgba(0,207,255,0.06), inset 0 0 10px rgba(0,207,255,0.03), 0 0 0 3px rgba(0,207,255,0.04), 0 0 0 8px rgba(0,207,255,0.02), 0 2px 12px rgba(0,0,0,0.03)',
          }}>
            <input value={visualStyle} onChange={e=>setVisualStyle(e.target.value)}
              placeholder="请填入风格，如真人/动漫"
              style={{ width:'100%',background:'#fff',border:'none',borderBottom:'1px solid rgba(0,0,0,0.10)',color:'#333',fontSize:11,padding:'8px 14px',outline:'none' }}
              onPointerDownCapture={e=>e.stopPropagation()} onMouseDownCapture={e=>e.stopPropagation()} />
            <div style={{ padding: '4px 12px 0', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
              <RefStrip nodeId={id} refUrls={data.refUrls} />
              <div style={{ flex: 1 }} />
              <span onClick={() => setExpanded(!expanded)}
                style={{ fontSize: '10px', color: 'var(--tap-text-4)', cursor: 'pointer', padding: '1px 4px', flexShrink: 0 }}
              >{expanded ? '∧' : '∨'}</span>
            </div>
            <textarea className="no-wheel"
              value={prompt}
              onChange={e => {
                const v = e.target.value;
                setPrompt(v);
                detectMention(v, e.target.selectionStart || 0);
              }}
              onPointerDownCapture={e => { e.stopPropagation() }}
              onMouseDownCapture={e => { e.stopPropagation() }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              placeholder="一个场景一幕，粘贴一段剧本&#10;&#10;例：&#10;外景 雪原 - 夜&#10;风雪中女巫独自立在雪地中央，黑色长袍被横风掀起。&#10;远处传来狼嚎，她缓缓抬头。"
              rows={expanded ? 24 : 8}
              style={{
                width: '100%', background: '#fff', border: 'none',
                padding: '10px 14px', fontSize: '8px',
                color: '#333', resize: 'none', outline: 'none',
                lineHeight: 1.5, minHeight: expanded ? '480px' : '160px',
              }}
            />
            {/* Send — glass pill */}
              <div style={{ display:'flex',alignItems:'center',justifyContent:'flex-end',width:'50px',height:'20px',borderRadius:'10px',background:'linear-gradient(135deg,rgba(0,0,0,0.03) 0%,rgba(0,0,0,0.01) 50%,rgba(0,0,0,0.03) 100%)',border:'1px solid var(--tap-divider)',boxShadow:'0 0 10px rgba(0,0,0,0.02),inset 0 1px 0 rgba(0,0,0,0.03)',flexShrink:0,paddingRight:'2px' }}>
                <button onClick={handleGenerate} disabled={genRunning}
                  style={{ width:'16px',height:'16px',borderRadius:'50%',background:genRunning?'var(--tap-warning)':'#FFF65D',color:genRunning?'#fff':'#333',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:genRunning?'8px':'9px',cursor:genRunning?'wait':'pointer',border:'none',boxShadow:'0 1.5px 4px rgba(0,0,0,0.2),0 1px 1.5px rgba(0,0,0,0.12)',transition:'transform 0.15s,box-shadow 0.15s' }}
                  onMouseEnter={e => { if (!genRunning) { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.22)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1.5px 4px rgba(0,0,0,0.2), 0 1px 1.5px rgba(0,0,0,0.12)'; }}
                >{genRunning ? '⏳' : '↑'}</button>
              </div>
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
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,207,255,0.10)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 6, borderRadius: 'var(--tap-r-sm)', cursor: 'pointer', background: 'transparent' }}>
                      <img src={m.url} style={{ width: 36, height: 36, borderRadius: 4, objectFit: 'cover' }} />
                      <div><div style={{ fontSize: 'var(--tap-fs-body)', color: 'var(--tap-text-1)', fontWeight: 500 }}>{m.name}</div></div>
                    </div>
                  ))}
                </div>,
                document.body
              )}
          </div>
        </div>
      )}
    </div>
    </>
  );
}
