import { Text, View } from 'react-native';
import { resolveMascotView, type MascotState } from '@soliton/mascot';
import { useTheme } from '../theme/ThemeProvider';
import { useReducedMotion } from '../hooks/useReducedMotion';

export interface MascotProps {
  state: MascotState;
  size?: number;
  /** Overrides the default accessible label for this state. */
  accessibilityLabel?: string;
  /** Force reduced motion. Defaults to the OS reduce-motion setting. */
  reducedMotion?: boolean;
  /** Quiet mode renders Puff statically (no attention-seeking motion). */
  quietMode?: boolean;
}

/**
 * Puff mascot. Placeholder rendering today; the animation technology (Rive/Lottie) is
 * an internal detail resolved via the view model — consuming apps never see it.
 */
export function Mascot({
  state,
  size = 48,
  accessibilityLabel,
  reducedMotion,
  quietMode = false,
}: MascotProps) {
  const theme = useTheme();
  const systemReducedMotion = useReducedMotion();
  const view = resolveMascotView(state, {
    reducedMotion: reducedMotion ?? systemReducedMotion,
    quietMode,
    label: accessibilityLabel,
  });

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={view.label}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: theme.colors.surface2,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.5 }}>{view.glyph}</Text>
    </View>
  );
}
