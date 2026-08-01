import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
const _w=console.warn;console.warn=function(...a:any[]){const s=typeof a[0]==='string'?a[0]:'';if(s.includes('PCFSoftShadowMap')||s.includes('THREE.Clock'))return;_w.apply(console,a)};

// ── Emergency recovery: restore IndexedDB from server when it was cleared ──
(async () => {
  try {
    const { db } = await import('./store/db');
    const { diag } = await import('./utils/diagnostics');
    const hasProjects = (await db.projects.count()) > 0;
    if (hasProjects) {
      diag.markServerOk();
      return; // IndexedDB is healthy, nothing to recover
    }

    diag.markServerOk();

    // 1. Fetch project list from server
    const projResp = await fetch('/api/canvas/projects');
    const projJson = await projResp.json();
    const serverProjects: any[] = projJson.projects || [];
    if (serverProjects.length === 0) {
      diag.loadFailed('project_list', 'No projects on server either — truly empty');
      return;
    }

    // 2. For each project, seed IndexedDB
    let recovered = 0;
    let totalNodes = 0;
    for (const sp of serverProjects) {
      const pid = sp.id;
      const cid = pid + '-canvas';
      const now = new Date().toISOString();

      try {
        const stateResp = await fetch('/api/canvas/state?project=' + encodeURIComponent(pid));
        const stateJson = await stateResp.json();
        const nodes = stateJson.nodes || [];
        const edges = stateJson.edges || [];

        await db.transaction('rw', [db.projects, db.canvases, db.nodes, db.edges], async () => {
          await db.projects.put({ id: pid, name: sp.name || pid, description: '', updatedAt: sp.updatedAt || now });
          await db.canvases.put({ id: cid, projectId: pid, name: '主画布', viewport: { x: 0, y: 0, zoom: 1 }, updatedAt: now });
          for (const n of nodes) {
            await db.nodes.put({
              id: n.id, canvasId: cid, projectId: pid,
              type: n.type || 'image.generate', title: n.title || '',
              pos: n.pos || { x: 0, y: 0 }, size: n.size || { width: 380, height: 200 },
              ports: n.ports || [], status: n.status || 'idle',
              meta: n.meta || {}, createdAt: n.createdAt || now, updatedAt: n.updatedAt || now,
            });
          }
          for (const e of edges) {
            await db.edges.put({
              id: e.id, canvasId: cid, projectId: pid,
              from: e.from || { nodeId: '', handle: 'out' },
              to: e.to || { nodeId: '', handle: 'in' },
              dataType: e.dataType || 'any', style: e.style || {},
              meta: e.meta || {}, updatedAt: now,
            });
          }
        });
        recovered++;
        totalNodes += nodes.length;
      } catch (e) {
        diag.loadFailed('recover_project:' + pid, String(e).slice(0, 100));
      }
    }
    diag.recoveryTriggered(recovered, totalNodes);
  } catch (e) {
    // Dynamic import failed or IndexedDB is completely broken
    console.error('[recovery] Catastrophic:', e);
  }
})();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>
)
