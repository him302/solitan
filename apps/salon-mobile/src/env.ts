import Constants from 'expo-constants';

/**
 * Public, client-safe configuration only. Secrets never live in the mobile bundle.
 * Values come from EXPO_PUBLIC_* env vars (preferred) or app.config `extra` fallback.
 */
export const env = {
  apiBaseUrl:
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
    'http://localhost:3000',
} as const;
