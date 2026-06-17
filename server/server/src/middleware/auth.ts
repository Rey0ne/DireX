/* === Simple shared API key auth === */
import { Request, Response, NextFunction } from 'express';

const SHARED_KEY = process.env.SHARED_API_KEY || 'tapnow-dev-key';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip auth for health check
  if (!req.path.startsWith('/api/') || req.path === '/api/health' || req.path === '/api/download' || req.path === '/api/proxy-image' || req.path === '/api/last-compiled' || req.path.startsWith('/admin') || req.path === '/api/kie-callback') return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization token' });
    return;
  }

  const token = authHeader.slice(7);
  if (token !== SHARED_KEY) {
    res.status(401).json({ error: 'Invalid authorization token' });
    return;
  }

  next();
}
