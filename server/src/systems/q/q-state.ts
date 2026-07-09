/* === QState — Project State & Deviation Tracking === */
import { v4 as uuid } from 'uuid';
import { readJSON, writeJSON } from '../db/store.js';
import { qMemory } from './q-memory.js';

// ── Types ────────────────────────────────────────

export interface QProgress {
  totalShots: number;
  shotsGenerated: number;
  shotsApproved: number;
  shotsWithDeviations: number;
  totalCreditsSpent: number;
  lastPipelineRun: string | null;
  pipelineRuns: number;
  avgGenerationMs: number;
}

export interface QScriptStructure {
  characters: Record<string, string>;     // name → description
  scenes: Record<string, string>;         // name → description
  shots: QShotSpec[];
  sceneArchitecture: Record<string, string>;
  props: Record<string, string>;
  music: { scenes: Record<string, string>; sunoPrompts: Record<string, string> };
}

export interface QShotSpec {
  shotNumber: number;
  scene: string;
  shotType: string;       // ELS/WS/MS/MCU/CU/ECU
  angle: string;          // 平视/俯拍/仰拍/鸟瞰
  lens: string;           // 24mm/35mm/50mm/85mm/135mm
  composition: string;    // 三分法/中心/对称/对角线/引导线
  foreground: string;
  midground: string;
  background: string;
  blocking: string;
  action: string;
  emotion: string;
  cameraMovement: string;
  focusPoint: string;
  visualPrompt: string;   // full T2I prompt
  contentCN: string;      // Chinese structured description
}

export interface QDeviationRecord {
  id: string;
  projectId: string;
  shotNumber: number;
  severity: 'DISCREPANCY' | 'DEVIATION' | 'VIOLATION';
  category: 'composition' | 'character' | 'lighting' | 'missing_element' |
            'extra_element' | 'mood_mismatch' | 'style_mismatch' |
            'consistency_break' | 'era_conflict' | 'spatial_logic';
  expected: string;       // what the script/storyboard says
  observed: string;       // what the generated image shows
  suggestion: string;     // how to fix
  status: 'open' | 'acknowledged' | 'fixed' | 'wont_fix';
  relatedAssetUrls: string[];
  nodeId: string | null;  // canvas node ID
  memoryId: string;       // linked episodic memory entry
  createdAt: string;
  resolvedAt: string | null;
}

