/* === DeepSeek V4 — Official API (LLM compile + tool calling) === */
const ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';

export async function deepseekChat(
  systemPrompt: string,
  userContent: string,
  maxTokens: number = 600
): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  try {
    const resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
    });

    if (!resp.ok) { console.log('[deepseek] Error:', resp.status); return null; }
    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) { console.log('[deepseek] Failed:', String(err).slice(0, 60)); return null; }
}

// ── Tool-calling variant ──────────────────────────

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface LLMTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface LLMToolResponse {
  content: string | null;
  toolCalls: LLMToolCall[] | null;
}

export async function deepseekChatWithTools(
  messages: LLMMessage[],
  tools: LLMTool[],
  maxTokens: number = 800,
): Promise<LLMToolResponse | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  try {
    const resp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        tools,
        temperature: 0.7,
        max_tokens: maxTokens,
      }),
    });

    if (!resp.ok) {
      console.log('[deepseek-tools] Error:', resp.status);
      return null;
    }
    const data = await resp.json();
    const msg = data.choices?.[0]?.message;
    return {
      content: msg?.content?.trim() || null,
      toolCalls: msg?.tool_calls || null,
    };
  } catch (err) {
    console.log('[deepseek-tools] Failed:', String(err).slice(0, 60));
    return null;
  }
}
