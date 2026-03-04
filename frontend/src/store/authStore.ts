import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, AuthTokens } from '../types';
import api from '../utils/api';
import { DEMO_USER } from '../utils/mockData';
import { DEMO_MODE } from '../utils/demoMode';

export { DEMO_MODE };

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });

        // ── DEMO MODE: bypass backend ──────────────────────────────────────
        if (DEMO_MODE) {
          await new Promise(r => setTimeout(r, 600)); // simulate network
          if (email === 'admin@erp.com' && password === 'admin123') {
            set({ user: DEMO_USER, accessToken: 'demo-token', refreshToken: 'demo-refresh', isAuthenticated: true, isLoading: false });
            return;
          }
          set({ isLoading: false });
          throw new Error('Demo: use admin@erp.com / admin123');
        }
        // ──────────────────────────────────────────────────────────────────

        try {
          const { data } = await api.post<{ user: User; token: string; refreshToken: string }>('/auth/login', {
            email,
            password,
          });
          localStorage.setItem('accessToken', data.token);
          localStorage.setItem('refreshToken', data.refreshToken);
          set({
            user: data.user,
            accessToken: data.token,
            refreshToken: data.refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: async () => {
        if (DEMO_MODE) {
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
          return;
        }
        try {
          const { refreshToken } = get();
          if (refreshToken) await api.post('/auth/logout', { refreshToken });
        } finally {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
        }
      },

      fetchMe: async () => {
        if (DEMO_MODE) return; // already set from login
        try {
          const { data } = await api.get<{ user: User }>('/auth/me');
          set({ user: data.user, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        }
      },
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
