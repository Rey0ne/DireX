/* === Kimodo v2 — Type Definitions === */

// ── Kimodo Capabilities ─────────────────────────

export interface KimodoV2Capabilities {
  blending: boolean;
  pathGuidance: boolean;
  variants: boolean;
  keyframePins: boolean;
  endEffectorPinning: boolean;
  customSkeleton: boolean;
}

// ── Pose specification ──────────────────────────

export interface PoseSpec {
  /** Joint name → world-space [x, y, z] position */
  jointPositions: Record<string, [number, number, number]>;
  /** "world" (global coordinates) or "local" (relative to parent joint) */
  format: 'world' | 'local';
}

// ── End-effector pin ────────────────────────────

export interface EndEffectorPin {
  joint: string;
  position: [number, number, number];
  frameRange: [number, number]; // [startFrame, endFrame]
}

// ── Segment specification ───────────────────────

export interface SegmentSpec {
  prompt: string;
  durationFrames: number;     // 30–900
  keyframeStart?: PoseSpec;
  keyframeEnd?: PoseSpec;
  firstHeadingAngle?: number; // -PI to PI, injected by path-engine
}

export interface GeneratedSegment {
  index: number;
  prompt: string;
  requestedFrames: number;
  generatedFrames: number;
  seedUsed: number;
  generationTimeS: number;
  bvhPath: string;            // file path on disk
  bvhBase64: string;
  posedJoints: number[][][];  // [T, J, 3]
  jointNames: string[];
}

export interface BlendRegion {
  fromSegmentIndex: number;
  toSegmentIndex: number;
  blendFrames: number;
  fromSourceRange: [number, number];
  toSourceRange: [number, number];
}

// ── Path waypoint ───────────────────────────────

export interface PathWaypoint {
  x: number;
  y: number;                  // ground-plane forward axis
  z?: number;                 // height, defaults to 0
  label?: string;             // per-segment prompt override
  frameAllocation?: number;   // frontend: frames for segment reaching this waypoint (waypoint[0] ignored)
}

export interface PathMetadata {
  waypoints: { x: number; y: number; z: number }[];
  segmentDistances: number[];
  segmentHeadingAngles: number[];
  segmentFrames: number[];
}

// ── Variant ─────────────────────────────────────

export interface VariantRecord {
  variantId: string;          // "v0", "v1", ...
  seedUsed: number;
  numFrames: number;
  generationTimeS: number;
  bvhPath: string;            // file path on disk
  fileSizeBytes: number;
  previewFrame: number[][];   // [J, 3] — first frame posed joints for thumbnail
  status: 'generated' | 'accepted' | 'rejected';
}

// ── Session ─────────────────────────────────────

export type SessionType = 'single' | 'variants' | 'timeline' | 'path';
export type SessionStatus = 'generating' | 'pending' | 'accepted' | 'rejected' | 'archived';

export interface KimodoV2Session {
  sessionId: string;
  type: SessionType;
  status: SessionStatus;
  label?: string;
  prompt: string;
  createdAt: string;           // ISO8601
  expiresAt: string;           // ISO8601, default +24h
  variants?: VariantRecord[];
  segments?: GeneratedSegment[];
  blendRegions?: BlendRegionRecord[];
  pathMetadata?: PathMetadata;
  acceptedVariantId?: string;
  promotedBvhUrl?: string;
  totalGenerationTimeS?: number;
  totalFrames?: number;
  fps?: number;
  jointNames?: string[];
  numVariants?: number;
  bvhPath?: string;              // for type=timeline/path: blended.bvh path
  posedJoints?: number[][][];    // [T, J, 3] — all frames
}

export interface BlendRegionRecord {
  fromSegmentIndex: number;
  toSegmentIndex: number;
  blendFrames: number;
  fromSourceRange: [number, number];
  toSourceRange: [number, number];
}

// ── Skeleton ────────────────────────────────────

export interface SkeletonRecord {
  skeletonId: string;
  label?: string;
  jointCount: number;
  jointNames: string[];
  bvhPath: string;
  fileSizeBytes: number;
  createdAt: string;
  somaskel77Compat: SkeletonCompatReport;
}

export interface SkeletonCompatReport {
  compatible: boolean;
  mappedJoints: number;
  unmappedJoints: number;
  missingSomaskel77Joints: number;
  canRetarget: boolean;
}

// ── API request/response shapes ──────────────────

export interface GenerateRequest {
  prompt: string;
  numFrames?: number;           // default 90
  denoisingSteps?: number;      // default 50
  seed?: number;                // -1 for random
  firstHeadingAngle?: number;   // -PI to PI
  keyframeStart?: PoseSpec;
  keyframeEnd?: PoseSpec;
  endEffectorPins?: EndEffectorPin[];
  sessionLabel?: string;
}

export interface GenerateResponse {
  sessionId: string;
  bvhUrl: string;
  bvhBase64: string;
  posedJoints: number[][][];
  jointNames: string[];
  numFrames: number;
  fps: number;
  generationTimeS: number;
  seedUsed: number;
  promptUsed: string;
  warnings?: string[];
}

export interface GenerateVariantsRequest {
  prompt: string;
  numVariants: number;          // 2–6
  numFrames?: number;
  denoisingSteps?: number;
  seed?: number;
  firstHeadingAngle?: number;
  sessionLabel?: string;
}

export interface GenerateVariantsResponse {
  sessionId: string;
  promptUsed: string;
  numVariants: number;
  variants: VariantRecord[];
  totalGenerationTimeS: number;
}

export interface AcceptVariantRequest {
  sessionId: string;
  variantId: string;
  keepRejected?: boolean;
  saveAs?: string;
}

export interface AcceptVariantResponse {
  acceptedVariantId: string;
  promotedBvhUrl: string;
  rejected: { variantId: string; cleanedUp: boolean }[];
  sessionId: string;
}

export interface RejectVariantRequest {
  sessionId: string;
  variantId: string;
}

export interface RejectVariantResponse {
  rejectedVariantId: string;
  remainingVariants: string[];
  sessionId: string;
}

export interface GenerateTimelineRequest {
  segments: {
    prompt: string;
    durationFrames: number;       // 30–900
    keyframeStart?: PoseSpec;
    keyframeEnd?: PoseSpec;
  }[];
  blendFrames?: number;           // default 20, range 10–60
  denoisingSteps?: number;        // default 50
  baseSeed?: number;              // default -1
  sessionLabel?: string;
}

export interface GenerateTimelineResponse {
  sessionId: string;
  totalFrames: number;
  fps: number;
  durationSeconds: number;
  segments: GeneratedSegment[];
  blendRegions: BlendRegion[];
  blendedBvhUrl: string;
  blendedBvhBase64: string;
  posedJoints: number[][][];
  jointNames: string[];
  totalGenerationTimeS: number;
}

export interface GeneratePathRequest {
  prompt: string;
  waypoints: PathWaypoint[];
  totalFrames?: number;
  blendFrames?: number;
  denoisingSteps?: number;
  baseSeed?: number;
  sessionLabel?: string;
}

export interface GeneratePathResponse extends GenerateTimelineResponse {
  pathMetadata: PathMetadata;
}

export interface HistoryEntry {
  sessionId: string;
  type: SessionType;
  label?: string;
  createdAt: string;
  acceptedAt: string;
  acceptedVariantId?: string;
  bvhUrl: string;
  numFrames: number;
  prompt: string;
}
