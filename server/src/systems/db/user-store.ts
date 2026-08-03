/* === User Store — JSON File Based === */
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { readJSON, writeJSON } from './store.js';
import { encrypt, decrypt, maskPhone } from './encryption.js';
import type { UserProfile, IdType, RegisterRequest } from '../../../../shared/api-types.js';

const USERS_FILE = 'users.json';

interface StoredUser {
  id: string;
  // 登录凭证
  email: string;             // 可选 — 如果 phone 存在
  phone: string;             // 加密存储 — 如果 email 存在
  phoneCountry: string;      // 国际区号
  passwordHash: string;

  // 身份认证（全部加密存储）
  idType: IdType | '';
  idNumber: string;          // 加密
  realName: string;          // 加密
  address: string;           // 加密

  // 个人资料
  nickname: string;
  accountType: 'individual' | 'company';
  companyCode?: string;      // 明文 — 非敏感

  // 系统
  credits: number;
  plan: UserProfile['plan'];
  concurrency: number;
  storageGB: number;
  createdAt: string;
  updatedAt: string;
}

function allUsers(): StoredUser[] {
  const data = readJSON(USERS_FILE);
  return data.users || [];
}

function saveUsers(users: StoredUser[]): void {
  writeJSON(USERS_FILE, { users, updatedAt: new Date().toISOString() });
}

function toProfile(u: StoredUser): UserProfile {
  return {
    userId: u.id,
    email: u.email || '',
    phone: u.phone ? maskPhone(decrypt(u.phone)) : undefined,
    nickname: u.nickname,
    accountType: u.accountType,
    companyCode: u.companyCode,
    credits: u.credits,
    plan: u.plan,
    createdAt: u.createdAt,
  };
}

// ── 查询 ──

export function getUserByEmail(email: string): StoredUser | null {
  return allUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function getUserByPhone(phone: string): StoredUser | null {
  // 因为 phone 加密存储，先解密再比较
  const cleaned = phone.replace(/[\s\-]/g, '');
  return allUsers().find(u => {
    if (!u.phone) return false;
    try {
      const decrypted = decrypt(u.phone);
      return decrypted.replace(/[\s\-]/g, '') === cleaned;
    } catch { return false; }
  }) || null;
}

export function getUserByAccount(account: string): StoredUser | null {
  // 判断是邮箱还是手机号
  if (account.includes('@')) {
    return getUserByEmail(account);
  }
  return getUserByPhone(account);
}

export function getUserById(id: string): StoredUser | null {
  return allUsers().find(u => u.id === id) || null;
}

// ── 注册 ──

export function createUser(req: RegisterRequest): { user: UserProfile } {
  const users = allUsers();
  const cleanedEmail = req.email?.toLowerCase().trim() || '';
  const cleanedPhone = req.phone?.replace(/[\s\-]/g, '') || '';

  // 去重
  if (cleanedEmail && users.find(u => u.email.toLowerCase() === cleanedEmail)) {
    throw new Error('EMAIL_EXISTS');
  }
  if (cleanedPhone) {
    const existing = users.find(u => {
      if (!u.phone) return false;
      try { return decrypt(u.phone).replace(/[\s\-]/g, '') === cleanedPhone; }
      catch { return false; }
    });
    if (existing) throw new Error('PHONE_EXISTS');
  }

  // 个人用户必须有身份证
  if (req.accountType === 'individual') {
    if (!req.idType || !req.idNumber || !req.realName) {
      throw new Error('ID_REQUIRED');
    }
  }
  // 公司用户必须有公司代码
  if (req.accountType === 'company' && !req.companyCode) {
    throw new Error('COMPANY_CODE_REQUIRED');
  }
  // 昵称必填
  if (!req.nickname?.trim()) {
    throw new Error('NICKNAME_REQUIRED');
  }

  const salt = bcrypt.genSaltSync(10);
  const now = new Date().toISOString();
  const newUser: StoredUser = {
    id: uuid(),
    email: cleanedEmail,
    phone: cleanedPhone ? encrypt(cleanedPhone) : '',
    phoneCountry: req.phoneCountry || '',
    passwordHash: bcrypt.hashSync(req.password, salt),
    idType: req.idType || '',
    idNumber: req.idNumber ? encrypt(req.idNumber) : '',
    realName: req.realName ? encrypt(req.realName) : '',
    address: req.address ? encrypt(req.address) : '',
    nickname: req.nickname.trim(),
    accountType: req.accountType,
    companyCode: req.companyCode || undefined,
    credits: 200,
    plan: 'free',
    concurrency: 1,
    storageGB: 0.5,
    createdAt: now,
    updatedAt: now,
  };
  users.push(newUser);
  saveUsers(users);
  return { user: toProfile(newUser) };
}

// ── 认证 ──

export function verifyPassword(user: StoredUser, password: string): boolean {
  return bcrypt.compareSync(password, user.passwordHash);
}

// ── 更新 ──

export function updateCredits(userId: string, delta: number): UserProfile | null {
  const users = allUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx < 0) return null;
  users[idx].credits += delta;
  users[idx].updatedAt = new Date().toISOString();
  saveUsers(users);
  return toProfile(users[idx]);
}

export function updatePlanAndCredits(userId: string, plan: StoredUser['plan'], addCredits: number): UserProfile | null {
  const users = allUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx < 0) return null;
  users[idx].plan = plan;
  users[idx].credits += addCredits;
  users[idx].updatedAt = new Date().toISOString();
  saveUsers(users);
  return toProfile(users[idx]);
}

export function getProfile(userId: string): UserProfile | null {
  const u = getUserById(userId);
  return u ? toProfile(u) : null;
}

/** 注销账号 — 从 users.json 中移除 */
export function deleteUser(userId: string): boolean {
  const users = allUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx < 0) return false;
  users.splice(idx, 1);
  saveUsers(users);
  return true;
}
