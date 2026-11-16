import React, { Component, ReactNode } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Surface } from 'react-native-paper';
import { colors, spacing, borderRadius } from '@/constants/theme';

interface Props {
  children: ReactNode;
  /** Optional custom fallback UI */
  fallback?: ReactNode;
  /** Screen/component name for error context */
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary catches unhandled render errors in its subtree and shows
 * a friendly fallback instead of a blank/crashed screen.
 *
 * Usage:
 *   <ErrorBoundary name="HomeScreen">
 *     <HomeScreen />
 *   </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production you'd send this to Sentry / Crashlytics
    console.error(`[ErrorBoundary${this.props.name ? ` – ${this.props.name}` : ''}]`, error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <View
          style={styles.container}
          accessible
          accessibilityRole="alert"
          accessibilityLabel="An error occurred"
        >
          <Surface style={styles.card} elevation={2}>
            <Text style={styles.icon} accessibilityElementsHidden>⚠️</Text>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              {this.props.name
                ? `An error occurred in ${this.props.name}.`
                : 'An unexpected error occurred.'}
            </Text>
            {__DEV__ && this.state.error && (
              <ScrollView style={styles.devBox} accessibilityLabel="Error details">
                <Text style={styles.devText}>{this.state.error.message}</Text>
              </ScrollView>
            )}
            <Button
              mode="contained"
              onPress={this.handleReset}
              style={styles.button}
              accessibilityLabel="Try again"
              accessibilityHint="Attempts to reload this section"
            >
              Try Again
            </Button>
          </Surface>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  card: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    width: '100%',
  },
  icon: { fontSize: 48, marginBottom: spacing.md },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  devBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    maxHeight: 120,
    width: '100%',
  },
  devText: {
    fontSize: 11,
    color: colors.error,
    fontFamily: 'monospace',
  },
  button: {
    borderRadius: borderRadius.md,
    width: '100%',
  },
});
