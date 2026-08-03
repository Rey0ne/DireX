/* === Encryption — AES-256-GCM for sensitive user fields === */
import crypto from 'crypto';

// 密钥从环境变量读取，开发环境使用固定密钥
const ENV_KEY = process.env.DIREX_DATA_KEY;
const DEV_KEY = 'direx-dev-key-32bytes-long!!'; // 32 bytes exactly for AES-256

function getKey(): Buffer {
  if (ENV_KEY) {
    const buf = Buffer.from(ENV_KEY, 'utf8');
    if (buf.length === 32) return buf;
    // 如果长度不是 32，hash 到 32 bytes
    return crypto.createHash('sha256').update(ENV_KEY).digest();
  }
  return Buffer.from(DEV_KEY, 'utf8');
}

const ALGO = 'aes-256-gcm';

/** 加密敏感字段。返回 base64 编码的密文（含 IV + auth tag） */
export function encrypt(plaintext: string): string {
  if (!plaintext) return '';
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();
  // 格式: iv:authtag:ciphertext (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/** 解密敏感字段 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return '';
  try {
    const parts = ciphertext.split(':');
    if (parts.length !== 3) return ciphertext; // 未加密的旧数据
    const key = getKey();
    const iv = Buffer.from(parts[0], 'base64');
    const authTag = Buffer.from(parts[1], 'base64');
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(parts[2], 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return '[decrypt failed]';
  }
}

/** 手机号脱敏: +86 13812341234 → +86 138****1234 */
export function maskPhone(phone: string): string {
  if (!phone) return '';
  // 保留国际区号和前3位+后4位
  const cleaned = phone.replace(/[\s\-]/g, '');
  if (cleaned.length <= 7) return cleaned.slice(0, 3) + '****';
  const prefix = cleaned.match(/^\+\d{1,3}/) ? cleaned.slice(0, cleaned.length - 8) : '';
  const rest = cleaned.slice(prefix.length);
  return prefix + rest.slice(0, 3) + '****' + rest.slice(-4);
}
