import { Pressable } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '../../theme/ThemeProvider';

export interface IconButtonProps {
  /** Required — icon-only controls must have an accessible label. */
  accessibilityLabel: string;
  onPress?: () => void;
  disabled?: boolean;
  children: ReactNode;
}

/** Square icon button meeting the 44×44 minimum touch target. */
export function IconButton({
  accessibilityLabel,
  onPress,
  disabled = false,
  children,
}: IconButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={{
        width: theme.minTouchTarget,
        height: theme.minTouchTarget,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: theme.radius.pill,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </Pressable>
  );
}
