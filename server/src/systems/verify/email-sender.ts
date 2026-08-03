/* === Email Sender — Resend (primary) + Nodemailer SMTP (fallback) === */
import { Resend } from 'resend';

// 懒加载：ESM 模块顶层在 dotenv 之前执行，必须在函数内读 process.env
function getResendKey() { return process.env.RESEND_API_KEY || ''; }
function getFromEmail() { return process.env.FROM_EMAIL || 'noreply@direx.app'; }
let _resend: Resend | null = null;
let _resendKey: string = '';
function getResend(): Resend | null {
  const key = getResendKey();
  if (!key) return null;
  if (key !== _resendKey) { _resend = new Resend(key); _resendKey = key; }
  return _resend;
}

export interface SendResult {
  ok: boolean;
  error?: string;
  messageId?: string;
}

/** 发送验证码邮件 */
export async function sendVerifyEmail(to: string, code: string): Promise<SendResult> {
  const html = `
    <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <div style="font-size: 28px; font-weight: 800; margin-bottom: 24px;">
        Dire<span style="color: #0ea88a;">X</span>
      </div>
      <div style="font-size: 16px; color: #333; margin-bottom: 16px;">
        您的验证码：
      </div>
      <div style="font-size: 36px; font-weight: 700; letter-spacing: 6px; color: #0ea88a; margin-bottom: 24px; font-family: monospace;">
        ${code}
      </div>
      <div style="font-size: 13px; color: #888; margin-bottom: 8px;">
        验证码 5 分钟内有效，请勿分享给他人。
      </div>
      <div style="font-size: 13px; color: #888;">
        Verification code valid for 5 minutes. Do not share.
      </div>
    </div>
  `;

  // Resend 优先
  const resend = getResend();
  if (resend) {
    try {
      const result = await resend.emails.send({
        from: `DireX <${getFromEmail()}>`,
        to: [to],
        subject: `DireX 验证码: ${code}`,
        html,
      });
      if (result.error) {
        console.error('[email] Resend error:', result.error);
        return fallbackSend(to, code, html);
      }
      return { ok: true, messageId: result.data?.id };
    } catch (err: any) {
      console.error('[email] Resend exception:', err.message);
      return fallbackSend(to, code, html);
    }
  }

  return fallbackSend(to, code, html);
}

/** SMTP Fallback — 使用 nodemailer */
async function fallbackSend(to: string, code: string, html: string): Promise<SendResult> {
  try {
    const nodemailer = await import('nodemailer');
    const port = Number(process.env.SMTP_PORT) || 587;
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,   // 465 = implicit SSL, 587 = STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    const info = await transport.sendMail({
      from: getFromEmail(),
      to,
      subject: `DireX Verification Code: ${code}`,
      html,
    });
    return { ok: true, messageId: info.messageId };
  } catch (err: any) {
    console.error('[email] SMTP fallback failed:', err.message);
    return { ok: false, error: '邮件发送失败，请稍后重试' };
  }
}

/** 检查邮件服务是否可用 */
export function isEmailConfigured(): boolean {
  return !!(getResendKey() || process.env.SMTP_USER);
}
