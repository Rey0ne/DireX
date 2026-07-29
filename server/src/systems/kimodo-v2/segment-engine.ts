/* === Kimodo v2 — Segment Engine ===
 * Executes multi-segment sequential generation.
 * For each segment: call Kimodo /generate → save BVH to disk → parse.
 * Collects all segments with metadata for the blend engine.
 */

import fs from 'node:fs';
import { callKimodoGenerate } from './kimodo-client.js';
import { writeSessionBvh, getSessionBvhPath } from './session-store.js';
import { parseBVH } from './bvh-parser.js';
import type { SegmentSpec, GeneratedSegment } from './types.js';

// ── Public API ───────────────────────────────────

export interface SegmentEngineOptions {
  sessionId: string;
  segments: SegmentSpec[];
  denoisingSteps?: number;    // default 50
  baseSeed?: number;           // default -1
  /** Called after each segment completes. segmentIndex, segment, totalSegments */
  onProgress?: (index: number, seg: GeneratedSegment, total: number) => void;
}

/**
 * Generate motion for each segment sequentially.
 * Each segment gets a unique seed (baseSeed + index).
 */
export async function generateSegments(
  opts: SegmentEngineOptions,
): Promise<GeneratedSegment[]> {
  const { sessionId, segments, denoisingSteps = 50, baseSeed } = opts;
  const results: GeneratedSegment[] = [];

  const seedBase = baseSeed != null ? baseSeed : Math.floor(Math.random() * 2_000_000_000);

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const seed = seedBase + i;

    console.log(`[kimodo-v2] Segment ${i + 1}/${segments.length}: "${seg.prompt.slice(0, 60)}" frames=${seg.durationFrames} seed=${seed}`);

    const gen = await callKimodoGenerate({
      prompt: seg.prompt,
      numFrames: seg.durationFrames,
      denoisingSteps,
      seed,
      firstHeadingAngle: seg.firstHeadingAngle ?? 0,
    });

    // Save BVH to session directory
    const bvhBuffer = Buffer.from(gen.bvhBase64, 'base64');
    const fileName = `seg-${i}.bvh`;
    const bvhPath = writeSessionBvh(sessionId, fileName, bvhBuffer);

    // Parse for metadata
    const bvhData = parseBVH(bvhBuffer.toString('utf-8'));

    const result: GeneratedSegment = {
      index: i,
      prompt: seg.prompt,
      requestedFrames: seg.durationFrames,
      generatedFrames: gen.numFrames,
      seedUsed: gen.seedUsed,
      generationTimeS: gen.generationTimeS,
      bvhPath,
      bvhBase64: gen.bvhBase64,
      posedJoints: gen.posedJoints,
      jointNames: gen.jointNames,
    };

    results.push(result);
    opts.onProgress?.(i, result, segments.length);
  }

  return results;
}

/**
 * Read segment BVH text from disk.
 * Used by blend-engine to load pre-generated segments.
 */
export function readSegmentBvh(sessionId: string, segmentIndex: number): string {
  const bvhPath = getSessionBvhPath(sessionId, `seg-${segmentIndex}.bvh`);
  return fs.readFileSync(bvhPath, 'utf-8');
}
