/* === Auth Routes — Register / Login / Me / Credits === */
import { Router, Request, Response } from 'express';
import { createUser, getUserByAccount, verifyPassword, getProfile, updateCredits, updatePlanAndCredits, deleteUser } from '../systems/db/user-store.js';
import { addTransaction, getRecentTransactions } from '../systems/db/credit-store.js';
import { signToken, requireUser } from '../middleware/auth.js';
import type { RegisterRequest, AuthResponse, CreditBalanceResponse } from '../../../../shared/api-types.js';

const router = Router();

// POST /api/auth/register
// 支持邮箱注册 / 手机号注册 / 公司注册
router.post('/register', (req: Request, res: Response) => {
  try {
    const body = req.body as RegisterRequest;

    // 至少提供一种登录方式
    if (!body.email && !body.phone) {
      res.status(400).json({ success: false, error: '邮箱或手机号至少填一项' } as AuthResponse);
      return;
    }
    if (!body.password || body.password.length < 6) {
      res.status(400).json({ success: false, error: '密码至少 6 位' } as AuthResponse);
      return;
    }
    if (!body.nickname?.trim()) {
      res.status(400).json({ success: false, error: '昵称必填' } as AuthResponse);
      return;
    }
    if (!body.accountType || !['individual', 'company'].includes(body.accountType)) {
      res.status(400).json({ success: false, error: '请选择账户类型' } as AuthResponse);
      return;
    }

    // 个人用户身份证必填
    if (body.accountType === 'individual') {
      if (!body.idType || !body.idNumber || !body.realName) {
        res.status(400).json({ success: false, error: '个人用户需填写身份证信息' } as AuthResponse);
        return;
      }
      if (!body.address) {
        res.status(400).json({ success: false, error: '请填写地址' } as AuthResponse);
        return;
      }
    }

    // 公司用户需公司代码
    if (body.accountType === 'company') {
      if (!body.companyCode) {
        res.status(400).json({ success: false, error: '公司用户需填写公司代码' } as AuthResponse);
        return;
      }
      if (!body.email) {
        res.status(400).json({ success: false, error: '公司用户需提供邮箱' } as AuthResponse);
        return;
      }
    }

    const { user } = createUser(body);
    addTransaction(user.userId, 200, 'signup_bonus', '注册赠送 200 积分', 200);
    const token = signToken({ userId: user.userId, email: user.email, plan: user.plan });
    res.json({ success: true, token, user } as AuthResponse);
  } catch (err: any) {
    const map: Record<string, number> = {
      EMAIL_EXISTS: 409,
      PHONE_EXISTS: 409,
      ID_REQUIRED: 400,
      COMPANY_CODE_REQUIRED: 400,
      NICKNAME_REQUIRED: 400,
    };
    const status = map[err.message] || 500;
    const messages: Record<string, string> = {
      EMAIL_EXISTS: '该邮箱已注册',
      PHONE_EXISTS: '该手机号已注册',
      ID_REQUIRED: '个人用户需填写身份证信息',
      COMPANY_CODE_REQUIRED: '公司用户需填写公司代码',
      NICKNAME_REQUIRED: '昵称必填',
    };
    res.status(status).json({
      success: false,
      error: messages[err.message] || '注册失败，请重试',
    } as AuthResponse);
    if (status === 500) console.error('[auth] register error:', err);
  }
});

// POST /api/auth/login
// 支持邮箱或手机号登录
router.post('/login', (req: Request, res: Response) => {
  try {
    const { account, password } = req.body;
    if (!account || !password) {
      res.status(400).json({ success: false, error: '请输入账号和密码' } as AuthResponse);
      return;
    }
    const user = getUserByAccount(account);
    if (!user || !verifyPassword(user, password)) {
      res.status(401).json({ success: false, error: '账号或密码错误' } as AuthResponse);
      return;
    }
    const profile = getProfile(user.id)!;
    const token = signToken({ userId: user.id, email: user.email, plan: user.plan });
    res.json({ success: true, token, user: profile } as AuthResponse);
  } catch (err) {
    console.error('[auth] login error:', err);
    res.status(500).json({ success: false, error: '登录失败，请重试' } as AuthResponse);
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
    monthlyAllowance: 0,
    recentTransactions: transactions,
  };
  res.json(resp);
});

// POST /api/auth/credits/topup — 积分充值
router.post('/credits/topup', requireUser, (req: Request, res: Response) => {
  const { amount, description } = req.body;
  if (!amount || amount <= 0) {
    res.status(400).json({ error: 'Invalid amount' });
    return;
  }
  const updated = updateCredits(req.user!.userId, amount);
  if (!updated) {
    res.status(500).json({ error: 'Failed to update credits' });
    return;
  }
  const tx = addTransaction(req.user!.userId, amount, 'topup_pack', description || '积分充值', updated.credits);
  res.json({ success: true, credits: updated.credits, transaction: tx });
});

// POST /api/auth/credits/upgrade-plan — 升级套餐
router.post('/credits/upgrade-plan', requireUser, (req: Request, res: Response) => {
  const { plan, monthlyCredits } = req.body;
  if (!plan) {
    res.status(400).json({ error: 'Plan required' });
    return;
  }
  const updated = updatePlanAndCredits(req.user!.userId, plan, monthlyCredits || 0);
  if (!updated) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (monthlyCredits) {
    addTransaction(req.user!.userId, monthlyCredits, 'plan_monthly', `套餐月度积分: ${plan}`, updated.credits);
  }
  res.json({ success: true, user: updated });
});

// POST /api/auth/credits/spend — 扣减积分
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

// POST /api/auth/recover — 通过手机号找回密码
router.post('/recover', (req: Request, res: Response) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ success: false, error: '请输入手机号' });
      return;
    }
    const { getUserByPhone } = require('../systems/db/user-store.js');
    const user = getUserByPhone(phone);
    if (!user) {
      res.json({ success: true, message: '如果该手机号已注册，将收到找回密码指引' });
      return;
    }
    const { maskPhone, decrypt } = require('../systems/db/encryption.js');
    res.json({ success: true, message: `验证码已发送至 ${maskPhone(decrypt(user.phone))}` });
  } catch (err) {
    console.error('[auth] recover error:', err);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

// POST /api/auth/delete-account — 注销账号
// 需验证密码 + 二次确认
router.post('/delete-account', (req: Request, res: Response) => {
  try {
    const { account, password, confirm } = req.body;
    if (!account || !password) {
      res.status(400).json({ success: false, error: '请输入账号和密码' });
      return;
    }
    if (confirm !== 'DELETE') {
      res.status(400).json({ success: false, error: '请输入 DELETE 确认注销' });
      return;
    }
    const user = getUserByAccount(account);
    if (!user || !verifyPassword(user, password)) {
      res.status(401).json({ success: false, error: '账号或密码错误' });
      return;
    }
    const ok = deleteUser(user.id);
    if (!ok) {
      res.status(500).json({ success: false, error: '注销失败' });
      return;
    }
    res.json({ success: true, message: '账号已永久注销' });
  } catch (err) {
    console.error('[auth] delete-account error:', err);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

export default router;
