/* === QAPI — Express Routes for 小Q === */
import { Router, Request, Response } from 'express';
import { getOrCreateProject, getProject, getProjectSummary, getDeviations, resolveDeviation, startSession, endSession } from './q-state.js';
import { sseHandler } from './q-notification.js';
import { qMemory } from './q-memory.js';
import { detectDeviations } from './q-detector.js';
import { decideStyle, type DimensionInput } from '../agent/style-db.js';
import { applyStyleDecision } from '../agent/style-resolver.js';
import { chat, setLLMChat, type ChatResponse } from './q-chat.js';
import { deepseekChat } from '../ai/deepseek.js';

// Wire up DeepSeek LLM for Q chat (non-blocking — falls back to rule-based if unavailable)
setLLMChat(deepseekChat);

export const qRouter = Router();

// ── Project State ───────────────────────────────

/** GET /api/q/state/:projectId — Full project state summary */
qRouter.get('/state/:projectId', (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const summary = getProjectSummary(projectId);
    res.json(summary);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/q/progress/:projectId — Aggregated progress only */
qRouter.get('/progress/:projectId', (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const summary = getProjectSummary(projectId);
    res.json({
      progress: summary.project.progress,
      completionRate: summary.completionRate,
      openDeviations: summary.openDeviations,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Deviations ──────────────────────────────────

/** GET /api/q/deviations/:projectId — List deviations */
qRouter.get('/deviations/:projectId', (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const status = req.query.status as string | undefined;
    const deviations = getDeviations(projectId, status);
    res.json({ deviations, total: deviations.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/q/deviations/:id/resolve — Mark deviation as resolved */
qRouter.post('/deviations/:id/resolve', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { projectId, status } = req.body;
    if (!projectId) {
      res.status(400).json({ error: 'projectId is required' });
      return;
    }
    const result = resolveDeviation(projectId, id, status || 'acknowledged');
    if (!result) {
      res.status(404).json({ error: 'Deviation not found' });
      return;
    }
    res.json({ success: true, deviation: result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── SSE Stream ──────────────────────────────────

/** GET /api/q/stream — SSE real-time notification stream */
qRouter.get('/stream', (req: Request, res: Response) => {
  sseHandler(res);
});

// ── Memory ──────────────────────────────────────

/** GET /api/q/memory/recall — Search memory */
qRouter.get('/memory/recall', (req: Request, res: Response) => {
  try {
    const query = req.query.query as string || '';
    const results = qMemory.recall(query);
    res.json({ query, results, count: results.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/q/memory/semantic — List learned semantic memories */
qRouter.get('/memory/semantic', (_req: Request, res: Response) => {
  try {
    const entries = qMemory.semanticAll();
    res.json({ entries, total: entries.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/q/memory/reflective — List reflective insights */
qRouter.get('/memory/reflective', (_req: Request, res: Response) => {
  try {
    const entries = qMemory.reflectiveAll();
    res.json({ entries, total: entries.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/q/memory/forget/:id — Forget a specific memory */
qRouter.post('/memory/forget/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = qMemory.forget(id);
    res.json({ success, id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/q/memory/stats — Memory system statistics */
qRouter.get('/memory/stats', (_req: Request, res: Response) => {
  try {
    const stats = qMemory.stats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Manual Detection ────────────────────────────

/** POST /api/q/detect — Trigger manual deviation detection */
qRouter.post('/detect', async (req: Request, res: Response) => {
  try {
    const { projectId, shotNumber, assetUrls, visionAnalysis, compiledPrompt, nodeId } = req.body;
    if (!projectId || shotNumber === undefined) {
      res.status(400).json({ error: 'projectId and shotNumber are required' });
      return;
    }
    const result = await detectDeviations({
      projectId,
      shotNumber,
      assetUrls: assetUrls || [],
      visionAnalysis,
      compiledPrompt,
      nodeId,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Session ─────────────────────────────────────

/** POST /api/q/session/start — Start a new session */
qRouter.post('/session/start', (req: Request, res: Response) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      res.status(400).json({ error: 'projectId is required' });
      return;
    }
    const session = startSession(projectId);
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/q/session/end — End a session */
qRouter.post('/session/end', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId is required' });
      return;
    }
    endSession(sessionId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Phase 2 — Cognitive Cycle ─────────────────

import { runCognitiveCycle, getActiveCycleCount, type CycleReport } from './q-cognitive-engine.js';
import { AutoFixer } from './q-autofix.js';

/** POST /api/q/analyze — Trigger cognitive cycle */
qRouter.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { projectId, trigger, triggerDetail, shotNumber, nodeId } = req.body;
    if (!projectId) {
      res.status(400).json({ error: 'projectId is required' });
      return;
    }

    // Don't block response — cycle runs in background
    const reportPromise = runCognitiveCycle({
      projectId,
      trigger: trigger || 'manual',
      triggerDetail: triggerDetail || 'Manual trigger from API',
      shotNumber,
      nodeId,
    });

    // Return cycle started acknowledgment immediately
    res.json({
      status: 'started',
      projectId,
      activeCycles: getActiveCycleCount(),
    });

    // Continue cycle in background (don't await in response handler)
    reportPromise.then((report: CycleReport) => {
      console.log(`[q-api] Cognitive cycle ${report.cycleId}: ${report.outcome}`);
    }).catch((err: Error) => {
      console.error('[q-api] Cognitive cycle failed:', err.message);
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/q/cycles/active — Check if any cycles are running */
qRouter.get('/cycles/active', (_req: Request, res: Response) => {
  res.json({ activeCycles: getActiveCycleCount() });
});

/** POST /api/q/autofix — Trigger auto-fix for a specific shot */
qRouter.post('/autofix', async (req: Request, res: Response) => {
  try {
    const { projectId, shotNumber } = req.body;
    if (!projectId || shotNumber === undefined) {
      res.status(400).json({ error: 'projectId and shotNumber are required' });
      return;
    }

    const fixer = new AutoFixer();
    const result = await fixer.autoFix(projectId, shotNumber);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Phase 3 — Prediction ─────────────────────────

import { generatePredictions, getQuickStats, type PredictionReport } from './q-predict.js';

/** POST /api/q/predict — Generate prediction report for a project */
qRouter.post('/predict', (req: Request, res: Response) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      res.status(400).json({ error: 'projectId is required' });
      return;
    }
    const report: PredictionReport = generatePredictions(projectId);
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/q/predict/quick/:projectId — Quick prediction stats */
qRouter.get('/predict/quick/:projectId', (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const stats = getQuickStats(projectId);
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Phase 3 — Suggestion ─────────────────────────

import {
  generateSuggestions,
  suggestAndNotify,
  periodicSuggest,
  getSuggestionStats,
  type Suggestion,
} from './q-suggest.js';

/** POST /api/q/suggest — Generate and optionally send suggestions */
qRouter.post('/suggest', (req: Request, res: Response) => {
  try {
    const { projectId, send } = req.body;
    if (!projectId) {
      res.status(400).json({ error: 'projectId is required' });
      return;
    }

    let suggestions: Suggestion[];
    if (send) {
      suggestions = suggestAndNotify(projectId);
    } else {
      suggestions = generateSuggestions(projectId);
    }

    res.json({ suggestions, count: suggestions.length, sent: !!send });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/q/suggest/stats — Suggestion engine stats */
qRouter.get('/suggest/stats', (_req: Request, res: Response) => {
  try {
    const stats = getSuggestionStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Phase 3 — Orchestration ─────────────────────

import {
  detectAndRoute,
  executeOrchestration,
  isOrchestrated,
  resetOrchestration,
  getOrchestrationStats,
  type CanvasNode,
  type OrchestrationDecision,
} from './q-orchestrate.js';

/** POST /api/q/orchestrate — Detect new nodes and return routing decisions */
qRouter.post('/orchestrate', (req: Request, res: Response) => {
  try {
    const { nodes, projectId } = req.body;
    if (!projectId || !Array.isArray(nodes)) {
      res.status(400).json({ error: 'projectId and nodes[] are required' });
      return;
    }

    const decisions = detectAndRoute(nodes as CanvasNode[], projectId);
    res.json({ decisions, count: decisions.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/q/orchestrate/execute — Execute a routing decision */
qRouter.post('/orchestrate/execute', async (req: Request, res: Response) => {
  try {
    const { decision, scriptText, visualStyle } = req.body;
    if (!decision) {
      res.status(400).json({ error: 'decision is required' });
      return;
    }

    const result = await executeOrchestration(
      decision as OrchestrationDecision,
      scriptText,
      visualStyle,
    );

    if (!result) {
      res.json({ executed: false, reason: 'Route not executable or no scriptText provided' });
      return;
    }

    res.json({ executed: true, route: result.route, result: result.result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/q/orchestrate/stats — Orchestration tracking stats */
qRouter.get('/orchestrate/stats', (_req: Request, res: Response) => {
  try {
    const stats = getOrchestrationStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/** POST /api/q/orchestrate/reset/:nodeId — Reset orchestration for a node */
qRouter.post('/orchestrate/reset/:nodeId', (req: Request, res: Response) => {
  try {
    const { nodeId } = req.params;
    resetOrchestration(nodeId);
    res.json({ success: true, nodeId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Phase 3 — Style Decision ─────────────────────

/** POST /api/q/style/decide — 5-dimension style decision engine */
qRouter.post('/style/decide', (req: Request, res: Response) => {
  try {
    const { era, region, sceneFunction, function: func, mood, identity } = req.body || {};
    const dims: DimensionInput = { era, region, sceneFunction: sceneFunction || func, mood, identity };
    const decision = decideStyle(dims);
    const styleInstruction = applyStyleDecision(dims, decision);
    res.json({ decision, styleInstruction });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Chat — Conversational interface to Q brain ─────

/** POST /api/q/chat — Talk to 小Q */
qRouter.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, projectId, history } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      res.status(400).json({ error: 'message is required' });
      return;
    }
    const response: ChatResponse = await chat(message.trim(), {
      projectId,
      recentMessages: Array.isArray(history) ? history : undefined,
    });
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
