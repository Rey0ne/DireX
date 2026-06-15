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
  saveTimer = setTimeout(() => saveNow(), 100);
}

export async function saveNow() {
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

    try { const stripDataUrls=(obj:any):any=>{if(!obj||typeof obj!=='object')return obj;if(Array.isArray(obj))return obj.map(stripDataUrls);const c:any={};for(const k of Object.keys(obj)){const v=obj[k];if(typeof v==='string'&&v.startsWith('data:')&&v.length>1000){c[k]='';}else if(typeof v==='object'&&v!==null){c[k]=stripDataUrls(v);}else{c[k]=v;}}return c;};const nodesData=nodes.map(n=>({id:n.id,type:n.type,title:n.title,pos:n.pos,size:n.size,ports:n.ports,status:n.status,meta:stripDataUrls(n.meta)}));const edgesData=edges.map(e=>({id:e.id,from:e.from,to:e.to}));fetch('/api/canvas/sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer tapnow-dev-key'},body:JSON.stringify({nodes:nodesData,edges:edgesData})}).catch(()=>{});} catch {}
    console.log('[persist] Saved', nodes.length, 'nodes,', edges.length, 'edges');
    getStorageUsage().then(u=>{if(u.pct>80)console.warn(`[persist] Storage: ${u.usedMB}MB / ${u.quotaMB}MB (${u.pct}%) — 接近上限`);});
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

    // Populate nodes from DB only (fresh Map, no stale store data)
    const nodeMap = new Map();
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

    // Populate edges from DB only
    const edgeMap = new Map();
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

// ─── Storage usage ────────────────────────────────
export async function getStorageUsage(): Promise<{usedMB:number;quotaMB:number;pct:number}>{
  try{const est=await navigator.storage?.estimate();const used=est?.usage||0;const quota=est?.quota||0;return{usedMB:Math.round(used/1024/1024*10)/10,quotaMB:Math.round(quota/1024/1024*10)/10,pct:quota>0?Math.round(used/quota*100):0};}catch{return{usedMB:0,quotaMB:0,pct:0};}
}
export async function clearAllData():Promise<void>{
  try{await db.projects.clear();await db.canvases.clear();await db.nodes.clear();await db.edges.clear();await db.assets.clear();await db.jobs.clear();console.log('[persist] All data cleared');}catch(e){console.error('[persist] Clear failed:',e);}
}
if(typeof window!=='undefined'){(window as any).__direxStorage={getUsage:getStorageUsage,clearAll:clearAllData};}

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
