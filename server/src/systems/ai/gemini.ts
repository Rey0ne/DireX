/* === Gemini 3 Pro — Official API (LLM polish) === */

export async function geminiChat(
  systemPrompt: string,
  userContent: string,
  maxTokens: number = 600
): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const model = 'gemini-2.5-pro-exp-03-25';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userContent}` }] }],
        generationConfig: { temperature: 0.5, maxOutputTokens: maxTokens },
      }),
    });

    if (!resp.ok) { console.log('[gemini] Error:', resp.status); return null; }
    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
  } catch (err) { console.log('[gemini] Failed:', String(err).slice(0, 60)); return null; }
}
