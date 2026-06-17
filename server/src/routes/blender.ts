/* === Blender API Routes — async job-based auto-rig / bake / render === */
import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { v4 as uuid } from 'uuid';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs';
import { join } from 'path';

const router = Router();
const WORKSPACE = join(process.cwd(), 'data', 'blender-jobs');
const BLENDER_EXE = process.env.BLENDER_PATH || 'D:/Blander/blender.exe';
const BLENDER_SCRIPT = join(process.cwd(), 'blender', 'auto_rig.py');

try { mkdirSync(WORKSPACE, { recursive: true }); } catch {}

// 简单鉴权
const SHARED_KEY = process.env.SHARED_API_KEY || 'tapnow-dev-key';
function checkAuth(req: Request, res: Response, next: Function) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== SHARED_KEY) { res.status(401).json({ error: 'Unauthorized' }); return; }
  next();
}

// ─── Job storage (内存 Map) ───────────────────────
interface BlenderJob {
  id: string; status: 'processing' | 'done' | 'error';
  boneCount: number; error: string | null;
  outputBase64: string | null; createdAt: number;
}
const jobs = new Map<string, BlenderJob>();

// ─── POST /auto-rig — 提交绑骨任务 ───────────────
router.post('/auto-rig', checkAuth as any, async (req: Request, res: Response) => {
  const { modelBase64, format } = req.body;
  if (!modelBase64) {
    res.status(400).json({ success: false, error: 'modelBase64 required' });
    return;
  }
  const jobId = uuid();
  const jobDir = join(WORKSPACE, jobId);
  mkdirSync(jobDir, { recursive: true });

  const ext = format || 'glb';
  const inputPath = join(jobDir, `input.${ext}`).replace(/\//g, '\\');
  const outputPath = join(jobDir, `output.glb`).replace(/\//g, '\\');
  const scriptPath = BLENDER_SCRIPT.replace(/\//g, '\\');

  const buffer = Buffer.from(modelBase64, 'base64');
  writeFileSync(inputPath, buffer);

  const job: BlenderJob = { id: jobId, status: 'processing', boneCount: 0, error: null, outputBase64: null, createdAt: Date.now() };
  jobs.set(jobId, job);

  console.log(`[blender] Job ${jobId}: started (${(buffer.length / 1024).toFixed(0)} KB)`);

  const cmd = `"${BLENDER_EXE}" --background --python "${scriptPath}" -- "${inputPath}" "${outputPath}"`;
  exec(cmd, { timeout: 300_000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
    if (stderr) console.log(`[blender] Job ${jobId}: stderr:`, stderr.slice(-500));
    if (err && err.killed) {
      job.status = 'error'; job.error = 'Timeout (5 minutes)';
      console.log(`[blender] Job ${jobId}: timeout`);
      return;
    }
    const lines = stdout.trim().split('\n');
    let lastLine = lines[lines.length - 1] || '';
    // Skip non-JSON lines (Blender debug output)
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim().startsWith('{')) { lastLine = lines[i]; break; }
    }
    console.log(`[blender] Job ${jobId}: lastLine=${lastLine.slice(0,200)}`);
    try {
      const result = JSON.parse(lastLine);
      job.boneCount = result.bone_count || 0;
      if (result.success && existsSync(outputPath)) {
        const buf = readFileSync(outputPath);
        job.outputBase64 = buf.toString('base64');
        job.status = 'done';
        console.log(`[blender] Job ${jobId}: done, ${job.boneCount} bones, ${(buf.length/1024).toFixed(0)} KB`);
      } else {
        job.status = 'error'; job.error = result.error || 'Auto-rig failed';
        console.log(`[blender] Job ${jobId}: failed — ${job.error}`);
      }
    } catch {
      job.status = 'error'; job.error = 'Blender output parse error';
    }
    // 1分钟后清理临时文件
    setTimeout(() => { try { rmSync(jobDir, { recursive: true }); } catch {} }, 60000);
  });

  res.json({ success: true, jobId, status: 'processing' });
});

// ─── GET /job/:id — 查询任务状态 ──────────────────
router.get('/job/:id', checkAuth as any, (req: Request, res: Response) => {
  const job = jobs.get(req.params.id);
  if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
  res.json({
    status: job.status,
    boneCount: job.boneCount,
    error: job.error,
    outputModel: job.outputBase64,
    outputFormat: 'glb',
  });
  // 查询后 5 分钟清理内存
  if (job.status === 'done' || job.status === 'error') {
    setTimeout(() => jobs.delete(job.id), 300000);
  }
});

// ─── GET /status ──────────────────────────────────
router.get('/status', (_req: Request, res: Response) => {
  const active = Array.from(jobs.values()).filter(j => j.status === 'processing').length;
  res.json({ blenderPath: BLENDER_EXE, scriptPath: BLENDER_SCRIPT, activeJobs: active });
});

export default router;
