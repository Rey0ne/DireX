/* === LLM Router — GPT-5.4 (text + vision) via Kie.ai === */

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
  opts?: { effort?: 'low' | 'medium' | 'high' | 'xhigh'; stream?: boolean; timeoutMs?: number; maxOutputTokens?: number },
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
      max_output_tokens: opts?.maxOutputTokens || 16000,
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

// ─── Text LLM (GPT-5.4 via Kie.ai) ──
// Thin wrapper — converts simple (systemPrompt, userContent) to gpt5Chat message format.
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

  return gpt5Chat([
    { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
    { role: 'user', content: [{ type: 'input_text', text: userContent }] },
  ], { effort: 'low', timeoutMs: 60000, maxOutputTokens: maxTokens });
}

// ─── Vision LLM (GPT-5.4 multimodal — for image analysis) ──
export async function visionAnalyze(
  systemPrompt: string,
  imageBase64: string,
  mimeType: string = 'image/png'
): Promise<string | null> {
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;
  return gpt5Chat([
    { role: 'system', content: [{ type: 'input_text', text: systemPrompt }] },
    { role: 'user', content: [
      { type: 'input_text', text: 'Analyze the attached image per the system instructions.' },
      { type: 'input_image', image_url: dataUrl },
    ]},
  ], { effort: 'medium', timeoutMs: 90000, maxOutputTokens: 2000 });
}
