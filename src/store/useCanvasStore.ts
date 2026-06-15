/* === TapNow Canvas Store === */
/* Single Zustand store backing the entire canvas graph model */

import { create } from 'zustand';
import type { CanvasNode, CanvasEdge, Asset, Job, NodeType, NodeStatus } from '../types/graph';

export interface GraphState {
  // View
  viewport: { x: number; y: number; zoom: number };

  // Graph
  nodes: Map<string, CanvasNode>;
  edges: Map<string, CanvasEdge>;
  assets: Map<string, Asset>;
  jobs: Map<string, Job>;

  // UI state
  selectedNodeIds: string[];
  toolMode: 'select' | 'crop' | 'inpaint' | 'relight' | 'multiAngle' | 'annotate' | 'expand' | 'extract' | 'enhance' | null;
  isCommandPaletteOpen: boolean;
  pendingConnection: string | null;
  syncTick: number;

  // Undo/Redo
  history: Array<{ nodes: Array<[string, CanvasNode]>; edges: Array<[string, CanvasEdge]> }>;
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;

  // Actions — Node
  addNode: (type: NodeType, pos: { x: number; y: number }, title?: string) => string;
  updateNode: (id: string, patch: Partial<CanvasNode>) => void;
  removeNode: (id: string) => void;
  setNodeStatus: (id: string, status: NodeStatus) => void;

  // Actions — Edge
  addEdge: (from: { nodeId: string; portId: string }, to: { nodeId: string; portId: string }, dataType?: CanvasEdge['dataType']) => string;
  removeEdge: (id: string) => void;

  // Actions — Asset
  addAsset: (asset: Omit<Asset, 'createdAt' | 'updatedAt'>) => string;
  deriveAsset: (parentId: string, toolId: string, jobId: string, newUri: string, variants?: Asset['variants']) => string;

  // Actions — Job
  createJob: (kind: Job['kind'], nodeId: string, toolId: string | undefined, input: Record<string, unknown>) => string;
  updateJob: (id: string, patch: Partial<Job>) => void;

  // Selection
  setSelectedNodes: (ids: string[]) => void;

  // View
  setViewport: (vp: { x: number; y: number; zoom: number }) => void;
  setToolMode: (mode: GraphState['toolMode']) => void;
  toggleCommandPalette: () => void;
  setPendingConnection: (nodeId: string | null) => void;
  triggerSync: () => void;

  // Undo/Redo actions
  pushHistory: (_description?: string) => void;
  undo: () => void;
  redo: () => void;
}

