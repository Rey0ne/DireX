/* === Kimodo v2 — Express Router ===
 * Standalone route module. Mounted conditionally at /api/kimodo-v2.
 *
 * Endpoints (13 total):
 *   GET  /health                   — health + capabilities
 *   POST /generate                 — single gen (auto-detects v2)
 *   POST /generate-variants        — N-variant batch
 *   POST /accept-variant           — accept one
 *   POST /reject-variant           — reject one
 *   GET  /session/:sessionId       — session metadata
 *   DELETE /session/:sessionId     — delete session
 *   POST /generate-timeline        — multi-segment (v2 native or TS blend)
 *   POST /generate-path            — path-guided
 *   GET  /history                  — accepted log
 *   POST /upload-skeleton          — upload BVH skeleton
 *   GET  /skeletons                — list skeletons
 *   GET  /sessions/:id/bvh/:file   — serve session BVH
 */

import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import path from 'node:path';
import fs from 'node:fs';
import multer from 'multer';

import {
  checkHealth,
  ensureInitialized,
  readSession,
  deleteSession as deleteSessionStore,
  readHistory,
  getSessionBvhPath,
} from '../systems/kimodo-v2/index.js';
import { createVariants, acceptVariant, rejectVariant } from '../systems/kimodo-v2/variant-manager.js';
import { generateTimeline, generatePath } from '../systems/kimodo-v2/orchestrator.js';
import {
  uploadSkeleton,
  listSkeletons,
  getSkeleton,
  getSkeletonBvhPath,
} from '../systems/kimodo-v2/skeleton-store.js';
import { callKimodoAdvanced, callKimodoGenerate } from '../systems/kimodo-v2/kimodo-client.js';

const router = Router();

// ── Multer for skeleton upload ───────────────────

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
});

// ── Translation helper ────────────────────────────

const CJK_RE = /[一-鿿㐀-䶿]/;

async function translatePrompt(prompt: string): Promise<{ translated: string; wasTranslated: boolean }> {
  if (!CJK_RE.test(prompt)) {
    return { translated: prompt, wasTranslated: false };
  }
  try {
    const { gpt5Chat } = await import('../systems/ai/gemini.js');
    const systemPrompt = `You are a motion description translator. Translate Chinese motion descriptions to English for a motion generation AI (Kimodo). Rules:
1. Be specific about movement style, speed, emotion, body mechanics
2. Use cinematic/animation terminology
3. Keep the translated prompt under 200 characters
4. Output ONLY the English translation, no explanations, no quotes`;

    const translated = await gpt5Chat(
      [{ role: 'user', content: [{ type: 'input_text', text: systemPrompt + '\n\n中文: ' + prompt + '\nEnglish:' }] }],
      { effort: 'low', timeoutMs: 30000, maxOutputTokens: 300 },
    );
    if (translated) {
      console.log('[kimodo-v2] Translated:', prompt.slice(0, 60), '→', translated.slice(0, 80));
      return { translated, wasTranslated: true };
    }
  } catch (e) {
    console.log('[kimodo-v2] Translation failed, using raw:', String(e).slice(0, 80));
  }
  return { translated: prompt, wasTranslated: false };
}

// ── Init ─────────────────────────────────────────

router.use(async (_req, _res, next) => {
  await ensureInitialized();
  next();
});

// ── GET /health ───────────────────────────────────

router.get('/health', async (_req: Request, res: Response) => {
  try {
    const health = await checkHealth();
    res.json({
      status: health.status,
      v1: {
        status: health.v1.status,
        gpu: health.v1.gpu,
        vramUsedGb: health.v1.vramUsedGb,
        vramTotalGb: health.v1.vramTotalGb,
        modelLoaded: health.v1.modelLoaded,
        modelLoadTimeS: health.v1.modelLoadTimeS,
        ...(health.v1.error ? { error: health.v1.error } : {}),
      },
      v2: {
        status: health.v2.status,
        version: (health.v2 as any).version,
        capabilities: (health.v2 as any).capabilities,
        ...(health.v2.reason ? { reason: health.v2.reason } : {}),
      },
      capabilities: health.capabilities,
      module: 'kimodo-v2',
      version: '0.3.0',
    });
  } catch (e: any) {
    res.status(500).json({ error: String(e).slice(0, 300) });
  }
});

