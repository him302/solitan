import { getLocales } from 'expo-localization';
import { createI18n, DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale } from '@soliton/i18n';

/** Picks a supported locale from the device, falling back to the default. */
function detectLocale(): SupportedLocale {
  const code = getLocales()[0]?.languageCode ?? DEFAULT_LOCALE;
  return (SUPPORTED_LOCALES as readonly string[]).includes(code)
    ? (code as SupportedLocale)
    : DEFAULT_LOCALE;
}

/** Shared i18next instance for the salon app. */
export const i18n = createI18n({ locale: detectLocale() });
