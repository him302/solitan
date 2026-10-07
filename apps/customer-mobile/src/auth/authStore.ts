import { create } from 'zustand';
import type { AuthTokens, CurrentUser } from '@soliton/api-contract';
import { tokenStorage } from './tokenStorage';
import { api } from '../api';

export type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  user: CurrentUser | null;
  hydrate: () => Promise<void>;
  setSession: (tokens: AuthTokens, user: CurrentUser) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'unknown',
  user: null,
  async hydrate() {
    const accessToken = await tokenStorage.getAccessToken();
    if (!accessToken) {
      set({ status: 'unauthenticated' });
      return;
    }
    try {
      const user = await api.auth.me();
      set({ status: 'authenticated', user });
    } catch {
      await tokenStorage.clear();
      set({ status: 'unauthenticated', user: null });
    }
  },
  async setSession(tokens, user) {
    await tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
    set({ status: 'authenticated', user });
  },
  async signOut() {
    try { await api.auth.logout(); } catch { /* best-effort */ }
    await tokenStorage.clear();
    set({ status: 'unauthenticated', user: null });
  },
}));
