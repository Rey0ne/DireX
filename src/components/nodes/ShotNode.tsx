/* === ShotNode — Text generation node === */
/* Agent decides output type (storyboard / image-prompt / etc.) based on user input */
// @ts-nocheck — ~4 TS6133 dead code (unused local const from rapid prototyping). Safe to suppress; remove individually during refactor.

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useStore } from '@xyflow/react';
import { RefStrip } from '../shared/RefStrip';
import { useMention } from '../shared/useMention';
import { useCanvasStore } from '../../store/useCanvasStore';
import { getSharedApiKey, qDecide, type QDecideResponse, analyzeText } from '../../api/gateway';


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
  const [optimizeRunning, setOptimizeRunning] = useState(false);
  const [reverseRunning, setReverseRunning] = useState(false);
  const [visualStyle, setVisualStyle] = useState('');
  const [showAiWriter, setShowAiWriter] = useState(false);
  const [aiBrief, setAiBrief] = useState('');
  const [aiWriting, setAiWriting] = useState(false);
  const [aiFormat, setAiFormat] = useState('TVC广告');
  const [showFormatMenu, setShowFormatMenu] = useState(false);
  // Map display names (no time) → backend format keys (with time)
  const FORMAT_MAP: Record<string, string> = {
    'TVC广告': 'TVC广告(90秒)',
    '品牌概念片': '品牌概念片(90秒)',
    '短片': '短片(3-5分钟)',
    '短剧': '短剧(1-3分钟/集)',
    '电影': '电影(90-120分钟)',
    '预告片': '预告片(30-60秒)',
    'MV': 'MV(3-5分钟)',
  };
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
  // ShotNode 双模式（互斥）：
  // 有连接参考图 → 反推提示词（GPT-5.6 直接看图→提示词，写入 textarea）
  // 无参考图 → 剧本分析（GPT-5.6 角色/场景/分镜/音乐）
  const handleGenerate = () => {
    if (genRunningRef.current) return;
    // 反推模式：有参考图就走（文本可选），GPT-5.6 直接看图→提示词
    if (data.refUrls && data.refUrls.length > 0) {
      handleReversePrompt();
      return;
    }
    // 剧本分析模式：必须有文本
    if (!prompt.trim()) return;
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

  // ── Image → Prompt reverse-engineering via GPT-5.6 ──
  // Result writes directly into the textarea — no extra UI, no buttons.
  const handleReversePrompt = async () => {
    const refs = data.refUrls;
    if (!refs || refs.length === 0) return;
    setReverseRunning(true);
    try {
      const result = await analyzeText({
        rawText: prompt.trim() || '分析这张图并反推提示词',
        providerId: 'text',
        referenceUrls: refs,
      });
      const reversed = result.compiled?.cn || result.compiled?.en || '';
      if (reversed) {
        setPrompt(reversed);
        promptRef.current = reversed;
        patch('prompt', reversed);
      }
    } catch (err) {
      console.error('[ShotNode] Reverse prompt failed:', err);
    } finally { setReverseRunning(false); }
  };

  const pollResult = async (taskId: string): Promise<any> => {
    const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
    const resp = await fetch(`${apiBase}/api/agent/script/result/${taskId}`);
    return resp.json();
  };

  // ── Server fallback: backend may have directly written results to canvas-state.json ──
  // When polling times out but the pipeline actually completed, data is already on the server.
  const checkServerFallback = async (): Promise<any | null> => {
    try {
      const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
      const resp = await fetch(`${apiBase}/api/canvas/state`, {
        headers: { Authorization: `Bearer ${getSharedApiKey()}` },
      });
      if (!resp.ok) return null;
      const json = await resp.json();
      const serverNode = json.nodes?.find((n: any) => n.id === id);
      if (!serverNode?.meta?.gen) return null;
      const sgo = serverNode.meta.gen;

      // Check what the server has that our local store doesn't
      const localGo = g;
      const hasOverview = sgo.scriptOverview?.shots?.length > 0;
      const hasChars = sgo.scriptCharacters && Object.keys(sgo.scriptCharacters).length > 0;
      const hasScenes = sgo.scriptScenes && Object.keys(sgo.scriptScenes).length > 0;
      const hasMusic = sgo.scriptSunoPrompts && Object.keys(sgo.scriptSunoPrompts).length > 0;

      const isNewOverview = hasOverview && !localGo.scriptOverview?.shots?.length;
      const isNewChars = hasChars && !localGo.scriptCharacters;
      const isNewScenes = hasScenes && !localGo.scriptScenes;
      const isNewMusic = hasMusic && !localGo.scriptSunoPrompts;

      if (!isNewOverview && !isNewChars && !isNewScenes && !isNewMusic) return null;

      console.log('[fallback] Server has direct-written data — applying:', {
        overview: isNewOverview ? `${sgo.scriptOverview.shots.length} shots` : false,
        chars: isNewChars ? `${Object.keys(sgo.scriptCharacters).length} profiles` : false,
        scenes: isNewScenes, music: isNewMusic,
      });

      return {
        success: true,
        section: 'overview',
        shots: sgo.scriptOverview?.shots || [],
        characterProfiles: sgo.scriptOverview?.characterProfiles || {},
        rawOutput: sgo.scriptOverview?.rawOutput || '',
        durationMs: sgo.scriptOverview?.durationMs || 0,
        scenes: sgo.scriptScenes || {},
        sceneArchitecture: sgo.scriptSceneArchitecture || {},
        sunoPrompts: sgo.scriptSunoPrompts || {},
        soundScenes: sgo.scriptSoundScenes || {},
      };
    } catch (err) {
      console.warn('[fallback] Server check failed:', err);
      return null;
    }
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
      case 'supplement': {
        // Characters + scenes + music only — preserve existing shots
        if (json.characterProfiles && Object.keys(json.characterProfiles).length) {
          patch('scriptCharacters', json.characterProfiles);
          // Also merge into overview for createCharNodes to find
          const ov = getOverview() || {} as Record<string, any>;
          patch('scriptOverview', { ...ov, characterProfiles: { ...(ov.characterProfiles || {}), ...json.characterProfiles } });
        }
        if (json.scenes && Object.keys(json.scenes).length) patch('scriptScenes', json.scenes);
        if (json.sunoPrompts && Object.keys(json.sunoPrompts).length) patch('scriptSunoPrompts', json.sunoPrompts);
        if (json.soundScenes && Object.keys(json.soundScenes).length) patch('scriptSoundScenes', json.soundScenes);
        break;
      }

      case 'optimize': {
        // Merge optimized genPrompts into existing shots
        const ov = getOverview() || {} as Record<string, any>;
        const existingShots: any[] = ov.shots || [];
        const optimizedShots: any[] = json.shots || [];
        const mergedShots = existingShots.map((s: any) => {
          const opt = optimizedShots.find((o: any) => o.shotNumber === s.shotNumber);
          if (opt?.genPrompt) return { ...s, genPrompt: opt.genPrompt };
          return s;
        });
        patch('scriptOverview', { ...ov, shots: mergedShots });
        break;
      }
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
        body:JSON.stringify({scriptText:prompt,visualStyle,nodeId:id}),
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
      // ── Timeout — check server fallback first (backend may have written directly) ──
      console.warn('[analysis] Polling timed out — checking server fallback...');
      const fallback = await checkServerFallback();
      if (fallback) {
        console.log('[analysis] Recovered from server fallback after polling timeout');
        applySectionResult(fallback, setPhase);
        patch('scriptTaskId', null);
        genRunningRef.current = false; setGenRunning(false);
        return;
      }
      console.error('[analysis] Timeout after 50 polls (~25 min) — no server data');
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
      // Timeout — check server fallback before clearing taskId
      if (!cancelled) {
        console.warn('[analysis] Resume poll timed out — checking server fallback...');
        const fallback = await checkServerFallback();
        if (fallback) {
          console.log('[analysis] Recovered from server fallback after resume poll timeout');
          applySectionResult(fallback, setPhase);
          patch('scriptTaskId', null);
          genRunningRef.current = false; setGenRunning(false);
          return;
        }
        patch('scriptTaskId', null); setAnalysisError('分析超时，请重试'); genRunningRef.current = false; setGenRunning(false);
      }
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

      const MAX_POLLS = 40; // 40 × 15s = 10 min (matches backend timeout)
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
      console.warn('[music] Polling timed out — checking server fallback...');
      const musicFallback = await checkServerFallback();
      if (musicFallback?.sunoPrompts && Object.keys(musicFallback.sunoPrompts).length) {
        console.log('[music] Recovered from server fallback after polling timeout');
        applySectionResult({ success: true, section: 'music', sunoPrompts: musicFallback.sunoPrompts, soundScenes: musicFallback.soundScenes || {} });
        return;
      }
      console.error('[music] Timeout after 20 polls (~5 min) — no server data');
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

  // ── AI 写剧本 ──
  const handleAiWrite = async () => {
    if (aiWriting) return;
    const hasExistingScript = prompt.trim().length >= 20;
    if (!hasExistingScript && !aiBrief.trim()) return;
    setAiWriting(true);
    try {
      const body: any = { format: FORMAT_MAP[aiFormat] || aiFormat };
      if (hasExistingScript) {
        // Supplement mode: add character/scene profiles to existing script
        body.existingScript = prompt.trim();
        if (aiBrief.trim()) body.brief = aiBrief.trim(); // additional context
      } else {
        body.brief = aiBrief.trim();
      }
      const resp = await fetch('/api/agent/script/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await resp.json();
      if (json.success && json.script) {
        setPrompt(json.script);
        setExpanded(true);    // 展开节点让用户看到完整内容
        patch('prompt', json.script); // 立即持久化
        setShowAiWriter(false);
        setAiBrief('');
      } else {
        setAnalysisError(json.error || '剧本生成失败');
      }
    } catch (err: any) {
      setAnalysisError('AI写剧本失败: ' + String(err));
    } finally {
      setAiWriting(false);
    }
  };

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
      const MAX_POLLS = 40; // 40 × 15s = 10 min (matches backend timeout)
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
      console.warn('[regenerate] Polling timed out — checking server fallback...');
      const regenFallback = await checkServerFallback();
      if (regenFallback) {
        console.log('[regenerate] Recovered from server fallback after polling timeout');
        applySectionResult(regenFallback);
        return;
      }
      console.error('[regenerate] Timeout after 20 polls (~5 min) — no server data');
      setAnalysisError('重新生成超时，请重试');
    } catch (err) {
      console.error('[regenerate] Error:', err);
      setAnalysisError('提交失败：' + String(err).slice(0, 80));
    } finally {
      setRegenerateRunning(false);
    }
  };

  // ── Supplement: extract characters + scenes + music from script text (no shots regeneration) ──
  const handleOptimizePrompts = async () => {
    if (optimizeRunning) return;
    if (!prompt.trim()) return;
    setOptimizeRunning(true);
    setAnalysisError(null);
    const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
    try {
      const submitResp = await fetch(`${apiBase}/api/agent/script/supplement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getSharedApiKey()}` },
        body: JSON.stringify({
          scriptText: prompt,
          visualStyle,
          nodeId: id,
        }),
      });
      const submitJson = await submitResp.json();
      const { taskId } = submitJson;
      if (!taskId) throw new Error('No taskId — server: ' + JSON.stringify(submitJson).slice(0, 120));

      const MAX_POLLS = 20; // 20 × 15s = 5 min
      const POLL_INTERVAL = 15_000;
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
        try {
          const json = await pollResult(taskId);
          if (json.status === 'done' || json.status === 'completed') {
            if (json.success) {
              applySectionResult(json);
            } else {
              setAnalysisError(json.error || '补充提取失败');
            }
            return;
          }
          if (json.status === 'failed') { setAnalysisError(json.error || '优化失败'); return; }
          if (json.status === 'lost') { setAnalysisError('补充任务丢失，请重试'); return; }
        } catch (pollErr) {
          console.warn('[optimize] Poll failed:', pollErr, '— retrying...');
        }
      }
      setAnalysisError('补充超时，请重试');
    } catch (err) {
      console.error('[optimize] Error:', err);
      setAnalysisError('提交失败：' + String(err).slice(0, 80));
    } finally {
      setOptimizeRunning(false);
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
  // Match shot to standardized character/scene profiles by text overlap
  const matchProfiles = (shotText: string, profiles: Record<string, string> | undefined, minRatio = 0.5): string[] => {
    if (!profiles || !shotText) return [];
    const scored: {key: string; hits: number; ratio: number}[] = [];
    for (const key of Object.keys(profiles)) {
      let hitCount = 0;
      const totalWindows = key.length - 1;
      for (let i = 0; i < totalWindows; i++) {
        if (shotText.includes(key.slice(i, i + 2))) hitCount++;
      }
      const ratio = totalWindows > 0 ? hitCount / totalWindows : 0;
      const has3CharMatch = key.length >= 3 && Array.from({length: key.length - 2}, (_, i) => key.slice(i, i + 3)).some(w => shotText.includes(w));
      if (hitCount >= 3 || ratio >= minRatio || has3CharMatch) {
        scored.push({key, hits: hitCount, ratio});
      }
    }
    // Sort by hits descending, best match first
    scored.sort((a, b) => b.hits - a.hits);
    return scored.map(s => s.key);
  };

  // Assemble full structured prompt from shot metadata fields
  // characterProfiles & scenes: standardized KB text — reused instead of shot's independently generated prose
  const formatShotPrompt = (sh: any, characterProfiles?: Record<string, string>, scenes?: Record<string, string>): string => {
    const lines: string[] = [];
    const fn = sh.shotFunction || sh.shot_function || '';
    if (fn) lines.push(`【${fn}】`);
    const metaParts: string[] = [];
    if (sh.shotType) metaParts.push(`景别：${sh.shotType}`);
    if (sh.lens) metaParts.push(`焦段：${sh.lens}`);
    if (sh.angle) metaParts.push(`机位：${sh.angle}`);
    if (sh.shotSide) metaParts.push(`拍摄面：${sh.shotSide}`);
    if (metaParts.length) lines.push(metaParts.join(' | '));
    if (sh.composition) lines.push(`构图：${sh.composition}`);
    if (sh.depthLayers) lines.push(`深度层：${sh.depthLayers}`);
    // Character info block — position/action from shot, identity from standardized profile
    const charFields = [sh.characterPosition, sh.characterFacing, sh.characterAction, sh.characterExpression, sh.characterProps].filter(Boolean);
    if (charFields.length) {
      lines.push(`人物：${charFields.join('；')}`);
    }
    if (sh.keyLight || sh.lighting) lines.push(`主光：${sh.keyLight || sh.lighting}`);
    if (sh.fillLight) lines.push(`辅光：${sh.fillLight}`);
    if (sh.rimLight) lines.push(`轮廓光：${sh.rimLight}`);
    if (sh.specialLight) lines.push(`特殊光效：${sh.specialLight}`);
    if (sh.color) lines.push(`色彩：${sh.color}`);
    if (sh.material) lines.push(`材质：${sh.material}`);
    if (sh.atmosphere) lines.push(`氛围：${sh.atmosphere}`);

    // Match standardized profiles by text overlap with shot fields
    const allCharText = [sh.characterPosition, sh.characterAction, sh.characterFacing, sh.characterExpression].filter(Boolean).join(' ');
    const shotSceneText = sh.scene || '';
    const matchedChars = matchProfiles(allCharText, characterProfiles, 0.5);
    const allScenes = matchProfiles(shotSceneText, scenes, 0.6);
    // Only take the single best-matching scene — one shot = one location
    const matchedScenes = allScenes.length > 0 ? [allScenes[0]] : [];

    // Include the shot's visual prose as cinematography reference (not as identity source)
    const visual = sh.visualPrompt || sh.contentCN || sh.genPrompt || '';

    // Build reference section with standardized profiles
    const hasRefs = matchedChars.length > 0 || matchedScenes.length > 0;
    if (hasRefs || visual) {
      lines.push('────────────────────────────');
    }

    // Standardized character profiles — reused from analysis, NOT independently generated
    for (const name of matchedChars) {
      lines.push(`## 角色设定：@${name}`);
      const profile = characterProfiles![name];
      // Compact: basic info (~100 chars) + clothing/face summary (~500 chars)
      const basicMatch = profile.match(/###\s*基本信息\n([\s\S]*?)(?=\n###|$)/);
      const faceMatch = profile.match(/###\s*面部与发型\n([\s\S]*?)(?=\n###|$)/);
      const clothMatch = profile.match(/###\s*服装\n([\s\S]*?)(?=\n###|$)/);
      let compact = '';
      if (basicMatch) compact += basicMatch[1].trim().slice(0, 150) + '\n';
      if (faceMatch) compact += '面部：' + faceMatch[1].trim().split('\n').slice(0, 2).join('；').slice(0, 200) + '\n';
      if (clothMatch) compact += '服装：' + clothMatch[1].trim().split('\n').slice(0, 2).join('；').slice(0, 200);
      lines.push(compact.trim() || profile.slice(0, 300));
    }

    // Standardized scene descriptions — reused from analysis
    for (const name of matchedScenes) {
      lines.push(`## 场景设定：@${name}`);
      const desc = scenes![name];
      // Compact: basic info + space structure summary
      const basicMatch = desc.match(/###\s*基本信息\n([\s\S]*?)(?=\n###|$)/);
      const spaceMatch = desc.match(/###\s*空间结构\n([\s\S]*?)(?=\n###|$)/);
      let compact = '';
      if (basicMatch) compact += basicMatch[1].trim().slice(0, 150) + '\n';
      if (spaceMatch) compact += '空间：' + spaceMatch[1].trim().split('\n').slice(0, 2).join('；').slice(0, 200);
      lines.push(compact.trim() || desc.slice(0, 300));
    }

    // Shot's visual prose — only as fallback when no standardized profiles matched.
    // Otherwise redundant (and often conflicting) with the standardized text above.
    if (visual && !hasRefs) {
      lines.push(visual);
    }

    // @mention directive for I2I reference linking
    const allMentions = [...matchedChars, ...matchedScenes];
    if (allMentions.length > 0) {
      lines.push('────────────────────────────');
      lines.push('参考图：' + allMentions.map(m => '@' + m).join(' '));
      lines.push('严格遵循角色设定与场景设定。人物外貌、服装、场景结构以上方标准化设定为准，参考图作为身份锁定源。');
    }

    return lines.join('\n');
  };

  const createShotNodes = () => {
    const ov=getOverview();const ss=ov?.shots||[];if(!ss.length)return;
    const next=new Map(canvasStore.nodes);const nextEdges=new Map(canvasStore.edges);
    // Standardized profiles — reused as identity source for all shots
    const charProfiles = (ov?.characterProfiles || getCharacters() || {}) as Record<string, string>;
    const sceneDescs = (ov?.scenes || getScenes() || {}) as Record<string, string>;
    // ── Sync existing shot nodes: update gen.prompt from meta.shot data ──
    const existingChildren = new Map<string, string>(); // shotKey → nodeId
    nextEdges.forEach((e: any) => {
      if (e.from?.nodeId === id) {
        const child = next.get(e.to?.nodeId);
        if (child && child.type === 'image.generate' && (child.meta as any)?.shot) {
          const sh = (child.meta as any).shot;
          const key = (sh.shotNumber || sh.shotType) ? `${sh.shotType || ''}#${sh.shotNumber || ''}` : child.title;
          existingChildren.set(key, child.id);
        }
      }
    });
    let syncedCount = 0;
    ss.forEach((sh: any) => {
      const key = `${sh.shotType || ''}#${sh.shotNumber || ''}`;
      const existingId = existingChildren.get(key);
      if (existingId) {
        const prompt = formatShotPrompt(sh, charProfiles, sceneDescs);
        if (prompt) {
          const existing = next.get(existingId);
          if (existing) {
            const meta = { ...(existing.meta || {}), gen: { ...((existing.meta as any)?.gen || {}), prompt } };
            next.set(existingId, { ...existing, meta });
            syncedCount++;
          }
        }
      }
    });
    if (syncedCount > 0) console.log('[ShotNode] Synced prompts for', syncedCount, 'existing shot nodes');
    // ── Create new shot nodes (skip if already exists) ──
    const existingKeys = new Set(existingChildren.keys());
    const newShots = ss.filter((sh: any) => !existingKeys.has(`${sh.shotType || ''}#${sh.shotNumber || ''}`));
    if (!newShots.length && syncedCount > 0) {
      useCanvasStore.setState({ nodes: next, edges: nextEdges });
      canvasStore.triggerSync();
      console.log('[ShotNode] All', syncedCount, 'shot nodes already exist — prompts synced, no new nodes created');
      return;
    }
    const {startX:bx,startY:by}=computeStartPos(next,nextEdges);
    const ts=Date.now();const grid=getGrid(newShots.length,5,bx,by,380,200,40,80);
    newShots.forEach((sh:any,si:number)=>{const nid='s_'+ts+'_'+si;const prompt = formatShotPrompt(sh, charProfiles, sceneDescs) || (sh.genPrompt || sh.visualPrompt || sh.contentCN || '');next.set(nid,{id:nid,type:'image.generate',title:(sh.shotType||'MS')+' #'+(sh.shotNumber||si+1),pos:{x:grid[si].x,y:grid[si].y},size:{w:380,h:200},ports:[],status:'idle',meta:{gen:{prompt,model:'GPT Image2',aspect:'16:9',resolution:'2K',quality:'high'},shot:{shotFunction:sh.shotFunction||'',shotType:sh.shotType,shotSide:sh.shotSide||'',angle:sh.angle,lens:sh.lens,composition:sh.composition,depthLayers:sh.depthLayers||'',characterPosition:sh.characterPosition||'',characterFacing:sh.characterFacing||'',characterAction:sh.characterAction||'',characterExpression:sh.characterExpression||'',characterProps:sh.characterProps||'',foreground:sh.foreground||'',midground:sh.midground||'',background:sh.background||'',lightSources:sh.lightSources||'',keyLight:sh.keyLight||'',fillLight:sh.fillLight||'',rimLight:sh.rimLight||'',specialLight:sh.specialLight||'',lighting:sh.keyLight||sh.lightSources||'',color:sh.color,material:sh.material,atmosphere:sh.atmosphere}},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
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
          {/* Hint / Results summary */}
          {(() => {
            const ov = getOverview();
            const hasData = ov?.shots?.length > 0;
            if (hasData) {
              const shotCount = ov!.shots!.length;
              const charCount = getCharacters() ? Object.keys(getCharacters()!).length : 0;
              const sceneCount = getScenes() ? Object.keys(getScenes()!).length : 0;
              const shotTypes = [...new Set(ov!.shots!.map((s: any) => s.shotType).filter(Boolean))].join(' ');
              return (
                <div style={{ fontSize: 9, color: 'var(--tap-text-4)', lineHeight: 1.4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ color: 'var(--tap-text-2)', fontWeight: 600 }}>分析完成</span>
                  <span>{shotCount}镜分镜 · {charCount}名角色 · {sceneCount}个场景</span>
                  {shotTypes && <span style={{ color: 'var(--tap-text-3)' }}>{shotTypes}</span>}
                </div>
              );
            }
            return <span style={{ fontSize: 9, color: 'var(--tap-text-4)', lineHeight: 1 }}>点击按键自动生成节点</span>;
          })()}

          {/* Loading / Status */}
          {(genRunning || sceneRunning || charRunning || soundRunning || regenerateRunning || optimizeRunning || reverseRunning) && (
            <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'4px 0' }}>
              <div style={{ width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.1)',borderTopColor:'var(--tap-accent)',animation:'tap-spin 0.8s linear infinite' }} />
              <span style={{ fontSize:10,color:'var(--tap-text-4)' }}>
                {optimizeRunning ? '优化提示词中…' : reverseRunning ? '反推提示词中…' : regenerateRunning ? '重新生成中…' : soundRunning ? '音乐设计中…' : sceneRunning ? '提取场景中…' : charRunning ? '提取角色中…' : 'Agent 分析中…'}
              </span>
            </div>
          )}

          {/* Error banner — shown when analysis fails (lost/failed/timeout) */}
          {analysisError && !genRunning && !optimizeRunning && (
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

          {/* 4 category buttons — always visible when there's text or data */}
          {(analysisDoneRef.current || getOverview()?.shots?.length > 0 || prompt.trim()) && (
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
          {/* ── Optimize button — shows when there's text, calls supplement endpoint ── */}
          {prompt.trim() && (
            <div
              onClick={handleOptimizePrompts}
              title="将角色外观和场景环境注入每条分镜提示词"
              style={{
                marginTop: 4, padding: '6px 10px', cursor: optimizeRunning ? 'default' : 'pointer',
                borderRadius: 6, background: 'transparent', border: '1px dashed rgba(16,255,209,0.3)',
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: optimizeRunning ? 0.5 : 1,
                transition: 'background 0.25s ease, border-color 0.25s ease',
              }}
              onMouseEnter={e => {
                if (!optimizeRunning) {
                  e.currentTarget.style.background = 'rgba(16,255,209,0.08)';
                  e.currentTarget.style.borderColor = '#10FFD1';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(16,255,209,0.3)';
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: '#10FFD1' }}>
                {optimizeRunning ? '⏳ 提取中…' : '🎯 提取角色+场景+音乐'}
              </span>
              <span style={{ fontSize: 10, color: 'rgba(16,255,209,0.6)' }}>
                {getOverview()?.shots?.length || 0}镜已有 → 补充角色+场景
              </span>
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
            {/* moved to bottom bar */}
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
{/* ── AI Writer removed from inside the card — lives below as separate sub-unit ── */}
            {/* Bottom bar — AI 写剧本 toggle + send capsule */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px',
              padding: '4px 12px 8px',
            }}>
              {/* AI 写剧本 toggle */}
              <span onClick={() => { setShowAiWriter(!showAiWriter); setAiBrief(''); }}
                style={{
                  fontSize: 10, fontWeight: 600,
                  color: showAiWriter ? 'var(--tap-accent)' : '#666',
                  background: showAiWriter ? 'rgba(0,207,255,0.08)' : 'rgba(0,0,0,0.04)',
                  padding: '3px 10px', borderRadius: 10,
                  cursor: 'pointer', userSelect: 'none',
                  border: showAiWriter ? '1px solid rgba(0,207,255,0.20)' : '1px solid transparent',
                  transition: 'all 0.15s',
                }}
              >{aiWriting ? '⏳ 写作中...' : showAiWriter ? '✕ 收起' : 'AI 写剧本'}</span>
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
          {/* ── AI Writer sub-unit — separate panel below main card ── */}
          {showAiWriter && (
            <div style={{
              background: '#fff',
              borderRadius: 'var(--tap-r-xl)',
              pointerEvents: 'auto',
              marginTop: '8px',
              boxShadow: 'inset 0 0 0 1px rgba(0,207,255,0.06), inset 0 0 10px rgba(0,207,255,0.03), 0 0 0 3px rgba(0,207,255,0.04), 0 0 0 8px rgba(0,207,255,0.02), 0 2px 12px rgba(0,0,0,0.03)',
              animation: 'tap-fade-in 80ms var(--tap-ease)',
            }}>
              {/* Brief textarea — borderless, no background */}
              <textarea className="no-wheel" value={aiBrief} onChange={e => setAiBrief(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAiWrite(); } }}
                placeholder={'1、输入想法生成剧本，2、补充内容请直接点击发送'}
                rows={3}
                style={{ width: '100%', background: 'transparent', border: 'none', borderRadius: 0, color: '#333', fontSize: 10, padding: '8px 14px', outline: 'none', resize: 'vertical', minHeight: '52px', lineHeight: 1.5, overflowWrap: 'break-word', wordBreak: 'break-word', boxSizing: 'border-box' }}
                onPointerDownCapture={e => e.stopPropagation()}
                onMouseDownCapture={e => e.stopPropagation()} />
              {/* Bottom bar — "/" format + send */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '4px 12px 8px' }}>
                {/* Slash command — format selector */}
                <div style={{ position: 'relative' }}>
                  <span onClick={() => setShowFormatMenu(!showFormatMenu)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 20, height: 20, borderRadius: 6,
                      fontSize: 12, fontWeight: 600,
                      color: showFormatMenu ? 'var(--tap-accent)' : '#999',
                      background: showFormatMenu ? 'rgba(0,207,255,0.10)' : 'transparent',
                      cursor: 'pointer', userSelect: 'none',
                      border: showFormatMenu ? '1px solid rgba(0,207,255,0.25)' : '1px solid transparent',
                      transition: 'all 0.12s',
                    }}
                  >/</span>
                  {showFormatMenu && (
                    <>
                      <div style={{ position:'fixed', inset:0, zIndex:99998 }} onClick={() => setShowFormatMenu(false)} />
                      <div style={{
                        position: 'absolute', bottom: '100%', left: 0,
                        marginBottom: 4, zIndex: 99999,
                        background: '#fff', border: '1px solid var(--tap-border)',
                        borderRadius: 8, boxShadow: 'var(--tap-shadow-lg)',
                        padding: 4, minWidth: 110,
                      }}>
                        {['TVC广告','品牌概念片','短片','短剧','电影','预告片','MV'].map(fmt => (
                          <div key={fmt} onClick={() => { setAiFormat(fmt); setShowFormatMenu(false); }}
                            style={{
                              fontSize: 10, padding: '5px 10px', borderRadius: 4,
                              cursor: 'pointer',
                              background: aiFormat === fmt ? 'rgba(0,207,255,0.08)' : 'transparent',
                              color: aiFormat === fmt ? 'var(--tap-accent)' : '#666',
                              fontWeight: aiFormat === fmt ? 600 : 400,
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,207,255,0.08)'}
                            onMouseLeave={e => e.currentTarget.style.background = aiFormat === fmt ? 'rgba(0,207,255,0.08)' : 'transparent'}
                          >/{fmt}</div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                {/* Send button */}
                <button onClick={handleAiWrite} disabled={aiWriting || (!prompt.trim() && !aiBrief.trim())}
                  style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: (prompt.trim() || aiBrief.trim()) ? 'var(--tap-accent)' : '#ddd',
                    color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: (prompt.trim() || aiBrief.trim()) ? 'pointer' : 'default',
                    flexShrink: 0, fontWeight: 800, fontSize: '11px',
                    boxShadow: (prompt.trim() || aiBrief.trim()) ? '0 1.5px 4px rgba(0,207,255,0.25)' : 'none',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseEnter={e => { if ((prompt.trim() || aiBrief.trim()) && !aiWriting) { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,207,255,0.35)'; } }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = (prompt.trim() || aiBrief.trim()) ? '0 1.5px 4px rgba(0,207,255,0.25)' : 'none'; }}
                >{aiWriting ? <svg width="12" height="12" viewBox="0 0 256 256" style={{display:'block'}}><path d="M200,75.64V40a16,16,0,0,0-16-16H72A16,16,0,0,0,56,40V76a16.07,16.07,0,0,0,6.4,12.8L114.67,128,62.4,167.2A16.07,16.07,0,0,0,56,180v36a16,16,0,0,0,16,16H184a16,16,0,0,0,16-16V180.36a16.09,16.09,0,0,0-6.35-12.77L141.27,128l52.38-39.59A16.09,16.09,0,0,0,200,75.64Z" fill="none" stroke="#fff" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"/></svg> : '↑'}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}
