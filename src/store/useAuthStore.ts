/* === Auth Store — User login state === */
import { create } from 'zustand';
import type { UserProfile, RegisterRequest } from '../../shared/api-types.js';
import { BACKEND_URL } from '../api/config';
const STORAGE_KEY = 'direx_auth';

// Dev guest user — seed balance for skip-login / 免登录
export const DEV_GUEST: UserProfile = {
  userId: 'guest-dev',
  email: 'dev@localhost',
  nickname: 'Guest',
  accountType: 'individual',
  credits: 5000,
  plan: 'free',
};

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  error: string | null;

  register: (data: RegisterRequest) => Promise<boolean>;
  login: (account: string, password: string) => Promise<boolean>;
  logout: () => void;
  deleteAccount: (account: string, password: string) => Promise<{ success: boolean; error?: string }>;
  refreshCredits: () => Promise<void>;
  spendCredits: (amount: number, type: string, description: string) => Promise<boolean>;
  refundCredits: (amount: number, description: string) => Promise<boolean>;
  initGuestUser: () => void;
  deductLocalCredits: (amount: number) => boolean;
  getToken: () => string | null;
  isLoggedIn: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => {
  const saved = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed.user) return null;
      return parsed;
    } catch { return null; }
  })();

  return {
    user: saved?.user || null,
    token: saved?.token || null,
    loading: false,
    error: null,

    register: async (data) => {
      set({ loading: true, error: null });
      try {
        const resp = await fetch(`${BACKEND_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await resp.json();
        if (!json.success) {
          set({ loading: false, error: json.error || 'Registration failed' });
          return false;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: json.token, user: json.user }));
        set({ user: json.user, token: json.token, loading: false, error: null });
        return true;
      } catch (err: any) {
        set({ loading: false, error: err.message || 'Network error' });
        return false;
      }
    },

    login: async (account, password) => {
      set({ loading: true, error: null });
      try {
        const resp = await fetch(`${BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account, password }),
        });
        const json = await resp.json();
        if (!json.success) {
          set({ loading: false, error: json.error || 'Login failed' });
          return false;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: json.token, user: json.user }));
        set({ user: json.user, token: json.token, loading: false, error: null });
        return true;
      } catch (err: any) {
        set({ loading: false, error: err.message || 'Network error' });
        return false;
      }
    },

    logout: () => {
      localStorage.removeItem(STORAGE_KEY);
      set({ user: null, token: null, error: null });
    },

    deleteAccount: async (account, password) => {
      try {
        const resp = await fetch(`${BACKEND_URL}/api/auth/delete-account`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ account, password, confirm: 'DELETE' }),
        });
        const json = await resp.json();
        if (json.success) {
          localStorage.removeItem(STORAGE_KEY);
          set({ user: null, token: null, error: null });
          return { success: true };
        }
        return { success: false, error: json.error || '注销失败' };
      } catch (err: any) {
        return { success: false, error: err.message || 'Network error' };
      }
    },

    refreshCredits: async () => {
      const { token } = get();
      if (!token) return;
      try {
        const resp = await fetch(`${BACKEND_URL}/api/auth/credits`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await resp.json();
        if (json.credits !== undefined) {
          set({ user: { ...get().user!, credits: json.credits, plan: json.plan } });
        }
      } catch {}
    },

    spendCredits: async (amount, type, description) => {
      const { token, user } = get();
      if (!token) {
        if (!user || user.credits < amount) return false;
        const newCredits = user.credits - amount;
        const updated = { ...user, credits: newCredits };
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: updated }));
        set({ user: updated });
        return true;
      }
      if (amount <= 0) return false;
      try {
        const resp = await fetch(`${BACKEND_URL}/api/auth/credits/spend`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount, type, description }),
        });
        const json = await resp.json();
        if (json.success) {
          set({ user: { ...get().user!, credits: json.credits } });
          return true;
        }
        if (json.error) console.warn('[credits] spend failed:', json.error);
        return false;
      } catch (err) {
        console.warn('[credits] spend error:', err);
        return false;
      }
    },

    initGuestUser: () => {
      const saved = { user: DEV_GUEST };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      set({ user: DEV_GUEST, token: null });
    },

    deductLocalCredits: (amount) => {
      const { user } = get();
      if (!user || user.credits < amount) return false;
      const updated = { ...user, credits: user.credits - amount };
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      saved.user = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
      set({ user: updated });
      return true;
    },

    refundCredits: async (amount, description) => {
      const { token, user } = get();
      if (amount <= 0) return true;
      if (!token) {
        if (!user) return false;
        const updated = { ...user, credits: user.credits + amount };
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: updated }));
        set({ user: updated });
        return true;
      }
      try {
        const resp = await fetch(`${BACKEND_URL}/api/auth/credits/topup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ amount, description: `退款: ${description}` }),
        });
        const json = await resp.json();
        if (json.success) {
          set({ user: { ...get().user!, credits: json.credits } });
          return true;
        }
        return false;
      } catch (err) {
        console.warn('[credits] Refund error:', err);
        return false;
      }
    },

    getToken: () => get().token,
    isLoggedIn: () => !!get().token && !!get().user,
  };
});
