import { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { tokens } from '@slopcade/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          {this.state.error && (
            <Text style={styles.message}>{this.state.error.message}</Text>
          )}
          <Pressable style={styles.button} onPress={this.resetError} accessibilityRole="button" accessibilityLabel="Try again">
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.secondary[900],
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    color: tokens.colors.error,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  message: {
    color: tokens.colors.text.tertiary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: tokens.colors.secondary[800],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: tokens.colors.text.inverse,
    fontSize: 16,
    fontWeight: '500',
  },
});
