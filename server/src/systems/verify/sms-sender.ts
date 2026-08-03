/* === SMS Sender — 阿里云 (China) / Twilio (Global) abstraction === */

export interface SmsSendResult {
  ok: boolean;
  error?: string;
  provider: 'aliyun' | 'twilio' | 'mock';
}

/** 发送短信验证码。根据环境变量自动选择 provider。 */
export async function sendVerifySms(phone: string, countryCode: string, code: string): Promise<SmsSendResult> {
  // 中国号码 → 阿里云
  if (countryCode === '+86' && process.env.ALIYUN_SMS_ACCESS_KEY) {
    return sendAliyun(phone, code);
  }
  // 国际号码 → Twilio
  if (process.env.TWILIO_ACCOUNT_SID) {
    return sendTwilio(phone, countryCode, code);
  }
  // 开发环境 → mock
  if (!process.env.ALIYUN_SMS_ACCESS_KEY && !process.env.TWILIO_ACCOUNT_SID) {
    console.log(`[sms] MOCK — 验证码 ${code} → ${countryCode}${phone}`);
    return { ok: true, provider: 'mock' };
  }
  return { ok: false, error: '短信服务未配置', provider: 'mock' };
}

/** 阿里云短信 */
async function sendAliyun(phone: string, code: string): Promise<SmsSendResult> {
  try {
    const Core = await import('@alicloud/pop-core');
    const client = new Core.default({
      accessKeyId: process.env.ALIYUN_SMS_ACCESS_KEY!,
      accessKeySecret: process.env.ALIYUN_SMS_ACCESS_SECRET!,
      endpoint: 'https://dysmsapi.aliyuncs.com',
      apiVersion: '2017-05-25',
    });
    await client.request('SendSms', {
      PhoneNumbers: phone,
      SignName: process.env.ALIYUN_SMS_SIGN_NAME || 'DireX',
      TemplateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || 'SMS_XXXXX',
      TemplateParam: JSON.stringify({ code }),
    });
    return { ok: true, provider: 'aliyun' };
  } catch (err: any) {
    console.error('[sms] Aliyun error:', err.message);
    return { ok: false, error: '短信发送失败', provider: 'aliyun' };
  }
}

/** Twilio 短信 */
async function sendTwilio(phone: string, countryCode: string, code: string): Promise<SmsSendResult> {
  try {
    const twilio = await import('twilio');
    const client = twilio.default(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    );
    const fullPhone = countryCode + phone;
    await client.messages.create({
      body: `[DireX] Your verification code is: ${code}. Valid for 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: fullPhone,
    });
    return { ok: true, provider: 'twilio' };
  } catch (err: any) {
    console.error('[sms] Twilio error:', err.message);
    return { ok: false, error: 'SMS failed', provider: 'twilio' };
  }
}

/** 检查短信服务是否可用 */
export function isSmsConfigured(): boolean {
  return !!(process.env.ALIYUN_SMS_ACCESS_KEY || process.env.TWILIO_ACCOUNT_SID);
}
