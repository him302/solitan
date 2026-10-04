import { createSolitonApi, type TokenStore } from '@soliton/api-client';
import { authClient } from './authClient';

const tokens: TokenStore = {
  getAccessToken: async () => authClient.getAccessToken(),
  getRefreshToken: async () => null, // refresh via httpOnly cookie is a future phase
  setTokens: async (accessToken: string) => {
    authClient.setSession(accessToken, authClient.getUser()!);
  },
  clear: async () => authClient.clear(),
};

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

/** Singleton API client for the admin web. */
export const api = createSolitonApi({ baseUrl, tokens });
