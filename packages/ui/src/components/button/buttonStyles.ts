import type { TextStyle, ViewStyle } from 'react-native';
import type { Theme } from '../../theme/createTheme';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';

export interface ButtonStyleParts {
  container: ViewStyle;
  label: TextStyle;
}

export interface ButtonStyleState {
  disabled?: boolean;
  pressed?: boolean;
}

/** Pure style resolver for Button (also unit-tested without rendering). */
export function resolveButtonStyle(
  theme: Theme,
  variant: ButtonVariant,
  state: ButtonStyleState = {},
): ButtonStyleParts {
  const { colors, radius, spacing, type, fontFamily, minTouchTarget } = theme;
  const opacity = state.disabled ? 0.5 : state.pressed ? 0.9 : 1;

  const container: ViewStyle = {
    minHeight: Math.max(48, minTouchTarget),
    borderRadius: radius.button,
    paddingHorizontal: spacing.s4,
    alignItems: 'center',
    justifyContent: 'center',
    opacity,
  };

  const label: TextStyle = {
    fontSize: type.button.size,
    lineHeight: type.button.line,
    fontWeight: type.button.weight,
    fontFamily: fontFamily.ui,
  };

  switch (variant) {
    case 'primary':
      return {
        container: { ...container, backgroundColor: colors.accent },
        label: { ...label, color: colors.accentInk },
      };
    case 'secondary':
      return {
        container: { ...container, backgroundColor: colors.surface2 },
        label: { ...label, color: colors.ink },
      };
    case 'tertiary':
      return {
        container: { ...container, backgroundColor: 'transparent' },
        label: { ...label, color: colors.accent },
      };
  }
}
