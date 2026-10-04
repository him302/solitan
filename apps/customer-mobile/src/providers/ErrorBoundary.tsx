import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Text, View } from 'react-native';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Outermost crash boundary. It sits above the localization provider, so its last-resort
 * fallback intentionally uses a plain string rather than a translation key.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Error reporting is wired to a tracker in a later phase.
    console.error('Unhandled error', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 16 }}>Something went wrong.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}
