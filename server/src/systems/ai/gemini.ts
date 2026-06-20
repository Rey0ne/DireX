/* === LLM Router — DeepSeek (cheap, text) + Gemini 3.1 Pro (expensive, vision) === */
import { ProxyAgent, Agent } from 'undici';

// Keep-alive agent for direct (non-proxy) connections.
// Prevents routers/firewalls from dropping idle TCP sockets during long kie.ai generation (5-10 min).
const kieKeepAliveAgent = new Agent({
  connect: {
    keepAlive: true,
    keepAliveInitialDelay: 30_000,  // send TCP keep-alive probe after 30s idle
  },
  headersTimeout: 900_000,          // wait up to 15 min for response headers
  bodyTimeout: 900_000,             // wait up to 15 min for response body
});

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

// ─── GPT-5.4 Vision Chat (Kie.ai Codex Responses API) ──
// Supports text + image_url input. Returns SSE streaming response.

export interface Gpt5Message {
  role: 'system' | 'user' | 'assistant' | 'developer' | 'tool';
  content: Gpt5ContentItem[];
}

export interface Gpt5ContentItem {
  type: 'input_text' | 'input_image' | 'input_file';
  text?: string;
  image_url?: string;
  file_url?: string;
}

export async function gpt5Chat(
  messages: Gpt5Message[],
  opts?: { effort?: 'low' | 'medium' | 'high' | 'xhigh'; stream?: boolean; timeoutMs?: number },
): Promise<string | null> {
  const kieKey = process.env.KIE_API_KEY;
  if (!kieKey) { console.log('[gpt5] No KIE_API_KEY'); return null; }

  const proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;
  try {
    const body: any = {
      model: 'gpt-5-4',
      input: messages,
      stream: true, // 持续推送 SSE，防止 Cloudflare/路由器将空闲 TCP 断开
      reasoning: { effort: opts?.effort || 'high' },
    };
    if (opts?.stream !== undefined) body.stream = opts.stream;

    const fetchOpts: any = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + kieKey },
      body: JSON.stringify(body),
    };
    if (proxy) { fetchOpts.dispatcher = new ProxyAgent(proxy); }
    else { fetchOpts.dispatcher = kieKeepAliveAgent; }

    const url = 'https://api.kie.ai/codex/v1/responses';
    const imgCount = messages.reduce((n, m) => n + m.content.filter(c => c.type === 'input_image').length, 0);
    console.log('[gpt5] Calling ' + url + ' msgs=' + messages.length + ' imgs=' + imgCount + ' effort=' + (opts?.effort || 'high'));
    const timeoutMs = opts?.timeoutMs || 120000;
    const ac = new AbortController(); const tm = setTimeout(() => ac.abort(), timeoutMs); fetchOpts.signal = ac.signal;
    const resp = await fetch(url, fetchOpts).finally(() => clearTimeout(tm));
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      console.log('[gpt5] HTTP', resp.status, 'body:', errBody.slice(0, 300));
      return null;
    }

    const raw = await resp.text();

    // Try JSON first (non-streaming or completed response)
    if (raw.trim().startsWith('{')) {
      try {
        const data = JSON.parse(raw);
        if (data.output && Array.isArray(data.output)) {
          const texts: string[] = [];
          for (const o of data.output) {
            if (o.content && Array.isArray(o.content)) {
              for (const c of o.content) {
                if (c.text) texts.push(c.text);
              }
            }
          }
          const outputText = texts.join('').trim();
          if (outputText) {
            console.log('[gpt5] JSON output ' + outputText.length + ' chars, credits=' + (data.credits_consumed || '?') + ': ' + outputText.slice(0, 120));
            return outputText;
          }
        }
        if (data.status === 'failed' || data.error) {
          const errMsg = data.error?.message || data.error?.type || JSON.stringify(data.error || data).slice(0, 200);
          console.log('[gpt5] Error:', errMsg);
          return null;
        }
      } catch { /* fall through to SSE parsing */ }
    }

    // Parse SSE (Server-Sent Events) response
    const lines = raw.split('\n');
    let outputText = '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const d = JSON.parse(line.slice(6));
        if (d.type === 'response.output_text.delta' && d.delta) {
          outputText += d.delta;
        }
        if (d.type === 'response.completed' && d.response?.output) {
          for (const o of d.response.output) {
            if (o.content && Array.isArray(o.content)) {
              for (const c of o.content) {
                if (c.text) outputText += c.text;
              }
            }
          }
        }
        if (d.error) {
          console.log('[gpt5] SSE error:', JSON.stringify(d.error).slice(0, 200));
        }
      } catch { /* skip */ }
    }

    outputText = outputText.trim();
    if (outputText) {
      // Deduplicate (SSE deltas + completed may overlap)
      const half = Math.floor(outputText.length / 2);
      if (half > 0 && outputText.slice(0, half) === outputText.slice(half)) {
        outputText = outputText.slice(0, half);
      }
      console.log('[gpt5] SSE output ' + outputText.length + ' chars: ' + outputText.slice(0, 120));
      return outputText;
    }
    console.log('[gpt5] Empty output after parse, status=' + resp.status + ' rawLen=' + raw.length + ' first=' + raw.slice(0, 300));
    return null;
  } catch (err: any) {
    const detail = err?.cause?.code || err?.cause?.message || err?.code || '';
    console.log('[gpt5] Failed:', String(err).slice(0, 100), detail ? '| cause: ' + String(detail).slice(0, 80) : '');
    // Timeout → don't swallow; caller must NOT retry because kie.ai still processes the first request
    if (err?.name === 'AbortError') throw err;
    return null;
  }
}

// ─── Text LLM (Kie.ai Gemini preferred, DeepSeek fallback) ──
export async function geminiChat(
  systemPrompt: string,
  userContent: string,
  maxTokens: number = 4000
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
        model: 'gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.5, max_tokens: maxTokens,
      }),
    };
    if (proxy) { opts.dispatcher = new ProxyAgent(proxy); } else { opts.dispatcher = kieKeepAliveAgent; }
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
        max_tokens: 2000,
      }),
    };
    if (proxy) { opts.dispatcher = new ProxyAgent(proxy); } else { opts.dispatcher = kieKeepAliveAgent; }

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
    if (proxy) { opts.dispatcher = new ProxyAgent(proxy); } else { opts.dispatcher = kieKeepAliveAgent; }
    const resp = await fetch(base + '/chat/completions', opts);
    if (!resp.ok) { console.log('[kie-ds] Error:', resp.status); return null; }
    const data = await resp.json();
    const text = data.choices?.[0]?.message?.content?.trim();
    if (text) { console.log('[kie-ds]', text.slice(0, 60)); return text; }
    return null;
  } catch (err) { console.log('[kie-ds] Failed:', String(err).slice(0, 60)); return null; }
}
