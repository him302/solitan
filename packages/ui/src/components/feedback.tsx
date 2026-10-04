import { Modal, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { statusVisual, type StatusKind } from './status/statusConfig';

export interface ToastProps {
  message: string;
  kind?: StatusKind;
}

/** Transient message. Announced politely to screen readers. */
export function Toast({ message, kind = 'info' }: ToastProps) {
  const theme = useTheme();
  const visual = statusVisual(kind);
  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: 'row',
        gap: theme.spacing.s2,
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.card,
        padding: theme.spacing.s3,
        borderLeftWidth: 3,
        borderLeftColor: theme.colors[visual.colorKey],
        ...theme.elevation.low,
      }}
    >
      <Text style={{ color: theme.colors[visual.colorKey], fontWeight: '700' }}>
        {visual.symbol}
      </Text>
      <Text style={{ color: theme.colors.ink, flex: 1 }}>{message}</Text>
    </View>
  );
}

export interface SheetProps {
  visible: boolean;
  onClose?: () => void;
  title?: string;
  children: ReactNode;
}

/** Bottom sheet for secondary actions. */
export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderTopLeftRadius: theme.radius.sheet,
            borderTopRightRadius: theme.radius.sheet,
            padding: theme.spacing.s5,
          }}
        >
          {title ? (
            <Text
              style={{
                fontSize: theme.type.section.size,
                fontWeight: theme.type.section.weight,
                color: theme.colors.ink,
                marginBottom: theme.spacing.s3,
              }}
            >
              {title}
            </Text>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}
