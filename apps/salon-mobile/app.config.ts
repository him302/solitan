import type { ExpoConfig } from 'expo/config';

/**
 * Salon owner/staff app config — Android-first, tablet landscape as the primary target.
 * Free-only: no map SDK key or other paid service is configured here.
 */
const config: ExpoConfig = {
  name: 'Soliton Salon',
  slug: 'soliton-salon',
  scheme: 'soliton-salon',
  version: '1.0.0',
  orientation: 'landscape',
  userInterfaceStyle: 'automatic',
  android: {
    package: 'com.soliton.salon',
    versionCode: 1,
    // IMPORTANT: on an Android emulator use 10.0.2.2 instead of localhost.
    // Set EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000 in apps/salon-mobile/.env
  },
  plugins: ['expo-router', 'expo-localization', 'expo-secure-store'],
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
  },
};

export default config;
