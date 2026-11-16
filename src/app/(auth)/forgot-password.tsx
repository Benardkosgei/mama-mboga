import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Text, TextInput, Button, Surface, HelperText } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, spacing, borderRadius } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmed, {
        // Deep-link back into the app — handled by the reset-password screen
        redirectTo: 'mamamboga://reset-password',
      });
      if (resetError) throw resetError;
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <Surface style={styles.card} elevation={2}>
          <Text style={styles.successIcon}>📧</Text>
          <Text style={styles.successTitle}>Check your email</Text>
          <Text style={styles.successText}>
            We sent a password reset link to{' '}
            <Text style={styles.emailHighlight}>{email.trim().toLowerCase()}</Text>.
            {'\n\n'}
            Tap the link in the email to set a new password. It expires in 1 hour.
          </Text>
          <Button
            mode="contained"
            onPress={() => router.replace('/(auth)/login')}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Back to Sign In
          </Button>
          <Button
            mode="text"
            onPress={() => { setSent(false); setEmail(''); }}
            style={{ marginTop: spacing.sm }}
          >
            Try a different email
          </Button>
        </Surface>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Surface style={styles.card} elevation={2}>
          <Text style={styles.icon}>🔑</Text>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter the email address linked to your account and we'll send you a reset link.
          </Text>

          <TextInput
            mode="outlined"
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChangeText={(v) => { setEmail(v); setError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            left={<TextInput.Icon icon="email-outline" />}
            style={styles.input}
            error={!!error}
          />

          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleSend}
            loading={loading}
            disabled={loading || !email}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Send Reset Link
          </Button>

          <Button
            mode="text"
            onPress={() => router.back()}
            style={{ marginTop: spacing.sm }}
          >
            Back to Sign In
          </Button>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  icon: { fontSize: 48, marginBottom: spacing.md },
  title: {
    fontSize: 22,
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
  input: {
    width: '100%',
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  button: {
    width: '100%',
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  buttonContent: { paddingVertical: spacing.sm },
  // Success state
  successIcon: { fontSize: 64, marginBottom: spacing.lg },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  emailHighlight: {
    color: colors.primary[500],
    fontWeight: '600',
  },
});
