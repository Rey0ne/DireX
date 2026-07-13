/* === Kimodo Health Check ===
 * Kimodo Python server is started independently (not as a child process).
 * This module just waits for it to be ready on port 8000.
 * To start Kimodo manually: cd D:/kimodo-project && python -m uvicorn server:app --host 0.0.0.0 --port 8000
 */

const KIMODO_PORT = parseInt(process.env.KIMODO_PORT || '8000', 10);
const KIMODO_URL = `http://127.0.0.1:${KIMODO_PORT}`;

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
async function waitForHealth(timeoutMs = 120_000): Promise<boolean> {
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

/** Wait for independently-started Kimodo server to be healthy */
export async function startKimodo(): Promise<boolean> {
  if (kimodoReady) return true;

  console.log('[kimodo-launcher] Waiting for Kimodo on port', KIMODO_PORT, '...');

  const ready = await waitForHealth(120_000);

  if (ready) {
    kimodoReady = true;
    kimodoError = null;
    console.log('[kimodo-launcher] ✅ Kimodo is ready');
    try {
      const resp = await fetch(`${KIMODO_URL}/health`);
      const info = await resp.json();
      console.log(`[kimodo-launcher]   GPU: ${info.gpu_name}, VRAM: ${info.gpu_mem_used_gb}GB / ${info.gpu_mem_total_gb}GB`);
    } catch { /* non-critical */ }
    return true;
  } else {
    kimodoError = 'Kimodo not running on port ' + KIMODO_PORT + ' — start it manually or motion generation will be disabled';
    console.log('[kimodo-launcher] ⚠️', kimodoError);
    return false;
  }
}