// ── POST /translate — Chinese → English ──────────

router.post('/translate', async (req: Request, res: Response) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing prompt' });
    return;
  }
  const result = await translatePrompt(prompt);
  res.json({ original: prompt, ...result });
});

// ── POST /generate — Enhanced (auto-detects v2) ──

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { prompt, numFrames, denoisingSteps, seed, firstHeadingAngle,
            keyframeStart, keyframeEnd, endEffectorPins, sessionLabel } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Missing prompt' });
      return;
    }

    // Auto-translate Chinese → English
    const { translated: englishPrompt, wasTranslated } = await translatePrompt(prompt);

    // Build advanced params
    const keyframes: any[] = [];
    if (keyframeStart) {
      keyframes.push({
        frame: 0,
        jointRotations: keyframeStart.jointPositions || {},
        rootPosition: keyframeStart.rootPosition,
        fillMode: keyframeStart.fillMode || 'generate',
      });
    }
    if (keyframeEnd) {
      const frames = numFrames || 90;
      keyframes.push({
        frame: frames - 1,
        jointRotations: keyframeEnd.jointPositions || {},
        rootPosition: keyframeEnd.rootPosition,
        fillMode: keyframeEnd.fillMode || 'generate',
      });
    }

    const gen = await callKimodoAdvanced({
      prompt: englishPrompt,
      numFrames: numFrames || 90,
      denoisingSteps: denoisingSteps || 50,
      seed: seed != null ? seed : -1,
      firstHeadingAngle: firstHeadingAngle ?? 0,
      keyframes: keyframes.length > 0 ? keyframes : undefined,
      endEffectorPins: endEffectorPins || undefined,
    });

    // Save to session for tracking
    const sessionId = uuid();
    const { writeSession } = await import('../systems/kimodo-v2/session-store.js');
    writeSession({
      sessionId,
      type: 'single',
      status: 'accepted',
      label: sessionLabel,
      prompt,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      totalFrames: gen.numFrames,
      fps: gen.fps,
      jointNames: gen.jointNames,
    });

    res.json({
      sessionId,
      bvhBase64: gen.bvhBase64,
      posedJoints: gen.posedJoints,
      jointNames: gen.jointNames,
      numFrames: gen.numFrames,
      fps: gen.fps,
      generationTimeS: gen.generationTimeS,
      seedUsed: gen.seedUsed,
      promptUsed: englishPrompt,
      originalPrompt: prompt,
      wasTranslated,
      warnings: [],
    });
  } catch (e: any) {
    console.error('[kimodo-v2] /generate error:', e.message);
    res.status(502).json({ error: String(e).slice(0, 300) });
  }
});

// ── POST /generate-variants ─────────────────────

