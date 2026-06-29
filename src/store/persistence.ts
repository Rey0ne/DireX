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
let lastSaveTime = 0;
const MIN_SAVE_INTERVAL = 3000; // min 3s between saves to avoid drag-lag
const SAVE_DEBOUNCE = 1000;     // debounce 1s after last change

export function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  const since = Date.now() - lastSaveTime;
  if (since < MIN_SAVE_INTERVAL) {
    // Too soon since last save — schedule after cooldown
    saveTimer = setTimeout(() => saveNow(), MIN_SAVE_INTERVAL - since);
  } else {
    saveTimer = setTimeout(() => saveNow(), SAVE_DEBOUNCE);
  }
}

// ── Meta sanitizer: strip values that would corrupt persistence ──
const MAX_FIELD_SIZE = 500_000; // 500KB per field — larger is likely a data URL
function sanitizeMeta(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') {
    // Reject NaN and Infinity (not valid JSON)
    if (typeof obj === 'number' && !isFinite(obj)) return 0;
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(sanitizeMeta);
  const safe: Record<string, unknown> = {};
  let dropped = 0;
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof v === 'function' || typeof v === 'symbol') { dropped++; continue; }
    if (typeof v === 'string' && v.length > MAX_FIELD_SIZE) { dropped++; continue; }
    if (typeof v === 'number' && !isFinite(v)) { safe[k] = 0; dropped++; continue; }
    if (v && typeof v === 'object') { safe[k] = sanitizeMeta(v); } else { safe[k] = v; }
  }
  if (dropped > 0) {
    console.warn(`[persist] sanitizeMeta dropped ${dropped} unsafe field(s)`);
  }
  return safe;
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
            meta: sanitizeMeta(n.meta) as Record<string, unknown>,
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

    lastSaveTime = Date.now();
    try { const stripDataUrls=(obj:any):any=>{if(!obj||typeof obj!=='object')return obj;if(Array.isArray(obj))return obj.map(stripDataUrls);const c:any={};for(const k of Object.keys(obj)){const v=obj[k];if(typeof v==='string'&&v.startsWith('data:')&&v.length>1000){c[k]='';}else if(typeof v==='object'&&v!==null){c[k]=stripDataUrls(v);}else{c[k]=v;}}return c;};const nodesData=nodes.map(n=>({id:n.id,type:n.type,title:n.title,meta:stripDataUrls(n.meta)}));const edgesData=edges.map(e=>({id:e.id,from:e.from,to:e.to}));fetch('/api/canvas/sync',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer tapnow-dev-key'},body:JSON.stringify({nodes:nodesData,edges:edgesData})}).catch(()=>{});} catch {}
    console.log('[persist] Saved', nodes.length, 'nodes,', edges.length, 'edges');
    getStorageUsage().then(u=>{if(u.pct>80)console.warn(`[persist] Storage: ${u.usedMB}MB / ${u.quotaMB}MB (${u.pct}%) — 接近上限`);});
    // ── Health sentinel: detect bloated state before it corrupts ──
    try {
      const stateSize = JSON.stringify({ nodes, edges }).length;
      if (stateSize > 5_000_000) {
        console.error(`[persist] ⚠ CRITICAL: State size ${(stateSize/1e6).toFixed(1)}MB — immediate cleanup needed`);
      } else if (stateSize > 1_000_000) {
        console.warn(`[persist] ⚠ WARNING: State size ${(stateSize/1e6).toFixed(1)}MB — data URLs may be accumulating`);
      }
    } catch { /* size check is advisory only */ }
  } catch (err) {
    console.error('[persist] Save failed:', err);
  }
}

// ── Crash heartbeat: detect if previous session crashed ──
const HEARTBEAT_KEY = '__direx_heartbeat';
function setHeartbeat(): void {
  try { localStorage.setItem(HEARTBEAT_KEY, Date.now().toString()); } catch {}
}
function clearHeartbeat(): void {
  try { localStorage.removeItem(HEARTBEAT_KEY); } catch {}
}
export function wasPreviousCrash(): boolean {
  try {
    const prev = localStorage.getItem(HEARTBEAT_KEY);
    if (!prev) return false;
    // If heartbeat is older than 10s, previous session exited abnormally
    return Date.now() - Number(prev) > 10_000;
  } catch { return false; }
}

// ─── Load ────────────────────────────────────────
export async function loadFromDB() {
  // Crash sentinel: if previous session crashed, skip IndexedDB to avoid loading corrupt data
  if (wasPreviousCrash()) {
    console.warn('[persist] Previous session may have crashed — skipping IndexedDB, falling back to server');
    clearHeartbeat();
    return false;
  }
  try {
    const cid = getCanvasId();
    const canvas = await db.canvases.get(cid);
    if (!canvas) return false; // no saved data

    const dbNodes = await db.nodes.where({ canvasId: cid }).toArray();
    const dbEdges = await db.edges.where({ canvasId: cid }).toArray();

    // Sanity check: reject nodes with massive data URLs (>1MB meta) that
    // would crash the browser renderer. Falls back to server state.
    for (const n of dbNodes) {
      if (JSON.stringify(n.meta).length > 1_000_000) {
        console.warn('[persist] Corrupted node, clearing IndexedDB, falling back to server');
        await db.nodes.where({ canvasId: cid }).delete();
        await db.edges.where({ canvasId: cid }).delete();
        return false;
      }
    }

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
  // ── Crash heartbeat ──
  setHeartbeat();
  // Refresh heartbeat every 5s while session is alive
  const heartbeatInterval = setInterval(setHeartbeat, 5000);

  // Subscribe to store changes
  const unsub = useCanvasStore.subscribe(() => {
    scheduleSave();
  });

  // Save on page unload
  const onUnload = () => { clearHeartbeat(); saveNow(); };
  window.addEventListener('beforeunload', onUnload);

  // Also clear heartbeat on visibility hidden (tab close / navigation away)
  const onHidden = () => {
    if (document.visibilityState === 'hidden') {
      clearHeartbeat();
      saveNow();
    }
  };
  document.addEventListener('visibilitychange', onHidden);

  return () => {
    clearInterval(heartbeatInterval);
    clearHeartbeat();
    unsub();
    window.removeEventListener('beforeunload', onUnload);
    document.removeEventListener('visibilitychange', onHidden);
    if (saveTimer) clearTimeout(saveTimer);
  };
}
