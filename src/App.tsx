/* === App — Canvas Workspace === */
/* ReactFlow-powered infinite canvas with node workflow */
/* Three-layer: LoginPage → ProjectSelector → CanvasWorkspace */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  MiniMap,
  Background,
  ReactFlowProvider,
  useReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useCanvasStore } from './store/useCanvasStore';
import type { CanvasNode, NodeType } from './types/graph';
import { loadFromDB, loadFromServer, startAutoSave, saveNow } from './store/persistence';
import { generateWithAgent, analyzeText, mapModelNameToProviderId, hasExtractionIntent, visualExtract, pollVideoTask } from './api/gateway';
import { CreateMenu, ConnectCreateMenu, DoubleClickMenu } from './components/CreateMenu';
import { SlashPanel } from './components/SlashPanel';
import { LeftToolbar } from './components/LeftToolbar';
import type { ToolMode } from './components/LeftToolbar';
import { ProjectSelector } from './components/ProjectSelector';
import { LoginPage } from './components/LoginPage';
import { CreditPanel } from './components/CreditPanel';
import { useAuthStore } from './store/useAuthStore';
import { AgentPanel } from './components/AgentPanel';
import { AgentToggleButton } from './components/AgentToggleButton';
import { InpaintTool, RelightTool, MultiAngleTool, ExpandTool, ExtractTool } from './components/ImageTools';
import { FullscreenImage } from './components/FullscreenImage';
import { ZoomSlider } from './components/ZoomSlider';
import { ShotNode } from './components/nodes/ShotNode';
import { ImageGenerateNode } from './components/nodes/ImageGenerateNode';
import { VideoGenerateNode } from './components/nodes/VideoGenerateNode';
import { AudioGenerateNode } from './components/nodes/AudioGenerateNode';
import { Scene3DNode } from './components/nodes/Scene3DNode';
import { Tripo3DNode } from './components/nodes/Tripo3DNode';
import { ScissorEdge } from './components/edges/ScissorEdge';

// ─── Node type registry (memoize to survive HMR) ──
import { useMemo as _useMemo } from 'react';
const useNodeTypes = () => _useMemo<NodeTypes>(() => ({
  shot: ShotNode,
  'image.generate': ImageGenerateNode,
  'image.editor': ImageGenerateNode,
  'video.generate': VideoGenerateNode,
  'audio.generate': AudioGenerateNode,
  'scene.3d': Scene3DNode,
  'world.3d': Scene3DNode,
  'tripo.3d': Tripo3DNode,
} as unknown as NodeTypes), []);
const useEdgeTypes = () => _useMemo(() => ({ default: ScissorEdge }), []);

// ── Handle mapping per node type (auto-fix wrong handles) ──
// Each node type can have multiple valid input/output handle IDs.
const NODE_HANDLES: Record<string, { out: string[]; in: string[] }> = {
  'image.generate': { out: ['image-out'], in: ['image-in'] },
  'image.editor': { out: ['image-out'], in: ['image-in'] },
  'video.generate': { out: ['video-out'], in: ['video-in'] },
  'audio.generate': { out: ['audio-out'], in: ['audio-in'] },
  'shot': { out: ['shot-out'], in: ['refs-in'] },
  'scene.3d': { out: ['image-out'], in: ['image-in', 'model-in'] },
  'world.3d': { out: ['image-out'], in: ['image-in', 'model-in'] },
  'tripo.3d': { out: ['model-out'], in: ['tripo-in'] },
};
function fixEdgeHandles(edge: { id: string; from: { nodeId: string; portId: string }; to: { nodeId: string; portId: string } }, nodes: Map<string, string>) {
  const st = nodes.get(edge.from.nodeId);
  const tt = nodes.get(edge.to.nodeId);
  const fromH = st ? NODE_HANDLES[st] : null;
  const toH = tt ? NODE_HANDLES[tt] : null;
  if (fromH && !fromH.out.includes(edge.from.portId)) edge.from.portId = fromH.out[0];
  if (toH && !toH.in.includes(edge.to.portId)) edge.to.portId = toH.in[0];
  return edge;
}

// ─── Default meta ─────────────────────────────────
const defaultShotMeta = {
  intent_cn: '', framing: '', movement: '', lens: '',
  angle: '', key: '', mood: '', color: '',
};

const defaultGenMeta = {
  prompt: '', negativePrompt: '', model: 'GPT Image2',
  aspect: '16:9', resolution: '2K', quality: 'high',
  resultAssetIds: [],
};

interface MenuState {
  x: number; y: number;
  flowX: number; flowY: number;
}

const ASPECTS = [
  { label: '1:1', value: 1 },
  { label: '2:3', value: 2/3 },
  { label: '3:2', value: 3/2 },
  { label: '3:4', value: 3/4 },
  { label: '4:3', value: 4/3 },
  { label: '4:5', value: 4/5 },
  { label: '5:4', value: 5/4 },
  { label: '9:16', value: 9/16 },
  { label: '16:9', value: 16/9 },
  { label: '9:21', value: 9/21 },
  { label: '21:9', value: 21/9 },
];

function closestAspect(ratio: number): string {
  let best = ASPECTS[0];
  let bestDiff = Math.abs(ratio - best.value);
  for (const a of ASPECTS) {
    const diff = Math.abs(ratio - a.value);
    if (diff < bestDiff) { bestDiff = diff; best = a; }
  }
  return best.label;
}

// ─── CanvasWorkspace (only rendered when project selected) ──
function getNodeProviderId(store: ReturnType<typeof useCanvasStore.getState>, nodeId: string | null): string {
  if (!nodeId) return 'gpt-image2';
  const node = store.nodes.get(nodeId);
  const model = ((node?.meta?.gen as any)?.model) || 'GPT Image2';
  return mapModelNameToProviderId(model);
}

