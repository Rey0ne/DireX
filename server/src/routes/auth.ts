/* === Auth Routes — Register / Login / Me / Credits === */
import { Router, Request, Response } from 'express';
import { createUser, getUserByEmail, verifyPassword, getProfile, updateCredits } from '../systems/db/user-store.js';
import { addTransaction, getRecentTransactions } from '../systems/db/credit-store.js';
import { signToken, requireUser } from '../middleware/auth.js';
import type { RegisterRequest, LoginRequest, AuthResponse, CreditBalanceResponse } from '../../../../shared/api-types.js';

const router = Router();

// POST /api/auth/register
router.post('/register', (req: Request, res: Response) => {
  try {
    const { email, password, name } = req.body as RegisterRequest;
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password required' } as AuthResponse);
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters' } as AuthResponse);
      return;
    }
    const { user } = createUser(email, password, name);
    addTransaction(user.id, 200, 'signup_bonus', '注册赠送 200 积分', 200);
    const token = signToken({ userId: user.id, email: user.email, plan: user.plan });
    res.json({ success: true, token, user } as AuthResponse);
  } catch (err: any) {
    if (err.message === 'EMAIL_EXISTS') {
      res.status(409).json({ success: false, error: 'Email already registered' } as AuthResponse);
    } else {
      console.error('[auth] register error:', err);
      res.status(500).json({ success: false, error: 'Internal error' } as AuthResponse);
    }
  }
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as LoginRequest;
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password required' } as AuthResponse);
      return;
    }
    const user = getUserByEmail(email);
    if (!user || !verifyPassword(user, password)) {
      res.status(401).json({ success: false, error: 'Invalid email or password' } as AuthResponse);
      return;
    }
    const profile = getProfile(user.id)!;
    const token = signToken({ userId: user.id, email: user.email, plan: user.plan });
    res.json({ success: true, token, user: profile } as AuthResponse);
  } catch (err) {
    console.error('[auth] login error:', err);
    res.status(500).json({ success: false, error: 'Internal error' } as AuthResponse);
  }
});

// GET /api/auth/me — 查询当前用户
router.get('/me', requireUser, (req: Request, res: Response) => {
  const profile = getProfile(req.user!.userId);
  if (!profile) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user: profile });
});

// GET /api/auth/credits — 积分余额 + 交易记录
router.get('/credits', requireUser, (req: Request, res: Response) => {
  const profile = getProfile(req.user!.userId);
  if (!profile) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const transactions = getRecentTransactions(req.user!.userId, 20);
  const resp: CreditBalanceResponse = {
    credits: profile.credits,
    plan: profile.plan,
    monthlyAllowance: 0, // 后续套餐对接时填
    recentTransactions: transactions,
  };
  res.json(resp);
});

// POST /api/auth/credits/spend — 扣减积分（内部调用，后续中间件也会用）
router.post('/credits/spend', requireUser, (req: Request, res: Response) => {
  const { amount, type, description } = req.body;
  if (!amount || amount <= 0) {
    res.status(400).json({ error: 'Invalid amount' });
    return;
  }
  const profile = getProfile(req.user!.userId);
  if (!profile) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (profile.credits < amount) {
    res.status(402).json({ error: 'Insufficient credits', credits: profile.credits, required: amount });
    return;
  }
  const updated = updateCredits(req.user!.userId, -amount);
  if (!updated) {
    res.status(500).json({ error: 'Failed to update credits' });
    return;
  }
  const tx = addTransaction(req.user!.userId, -amount, type || 'spend_image', description || '积分消耗', updated.credits);
  res.json({ success: true, credits: updated.credits, transaction: tx });
});

export default router;
