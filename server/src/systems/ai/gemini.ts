/* === Gemini — via Kie.ai (OpenAI-compatible LLM endpoint) === */

import { ProxyAgent } from 'undici';

const BASE = process.env.KIE_BASE_URL || 'https://api.kie.ai/api/v1';

function kieFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const proxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.http_proxy;
  if (proxy) return fetch(url, { ...options, dispatcher: new ProxyAgent(proxy) } as any);
  return fetch(url, options);
}

export async function geminiChat(
  systemPrompt: string,
  userContent: string,
  maxTokens: number = 600
): Promise<string | null> {
  const apiKey = process.env.KIE_API_KEY;
  if (!apiKey) { console.log('[gemini] No KIE_API_KEY configured'); return null; }

  try {
    const resp = await kieFetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gemini-2.5-pro',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.5,
        max_tokens: maxTokens,
      }),
    });

    if (!resp.ok) { console.log('[gemini] Kie.ai error:', resp.status); return null; }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) { console.log('[gemini] Failed:', String(err).slice(0, 60)); return null; }
}
