/* === ShotNode — Text generation node === */
/* Agent decides output type (storyboard / image-prompt / etc.) based on user input */
// @ts-nocheck — ~4 TS6133 dead code (unused local const from rapid prototyping). Safe to suppress; remove individually during refactor.

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useStore } from '@xyflow/react';
import { RefStrip } from '../shared/RefStrip';
import { useMention } from '../shared/useMention';
import { useCanvasStore } from '../../store/useCanvasStore';
import { getSharedApiKey, qDecide, type QDecideResponse } from '../../api/gateway';


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
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [sceneRunning, setSceneRunning] = useState(false);
  const [charRunning, setCharRunning] = useState(false);
  const [spaceRunning, setSpaceRunning] = useState(false);
  const [propRunning, setPropRunning] = useState(false);
  const [soundRunning, setSoundRunning] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null); // 'characters'|'scenes'|'storyboard'|'music'
  const [regenerateFeedback, setRegenerateFeedback] = useState('');
  const feedbackRef = useRef(regenerateFeedback);  // always current — handleRegenerateSection reads from this
  const [regenerateRunning, setRegenerateRunning] = useState(false);
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
  feedbackRef.current = regenerateFeedback;
  useEffect(() => {
    const t = setTimeout(() => { if (promptRef.current) patch('prompt', promptRef.current); }, 200);
    return () => clearTimeout(t);
  }, [prompt]);
  // 组件卸载时立即保存
  useEffect(() => () => { if (promptRef.current) patch('prompt', promptRef.current); }, []);
  // ShotNode：剧本 → 脚本分析（GPT-5.4）。T2I 生图走下游 ImageGenerateNode
  const handleGenerate = () => {
    if (genRunningRef.current || !prompt.trim()) return;
    // Q brain runs as a sidecar for insight only — never blocks user action
    handleQSidecar();
    handleScriptAnalysis();
  };

  // ── Q Brain sidecar — fire-and-forget insight, doesn't gate execution ──
  const handleQSidecar = () => {
    if (!prompt.trim()) return;
    qDecide({
      action: '分析剧本并生成分镜',
      scriptText: prompt,
      nodeId: id,
      autoExecute: false, // Never auto-execute — Q is observer, not gatekeeper
      extraParams: { visualStyle },
    }).then(qResponse => {
      if (!qResponse) return;
      console.log('[ShotNode] Q insight:', qResponse.intent.category,
        'route:', qResponse.routing.route,
        'confidence:', qResponse.intent.confidence);
      if (qResponse.context.knownIssues.length > 0) {
        console.log('[ShotNode] Q remembered issues:', qResponse.context.knownIssues);
      }
    }).catch(() => {});
  };

  const pollResult = async (taskId: string): Promise<any> => {
    const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
    const resp = await fetch(`${apiBase}/api/agent/script/result/${taskId}`);
    return resp.json();
  };

  // ── Section-aware result patcher (per CLAUDE-contract.md Script Task rules) ──
  const applySectionResult = (json: any, setPhaseFn?: (p: 'input'|'overview'|'shots') => void) => {
    const section = json.section || 'overview';
    switch (section) {
      case 'overview':
        patch('scriptOverview', {
          shots: json.shots || [],
          characterProfiles: json.characterProfiles || {},
          rawOutput: json.rawOutput || '',
          durationMs: json.durationMs || 0,
        });
        if (json.scenes && Object.keys(json.scenes).length) patch('scriptScenes', json.scenes);
        if (json.sceneArchitecture && Object.keys(json.sceneArchitecture).length) patch('scriptSceneArchitecture', json.sceneArchitecture);
        if (json.sunoPrompts && Object.keys(json.sunoPrompts).length) patch('scriptSunoPrompts', json.sunoPrompts);
        if (json.soundScenes && Object.keys(json.soundScenes).length) patch('scriptSoundScenes', json.soundScenes);
        setPhaseFn?.('overview');
        break;
      case 'characters':
        if (json.characterProfiles && Object.keys(json.characterProfiles).length) {
          patch('scriptCharacters', json.characterProfiles);
        }
        break;
      case 'scenes':
        if (json.scenes && Object.keys(json.scenes).length) patch('scriptScenes', json.scenes);
        if (json.sceneArchitecture && Object.keys(json.sceneArchitecture).length) patch('scriptSceneArchitecture', json.sceneArchitecture);
        break;
      case 'storyboard': {
        const ov = getOverview() || {} as Record<string, any>;
        const merged: Record<string, any> = { ...ov };
        if (json.shots && json.shots.length > 0) merged.shots = json.shots;
        if (json.characterProfiles && Object.keys(json.characterProfiles).length) merged.characterProfiles = json.characterProfiles;
        if (json.rawOutput) merged.rawOutput = json.rawOutput;
        if (json.durationMs) merged.durationMs = json.durationMs;
        patch('scriptOverview', merged);
        break;
      }
      case 'music':
        if (json.sunoPrompts && Object.keys(json.sunoPrompts).length) patch('scriptSunoPrompts', json.sunoPrompts);
        if (json.soundScenes && Object.keys(json.soundScenes).length) patch('scriptSoundScenes', json.soundScenes);
        break;
    }
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
      const submitJson = await submitResp.json();
      console.log('[analysis] Submit response:', submitResp.status, submitJson);
      const { taskId } = submitJson;
      if (!taskId) throw new Error('No taskId returned — server responded: ' + JSON.stringify(submitJson).slice(0, 120));

      // ── Persist taskId so polling survives page refresh ──
      patch('scriptTaskId', taskId);

      // 2. 轮询 overview 结果（包含角色+场景+音乐+分镜全部）
      analysisDoneRef.current = true; // 先显示占位，数据陆续填充
      setAnalysisError(null); // Clear any previous error
      const MAX_POLLS = 50;
      const POLL_INTERVAL = 30_000;
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
        try {
          const json = await pollResult(taskId);
          // Handle terminal statuses — 'done' (current backend) or 'completed' (contract)
          if (json.status === 'done' || json.status === 'completed') {
            if (json.success) {
              applySectionResult(json, setPhase);
            } else {
              console.error('[analysis] Task error:', json.error);
              setAnalysisError(json.error || '分析失败，请重试');
            }
            patch('scriptTaskId', null);
            return;
          }
          if (json.status === 'failed') {
            console.error('[analysis] Task failed:', json.error);
            setAnalysisError(json.error || '分析失败，请重试');
            patch('scriptTaskId', null);
            return;
          }
          if (json.status === 'lost') {
            console.warn('[analysis] Task lost — server may have restarted');
            setAnalysisError('任务丢失（服务器可能重启了），请重试');
            patch('scriptTaskId', null);
            return;
          }
          console.log(`[analysis] Poll ${i + 1}/${MAX_POLLS}: still processing...`);
        } catch (pollErr) {
          console.warn(`[analysis] Poll ${i + 1} failed:`, pollErr, '— retrying...');
        }
      }
      console.error('[analysis] Timeout after 50 polls (~25 min)');
      setAnalysisError('分析超时（超过25分钟），请重试');
      patch('scriptTaskId', null);
    } catch (err) { console.error('[analysis] Error:', err); setAnalysisError('提交失败：' + String(err).slice(0, 80)); }
    finally { genRunningRef.current = false; setGenRunning(false); }
  };

  // ── Resume polling on mount if a previous analysis was interrupted (e.g., page refresh) ──
  useEffect(() => {
    const taskId = g.scriptTaskId as string | undefined;
    if (!taskId) return; // No pending task
    const overview = g.scriptOverview as Record<string, any> | undefined;
    if (overview?.shots && Array.isArray(overview.shots) && overview.shots.length > 0) {
      // Already have results — clear stale taskId
      patch('scriptTaskId', null);
      return;
    }
    // Resume polling for in-flight task (page refresh recovery)
    console.log('[analysis] Resuming poll for taskId:', taskId);
    genRunningRef.current = true; setGenRunning(true); setAnalysisError(null);
    let cancelled = false;
    const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
    const resumePoll = async () => {
      const MAX_POLLS = 50;
      const POLL_INTERVAL = 30_000;
      for (let i = 0; i < MAX_POLLS; i++) {
        if (cancelled) return;
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
        if (cancelled) return;
        try {
          const resp = await fetch(`${apiBase}/api/agent/script/result/${taskId}`);
          const json = await resp.json();
          // Handle terminal statuses
          if (json.status === 'done' || json.status === 'completed') {
            if (json.success) {
              applySectionResult(json, setPhase);
            } else {
              setAnalysisError(json.error || '分析失败，请重试');
            }
            patch('scriptTaskId', null);
            genRunningRef.current = false; setGenRunning(false);
            return;
          }
          if (json.status === 'lost') {
            setAnalysisError('任务丢失（服务器可能重启了），请重试');
            patch('scriptTaskId', null);
            genRunningRef.current = false; setGenRunning(false);
            return;
          }
          if (json.status === 'failed') {
            setAnalysisError(json.error || '分析失败，请重试');
            patch('scriptTaskId', null);
            genRunningRef.current = false; setGenRunning(false);
            return;
          }
        } catch {}
      }
      // Timeout — clear stale taskId so user can re-trigger
      if (!cancelled) { patch('scriptTaskId', null); setAnalysisError('分析超时，请重试'); genRunningRef.current = false; setGenRunning(false); }
    };
    resumePoll();
    return () => { cancelled = true; };
  }, [g.scriptTaskId]);

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
    setSoundRunning(true); setAnalysisError(null);
    const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
    try {
      const submitResp = await fetch(`${apiBase}/api/agent/script/music`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSharedApiKey()}` },
        body: JSON.stringify({ scriptText: prompt }),
      });
      const submitJson = await submitResp.json();
      console.log('[music] Submit response:', submitResp.status, submitJson);
      // Compat: if backend returns async { taskId }, poll; if sync { success }, apply directly
      if (submitJson.success !== undefined) {
        if (submitJson.success) {
          applySectionResult(submitJson);
        } else {
          setAnalysisError(submitJson.error || '音乐生成失败');
        }
        return;
      }
      const { taskId } = submitJson;
      if (!taskId) throw new Error('No taskId returned — server responded: ' + JSON.stringify(submitJson).slice(0, 120));

      const MAX_POLLS = 20;
      const POLL_INTERVAL = 15_000;
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
        try {
          const json = await pollResult(taskId);
          if (json.status === 'done' || json.status === 'completed') {
            if (json.success) {
              applySectionResult(json);
            } else {
              console.error('[music] Task error:', json.error);
              setAnalysisError(json.error || '音乐生成失败');
            }
            return;
          }
          if (json.status === 'failed') {
            setAnalysisError(json.error || '音乐生成失败');
            return;
          }
          if (json.status === 'lost') {
            setAnalysisError('音乐任务丢失，请重试');
            return;
          }
        } catch (pollErr) {
          console.warn('[music] Poll failed:', pollErr, '— retrying...');
        }
      }
      console.error('[music] Timeout after 20 polls (~5 min)');
      setAnalysisError('音乐生成超时，请重试');
    } catch (err) { console.error('[music] Error:', err); setAnalysisError('提交失败：' + String(err).slice(0, 80)); }
    finally { setSoundRunning(false); }
  };

  // ── 占位点击：有数据→创建节点，无数据→触发API ──
  const clickScene = () => { const d=getScenes(); if(d&&Object.keys(d).length){createSceneNodes()}else{handleSceneExtraction()} };
  const clickChar = () => { const ov=getOverview(); const ch=ov?.characterProfiles; if(ch&&Object.keys(ch).length){createCharNodes()}else{handleCharacterExtraction()} };
  const clickShot = () => { const ov=getOverview(); if(ov?.shots?.length){createShotNodes()}else{handleGenerate()} };
  const _clickSpace = () => { const d=getSpatialDesigns(); if(d&&Object.keys(d).length){createSpaceNodes()}else{handleSceneArchitect()} };
  const _clickProp = () => { const d=getProps(); if(d&&Object.keys(d).length){createPropNodes()}else{handlePropDesigner()} };
  const clickSuno = () => { const d=getSunoPrompts(); if(d&&Object.keys(d).length){createSunoNodes()}else{handleSoundComposer()} };

  // ── Section Regeneration ──
  const handleRegenerateSection = async (section: string) => {
    if (regenerateRunning) return;
    const feedback = feedbackRef.current.trim();
    if (!feedback) {
      setRegeneratingSection(section);
      return; // Open feedback input first, wait for user to type
    }
    // If feedback already entered, submit immediately
    setRegenerateRunning(true);
    setRegeneratingSection(null);
    setRegenerateFeedback('');
    setAnalysisError(null);
    const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
    try {
      const existingResults: Record<string, any> = {};
      const ov = getOverview();
      if (ov?.characterProfiles) existingResults.characters = ov.characterProfiles;
      if (ov?.shots) existingResults.storyboard = ov.shots;
      const sc = getScenes();
      if (sc) existingResults.scenes = sc;
      const sp = getSunoPrompts();
      const sd = _getSound();
      if (sp || sd) existingResults.music = { sunoPrompts: sp, soundScenes: sd };

      const submitResp = await fetch(`${apiBase}/api/agent/script/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSharedApiKey()}` },
        body: JSON.stringify({
          scriptText: prompt,
          section,
          visualStyle,
          userFeedback: feedback,
          existingResults,
        }),
      });
      const submitJson = await submitResp.json();
      console.log('[regenerate] Submit response:', submitResp.status, submitJson);
      // Compat: if backend returns async { taskId }, poll; if sync { success }, apply directly
      if (submitJson.success !== undefined) {
        // Sync response — apply directly
        if (submitJson.success) {
          applySectionResult(submitJson);
        } else {
          setAnalysisError(submitJson.error || '重新生成失败');
        }
        return;
      }
      const { taskId } = submitJson;
      if (!taskId) throw new Error('No taskId returned — server responded: ' + JSON.stringify(submitJson).slice(0, 120));

      // Poll for result
      const MAX_POLLS = 20;
      const POLL_INTERVAL = 15_000;
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
        try {
          const json = await pollResult(taskId);
          if (json.status === 'done' || json.status === 'completed') {
            if (json.success) {
              applySectionResult(json);
            } else {
              console.error('[regenerate] Task error:', json.error);
              setAnalysisError(json.error || '重新生成失败');
            }
            return;
          }
          if (json.status === 'failed') {
            setAnalysisError(json.error || '重新生成失败');
            return;
          }
          if (json.status === 'lost') {
            setAnalysisError('重新生成任务丢失，请重试');
            return;
          }
        } catch (pollErr) {
          console.warn('[regenerate] Poll failed:', pollErr, '— retrying...');
        }
      }
      console.error('[regenerate] Timeout after 20 polls (~5 min)');
      setAnalysisError('重新生成超时，请重试');
    } catch (err) {
      console.error('[regenerate] Error:', err);
      setAnalysisError('提交失败：' + String(err).slice(0, 80));
    } finally {
      setRegenerateRunning(false);
    }
  };

  // ── Node placement utilities (anti-overlap) ──
  const SHOT_TO_CHILD_GAP_X = 40;
  const SHOT_TO_CHILD_GAP_Y = 60;
  const getGrid = (count: number, cols: number, startX: number, startY: number, itemW: number, itemH: number, gapX: number, gapY: number) =>
    Array.from({ length: count }, (_, i) => ({
      x: startX + (i % cols) * (itemW + gapX),
      y: startY + Math.floor(i / cols) * (itemH + gapY),
    }));
  const computeStartPos = (nodes: Map<string, any>, edges: Map<string, any>) => {
    const shot = nodes.get(id);
    const shotRight = (shot?.pos?.x || 0) + (shot?.size?.w || 380);
    const shotBottom = (shot?.pos?.y || 0) + (shot?.size?.h || 200);
    let maxBottom = shotBottom;
    // Only scan children of THIS ShotNode (connected via edges), not all canvas nodes
    edges.forEach((e: any) => {
      if (e.from?.nodeId === id) {
        const child = nodes.get(e.to?.nodeId);
        if (child) {
          const b = (child.pos?.y || 0) + (child.size?.h || 200);
          if (b > maxBottom) maxBottom = b;
        }
      }
    });
    return { startX: shotRight + SHOT_TO_CHILD_GAP_X, startY: maxBottom + SHOT_TO_CHILD_GAP_Y };
  };

  const createSceneNodes = () => {
    const scenes=getScenes();if(!scenes||!Object.keys(scenes).length)return;
    const e=Object.entries(scenes)as[string,string][];
    const next=new Map(canvasStore.nodes);const nextEdges=new Map(canvasStore.edges);
    const {startX:bx,startY:by}=computeStartPos(next,nextEdges);
    const ts=Date.now();const grid=getGrid(e.length,5,bx,by,380,200,40,80);
    e.forEach(([n,d],i)=>{const nid='sc_'+ts+'_'+i;next.set(nid,{id:nid,type:'image.generate',title:n,pos:{x:grid[i].x,y:grid[i].y},size:{w:380,h:200},ports:[],status:'idle',meta:{gen:{prompt:'场景：'+n+'。'+d,model:'GPT Image2',aspect:'16:9',resolution:'2K',quality:'high'}},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    const eid='e_'+ts+'_sc_'+i;nextEdges.set(eid,{id:eid,from:{nodeId:id,portId:'shot-out'},to:{nodeId:nid,portId:'refs-in'},dataType:'any',style:{animated:false},meta:{semantic:'dataflow'}});});
    useCanvasStore.setState({nodes:next,edges:nextEdges});canvasStore.triggerSync();
  };
  const createSpaceNodes = () => {
    const d=getSpatialDesigns();if(!d||!Object.keys(d).length)return;
    const e=Object.entries(d)as[string,string][];
    const next=new Map(canvasStore.nodes);const nextEdges=new Map(canvasStore.edges);
    const {startX:bx,startY:by}=computeStartPos(next,nextEdges);
    const ts=Date.now();const grid=getGrid(e.length,5,bx,by,380,200,40,80);
    e.forEach(([n,de],i)=>{const nid='sp_'+ts+'_'+i;next.set(nid,{id:nid,type:'image.generate',title:n,pos:{x:grid[i].x,y:grid[i].y},size:{w:380,h:200},ports:[],status:'idle',meta:{gen:{prompt:'场景：'+n+'。'+de,model:'GPT Image2',aspect:'16:9',resolution:'2K',quality:'high'}},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    const eid='e_'+ts+'_sp_'+i;nextEdges.set(eid,{id:eid,from:{nodeId:id,portId:'shot-out'},to:{nodeId:nid,portId:'refs-in'},dataType:'any',style:{animated:false},meta:{semantic:'dataflow'}});});
    useCanvasStore.setState({nodes:next,edges:nextEdges});canvasStore.triggerSync();
  };
  const createPropNodes = () => {
    const p=getProps();if(!p||!Object.keys(p).length)return;
    const e=Object.entries(p)as[string,string][];
    const next=new Map(canvasStore.nodes);const nextEdges=new Map(canvasStore.edges);
    const {startX:bx,startY:by}=computeStartPos(next,nextEdges);
    const ts=Date.now();const grid=getGrid(e.length,5,bx,by,380,200,40,80);
    e.forEach(([n,de],i)=>{const nid='pr_'+ts+'_'+i;next.set(nid,{id:nid,type:'image.generate',title:n,pos:{x:grid[i].x,y:grid[i].y},size:{w:380,h:200},ports:[],status:'idle',meta:{gen:{prompt:'纯白背景棚拍。道具设计：'+n+'。'+de.slice(0,500)+'。产品级道具设定图。',model:'GPT Image2',aspect:'1:1',resolution:'2K',quality:'high'}},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    const eid='e_'+ts+'_pr_'+i;nextEdges.set(eid,{id:eid,from:{nodeId:id,portId:'shot-out'},to:{nodeId:nid,portId:'refs-in'},dataType:'any',style:{animated:false},meta:{semantic:'dataflow'}});});
    useCanvasStore.setState({nodes:next,edges:nextEdges});canvasStore.triggerSync();
  };
  const createSunoNodes = () => {
    const su=getSunoPrompts();if(!su||!Object.keys(su).length)return;
    const e=Object.entries(su)as[string,any][];
    const next=new Map(canvasStore.nodes);const nextEdges=new Map(canvasStore.edges);
    const {startX:bx,startY:by}=computeStartPos(next,nextEdges);
    const ts=Date.now();const grid=getGrid(e.length,5,bx,by,380,180,40,80);
    e.forEach(([n,de],i)=>{const nid='su_'+ts+'_'+i;next.set(nid,{id:nid,type:'audio.generate',title:n,pos:{x:grid[i].x,y:grid[i].y},size:{w:380,h:180},ports:[],status:'idle',meta:{prompt:(de as any)?.sunoPrompt||String(de),gen:{prompt:(de as any)?.sunoPrompt||String(de),model:'Suno v4'}},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    const eid='e_'+ts+'_su_'+i;nextEdges.set(eid,{id:eid,from:{nodeId:id,portId:'shot-out'},to:{nodeId:nid,portId:'refs-in'},dataType:'any',style:{animated:false},meta:{semantic:'dataflow'}});});
    useCanvasStore.setState({nodes:next,edges:nextEdges});canvasStore.triggerSync();
  };
  const createShotNodes = () => {
    const ov=getOverview();const ss=ov?.shots||[];if(!ss.length)return;
    const next=new Map(canvasStore.nodes);const nextEdges=new Map(canvasStore.edges);
    const {startX:bx,startY:by}=computeStartPos(next,nextEdges);
    const ts=Date.now();const grid=getGrid(ss.length,5,bx,by,380,200,40,80);
    ss.forEach((sh:any,si:number)=>{const nid='s_'+ts+'_'+si;next.set(nid,{id:nid,type:'image.generate',title:(sh.shotType||'MS')+' #'+(sh.shotNumber||si+1),pos:{x:grid[si].x,y:grid[si].y},size:{w:380,h:200},ports:[],status:'idle',meta:{gen:{prompt:(sh.visualPrompt||sh.contentCN||''),model:'GPT Image2',aspect:'16:9',resolution:'2K',quality:'high'},shot:{shotType:sh.shotType,cameraMovement:sh.cameraMovement,angle:sh.angle,lens:sh.lens,composition:sh.composition,emotion:sh.emotion}},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
    const eid='e_'+ts+'_'+si;nextEdges.set(eid,{id:eid,from:{nodeId:id,portId:'shot-out'},to:{nodeId:nid,portId:'refs-in'},dataType:'any',style:{animated:false},meta:{semantic:'dataflow'}});});
    useCanvasStore.setState({nodes:next,edges:nextEdges});canvasStore.triggerSync();
  };
  // Extract Character Sheet Image Prompt from profile text (~300 char English layout instruction)
  // Backend CHARACTER_EXTRACTION appends it between "### 角色参考图生图提示词" and "==="
  const extractCharSheetPrompt = (profileText: string): string | null => {
    const m = profileText.match(/###\s*角色参考图生图提示词[：:]*\s*\n([\s\S]*?)(?=\n===|$)/);
    return m?.[1]?.trim() || null;
  };
  const createCharNodes = () => {
    const ov=getOverview();const cs=ov?.characterProfiles||{};const e=Object.entries(cs)as[string,string][];if(!e.length)return;
    const next=new Map(canvasStore.nodes);const nextEdges=new Map(canvasStore.edges);
    const {startX:bx,startY:by}=computeStartPos(next,nextEdges);
    const ts=Date.now();const grid=getGrid(e.length,5,bx,by,380,200,40,80);
    e.forEach(([n,de],ci)=>{
      const sheetPrompt = extractCharSheetPrompt(de);
      const genPrompt = sheetPrompt
        || '白色无缝影棚背景。专业服装定妆照多角度拍摄。角色设定图：'+n+'。'+de;
      const nid='c_'+ts+'_'+ci;next.set(nid,{id:nid,type:'image.generate',title:n,pos:{x:grid[ci].x,y:grid[ci].y},size:{w:380,h:200},ports:[],status:'idle',meta:{gen:{prompt:genPrompt,model:'GPT Image2',aspect:'3:2',resolution:'2K',quality:'high'}},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
      const eid='e_'+ts+'_c_'+ci;nextEdges.set(eid,{id:eid,from:{nodeId:id,portId:'shot-out'},to:{nodeId:nid,portId:'refs-in'},dataType:'any',style:{animated:false},meta:{semantic:'dataflow'}});
    });
    useCanvasStore.setState({nodes:next,edges:nextEdges});canvasStore.triggerSync();
  };

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
      {/* Card wrapper */}
      <div style={{ position: 'relative' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        
        <Handle type="target" position={Position.Left} id="refs-in"
          style={{
            width: '19px', height: '19px', background: '#00CFFF',
            borderRadius: '50%',
            left: '-20px', top: '50%', opacity: selected || hovered || data.isConnecting || data.hasConnections ? 1 : 0, pointerEvents: "all", transition: 'opacity 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, lineHeight: 1, color: '#fff',
          }}
        ><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg></Handle>
        <Handle type="source" position={Position.Right} id="shot-out"
          style={{
            width: '19px', height: '19px', background: '#00CFFF',
            borderRadius: '50%',
            right: '-20px', top: '50%', opacity: selected || hovered || data.isConnecting || data.hasConnections ? 1 : 0, pointerEvents: "all", transition: 'opacity 0.15s',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: 700, lineHeight: 1, color: '#fff',
          }}
        ><svg width="10" height="10" viewBox="0 0 10 10" style={{ display: 'block' }}><line x1="5" y1="0" x2="5" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1.5"/></svg></Handle>

        {/* Main Card */}
        <div style={{
          width: 'var(--tap-node-width)',
          minHeight: '220px',
          overflow: 'hidden',
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
            animation: 'direx-light-rim 5s ease-in-out infinite',
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
          {(genRunning || sceneRunning || charRunning || soundRunning || regenerateRunning) && (
            <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'4px 0' }}>
              <div style={{ width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.1)',borderTopColor:'var(--tap-accent)',animation:'tap-spin 0.8s linear infinite' }} />
              <span style={{ fontSize:10,color:'var(--tap-text-4)' }}>
                {regenerateRunning ? '重新生成中…' : soundRunning ? '音乐设计中…' : sceneRunning ? '提取场景中…' : charRunning ? '提取角色中…' : 'Agent 分析中…'}
              </span>
            </div>
          )}

          {/* Error banner — shown when analysis fails (lost/failed/timeout) */}
          {analysisError && !genRunning && (
            <div style={{
              display:'flex',alignItems:'center',justifyContent:'space-between',gap:6,
              padding:'6px 8px',borderRadius:6,
              background:'rgba(255,80,80,0.08)',border:'1px solid rgba(255,80,80,0.2)',
            }}>
              <span style={{ fontSize:10,color:'#E04040',flex:1,minWidth:0 }}>{analysisError}</span>
              <span onClick={() => setAnalysisError(null)}
                style={{ fontSize:12,color:'#E04040',cursor:'pointer',flexShrink:0,lineHeight:1 }}
                title="关闭"
              >✕</span>
            </div>
          )}

          {/* 4 category buttons — text always visible, button bg/border reveal on hover */}
          {analysisDoneRef.current && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                { label: '场景', section: 'scenes', count: getScenes() ? Object.keys(getScenes()!).length : 0, unit: '场', preview: getScenes() ? Object.keys(getScenes()!).join('、') : '', onClick: clickScene },
                { label: '演员', section: 'characters', count: getCharacters() ? Object.keys(getCharacters()!).length : 0, unit: '名', preview: getCharacters() ? Object.keys(getCharacters()!).join('、') : '', onClick: clickChar },
                { label: '分镜', section: 'storyboard', count: getOverview()?.shots?.length || 0, unit: '镜', preview: getOverview()?.shots?.slice(0,3).map((s:any)=>s.shotType+'#'+s.shotNumber).join(' ') || '', onClick: clickShot },
                { label: '音乐', section: 'music', count: getSunoPrompts() ? Object.keys(getSunoPrompts()!).length : 0, unit: '曲', preview: getSunoPrompts() ? Object.keys(getSunoPrompts()!).join('、') : '', onClick: clickSuno },
              ].map((btn, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <div onClick={btn.onClick}
                      style={{
                        flex: 1, minWidth: 0, padding: '6px 10px', cursor: 'pointer', borderRadius: 6,
                        background: 'transparent', border: '1px solid transparent',
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
                    {/* ↻ Regenerate button */}
                    <div
                      onClick={e => { e.stopPropagation(); handleRegenerateSection(btn.section); }}
                      title="重新生成此项"
                      style={{
                        width: 24, height: 24, borderRadius: 4, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, color: regenerateRunning ? 'var(--tap-accent)' : '#999',
                        background: 'transparent', border: '1px solid transparent',
                        transition: 'color 0.2s, border-color 0.2s',
                        opacity: regenerateRunning ? 0.5 : 1,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--tap-accent)'; e.currentTarget.style.borderColor = 'rgba(16,255,209,0.3)'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = '#999'; e.currentTarget.style.borderColor = 'transparent'; }}
                    >
                      {regenerateRunning ? '⏳' : '↻'}
                    </div>
                  </div>
                  {/* Inline feedback input — appears when this section is selected for regen */}
                  {regeneratingSection === btn.section && (
                    <div style={{ display: 'flex', gap: 4, padding: '0 2px' }} onClick={e => e.stopPropagation()} onKeyDown={e => e.stopPropagation()}>
                      <input
                        autoFocus
                        type="text"
                        value={regenerateFeedback}
                        onChange={e => { setRegenerateFeedback(e.target.value); feedbackRef.current = e.target.value; }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); handleRegenerateSection(btn.section); }
                          if (e.key === 'Escape') { e.stopPropagation(); setRegeneratingSection(null); setRegenerateFeedback(''); }
                        }}
                        placeholder="哪里不满意？如：服装太厚重…"
                        style={{
                          flex: 1, padding: '3px 6px', fontSize: 10,
                          border: '1px solid var(--tap-accent)', borderRadius: 4,
                          background: 'rgba(16,255,209,0.05)', color: 'var(--tap-text-1)',
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={e => { e.stopPropagation(); handleRegenerateSection(btn.section); }}
                        style={{
                          padding: '2px 8px', fontSize: 10, fontWeight: 600,
                          background: 'var(--tap-accent)', color: '#000', border: 'none',
                          borderRadius: 4, cursor: 'pointer',
                        }}
                      >
                        重生成
                      </button>
                    </div>
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
                borderRadius: 'var(--tap-r-xl) var(--tap-r-xl) 0 0',
                padding: '10px 14px', fontSize: '8px',
                color: '#333', resize: 'none', outline: 'none',
                lineHeight: 1.5, minHeight: expanded ? '480px' : '160px',
                boxSizing: 'border-box',
                overflowWrap: 'break-word', wordBreak: 'break-word',
              }}
            />
            {/* Bottom bar — send capsule at right:12px, bottom:8px (measured from ImageGenerateNode) */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px',
              padding: '4px 12px 8px 8px',
            }}>
              {/* Send — glass pill */}
              <div style={{ display:'flex',alignItems:'center',justifyContent:'flex-end',width:'55px',height:'20px',borderRadius:'10px',background:'linear-gradient(135deg,rgba(0,0,0,0.03) 0%,rgba(0,0,0,0.01) 50%,rgba(0,0,0,0.03) 100%)',border:'1px solid var(--tap-divider)',boxShadow:'0 0 10px rgba(0,0,0,0.02),inset 0 1px 0 rgba(0,0,0,0.03)',flexShrink:0,paddingRight:'2px' }}>
                <button onClick={handleGenerate} disabled={genRunning}
                  style={{ width:'16px',height:'16px',borderRadius:'50%',background:'#FFF65D',color:'#333',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:'9px',cursor:genRunning?'wait':'pointer',border:'none',boxShadow:'0 1.5px 4px rgba(0,0,0,0.2),0 1px 1.5px rgba(0,0,0,0.12)',opacity:genRunning?0.7:1,transition:'transform 0.15s,box-shadow 0.15s,opacity 0.15s' }}
                  onMouseEnter={e => { if (!genRunning) { e.currentTarget.style.transform = 'scale(1.06)'; e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.22)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1.5px 4px rgba(0,0,0,0.2), 0 1px 1.5px rgba(0,0,0,0.12)'; }}
                >{genRunning ? <svg width="12" height="12" viewBox="0 0 256 256" style={{display:'block'}}><path d="M200,75.64V40a16,16,0,0,0-16-16H72A16,16,0,0,0,56,40V76a16.07,16.07,0,0,0,6.4,12.8L114.67,128,62.4,167.2A16.07,16.07,0,0,0,56,180v36a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V180.36a16.09,16.09,0,0,0-6.35-12.77L141.27,128l52.38-39.59A16.09,16.09,0,0,0,200,75.64Z" fill="none" stroke="#333" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"/></svg> : '↑'}</button>
              </div>
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
