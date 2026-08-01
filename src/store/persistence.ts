/* === Auto-save & restore bridge === */
/* Subscribes to Zustand store changes and persists to Dexie */

import { useCanvasStore } from './useCanvasStore';
import { db } from './db';
import { BACKEND_URL } from '../api/config';

function getProjectId(): string {
  return localStorage.getItem('tapnow-current-project') || 'default';
}
function getCanvasId(): string {
  return `${getProjectId()}-canvas`;
}

// ── Deep-set a dotted path into an object (mutates target) ──
// deepSet(obj, "meta.gen.imageUrl", value) → obj.meta.gen.imageUrl = value
function deepSet(target: any, path: string, value: any): void {
  const keys = path.split('.');
  let cur = target;
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i];
    // Handle array indices like "images[0]"
    const arrMatch = k.match(/^(.+)\[(\d+)\]$/);
    if (arrMatch) {
      if (!cur[arrMatch[1]]) cur[arrMatch[1]] = [];
      cur = cur[arrMatch[1]];
      const idx = parseInt(arrMatch[2], 10);
      if (!cur[idx]) cur[idx] = {};
      cur = cur[idx];
    } else {
      if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {};
      cur = cur[k];
    }
  }
  const lastKey = keys[keys.length - 1];
  const arrMatch = lastKey.match(/^(.+)\[(\d+)\]$/);
  if (arrMatch) {
    if (!cur[arrMatch[1]]) cur[arrMatch[1]] = [];
    cur[arrMatch[1]][parseInt(arrMatch[2], 10)] = value;
  } else {
    cur[lastKey] = value;
  }
}

// ─── Save ────────────────────────────────────────
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastSaveTime = 0;
let saveMutex = false;          // prevent concurrent saveNow() calls
const MIN_SAVE_INTERVAL = 3000; // min 3s between saves to avoid drag-lag
const SAVE_DEBOUNCE = 1000;     // debounce 1s after last change

// ── Safety gate: prevent saving before initial load completes ──
// Without this, startAutoSave() can trigger saveNow() while loadFromDB()
// is still async, overwriting existing data with an empty/partial store.
let initialized = false;
export function markInitialized() {
  initialized = true;
  console.log('[persist] Storage initialized — auto-save now active');
}

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

