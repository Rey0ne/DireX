/* === Auth middleware — Shared key + JWT users === */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SHARED_KEY = process.env.SHARED_API_KEY || 'tapnow-dev-key';
const JWT_SECRET = process.env.JWT_SECRET || 'direx-jwt-dev-secret';

export interface AuthUser {
  userId: string;
  email: string;
  plan: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// 公开路由 — 不需要认证
const PUBLIC_ROUTES = [
  '/api/health',
  '/api/auth/register',
  '/api/auth/login',
  '/api/download',
  '/api/proxy-image',
  '/api/proxy-video',
  '/api/last-compiled',
  '/api/kie-callback',
];

function isPublic(req: Request): boolean {
  if (PUBLIC_ROUTES.includes(req.path)) return true;
  // GET /api/canvas 公开
  if (req.path === '/api/canvas' && req.method === 'GET') return true;
  return false;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith('/api/') || isPublic(req)) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization token' });
    return;
  }

  const token = authHeader.slice(7);

  // 1. 先试 JWT（用户令牌）
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = decoded;
    return next();
  } catch {
    // 不是有效 JWT，继续试共享密钥
  }

  // 2. 再试共享密钥（服务间调用 / 开发免登录）
  if (token === SHARED_KEY) {
    return next();
  }

  res.status(401).json({ error: 'Invalid authorization token' });
}

/** 要求登录（有 req.user），否则返回 401 */
export function requireUser(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Login required' });
    return;
  }
  next();
}

/** 签发 JWT */
export function signToken(payload: AuthUser): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}
