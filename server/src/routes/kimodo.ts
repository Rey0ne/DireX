/* === Kimodo Motion Generation Bridge ===
 * 1. 中文→英文翻译（复用 GPT-5.4）
 * 2. 转发到 Kimodo Windows FastAPI 服务
 * 3. BVH 文件存储 + 公网 URL 返回
 * 4. GLB 模型保存到 output 目录
 */
import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const router = Router();

// Configuration
const KIMODO_URL = process.env.KIMODO_URL || 'http://127.0.0.1:8000';
const BVH_DIR = join(process.cwd(), 'data', 'bvh');
const OUTPUT_DIR = join(process.cwd(), 'data', 'output');

try { mkdirSync(BVH_DIR, { recursive: true }); } catch {}
try { mkdirSync(OUTPUT_DIR, { recursive: true }); } catch {}

// ─── Health proxy ──────────────────────────────────

router.get('/health', async (_req: Request, res: Response) => {
  try {
    const resp = await fetch(`${KIMODO_URL}/health`, { signal: AbortSignal.timeout(5000) });
    const data = await resp.json();
    res.json({ ...data, proxy_ok: true });
  } catch (e) {
    res.json({ status: 'unreachable', error: String(e).slice(0, 200) });
  }
});

// ─── Translate: Chinese → English ────────────────

router.post('/translate', async (req: Request, res: Response) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing prompt' });
    return;
  }

  // Check if already English (no CJK)
  const hasCJK = /[一-鿿㐀-䶿]/.test(prompt);
  if (!hasCJK) {
    res.json({ original: prompt, translated: prompt, wasTranslated: false });
    return;
  }

  try {
    // Reuse existing gpt5Chat for translation (same pattern as T2I in index.ts)
    const { gpt5Chat } = await import('../systems/ai/gemini.js');
    const systemPrompt = `You are a motion description translator. Translate Chinese motion descriptions to English for a motion generation AI (Kimodo). Rules:
1. Be specific about movement style, speed, emotion, body mechanics
2. Use cinematic/animation terminology
3. Keep the translated prompt under 200 characters
4. Output ONLY the English translation, no explanations, no quotes`;

    const translated = await gpt5Chat(
      [{ role: 'user', content: [{ type: 'input_text', text: systemPrompt + '\n\n中文: ' + prompt + '\nEnglish:' }] }],
      { effort: 'low', timeoutMs: 30000, maxOutputTokens: 300 },
    );

    if (translated) {
      console.log('[kimodo] Translated:', prompt.slice(0, 60), '→', translated.slice(0, 80));
      res.json({ original: prompt, translated, wasTranslated: true });
    } else {
      // Fallback: send Chinese directly (Kimodo might handle it to some degree)
      console.log('[kimodo] Translation failed, using original:', prompt.slice(0, 60));
      res.json({ original: prompt, translated: prompt, wasTranslated: false, warning: 'Translation failed, using raw input' });
    }
  } catch (e) {
    console.log('[kimodo] Translation error:', String(e).slice(0, 100));
    res.json({ original: prompt, translated: prompt, wasTranslated: false, warning: String(e).slice(0, 200) });
  }
});

// ─── Generate BVH animation ─────────────────────

