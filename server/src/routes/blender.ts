/* === Blender API Routes — auto-rig / bake / render === */
import { Router, Request, Response } from 'express';
import { execSync, exec } from 'child_process';
import { v4 as uuid } from 'uuid';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';
// 简单鉴权：检查 shared API key
const SHARED_KEY = process.env.SHARED_API_KEY || 'tapnow-dev-key';
function checkAuth(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== SHARED_KEY) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  next();
}

const router = Router();
const WORKSPACE = join(process.cwd(), 'data', 'blender-jobs');
const BLENDER_SCRIPT = join(process.cwd(), 'blender', 'auto_rig.py');

// 确保工作目录存在
try { mkdirSync(WORKSPACE, { recursive: true }); } catch {}

// ─── Auto-Rig ─────────────────────────────────────
router.post('/auto-rig', checkAuth as any, async (req: Request, res: Response) => {
  const { modelBase64, format } = req.body; // format: 'glb' | 'fbx'
  if (!modelBase64) {
    res.status(400).json({ success: false, error: 'modelBase64 required' });
    return;
  }
  const jobId = uuid();
  const jobDir = join(WORKSPACE, jobId);
  mkdirSync(jobDir, { recursive: true });

  const ext = format || 'glb';
  const inputPath = join(jobDir, `input.${ext}`);
  const outputPath = join(jobDir, `output.glb`);

  // 写入上传的模型
  const buffer = Buffer.from(modelBase64, 'base64');
  writeFileSync(inputPath, buffer);

  console.log(`[blender] Job ${jobId}: auto-rig ${ext} (${(buffer.length / 1024).toFixed(1)} KB)`);

  // 本地 Blender（Windows）
  const blenderExe = process.env.BLENDER_PATH || 'D:/Blander/blender.exe';
  const blendScript = BLENDER_SCRIPT.replace(/\//g, '\\\\');
  const inPath = inputPath.replace(/\//g, '\\\\');
  const outPath = outputPath.replace(/\//g, '\\\\');
  const cmd = `"${blenderExe}" --background --python "${blendScript}" -- "${inPath}" "${outPath}"`;
  console.log(`[blender] Running: ${cmd}`);

  exec(cmd, { timeout: 120_000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
    if (err && err.killed) {
      res.status(504).json({ success: false, error: 'Timeout: auto-rig took longer than 2 minutes' });
      cleanJob(jobDir);
      return;
    }
    // 从 stdout 提取最后一行 JSON
    const lines = stdout.trim().split('\n');
    const lastLine = lines[lines.length - 1];
    try {
      const result = JSON.parse(lastLine);
      if (result.success && existsSync(outputPath)) {
        const outputBuffer = readFileSync(outputPath);
        const outputBase64 = outputBuffer.toString('base64');
        res.json({
          success: true,
          boneCount: result.bone_count,
          outputModel: outputBase64,
          outputFormat: 'glb',
          jobId,
        });
        console.log(`[blender] Job ${jobId}: success, ${result.bone_count} bones`);
      } else {
        res.json({ success: false, error: result.error || 'Auto-rig failed', debugOutput: stdout.slice(-500) });
      }
    } catch {
      // 如果 Blender 成功但 JSON 解析失败，尝试返回文件
      if (existsSync(outputPath)) {
        const outputBuffer = readFileSync(outputPath);
        res.json({ success: true, boneCount: 0, outputModel: outputBuffer.toString('base64'), outputFormat: 'glb', jobId });
      } else {
        res.status(500).json({ success: false, error: 'Blender execution failed', debugOutput: stdout.slice(-500) });
      }
    }
    cleanJob(jobDir);
  });
});

// ─── Animation Bake ───────────────────────────────
router.post('/bake-animation', checkAuth as any, async (req: Request, res: Response) => {
  // 后续实现：合并多段动画
  res.status(501).json({ success: false, error: 'Coming soon' });
});

// ─── Status check ─────────────────────────────────
router.get('/status', (_req: Request, res: Response) => {
  const blenderInstalled = (() => {
    try { execSync('blender --version', { timeout: 5000 }); return true; } catch { return false; }
  })();
  res.json({ blenderInstalled, workspace: WORKSPACE });
});

function cleanJob(dir: string) {
  setTimeout(() => {
    try { rmSync(dir, { recursive: true }); } catch {}
  }, 60000); // 1 分钟后清理
}

export default router;