router.post('/generate-variants', async (req: Request, res: Response) => {
  try {
    const { prompt, numVariants, numFrames, denoisingSteps, seed, firstHeadingAngle, sessionLabel } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Missing prompt' });
      return;
    }
    if (!numVariants || numVariants < 2 || numVariants > 6) {
      res.status(400).json({ error: 'numVariants must be 2-6' });
      return;
    }

    // Auto-translate Chinese → English
    const { translated: englishPrompt, wasTranslated } = await translatePrompt(prompt);

    const sessionId = uuid();
    const session = await createVariants({
      sessionId,
      request: { prompt: englishPrompt, numVariants, numFrames, denoisingSteps, seed, firstHeadingAngle, sessionLabel },
    });

    res.json({
      sessionId: session.sessionId,
      promptUsed: englishPrompt,
      originalPrompt: prompt,
      wasTranslated,
      numVariants: session.numVariants,
      variants: (session.variants || []).map(v => ({
        variantId: v.variantId,
        seedUsed: v.seedUsed,
        numFrames: v.numFrames,
        generationTimeS: v.generationTimeS,
        bvhUrl: `/api/kimodo-v2/sessions/${sessionId}/bvh/${v.variantId}.bvh`,
        previewFrame: v.previewFrame,
        fileSizeBytes: v.fileSizeBytes,
      })),
      totalGenerationTimeS: session.totalGenerationTimeS,
    });
  } catch (e: any) {
    console.error('[kimodo-v2] /generate-variants error:', e.message);
    res.status(502).json({ error: String(e).slice(0, 300) });
  }
});

// ── POST /accept-variant ──────────────────────────

router.post('/accept-variant', (req: Request, res: Response) => {
  try {
    const result = acceptVariant(req.body);
    if (!result) { res.status(404).json({ error: 'Session or variant not found' }); return; }
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: String(e).slice(0, 300) });
  }
});

// ── POST /reject-variant ──────────────────────────

router.post('/reject-variant', (req: Request, res: Response) => {
  try {
    const result = rejectVariant(req.body);
    if (!result) { res.status(404).json({ error: 'Session or variant not found' }); return; }
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: String(e).slice(0, 300) });
  }
});

// ── GET /session/:sessionId ───────────────────────

router.get('/session/:sessionId', (req: Request, res: Response) => {
  try {
    const session = readSession(req.params.sessionId as string);
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }
    const variants = (session.variants || []).map(v => ({
      ...v,
      bvhUrl: `/api/kimodo-v2/sessions/${session.sessionId}/bvh/${v.variantId}.bvh`,
    }));
    res.json({ ...session, variants });
  } catch (e: any) {
    res.status(500).json({ error: String(e).slice(0, 300) });
  }
});

// ── DELETE /session/:sessionId ────────────────────

router.delete('/session/:sessionId', (req: Request, res: Response) => {
  try {
    const deleted = deleteSessionStore(req.params.sessionId as string);
    if (!deleted) { res.status(404).json({ error: 'Session not found' }); return; }
    res.json({ deleted: true, sessionId: req.params.sessionId });
  } catch (e: any) {
    res.status(500).json({ error: String(e).slice(0, 300) });
  }
});

// ── POST /generate-timeline ─────────────────────

router.post('/generate-timeline', async (req: Request, res: Response) => {
  try {
    const { segments, blendFrames, denoisingSteps, baseSeed, sessionLabel } = req.body;
    if (!segments || !Array.isArray(segments) || segments.length < 2) {
      res.status(400).json({ error: 'Need at least 2 segments' });
      return;
    }

    // Auto-translate each segment's prompt
    const translatedSegments = await Promise.all(segments.map(async (seg: any) => {
      const { translated } = await translatePrompt(seg.prompt || '');
      return { ...seg, prompt: translated, originalPrompt: seg.prompt };
    }));

    const result = await generateTimeline({ segments: translatedSegments, blendFrames, denoisingSteps, baseSeed, sessionLabel });
    res.json(result);
  } catch (e: any) {
    console.error('[kimodo-v2] /generate-timeline error:', e.message);
    res.status(502).json({ error: String(e).slice(0, 300) });
  }
});

// ── POST /generate-path ─────────────────────────

