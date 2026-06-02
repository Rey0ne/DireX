/* === LLM Router — DeepSeek (cheap, text) + Gemini 3.1 Pro (expensive, vision) === */
import { ProxyAgent } from 'undici';

// ─── Text LLM (DeepSeek Official → Kie.ai fallback) ──
export async function geminiChat(
  systemPrompt: string,
  userContent: string,
  maxTokens: number = 600
): Promise<string | null> {
  // DeepSeek Official (cheapest, preferred for text)
  const dsKey = process.env.DEEPSEEK_API_KEY;
  if (dsKey) {
    const r = await callDeepSeek(dsKey, systemPrompt, userContent, maxTokens);
    if (r) return r;
  }
  // Kie.ai deepseek-chat (fallback)
  const kieKey = process.env.KIE_API_KEY;
  if (kieKey) {
    const r = await callKieDeepSeek(kieKey, systemPrompt, userContent, maxTokens);
    if (r) return r;
  }
  console.log('[llm] No text LLM configured');
  return null;
}

// ─── Vision LLM (Gemini 3.1 Pro — for image analysis) ──
export async function visionAnalyze(
  systemPrompt: string,
  imageBase64: string,
  mimeType: string = 'image/png'
): Promise<string | null> {
  const gmKey = process.env.GEMINI_API_KEY;
  if (!gmKey) { console.log('[vision] No GEMINI_API_KEY'); return null; }

  const proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
  try {
    const opts: any = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + gmKey },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: systemPrompt },
            { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + imageBase64 } },
          ],
        }],
        max_tokens: 500,
      }),
    };
    if (proxy) { opts.dispatcher = new ProxyAgent(proxy); }

    const url = 'https://api.kie.ai/gemini-3.1-pro/v1/chat/completions';
    const resp = await fetch(url, opts);
    if (!resp.ok) { console.log('[vision] Error:', resp.status); return null; }
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (text) { console.log('[vision] Analyzed:', text.slice(0, 60)); return text; }
    return null;
  } catch (err) { console.log('[vision] Failed:', String(err).slice(0, 60)); return null; }
}

// ─── DeepSeek Official ─────────────────────────
async function callDeepSeek(
  apiKey: string, systemPrompt: string, userContent: string, maxTokens: number
): Promise<string | null> {
  try {
    const resp = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.5, max_tokens: maxTokens,
      }),
    });
    if (!resp.ok) { console.log('[deepseek] Error:', resp.status); return null; }
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (text) { console.log('[deepseek]', text.slice(0, 60)); return text; }
    return null;
  } catch (err) { console.log('[deepseek] Failed:', String(err).slice(0, 60)); return null; }
}

// ─── Kie.ai DeepSeek ───────────────────────────
async function callKieDeepSeek(
  apiKey: string, systemPrompt: string, userContent: string, maxTokens: number
): Promise<string | null> {
  const base = process.env.KIE_BASE_URL || 'https://api.kie.ai/api/v1';
  const proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
  try {
    const opts: any = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.5, max_tokens: maxTokens,
      }),
    };
    if (proxy) opts.dispatcher = new ProxyAgent(proxy);
    const resp = await fetch(base + '/chat/completions', opts);
    if (!resp.ok) { console.log('[kie-ds] Error:', resp.status); return null; }
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (text) { console.log('[kie-ds]', text.slice(0, 60)); return text; }
    return null;
  } catch (err) { console.log('[kie-ds] Failed:', String(err).slice(0, 60)); return null; }
}
