/* === Auth Store — User login state === */
import { create } from 'zustand';
import type { UserProfile } from '../../shared/api-types.js';

const BACKEND_URL = import.meta.env.VITE_API_URL || '';
const STORAGE_KEY = 'direx_auth';

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  error: string | null;

  register: (email: string, password: string, name?: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshCredits: () => Promise<void>;
  getToken: () => string | null;
  isLoggedIn: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // 从 localStorage 恢复登录态
  const saved = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed.token || !parsed.user) return null;
      return parsed;
    } catch { return null; }
  })();

  return {
    user: saved?.user || null,
    token: saved?.token || null,
    loading: false,
    error: null,

    register: async (email, password, name) => {
      set({ loading: true, error: null });
      try {
        const resp = await fetch(`${BACKEND_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name }),
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

    login: async (email, password) => {
      set({ loading: true, error: null });
      try {
        const resp = await fetch(`${BACKEND_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
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

    getToken: () => get().token,
    isLoggedIn: () => !!get().token && !!get().user,
  };
});
