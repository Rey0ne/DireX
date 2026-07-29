/* === Kimodo v2 — Orchestrator ===
 * High-level workflow coordinator.
 * Ties together segment-engine, blend-engine, path-engine, variant-manager.
 */

import { v4 as uuid } from 'uuid';
import { generateSegments, readSegmentBvh } from './segment-engine.js';
import { blendChain } from './blend-engine.js';
import { decomposePath } from './path-engine.js';
import { parseBVH } from './bvh-parser.js';
import { writeSessionBvh, writeSession } from './session-store.js';
import type {
  KimodoV2Session,
  GenerateTimelineRequest,
  GenerateTimelineResponse,
  GeneratePathRequest,
  GeneratePathResponse,
  BlendRegion,
} from './types.js';

// ── Timeline ─────────────────────────────────────

export async function generateTimeline(
  request: GenerateTimelineRequest,
): Promise<GenerateTimelineResponse> {
  const sessionId = uuid();
  const blendFrames = Math.min(Math.max(request.blendFrames || 20, 10), 60);
  const denoisingSteps = request.denoisingSteps || 50;

  // Create session
  const session: KimodoV2Session = {
    sessionId,
    type: 'timeline',
    status: 'generating',
    label: request.sessionLabel,
    prompt: request.segments.map(s => s.prompt).join(' → '),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
  writeSession(session);

  // Generate each segment
  const segments = await generateSegments({
    sessionId,
    segments: request.segments.map(s => ({
      prompt: s.prompt,
      durationFrames: s.durationFrames,
      keyframeStart: s.keyframeStart,
      keyframeEnd: s.keyframeEnd,
    })),
    denoisingSteps,
    baseSeed: request.baseSeed,
  });

  // Build blend regions metadata
  const blendRegions: BlendRegion[] = [];
  for (let i = 0; i < segments.length - 1; i++) {
    blendRegions.push({
      fromSegmentIndex: i,
      toSegmentIndex: i + 1,
      blendFrames,
      fromSourceRange: [segments[i].generatedFrames - blendFrames, segments[i].generatedFrames - 1],
      toSourceRange: [0, blendFrames - 1],
    });
  }

  // Chain-blend all segments
  const bvhTexts = segments.map((_, i) => readSegmentBvh(sessionId, i));
  const blendResult = blendChain(bvhTexts, blendFrames);

  // Save blended BVH
  const blendedBuffer = Buffer.from(blendResult.blendedBvhText, 'utf-8');
  const blendedBvhPath = writeSessionBvh(sessionId, 'blended.bvh', blendedBuffer);

  // Parse blended BVH for posedJoints
  const parsed = parseBVH(blendResult.blendedBvhText);
  const totalFrames = parsed.motion.frames;
  const durationSeconds = totalFrames / 30;  // 30 fps default

  // Update session
  session.segments = segments;
  session.blendRegions = blendRegions;
  session.status = 'pending';
  session.bvhPath = blendedBvhPath;
  session.totalFrames = totalFrames;
  session.fps = 30;
  session.totalGenerationTimeS = segments.reduce((s, seg) => s + seg.generationTimeS, 0);
  session.jointNames = segments[0]?.jointNames;
  writeSession(session);

  return {
    sessionId,
    totalFrames,
    fps: 30,
    durationSeconds: Math.round(durationSeconds * 100) / 100,
    segments,
    blendRegions,
    blendedBvhUrl: `/api/kimodo-v2/sessions/${sessionId}/bvh/blended.bvh`,
    blendedBvhBase64: blendedBuffer.toString('base64'),
    posedJoints: segments[0]?.posedJoints || [],
    jointNames: segments[0]?.jointNames || [],
    totalGenerationTimeS: session.totalGenerationTimeS!,
  };
}

// ── Path ─────────────────────────────────────────

export async function generatePath(
  request: GeneratePathRequest,
): Promise<GeneratePathResponse> {
  // Decompose path into segments
  const { segments, metadata } = decomposePath(
    request.waypoints,
    request.prompt,
    request.totalFrames,
  );

  // Generate as a timeline
  const timelineResult = await generateTimeline({
    segments: segments.map(s => ({
      prompt: s.prompt,
      durationFrames: s.durationFrames,
    })),
    blendFrames: request.blendFrames,
    denoisingSteps: request.denoisingSteps,
    baseSeed: request.baseSeed,
    sessionLabel: request.sessionLabel,
  });

  return {
    ...timelineResult,
    pathMetadata: metadata,
  };
}