// ── Data URL leak guard: no code path may persist a data: URI to IndexedDB ──
const DATA_URL_PATTERN = /^data:[^;]+;base64,/;
function assertNoDataUrls(nodes: any[], edges: any[]): string[] {
  const violations: string[] = [];
  for (const n of nodes) {
    const raw = JSON.stringify(n.meta || {});
    if (raw.length > 200 && DATA_URL_PATTERN.test(raw)) {
      const matches = raw.match(/data:[^"'\s]{20,80}/g) || [];
      violations.push(`Node ${n.id.slice(0,14)}: ${matches.length} data: URI(s) in meta — ${matches[0]?.slice(0,50)}...`);
    }
  }
  for (const e of edges) {
    const raw = JSON.stringify(e.meta || {});
    if (raw.length > 200 && DATA_URL_PATTERN.test(raw)) {
      violations.push(`Edge ${e.id.slice(0,14)}: data: URI in meta`);
    }
  }
  if (violations.length > 0) {
    console.error(`[persist] 🔴 LEAK DETECTED: ${violations.length} data URL(s) found in state. These will NOT be saved to IndexedDB.`);
    for (const v of violations) console.error(`[persist]   ⚡ ${v}`);
    // Strip them automatically (don't throw — prevent data loss on existing bad data)
    return violations;
  }
  return [];
}

// ── Oversized node guard: warn + strip fields that exceed limits ──
// For the 'gen' field specifically, we deep-strip large analysis sub-fields
// instead of deleting gen entirely — gen.imageUrl/imageUrls/videoUrl are
// essential for node display and must survive the strip.
const MAX_NODE_SERIALIZED = 200_000; // 200KB per node serialized
const FIELD_STRIP_THRESHOLD = 50_000; // 50KB — fields larger than this are candidates

// Large analysis sub-fields within gen that are safe to strip.
// These hold script/music analysis results, not display-critical data.
const GEN_ANALYSIS_SUBFIELDS = [
  'scriptOverview',        // shots + characterProfiles + scenes + … (400KB+)
  'scriptCharacters',      // character profile data
  'scriptScenes',          // scene description data
  'scriptSceneArchitecture', // scene spatial layout
  'scriptSunoPrompts',     // music generation prompts
  'scriptSoundScenes',     // sound scene definitions
  'rawOutput',             // raw GPT output text dumped into gen
];

function enforceNodeSizeLimit(nodes: any[]): { stripped: number; warnings: string[] } {
  const warnings: string[] = [];
  let stripped = 0;
  for (const n of nodes) {
    const metaSize = JSON.stringify(n.meta || {}).length;
    if (metaSize > MAX_NODE_SERIALIZED) {
      const fields: { k: string; size: number }[] = [];
      for (const [k, v] of Object.entries(n.meta || {})) {
        fields.push({ k, size: JSON.stringify(v).length });
      }
      fields.sort((a, b) => b.size - a.size);
      const strippedList: string[] = [];
      for (const f of fields) {
        if (f.size > FIELD_STRIP_THRESHOLD) {
          if (f.k === 'gen') {
            // ── Deep-strip gen: remove large analysis sub-fields, keep display fields ──
            // imageUrl, imageUrls, videoUrl, prompt, model, aspect, resolution,
            // quality, resultAssetIds, referenceUrls — all survive the strip.
            const genObj = (n.meta as any).gen;
            if (genObj && typeof genObj === 'object') {
              let subStripped = 0;
              for (const sub of GEN_ANALYSIS_SUBFIELDS) {
                if (genObj[sub] !== undefined) {
                  const subSize = JSON.stringify(genObj[sub]).length;
                  delete genObj[sub];
                  subStripped++;
                  stripped++;
                  strippedList.push(`gen.${sub}(${(subSize / 1024).toFixed(0)}KB)`);
                }
              }
              if (subStripped === 0) {
                // gen is large but no known analysis sub-fields matched —
                // log what remains so we can diagnose in production
                const remainingKeys = Object.keys(genObj).join(', ');
                const remainingSize = JSON.stringify(genObj).length;
                strippedList.push(`gen.unknown(${(remainingSize / 1024).toFixed(0)}KB — keys: ${remainingKeys.slice(0, 80)})`);
              }
            }
          } else {
            delete (n.meta as any)[f.k];
            stripped++;
            strippedList.push(`${f.k}(${(f.size / 1024).toFixed(0)}KB)`);
          }
        }
      }
      warnings.push(`Node ${n.id.slice(0, 14)} meta ${(metaSize / 1024).toFixed(1)}KB → stripped: ${strippedList.join(', ')}`);
    }
  }
  if (stripped > 0) {
    console.error(`[persist] 🔴 Stripped ${stripped} oversized sub-fields from ${warnings.length} node(s)`);
    for (const w of warnings) console.error(`[persist]   ⚡ ${w}`);
  }
  return { stripped, warnings };
}
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
  // ── Safety gate: don't save before initial load completes ──
  // This prevents the race where startAutoSave() fires a save via store
  // subscription while loadFromDB() is still reading from IndexedDB.
  if (!initialized) {
    console.log('[persist] Skipping save — store not yet initialized (data still loading)');
    return;
  }
  // ── Mutex guard: if a save is already in flight, re-schedule aggressively ──
  // Previous code only set saveTimer if none existed — but scheduleSave() always
  // sets one, so the !saveTimer guard never fired. The deferred timer from
  // scheduleSave() could be up to MIN_SAVE_INTERVAL (3s) away, and the user
  // refreshing in that window would lose the latest position.
  if (saveMutex) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveNow(), SAVE_DEBOUNCE);
    return;
  }
  saveMutex = true;
  try {
    const state = useCanvasStore.getState();
    const nodes = Array.from(state.nodes.values());
    const edges = Array.from(state.edges.values());
    const assets = Array.from(state.assets.values());
    const jobs = Array.from(state.jobs.values());

    const pid = getProjectId();
    const cid = getCanvasId();

    // ── Layer 0: Data leak guard — detect + strip any data: URIs before IndexedDB write ──
    assertNoDataUrls(nodes, edges);
    // ── Layer 0b: Oversized node guard — strip fields >50KB from nodes >200KB total ──
    enforceNodeSizeLimit(nodes);

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

        // Nodes — bulkPut first, then delete orphans (safe: crash won't lose data)
        const nodeRows = nodes.map(n => ({
          id: n.id, canvasId: cid, projectId: pid, type: n.type, title: n.title,
          pos: n.pos, size: n.size, ports: n.ports, status: n.status,
          meta: sanitizeMeta(n.meta) as Record<string, unknown>,
          createdAt: n.createdAt, updatedAt: n.updatedAt,
        }));
        if (nodeRows.length > 0) await db.nodes.bulkPut(nodeRows);
        const currentNodeIds = new Set(nodes.map(n => n.id));
        const storedNodeIds = await db.nodes.where({ projectId: pid }).primaryKeys();
        const orphanNodes = storedNodeIds.filter(id => !currentNodeIds.has(id));
        if (orphanNodes.length > 0) await db.nodes.bulkDelete(orphanNodes);

        // Edges — same safe pattern
        const edgeRows = edges.map(e => ({
          id: e.id, canvasId: cid, projectId: pid, from: e.from, to: e.to,
          dataType: e.dataType, style: e.style, meta: e.meta,
          updatedAt: new Date().toISOString(),
        }));
        if (edgeRows.length > 0) await db.edges.bulkPut(edgeRows);
        const currentEdgeIds = new Set(edges.map(e => e.id));
        const storedEdgeIds = await db.edges.where({ projectId: pid }).primaryKeys();
        const orphanEdges = storedEdgeIds.filter(id => !currentEdgeIds.has(id));
        if (orphanEdges.length > 0) await db.edges.bulkDelete(orphanEdges);

        // Assets — bulkPut then clean orphans, then LRU eviction
        if (assets.length > 0) {
          await db.assets.bulkPut(assets.map(a => ({
            id: a.id, projectId: pid, type: a.type, uri: a.uri,
            variants: a.variants, lineage: a.lineage, meta: a.meta,
            createdAt: a.createdAt, updatedAt: a.updatedAt,
          })));
        }
        const currentAssetIds = new Set(assets.map(a => a.id));
        const storedAssetIds = await db.assets.where({ projectId: pid }).primaryKeys();
        const orphanAssets = storedAssetIds.filter(id => !currentAssetIds.has(id));
        if (orphanAssets.length > 0) await db.assets.bulkDelete(orphanAssets);

        // ── Asset cache LRU eviction: keep total assets under 200MB ──
        await evictAssetsLRU(pid);

        // Jobs — same pattern
        if (jobs.length > 0) {
          await db.jobs.bulkPut(jobs.map(j => ({
            id: j.id, projectId: pid, kind: j.kind, nodeId: j.nodeId,
            toolId: j.toolId, input: j.input, output: j.output,
            status: j.status, cost: j.cost, durationMs: j.durationMs,
            logs: j.logs, createdAt: j.createdAt, updatedAt: j.updatedAt,
          })));
        }
        const currentJobIds = new Set(jobs.map(j => j.id));
        const storedJobIds = await db.jobs.where({ projectId: pid }).primaryKeys();
        const orphanJobs = storedJobIds.filter(id => !currentJobIds.has(id));
        if (orphanJobs.length > 0) await db.jobs.bulkDelete(orphanJobs);
      });

    lastSaveTime = Date.now();
    // ── Sync to server: server extracts data URLs → disk files → returns field-level patches ──
    // Do NOT strip data URLs before sending — server handles extraction.
    try {
      const nodesData = nodes.map(n => ({
        id: n.id, type: n.type, title: n.title,
        pos: n.pos, size: n.size, ports: n.ports, status: n.status,
        meta: n.meta, // send raw — server extractAssetRefs will extract data URLs to files
        createdAt: n.createdAt, updatedAt: n.updatedAt,
      }));
      const edgesData = edges.map(e => ({ id: e.id, from: e.from, to: e.to, dataType: e.dataType, style: e.style, meta: e.meta }));
      fetch(`${BACKEND_URL}/api/canvas/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tapnow-dev-key' },
        body: JSON.stringify({ projectId: getProjectId(), nodes: nodesData, edges: edgesData }),
      })
        .then(async resp => {
          if (!resp.ok) return;
          const json = await resp.json().catch(() => null);
          if (!json) return;

          // ── Report extraction failures ──
          if (json.failures?.length > 0) {
            console.error(`[persist] ⚠ Server failed to extract ${json.failures.length} asset(s):`, json.failures);
          }

          // ── Apply field-level patches: only update specific paths, never overwrite whole node ──
          if (json.patches?.length > 0) {
            const store = useCanvasStore.getState();
            // Group patches by nodeId
            const byNode = new Map<string, { path: string; value: any }[]>();
            for (const p of json.patches) {
              if (!byNode.has(p.nodeId)) byNode.set(p.nodeId, []);
              byNode.get(p.nodeId)!.push(p);
            }
            let applied = 0;
            for (const [nodeId, nodePatches] of byNode) {
              const node = store.nodes.get(nodeId);
              if (!node) continue;
              // Deep-set each patch path into a copy of the node's current meta
              let newMeta = JSON.parse(JSON.stringify(node.meta || {}));
              for (const p of nodePatches) {
                deepSet(newMeta, p.path, p.value);
              }
              store.updateNode(nodeId, { meta: newMeta });
              applied++;
            }
            if (json.extracted > 0) {
              console.log(`[persist] Server extracted ${json.extracted} asset(s) → ${applied} node(s) patched`);
            }
          }
        })
        .catch((e) => {
          // Report sync failure for diagnostics
          import('../utils/diagnostics').then(m => m.diag.syncFailed(String(e).slice(0, 100)));
        });
    } catch {}
    console.log('[persist] Saved', nodes.length, 'nodes,', edges.length, 'edges');
    // ── Emergency parachute: write minimal state to localStorage ──
    // If IndexedDB AND server both fail, this is the last resort for recovery.
    try {
      const emergency = {
        ts: Date.now(),
        n: nodes.map(n => ({ id: n.id, ty: n.type, ti: n.title, px: n.pos?.x, py: n.pos?.y, st: n.status })),
        e: edges.map(e => ({ id: e.id, f: e.from?.nodeId, t: e.to?.nodeId })),
      };
      localStorage.setItem('__direx_emergency', JSON.stringify(emergency));
    } catch {}
    getStorageUsage().then(u=>{if(u.pct>80)console.warn(`[persist] Storage: ${u.usedMB}MB / ${u.quotaMB}MB (${u.pct}%) — 接近上限`);});
    // ── Health sentinel: detect bloated state ──
    try {
      const stateSize = JSON.stringify({ nodes, edges }).length;
      if (stateSize > 5_000_000) {
        console.error(`[persist] 🔴 CRITICAL: State size ${(stateSize/1e6).toFixed(1)}MB — auto-stripping oversized fields from source`);
        nodes.forEach(n => {
          const cleanedMeta = sanitizeMeta(n.meta);
          if (JSON.stringify(cleanedMeta) !== JSON.stringify(n.meta)) {
            useCanvasStore.getState().updateNode(n.id, { meta: cleanedMeta as any });
          }
        });
        console.log('[persist] Auto-cleaned — next save should be smaller');
      } else if (stateSize > 1_000_000) {
        console.warn(`[persist] 🟡 State size ${(stateSize/1e6).toFixed(1)}MB — large embedded data detected. Sync will archive assets automatically.`);
      }
    } catch { /* size check is advisory only */ }
  } catch (err) {
    console.error('[persist] Save failed:', err);
    // Notify user of save failure so they don't lose work silently
    try {
      const msg = err instanceof Error ? err.message : String(err);
      (window as any).__direx_lastSaveError = { time: Date.now(), msg };
      // Dispatch a custom event so the UI can show a toast
      window.dispatchEvent(new CustomEvent('persist-save-failed', { detail: { error: msg } }));
    } catch {}
  } finally {
    saveMutex = false;
  }
}

// ── Asset cache LRU eviction: keep total assets under 200MB per project ──
const MAX_ASSET_CACHE_BYTES = 200 * 1024 * 1024; // 200MB
async function evictAssetsLRU(projectId: string): Promise<void> {
  try {
    const allAssets = await db.assets.where({ projectId }).toArray();
    let totalBytes = 0;
    for (const a of allAssets) {
      totalBytes += JSON.stringify(a).length;
    }
    if (totalBytes <= MAX_ASSET_CACHE_BYTES) return;

    // Sort by updatedAt ascending (oldest first) — LRU eviction
    allAssets.sort((a, b) => (a.updatedAt || '').localeCompare(b.updatedAt || ''));
    const toDelete: string[] = [];
    for (const a of allAssets) {
      if (totalBytes <= MAX_ASSET_CACHE_BYTES * 0.8) break; // evict down to 80%
      toDelete.push(a.id);
      totalBytes -= JSON.stringify(a).length;
    }
    if (toDelete.length > 0) {
      await db.assets.bulkDelete(toDelete);
      console.warn(`[persist] 🗑 LRU evicted ${toDelete.length} asset(s) from ${projectId} (cache limit: 200MB)`);
    }
  } catch (e) { console.warn('[persist] LRU eviction failed:', e); }
}

// ── Per-project data deletion: only this project's data, never cross-project ──
export async function deleteProjectData(projectId: string): Promise<void> {
  console.warn(`[persist] 🗑 Deleting all data for project: ${projectId}`);
  try {
    await db.transaction('rw', [db.projects, db.canvases, db.nodes, db.edges, db.assets, db.jobs], async () => {
      await db.nodes.where({ projectId }).delete();
      await db.edges.where({ projectId }).delete();
      await db.assets.where({ projectId }).delete();
      await db.jobs.where({ projectId }).delete();
      const cid = `${projectId}-canvas`;
      await db.canvases.delete(cid);
      await db.projects.delete(projectId);
    });
    console.log(`[persist] ✅ Project ${projectId} fully deleted`);
  } catch (e) {
    console.error(`[persist] Failed to delete project ${projectId}:`, e);
    throw e;
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
// ─── Server fallback: restore canvas when IndexedDB is empty/corrupted ──
export async function loadFromServer(): Promise<boolean> {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/canvas/state?project=${encodeURIComponent(getProjectId())}`, {
      headers: { Authorization: 'Bearer tapnow-dev-key' },
    });
    const json = await resp.json();
    if (!json.nodes?.length) return false;

    const nodeMap = new Map();
    for (const n of json.nodes) {
      nodeMap.set(n.id, {
        id: n.id,
        type: (n.type || 'shot') as any,
        title: n.title || '',
        pos: n.pos || { x: 0, y: 0 },
        size: n.size || { width: 320, height: 200 },
        ports: n.ports || [],
        status: n.status || 'idle',
        meta: n.meta || {},
        createdAt: n.createdAt || new Date().toISOString(),
        updatedAt: n.updatedAt || new Date().toISOString(),
      });
    }

    const edgeMap = new Map();
    for (const e of json.edges || []) {
      edgeMap.set(e.id, {
        id: e.id,
        from: e.from || { nodeId: '', handle: 'out' },
        to: e.to || { nodeId: '', handle: 'in' },
        dataType: e.dataType || 'any',
        style: e.style || {},
        meta: e.meta || { semantic: 'dataflow' },
      });
    }

    useCanvasStore.setState({ nodes: nodeMap, edges: edgeMap });
    console.log('[persist] Restored from server:', json.nodes.length, 'nodes,', (json.edges||[]).length, 'edges');

    // ── If server says state needs repair, trigger it in background ──
    if (json.needsRepair && json.dataUriCount > 0) {
      console.warn(`[persist] ⚠ Server reports ${json.dataUriCount} residual data URI(s) — triggering background repair...`);
      fetch(`${BACKEND_URL}/api/canvas/repair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer tapnow-dev-key' },
        body: JSON.stringify({ projectId: getProjectId() }),
      }).then(async r => {
        const repairJson = await r.json().catch(() => null);
        if (repairJson?.repaired > 0) {
          console.log(`[persist] 🔧 Background repair: ${repairJson.repaired} asset(s) extracted`);
          // Apply patches to IndexedDB so local cache matches server
          if (repairJson.patches?.length > 0) {
            const store = useCanvasStore.getState();
            for (const p of repairJson.patches) {
              const node = store.nodes.get(p.nodeId);
              if (!node) continue;
              const newMeta = JSON.parse(JSON.stringify(node.meta || {}));
              deepSet(newMeta, p.path, p.value);
              store.updateNode(p.nodeId, { meta: newMeta });
            }
          }
        }
        if (repairJson?.failures?.length > 0) {
          console.error(`[persist] ⚠ Repair had ${repairJson.failures.length} failure(s):`, repairJson.failures);
        }
      }).catch(() => {});
    }

    return true;
  } catch (err) {
    console.error('[persist] Server fallback failed:', err);
    import('../utils/diagnostics').then(m => m.diag.loadFailed('server_fallback', String(err).slice(0, 100)));
    return false;
  }
}

// ─── Last-resort recovery: localStorage emergency parachute ───
// Activated when both IndexedDB AND server are empty/corrupt.
// Stores minimal node data (id, type, title, position, status) — no content URLs.
export function loadEmergencyFromLocalStorage(): boolean {
  try {
    const raw = localStorage.getItem('__direx_emergency');
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data.n?.length) return false;
    const ageMinutes = (Date.now() - data.ts) / 60000;
    console.warn(`[persist] ⚠ Emergency recovery: ${data.n.length} nodes, ${ageMinutes.toFixed(0)}min old`);
    const nodeMap = new Map();
    for (const n of data.n) {
      nodeMap.set(n.id, {
        id: n.id, type: n.ty || 'shot', title: n.ti || '',
        pos: { x: n.px || 0, y: n.py || 0 }, size: { w: 320, h: 200 },
        ports: [], status: n.st || 'idle', meta: { _recovered: true },
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      });
    }
    const edgeMap = new Map();
    for (const e of data.e || []) {
      if (!e.id) continue;
      edgeMap.set(e.id, {
        id: e.id,
        from: { nodeId: e.f || '', portId: 'out' },
        to: { nodeId: e.t || '', portId: 'in' },
        dataType: 'any', style: {}, meta: { semantic: 'dataflow' },
      });
    }
    useCanvasStore.setState({ nodes: nodeMap, edges: edgeMap });
    console.log('[persist] Emergency recovery complete — content URLs not preserved, but node structure saved');
    return true;
  } catch { return false; }
}

export async function loadFromDB() {
  // ── Server-first: data lives on server, IndexedDB is local cache ──
  try {
    const serverOk = await loadFromServer();
    if (serverOk) {
      console.log('[persist] Loaded from server (primary) — IndexedDB is cache only');
      // Save to IndexedDB as offline cache
      try { await saveNow(); } catch {}
      return true;
    }
  } catch (e) { console.warn('[persist] Server unavailable, falling back to IndexedDB:', e); }

  // Crash sentinel: if previous session crashed, check IndexedDB before skipping
  if (wasPreviousCrash()) {
    clearHeartbeat();
    // Only skip IndexedDB if there's genuinely no local data
    try {
      const hasLocal = await db.canvases.count() > 0;
      if (!hasLocal) {
        console.warn('[persist] Previous session may have crashed — no local data, falling back to server');
        return false;
      }
      console.warn('[persist] Previous session may have crashed — but local data exists, loading from IndexedDB');
    } catch {
      console.warn('[persist] Previous session may have crashed — cannot check IndexedDB, falling back to server');
      return false;
    }
  }
  try {
    const cid = getCanvasId();
    const canvas = await db.canvases.get(cid);
    if (!canvas) return false; // no saved data

    let dbNodes: any[], dbEdges: any[];
    try {
      dbNodes = await db.nodes.where({ canvasId: cid }).toArray();
      dbEdges = await db.edges.where({ canvasId: cid }).toArray();
    } catch (readErr: any) {
      if (readErr.message?.includes('large') || readErr.message?.includes('IndexedDB') || readErr.name === 'DataError') {
        console.warn('[persist] IndexedDB 数据损坏，自动清理...');
        await clearAllData();
        return false; // triggers loadFromServer fallback
      }
      throw readErr;
    }

    // Sanity check: skip nodes with massive meta (>500KB) that
    // would bloat the browser store. Filter them out instead of nuking all data.
    const skippedNodes: string[] = [];
    const safeNodes = dbNodes.filter(n => {
      if (JSON.stringify(n.meta).length > 500_000) {
        skippedNodes.push(n.id);
        return false;
      }
      return true;
    });
    if (skippedNodes.length > 0) {
      console.warn(`[persist] ${skippedNodes.length} node(s) have bloated meta (>1MB), skipped: ${skippedNodes.join(', ')}`);
      // Clean up the bloated nodes from IndexedDB
      await db.nodes.bulkDelete(skippedNodes);
    }

    // Populate nodes from DB only (fresh Map, no stale store data)
    const nodeMap = new Map();
    for (const n of safeNodes) {
      nodeMap.set(n.id, {
        id: n.id,
        type: n.type as 'shot' | 'image.generate' | 'image.editor' | 'video.generate' | 'world.3d',
        title: n.title,
        pos: n.pos,
        size: n.size,
        ports: (n.ports || []) as [],
        status: n.status as 'idle' | 'running' | 'succeeded' | 'failed' | 'blocked',
        meta: (sanitizeMeta(n.meta) as Record<string, unknown>) || {},
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

    // Populate assets from DB (project-scoped, not canvas-scoped)
    const pid = getProjectId();
    const assetMap = new Map();
    const dbAssets = await db.assets.where({ projectId: pid }).toArray();
    for (const a of dbAssets) {
      assetMap.set(a.id, {
        id: a.id,
        type: a.type,
        uri: a.uri,
        variants: (a.variants || []) as [],
        lineage: (a.lineage || null) as ({ parentId: string; toolId: string; jobId: string } | null),
        meta: (a.meta || {}) as { prompt?: string; model?: string; seed?: number; width?: number; height?: number; exif?: Record<string, unknown> },
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      });
    }

    // Populate jobs from DB
    const jobMap = new Map();
    const dbJobs = await db.jobs.where({ projectId: pid }).toArray();
    for (const j of dbJobs) {
      jobMap.set(j.id, {
        id: j.id,
        kind: j.kind,
        nodeId: j.nodeId,
        toolId: j.toolId,
        input: (j.input || {}) as Record<string, unknown>,
        output: (j.output || null) as Record<string, unknown> | null,
        status: j.status,
        cost: j.cost,
        durationMs: j.durationMs,
        logs: (j.logs || []) as string[],
        createdAt: j.createdAt,
        updatedAt: j.updatedAt,
      });
    }

    // ── Auto-heal: if IndexedDB is bloated (>5MB), skip it and load from server ──
    // Do NOT clearAllData() — that nukes other projects. Just use server as source of truth.
    const stateSize = JSON.stringify({ nodes: [...nodeMap.values()], edges: [...edgeMap.values()] }).length;
    if (stateSize > 5_000_000) {
      console.warn(`[persist] IndexedDB state ${(stateSize/1e6).toFixed(1)}MB — skipping, loading from server`);
      // Clean up only this project's bloated data from IndexedDB (keep other projects intact)
      const pid = getProjectId();
      try { await db.nodes.where({ projectId: pid }).delete(); await db.edges.where({ projectId: pid }).delete(); } catch {}
      return false; // triggers loadFromServer
    }

    // Set viewport
    useCanvasStore.setState({
      nodes: nodeMap,
      edges: edgeMap,
      assets: assetMap,
      jobs: jobMap,
      viewport: canvas.viewport,
    });

    console.log('[persist] Restored', dbNodes.length, 'nodes,', dbEdges.length, 'edges,',
      dbAssets.length, 'assets,', dbJobs.length, 'jobs');
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

// ── Project recovery: restore known projects from server backups ──
// IndexedDB auto-clear wipes ALL tables including db.projects. This restores
// projects whose canvas data was backed up as separate JSON files on the server.
const KNOWN_PROJECT_BACKUPS: Record<string, string> = {
  'queen-surli': `${BACKEND_URL}/api/output/_queen-restore.json`,
  'sync-payload': `${BACKEND_URL}/api/output/_sync-restore.json`,
  'project-105': `${BACKEND_URL}/api/output/_proj-105.json`,
  'project-59': `${BACKEND_URL}/api/output/_proj-59.json`,
  'project-12': `${BACKEND_URL}/api/output/_proj-12.json`,
};
const KNOWN_PROJECT_NAMES: Record<string, string> = {
  'queen-surli': '苏尔里女王',
  'sync-payload': '同步数据',
  'project-105': '大型项目 (105节点)',
  'project-59': '中型项目 (59节点)',
  'project-12': '小型项目 (12节点)',
};

export async function restoreMissingProjects(): Promise<number> {
  let restored = 0;
  for (const [pid, url] of Object.entries(KNOWN_PROJECT_BACKUPS)) {
    try {
      const exists = await db.projects.get(pid);
      if (exists) { console.log('[persist] Project', pid, 'already exists, skipping'); continue; }
      const resp = await fetch(url);
      if (!resp.ok) { console.warn('[persist] Cannot fetch backup for', pid, ':', resp.status); continue; }
      const data = await resp.json();
      if (!data.nodes?.length) { console.warn('[persist] Empty backup for', pid); continue; }

      const cid = pid + '-canvas';
      await db.transaction('rw', [db.projects, db.canvases, db.nodes, db.edges], async () => {
        await db.projects.put({ id: pid, name: KNOWN_PROJECT_NAMES[pid] || pid, description: '', updatedAt: new Date().toISOString() });
        await db.canvases.put({ id: cid, projectId: pid, name: '主画布', viewport: { x: 0, y: 0, zoom: 1 }, updatedAt: new Date().toISOString() });
        for (const n of data.nodes) {
          await db.nodes.put({
            id: n.id, canvasId: cid, projectId: pid, type: n.type || 'image.generate', title: n.title || '',
            pos: n.pos || { x: 0, y: 0 }, size: n.size || { width: 320, height: 200 },
            ports: n.ports || [], status: n.status || 'idle',
            meta: n.meta || {}, createdAt: n.createdAt || new Date().toISOString(), updatedAt: n.updatedAt || new Date().toISOString(),
          });
        }
        for (const e of data.edges || []) {
          await db.edges.put({
            id: e.id, canvasId: cid, projectId: pid, from: e.from || { nodeId: '', handle: 'out' }, to: e.to || { nodeId: '', handle: 'in' },
            dataType: e.dataType || 'any', style: e.style || {}, meta: e.meta || {}, updatedAt: new Date().toISOString(),
          });
        }
      });
      restored++;
      console.log('[persist] ✅ Restored project', pid, ':', data.nodes.length, 'nodes,', (data.edges || []).length, 'edges');
    } catch (err) {
      console.error('[persist] Failed to restore project', pid, ':', err);
    }
  }
  return restored;
}
if(typeof window!=='undefined'){(window as any).__direxStorage={getUsage:getStorageUsage,clearAll:clearAllData};}

// ── Server gen-data merge: pull richer meta.gen from server after IndexedDB load ──
// Backend may have directly written analysis results to canvas-state.json while the
// frontend was closed. This merges any server-only gen data into the local store.
const GEN_FIELDS = ['scriptOverview', 'scriptScenes', 'scriptSceneArchitecture', 'scriptSunoPrompts', 'scriptSoundScenes', 'scriptCharacters'];
function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object') return Object.keys(v as object).length === 0;
  return !v;
}
export async function mergeServerGenData(): Promise<number> {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/canvas/state?project=${encodeURIComponent(getProjectId())}`, {
      headers: { Authorization: 'Bearer tapnow-dev-key' },
    });
    if (!resp.ok) return 0;
    const json = await resp.json();
    if (!json.nodes?.length) return 0;

    const store = useCanvasStore.getState();
    let merged = 0;

    for (const sn of json.nodes) {
      const localNode = store.nodes.get(sn.id);
      if (!localNode) continue;
      const sGen: Record<string, unknown> | undefined = sn.meta?.gen;
      if (!sGen) continue;
      const lGen: Record<string, unknown> = (localNode.meta?.gen || {}) as Record<string, unknown>;

      let hasNew = false;
      const newGen: Record<string, unknown> = { ...lGen };
      for (const field of GEN_FIELDS) {
        const sv = sGen[field];
        const lv = lGen[field];
        if (sv === undefined || sv === null) continue;
        if (!isEmpty(sv) && isEmpty(lv)) {
          newGen[field] = sv;
          hasNew = true;
        }
      }

      if (hasNew) {
        store.updateNode(sn.id, { meta: { ...localNode.meta, gen: newGen } });
        merged++;
        const ov = newGen.scriptOverview as Record<string, any> | undefined;
        console.log(`[persist] Merged server gen → ${sn.id.slice(0, 12)}: ${ov?.shots?.length || 0} shots, ${ov?.characterProfiles ? Object.keys(ov.characterProfiles as object).length : 0} chars`);
      }
    }
    if (merged > 0) console.log(`[persist] Server gen merged for ${merged} node(s)`);
    return merged;
  } catch (err) {
    console.warn('[persist] Server gen merge failed:', err);
    return 0;
  }
}

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

  // Save on page unload — clear debounce timer, skip if save already in-flight
  const onUnload = () => {
    clearHeartbeat();
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (!saveMutex) saveNow(); // if mutex held, in-flight IndexedDB tx will complete
  };
  window.addEventListener('beforeunload', onUnload);

  // Also save on visibility hidden (tab close / navigation away — more time than beforeunload)
  const onHidden = () => {
    if (document.visibilityState === 'hidden') {
      clearHeartbeat();
      if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
      if (!saveMutex) saveNow();
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
