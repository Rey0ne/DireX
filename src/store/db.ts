/* === Dexie/IndexedDB persistence layer === */
/* Tables: projects, canvases, nodes, edges, assets, jobs */

import Dexie, { type Table } from 'dexie';

export interface DBProject {
  id: string;
  name: string;
  description: string;
  updatedAt: string;
}

export interface DBCanvas {
  id: string;
  projectId: string;
  name: string;
  viewport: { x: number; y: number; zoom: number };
  updatedAt: string;
}

export interface DBNode {
  id: string;
  canvasId: string;
  projectId: string;
  type: string;
  title: string;
  pos: { x: number; y: number };
  size: { w: number; h: number };
  ports: unknown;
  status: string;
  meta: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface DBEdge {
  id: string;
  canvasId: string;
  projectId: string;
  from: { nodeId: string; portId: string };
  to: { nodeId: string; portId: string };
  dataType: string;
  style: unknown;
  meta: unknown;
  updatedAt: string;
}

export interface DBAsset {
  id: string;
  projectId: string;
  type: string;
  uri: string;
  variants: unknown;
  lineage: unknown;
  meta: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface DBJob {
  id: string;
  projectId: string;
  kind: string;
  nodeId: string;
  toolId?: string;
  input: unknown;
  output: unknown;
  status: string;
  cost: number;
  durationMs: number;
  logs: unknown;
  createdAt: string;
  updatedAt: string;
}

class TapNowDB extends Dexie {
  projects!: Table<DBProject, string>;
  canvases!: Table<DBCanvas, string>;
  nodes!: Table<DBNode, string>;
  edges!: Table<DBEdge, string>;
  assets!: Table<DBAsset, string>;
  jobs!: Table<DBJob, string>;

  constructor() {
    super('tapnow-canvas');

    // v1: original schema
    this.version(1).stores({
      projects: 'id,updatedAt',
      canvases: 'id,projectId,updatedAt',
      nodes: 'id,canvasId,type,updatedAt',
      edges: 'id,canvasId,updatedAt',
      assets: 'id,projectId,type,updatedAt',
      jobs: 'id,projectId,status,updatedAt',
    });

    // v2: add projectId to nodes & edges for per-project isolation
    this.version(2).stores({
      projects: 'id,updatedAt',
      canvases: 'id,projectId,updatedAt',
      nodes: 'id,canvasId,projectId,type,updatedAt',
      edges: 'id,canvasId,projectId,updatedAt',
      assets: 'id,projectId,type,updatedAt',
      jobs: 'id,projectId,status,updatedAt',
    }).upgrade(async tx => {
      console.log('[db] Migrating IndexedDB v1→v2: adding projectId to nodes/edges');
      const canvases = await tx.table('canvases').toArray();
      const c2p = new Map<string, string>(canvases.map((c: any) => [c.id, c.projectId]));
      let nodeCount = 0, edgeCount = 0;
      await tx.table('nodes').toCollection().modify((node: any) => {
        if (!node.projectId) { node.projectId = c2p.get(node.canvasId) || 'default'; nodeCount++; }
      });
      await tx.table('edges').toCollection().modify((edge: any) => {
        if (!edge.projectId) { edge.projectId = c2p.get(edge.canvasId) || 'default'; edgeCount++; }
      });
      console.log(`[db] Migration complete: ${nodeCount} nodes, ${edgeCount} edges updated`);
    });
  }
}

export const db = new TapNowDB();
