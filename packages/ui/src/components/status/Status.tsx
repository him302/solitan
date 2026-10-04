import { Text, View } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { statusVisual, type StatusKind } from './statusConfig';

export interface StatusProps {
  kind: StatusKind;
  label?: string;
}

/** Status indicator: color + symbol + label (never color alone). */
export function Status({ kind, label }: StatusProps) {
  const theme = useTheme();
  const visual = statusVisual(kind);
  const text = label ?? visual.defaultLabel;
  const color = theme.colors[visual.colorKey];
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={text}
      style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s1 }}
    >
      <Text style={{ color, fontWeight: '700' }}>{visual.symbol}</Text>
      <Text style={{ color: theme.colors.ink, fontSize: theme.type.label.size }}>{text}</Text>
    </View>
  );
}
