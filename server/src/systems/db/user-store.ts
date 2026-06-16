/* === User Store — JSON File Based === */
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { readJSON, writeJSON } from './store.js';
import type { UserProfile } from '../../../../shared/api-types.js';

const USERS_FILE = 'users.json';

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
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
    id: u.id,
    email: u.email,
    name: u.name,
    credits: u.credits,
    plan: u.plan,
    concurrency: u.concurrency,
    storageGB: u.storageGB,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export function getUserByEmail(email: string): StoredUser | null {
  return allUsers().find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export function getUserById(id: string): StoredUser | null {
  return allUsers().find(u => u.id === id) || null;
}

export function createUser(email: string, password: string, name?: string): { user: UserProfile } {
  const users = allUsers();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('EMAIL_EXISTS');
  }
  const salt = bcrypt.genSaltSync(10);
  const now = new Date().toISOString();
  const newUser: StoredUser = {
    id: uuid(),
    email: email.toLowerCase(),
    passwordHash: bcrypt.hashSync(password, salt),
    name: name || email.split('@')[0],
    credits: 200, // 注册赠送 200 积分
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

export function verifyPassword(user: StoredUser, password: string): boolean {
  return bcrypt.compareSync(password, user.passwordHash);
}

export function updateCredits(userId: string, delta: number): UserProfile | null {
  const users = allUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx < 0) return null;
  users[idx].credits += delta;
  users[idx].updatedAt = new Date().toISOString();
  saveUsers(users);
  return toProfile(users[idx]);
}

export function getProfile(userId: string): UserProfile | null {
  const u = getUserById(userId);
  return u ? toProfile(u) : null;
}
