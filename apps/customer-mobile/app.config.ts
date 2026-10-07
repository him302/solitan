import type { ExpoConfig } from 'expo/config';

/**
 * Customer app config — Android-first. Free-only: no map SDK key or other paid service is
 * configured here.
 */
const config: ExpoConfig = {
  name: 'Soliton',
  slug: 'soliton-customer',
  scheme: 'soliton',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  android: {
    package: 'com.soliton.customer',
    versionCode: 1,
    // IMPORTANT: on an Android emulator use 10.0.2.2 instead of localhost.
    // Set EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000 in apps/customer-mobile/.env
  },
  plugins: ['expo-router', 'expo-localization', 'expo-secure-store'],
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
  },
};

export default config;
