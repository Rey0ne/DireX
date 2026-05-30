/* === App — Canvas Workspace === */
/* ReactFlow-powered infinite canvas with node workflow */
/* Two-layer: ProjectSelector → CanvasWorkspace */

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
import { loadFromDB, startAutoSave, saveNow } from './store/persistence';
import { CreateMenu, ConnectCreateMenu, DoubleClickMenu } from './components/CreateMenu';
import { SlashPanel } from './components/SlashPanel';
import { LeftToolbar } from './components/LeftToolbar';
import type { ToolMode } from './components/LeftToolbar';
import { ProjectSelector } from './components/ProjectSelector';
import { AgentPanel } from './components/AgentPanel';
import { AgentToggleButton } from './components/AgentToggleButton';
import { CropTool, InpaintTool, RelightTool, MultiAngleTool } from './components/ImageTools';
import { FullscreenImage } from './components/FullscreenImage';
import { ZoomSlider } from './components/ZoomSlider';
import { ShotNode } from './components/nodes/ShotNode';
import { ImageGenerateNode } from './components/nodes/ImageGenerateNode';
import { VideoGenerateNode } from './components/nodes/VideoGenerateNode';
import { AudioGenerateNode } from './components/nodes/AudioGenerateNode';

// ─── Node type registry ──────────────────────────
const nodeTypes: NodeTypes = {
  shot: ShotNode,
  'image.generate': ImageGenerateNode,
  'image.editor': ImageGenerateNode,
  'video.generate': VideoGenerateNode,
  'audio.generate': AudioGenerateNode,
} as unknown as NodeTypes;

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
function CanvasWorkspace({ onGoHome }: { onGoHome: () => void }) {
  const addNode = useCanvasStore(s => s.addNode);
  const removeNode = useCanvasStore(s => s.removeNode);
  const addEdge = useCanvasStore(s => s.addEdge);
  const nodesMap = useCanvasStore(s => s.nodes);
  const edgeCount = useCanvasStore(s => s.edges.size);
  const toolMode = useCanvasStore(s => s.toolMode);
  const setToolMode = useCanvasStore(s => s.setToolMode);

  const { screenToFlowPosition } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  // Custom selection box (ReactFlow's built-in one is buggy)
  const [customBox, setCustomBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
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
  const [fullscreenImg, setFullscreenImg] = useState<{ url: string; prompt: string; model: string; aspect: string; quality: string } | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(false);
  const [connectMenu, setConnectMenu] = useState<{ x: number; y: number; flowX: number; flowY: number; sourceNodeId: string; sourcePortId: string } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectTargetId, setConnectTargetId] = useState<string | null>(null);


  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // ─── Initialize ─────────────────────────────────
  useEffect(() => {
    const existing = Array.from(nodesMap.values());
    if (existing.length > 0) return;

    loadFromDB().then(restored => {
      if (!restored) {
        // Fresh canvas — no demo nodes, user starts from scratch
      }
    });

    const cleanup = startAutoSave();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount — NOT when nodes change

  // ─── Sync store → ReactFlow (only on structural changes) ──
  const prevNodeIdsRef = useRef('');
  const prevEdgeIdsRef = useRef('');

  useEffect(() => {
    const nodeList = Array.from(useCanvasStore.getState().nodes.values());
    const edgeList = Array.from(useCanvasStore.getState().edges.values());

    // Skip sync if nothing structural changed (prevents jitter)
    const nodeStructureChanged = nodeList.map(n => n.id).sort().join(',') !== prevNodeIdsRef.current;
    const edgeStructureChanged = edgeList.map(e => e.id).sort().join(',') !== prevEdgeIdsRef.current;

    if (!nodeStructureChanged && !edgeStructureChanged) return;

    prevNodeIdsRef.current = nodeList.map(n => n.id).sort().join(',');
    prevEdgeIdsRef.current = edgeList.map(e => e.id).sort().join(',');

    setRfNodes(prevNodes => {
      const prevPos = new Map(prevNodes.map(n => [n.id, n.position]));
      const prevSel = new Map(prevNodes.map(n => [n.id, n.selected]));
      const storeSel = new Set(useCanvasStore.getState().selectedNodeIds);
      return nodeList.map(n => ({
        id: n.id, type: n.type,
        position: prevPos.get(n.id) || n.pos,
        selected: storeSel.has(n.id),
        data: {
          title: n.title,
          shot: n.meta?.shot || defaultShotMeta,
          gen: n.meta?.gen || defaultGenMeta,
          imageUrl: (n.meta?.gen as Record<string, unknown>)?.imageUrl as string || undefined,
          videoUrl: (n.meta?.gen as Record<string, unknown>)?.videoUrl as string || undefined,
          isConnecting,
          hasConnections: edgeList.some(e => e.from.nodeId === n.id || e.to.nodeId === n.id),
          refUrls: (() => {
            const urls: string[] = [];
            edgeList.forEach(e => {
              if (e.to.nodeId === n.id) {
                const src = nodeList.find(sn => sn.id === e.from.nodeId);
                const u = (src?.meta?.gen as any)?.imageUrl;
                if (u && !urls.includes(u)) urls.push(u);
              }
            });
            return urls.slice(0, 10);
          })(),
          onChange: (patch: Record<string, unknown>) => {
            const current = useCanvasStore.getState().nodes.get(n.id);
            if (current) { useCanvasStore.getState().updateNode(n.id, { meta: { ...current.meta, ...patch } }); }
          },
          onFullscreen: (url: string, prompt: string, model: string, aspect: string, quality: string) => {
            setFullscreenImg({ url, prompt, model, aspect, quality });
          },
          onGenerate: () => {
            useCanvasStore.getState().setNodeStatus(n.id, 'running');
            setTimeout(() => { useCanvasStore.getState().setNodeStatus(n.id, 'succeeded'); }, 2000);
          },
        },
      }));
    });

    setRfEdges(prevEdges => {
      const newIds = new Set(edgeList.map(e => e.id));
      return edgeList.map(e => ({
        id: e.id, source: e.from.nodeId, target: e.to.nodeId,
        sourceHandle: e.from.portId, targetHandle: e.to.portId,
        animated: false,
        style: { stroke: 'rgba(180,180,185,0.4)', strokeWidth: e.style?.width ?? 1.5 },
      })).filter(e =>
        nodeList.some(n => n.id === e.source) && nodeList.some(n => n.id === e.target)
      );
    });
  }, [setRfNodes, setRfEdges, nodesMap, edgeCount]);

  // ─── Multi-select state ───
  const selectedCount = useCanvasStore(s => s.selectedNodeIds.length);
  const multiSelect = selectedCount > 1;

  useEffect(() => {
    setRfNodes(prev => prev.map(n => ({
      ...n,
      data: { ...n.data, isConnecting, isConnectTarget: isConnecting && n.id === connectTargetId, multiSelect }
    })));
  }, [isConnecting, connectTargetId, multiSelect, setRfNodes]);

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
    addNode(nodeType as 'shot' | 'image.generate' | 'image.editor' | 'video.generate' | 'audio.generate' | 'world.3d', { x: menu.flowX, y: menu.flowY });
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
    setRfEdges(edgeList.map(e => ({
      id: e.id,
      source: e.from.nodeId,
      target: e.to.nodeId,
      sourceHandle: e.from.portId,
      targetHandle: e.to.portId,
      animated: false,
      style: { stroke: 'rgba(180,180,185,0.4)', strokeWidth: e.style?.width ?? 1.5 },
    })));
  }, [addEdge, setRfEdges]);

  const onNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    useCanvasStore.getState().updateNode(node.id, { pos: node.position });
  }, []);

  // ─── Node hover during connection → target glow ──
  const onNodeMouseEnter = useCallback((_event: React.MouseEvent, node: Node) => {
    if (isConnecting) setConnectTargetId(node.id);
  }, [isConnecting]);

  const onNodeMouseLeave = useCallback(() => {
    setConnectTargetId(null);
  }, []);

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    useCanvasStore.getState().setSelectedNodes([node.id]);
  }, []);

  const onPaneClick = useCallback(() => {
    useCanvasStore.getState().setSelectedNodes([]);
    closeMenu();
  }, [closeMenu]);

  // ─── Tool mode ──────────────────────────────────
  const handleToolSelect = useCallback((tool: ToolMode) => {
    const modalTools: Record<string, string> = { crop: 'crop', inpaint: 'inpaint', relight: 'relight', multiAngle: 'multiAngle' };
    if (tool === 'select') { setToolMode(null); setActiveImageTool(null); }
    else if (tool in modalTools) { setToolMode(tool as 'crop' | 'inpaint' | 'relight' | 'multiAngle'); setActiveImageTool(tool); }
    else { setToolMode(tool); setActiveImageTool(null); }
  }, [setToolMode]);

  // ─── Keyboard ───────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'v' || e.key === 'V') { handleToolSelect('select'); return; }
      if (e.key === 'c' || e.key === 'C') { handleToolSelect('crop'); return; }
      if (e.key === 'b' || e.key === 'B') { handleToolSelect('inpaint'); return; }
      if (e.key === 'l' || e.key === 'L') { handleToolSelect('relight'); return; }
      if (e.key === 'a' || e.key === 'A') { handleToolSelect('multiAngle'); return; }
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
        const ids = useCanvasStore.getState().selectedNodeIds;
        if (ids.length > 0) { ids.forEach(id => removeNode(id)); useCanvasStore.getState().setSelectedNodes([]); }
      }
      if (e.key === 'Escape') { setMenu(null); setActiveImageTool(null); setToolMode(null); }
      if (e.key === '/') { e.preventDefault(); useCanvasStore.getState().toggleCommandPalette(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [addNode, removeNode, handleToolSelect, setToolMode]);

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
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
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
        zoomOnScroll={false}
        minZoom={0.01}
        maxZoom={5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
        style={{ background: 'var(--tap-bg)' }}
      >
        <Background color="rgba(180,180,190,0.14)" gap={20} size={1.6} />
        <MiniMap
          position="bottom-left"
          pannable={true}
          zoomable={true}
          nodeColor={() => 'rgba(160, 160, 170, 0.5)'}
          maskColor="rgba(0,0,0,0.5)"
          bgColor="rgba(24,26,30,0.9)"
          style={{ marginBottom: 80, marginLeft: 20, width: 260, height: 170, border: '1px solid rgba(255,255,255,0.15)' }}
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

      {/* ── Left Toolbar ── */}
      <LeftToolbar activeTool={toolMode} onToolSelect={handleToolSelect} />

      {/* ── Create Menu ── */}
      {/* ── Right-click Menu (list) ── */}
      {menu && <CreateMenu x={menu.x} y={menu.y} onSelect={handleMenuSelect} onClose={closeMenu} />}

      {/* ── Double-click Menu (grid) ── */}
      {dblMenu && <DoubleClickMenu x={dblMenu.x} y={dblMenu.y}
        onSelect={(type) => {
          addNode(type as 'shot' | 'image.generate' | 'image.editor' | 'video.generate' | 'audio.generate' | 'world.3d', { x: dblMenu.flowX, y: dblMenu.flowY });
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
            const newId = addNode(nodeType as 'shot' | 'image.generate' | 'image.editor' | 'video.generate' | 'audio.generate' | 'world.3d', { x: connectMenu.flowX - 190, y: connectMenu.flowY - 100 });
            addEdge(
              { nodeId: connectMenu.sourceNodeId, portId: connectMenu.sourcePortId },
              { nodeId: newId, portId: nodeType === 'shot' ? 'refs-in' : 'image-in' }, 'any'
            );
            const edgeList = Array.from(useCanvasStore.getState().edges.values());
            setRfEdges(edgeList.map(e => ({
              id: e.id, source: e.from.nodeId, target: e.to.nodeId,
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
            addNode(type as 'shot' | 'image.generate' | 'image.editor' | 'video.generate' | 'audio.generate' | 'world.3d', { x: (window.innerWidth / 2 - vp.x) / vp.zoom - 190, y: (window.innerHeight / 2 - vp.y) / vp.zoom - 100 });
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
      <AgentPanel isOpen={isAgentOpen} onClose={() => setIsAgentOpen(false)} />

      {/* ── Image Tool Modals ── */}
      {activeImageTool === 'crop' && <CropTool imageUrl={undefined} onApply={(r) => { console.log('Crop:', r); setActiveImageTool(null); setToolMode(null); }} onClose={() => { setActiveImageTool(null); setToolMode(null); }} />}
      {activeImageTool === 'inpaint' && <InpaintTool imageUrl={undefined} onApply={(r) => { console.log('Inpaint:', r); setActiveImageTool(null); setToolMode(null); }} onClose={() => { setActiveImageTool(null); setToolMode(null); }} />}
      {activeImageTool === 'relight' && <RelightTool imageUrl={undefined} onApply={(r) => { console.log('Relight:', r); setActiveImageTool(null); setToolMode(null); }} onClose={() => { setActiveImageTool(null); setToolMode(null); }} />}
      {activeImageTool === 'multiAngle' && <MultiAngleTool imageUrl={undefined} onApply={(r) => { console.log('MultiAngle:', r); setActiveImageTool(null); setToolMode(null); }} onClose={() => { setActiveImageTool(null); setToolMode(null); }} />}

    </div>
  );
}

// ─── Root: two-layer routing ────────────────────
export default function App() {
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => {
    return localStorage.getItem('tapnow-current-project') || null;
  });

  const handleCreateNew = useCallback(() => {
    const newId = `project-${Date.now()}`;
    localStorage.setItem('tapnow-current-project', newId);
    // Clear store for fresh canvas
    useCanvasStore.setState({ nodes: new Map(), edges: new Map(), selectedNodeIds: [], viewport: { x: 0, y: 0, zoom: 0.5 } });
    setCurrentProjectId(newId);
  }, []);

  const handleSelectProject = useCallback((projectId: string) => {
    localStorage.setItem('tapnow-current-project', projectId);
    useCanvasStore.setState({ nodes: new Map(), edges: new Map(), selectedNodeIds: [] });
    setCurrentProjectId(projectId);
  }, []);

  const handleGoHome = useCallback(async () => {
    await saveNow(); // Force save before navigating away
    localStorage.removeItem('tapnow-current-project');
    setCurrentProjectId(null);
  }, []);

  // Project selector (no ReactFlow hooks involved)
  if (!currentProjectId) {
    return (
      <ProjectSelector
        onSelectProject={handleSelectProject}
        onCreateNew={handleCreateNew}
      />
    );
  }

  // Canvas workspace — ReactFlow hooks only run here
  return (
    <ReactFlowProvider>
      <CanvasWorkspace onGoHome={handleGoHome} />
    </ReactFlowProvider>
  );
}
