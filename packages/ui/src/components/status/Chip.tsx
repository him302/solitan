import { Pressable, Text } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

/** Pill-shaped selectable chip. */
export function Chip({ label, selected = false, onPress }: ChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        paddingHorizontal: theme.spacing.s3,
        minHeight: 36,
        borderRadius: theme.radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: selected ? theme.colors.accent : theme.colors.surface2,
      }}
    >
      <Text
        style={{
          color: selected ? theme.colors.accentInk : theme.colors.ink,
          fontSize: theme.type.label.size,
          fontWeight: theme.type.label.weight,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
