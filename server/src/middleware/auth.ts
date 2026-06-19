/* === Auth middleware + JWT helpers === */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SHARED_KEY = process.env.SHARED_API_KEY || 'tapnow-dev-key';
const JWT_SECRET = process.env.JWT_SECRET || 'direx-jwt-secret-dev';

// Extend Express Request
declare global { namespace Express { interface Request { user?: { userId: string; email: string; plan: string }; } } }

export function signToken(payload: { userId: string; email: string; plan: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const ah = req.headers.authorization;
  if (!ah || !ah.startsWith('Bearer ')) { res.status(401).json({ error: 'Missing user token' }); return; }
  try {
    const payload = jwt.verify(ah.slice(7), JWT_SECRET) as any;
    req.user = payload;
    next();
  } catch { res.status(401).json({ error: 'Invalid user token' }); }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip auth for public routes
  if (!req.path.startsWith('/api/') || req.path === '/api/health' || req.path === '/api/download' || req.path === '/api/proxy-image' || req.path === '/api/last-compiled' || req.path.startsWith('/admin') || req.path === '/api/kie-callback' || req.path.startsWith('/api/auth') || req.path.startsWith('/api/agent/script')) return next();

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
