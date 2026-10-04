import { create } from 'zustand';
import type { ColorScheme } from '@soliton/design-tokens';
import type { SupportedLocale } from '@soliton/i18n';
import { DEFAULT_LOCALE } from '@soliton/i18n';

/**
 * App-wide UI state (no business logic). Holds the color scheme and active locale so
 * the theme and i18n layers can react to user preferences.
 */
interface AppState {
  colorScheme: ColorScheme;
  locale: SupportedLocale;
  reducedMotion: boolean;
  setColorScheme: (scheme: ColorScheme) => void;
  setLocale: (locale: SupportedLocale) => void;
  setReducedMotion: (value: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  colorScheme: 'light',
  locale: DEFAULT_LOCALE,
  reducedMotion: false,
  setColorScheme: (colorScheme) => set({ colorScheme }),
  setLocale: (locale) => set({ locale }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
}));
