import { Pressable, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { resolveButtonStyle, type ButtonVariant } from './buttonStyles';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  accessibilityHint?: string;
}

/** Primary text button. One primary action per screen (see design principles). */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityHint,
}: ButtonProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityHint={accessibilityHint}
      hitSlop={8}
      style={({ pressed }) => resolveButtonStyle(theme, variant, { disabled, pressed }).container}
    >
      {({ pressed }) => (
        <Text style={resolveButtonStyle(theme, variant, { disabled, pressed }).label}>{label}</Text>
      )}
    </Pressable>
  );
}
