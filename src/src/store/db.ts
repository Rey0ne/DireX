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
    this.version(1).stores({
      projects: 'id,updatedAt',
      canvases: 'id,projectId,updatedAt',
      nodes: 'id,canvasId,type,updatedAt',
      edges: 'id,canvasId,updatedAt',
      assets: 'id,projectId,type,updatedAt',
      jobs: 'id,projectId,status,updatedAt',
    });
  }
}

export const db = new TapNowDB();
