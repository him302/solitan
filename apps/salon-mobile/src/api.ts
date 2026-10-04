import { createSolitonApi, type TokenStore } from '@soliton/api-client';
import { tokenStorage } from './auth/tokenStorage';
import { env } from './env';

/** Adapts expo-secure-store to the api-client's TokenStore interface. */
const tokens: TokenStore = {
  getAccessToken: () => tokenStorage.getAccessToken(),
  getRefreshToken: () => tokenStorage.getRefreshToken(),
  setTokens: (a, r) => tokenStorage.setTokens(a, r),
  clear: () => tokenStorage.clear(),
};

/** Singleton API client for the salon owner/staff app. */
export const api = createSolitonApi({
  baseUrl: env.apiBaseUrl,
  tokens,
});
