import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ColorScheme } from '@soliton/design-tokens';
import type { SupportedLocale } from '@soliton/i18n';
import { DEFAULT_LOCALE } from '@soliton/i18n';
import * as SecureStore from 'expo-secure-store';

/** Extends the base ColorScheme with a 'system' option that follows the device preference. */
export type AppColorScheme = ColorScheme | 'system';

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

interface AppState {
  colorScheme: AppColorScheme;
  locale: SupportedLocale;
  reducedMotion: boolean;
  setColorScheme: (scheme: AppColorScheme) => void;
  setLocale: (locale: SupportedLocale) => void;
  setReducedMotion: (value: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      colorScheme: 'system' as AppColorScheme,
      locale: DEFAULT_LOCALE,
      reducedMotion: false,
      setColorScheme: (colorScheme) => set({ colorScheme }),
      setLocale: (locale) => set({ locale }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    }),
    {
      name: 'soliton-app-prefs',
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({ colorScheme: state.colorScheme, locale: state.locale }),
    },
  ),
);
