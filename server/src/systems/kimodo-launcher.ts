/* === Kimodo Process Launcher ===
 * Auto-starts the Python Kimodo server as a background child process
 * when the DireX server starts. User only needs `npm run dev`.
 */
import { spawn, type ChildProcess } from 'child_process';
import { resolve } from 'path';
import { existsSync } from 'fs';

const KIMODO_PORT = parseInt(process.env.KIMODO_PORT || '8000', 10);
const KIMODO_URL = `http://127.0.0.1:${KIMODO_PORT}`;
const PYTHON_EXE = process.env.KIMODO_PYTHON || 'D:/kimodo-project/kimodo-venv/Scripts/python.exe';
const KIMODO_SCRIPT = process.env.KIMODO_SCRIPT || 'D:/kimodo-project/server.py';

let kimodoProcess: ChildProcess | null = null;
let kimodoReady = false;
let kimodoError: string | null = null;

export function isKimodoReady(): boolean {
  return kimodoReady;
}

export function getKimodoError(): string | null {
  return kimodoError;
}

export function getKimodoUrl(): string {
  return KIMODO_URL;
}

/** Poll /health until Kimodo responds or times out */
function waitForHealth(timeoutMs = 120_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  const poll = (): Promise<boolean> => {
    if (Date.now() > deadline) return Promise.resolve(false);
    return fetch(`${KIMODO_URL}/health`, { signal: AbortSignal.timeout(2000) })
      .then(r => r.ok)
      .catch(() => false)
      .then(ok => ok || new Promise<void>(r => setTimeout(r, 2000)).then(poll));
  };
  return poll();
}

/** Start Kimodo Python server, return when ready or failed */
export async function startKimodo(): Promise<boolean> {
  if (kimodoProcess) {
    return kimodoReady;
  }

  // Check prerequisites
  if (!existsSync(PYTHON_EXE)) {
    kimodoError = `Python not found: ${PYTHON_EXE}`;
    console.log('[kimodo-launcher]', kimodoError);
    return false;
  }
  if (!existsSync(KIMODO_SCRIPT)) {
    kimodoError = `server.py not found: ${KIMODO_SCRIPT}`;
    console.log('[kimodo-launcher]', kimodoError);
    return false;
  }

  console.log('[kimodo-launcher] Starting Kimodo motion server...');
  console.log(`[kimodo-launcher]   Python: ${PYTHON_EXE}`);
  console.log(`[kimodo-launcher]   Script: ${KIMODO_SCRIPT}`);
  console.log(`[kimodo-launcher]   Port:   ${KIMODO_PORT}`);

  try {
    kimodoProcess = spawn(PYTHON_EXE, [
      '-u', // unbuffered stdout
      '-m', 'uvicorn',
      'server:app',
      '--host', '0.0.0.0',
      '--port', String(KIMODO_PORT),
    ], {
      cwd: resolve(KIMODO_SCRIPT, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    });

    // Log stdout (model loading progress)
    kimodoProcess.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg) console.log('[kimodo]', msg.slice(0, 200));
    });

    // Log stderr
    kimodoProcess.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg && !msg.includes('Application startup complete')) {
        // Filter out uvicorn's own startup lines
        console.log('[kimodo:err]', msg.slice(0, 200));
      }
    });

    kimodoProcess.on('exit', (code, signal) => {
      console.log(`[kimodo-launcher] Process exited: code=${code} signal=${signal}`);
      kimodoReady = false;
      kimodoProcess = null;
      if (code !== 0 && code !== null) {
        kimodoError = `Kimodo exited with code ${code}`;
      }
    });

    kimodoProcess.on('error', (err) => {
      console.log('[kimodo-launcher] Process error:', err.message);
      kimodoError = err.message;
      kimodoReady = false;
      kimodoProcess = null;
    });

    // Wait for server to be ready
    console.log('[kimodo-launcher] Waiting for model to load (may take 30-60s on first run)...');
    const ready = await waitForHealth(120_000);

    if (ready) {
      kimodoReady = true;
      console.log('[kimodo-launcher] ✅ Kimodo is ready');
      // Fetch model info
      try {
        const resp = await fetch(`${KIMODO_URL}/health`);
        const info = await resp.json();
        console.log(`[kimodo-launcher]   GPU: ${info.gpu_name}, VRAM: ${info.gpu_mem_used_gb}GB / ${info.gpu_mem_total_gb}GB`);
      } catch { /* non-critical */ }
      return true;
    } else {
      kimodoError = 'Kimodo failed to start within 120s — continuing without motion generation';
      console.log('[kimodo-launcher] ⚠️', kimodoError);
      return false;
    }
  } catch (e: any) {
    kimodoError = e.message;
    console.log('[kimodo-launcher] ❌ Failed to start:', e.message);
    return false;
  }
}

/** Gracefully shutdown Kimodo */
export function stopKimodo(): void {
  if (!kimodoProcess) return;
  console.log('[kimodo-launcher] Stopping Kimodo...');
  try {
    if (process.platform === 'win32') {
      // On Windows, child_process.kill doesn't always work for Python
      spawn('taskkill', ['/pid', String(kimodoProcess.pid), '/f', '/t']);
    } else {
      kimodoProcess.kill('SIGTERM');
    }
  } catch {
    // Best effort
  }
  kimodoProcess = null;
  kimodoReady = false;
}

// Graceful shutdown on exit
process.on('exit', stopKimodo);
process.on('SIGINT', () => { stopKimodo(); process.exit(0); });
process.on('SIGTERM', () => { stopKimodo(); process.exit(0); });
