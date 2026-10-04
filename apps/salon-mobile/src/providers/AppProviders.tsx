import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { I18nextProvider } from 'react-i18next';
import { ThemeProvider } from '@soliton/ui';
import { ErrorBoundary } from './ErrorBoundary';
import { useAppStore } from '../stores/appStore';
import { i18n } from '../i18n';

/**
 * Provider composition, in the approved order:
 *   ErrorBoundary → Localization → QueryClient → Theme → App Shell.
 *
 * Theme is @soliton/ui's ThemeProvider so both app screens and shared UI components
 * read from the same context.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const scheme = useAppStore((state) => state.colorScheme);

  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider scheme={scheme}>
            <SafeAreaProvider>{children}</SafeAreaProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </ErrorBoundary>
  );
}
