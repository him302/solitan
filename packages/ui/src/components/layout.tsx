import { Text, View } from 'react-native';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { useReducedMotion } from '../hooks/useReducedMotion';

export interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Surface container with the single soft elevation. */
export function Card({ children, style }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.card,
          padding: theme.spacing.s4,
          ...theme.elevation.low,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Hairline divider. */
export function Divider() {
  const theme = useTheme();
  return (
    <View style={{ height: theme.borderWidth.hairline, backgroundColor: theme.colors.line }} />
  );
}

export interface AvatarProps {
  label: string;
  size?: number;
}

/** Circular initials avatar. */
export function Avatar({ label, size = 40 }: AvatarProps) {
  const theme = useTheme();
  return (
    <View
      accessibilityLabel={label}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.colors.surface2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: theme.colors.ink, fontWeight: '700' }}>
        {label.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}

/** Loading placeholder. Honours reduced motion (no shimmer when requested). */
export function Skeleton({ width = '100%', height = 16, radius }: SkeletonProps) {
  const theme = useTheme();
  const reduced = useReducedMotion();
  return (
    <View
      accessibilityLabel="Loading"
      style={{
        width,
        height,
        borderRadius: radius ?? theme.radius.input,
        backgroundColor: theme.colors.surface2,
        opacity: reduced ? 1 : 0.7,
      }}
    />
  );
}
