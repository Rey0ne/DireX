/* === Cloudflare Turnstile Verification === */

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || '';
const TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileResult {
  ok: boolean;
  error?: string;
}

/** 验证 Turnstile token。如果未配置 SECRET_KEY，开发环境自动放行。 */
export async function verifyTurnstile(token: string): Promise<TurnstileResult> {
  // 开发环境未配置 → 放行
  if (!TURNSTILE_SECRET) {
    console.log('[turnstile] SKIP — TURNSTILE_SECRET_KEY not set, auto-pass');
    return { ok: true };
  }

  if (!token) {
    return { ok: false, error: '缺少安全验证' };
  }

  try {
    const resp = await fetch(TURNSTILE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET,
        response: token,
      }),
    });
    const data = await resp.json() as { success: boolean; 'error-codes'?: string[] };
    if (data.success) return { ok: true };
    return { ok: false, error: `安全验证失败: ${data['error-codes']?.join(', ') || 'unknown'}` };
  } catch (err: any) {
    console.error('[turnstile] verify error:', err.message);
    // Turnstile 不可用时降级放行（避免阻塞所有用户）
    return { ok: true };
  }
}
