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

const STYLE_SUFFIX = `\n\n黑白铅笔线稿风格，
专业导演分镜，
影视预演分镜板，
清晰视觉叙事，
高可读性构图，
工业级Storyboard，
带镜头标注，
电影感构图，
单格分镜画面，
干净简洁线稿，
制作级分镜设计。`;

export function ShotNode({ id, data, selected }: { id: string; data: ShotNodeData; selected?: boolean }) {
  const shot = data.shot || {};
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
  const getOverview = () => (data as any).scriptOverview || (gen as any).scriptOverview || null;
  const getScenes = () => (data as any).scriptScenes || null;
  const getCharacters = () => (data as any).scriptCharacters || getOverview()?.characterProfiles || null;
  const getSpatialDesigns = () => (data as any).scriptSpatialDesigns || null;
  const getProps = () => (data as any).scriptProps || null;
  const getSound = () => (data as any).scriptSound || null;
  const getSunoPrompts = () => (data as any).scriptSunoPrompts || null;
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

  const pollResult = async (taskId: string, attempt: number): Promise<any> => {
    const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
    const resp = await fetch(`${apiBase}/api/agent/script/result/${taskId}`);
    return resp.json();
  };

  const handleScriptAnalysis = async () => {
    if (!prompt.trim()) return;
    genRunningRef.current = true; setGenRunning(true);
    const apiBase = window.location.hostname === 'localhost' ? 'http://localhost:3001' : '';
    try {
      // 1. 提交任务 → 立刻返回 taskId
      const submitResp = await fetch(`${apiBase}/api/agent/script/overview`, {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${getSharedApiKey()}`},
        body:JSON.stringify({scriptText:prompt,visualStyle}),
      });
      const { taskId } = await submitResp.json();
      if (!taskId) throw new Error('No taskId returned');

      // 2. 轮询结果（30s × 50 ≈ 25min，对齐后端 Phase1 10min + Phase2 15min timeout）
      const MAX_POLLS = 50;
      const POLL_INTERVAL = 30_000;
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise(r => setTimeout(r, POLL_INTERVAL));
        try {
          const json = await pollResult(taskId, i + 1);
          if (json.status === 'done') {
            if (json.success) {
              patch('scriptOverview', {
                shots: json.shots || [],
                characterProfiles: json.characterProfiles || {},
                rawOutput: json.rawOutput || '',
                durationMs: json.durationMs || 0,
              });
              analysisDoneRef.current = true;
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
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Card wrapper */}
      <div style={{ position: 'relative' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        
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
                : '1px solid var(--tap-border)',
          borderRadius: 'var(--tap-r-xl)',
          ...(selected ? {
            background: 'linear-gradient(115deg, rgba(94,234,212,0.07) 0%, rgba(94,234,212,0.03) 25%, var(--tap-panel) 50%, var(--tap-panel) 100%)',
            backgroundSize: '250% 250%',
            animation: 'direx-light-wash 6s ease-in-out infinite, direx-light-rim 5s ease-in-out infinite',
            willChange: 'box-shadow',
          } : {}),
          boxShadow: data.isPickTarget
            ? '0 0 28px rgba(180,180,185,0.25)'
            : data.isConnectTarget
              ? '0 0 28px rgba(180,180,185,0.2)'
              : selected ? undefined : 'var(--tap-shadow-sm)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          transition: `all var(--tap-dur-fast) var(--tap-ease)`,
        }}>
          {/* Title */}
          <textarea className="no-wheel"
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

          {/* Scene extraction result */}
          {getScenes() && (() => {
            const scenes = getScenes()!;
            const sceneCount = Object.keys(scenes).length;
            if (sceneCount === 0) return null;
            const createSceneNodes = () => {
              const entries = Object.entries(scenes) as [string, string][];
              if (!entries.length) return;
              const next = new Map(canvasStore.nodes);
              const nextEdges = new Map(canvasStore.edges);
              const baseX = (canvasStore.nodes.get(id)?.pos?.x || 0) + 340;
              const baseY = (canvasStore.nodes.get(id)?.pos?.y || 0) + 200;
              const COLS = 3; const ts = Date.now(); const newEdgeList: any[] = [];
              entries.forEach(([name, desc], si) => {
                const nid = 'sc_' + ts + '_' + si;
                const prompt = `场景概念设计：${name}。${desc.slice(0, 500)}。电影级场景设定。`;
                next.set(nid, { id: nid, type: 'image.generate', title: name,
                  pos: { x: baseX + (si % COLS) * 340, y: baseY + Math.floor(si / COLS) * 400 },
                  size: { w: 380, h: 200 }, ports: [], status: 'idle',
                  meta: { gen: { prompt, model: 'GPT Image2', aspect: '16:9', resolution: '2K', quality: 'high' } },
                  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
                const eid = 'e_' + ts + '_sc_' + si;
                nextEdges.set(eid, { id: eid, from: { nodeId: id, portId: 'shot-out' }, to: { nodeId: nid, portId: 'refs-in' }, dataType: 'any', style: { animated: false }, meta: { semantic: 'dataflow' } });
                newEdgeList.push({ id: eid, from: { nodeId: id, portId: 'shot-out' }, to: { nodeId: nid, portId: 'refs-in' }, dataType: 'any', style: { animated: false }, meta: { semantic: 'dataflow' } });
              });
              useCanvasStore.setState({ nodes: next, edges: nextEdges }); canvasStore.triggerSync();
              fetch('/api/canvas/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tapnow-dev-key' },
                body: JSON.stringify({ nodes: Array.from(next.values()).map((n: any) => ({ id: n.id, type: n.type, title: n.title, pos: n.pos, size: n.size, ports: n.ports, status: n.status, meta: n.meta })), edges: newEdgeList }) }).catch(() => {});
            };
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div onClick={createSceneNodes} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)', border: '1px solid rgba(245,158,11,0.25)', transition: 'all 0.15s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245,158,11,0.20) 0%, rgba(245,158,11,0.08) 100%)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.25)'; }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>🏛️ 场景 {sceneCount}场</span>
                  <span style={{ fontSize: 9, color: 'var(--tap-text-4)' }}>点击生成 →</span>
                </div>
              </div>
            );
          })()}

          {/* Spatial Design result */}
          {getSpatialDesigns() && (() => {
            const designs = getSpatialDesigns()!;
            const count = Object.keys(designs).length;
            if (count === 0) return null;
            const createSpaceNodes = () => {
              const entries = Object.entries(designs) as [string, string][];
              if (!entries.length) return;
              const next = new Map(canvasStore.nodes);
              const nextEdges = new Map(canvasStore.edges);
              const baseX = (canvasStore.nodes.get(id)?.pos?.x || 0) + 340;
              const baseY = (canvasStore.nodes.get(id)?.pos?.y || 0) + 200;
              const COLS = 3; const ts = Date.now(); const newEdgeList: any[] = [];
              entries.forEach(([name, desc], i) => {
                const nid = 'sp_' + ts + '_' + i;
                const prompt = `场景空间设计：${name}。${desc.slice(0, 500)}。电影级场景概念设计。`;
                next.set(nid, { id: nid, type: 'image.generate', title: '🏗️ ' + name,
                  pos: { x: baseX + (i % COLS) * 340, y: baseY + Math.floor(i / COLS) * 400 },
                  size: { w: 380, h: 200 }, ports: [], status: 'idle',
                  meta: { gen: { prompt, model: 'GPT Image2', aspect: '16:9', resolution: '2K', quality: 'high' } },
                  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
                const eid = 'e_' + ts + '_sp_' + i;
                nextEdges.set(eid, { id: eid, from: { nodeId: id, portId: 'shot-out' }, to: { nodeId: nid, portId: 'refs-in' }, dataType: 'any', style: { animated: false }, meta: { semantic: 'dataflow' } });
                newEdgeList.push({ id: eid, from: { nodeId: id, portId: 'shot-out' }, to: { nodeId: nid, portId: 'refs-in' }, dataType: 'any', style: { animated: false }, meta: { semantic: 'dataflow' } });
              });
              useCanvasStore.setState({ nodes: next, edges: nextEdges }); canvasStore.triggerSync();
              fetch('/api/canvas/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tapnow-dev-key' },
                body: JSON.stringify({ nodes: Array.from(next.values()).map((n: any) => ({ id: n.id, type: n.type, title: n.title, pos: n.pos, size: n.size, ports: n.ports, status: n.status, meta: n.meta })), edges: newEdgeList }) }).catch(() => {});
            };
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div onClick={createSpaceNodes} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 100%)', border: '1px solid rgba(16,185,129,0.25)', transition: 'all 0.15s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16,185,129,0.20) 0%, rgba(16,185,129,0.08) 100%)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.04) 100%)'; e.currentTarget.style.borderColor = 'rgba(16,185,129,0.25)'; }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>🏗️ 空间 {count}场</span>
                  <span style={{ fontSize: 9, color: 'var(--tap-text-4)' }}>点击生成 →</span>
                </div>
              </div>
            );
          })()}

          {/* Prop Design result */}
          {getProps() && (() => {
            const props = getProps()!;
            const count = Object.keys(props).length;
            if (count === 0) return null;
            const createPropNodes = () => {
              const entries = Object.entries(props) as [string, string][];
              if (!entries.length) return;
              const next = new Map(canvasStore.nodes);
              const nextEdges = new Map(canvasStore.edges);
              const baseX = (canvasStore.nodes.get(id)?.pos?.x || 0) + 340;
              const baseY = (canvasStore.nodes.get(id)?.pos?.y || 0) + 200;
              const COLS = 4; const ts = Date.now(); const newEdgeList: any[] = [];
              entries.forEach(([name, desc], i) => {
                const nid = 'pr_' + ts + '_' + i;
                const prompt = `道具设计：${name}。${desc.slice(0, 500)}。白色背景。产品级道具设定图。`;
                next.set(nid, { id: nid, type: 'image.generate', title: '🪄 ' + name,
                  pos: { x: baseX + (i % COLS) * 220, y: baseY + Math.floor(i / COLS) * 220 },
                  size: { w: 200, h: 200 }, ports: [], status: 'idle',
                  meta: { gen: { prompt, model: 'GPT Image2', aspect: '1:1', resolution: '2K', quality: 'high' } },
                  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
                const eid = 'e_' + ts + '_pr_' + i;
                nextEdges.set(eid, { id: eid, from: { nodeId: id, portId: 'shot-out' }, to: { nodeId: nid, portId: 'refs-in' }, dataType: 'any', style: { animated: false }, meta: { semantic: 'dataflow' } });
                newEdgeList.push({ id: eid, from: { nodeId: id, portId: 'shot-out' }, to: { nodeId: nid, portId: 'refs-in' }, dataType: 'any', style: { animated: false }, meta: { semantic: 'dataflow' } });
              });
              useCanvasStore.setState({ nodes: next, edges: nextEdges }); canvasStore.triggerSync();
              fetch('/api/canvas/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tapnow-dev-key' },
                body: JSON.stringify({ nodes: Array.from(next.values()).map((n: any) => ({ id: n.id, type: n.type, title: n.title, pos: n.pos, size: n.size, ports: n.ports, status: n.status, meta: n.meta })), edges: newEdgeList }) }).catch(() => {});
            };
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div onClick={createPropNodes} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(236,72,153,0.04) 100%)', border: '1px solid rgba(236,72,153,0.25)', transition: 'all 0.15s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(236,72,153,0.20) 0%, rgba(236,72,153,0.08) 100%)'; e.currentTarget.style.borderColor = 'rgba(236,72,153,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(236,72,153,0.12) 0%, rgba(236,72,153,0.04) 100%)'; e.currentTarget.style.borderColor = 'rgba(236,72,153,0.25)'; }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#ec4899' }}>🪄 道具 {count}件</span>
                  <span style={{ fontSize: 9, color: 'var(--tap-text-4)' }}>点击生成 →</span>
                </div>
              </div>
            );
          })()}

          {/* Sound / Suno result */}
          {getSunoPrompts() && (() => {
            const sunoPrompts = getSunoPrompts()!;
            const count = Object.keys(sunoPrompts).length;
            if (count === 0) return null;
            const createMusicNodes = () => {
              const entries = Object.entries(sunoPrompts) as [string, string][];
              if (!entries.length) return;
              const next = new Map(canvasStore.nodes);
              const nextEdges = new Map(canvasStore.edges);
              const baseX = (canvasStore.nodes.get(id)?.pos?.x || 0) + 340;
              const baseY = (canvasStore.nodes.get(id)?.pos?.y || 0) + 200;
              const COLS = 3; const ts = Date.now(); const newEdgeList: any[] = [];
              entries.forEach(([name, desc], i) => {
                const nid = 'mu_' + ts + '_' + i;
                const sunoPrompt = desc.replace(/^##\s*.+\n?/m, '').trim().slice(0, 200);
                next.set(nid, { id: nid, type: 'audio.generate', title: '🎵 ' + name,
                  pos: { x: baseX + (i % COLS) * 340, y: baseY + Math.floor(i / COLS) * 240 },
                  size: { w: 300, h: 160 }, ports: [], status: 'idle',
                  meta: { gen: { prompt: sunoPrompt, model: 'Suno v4', duration: '60s' } },
                  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
                const eid = 'e_' + ts + '_mu_' + i;
                nextEdges.set(eid, { id: eid, from: { nodeId: id, portId: 'shot-out' }, to: { nodeId: nid, portId: 'refs-in' }, dataType: 'any', style: { animated: false }, meta: { semantic: 'dataflow' } });
                newEdgeList.push({ id: eid, from: { nodeId: id, portId: 'shot-out' }, to: { nodeId: nid, portId: 'refs-in' }, dataType: 'any', style: { animated: false }, meta: { semantic: 'dataflow' } });
              });
              useCanvasStore.setState({ nodes: next, edges: nextEdges }); canvasStore.triggerSync();
              fetch('/api/canvas/sync', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tapnow-dev-key' },
                body: JSON.stringify({ nodes: Array.from(next.values()).map((n: any) => ({ id: n.id, type: n.type, title: n.title, pos: n.pos, size: n.size, ports: n.ports, status: n.status, meta: n.meta })), edges: newEdgeList }) }).catch(() => {});
            };
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div onClick={createMusicNodes} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                  background: 'linear-gradient(135deg, rgba(250,204,21,0.12) 0%, rgba(250,204,21,0.04) 100%)', border: '1px solid rgba(250,204,21,0.25)', transition: 'all 0.15s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(250,204,21,0.20) 0%, rgba(250,204,21,0.08) 100%)'; e.currentTarget.style.borderColor = 'rgba(250,204,21,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(250,204,21,0.12) 0%, rgba(250,204,21,0.04) 100%)'; e.currentTarget.style.borderColor = 'rgba(250,204,21,0.25)'; }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#facc15' }}>🎵 Suno {count}曲</span>
                  <span style={{ fontSize: 9, color: 'var(--tap-text-4)' }}>点击生成 →</span>
                </div>
              </div>
            );
          })()}

          {/* Phase 1 result: Two action buttons */}
          {phase === 'overview' && getOverview() && (() => {
            const ov = getOverview();
            const shotCount = (ov.shots || []).length;
            const charCount = Object.keys(ov.characterProfiles || {}).length;

            const createShotNodes = () => {
              const shots = ov.shots || [];
              if (!shots.length) return;
              const next = new Map(canvasStore.nodes);
              const nextEdges = new Map(canvasStore.edges);
              const baseX = (canvasStore.nodes.get(id)?.pos?.x || 0) + 340;
              const baseY = (canvasStore.nodes.get(id)?.pos?.y || 0) + 200;
              const COLS = 4;
              const ts = Date.now();
              const newEdgeList: any[] = [];
              shots.forEach((sh: any, si: number) => {
                const nid = 's_' + ts + '_' + si;
                const prompt = (sh.visualPrompt || sh.contentCN || '') + STYLE_SUFFIX;
                next.set(nid, {
                  id: nid,
                  type: 'image.generate',
                  title: (sh.shotType || 'MS') + ' #' + (sh.shotNumber || si + 1),
                  pos: { x: baseX + (si % COLS) * 340, y: baseY + Math.floor(si / COLS) * 400 },
                  size: { w: 380, h: 200 },
                  ports: [],
                  status: 'idle',
                  meta: {
                    gen: { prompt, model: 'GPT Image2', aspect: '16:9', resolution: '2K', quality: 'high' },
                    shot: {
                      shotType: sh.shotType, cameraMovement: sh.cameraMovement,
                      angle: sh.angle, lens: sh.lens, composition: sh.composition,
                      emotion: sh.emotion,
                    },
                  },
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
                // 建立连线：text 节点 → 新分镜节点
                const eid = 'e_' + ts + '_' + si;
                const edge = {
                  id: eid,
                  from: { nodeId: id, portId: 'shot-out' },
                  to: { nodeId: nid, portId: 'refs-in' },
                  dataType: 'any',
                  style: { animated: false },
                  meta: { semantic: 'dataflow' },
                };
                nextEdges.set(eid, edge);
                newEdgeList.push(edge);
              });
              const allNodes = Array.from(next.values());
              useCanvasStore.setState({ nodes: next, edges: nextEdges });
              canvasStore.triggerSync();
              fetch('/api/canvas/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tapnow-dev-key' },
                body: JSON.stringify({ nodes: allNodes.map(n => ({ id: n.id, type: n.type, title: n.title, pos: n.pos, size: n.size, ports: n.ports, status: n.status, meta: n.meta })), edges: newEdgeList }),
              }).catch(() => {});
            };

            const createCharacterNodes = () => {
              const chars = ov.characterProfiles || {};
              const entries = Object.entries(chars) as [string, string][];
              if (!entries.length) return;
              const next = new Map(canvasStore.nodes);
              const nextEdges = new Map(canvasStore.edges);
              const baseX = (canvasStore.nodes.get(id)?.pos?.x || 0) + 340;
              const baseY = (canvasStore.nodes.get(id)?.pos?.y || 0) + 200;
              const COLS = 4;
              const ts = Date.now();
              const newEdgeList: any[] = [];
              entries.forEach(([name, desc], ci) => {
                const nid = 'c_' + ts + '_' + ci;
                const prompt = `角色设定图：${name}。${desc}。白色背景。三视图（正面、侧面、背面）。包含全身服装与标志性道具。完整角色参考图。`;
                next.set(nid, {
                  id: nid,
                  type: 'image.generate',
                  title: name,
                  pos: { x: baseX + (ci % COLS) * 220, y: baseY + Math.floor(ci / COLS) * 220 },
                  size: { w: 200, h: 200 },
                  ports: [],
                  status: 'idle',
                  meta: { gen: { prompt, model: 'GPT Image2', aspect: '3:2', resolution: '2K', quality: 'high' } },
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
                // 建立连线：text 节点 → 角色节点
                const eid = 'e_' + ts + '_c_' + ci;
                const edge = {
                  id: eid,
                  from: { nodeId: id, portId: 'shot-out' },
                  to: { nodeId: nid, portId: 'refs-in' },
                  dataType: 'any',
                  style: { animated: false },
                  meta: { semantic: 'dataflow' },
                };
                nextEdges.set(eid, edge);
                newEdgeList.push(edge);
              });
              const allNodes = Array.from(next.values());
              useCanvasStore.setState({ nodes: next, edges: nextEdges });
              canvasStore.triggerSync();
              fetch('/api/canvas/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tapnow-dev-key' },
                body: JSON.stringify({ nodes: allNodes.map(n => ({ id: n.id, type: n.type, title: n.title, pos: n.pos, size: n.size, ports: n.ports, status: n.status, meta: n.meta })), edges: newEdgeList }),
              }).catch(() => {});
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Storyboard button */}
                <div
                  onClick={createShotNodes}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                    background: 'linear-gradient(135deg, rgba(94,234,212,0.12) 0%, rgba(94,234,212,0.04) 100%)',
                    border: '1px solid rgba(94,234,212,0.25)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(94,234,212,0.20) 0%, rgba(94,234,212,0.08) 100%)'; e.currentTarget.style.borderColor = 'rgba(94,234,212,0.5)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(94,234,212,0.12) 0%, rgba(94,234,212,0.04) 100%)'; e.currentTarget.style.borderColor = 'rgba(94,234,212,0.25)'; }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#5eead4' }}>分镜 {shotCount}镜</span>
                  <span style={{ fontSize: 9, color: 'var(--tap-text-4)' }}>点击生成 →</span>
                </div>

                {/* Character button */}
                {charCount > 0 && (
                  <div
                    onClick={createCharacterNodes}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                      background: 'linear-gradient(135deg, rgba(129,140,248,0.12) 0%, rgba(129,140,248,0.04) 100%)',
                      border: '1px solid rgba(129,140,248,0.25)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(129,140,248,0.20) 0%, rgba(129,140,248,0.08) 100%)'; e.currentTarget.style.borderColor = 'rgba(129,140,248,0.5)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(129,140,248,0.12) 0%, rgba(129,140,248,0.04) 100%)'; e.currentTarget.style.borderColor = 'rgba(129,140,248,0.25)'; }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#818cf8' }}>角色 {charCount}角</span>
                    <span style={{ fontSize: 9, color: 'var(--tap-text-4)' }}>点击生成 →</span>
                  </div>
                )}

                {/* Shot preview summary */}
                {shotCount > 0 && (
                  <div style={{ fontSize: 9, color: 'var(--tap-text-4)', padding: '4px 0' }}>
                    {shotCount > 0 && `共 ${shotCount} 个分镜 · 中文提示词 · 点击按钮批量创建`}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Loading / Status */}
          {(genRunning || sceneRunning || charRunning || spaceRunning || propRunning || soundRunning) && (
            <div style={{ minHeight:40,display:'flex',alignItems:'center',justifyContent:'center',gap:8 }}>
              <div style={{ width:16,height:16,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.1)',borderTopColor:'var(--tap-accent)',animation:'tap-spin 0.8s linear infinite' }} />
              <span style={{ fontSize:10,color:'var(--tap-text-4)' }}>
                {spaceRunning ? '空间设计中…' : propRunning ? '道具设计中…' : soundRunning ? '声音设计中…' : sceneRunning ? '提取场景中…' : charRunning ? '提取角色中…' : 'Agent 分析中…'}
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
            width: '400px',
            marginTop: `${10/zoom}px`,
            zIndex: 50,
            animation: 'tap-fade-in 50ms var(--tap-ease)',
          }}>
          <div style={{
            background: '#24272e',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 'var(--tap-r-xl)',
            overflow: 'hidden',
          }}>
            <input value={visualStyle} onChange={e=>setVisualStyle(e.target.value)}
              placeholder="请填入风格，如真人/动漫"
              style={{ width:'100%',background:'#2a2d33',border:'none',borderBottom:'1px solid rgba(255,255,255,0.10)',color:'var(--tap-text-2)',fontSize:11,padding:'8px 14px',outline:'none' }}
              onPointerDownCapture={e=>e.stopPropagation()} onMouseDownCapture={e=>e.stopPropagation()} />
            <div style={{ padding: '4px 12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <RefStrip nodeId={id} refUrls={data.refUrls} />
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
                width: '100%', background: 'transparent', border: 'none',
                padding: '12px 14px', fontSize: '11px',
                color: 'var(--tap-text-1)', resize: 'vertical', outline: 'none',
                lineHeight: 1.5, overflowY: 'scroll', minHeight: expanded ? '480px' : '160px',
              }}
            />
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
              {/* Three action buttons */}
              <div style={{ display: 'flex', gap: 8, padding: '8px 14px 12px' }}>
                <button onClick={handleSceneExtraction} disabled={sceneRunning || !prompt.trim()}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '8px 0', borderRadius: 8, cursor: sceneRunning ? 'wait' : 'pointer', border: 'none',
                    background: sceneRunning ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.10)',
                    color: sceneRunning ? '#fbbf24' : '#f59e0b', fontSize: 12, fontWeight: 700,
                    transition: 'all 0.15s ease', opacity: sceneRunning ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (!sceneRunning) { e.currentTarget.style.background = 'rgba(245,158,11,0.22)'; } }}
                  onMouseLeave={e => { if (!sceneRunning) { e.currentTarget.style.background = 'rgba(245,158,11,0.10)'; } }}
                >{sceneRunning ? '⏳' : '🏛️'} 场景</button>
                <button onClick={handleCharacterExtraction} disabled={charRunning || !prompt.trim()}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '8px 0', borderRadius: 8, cursor: charRunning ? 'wait' : 'pointer', border: 'none',
                    background: charRunning ? 'rgba(129,140,248,0.15)' : 'rgba(129,140,248,0.10)',
                    color: charRunning ? '#a5b4fc' : '#818cf8', fontSize: 12, fontWeight: 700,
                    transition: 'all 0.15s ease', opacity: charRunning ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (!charRunning) { e.currentTarget.style.background = 'rgba(129,140,248,0.22)'; } }}
                  onMouseLeave={e => { if (!charRunning) { e.currentTarget.style.background = 'rgba(129,140,248,0.10)'; } }}
                >{charRunning ? '⏳' : '🎭'} 演员</button>
                <button onClick={handleGenerate} disabled={genRunning || !prompt.trim()}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '8px 0', borderRadius: 8, cursor: genRunning ? 'wait' : 'pointer', border: 'none',
                    background: genRunning ? 'rgba(94,234,212,0.15)' : 'rgba(94,234,212,0.10)',
                    color: genRunning ? '#99f6e4' : '#5eead4', fontSize: 12, fontWeight: 700,
                    transition: 'all 0.15s ease', opacity: genRunning ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (!genRunning) { e.currentTarget.style.background = 'rgba(94,234,212,0.22)'; } }}
                  onMouseLeave={e => { if (!genRunning) { e.currentTarget.style.background = 'rgba(94,234,212,0.10)'; } }}
                >{genRunning ? '⏳' : '🎬'} 分镜</button>
              </div>
              {/* Second row: World Building */}
              <div style={{ display: 'flex', gap: 8, padding: '0px 14px 12px' }}>
                <button onClick={handleSceneArchitect} disabled={spaceRunning || !prompt.trim()}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    padding: '7px 0', borderRadius: 8, cursor: spaceRunning ? 'wait' : 'pointer', border: 'none',
                    background: spaceRunning ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.10)',
                    color: spaceRunning ? '#6ee7b7' : '#10b981', fontSize: 11, fontWeight: 700,
                    transition: 'all 0.15s ease', opacity: spaceRunning ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (!spaceRunning) { e.currentTarget.style.background = 'rgba(16,185,129,0.22)'; } }}
                  onMouseLeave={e => { if (!spaceRunning) { e.currentTarget.style.background = 'rgba(16,185,129,0.10)'; } }}
                >{spaceRunning ? '⏳' : '🏗️'} 空间</button>
                <button onClick={handlePropDesigner} disabled={propRunning || !prompt.trim()}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    padding: '7px 0', borderRadius: 8, cursor: propRunning ? 'wait' : 'pointer', border: 'none',
                    background: propRunning ? 'rgba(236,72,153,0.15)' : 'rgba(236,72,153,0.10)',
                    color: propRunning ? '#f9a8d4' : '#ec4899', fontSize: 11, fontWeight: 700,
                    transition: 'all 0.15s ease', opacity: propRunning ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (!propRunning) { e.currentTarget.style.background = 'rgba(236,72,153,0.22)'; } }}
                  onMouseLeave={e => { if (!propRunning) { e.currentTarget.style.background = 'rgba(236,72,153,0.10)'; } }}
                >{propRunning ? '⏳' : '🪄'} 道具</button>
                <button onClick={handleSoundComposer} disabled={soundRunning || !prompt.trim()}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    padding: '7px 0', borderRadius: 8, cursor: soundRunning ? 'wait' : 'pointer', border: 'none',
                    background: soundRunning ? 'rgba(250,204,21,0.15)' : 'rgba(250,204,21,0.10)',
                    color: soundRunning ? '#fde68a' : '#facc15', fontSize: 11, fontWeight: 700,
                    transition: 'all 0.15s ease', opacity: soundRunning ? 0.7 : 1,
                  }}
                  onMouseEnter={e => { if (!soundRunning) { e.currentTarget.style.background = 'rgba(250,204,21,0.22)'; } }}
                  onMouseLeave={e => { if (!soundRunning) { e.currentTarget.style.background = 'rgba(250,204,21,0.10)'; } }}
                >{soundRunning ? '⏳' : '🎵'} 音乐</button>
              </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