export interface QProject {
  projectId: string;
  name: string;
  scriptText: string;
  scriptStructure: QScriptStructure | null;
  progress: QProgress;
  deviations: QDeviationRecord[];
  canvasNodeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface QSession {
  sessionId: string;
  projectId: string;
  startedAt: string;
  endedAt: string | null;
  eventCount: number;
}

// ── Persistence ──────────────────────────────────

const STATE_FILE = 'q-state.json';
const DEVIATIONS_FILE = 'q-deviations.json';

function loadState(): { projects: Record<string, QProject>; sessions: QSession[] } {
  const data = readJSON(STATE_FILE);
  return {
    projects: data.projects || {},
    sessions: data.sessions || [],
  };
}

function saveState(projects: Record<string, QProject>, sessions: QSession[]): void {
  writeJSON(STATE_FILE, { projects, sessions, updatedAt: new Date().toISOString() });
}

function loadDeviations(): Record<string, QDeviationRecord[]> {
  const data = readJSON(DEVIATIONS_FILE);
  return data.deviations || {};
}

function saveDeviations(deviations: Record<string, QDeviationRecord[]>): void {
  writeJSON(DEVIATIONS_FILE, { deviations, updatedAt: new Date().toISOString() });
}

// ── Project Operations ───────────────────────────

export function getOrCreateProject(projectId: string, name = 'Untitled'): QProject {
  const { projects } = loadState();
  if (projects[projectId]) {
    return projects[projectId];
  }

  const project: QProject = {
    projectId,
    name,
    scriptText: '',
    scriptStructure: null,
    progress: emptyProgress(),
    deviations: [],
    canvasNodeCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  projects[projectId] = project;
  saveState(projects, []);
  return project;
}

export function updateProject(projectId: string, patch: Partial<QProject>): QProject {
  const { projects, sessions } = loadState();
  const current = projects[projectId] || getOrCreateProject(projectId);
  const updated = { ...current, ...patch, updatedAt: new Date().toISOString() };
  projects[projectId] = updated;
  saveState(projects, sessions);
  return updated;
}

export function getProject(projectId: string): QProject | null {
  const { projects } = loadState();
  return projects[projectId] || null;
}

// ── Progress Operations ──────────────────────────

export function emptyProgress(): QProgress {
  return {
    totalShots: 0,
    shotsGenerated: 0,
    shotsApproved: 0,
    shotsWithDeviations: 0,
    totalCreditsSpent: 0,
    lastPipelineRun: null,
    pipelineRuns: 0,
    avgGenerationMs: 0,
  };
}

export function updateProgress(
  projectId: string,
  patch: Partial<QProgress>,
): QProgress {
  const project = getOrCreateProject(projectId);
  const updated = { ...project.progress, ...patch };
  updateProject(projectId, { progress: updated });
  return updated;
}

export function recordGeneration(
  projectId: string,
  credits: number,
  durationMs: number,
): void {
  const project = getOrCreateProject(projectId);
  const p = project.progress;
  const newAvg = p.shotsGenerated > 0
    ? (p.avgGenerationMs * p.shotsGenerated + durationMs) / (p.shotsGenerated + 1)
    : durationMs;

  updateProgress(projectId, {
    shotsGenerated: p.shotsGenerated + 1,
    totalCreditsSpent: p.totalCreditsSpent + credits,
    avgGenerationMs: Math.round(newAvg),
  });
}

// ── Deviation Operations ─────────────────────────

export function addDeviation(
  projectId: string,
  shotNumber: number,
  severity: QDeviationRecord['severity'],
  category: QDeviationRecord['category'],
  expected: string,
  observed: string,
  suggestion: string,
  relatedAssetUrls: string[] = [],
  nodeId: string | null = null,
): QDeviationRecord {
  // Record in episodic memory
  const memId = qMemory.episodicAdd(
    severity === 'VIOLATION' ? 'deviation_found' : 'deviation_found',
    `Shot ${shotNumber}: ${severity} — ${category}: ${suggestion}`,
    { severity, category, shotNumber, nodeId, detail: { severity: severity === 'DISCREPANCY' ? 'DISCREPANCY' : severity } },
    [category, `shot-${shotNumber}`, severity.toLowerCase()],
    [],
  ).id;

  const deviation: QDeviationRecord = {
    id: uuid(),
    projectId,
    shotNumber,
    severity,
    category,
    expected,
    observed,
    suggestion,
    status: 'open',
    relatedAssetUrls,
    nodeId,
    memoryId: memId,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };

  // Persist to deviations file
  const allDeviations = loadDeviations();
  if (!allDeviations[projectId]) allDeviations[projectId] = [];
  allDeviations[projectId].push(deviation);
  saveDeviations(allDeviations);

  // Update progress
  const project = getOrCreateProject(projectId);
  const openCount = (allDeviations[projectId] || []).filter(d => d.status === 'open').length;
  updateProgress(projectId, { shotsWithDeviations: openCount });

  return deviation;
}

export function resolveDeviation(
  projectId: string,
  deviationId: string,
  status: 'acknowledged' | 'fixed' | 'wont_fix',
): QDeviationRecord | null {
  const allDeviations = loadDeviations();
  const devs = allDeviations[projectId];
  if (!devs) return null;

  const dev = devs.find(d => d.id === deviationId);
  if (!dev) return null;

  dev.status = status;
  dev.resolvedAt = new Date().toISOString();
  saveDeviations(allDeviations);

  // Record resolution in episodic memory
  qMemory.episodicAdd(
    'deviation_resolved',
    `Shot ${dev.shotNumber} deviation ${status}: ${dev.suggestion}`,
    { deviationId, shotNumber: dev.shotNumber, resolution: status },
    ['resolved', status],
    [dev.memoryId],
  );

  // Update progress
  const openCount = devs.filter(d => d.status === 'open').length;
  updateProgress(projectId, { shotsWithDeviations: openCount });

  return dev;
}

export function getDeviations(projectId: string, status?: string): QDeviationRecord[] {
  const allDeviations = loadDeviations();
  const devs = allDeviations[projectId] || [];
  if (status) return devs.filter(d => d.status === status);
  return devs;
}

// ── Script Structure ─────────────────────────────

export function setScriptStructure(
  projectId: string,
  scriptText: string,
  structure: QScriptStructure,
): QProject {
  const totalShots = structure.shots.length;
  return updateProject(projectId, {
    scriptText,
    scriptStructure: structure,
    progress: {
      ...getOrCreateProject(projectId).progress,
      totalShots,
    },
  });
}

// ── Session Operations ───────────────────────────

export function startSession(projectId: string): QSession {
  const { projects, sessions } = loadState();
  const session: QSession = {
    sessionId: uuid(),
    projectId,
    startedAt: new Date().toISOString(),
    endedAt: null,
    eventCount: 0,
  };
  sessions.push(session);
  saveState(projects, sessions);

  qMemory.episodicAdd('system_event', 'Session started', { sessionId: session.sessionId, projectId }, ['session'], []);

  return session;
}

export function endSession(sessionId: string): void {
  const { projects, sessions } = loadState();
  const session = sessions.find(s => s.sessionId === sessionId);
  if (session) {
    session.endedAt = new Date().toISOString();
    saveState(projects, sessions);
  }
}

// ── Aggregation ──────────────────────────────────

export function getProjectSummary(projectId: string) {
  const project = getOrCreateProject(projectId);
  const openDeviations = getDeviations(projectId, 'open');
  const violationCount = openDeviations.filter(d => d.severity === 'VIOLATION').length;
  const deviationCount = openDeviations.filter(d => d.severity === 'DEVIATION').length;
  const discrepancyCount = openDeviations.filter(d => d.severity === 'DISCREPANCY').length;
  const memStats = qMemory.stats();

  return {
    project,
    openDeviations: {
      total: openDeviations.length,
      violations: violationCount,
      deviations: deviationCount,
      discrepancies: discrepancyCount,
      needsAttention: violationCount > 0,
      criticalThreshold: violationCount >= 3,
    },
    memory: memStats,
    completionRate: project.progress.totalShots > 0
      ? Math.round((project.progress.shotsGenerated / project.progress.totalShots) * 100)
      : 0,
  };
}
