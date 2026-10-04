import { ActivityIndicator, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { useTheme } from '../theme/ThemeProvider';
import { Mascot } from '../mascot/Mascot';
import type { MascotState } from '@soliton/mascot';
import { Button } from './button/Button';

interface CenteredProps {
  title: string;
  body?: string;
  mascotState?: MascotState;
  children?: ReactNode;
}

function Centered({ title, body, mascotState, children }: CenteredProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.s5,
        gap: theme.spacing.s3,
        backgroundColor: theme.colors.bg,
      }}
    >
      {mascotState ? <Mascot state={mascotState} /> : null}
      <Text
        style={{
          fontSize: theme.type.section.size,
          fontWeight: theme.type.section.weight,
          color: theme.colors.ink,
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      {body ? (
        <Text style={{ color: theme.colors.inkSoft, textAlign: 'center' }}>{body}</Text>
      ) : null}
      {children}
    </View>
  );
}

export interface EmptyStateProps {
  title: string;
  body?: string;
  children?: ReactNode;
}

export function EmptyState({ title, body, children }: EmptyStateProps) {
  return (
    <Centered title={title} body={body} mascotState="searching">
      {children}
    </Centered>
  );
}

export interface ErrorStateProps {
  title?: string;
  body?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  body,
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  return (
    <Centered title={title} body={body} mascotState="error">
      {onRetry ? <Button label={retryLabel} onPress={onRetry} /> : null}
    </Centered>
  );
}

export interface LoadingStateProps {
  label?: string;
}

export function LoadingState({ label }: LoadingStateProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.s3,
        backgroundColor: theme.colors.bg,
      }}
    >
      <ActivityIndicator color={theme.colors.accent} />
      {label ? <Text style={{ color: theme.colors.inkSoft }}>{label}</Text> : null}
    </View>
  );
}