router.post('/generate', async (req: Request, res: Response) => {
  const t0 = Date.now();
  const { prompt, numFrames, denoisingSteps, seed, firstHeadingAngle } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Missing prompt' });
    return;
  }

  // Step 1: Auto-translate Chinese → English
  let englishPrompt = prompt;
  const hasCJK = /[一-鿿㐀-䶿]/.test(prompt);
  if (hasCJK) {
    try {
      const { gpt5Chat } = await import('../systems/ai/gemini.js');
      const systemPrompt = `You are a motion description translator. Translate Chinese motion descriptions to English for a motion generation AI (Kimodo). Rules:
1. Be specific about movement style, speed, emotion, body mechanics
2. Use cinematic/animation terminology
3. Keep the translated prompt under 200 characters
4. Output ONLY the English translation, no explanations, no quotes`;

      const translated = await gpt5Chat(
        [{ role: 'user', content: [{ type: 'input_text', text: systemPrompt + '\n\n中文: ' + prompt + '\nEnglish:' }] }],
        { effort: 'low', timeoutMs: 30000, maxOutputTokens: 300 },
      );
      if (translated) {
        englishPrompt = translated;
        console.log('[kimodo] Auto-translated:', prompt.slice(0, 60), '→', englishPrompt.slice(0, 80));
      }
    } catch (e) {
      console.log('[kimodo] Translation failed, using raw:', String(e).slice(0, 80));
      // Continue with original prompt
    }
  }

  // Step 2: Forward to Kimodo Windows server
  try {
    console.log('[kimodo] Generating:', englishPrompt.slice(0, 80),
                'frames=' + (numFrames || 90), 'seed=' + (seed ?? 'random'));

    const kimodoResp = await fetch(`${KIMODO_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: englishPrompt,
        num_frames: numFrames || 90,
        num_denoising_steps: denoisingSteps || 50,
        seed: seed != null ? seed : -1,
        first_heading_angle: firstHeadingAngle || 0.0,
      }),
      signal: AbortSignal.timeout(600_000), // 10 min timeout
    });

    if (!kimodoResp.ok) {
      const errText = await kimodoResp.text();
      console.error('[kimodo] Upstream error:', errText.slice(0, 200));
      res.status(502).json({ error: 'Kimodo upstream error', detail: errText.slice(0, 300) });
      return;
    }

    const genResult: any = await kimodoResp.json();
    const bvhBuf = Buffer.from(genResult.bvh_base64, 'base64');

    // Step 3: Save BVH to disk
    const bvhId = uuid();
    const bvhName = `kimodo_${bvhId.slice(0, 8)}.bvh`;
    const bvhPath = join(BVH_DIR, bvhName);
    writeFileSync(bvhPath, bvhBuf);

    const elapsed = (Date.now() - t0) / 1000;
    console.log('[kimodo] Done:', bvhName, `${(bvhBuf.length / 1024).toFixed(0)}KB`,
                `${genResult.num_frames}f in ${elapsed.toFixed(1)}s`);

    res.json({
      success: true,
      bvhUrl: `/api/models/bvh/${bvhName}`,
      bvhBase64: genResult.bvh_base64,
      posedJoints: genResult.posed_joints?.[0] ?? genResult.posed_joints,  // squeeze [S,T,J,3] → [T,J,3]
      jointNames: genResult.joint_names,
      numFrames: genResult.num_frames,
      fps: genResult.fps,
      generationTimeS: genResult.generation_time_s,
      seedUsed: genResult.seed_used,
      promptUsed: englishPrompt,
      originalPrompt: prompt,
      wasTranslated: hasCJK && englishPrompt !== prompt,
      bvhBytes: bvhBuf.length,
    });
  } catch (e: any) {
    console.error('[kimodo] Error:', e.message);
    const elapsed = (Date.now() - t0) / 1000;
    res.status(502).json({
      error: 'Kimodo service unreachable',
      detail: String(e).slice(0, 300),
      elapsedSeconds: elapsed,
    });
  }
});

// ─── List saved BVH files ─────────────────────────

router.get('/history', (_req: Request, res: Response) => {
  try {
    const files = readdirSync(BVH_DIR)
      .filter((f: string) => f.startsWith('kimodo_') && f.endsWith('.bvh'))
      .map((f: string) => {
        const s = statSync(join(BVH_DIR, f));
        return { name: f, url: `/api/models/bvh/${f}`, size: s.size, created: s.birthtime.toISOString() };
      })
      .sort((a: any, b: any) => b.created.localeCompare(a.created));
    res.json({ files });
  } catch (e) {
    res.json({ files: [], error: String(e).slice(0, 200) });
  }
});

// ─── Save GLB model to output ────────────────────

router.post('/save', async (req: Request, res: Response) => {
  try {
    const { glbBase64, prompt } = req.body;
    if (!glbBase64) {
      res.status(400).json({ error: 'Missing glbBase64' });
      return;
    }

    const glbId = uuid();
    const label = (prompt || 'motion').slice(0, 30).replace(/[^a-zA-Z0-9一-鿿_-]/g, '_');
    const glbName = `kimodo_${label}_${glbId.slice(0, 8)}.glb`;
    const glbPath = join(OUTPUT_DIR, glbName);
    const glbBuf = Buffer.from(glbBase64, 'base64');
    writeFileSync(glbPath, glbBuf);

    console.log('[kimodo] Saved GLB:', glbName, `${(glbBuf.length / 1024).toFixed(0)}KB`);

    res.json({
      success: true,
      name: glbName,
      url: `/api/kimodo/output/${glbName}`,
      size: glbBuf.length,
    });
  } catch (e: any) {
    console.error('[kimodo] Save error:', e.message);
    res.status(500).json({ error: String(e).slice(0, 200) });
  }
});

// ─── Serve saved GLB files ────────────────────────

router.get('/output/:name', (req: Request, res: Response) => {
  const filePath = join(OUTPUT_DIR, req.params.name);
  if (!existsSync(filePath)) { res.status(404).json({ error: 'File not found' }); return; }
  res.sendFile(filePath);
});

export default router;
