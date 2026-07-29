/* === Kimodo v2 — Session Store ===
 * JSON file persistence for generation sessions.
 * Layout: data/kimodo-v2/sessions/{sessionId}/session.json
 * TTL-based garbage collection (default 24h).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { KimodoV2Session, HistoryEntry } from './types.js';

// ── Paths ────────────────────────────────────────

const __rootdir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const DATA_DIR = path.join(__rootdir, 'data', 'kimodo-v2');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const SKELETONS_DIR = path.join(DATA_DIR, 'skeletons');

// Ensure directories exist
[ DATA_DIR, SESSIONS_DIR, SKELETONS_DIR ].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Session CRUD ─────────────────────────────────

export function getSessionDir(sessionId: string): string {
  return path.join(SESSIONS_DIR, sessionId);
}

export function getSessionFile(sessionId: string): string {
  return path.join(SESSIONS_DIR, sessionId, 'session.json');
}

export function readSession(sessionId: string): KimodoV2Session | null {
  const file = getSessionFile(sessionId);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    console.warn(`[kimodo-v2] Failed to read session ${sessionId}:`, String(e).slice(0, 100));
    return null;
  }
}

export function writeSession(session: KimodoV2Session): void {
  const dir = getSessionDir(session.sessionId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = getSessionFile(session.sessionId);
  fs.writeFileSync(file, JSON.stringify(session, null, 2), 'utf-8');
}

export function deleteSession(sessionId: string): boolean {
  const dir = getSessionDir(sessionId);
  if (!fs.existsSync(dir)) return false;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    return true;
  } catch (e) {
    console.warn(`[kimodo-v2] Failed to delete session ${sessionId}:`, String(e).slice(0, 100));
    return false;
  }
}

/** List all session IDs on disk */
export function listSessionIds(): string[] {
  if (!fs.existsSync(SESSIONS_DIR)) return [];
  return fs.readdirSync(SESSIONS_DIR)
    .filter(name => fs.statSync(path.join(SESSIONS_DIR, name)).isDirectory());
}

// ── BVH file helpers for sessions ────────────────

export function ensureSessionBvhDir(sessionId: string): string {
  const bvhDir = path.join(SESSIONS_DIR, sessionId, 'bvh');
  if (!fs.existsSync(bvhDir)) fs.mkdirSync(bvhDir, { recursive: true });
  return bvhDir;
}

export function writeSessionBvh(sessionId: string, fileName: string, buffer: Buffer): string {
  const bvhDir = ensureSessionBvhDir(sessionId);
  const filePath = path.join(bvhDir, fileName);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export function getSessionBvhPath(sessionId: string, fileName: string): string {
  return path.join(SESSIONS_DIR, sessionId, 'bvh', fileName);
}

// ── History (accepted generations) ───────────────

export function readHistory(): HistoryEntry[] {
  if (!fs.existsSync(HISTORY_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function appendHistory(entry: HistoryEntry): void {
  const history = readHistory();
  history.unshift(entry); // newest first
  // Keep last 100 entries
  const trimmed = history.slice(0, 100);
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
}

// ── TTL Garbage Collection ───────────────────────

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Sweep expired sessions. Sessions with `expiresAt` in the past
 * and status != "accepted" are deleted entirely.
 * Returns count of deleted sessions.
 */
export function sweepExpiredSessions(): number {
  if (!fs.existsSync(SESSIONS_DIR)) return 0;

  const now = new Date();
  let deleted = 0;

  const dirs = fs.readdirSync(SESSIONS_DIR);
  for (const dir of dirs) {
    const sessionFile = path.join(SESSIONS_DIR, dir, 'session.json');
    if (!fs.existsSync(sessionFile)) continue;

    try {
      const session: KimodoV2Session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
      const expiresAt = new Date(session.expiresAt);

      // Keep accepted sessions indefinitely
      if (session.status === 'accepted') continue;

      if (now > expiresAt) {
        fs.rmSync(path.join(SESSIONS_DIR, dir), { recursive: true, force: true });
        deleted++;
        console.log(`[kimodo-v2] GC: deleted expired session ${dir}`);
      }
    } catch (e) {
      // Corrupt file — delete the whole session dir
      try {
        fs.rmSync(path.join(SESSIONS_DIR, dir), { recursive: true, force: true });
        deleted++;
      } catch {}
    }
  }

  if (deleted > 0) {
    console.log(`[kimodo-v2] GC: swept ${deleted} expired session(s)`);
  }
  return deleted;
}

// ── Startup initialization ────────────────────────

let _gcInterval: ReturnType<typeof setInterval> | null = null;

export function initSessionStore(): void {
  // Run GC sweep at startup
  const swept = sweepExpiredSessions();
  if (swept > 0) console.log(`[kimodo-v2] Startup GC: cleaned ${swept} session(s)`);

  // Schedule periodic sweep (every 10 minutes)
  if (!_gcInterval) {
    _gcInterval = setInterval(() => {
      sweepExpiredSessions();
    }, 10 * 60 * 1000);
    // Don't prevent process exit
    if (_gcInterval.unref) _gcInterval.unref();
  }
}

export function shutdownSessionStore(): void {
  if (_gcInterval) {
    clearInterval(_gcInterval);
    _gcInterval = null;
  }
}
