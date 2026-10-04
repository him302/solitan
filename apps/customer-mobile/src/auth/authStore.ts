import { create } from 'zustand';
import type { AuthTokens, CurrentUser } from '@soliton/api-contract';
import { tokenStorage } from './tokenStorage';

export type AuthStatus = 'unknown' | 'authenticated' | 'unauthenticated';

/**
 * Auth state abstraction. Holds the current session in memory and persists only the
 * tokens to secure storage. Screens/API wiring are added in later phases.
 */
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
    set({ status: accessToken ? 'authenticated' : 'unauthenticated' });
  },
  async setSession(tokens, user) {
    await tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);
    set({ status: 'authenticated', user });
  },
  async signOut() {
    await tokenStorage.clear();
    set({ status: 'unauthenticated', user: null });
  },
}));
