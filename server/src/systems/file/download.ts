/* === File System — Download proxy === */
/* Serves local cached files directly; proxies remote URLs as fallback. */

import type { Request, Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';

const OUTPUT_DIR = path.join(process.cwd(), 'server', 'data', 'output');

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
};

export async function handleDownload(req: Request, res: Response): Promise<void> {
  const url = req.query.url as string;
  if (!url) { res.status(400).json({ error: 'Missing ?url=' }); return; }

  // ── Local cache path ── serve directly from disk (fast)
  if (url.startsWith('/api/output/')) {
    const filename = path.basename(url.split('?')[0]);
    const filepath = path.join(OUTPUT_DIR, filename);
    try {
      if (fs.existsSync(filepath)) {
        const ext = path.extname(filename).toLowerCase();
        const mime = MIME_MAP[ext] || 'application/octet-stream';
        res.setHeader('Content-Type', mime);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        fs.createReadStream(filepath).pipe(res);
        return;
      }
    } catch {}
    // File not found locally — fall through to remote proxy
  }

  // ── Remote proxy ── fetch from external CDN
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'DireX/1.0 (download-proxy)' },
      signal: AbortSignal.timeout(120_000),
    });
    if (!resp.ok) { res.status(502).json({ error: `Upstream ${resp.status}` }); return; }

    const contentType = resp.headers.get('content-type') || 'image/png';
    const disposition = `attachment; filename="tapnow-${Date.now()}.${contentType.split('/')[1] || 'png'}"`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', disposition);

    if (resp.body) {
      const reader = resp.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    }
    res.end();
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
