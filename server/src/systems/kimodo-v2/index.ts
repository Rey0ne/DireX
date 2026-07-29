/* === Kimodo v2 — Module Index ===
 * Standalone module. Imported conditionally when KIMODO_V2_ENABLED=true.
 * Re-exports everything and runs startup initialization.
 */

export * from './types.js';
export * from './euler-quaternion.js';
export * from './bvh-parser.js';
export * from './bvh-writer.js';
export { callKimodoGenerate, callKimodoAdvanced, checkHealth } from './kimodo-client.js';
export type {
  KimodoGenerateParams,
  KimodoGenerateResult,
  KimodoAdvancedParams,
  KimodoHealth,
} from './kimodo-client.js';
export {
  readSession,
  writeSession,
  deleteSession,
  listSessionIds,
  writeSessionBvh,
  getSessionBvhPath,
  readHistory,
  appendHistory,
  initSessionStore,
  shutdownSessionStore,
} from './session-store.js';
export { blendBVH, blendChain, skeletonsMatch } from './blend-engine.js';
export type { BlendResult } from './blend-engine.js';
export { generateSegments, readSegmentBvh } from './segment-engine.js';
export type { SegmentEngineOptions } from './segment-engine.js';
export { createVariants, acceptVariant, rejectVariant } from './variant-manager.js';
export type { CreateVariantsOptions, AcceptVariantResult, RejectVariantResult } from './variant-manager.js';
export { decomposePath } from './path-engine.js';
export type { DecomposePathResult } from './path-engine.js';
export { generateTimeline, generatePath } from './orchestrator.js';
export {
  uploadSkeleton,
  listSkeletons,
  getSkeleton,
  getSkeletonBvhPath,
  readSkeletonBvh,
} from './skeleton-store.js';

// ── Startup ──────────────────────────────────────

let _initialized = false;

export async function ensureInitialized(): Promise<void> {
  if (_initialized) return;
  _initialized = true;
  const { initSessionStore } = await import('./session-store.js');
  initSessionStore();
  console.log('[kimodo-v2] Module initialized');
}
