/* === Unified Graph Model === */
/* Node / Edge / Asset / Job — the four core entities */

// ─── Node ────────────────────────────────────────
export type NodeStatus = 'idle' | 'running' | 'succeeded' | 'failed' | 'blocked';

export type NodeType =
  | 'shot'
  | 'image.generate'
  | 'image.editor'
  | 'video.generate'
  | 'audio.generate'
  | 'world.3d';

export interface Port {
  id: string;
  label: string;
  side: 'left' | 'right';
  dataType: PortDataType;
  required?: boolean;
}

export interface CanvasNode {
  id: string;
  type: NodeType;
  title: string;
  pos: { x: number; y: number };
  size: { w: number; h: number };
  ports: Port[];
  status: NodeStatus;
  meta: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ─── Edge ────────────────────────────────────────
export type PortDataType =
  | 'shot.struct'
  | 'prompt.text'
  | 'asset.image'
  | 'asset.mask'
  | 'asset.style'
  | 'any';

export type EdgeSemantic = 'reference' | 'trigger' | 'dataflow';

export interface EdgeStyle {
  color?: string;
  width?: number;
  animated?: boolean;
}

export interface CanvasEdge {
  id: string;
  from: { nodeId: string; portId: string };
  to: { nodeId: string; portId: string };
  dataType: PortDataType;
  style: EdgeStyle;
  meta: { semantic: EdgeSemantic };
}

// Port type compatibility map
export const PORT_COMPAT: Record<PortDataType, PortDataType[]> = {
  'shot.struct': ['prompt.text', 'any'],
  'prompt.text': ['prompt.text', 'any'],
  'asset.image': ['asset.image', 'any'],
  'asset.mask': ['asset.mask', 'any'],
  'asset.style': ['asset.style', 'any'],
  'any': ['shot.struct', 'prompt.text', 'asset.image', 'asset.mask', 'asset.style', 'any'],
};

export function arePortsCompatible(source: PortDataType, target: PortDataType): boolean {
  if (source === 'any' || target === 'any') return true;
  return PORT_COMPAT[source]?.includes(target) ?? false;
}

// ─── Asset ───────────────────────────────────────
export type AssetType = 'image' | 'video' | 'text' | 'mask';

export interface AssetVariant {
  label: string; // 'thumbnail' | 'preview' | 'original' | '2K' | '4K'
  uri: string;
  width: number;
  height: number;
}

export interface AssetLineage {
  parentAssetId: string;
  toolId: string;
  jobId: string;
}

export interface Asset {
  id: string;
  type: AssetType;
  uri: string;
  variants: AssetVariant[];
  lineage: AssetLineage | null;
  meta: {
    prompt?: string;
    model?: string;
    seed?: number;
    width?: number;
    height?: number;
    exif?: Record<string, unknown>;
  };
  createdAt: string;
  updatedAt: string;
}

// ─── Job ─────────────────────────────────────────
export type JobKind = 'generate' | 'edit' | 'export' | 'compile';
export type JobStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'canceled';

export interface Job {
  id: string;
  kind: JobKind;
  nodeId: string;
  toolId?: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  status: JobStatus;
  cost: number;
  durationMs: number;
  logs: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Agent ───────────────────────────────────────
export type AgentActionKind = 'suggest' | 'execute' | 'compile';

export interface AgentAction {
  id: string;
  agentId: string;
  kind: AgentActionKind;
  context: Record<string, unknown>;
  proposal: string;
  execution: Record<string, unknown> | null;
  createdAt: string;
}

// ─── Shot-specific types ─────────────────────────
export interface ShotMeta {
  intent_cn: string;
  framing: string;
  movement: string;
  lens: string;
  angle: string;
  key: string;
  mood: string;
  color: string;
}

// ─── ImageGenerate-specific types ────────────────
export interface ImageGenMeta {
  prompt: string;
  negativePrompt: string;
  model: string;
  aspect: string;
  resolution: string;
  quality: string;
  seed?: number;
  resultAssetIds: string[];
}

// ─── Event / Audit ───────────────────────────────
export type AuditEvent =
  | 'node.create'
  | 'node.update'
  | 'node.delete'
  | 'edge.create'
  | 'edge.delete'
  | 'asset.upload'
  | 'asset.derive'
  | 'asset.export'
  | 'job.create'
  | 'job.start'
  | 'job.finish'
  | 'job.fail'
  | 'job.cancel'
  | 'job.retry'
  | 'agent.suggest'
  | 'agent.execute';
