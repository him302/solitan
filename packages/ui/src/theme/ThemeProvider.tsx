import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ColorScheme } from '@soliton/design-tokens';
import { createTheme, type Theme } from './createTheme';

const ThemeContext = createContext<Theme | null>(null);

export interface ThemeProviderProps {
  scheme?: ColorScheme;
  /** Configurable brand accent (TBD). */
  accent?: string;
  children: ReactNode;
}

/** Provides the active {@link Theme} to design-system components. */
export function ThemeProvider({ scheme = 'light', accent, children }: ThemeProviderProps) {
  const theme = useMemo(() => createTheme({ scheme, accent }), [scheme, accent]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** Access the current theme. Throws if used outside a ThemeProvider. */
export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme must be used within a ThemeProvider');
  return theme;
}
