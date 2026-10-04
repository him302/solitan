import type { ExpoConfig } from 'expo/config';

/**
 * Customer app config — Android-first. Free-only: no map SDK key or other paid service is
 * configured here.
 */
const config: ExpoConfig = {
  name: 'Soliton',
  slug: 'soliton-customer',
  scheme: 'soliton',
  version: '0.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  android: {
    package: 'com.soliton.customer',
  },
  plugins: ['expo-router', 'expo-localization', 'expo-secure-store'],
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
  },
};

export default config;
