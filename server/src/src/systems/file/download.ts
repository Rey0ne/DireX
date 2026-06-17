/* === File System — Download proxy === */
/* Proxies remote asset URLs for download, avoiding CORS issues */

import type { Request, Response } from 'express';

export async function handleDownload(req: Request, res: Response): Promise<void> {
  const url = req.query.url as string;
  if (!url) { res.status(400).json({ error: 'Missing ?url=' }); return; }

  try {
    const resp = await fetch(url);
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