function UserBadge({ onLogout }: { onLogout: () => void }) {
  const user = useAuthStore(s => s.user);
  const [showPanel, setShowPanel] = useState(false);
  if (!user) return null;
  return (
    <>
      <div style={{
        position: 'fixed', top: '18px', right: '18px', zIndex: 500,
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '6px 6px 6px 16px', borderRadius: '20px',
        background: 'rgba(22,26,34,0.85)', backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span
          onClick={() => setShowPanel(true)}
          style={{ color: '#5EEAD4', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}
          title="积分中心"
        >{user.credits}</span>
        <button onClick={onLogout} title="登出"
          style={{
            width: '26px', height: '26px', borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.04)',
            color: 'var(--tap-text-4)', cursor: 'pointer',
            fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,80,80,0.2)'; e.currentTarget.style.color = '#ff6b6b'; e.currentTarget.style.borderColor = 'rgba(255,80,80,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--tap-text-4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; }}
        >⏻</button>
      </div>
      {showPanel && <CreditPanel onClose={() => setShowPanel(false)} />}
    </>
  );
}

function CanvasWorkspace({ onGoHome, onLogout }: { onGoHome: () => void; onLogout: () => void }) {
  // Demo expiration — only in production builds (Vite define injects __BUILD_TIME__)
  // @ts-ignore
  const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : 0;
  const DEMO_HOURS = 1;
  const expiryTime = buildTime > 0 ? buildTime + DEMO_HOURS * 3600000 : 0;
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (expiryTime <= 0) return;
    const check = () => {
      if (Date.now() >= expiryTime) setIsExpired(true);
      else setTimeout(check, 1000);
    };
    check();
  }, [expiryTime]);

  const nodeTypes = useNodeTypes();
  const edgeTypes = useEdgeTypes();
  const addNode = useCanvasStore(s => s.addNode);
  const removeNode = useCanvasStore(s => s.removeNode);
  const addEdge = useCanvasStore(s => s.addEdge);
  const nodesMap = useCanvasStore(s => s.nodes);
  const edgeCount = useCanvasStore(s => s.edges.size);
  const syncTick = useCanvasStore(s => s.syncTick);
  const toolMode = useCanvasStore(s => s.toolMode);
  const setToolMode = useCanvasStore(s => s.setToolMode);
  const pendingConnection = useCanvasStore(s => s.pendingConnection);

  const { screenToFlowPosition } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  // Custom selection box (ReactFlow's built-in one is buggy)
  const [customBox, setCustomBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // ─── Clipboard (copy/paste) ──
  const clipboardRef = useRef<{ nodes: Array<{ type: string; title: string; pos: { x: number; y: number }; meta: Record<string, unknown> }>; edges: Array<{ fromIdx: number; toIdx: number; fromPort: string; toPort: string }>; minX: number; minY: number } | null>(null);
  const pasteOffsetRef = useRef(0);

  const handleCopy = useCallback(() => {
    const store = useCanvasStore.getState();
    const selectedIds = store.selectedNodeIds;
    if (selectedIds.length === 0) return;
    const nodeList = selectedIds.map(id => store.nodes.get(id)).filter(Boolean) as CanvasNode[];
    if (nodeList.length === 0) return;
    // Find min position for offset calculation
    let minX = Infinity, minY = Infinity;
    const nodeData = nodeList.map(n => {
      if (n.pos.x < minX) minX = n.pos.x;
      if (n.pos.y < minY) minY = n.pos.y;
      return { type: n.type, title: n.title, pos: { ...n.pos }, meta: JSON.parse(JSON.stringify(n.meta)) };
    });
    // Copy edges between selected nodes
    const edgeList: Array<{ fromIdx: number; toIdx: number; fromPort: string; toPort: string }> = [];
    const edgeEntries = Array.from(store.edges.values());
    edgeEntries.forEach(e => {
      const fromIdx = selectedIds.indexOf(e.from.nodeId);
      const toIdx = selectedIds.indexOf(e.to.nodeId);
      if (fromIdx >= 0 && toIdx >= 0) {
        edgeList.push({ fromIdx, toIdx, fromPort: e.from.portId, toPort: e.to.portId });
      }
    });
    clipboardRef.current = { nodes: nodeData, edges: edgeList, minX, minY };
    pasteOffsetRef.current = 0;
    console.log('[copy] Copied', nodeList.length, 'nodes,', edgeList.length, 'edges');
  }, []);

  const handlePaste = useCallback(() => {
    const cb = clipboardRef.current;
    if (!cb || cb.nodes.length === 0) return;
    const store = useCanvasStore.getState();
    const offset = 60 + pasteOffsetRef.current * 40;
    pasteOffsetRef.current++;
    // Create new nodes
    const newIds: string[] = [];
    const baseX = cb.minX + offset;
    const baseY = cb.minY + offset;
    cb.nodes.forEach(n => {
      const newPos = { x: n.pos.x - cb.minX + baseX, y: n.pos.y - cb.minY + baseY };
      const id = addNode(n.type as NodeType, newPos, n.title + ' 复制');
      store.updateNode(id, { meta: n.meta });
      newIds.push(id);
    });
    // Recreate internal edges
    cb.edges.forEach(e => {
      if (e.fromIdx < newIds.length && e.toIdx < newIds.length) {
        addEdge(
          { nodeId: newIds[e.fromIdx], portId: e.fromPort },
          { nodeId: newIds[e.toIdx], portId: e.toPort },
        );
      }
    });
    store.setSelectedNodes(newIds);
    store.triggerSync();
    console.log('[paste] Pasted', newIds.length, 'nodes');
  }, [addNode, addEdge]);

  // ─── Node grouping ──
  const handleGroup = useCallback(() => {
    const store = useCanvasStore.getState();
    const selectedIds = store.selectedNodeIds;
    if (selectedIds.length < 2) return;
    const groupId = 'group-' + Date.now();
    selectedIds.forEach(nid => {
      const node = store.nodes.get(nid);
      if (node) {
        store.updateNode(nid, { meta: { ...node.meta, groupId } });
      }
    });
    store.triggerSync();
    console.log('[group] Grouped', selectedIds.length, 'nodes as', groupId);
  }, []);
  const boxRef = useRef({ sx: 0, sy: 0, on: false });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement;
      if (t.closest('.react-flow__node') || t.closest('.react-flow__handle')
        || t.closest('button') || t.closest('textarea') || t.closest('input')
        || t.closest('.react-flow__minimap')) return;
      boxRef.current.sx = e.clientX; boxRef.current.sy = e.clientY; boxRef.current.on = true;
      setCustomBox({ x: e.clientX, y: e.clientY, w: 0, h: 0 });
    };
    const onMove = (e: MouseEvent) => {
      if (!boxRef.current.on) return;
      const sx = boxRef.current.sx, sy = boxRef.current.sy;
      setCustomBox({ x: Math.min(sx, e.clientX), y: Math.min(sy, e.clientY), w: Math.abs(e.clientX - sx), h: Math.abs(e.clientY - sy) });
    };
    const onUp = () => {
      boxRef.current.on = false;
      setCustomBox(null);
    };
    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      el.removeEventListener('mousedown', onDown);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const [menu, setMenu] = useState<MenuState | null>(null);
  const [dblMenu, setDblMenu] = useState<MenuState | null>(null);
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [hasAgentSuggestion, setHasAgentSuggestion] = useState(false);
  const [activeImageTool, setActiveImageTool] = useState<string | null>(null);
  const [activeToolNodeId, setActiveToolNodeId] = useState<string | null>(null);
  const [fullscreenImg, setFullscreenImg] = useState<{ url: string; prompt: string; model: string; aspect: string; quality: string } | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [connectMenu, setConnectMenu] = useState<{ x: number; y: number; flowX: number; flowY: number; sourceNodeId: string; sourcePortId: string } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectTargetId, setConnectTargetId] = useState<string | null>(null);
  const [cropNodeId, setCropNodeId] = useState<string | null>(null);


  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // ─── Initialize ─────────────────────────────────
  useEffect(() => {
    // Only relevant for brand-new canvases: prevents loadFromServer fallback
    // from resurrecting old project data (server stores one global canvasState)
    // NOTE: flag NOT removed here — React StrictMode double-invokes effects,
    // so removing it on first run would let the second run hit the fallback.
    const isNewCanvas = localStorage.getItem('tapnow-new-canvas') === '1';

    const existing = Array.from(nodesMap.values());
    if (existing.length > 0) return;

    loadFromDB().then(restored => {
      if (!restored) {
        if (isNewCanvas) {
          console.log('[persist] Fresh canvas — new project, skipping server fallback');
          return;
        }
        // IndexedDB empty/corrupted — try server fallback
        loadFromServer().then(serverRestored => {
          if (!serverRestored) {
            // Truly fresh canvas — user starts from scratch
            console.log('[persist] Fresh canvas — no local or server data');
          }
        });
      }
    });

    const cleanup = startAutoSave();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount — NOT when nodes change

  // ─── Sync store → ReactFlow ──
  const prevNodeIdsRef = useRef('');
  const prevEdgeIdsRef = useRef('');
  const syncTickRef = useRef(0);

  useEffect(() => {
    const nodeList = Array.from(useCanvasStore.getState().nodes.values());
    const edgeList = Array.from(useCanvasStore.getState().edges.values());

    const currentTick = syncTick;
    const nodeStructureChanged = nodeList.map(n => n.id).sort().join(',') !== prevNodeIdsRef.current;
    const edgeStructureChanged = edgeList.map(e => e.id).sort().join(',') !== prevEdgeIdsRef.current;
    const forceSync = currentTick !== syncTickRef.current;

    if (!nodeStructureChanged && !edgeStructureChanged && !forceSync) return;

    prevNodeIdsRef.current = nodeList.map(n => n.id).sort().join(',');
    prevEdgeIdsRef.current = edgeList.map(e => e.id).sort().join(',');
    syncTickRef.current = currentTick;
    // Pre-compute refUrls map (O(N+E) instead of O(N*E))
    const refUrlsMap = new Map<string, string[]>();
    nodeList.forEach(n => refUrlsMap.set(n.id, []));
    edgeList.forEach(e => {
      const src = nodeList.find(sn => sn.id === e.from.nodeId);
      const u = (src?.meta?.gen as any)?.imageUrl;
      if (u) {
        const arr = refUrlsMap.get(e.to.nodeId);
        if (arr && !arr.includes(u)) arr.push(u);
      }
    });

    if (nodeStructureChanged || edgeStructureChanged) {
    setRfNodes(prevNodes => {
      const prevPos = new Map(prevNodes.map(n => [n.id, n.position]));
      const storeSel = new Set(useCanvasStore.getState().selectedNodeIds);
      const pendingConn = useCanvasStore.getState().pendingConnection;
      return nodeList.map(n => ({
        id: n.id, type: n.type,
        position: prevPos.get(n.id) || n.pos,
        selected: storeSel.has(n.id),
        data: {
          ...n.meta,
          title: n.title,
          shot: n.meta?.shot || defaultShotMeta,
          gen: n.meta?.gen || defaultGenMeta,
          imageUrl: (n.meta?.gen as Record<string, unknown>)?.imageUrl as string || undefined,
          videoUrl: (n.meta?.gen as Record<string, unknown>)?.videoUrl as string || undefined,
          status: n.status,
          isConnecting,
          isPickMode: pendingConn !== null,
          isPickTarget: n.id === pendingConn,
          hasConnections: edgeList.some(e => e.from.nodeId === n.id || e.to.nodeId === n.id),
          refUrls: refUrlsMap.get(n.id)?.slice(0, 20) || [],
          onChange: (patch: Record<string, unknown>) => {
            const current = useCanvasStore.getState().nodes.get(n.id);
            if (current) {
              const gen = (current.meta?.gen || {}) as Record<string, unknown>;
              useCanvasStore.getState().updateNode(n.id, { meta: { ...current.meta, gen: { ...gen, ...patch } } });
            }
          },
          onOpenTool: (toolName: string) => {
            setActiveToolNodeId(n.id);
            setActiveImageTool(toolName);
            setToolMode(toolName as any);
          },
          onFullscreen: (url: string, prompt: string, model: string, aspect: string, quality: string) => {
            setFullscreenImg({ url, prompt, model, aspect, quality });
          },
          onGenerate: async () => {
            const store = useCanvasStore.getState();
            const node = store.nodes.get(n.id);
            const meta = node?.meta?.gen as Record<string, unknown> | undefined;
            if (!meta?.prompt) return;
            store.setNodeStatus(n.id, 'running');

            // Collect reference URLs from edges (same logic as data.refUrls)
            const edgeRefUrls: string[] = [];
            const edgeVideoUrls: string[] = [];
            edgeList.forEach(e => {
              if (e.to.nodeId === n.id) {
                const src = nodeList.find(sn => sn.id === e.from.nodeId);
                const u = (src?.meta?.gen as any)?.imageUrl;
                const v = (src?.meta?.gen as any)?.videoUrl;
                if (u && !edgeRefUrls.includes(u)) edgeRefUrls.push(u);
                if (v && !edgeVideoUrls.includes(v)) edgeVideoUrls.push(v);
              }
            });
            const refUrls = edgeRefUrls.length > 0 ? edgeRefUrls : (meta.referenceUrls as string[] | undefined);
            const videoUrls = edgeVideoUrls.length > 0 ? edgeVideoUrls : (meta.videoUrls as string[] | undefined);
            let refPrompts: string[] | undefined;
            if (refUrls && refUrls.length > 0) {
              refPrompts = [];
              const store2 = useCanvasStore.getState();
              refUrls.forEach(url => {
                store2.nodes.forEach(n2 => {
                  const imgUrl = (n2.meta?.gen as any)?.imageUrl;
                  const prompt = (n2.meta?.gen as any)?.prompt || (n2.meta?.gen as any)?.compiledPrompt || '';
                  if (imgUrl === url && prompt) refPrompts!.push(prompt);
                });
              });
            }

            // ── Route: TEXT node → fast text pipeline, extraction → visual parser, others → full image pipeline ──
            const isTextNode = n.type === 'shot';
            const isAudio = n.type === 'audio.generate';
            const actualModel = (meta.model as string) || (n.type === 'video.generate' ? 'Seedance 2.0' : isAudio ? 'Suno v4' : 'GPT Image2');
            const promptText = (meta.prompt as string) || '';
            const useExtraction = !isTextNode && refUrls?.length && hasExtractionIntent(promptText);
            console.log('[onGenerate] nodeType:', n.type, 'model:', actualModel, 'providerId:', mapModelNameToProviderId(actualModel), 'refUrls:', refUrls?.length, 'refPrompts:', refPrompts?.length, 'extraction:', useExtraction);
            const agentResult = isTextNode
              ? await analyzeText({
                  providerId: 'text',
                  mode: 'text-analysis' as any,
                  rawText: promptText,
                  referenceUrls: refUrls,
                  referencePrompts: refPrompts,
                } as any)
              : useExtraction
                ? await visualExtract({
                    providerId: mapModelNameToProviderId((meta.model as string) || (n.type === 'video.generate' ? 'Seedance 2.0' : 'GPT Image2')),
                    mode: 'image-to-image',
                    rawText: promptText,
                    aspect: meta.aspect as string | undefined,
                    resolution: meta.resolution as string || '2K',
                    referenceImage: meta.imageUrl as string | undefined || (meta.firstFrameUrl as string),
                    referenceUrls: refUrls,
                    referencePrompts: refPrompts,
                    styleImageUrl: meta.styleImageUrl as string | undefined,
                    seed: meta.seed as number | undefined,
                    negativePrompt: meta.negativePrompt as string | undefined,
                    duration: meta.duration as string | undefined,
                    videoUrls: videoUrls as string[] | undefined,
                    extractMode: meta.extractMode as string || 'auto',
                    // Model-specific params
                    genMode: meta.genMode as string | undefined,
                    firstFrameUrl: meta.firstFrameUrl as string | undefined,
                    lastFrameUrl: meta.lastFrameUrl as string | undefined,
                    characterOrientation: meta.characterOrientation as 'image' | 'video' | undefined,
                    keepOriginalSound: meta.keepOriginalSound as boolean | undefined,
                    fixedCamera: meta.fixedCamera as boolean | undefined,
                    generateAudio: meta.generateAudio as boolean | undefined,
                    webSearch: meta.webSearch as boolean | undefined,
                    // Audio (Suno)
                    instrumental: meta.instrumental as boolean | undefined,
                    lyrics: meta.lyrics as string | undefined,
                    // Audio (ElevenLabs)
                    voice: meta.voice as string | undefined,
                    language: meta.language as string | undefined,
                    stability: meta.stability as number | undefined,
                    dialogue: meta.dialogue as { text: string; voice: string }[] | undefined,
                    // Camera kit
                    camera: meta.camera as string | undefined,
                    lens: meta.lens as string | undefined,
                    focalLength: meta.focalLength as string | undefined,
                    aperture: meta.aperture as string | undefined,
                    filmStock: meta.filmStock as string | undefined,
                  } as any)
                : await generateWithAgent({
                  providerId: mapModelNameToProviderId((meta.model as string) || (n.type === 'video.generate' ? 'Seedance 2.0' : 'GPT Image2')),
                  mode: (refUrls?.length || meta.firstFrameUrl) ? 'image-to-image' : 'text-to-image',
                  rawText: promptText,
                  aspect: meta.aspect as string | undefined,
                  resolution: meta.resolution as string || '2K',
                  referenceImage: meta.imageUrl as string | undefined || (meta.firstFrameUrl as string),
                  referenceUrls: refUrls,
                  referencePrompts: refPrompts,
                  styleImageUrl: meta.styleImageUrl as string | undefined,
                  seed: meta.seed as number | undefined,
                  negativePrompt: meta.negativePrompt as string | undefined,
                  duration: meta.duration as string | undefined,
                  videoUrls: videoUrls as string[] | undefined,
                  // Model-specific params
                  genMode: meta.genMode as string | undefined,
                  firstFrameUrl: meta.firstFrameUrl as string | undefined,
                  lastFrameUrl: meta.lastFrameUrl as string | undefined,
                  characterOrientation: meta.characterOrientation as 'image' | 'video' | undefined,
                  keepOriginalSound: meta.keepOriginalSound as boolean | undefined,
                  fixedCamera: meta.fixedCamera as boolean | undefined,
                  generateAudio: meta.generateAudio as boolean | undefined,
                  webSearch: meta.webSearch as boolean | undefined,
                  // Audio (Suno)
                  instrumental: meta.instrumental as boolean | undefined,
                  lyrics: meta.lyrics as string | undefined,
                  // Audio (ElevenLabs)
                  voice: meta.voice as string | undefined,
                  language: meta.language as string | undefined,
                  stability: meta.stability as number | undefined,
                  dialogue: meta.dialogue as { text: string; voice: string }[] | undefined,
                  // Camera kit
                  camera: meta.camera as string | undefined,
                  lens: meta.lens as string | undefined,
                  focalLength: meta.focalLength as string | undefined,
                  aperture: meta.aperture as string | undefined,
                  filmStock: meta.filmStock as string | undefined,
                } as any);

            const result = agentResult.result;
            if (result.needsPoll && result.taskId) {
              // Video generation — server submitted, client polls
              // compiledPrompt will be updated from poll response when compilation finishes
              const taskId = result.taskId;
              const genPatch: Record<string, unknown> = { compiledPrompt: '(compiling…)', compiledPromptCn: agentResult.compiled?.cn || '' };
              console.log('[poll] Starting client poll for ' + taskId);
              const pollInterval = setInterval(async () => {
                try {
                  const pollResult = await pollVideoTask(taskId);
                  // Update compiledPrompt as soon as it's available (after background compilation)
                  if (pollResult.compiledPrompt) {
                    genPatch.compiledPrompt = pollResult.compiledPrompt;
                  }
                  if (pollResult.status === 'succeeded' && pollResult.assetUrls?.length) {
                    clearInterval(pollInterval);
                    const isVideo2 = n.type === 'video.generate';
                    const urlField2 = isVideo2 ? 'videoUrl' : 'imageUrl';
                    Object.assign(genPatch, { [urlField2]: pollResult.assetUrls[0], resultAssetIds: pollResult.assetUrls });
                    store.updateNode(n.id, { meta: { ...node!.meta, gen: { ...meta, ...genPatch } } });
                    store.setNodeStatus(n.id, 'succeeded');
                    store.triggerSync();
                    console.log('[poll] ' + taskId + ' done: ' + pollResult.assetUrls.length + ' assets, prompt=' + (genPatch.compiledPrompt as string).slice(0, 80));
                  } else if (pollResult.status === 'failed') {
                    clearInterval(pollInterval);
                    store.setNodeStatus(n.id, 'failed');
                    console.log('[poll] ' + taskId + ' failed: ' + pollResult.error);
                  }
                  // else: still processing, keep polling
                } catch {
                  // network error, keep polling
                }
              }, 30000); // every 30 seconds
              // Cleanup after 30 minutes (video generation can take 15-25 min total)
              setTimeout(() => { clearInterval(pollInterval); if (useCanvasStore.getState().nodes.get(n.id)?.status === 'running') store.setNodeStatus(n.id, 'failed'); }, 30 * 60 * 1000);
            } else if (result.success) {
              store.setNodeStatus(n.id, 'succeeded');
              const compiledEn = agentResult.compiled?.en || '';
              const compiledCn = agentResult.compiled?.cn || '';
              const genPatch: Record<string, unknown> = { compiledPrompt: compiledEn, compiledPromptCn: compiledCn };
              if (result.assetUrls.length > 0) {
                const isVideo = n.type === 'video.generate';
                const isAudio = n.type === 'audio.generate';
                const urlField = isVideo ? 'videoUrl' : isAudio ? 'audioUrl' : 'imageUrl';
                Object.assign(genPatch, { [urlField]: result.assetUrls[0], resultAssetIds: result.assetUrls });
              }
              store.updateNode(n.id, {
                meta: { ...node!.meta, gen: { ...meta, ...genPatch } },
              });
              store.triggerSync();
            } else {
              store.setNodeStatus(n.id, 'failed');
            }
          },
          // ── Crop callbacks ──
          isCropping: cropNodeId === n.id,
          onCropStart: () => {
            console.log('[App] onCropStart called for node:', n.id);
            setCropNodeId(n.id);
            setToolMode('crop');
          },
          onCropApply: (croppedDataUrl: string, cropW: number, cropH: number) => {
            console.log('[App] onCropApply called, dataUrl length:', croppedDataUrl?.length, 'size:', cropW, 'x', cropH);
            const store2 = useCanvasStore.getState();
            const currentNode = store2.nodes.get(n.id);
            const currentGen = (currentNode?.meta?.gen || {}) as Record<string, unknown>;
            const newTitle = (n.title || 'IMAGE') + ' 裁切';
            const newX = (currentNode?.pos?.x || 0) + (currentNode?.size?.w || 380) + 60;
            const newY = (currentNode?.pos?.y || 0);
            // Calculate aspect ratio from actual cropped dimensions
            const cropRatio = cropW / cropH;
            const cropAspect = closestAspect(cropRatio);
            console.log('[App] crop aspect:', cropAspect, 'from', cropW, 'x', cropH, 'ratio:', cropRatio);
            const newId = addNode('image.generate', { x: newX, y: newY }, newTitle);
            useCanvasStore.getState().updateNode(newId, {
              meta: {
                gen: {
                  prompt: currentGen.prompt || '',
                  negativePrompt: currentGen.negativePrompt || '',
                  model: currentGen.model || 'GPT Image2',
                  aspect: cropAspect,
                  resolution: currentGen.resolution || '2K',
                  quality: currentGen.quality || 'high',
                  imageUrl: croppedDataUrl,
                  resultAssetIds: [],
                },
              },
            });
            addEdge(
              { nodeId: n.id, portId: 'image-out' },
              { nodeId: newId, portId: 'image-in' },
              'asset.image' as any,
            );
            useCanvasStore.getState().triggerSync();
            useCanvasStore.getState().setSelectedNodes([newId]);
            setCropNodeId(null);
            setToolMode(null);
          },
          onCropCancel: () => {
            setCropNodeId(null);
            setToolMode(null);
          },
        },
      }));
    });

    const nodeTypeMap = new Map(nodeList.map(n => [n.id, n.type]));
    setRfEdges(_prevEdges => {
      return edgeList.map(e => {
        const fixed = fixEdgeHandles(e, nodeTypeMap);
        return {
        id: fixed.id, source: fixed.from.nodeId, target: fixed.to.nodeId,
        sourceHandle: fixed.from.portId, targetHandle: fixed.to.portId,
        type: 'default',
        animated: false,
        style: { stroke: 'rgba(180,180,185,0.4)', strokeWidth: e.style?.width ?? 1.5 },
      }}).filter(e =>
        nodeList.some(n => n.id === e.source) && nodeList.some(n => n.id === e.target)
      );
    });
    } else {
    // ── Light update: syncTick-only, preserve callback references ──
    // Only update mutable data fields; onChange/onGenerate/onFullscreen/onOpenTool
    // and crop callbacks stay stable, preventing React Flow from re-rendering every node.
    setRfNodes(prevNodes => prevNodes.map(rf => {
      const sn = nodeList.find(n => n.id === rf.id);
      if (!sn) return rf;
      return {
        ...rf,
        data: {
          ...rf.data,
          title: sn.title,
          status: sn.status,
          gen: sn.meta?.gen || defaultGenMeta,
          shot: sn.meta?.shot || defaultShotMeta,
          imageUrl: (sn.meta?.gen as Record<string, unknown>)?.imageUrl as string || undefined,
          videoUrl: (sn.meta?.gen as Record<string, unknown>)?.videoUrl as string || undefined,
          hasConnections: edgeList.some(e => e.from.nodeId === sn.id || e.to.nodeId === sn.id),
          refUrls: refUrlsMap.get(sn.id)?.slice(0, 20) || [],
          isConnecting,
          isPickMode: useCanvasStore.getState().pendingConnection !== null,
          isPickTarget: sn.id === useCanvasStore.getState().pendingConnection,
          isCropping: cropNodeId === sn.id,
        },
        selected: useCanvasStore.getState().selectedNodeIds.includes(rf.id),
      };
    }));
    }
  }, [setRfNodes, setRfEdges, nodesMap, edgeCount, syncTick]);

  // ─── Multi-select state ───
  const selectedCount = useCanvasStore(s => s.selectedNodeIds.length);
  const multiSelect = selectedCount > 1;

  useEffect(() => {
    setRfNodes(prev => prev.map(n => ({
      ...n,
      data: { ...n.data, isConnecting, isConnectTarget: isConnecting && n.id === connectTargetId, multiSelect, isPickMode: pendingConnection !== null, isPickTarget: n.id === pendingConnection }
    })));
  }, [isConnecting, connectTargetId, multiSelect, pendingConnection, setRfNodes]);


  // ─── Sync crop state to ReactFlow nodes ──
  useEffect(() => {
    console.log('[App] crop sync effect: cropNodeId =', cropNodeId);
    setRfNodes(prev => prev.map(n => ({
      ...n,
      data: { ...n.data, isCropping: n.id === cropNodeId },
    })));
  }, [cropNodeId, setRfNodes]);

  // ─── Agent suggestion simulation ────────────────
  useEffect(() => {
    const timer = setTimeout(() => setHasAgentSuggestion(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  // ─── Create menu handlers ───────────────────────
  const openMenu = useCallback((clientX: number, clientY: number) => {
    const flowPos = screenToFlowPosition({ x: clientX, y: clientY });
    setMenu({ x: clientX, y: clientY, flowX: flowPos.x, flowY: flowPos.y });
  }, [screenToFlowPosition]);

  const closeMenu = useCallback(() => setMenu(null), []);

  const handleMenuSelect = useCallback((nodeType: string) => {
    if (!menu) return;
    addNode(nodeType as 'shot' | 'image.generate' | 'image.editor' | 'video.generate' | 'audio.generate' | 'world.3d' | 'scene.3d' | 'tripo.3d', { x: menu.flowX, y: menu.flowY });
    setMenu(null);
  }, [menu, addNode]);

  // ─── Canvas events ──────────────────────────────
  const handleCanvasContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    openMenu(event.clientX, event.clientY);
  }, [openMenu]);

  const handleCanvasDoubleClick = useCallback((event: React.MouseEvent) => {
    const flowPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    setDblMenu({ x: event.clientX, y: event.clientY, flowX: flowPos.x, flowY: flowPos.y });
  }, [screenToFlowPosition]);

  const onConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target) return;
    addEdge(
      { nodeId: connection.source, portId: connection.sourceHandle || 'out' },
      { nodeId: connection.target, portId: connection.targetHandle || 'in' },
      'any'
    );
    useCanvasStore.getState().setSelectedNodes([connection.target]);
    const edgeList = Array.from(useCanvasStore.getState().edges.values());
    const nodeIds = new Set(Array.from(useCanvasStore.getState().nodes.values()).map(n => n.id));
    setRfEdges(edgeList
      .filter(e => nodeIds.has(e.from.nodeId) && nodeIds.has(e.to.nodeId))
      .map(e => ({
        id: e.id, type: 'default',
        source: e.from.nodeId, target: e.to.nodeId,
        sourceHandle: e.from.portId, targetHandle: e.to.portId,
        animated: false,
        style: { stroke: 'rgba(180,180,185,0.4)', strokeWidth: e.style?.width ?? 1.5 },
    })));
  }, [addEdge, setRfEdges]);

  const onNodeDrag = useCallback((_event: React.MouseEvent, node: Node) => {
    const store = useCanvasStore.getState();
    const existing = store.nodes.get(node.id);
    if (!existing) return;
    const groupId = (existing.meta as Record<string, unknown>)?.groupId as string | undefined;
    if (!groupId) return;
    // Move all nodes in the same group
    const dx = node.position.x - existing.pos.x;
    const dy = node.position.y - existing.pos.y;
    store.nodes.forEach(n => {
      const gid = (n.meta as Record<string, unknown>)?.groupId;
      if (gid === groupId && n.id !== node.id) {
        store.updateNode(n.id, { pos: { x: n.pos.x + dx, y: n.pos.y + dy } });
      }
    });
  }, []);

  const onNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    const store = useCanvasStore.getState();
    const existing = store.nodes.get(node.id);
    if (existing && (existing.pos.x !== node.position.x || existing.pos.y !== node.position.y)) {
      store.pushHistory();
    }
    store.updateNode(node.id, { pos: node.position });
  }, []);

  // ─── Node hover during connection → target glow ──
  const onNodeMouseEnter = useCallback((_event: React.MouseEvent, node: Node) => {
    if (isConnecting) setConnectTargetId(node.id);
  }, [isConnecting]);

  const onNodeMouseLeave = useCallback(() => {
    setConnectTargetId(null);
  }, []);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const store = useCanvasStore.getState();
    // Pick-source mode: connect clicked node → pending target
    if (store.pendingConnection) {
      const targetId = store.pendingConnection;
      store.setPendingConnection(null);
      if (node.id !== targetId) {
        const targetNode = store.nodes.get(targetId);
        const toPort = targetNode?.type === 'shot' ? 'refs-in'
          : targetNode?.type === 'tripo.3d' ? 'tripo-in'
          : 'image-in';
        const fromPort = node.type === 'shot' ? 'shot-out'
          : node.type === 'tripo.3d' ? 'model-out'
          : 'image-out';
        addEdge(
          { nodeId: node.id, portId: fromPort },
          { nodeId: targetId, portId: toPort },
          'any'
        );
        // Sync ReactFlow edges immediately
        const edgeList2 = Array.from(useCanvasStore.getState().edges.values());
        const nodeIds2 = new Set(Array.from(store.nodes.values()).map(n => n.id));
        setRfEdges(edgeList2
          .filter(e => nodeIds2.has(e.from.nodeId) && nodeIds2.has(e.to.nodeId))
          .map(e => ({
            id: e.id, type: 'default',
            source: e.from.nodeId, target: e.to.nodeId,
            sourceHandle: e.from.portId, targetHandle: e.to.portId,
            animated: false,
            style: { stroke: 'rgba(180,180,185,0.4)', strokeWidth: e.style?.width ?? 1.5 },
        })));
        store.setSelectedNodes([targetId]);
      }
      return;
    }
    // Normal click: select node
    store.setSelectedNodes([node.id]);
  }, [addEdge, setRfEdges]);

  const onPaneClick = useCallback(() => {
    const store = useCanvasStore.getState();
    store.setSelectedNodes([]);
    store.setPendingConnection(null);
    setCropNodeId(null);
    closeMenu();
  }, [closeMenu]);

  // ─── Tool mode ──────────────────────────────────
  const handleToolSelect = useCallback((tool: ToolMode) => {
    const modalTools: Record<string, string> = { crop: 'crop', inpaint: 'inpaint', relight: 'relight', multiAngle: 'multiAngle', expand: 'expand', extract: 'extract' };
    if (tool === 'select') { setToolMode(null); setActiveImageTool(null); }
    else if (tool in modalTools) { setToolMode(tool as 'crop' | 'inpaint' | 'relight' | 'multiAngle' | 'expand' | 'extract'); setActiveImageTool(tool); }
    else { setToolMode(tool); setActiveImageTool(null); }
  }, [setToolMode]);

  // ─── Keyboard ───────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'v' || e.key === 'V') { handleToolSelect('select'); return; }
      if (e.key === 'c' || e.key === 'C') {
        const store = useCanvasStore.getState();
        const ids = store.selectedNodeIds;
        if (ids.length === 1) {
          const node = store.nodes.get(ids[0]);
          const imgUrl = (node?.meta?.gen as any)?.imageUrl;
          if (imgUrl && (node?.type === 'image.generate' || node?.type === 'image.editor')) {
            e.preventDefault();
            setCropNodeId(ids[0]);
            setToolMode('crop');
            return;
          }
        }
        handleToolSelect('crop'); return;
      }
      if (e.key === 'b' || e.key === 'B') { handleToolSelect('inpaint'); return; }
      if (e.key === 'l' || e.key === 'L') { handleToolSelect('relight'); return; }
      if (e.key === 'e' || e.key === 'E') {
        const store = useCanvasStore.getState();
        const sid = store.selectedNodeIds[0];
        if (sid) { setActiveToolNodeId(sid); handleToolSelect('expand'); }
        return;
      }
      if (e.key === 'x' || e.key === 'X') {
        const store = useCanvasStore.getState();
        const sid = store.selectedNodeIds[0];
        if (sid) { setActiveToolNodeId(sid); handleToolSelect('extract'); }
        return;
      }
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        const vp = useCanvasStore.getState().viewport;
        addNode('shot', { x: (window.innerWidth / 2 - vp.x) / vp.zoom - 140, y: (window.innerHeight / 2 - vp.y) / vp.zoom - 100 }, '新镜头');
      }
      if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        const vp = useCanvasStore.getState().viewport;
        addNode('image.generate', { x: (window.innerWidth / 2 - vp.x) / vp.zoom - 190, y: (window.innerHeight / 2 - vp.y) / vp.zoom - 100 }, '图片生成');
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (document.querySelector('[data-3d-editor]')) return; // 3D editor is open, don't delete canvas nodes
        const ids = useCanvasStore.getState().selectedNodeIds;
        if (ids.length > 0) { ids.forEach(id => removeNode(id)); useCanvasStore.getState().setSelectedNodes([]); }
      }
      if (e.key === 'Escape') { setMenu(null); setActiveImageTool(null); setCropNodeId(null); setToolMode(null); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        useCanvasStore.getState().undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        useCanvasStore.getState().redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) { e.preventDefault(); handleCopy(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); handlePaste(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'g') { e.preventDefault(); handleGroup(); return; }
      if (e.key === '/') { e.preventDefault(); useCanvasStore.getState().toggleCommandPalette(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [addNode, removeNode, handleToolSelect, setToolMode, handleCopy, handlePaste, handleGroup]);

  if (isExpired) {
    return (
      <div style={{ width:'100vw',height:'100vh',background:'var(--tap-bg)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',color:'var(--tap-text-1)',gap:'16px' }}>
        <div style={{ fontSize:'48px' }}>⏰</div>
        <div style={{ fontSize:'var(--tap-fs-h1)',fontWeight:600 }}>Demo 已过期</div>
        <div style={{ fontSize:'var(--tap-fs-body)',color:'var(--tap-text-3)' }}>此演示版本已超过有效期，请联系管理员获取新链接</div>
      </div>
    );
  }

  return (
    <div ref={containerRef}
      style={{ width: '100vw', height: '100vh', background: 'var(--tap-bg)', position: 'relative' }}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (!file) return;
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        if (!isImage && !isVideo) return;
        const reader = new FileReader();
        reader.onload = () => {
          const url = reader.result as string;
          const flowPos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
          if (isVideo) {
            const id = addNode('video.generate', { x: flowPos.x - 190, y: flowPos.y - 110 }, file.name);
            useCanvasStore.getState().updateNode(id, {
              meta: { gen: { prompt: '', model: 'Kling 2.1', duration: '5s', resolution: '1080P', videoUrl: url, resultAssetIds: [] } as any },
            });
          } else {
            // Get image dimensions to match aspect ratio
            const img = new Image();
            img.onload = () => {
              const ratio = img.naturalWidth / img.naturalHeight;
              const aspect = closestAspect(ratio);
              const id = addNode('image.generate', { x: flowPos.x - 190, y: flowPos.y - 110 }, file.name);
              useCanvasStore.getState().updateNode(id, {
                meta: { gen: { prompt: '', model: 'GPT Image2', aspect, resolution: '2K', quality: 'high', imageUrl: url, resultAssetIds: [] } },
              });
            };
            img.src = url;
          }
        };
        reader.readAsDataURL(file);
      }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        proOptions={{ hideAttribution: true }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        edgeTypes={edgeTypes as any}
        defaultEdgeOptions={{ type: 'default' }}
        onConnectStart={() => { setIsConnecting(true); setConnectTargetId(null); }}
        onConnectEnd={(event, connectionState) => {
          setIsConnecting(false);
          setConnectTargetId(null);
          if (!connectionState.isValid && connectionState.fromNode) {
            const target = event instanceof MouseEvent ? event : null;
            if (target) {
              const flowPos = screenToFlowPosition({ x: target.clientX, y: target.clientY });
              setConnectMenu({
                x: target.clientX, y: target.clientY,
                flowX: flowPos.x, flowY: flowPos.y,
                sourceNodeId: connectionState.fromNode.id,
                sourcePortId: connectionState.fromHandle?.id || 'out',
              });
            }
          }
        }}
        isValidConnection={() => true}
        connectionRadius={120}
        nodeTypes={nodeTypes}
        onContextMenu={handleCanvasContextMenu}
        onDoubleClick={handleCanvasDoubleClick}
        onNodeClick={onNodeClick}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={onPaneClick}
        paneClickDistance={0}
        nodeClickDistance={0}
        panOnDrag={[2]}
        snapToGrid={snapEnabled}
        snapGrid={[20, 20]}
        selectionOnDrag
        selectNodesOnDrag
        onSelectionChange={({ nodes: selectedNodes }) => {
          useCanvasStore.getState().setSelectedNodes(selectedNodes.map(n => n.id));
        }}
        zoomOnDoubleClick={false}
        zoomActivationKeyCode="Control"
        panOnScroll={true}
        noWheelClassName="no-wheel"
        zoomOnScroll={false}
        minZoom={0.01}
        maxZoom={5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
        style={{ background: 'var(--tap-bg)' }}
      >
        <Background color="rgba(255,255,255,0.08)" gap={20} size={1.6} />
        <MiniMap
          position="bottom-left"
          pannable={true}
          zoomable={true}
          nodeColor={() => 'rgba(94, 234, 212, 0.30)'}
          maskColor="rgba(13,15,18,0.7)"
          bgColor="rgba(18,21,25,0.92)"
          style={{ marginBottom: 80, marginLeft: 20, width: 260, height: 170, border: '1px solid rgba(255,255,255,0.06)' }}
        />
      </ReactFlow>

      {/* ── Fullscreen Image Overlay (App-level, covers everything) ── */}
      {fullscreenImg && (
        <FullscreenImage
          imageUrl={fullscreenImg.url}
          prompt={fullscreenImg.prompt}
          model={fullscreenImg.model}
          aspect={fullscreenImg.aspect}
          quality={fullscreenImg.quality}
          onClose={() => setFullscreenImg(null)}
        />
      )}

      {/* ── Custom Selection Box ── */}
      {customBox && (
        <div style={{
          position: 'fixed',
          left: customBox.x, top: customBox.y,
          width: customBox.w, height: customBox.h,
          border: '1px dashed rgba(180,180,185,0.5)',
          background: 'transparent',
          zIndex: 9999,
          pointerEvents: 'none',
        }} />
      )}

      {/* ── Zoom Slider (below minimap, same positioning context) ── */}
      <div style={{
        position: 'fixed', bottom: '20px', left: '20px', zIndex: 10,
      }}>
        <ZoomSlider
          zoom={useCanvasStore(s => s.viewport).zoom}
          onZoomChange={(z) => {
            const vp = useCanvasStore.getState().viewport;
            useCanvasStore.getState().setViewport({ x: vp.x, y: vp.y, zoom: z });
          }}
          snapEnabled={snapEnabled}
          onSnapToggle={() => setSnapEnabled(s => !s)}
        />
      </div>

      {/* ── User Badge (top-right) ── */}
      <UserBadge onLogout={onLogout} />

      {/* ── Home Button ── */}
      <button onClick={onGoHome} title="返回项目选择"
        style={{
          position: 'fixed', top: '18px', left: '18px', zIndex: 500,
          width: '32px', height: '32px', borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '16px', color: 'var(--tap-text-3)',
          background: 'rgba(22,26,34,0.85)', border: 'none',
          backdropFilter: 'blur(12px)', cursor: 'pointer',
          transition: `all var(--tap-dur-fast) var(--tap-ease)`,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--tap-text-1)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(22,26,34,0.85)'; e.currentTarget.style.color = 'var(--tap-text-3)'; }}
      >⌂</button>

      {/* ── Pick-source mode banner ── */}
      {pendingConnection && (
        <div style={{
          position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 500,
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '10px 20px',
          background: 'rgba(22,26,34,0.95)', borderRadius: '14px',
          border: '1px solid rgba(180,180,185,0.25)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          animation: 'tap-fade-down var(--tap-dur-fast) var(--tap-ease)',
          pointerEvents: 'auto',
        }}>
          <span style={{ fontSize: '14px' }}>👆</span>
          <span style={{ fontSize: 'var(--tap-fs-body)', color: 'var(--tap-text-1)' }}>在画布中选择一个节点建立连线</span>
          <button
            onClick={() => useCanvasStore.getState().setPendingConnection(null)}
            style={{
              padding: '4px 12px', borderRadius: 'var(--tap-r-sm)',
              background: 'rgba(255,255,255,0.08)', color: 'var(--tap-text-3)',
              fontSize: 'var(--tap-fs-meta)', border: 'none', cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'var(--tap-text-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'var(--tap-text-3)'; }}
          >取消</button>
        </div>
      )}

      {/* ── Left Toolbar ── */}
      <LeftToolbar activeTool={toolMode} onToolSelect={handleToolSelect} />

      {/* ── Create Menu ── */}
      {/* ── Right-click Menu (list) ── */}
      {menu && <CreateMenu x={menu.x} y={menu.y} onSelect={handleMenuSelect} onClose={closeMenu} />}

      {/* ── Double-click Menu (grid) ── */}
      {dblMenu && <DoubleClickMenu x={dblMenu.x} y={dblMenu.y}
        onSelect={(type) => {
          addNode(type as 'shot' | 'image.generate' | 'image.editor' | 'video.generate' | 'audio.generate' | 'world.3d' | 'tripo.3d', { x: dblMenu.flowX, y: dblMenu.flowY });
          setDblMenu(null);
        }}
        onClose={() => setDblMenu(null)} />}

      {/* ── Connect Menu ── */}
      {connectMenu && (
        <ConnectCreateMenu
          x={connectMenu.x} y={connectMenu.y}
          flowX={connectMenu.flowX} flowY={connectMenu.flowY}
          sourceNodeId={connectMenu.sourceNodeId} sourcePortId={connectMenu.sourcePortId}
          onSelect={(nodeType) => {
            const newId = addNode(nodeType as 'shot' | 'image.generate' | 'image.editor' | 'video.generate' | 'audio.generate' | 'world.3d' | 'tripo.3d', { x: connectMenu.flowX - 190, y: connectMenu.flowY - 100 });
            addEdge(
              { nodeId: connectMenu.sourceNodeId, portId: connectMenu.sourcePortId },
              { nodeId: newId, portId: nodeType === 'shot' ? 'refs-in' : 'image-in' }, 'any'
            );
            const edgeList3 = Array.from(useCanvasStore.getState().edges.values());
            const nodeIds3 = new Set(Array.from(useCanvasStore.getState().nodes.values()).map(n => n.id));
            setRfEdges(edgeList3
              .filter(e => nodeIds3.has(e.from.nodeId) && nodeIds3.has(e.to.nodeId))
              .map(e => ({
                id: e.id, type: 'default',
                source: e.from.nodeId, target: e.to.nodeId,
                sourceHandle: e.from.portId, targetHandle: e.to.portId,
                animated: false,
                style: { stroke: 'rgba(180,180,185,0.4)', strokeWidth: e.style?.width ?? 1.5 },
            })));
            setConnectMenu(null);
          }}
          onClose={() => setConnectMenu(null)}
        />
      )}

      {/* ── Slash Command Panel ── */}
      {useCanvasStore(s => s.isCommandPaletteOpen) && (
        <SlashPanel
          onSelect={(type) => {
            const vp = useCanvasStore.getState().viewport;
            addNode(type as 'shot' | 'image.generate' | 'image.editor' | 'video.generate' | 'audio.generate' | 'world.3d' | 'tripo.3d', { x: (window.innerWidth / 2 - vp.x) / vp.zoom - 190, y: (window.innerHeight / 2 - vp.y) / vp.zoom - 100 });
            useCanvasStore.getState().toggleCommandPalette();
          }}
          onCommand={(cmd) => {
            const store = useCanvasStore.getState();
            const selectedIds = store.selectedNodeIds;
            // For tool commands, open the tool with the selected node's image
            if (['crop','inpaint','relight','multiAngle','expand','extract'].includes(cmd)) {
              if (selectedIds.length === 1) {
                const node = store.nodes.get(selectedIds[0]);
                const imgUrl = (node?.meta?.gen as any)?.imageUrl;
                if (imgUrl && (node?.type === 'image.generate' || node?.type === 'image.editor')) {
                  setActiveToolNodeId(selectedIds[0]);
                  setActiveImageTool(cmd);
                  setToolMode(cmd as any);
                }
              }
            } else if (cmd === 'compile') {
              if (selectedIds.length > 0) {
                // Trigger Agent compile for selected shot node
                const node = store.nodes.get(selectedIds[0]);
                if (node) {
                  setIsAgentOpen(true);
                }
              }
            } else if (cmd === 'autoLayout') {
              // Simple grid layout
              const nodeArr = Array.from(store.nodes.values());
              const cols = Math.ceil(Math.sqrt(nodeArr.length));
              nodeArr.forEach((n, i) => {
                store.updateNode(n.id, {
                  pos: { x: 100 + (i % cols) * 420, y: 100 + Math.floor(i / cols) * 280 },
                });
              });
              store.triggerSync();
            } else if (cmd === 'export') {
              // Export selected nodes info as JSON
              const exportData = selectedIds.map(id => {
                const n = store.nodes.get(id);
                return n ? { id: n.id, type: n.type, title: n.title, meta: n.meta } : null;
              }).filter(Boolean);
              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = 'tapnow-export-' + Date.now() + '.json';
              a.click();
            }
            useCanvasStore.getState().toggleCommandPalette();
          }}
          onClose={() => useCanvasStore.getState().toggleCommandPalette()}
        />
      )}

      {/* ── Agent ── */}
      <AgentToggleButton isOpen={isAgentOpen}
        onClick={() => { setIsAgentOpen(!isAgentOpen); if (!isAgentOpen) setHasAgentSuggestion(false); }}
        hasSuggestion={hasAgentSuggestion}
      />
      <AgentPanel isOpen={isAgentOpen} onClose={() => setIsAgentOpen(false)} onAddNode={addNode} />

      {/* ── Image Tool Modals ── */}
      {(() => {
        const store = useCanvasStore.getState();
        const toolNode = activeToolNodeId ? store.nodes.get(activeToolNodeId) : null;
        const gen = (toolNode?.meta?.gen as Record<string,unknown>) || {};
        const imgUrl = (gen.imageUrl as string) || undefined;
        const closeTool = () => { setActiveImageTool(null); setActiveToolNodeId(null); setToolMode(null); };
        const applyTool = async (result: Record<string, unknown>) => {
          const node = activeToolNodeId ? store.nodes.get(activeToolNodeId) : null;
          if (!node) return;
          const gen = (node.meta?.gen || {}) as Record<string, unknown>;
          const nTitle = (node.title || 'IMAGE') + '';
          const nX = (node.pos?.x || 0) + (node.size?.w || 380) + 60;
          const nY = (node.pos?.y || 0);
          const newId = addNode('image.generate', { x: nX, y: nY }, nTitle + ' ' + (result.tool || 'edit'));
          store.updateNode(newId, {
            meta: { gen: { ...gen, prompt: gen.prompt || '', imageUrl: result.imageUrl || imgUrl, resultAssetIds: result.imageUrl ? [result.imageUrl] : [] } },
          });
          if (result.imageUrl) {
            addEdge({ nodeId: activeToolNodeId!, portId: 'image-out' }, { nodeId: newId, portId: 'image-in' }, 'asset.image' as any);
            store.triggerSync();
            store.setSelectedNodes([newId]);
          }
          closeTool();
        };
        return (
          <>
            {activeImageTool === 'inpaint' && <InpaintTool imageUrl={imgUrl} onApply={async (r) => {
              const rObj = r as Record<string,unknown>;
              const prompt = (rObj.prompt as string) || 'inpaint repair restore';
              const fullPrompt = `Inpaint: only modify the masked/selected area. Keep everything outside the mask exactly as is. ${prompt}`;
              try {
                const maskUrl = (rObj.maskUrl as string) || undefined;
                const result = await generateWithAgent({ providerId: getNodeProviderId(store, activeToolNodeId), mode: 'image-to-image', rawText: fullPrompt, referenceImage: imgUrl, maskImage: maskUrl, aspect: gen.aspect as string, resolution: gen.resolution as string } as any);
                applyTool({ ...rObj, tool: 'inpaint', imageUrl: result.result.assetUrls?.[0] });
              } catch(e) { console.error('[inpaint] generate error:', e); closeTool(); }
            }} onClose={closeTool} />}
            {activeImageTool === 'relight' && <RelightTool imageUrl={imgUrl} onApply={async (r) => {
              const rObj = r as Record<string,unknown>;
              const fullPrompt = (rObj.prompt as string) || 'cinematic relighting';
              try {
                const result = await generateWithAgent({ providerId: getNodeProviderId(store, activeToolNodeId), mode: 'image-to-image', rawText: fullPrompt, referenceImage: imgUrl, aspect: gen.aspect as string, resolution: gen.resolution as string } as any);
                applyTool({ ...rObj, tool: 'relight', imageUrl: result.result.assetUrls?.[0] });
              } catch(e) { console.error('[relight] generate error:', e); closeTool(); }
            }} onClose={closeTool} />}
            {activeImageTool === 'multiAngle' && <MultiAngleTool imageUrl={imgUrl} onApply={async (r) => {
              const { angles, count } = r as any;
              const angleList = (angles || ['front']).join(', ');
              const prompt = `generate ${count || 1} views from angles: ${angleList}, maintain subject consistency`;
              try {
                const result = await generateWithAgent({ providerId: getNodeProviderId(store, activeToolNodeId), mode: 'image-to-image', rawText: prompt, referenceImage: imgUrl, aspect: gen.aspect as string, resolution: gen.resolution as string } as any);
                applyTool({ ...(r as Record<string,unknown>), tool: 'multiAngle', imageUrl: result.result.assetUrls?.[0] });
              } catch(e) { console.error('[multiAngle] generate error:', e); closeTool(); }
            }} onClose={closeTool} />}
            {activeImageTool === 'expand' && <ExpandTool imageUrl={imgUrl} onApply={async (r) => {
              const rObj = r as Record<string,unknown>;
              const prompt = (rObj.prompt as string) || '';
              const fullPrompt = `Outpainting: seamlessly extend the image outward beyond its original borders. Fill the new expanded areas with content that naturally continues the scene — matching the exact style, lighting, perspective, colors, and level of detail of the original image. The transition between old and new content must be invisible. ${prompt}`;
              try {
                const result = await generateWithAgent({
                  providerId: getNodeProviderId(store, activeToolNodeId),
                  mode: 'image-to-image',
                  rawText: fullPrompt,
                  referenceImage: (rObj.compositeUrl || imgUrl) as string,
                  maskImage: (rObj.maskUrl) as string,
                  aspect: gen.aspect as string,
                  resolution: gen.resolution as string,
                } as any);
                applyTool({ ...rObj, tool: 'expand', imageUrl: result.result.assetUrls?.[0] });
              } catch(e) { console.error('[expand] generate error:', e); closeTool(); }
            }} onClose={closeTool} />}
            {activeImageTool === 'extract' && <ExtractTool imageUrl={imgUrl} onApply={async (r) => {
              const rObj = r as Record<string,unknown>;
              const extractPrompt = (rObj.extractPrompt as string) || 'Background removal: remove the background on a white background';
              try {
                const result = await generateWithAgent({
                  providerId: getNodeProviderId(store, activeToolNodeId),
                  mode: 'image-to-image',
                  rawText: extractPrompt,
                  referenceImage: imgUrl,
                  aspect: gen.aspect as string,
                  resolution: gen.resolution as string,
                } as any);
                applyTool({ ...rObj, tool: 'extract', imageUrl: result.result.assetUrls?.[0] });
              } catch(e) { console.error('[extract] generate error:', e); closeTool(); }
            }} onClose={closeTool} />}
          </>
        );
      })()}

    </div>
  );
}

// ─── Root: two-layer routing ────────────────────
export default function App() {
  const authUser = useAuthStore(s => s.user);
  const [authReady, setAuthReady] = useState(() => useAuthStore.getState().isLoggedIn());
  const [entering, setEntering] = useState(false);
  const [leaving, setLeaving] = useState(false);

  // 登录：先播动画再进入
  const handleEnter = useCallback(() => {
    setEntering(true);
    setTimeout(() => {
      setAuthReady(true);
      setEntering(false);
    }, 850);
  }, []);

  // 登出：先清 store 再回登录页（立刻响应）
  const handleLogout = useCallback(() => {
    setLeaving(true);
    setTimeout(() => {
      useAuthStore.getState().logout();
      setAuthReady(false);
      setLeaving(false);
    }, 800);
  }, []);

  // 保持 authReady 与 store 同步（处理其他地方调 logout 的情况）
  useEffect(() => {
    if (!useAuthStore.getState().isLoggedIn()) {
      setAuthReady(false);
    }
  }, [authUser]);

  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => {
    return localStorage.getItem('tapnow-current-project') || null;
  });

  const handleCreateNew = useCallback(() => {
    const newId = `project-${Date.now()}`;
    localStorage.setItem('tapnow-current-project', newId);
    // Flag to prevent loadFromServer fallback from resurrecting old project data
    localStorage.setItem('tapnow-new-canvas', '1');
    // Clear store for fresh canvas
    useCanvasStore.setState({ nodes: new Map(), edges: new Map(), selectedNodeIds: [], viewport: { x: 0, y: 0, zoom: 0.5 } });
    setCurrentProjectId(newId);
  }, []);

  const handleSelectProject = useCallback((projectId: string) => {
    localStorage.setItem('tapnow-current-project', projectId);
    localStorage.removeItem('tapnow-new-canvas'); // clean up new-canvas flag
    useCanvasStore.setState({ nodes: new Map(), edges: new Map(), selectedNodeIds: [] });
    setCurrentProjectId(projectId);
  }, []);

  const handleGoHome = useCallback(async () => {
    await saveNow(); // Force save before navigating away
    localStorage.removeItem('tapnow-current-project');
    localStorage.removeItem('tapnow-new-canvas'); // clean up new-canvas flag
    setCurrentProjectId(null);
  }, []);

  // ── Login gate ──
  if (!authReady) {
    return (
      <div style={{
        width: '100vw', height: '100vh',
        overflow: 'hidden',
        animation: entering ? 'direx-login-zoom 0.85s cubic-bezier(0.16,1,0.3,1) forwards' : 'none',
      }}>
        <style>{`
          @keyframes direx-login-zoom {
            0% { transform: scale(1); opacity: 1; filter: brightness(1); }
            30% { transform: scale(1.05); filter: brightness(0.8); }
            60% { transform: scale(1.15); opacity: 0.8; filter: brightness(1.6); }
            100% { transform: scale(1.3); opacity: 0; filter: brightness(2.2); }
          }
        `}</style>
        <LoginPage onEnter={handleEnter} />
      </div>
    );
  }

  // Project selector (no ReactFlow hooks involved)
  if (!currentProjectId) {
    return (
      <>
        <UserBadge onLogout={handleLogout} />
        <ProjectSelector
          onSelectProject={handleSelectProject}
          onCreateNew={handleCreateNew}
        />
      </>
    );
  }

  // Canvas workspace — ReactFlow hooks only run here
  return (
    <ReactFlowProvider>
      <style>{`
        @keyframes direx-enter {
          0% { opacity: 0; filter: brightness(0.15) blur(12px); }
          40% { opacity: 0.6; filter: brightness(1.2) blur(3px); }
          100% { opacity: 1; filter: brightness(1) blur(0); }
        }
        @keyframes direx-leave {
          0% { opacity: 1; filter: brightness(1) blur(0); }
          100% { opacity: 0; filter: brightness(0.1) blur(18px); }
        }
      `}</style>
      <div style={{
        animation: leaving
          ? 'direx-leave 0.7s ease-in forwards'
          : 'direx-enter 0.7s cubic-bezier(0.16,1,0.3,1) forwards',
        width: '100%', height: '100%',
      }}>
        <CanvasWorkspace onGoHome={handleGoHome} onLogout={handleLogout} />
      </div>
    </ReactFlowProvider>
  );
}
