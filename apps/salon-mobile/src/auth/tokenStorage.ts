import * as SecureStore from 'expo-secure-store';

/**
 * Secure token storage. Tokens live ONLY in the OS keychain/keystore via
 * expo-secure-store — never in AsyncStorage or any plaintext store.
 */
const ACCESS_KEY = 'soliton.accessToken';
const REFRESH_KEY = 'soliton.refreshToken';

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_KEY);
  },
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_KEY);
  },
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};
