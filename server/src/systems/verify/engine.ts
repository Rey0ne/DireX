/* === Verification Engine — 6-digit code, 5-min TTL, rate limiting === */

interface CodeEntry {
  code: string;
  expiresAt: number;     // epoch ms
  attempts: number;       // 错误尝试次数（输错 5 次作废）
  sentAt: number;         // epoch ms — 用于频控
}

const store = new Map<string, CodeEntry>();

// ── 配置 ──
const CODE_LENGTH = 6;
const CODE_TTL_MS = 5 * 60 * 1000;     // 5 分钟
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;   // 60 秒后才能重发

// 定期清理过期码（每 2 分钟）
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.expiresAt < now) store.delete(key);
  }
}, 2 * 60 * 1000);

/** 生成 6 位数字验证码 */
export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** 设置验证码（去重 + 频控） */
export function setCode(key: string): { code: string; error?: string } {
  const now = Date.now();
  const existing = store.get(key);

  // 频控：60 秒内不能重发
  if (existing && now - existing.sentAt < RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil((RESEND_COOLDOWN_MS - (now - existing.sentAt)) / 1000);
    return { code: '', error: `请 ${waitSec} 秒后重发` };
  }

  const code = generateCode();
  store.set(key, {
    code,
    expiresAt: now + CODE_TTL_MS,
    attempts: 0,
    sentAt: now,
  });
  return { code };
}

/** 验证码校验。成功返回 true，失败返回 false。超过尝试次数返回 'expired'。 */
export function verifyCode(key: string, code: string): boolean | 'expired' {
  const entry = store.get(key);
  if (!entry) return false;

  // 过期
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return false;
  }

  // 尝试次数用完
  if (entry.attempts >= MAX_ATTEMPTS) {
    store.delete(key);
    return 'expired';
  }

  entry.attempts++;

  if (entry.code === code) {
    store.delete(key); // 一次性使用，验证成功即销毁
    return true;
  }

  return false;
}

/** 检查是否有有效验证码（未过期、未用完尝试次数） */
export function hasPendingCode(key: string): boolean {
  const entry = store.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) { store.delete(key); return false; }
  if (entry.attempts >= MAX_ATTEMPTS) { store.delete(key); return false; }
  return true;
}
