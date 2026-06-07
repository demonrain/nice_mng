import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';
import type { ProfileInfo, TokenPair } from '@nice-admin/shared';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
// 独立 axios 实例，避免与全局拦截器形成循环
const rawClient = axios.create({ baseURL: BASE_URL, timeout: 15000 });

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  profile: ProfileInfo | null;
  permissions: string[];
  roles: string[];
  isSuperAdmin: boolean;
  setTokens: (tokens: TokenPair) => void;
  login: (payload: {
    username: string;
    password: string;
    captchaId?: string;
    captcha?: string;
  }) => Promise<void>;
  refresh: () => Promise<string>;
  fetchProfile: () => Promise<ProfileInfo>;
  logout: () => void;
  hasPermission: (perm: string | string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      profile: null,
      permissions: [],
      roles: [],
      isSuperAdmin: false,

      setTokens: (tokens) =>
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),

      login: async (payload) => {
        const { data } = await rawClient.post('/auth/login', payload);
        const tokens = data.data as TokenPair;
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      },

      refresh: async () => {
        const refreshToken = get().refreshToken;
        const { data } = await rawClient.post('/auth/refresh', { refreshToken });
        const tokens = data.data as TokenPair;
        set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
        return tokens.accessToken;
      },

      fetchProfile: async () => {
        const { data } = await rawClient.get('/auth/profile', {
          headers: { Authorization: `Bearer ${get().accessToken}` },
        });
        const profile = data.data as ProfileInfo;
        const isSuperAdmin = profile.permissions.includes('*:*:*');
        set({
          profile,
          permissions: profile.permissions,
          roles: profile.roles,
          isSuperAdmin,
        });
        return profile;
      },

      logout: () => {
        const token = get().accessToken;
        if (token) {
          rawClient
            .post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } })
            .catch(() => undefined);
        }
        set({
          accessToken: null,
          refreshToken: null,
          profile: null,
          permissions: [],
          roles: [],
          isSuperAdmin: false,
        });
      },

      hasPermission: (perm) => {
        const state = get();
        if (state.isSuperAdmin) return true;
        const needed = Array.isArray(perm) ? perm : [perm];
        return needed.some((p) => state.permissions.includes(p));
      },
    }),
    {
      name: 'nice-admin-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);
