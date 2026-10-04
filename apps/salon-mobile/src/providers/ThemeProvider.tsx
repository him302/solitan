/**
 * Wraps @soliton/ui's ThemeProvider so both the app's screens and the shared UI
 * components read from the same context. Screens import `useTheme` from @soliton/ui.
 */
export { ThemeProvider, useTheme } from '@soliton/ui';