router.post('/generate-path', async (req: Request, res: Response) => {
  try {
    const { prompt, waypoints, totalFrames, blendFrames, denoisingSteps, baseSeed, sessionLabel } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Missing prompt' });
      return;
    }
    if (!waypoints || !Array.isArray(waypoints) || waypoints.length < 2) {
      res.status(400).json({ error: 'Need at least 2 waypoints' });
      return;
    }

    // Auto-translate Chinese → English
    const { translated: englishPrompt, wasTranslated } = await translatePrompt(prompt);

    // Map frontend waypoints {x,z,frameAllocation} → backend PathWaypoint {x,y,z,frameAllocation}
    // Frontend Z (Three.js forward) → Backend Y (Kimodo ground-plane forward)
    const mappedWaypoints = waypoints.map((w: any) => ({
      x: w.x ?? 0,
      y: w.z ?? w.y ?? 0,  // frontend z = forward → backend y
      z: 0,                 // height, ground level
      frameAllocation: w.frameAllocation,
    }));
    // Use frontend frameAllocation sum as totalFrames if not explicitly provided
    const effectiveTotalFrames = totalFrames
      || (mappedWaypoints.every((w: any) => typeof w.frameAllocation === 'number')
        ? mappedWaypoints.reduce((s: number, w: any) => s + w.frameAllocation, 0)
        : undefined);

    const result = await generatePath({ prompt: englishPrompt, waypoints: mappedWaypoints, totalFrames: effectiveTotalFrames, blendFrames, denoisingSteps, baseSeed, sessionLabel });
    res.json(result);
  } catch (e: any) {
    console.error('[kimodo-v2] /generate-path error:', e.message);
    res.status(502).json({ error: String(e).slice(0, 300) });
  }
});

// ── GET /history ──────────────────────────────────

router.get('/history', (_req: Request, res: Response) => {
  try {
    const sessions = readHistory();
    res.json({ sessions, total: sessions.length });
  } catch (e: any) {
    res.status(500).json({ error: String(e).slice(0, 300) });
  }
});

// ── POST /upload-skeleton ───────────────────────

router.post('/upload-skeleton', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Missing file' });
      return;
    }

    const label = req.body.label || req.file.originalname;
    const { skeleton, skeletonId } = uploadSkeleton(req.file.buffer, label);

    res.json({
      skeletonId: skeleton.skeletonId,
      label: skeleton.label,
      jointCount: skeleton.jointCount,
      jointNames: skeleton.jointNames,
      bvhUrl: `/api/kimodo-v2/skeletons/${skeletonId}.bvh`,
      fileSizeBytes: skeleton.fileSizeBytes,
      createdAt: skeleton.createdAt,
      somaskel77Compat: skeleton.somaskel77Compat,
    });
  } catch (e: any) {
    console.error('[kimodo-v2] Upload skeleton error:', e.message);
    res.status(500).json({ error: String(e).slice(0, 300) });
  }
});

// ── GET /skeletons ──────────────────────────────

router.get('/skeletons', (_req: Request, res: Response) => {
  try {
    const skeletons = listSkeletons();
    res.json({ skeletons, total: skeletons.length });
  } catch (e: any) {
    res.status(500).json({ error: String(e).slice(0, 300) });
  }
});

// ── GET /skeletons/:skeletonId/bvh ──────────────

router.get('/skeletons/:skeletonId/bvh', (req: Request, res: Response) => {
  try {
    const bvhPath = getSkeletonBvhPath(req.params.skeletonId as string);
    if (!fs.existsSync(bvhPath)) {
      res.status(404).json({ error: 'Skeleton not found' });
      return;
    }
    res.sendFile(bvhPath);
  } catch (e: any) {
    res.status(500).json({ error: String(e).slice(0, 300) });
  }
});

// ── GET /sessions/:sessionId/bvh/:fileName ──────

router.get('/sessions/:sessionId/bvh/:fileName', (req: Request, res: Response) => {
  try {
    const bvhPath = getSessionBvhPath(req.params.sessionId as string, req.params.fileName as string);
    if (!fs.existsSync(bvhPath)) {
      res.status(404).json({ error: 'BVH file not found' });
      return;
    }
    res.sendFile(bvhPath);
  } catch (e: any) {
    res.status(500).json({ error: String(e).slice(0, 300) });
  }
});

export default router;
