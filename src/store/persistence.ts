/* === Auto-save & restore bridge === */
/* Subscribes to Zustand store changes and persists to Dexie */

import { useCanvasStore } from './useCanvasStore';
import { db } from './db';

function getProjectId(): string {
  return localStorage.getItem('tapnow-current-project') || 'default-project';
}
function getCanvasId(): string {
  return `${getProjectId()}-canvas`;
}

// ─── Save ────────────────────────────────────────
let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveNow(), 500);
}

async function saveNow() {
  try {
    const state = useCanvasStore.getState();
    const nodes = Array.from(state.nodes.values());
    const edges = Array.from(state.edges.values());
    const assets = Array.from(state.assets.values());
    const jobs = Array.from(state.jobs.values());

    const pid = getProjectId();
    const cid = getCanvasId();

    await db.transaction('rw', [db.projects, db.canvases, db.nodes, db.edges, db.assets, db.jobs], async () => {
        // Project
        await db.projects.put({
          id: pid,
          name: `项目 ${pid.slice(-6)}`,
          description: '',
          updatedAt: new Date().toISOString(),
        });

        // Canvas
        await db.canvases.put({
          id: cid,
          projectId: pid,
          name: '主画布',
          viewport: state.viewport,
          updatedAt: new Date().toISOString(),
        });

        // Nodes — clear and repopulate
        await db.nodes.where({ canvasId: cid }).delete();
        for (const n of nodes) {
          await db.nodes.put({
            id: n.id,
            canvasId: cid,
            type: n.type,
            title: n.title,
            pos: n.pos,
            size: n.size,
            ports: n.ports,
            status: n.status,
            meta: n.meta,
            createdAt: n.createdAt,
            updatedAt: n.updatedAt,
          });
        }

        // Edges — clear and repopulate
        await db.edges.where({ canvasId: cid }).delete();
        for (const e of edges) {
          await db.edges.put({
            id: e.id,
            canvasId: cid,
            from: e.from,
            to: e.to,
            dataType: e.dataType,
            style: e.style,
            meta: e.meta,
            updatedAt: new Date().toISOString(),
          });
        }

        // Assets
        for (const a of assets) {
          await db.assets.put({
            id: a.id,
            projectId: pid,
            type: a.type,
            uri: a.uri,
            variants: a.variants,
            lineage: a.lineage,
            meta: a.meta,
            createdAt: a.createdAt,
            updatedAt: a.updatedAt,
          });
        }

        // Jobs
        for (const j of jobs) {
          await db.jobs.put({
            id: j.id,
            projectId: pid,
            kind: j.kind,
            nodeId: j.nodeId,
            toolId: j.toolId,
            input: j.input,
            output: j.output,
            status: j.status,
            cost: j.cost,
            durationMs: j.durationMs,
            logs: j.logs,
            createdAt: j.createdAt,
            updatedAt: j.updatedAt,
          });
        }
      });

    console.log('[persist] Saved', nodes.length, 'nodes,', edges.length, 'edges');
  } catch (err) {
    console.error('[persist] Save failed:', err);
  }
}

// ─── Load ────────────────────────────────────────
export async function loadFromDB() {
  try {
    const cid = getCanvasId();
    const canvas = await db.canvases.get(cid);
    if (!canvas) return false; // no saved data

    const dbNodes = await db.nodes.where({ canvasId: cid }).toArray();
    const dbEdges = await db.edges.where({ canvasId: cid }).toArray();

    const store = useCanvasStore.getState();

    // Populate nodes
    const nodeMap = new Map(store.nodes);
    for (const n of dbNodes) {
      nodeMap.set(n.id, {
        id: n.id,
        type: n.type as 'shot' | 'image.generate' | 'image.editor' | 'video.generate' | 'world.3d',
        title: n.title,
        pos: n.pos,
        size: n.size,
        ports: (n.ports || []) as [],
        status: n.status as 'idle' | 'running' | 'succeeded' | 'failed' | 'blocked',
        meta: (n.meta as Record<string, unknown>) || {},
        createdAt: n.createdAt,
        updatedAt: n.updatedAt,
      });
    }

    // Populate edges
    const edgeMap = new Map(store.edges);
    for (const e of dbEdges) {
      edgeMap.set(e.id, {
        id: e.id,
        from: e.from,
        to: e.to,
        dataType: e.dataType as 'shot.struct' | 'prompt.text' | 'asset.image' | 'asset.mask' | 'asset.style' | 'any',
        style: (e.style || {}) as { color?: string; width?: number; animated?: boolean },
        meta: (e.meta as { semantic: 'reference' | 'trigger' | 'dataflow' }) || { semantic: 'dataflow' },
      });
    }

    // Set viewport
    useCanvasStore.setState({
      nodes: nodeMap,
      edges: edgeMap,
      viewport: canvas.viewport,
    });

    console.log('[persist] Restored', dbNodes.length, 'nodes,', dbEdges.length, 'edges');
    return true;
  } catch (err) {
    console.error('[persist] Load failed:', err);
    return false;
  }
}

// ─── Auto-save subscriber ────────────────────────
export function startAutoSave() {
  // Subscribe to store changes
  const unsub = useCanvasStore.subscribe(() => {
    scheduleSave();
  });

  // Save on page unload
  const onUnload = () => saveNow();
  window.addEventListener('beforeunload', onUnload);

  return () => {
    unsub();
    window.removeEventListener('beforeunload', onUnload);
    if (saveTimer) clearTimeout(saveTimer);
  };
}
