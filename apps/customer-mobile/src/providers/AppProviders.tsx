import { useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@soliton/ui';
import type { ColorScheme } from '@soliton/design-tokens';
import { ErrorBoundary } from './ErrorBoundary';
import { useAppStore } from '../stores/appStore';
import { i18n } from '../i18n';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const appScheme = useAppStore((state) => state.colorScheme);
  const deviceScheme = useColorScheme(); // 'light' | 'dark' | null

  // Resolve 'system' to the actual device scheme; fall back to 'light' for null/unspecified
  const resolvedDevice: ColorScheme =
    deviceScheme === 'dark' ? 'dark' : 'light';
  const scheme: ColorScheme =
    appScheme === 'system' ? resolvedDevice : appScheme;

  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider scheme={scheme} accent="#A50000">
            <SafeAreaProvider>{children}</SafeAreaProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </ErrorBoundary>
  );
}
