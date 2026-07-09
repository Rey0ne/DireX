/* === Task Manager === */
/* Generation task lifecycle: submit → poll → result → log */
import { v4 as uuid } from 'uuid';
import { cacheGet, cacheSet, cacheDel } from '../cache/store.js';
import { readJSON, writeJSON } from '../db/store.js';
import type { GenerationLog } from '../../../../shared/api-types.js';

const LOGS_PATH = 'data/task-logs.json';
const MAX_LOGS = 200;

// ─── Logging ───────────────────────────────────
export function getLogs(): GenerationLog[] {
  const all: GenerationLog[] = readJSON(LOGS_PATH).logs || [];
  return all.slice(-MAX_LOGS).reverse();
}

export function addLog(log: GenerationLog): void {
  const data = readJSON(LOGS_PATH);
  if (!data.logs) data.logs = [];
  data.logs.push(log);
  if (data.logs.length > MAX_LOGS * 2) data.logs = data.logs.slice(-MAX_LOGS);
  writeJSON(LOGS_PATH, data);

  // 小Q: notify observer hook
  try {
    const { onGenerationLogged } = require('../q/q-observer.js');
    if (onGenerationLogged) {
      onGenerationLogged({
        providerId: log.providerId,
        status: log.status,
        credits: Math.round((log.cost || 0) * 100),
        durationMs: log.durationMs || 0,
        error: log.error,
      });
    }
  } catch { /* Q observer not available — graceful degrade */ }
}

// ─── Active task tracking ──────────────────────
export function trackTask(taskId: string, info: { nodeId?: string; providerId: string }): void {
  cacheSet(`task:${taskId}`, info, 600_000); // 10 min TTL
}

export function getTaskInfo(taskId: string): any {
  return cacheGet(`task:${taskId}`);
}

export function clearTask(taskId: string): void {
  cacheDel(`task:${taskId}`);
}