let _nextId = 1;
function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${_nextId++}`;
}

function now(): string {
  return new Date().toISOString();
}

export const useCanvasStore = create<GraphState>((set, get) => ({
  viewport: { x: 0, y: 0, zoom: 1 },
  nodes: new Map(),
  edges: new Map(),
  assets: new Map(),
  jobs: new Map(),
  selectedNodeIds: [],
  toolMode: null,
  isCommandPaletteOpen: false,
  pendingConnection: null,
  syncTick: 0,
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,

  // ─── History helper ──
  pushHistory: (_description?: string) => {
    const MAX = 50;
    set(s => {
      const snap = {
        nodes: Array.from(s.nodes.entries()),
        edges: Array.from(s.edges.entries()),
      };
      const newHistory = s.history.slice(0, s.historyIndex + 1);
      newHistory.push(snap);
      if (newHistory.length > MAX) newHistory.shift();
      return {
        history: newHistory,
        historyIndex: newHistory.length - 1,
        canUndo: newHistory.length > 1,
        canRedo: false,
      };
    });
  },

  // ─── Node actions ───
  addNode(type, pos, title = '') {
    get().pushHistory();
    const id = uid('node');
    const node: CanvasNode = {
      id,
      type,
      title: title || type,
      pos,
      size: type==='scene.3d'?{w:500,h:300}:type==='world.3d'?{w:500,h:300}:type==='shot'?{w:380,h:420}:{w:380,h:200},
      ports: [],
      status: 'idle',
      meta: {},
      createdAt: now(),
      updatedAt: now(),
    };
    set(s => {
      const next = new Map(s.nodes);
      next.set(id, node);
      return { nodes: next, selectedNodeIds: [id] };
    });
    return id;
  },

  updateNode(id, patch) {
    set(s => {
      const existing = s.nodes.get(id);
      if (!existing) return s;
      const next = new Map(s.nodes);
      next.set(id, { ...existing, ...patch, updatedAt: now() });
      return { nodes: next };
    });
  },

  removeNode(id) {
    get().pushHistory();
    set(s => {
      const nextNodes = new Map(s.nodes);
      nextNodes.delete(id);
      const nextEdges = new Map(s.edges);
      for (const [eid, edge] of nextEdges) {
        if (edge.from.nodeId === id || edge.to.nodeId === id) nextEdges.delete(eid);
      }
      return { nodes: nextNodes, edges: nextEdges, selectedNodeIds: s.selectedNodeIds.filter(nid => nid !== id) };
    });
  },

  setNodeStatus(id, status) {
    set(s => {
      const existing = s.nodes.get(id);
      if (!existing) return s;
      const next = new Map(s.nodes);
      next.set(id, { ...existing, status, updatedAt: now() });
      return { nodes: next };
    });
  },

  // ─── Edge actions ───
  addEdge(from, to, dataType = 'any') {
    get().pushHistory();
    const id = uid('edge');
    const edge: CanvasEdge = {
      id,
      from,
      to,
      dataType,
      style: { animated: false },
      meta: { semantic: 'dataflow' },
    };
    set(s => {
      const next = new Map(s.edges);
      next.set(id, edge);
      return { edges: next };
    });
    return id;
  },

  removeEdge(id) {
    get().pushHistory();
    set(s => {
      const next = new Map(s.edges);
      next.delete(id);
      return { edges: next };
    });
  },

  // ─── Asset actions ───
  addAsset(asset) {
    const a: Asset = { ...asset, createdAt: now(), updatedAt: now() };
    set(s => {
      const next = new Map(s.assets);
      next.set(a.id, a);
      return { assets: next };
    });
    return a.id;
  },

  deriveAsset(parentId, toolId, jobId, newUri, variants = []) {
    const parent = get().assets.get(parentId);
    if (!parent) return '';
    const newId = uid('asset');
    const derived: Asset = {
      ...parent,
      id: newId,
      uri: newUri,
      variants,
      lineage: { parentAssetId: parentId, toolId, jobId },
      createdAt: now(),
      updatedAt: now(),
    };
    set(s => {
      const next = new Map(s.assets);
      next.set(newId, derived);
      return { assets: next };
    });
    return newId;
  },

  // ─── Job actions ───
  createJob(kind, nodeId, toolId, input) {
    const id = uid('job');
    const job: Job = {
      id, kind, nodeId, toolId, input, output: null,
      status: 'pending', cost: 0, durationMs: 0, logs: [],
      createdAt: now(), updatedAt: now(),
    };
    set(s => {
      const next = new Map(s.jobs);
      next.set(id, job);
      return { jobs: next };
    });
    return id;
  },

  updateJob(id, patch) {
    set(s => {
      const existing = s.jobs.get(id);
      if (!existing) return s;
      const next = new Map(s.jobs);
      next.set(id, { ...existing, ...patch, updatedAt: now() });
      return { jobs: next };
    });
  },

  // ─── Selection ───
  setSelectedNodes(ids) {
    set({ selectedNodeIds: ids });
  },

  // ─── View ───
  setViewport(vp) {
    set({ viewport: vp });
  },

  setToolMode(mode) {
    set({ toolMode: mode });
  },

  toggleCommandPalette() {
    set(s => ({ isCommandPaletteOpen: !s.isCommandPaletteOpen }));
  },

  setPendingConnection(nodeId) {
    set({ pendingConnection: nodeId });
  },

  // 批量创建节点——供 ShotNode 脚本分析使用
  batchCreateNodes(newNodes: Array<{id:string;type:string;title:string;pos:{x:number;y:number};size:{w:number;h:number};meta:Record<string,unknown>}>) {
    get().pushHistory();
    const now = new Date().toISOString();
    set(s => {
      const next = new Map(s.nodes);
      for (const n of newNodes) {
        next.set(n.id, { ...n, ports: [], status: 'idle' as const, createdAt: now, updatedAt: now });
      }
      return { nodes: next };
    });
    get().triggerSync();
  },

  triggerSync() {
    set(s => ({ syncTick: s.syncTick + 1 }));
  },

  // ─── Undo/Redo ──
  undo() {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const snap = history[historyIndex - 1];
    set({
      nodes: new Map(snap.nodes),
      edges: new Map(snap.edges),
      historyIndex: historyIndex - 1,
      canUndo: historyIndex - 1 > 0,
      canRedo: true,
      selectedNodeIds: [],
      syncTick: get().syncTick + 1,
    });
  },

  redo() {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const snap = history[historyIndex + 1];
    set({
      nodes: new Map(snap.nodes),
      edges: new Map(snap.edges),
      historyIndex: historyIndex + 1,
      canUndo: true,
      canRedo: historyIndex + 1 < history.length - 1,
      selectedNodeIds: [],
      syncTick: get().syncTick + 1,
    });
  },
}));

// ─── Derived selectors ──────────────────────────
export function getNodesArray(state: GraphState): CanvasNode[] {
  return Array.from(state.nodes.values());
}

export function getEdgesArray(state: GraphState): CanvasEdge[] {
  return Array.from(state.edges.values());
}

export function getNodeById(state: GraphState, id: string): CanvasNode | undefined {
  return state.nodes.get(id);
}

export function getEdgesForNode(state: GraphState, nodeId: string): CanvasEdge[] {
  return Array.from(state.edges.values()).filter(e => e.from.nodeId === nodeId || e.to.nodeId === nodeId);
}
