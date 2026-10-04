// @soliton/ui — Soliton React Native design system (Calm Momentum).

// Theme
export { createTheme, type Theme, type CreateThemeOptions } from './theme/createTheme';
export { ThemeProvider, useTheme, type ThemeProviderProps } from './theme/ThemeProvider';

// Hooks
export { useReducedMotion } from './hooks/useReducedMotion';

// Mascot (architecture re-exported from @soliton/mascot; component from here)
export {
  MASCOT_STATES,
  MASCOT_SIGNALS,
  mascotLabel,
  mascotStateForSignal,
  resolveMascotView,
  toMascotState,
  isMascotState,
  type MascotState,
  type MascotSignal,
  type MascotView,
} from '@soliton/mascot';
export { Mascot, type MascotProps } from './mascot/Mascot';

// Buttons
export {
  resolveButtonStyle,
  type ButtonVariant,
  type ButtonStyleParts,
} from './components/button/buttonStyles';
export { Button, type ButtonProps } from './components/button/Button';
export { IconButton, type IconButtonProps } from './components/button/IconButton';

// Status
export { statusVisual, type StatusKind, type StatusVisual } from './components/status/statusConfig';
export { Status, type StatusProps } from './components/status/Status';
export { Chip, type ChipProps } from './components/status/Chip';

// Layout primitives
export {
  Card,
  Divider,
  Avatar,
  Skeleton,
  type CardProps,
  type AvatarProps,
  type SkeletonProps,
} from './components/layout';

// Feedback
export { Toast, Sheet, type ToastProps, type SheetProps } from './components/feedback';

// States
export {
  EmptyState,
  ErrorState,
  LoadingState,
  type EmptyStateProps,
  type ErrorStateProps,
  type LoadingStateProps,
} from './components/states';

// Input
export { Input, type InputProps } from './components/Input';

// Domain components
export {
  SalonCard,
  ServiceRow,
  QueueGlyph,
  EtaBlock,
  TokenCard,
  type SalonCardProps,
  type ServiceRowProps,
  type QueueGlyphProps,
  type EtaBlockProps,
  type TokenCardProps,
} from './components/domain';
