/* === Video Prompt Compiler === */
/* Agent does NOT analyze images/videos — Seedance sees them directly via API.
   Agent only compiles user's fuzzy instructions into structured English prompt
   with reference role mapping. */

import { gpt5Chat } from '../ai/gemini.js';

const VIDEO_COMPILE_SYSTEM = `You are a Video Generation Prompt Compiler. You receive:
1. User's instruction in Chinese (may reference images/videos)
2. Information about what references are available (images, videos)

Your job: compile the user's instruction into a structured English prompt for Seedance 2.0.

CRITICAL: You do NOT describe reference images or videos. The model (Seedance) will see them directly via API. Your job is to map them to roles and describe what the OUTPUT should look like.

Rules:
1. IDENTITY → "Use the provided reference image(s) as the sole identity reference. Preserve exact facial proportions, features, skin tone, body type."
2. WARDROBE → "Match clothing, accessories from reference image(s) exactly."
3. ENVIRONMENT → "Use the provided scene reference image(s) as the environment."
4. CAMERA → "Follow the camera language, trajectory, lens movement, timing, speed from the provided reference video(s)."
5. MOTION → "Follow the body performance, action timing, and rhythm from the provided reference video(s)."
6. LIGHTING & MOOD → Describe the desired lighting and mood from user instruction (NOT from reference analysis).
7. QUALITY → "Ultra photorealistic, cinematic, 24fps, film grain, natural motion blur."

Output format:
- First line: Primary subject reference instruction
- Then: Wardrobe, environment, camera, motion references
- Then: Action/scene description from user's words
- Then: Lighting, mood, quality
- End with: ONE cohesive English paragraph suitable for direct API input
- NO markdown formatting, NO bullet points, NO Chinese text

The model will receive the actual image/video files directly. Your prompt tells it HOW to use them.`;

export async function compileVideoPrompt(
  userInput: string,
  hasImageRefs: boolean,
  hasVideoRefs: boolean,
): Promise<string> {
  const refInfo = [
    hasImageRefs ? '- Reference image(s) are provided: use them for identity, wardrobe, scene as described in user instruction' : '',
    hasVideoRefs ? '- Reference video(s) are provided: use them for camera movement, motion, timing, rhythm' : '',
  ].filter(Boolean).join('\n');

  const userContent = `Available references:
${refInfo || '- No references provided — generate from text description only'}

User instruction (Chinese): ${userInput}

Compile into a structured English video generation prompt. Remember: do NOT describe the references — just map them to roles. Seedance will see the actual files.`;

  console.log('[video-compiler] Compiling prompt, hasImg=' + hasImageRefs + ' hasVid=' + hasVideoRefs);
  const result = await gpt5Chat(
    [{ role: 'system', content: [{ type: 'input_text', text: VIDEO_COMPILE_SYSTEM }] },
     { role: 'user', content: [{ type: 'input_text', text: userContent }] }],
    { effort: 'low', timeoutMs: 30000, maxOutputTokens: 1000 }
  );

  if (!result) {
    console.log('[video-compiler] Compilation failed, falling back to user input');
    return userInput;
  }

  console.log('[video-compiler] Compiled: ' + result.length + ' chars — ' + result.slice(0, 120));
  return result;
}
