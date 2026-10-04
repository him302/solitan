import { Text, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  accessibilityLabel?: string;
}

/** Labelled text input. */
export function Input({
  value,
  onChangeText,
  label,
  placeholder,
  secureTextEntry,
  keyboardType,
  accessibilityLabel,
}: InputProps) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.s1 }}>
      {label ? (
        <Text
          style={{
            fontSize: theme.type.label.size,
            fontWeight: theme.type.label.weight,
            color: theme.colors.ink,
          }}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.inkSoft}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        accessibilityLabel={accessibilityLabel ?? label}
        style={{
          minHeight: theme.minTouchTarget,
          borderRadius: theme.radius.input,
          borderWidth: theme.borderWidth.hairline,
          borderColor: theme.colors.line,
          backgroundColor: theme.colors.surface,
          color: theme.colors.ink,
          paddingHorizontal: theme.spacing.s3,
          fontSize: theme.type.body.size,
        }}
      />
    </View>
  );
}
