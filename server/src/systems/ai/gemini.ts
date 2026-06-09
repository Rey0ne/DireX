/* === LLM Router — DeepSeek (cheap, text) + Gemini 3.1 Pro (expensive, vision) === */
import { ProxyAgent } from 'undici';

// Rough token estimate: Chinese ~1.5 chars/token, English ~4 chars/token
// Use 2 chars/token as a conservative bound for mixed text
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 2);
}

const MAX_INPUT_TOKENS = 32_000; // practical limit for most LLMs (DeepSeek 64K, Gemini 32K)

function truncateContent(text: string, maxTokens: number): string {
  // 2 chars ≈ 1 token (conservative), so maxChars = maxTokens * 2
  const maxChars = maxTokens * 2;
  if (text.length <= maxChars) return text;
  const half = Math.floor(maxChars / 2);
  return text.slice(0, half) + '\n...[content truncated to fit context window]...\n' + text.slice(-half);
}

// ─── GPT-5 Text (Kie.ai) ──────────────────────
export async function gpt5Chat(
  systemPrompt: string,
  userContent: string,
  maxTokens: number = 1600,
  reasoningEffort: 'low' | 'medium' | 'high' | 'xhigh' = 'high'
): Promise<string | null> {
  const kieKey = process.env.KIE_API_KEY;
  if (!kieKey) { console.log('[gpt5] No KIE_API_KEY'); return null; }

  const proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
  try {
    const input = `${systemPrompt}\n\n${userContent}`;
    const body: any = {
      model: 'gpt-5.5',
      input,
      stream: false,
      reasoning: { effort: reasoningEffort },
      max_tokens: maxTokens,
    };

    const opts: any = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + kieKey },
      body: JSON.stringify(body),
    };
    if (proxy) opts.dispatcher = new ProxyAgent(proxy);

    const url = 'https://api.kie.ai/codex/v1/responses';
    console.log(`[gpt5] Calling ${url} effort=${reasoningEffort}`);
    const resp = await fetch(url, opts);
    if (!resp.ok) { console.log('[gpt5] Error:', resp.status); return null; }

    const data = await resp.json();
    // GPT-5 response: { output: [{ content: [...] }], usage: {...}, status: "..." }
    const output = data.output || data.choices || [];
    const content = output[0]?.content;
    if (Array.isArray(content)) {
      const text = content.map((c: any) => c.text || '').join('').trim();
      if (text) { console.log('[gpt5]', text.slice(0, 80)); return text; }
    } else if (typeof content === 'string') {
      if (content.trim()) { console.log('[gpt5]', content.trim().slice(0, 80)); return content.trim(); }
    }
    // Fallback: try message.content string
    const msgText = output[0]?.message?.content || data.choices?.[0]?.message?.content;
    if (typeof msgText === 'string' && msgText.trim()) {
      console.log('[gpt5]', msgText.trim().slice(0, 80));
      return msgText.trim();
    }
    console.log('[gpt5] Unexpected response:', JSON.stringify(data).slice(0, 300));
    return null;
  } catch (err) { console.log('[gpt5] Failed:', String(err).slice(0, 100)); return null; }
}

// ─── Text LLM (Kie.ai Gemini preferred, DeepSeek fallback) ──
export async function geminiChat(
  systemPrompt: string,
  userContent: string,
  maxTokens: number = 600
): Promise<string | null> {
  // Safety: truncate userContent if total input exceeds model context limit
  const sysTokens = estimateTokens(systemPrompt);
  const availableTokens = MAX_INPUT_TOKENS - sysTokens - maxTokens;
  if (estimateTokens(userContent) > availableTokens) {
    console.log('[llm] Truncating userContent (was ' + estimateTokens(userContent) + ' tokens, limit ' + availableTokens + ')');
    userContent = truncateContent(userContent, availableTokens);
  }

  // Kie.ai Gemini (preferred — works with proxy, fast)
  const kieKey = process.env.KIE_API_KEY;
  if (kieKey) {
    const r = await callKieGemini(kieKey, systemPrompt, userContent, maxTokens);
    if (r) return r;
  }
  // DeepSeek Official (fallback)
  const dsKey = process.env.DEEPSEEK_API_KEY;
  if (dsKey) {
    const r = await callDeepSeek(dsKey, systemPrompt, userContent, maxTokens);
    if (r) return r;
  }
  console.log('[llm] No text LLM configured');
  return null;
}

// ─── Kie.ai Gemini text ───────────────────────
async function callKieGemini(
  apiKey: string, systemPrompt: string, userContent: string, maxTokens: number
): Promise<string | null> {
  const proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
  try {
    const opts: any = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.5, max_tokens: maxTokens,
      }),
    };
    if (proxy) opts.dispatcher = new ProxyAgent(proxy);
    const resp = await fetch('https://api.kie.ai/gemini-2.5-flash/v1/chat/completions', opts);
    if (!resp.ok) { console.log('[kie-gemini] Error:', resp.status); return null; }
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (text) { console.log('[kie-gemini]', text.slice(0, 60)); return text; }
    return null;
  } catch (err) { console.log('[kie-gemini] Failed:', String(err).slice(0, 60)); return null; }
}

// ─── Vision LLM (Kie.ai Gemini — for image analysis) ──
// Model configured via GEMINI_VISION_MODEL env, defaults to gemini-2.5-flash
export async function visionAnalyze(
  systemPrompt: string,
  imageBase64: string,
  mimeType: string = 'image/png'
): Promise<string | null> {
  const gmKey = process.env.GEMINI_API_KEY;
  if (!gmKey) { console.log('[vision] No GEMINI_API_KEY'); return null; }

  const model = process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash';
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
        max_tokens: 800,
      }),
    };
    if (proxy) { opts.dispatcher = new ProxyAgent(proxy); }

    // Kie.ai routes Gemini models via URL path: /{model}/v1/chat/completions
    const url = `https://api.kie.ai/${model}/v1/chat/completions`;
    const resp = await fetch(url, opts);
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      console.log('[vision] Error ' + resp.status + ': ' + errBody.slice(0, 200));
      return null;
    }
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (text) { console.log('[vision] Analyzed:', text.slice(0, 60)); return text; }
    console.log('[vision] Unexpected response:', JSON.stringify(data).slice(0, 200));
    return null;
  } catch (err) { console.log('[vision] Failed:', String(err).slice(0, 200)); return null; }
}

// ─── DeepSeek Official ─────────────────────────
async function callDeepSeek(
  apiKey: string, systemPrompt: string, userContent: string, maxTokens: number
): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
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
      signal: ctrl.signal,
    });
    clearTimeout(t);
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
