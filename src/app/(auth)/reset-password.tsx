import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import * as Linking from 'expo-linking';
import { Text, TextInput, Button, Surface, HelperText } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { colors, spacing, borderRadius } from '@/constants/theme';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { setSession, setProfile } = useAuthStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [linkExpired, setLinkExpired] = useState(false);

  // Supabase fires PASSWORD_RECOVERY when the deep-link is opened.
  // We wait for that event before allowing the form to submit.
  // Also parse incoming links directly as fallback for cold-start scenarios
  // where the auth event may arrive late or be missed.
  useEffect(() => {
    let isMounted = true;
    const initFromDeepLink = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (!url || !isMounted) return;

        const parsed = Linking.parse(url);
        const params = (parsed.queryParams ?? {}) as Record<string, string | undefined>;
        const accessToken = params.access_token;
        const refreshToken = params.refresh_token;

        if (accessToken && refreshToken) {
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!setSessionError && data.session && isMounted) {
            setSession(data.session);
            setSessionReady(true);
            setLinkExpired(false);
          }
        }
      } catch (err) {
        console.warn('Reset password deep-link parse failed:', err);
      }
    };

    initFromDeepLink();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
          setSession(session);
          setSessionReady(true);
          setLinkExpired(false);
        }
      }
    );

    const timeout = setTimeout(() => {
      setLinkExpired(true);
    }, 10_000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [setSession]);

  const validate = (): string | null => {
    if (password.length < 8) return 'Password must be at least 8 characters';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleReset = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      // Refresh profile in store
      if (data.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();
        setProfile(profile);
      }

      setDone(true);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <View style={styles.container}>
        <Surface style={styles.card} elevation={2}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Password Updated!</Text>
          <Text style={styles.successText}>
            Your password has been changed successfully. You can now sign in with your new password.
          </Text>
          <Button
            mode="contained"
            onPress={() => router.replace('/(auth)/login')}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Sign In
          </Button>
        </Surface>
      </View>
    );
  }

  if (!sessionReady) {
    return (
      <View style={styles.container}>
        <Surface style={styles.card} elevation={2}>
          <Text style={styles.icon}>{linkExpired ? '⚠️' : '⏳'}</Text>
          <Text style={styles.title}>
            {linkExpired ? 'Link Expired or Invalid' : 'Verifying link...'}
          </Text>
          <Text style={styles.subtitle}>
            {linkExpired
              ? 'This reset link has expired or is invalid. Request a new one to continue.'
              : 'Please wait while we verify your reset link. If nothing happens, the link may have expired — request a new one.'}
          </Text>
          <Button
            mode="contained"
            onPress={() => router.replace('/(auth)/forgot-password')}
            style={styles.button}
          >
            Request New Link
          </Button>
          {!linkExpired && (
            <Button
              mode="text"
              onPress={() => router.replace('/(auth)/login')}
              style={{ marginTop: spacing.sm }}
            >
              Back to Sign In
            </Button>
          )}
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
          <Text style={styles.icon}>🔒</Text>
          <Text style={styles.title}>Set New Password</Text>
          <Text style={styles.subtitle}>
            Choose a strong password with at least 8 characters.
          </Text>

          <TextInput
            mode="outlined"
            label="New Password"
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
            secureTextEntry={!showPassword}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShowPassword((v) => !v)}
              />
            }
            style={styles.input}
            error={!!error}
          />

          <TextInput
            mode="outlined"
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); setError(''); }}
            secureTextEntry={!showConfirm}
            left={<TextInput.Icon icon="lock-check-outline" />}
            right={
              <TextInput.Icon
                icon={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShowConfirm((v) => !v)}
              />
            }
            style={styles.input}
            error={!!error}
          />

          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleReset}
            loading={loading}
            disabled={loading || !password || !confirmPassword}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Update Password
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
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  button: {
    width: '100%',
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  buttonContent: { paddingVertical: spacing.sm },
  successIcon: { fontSize: 64, marginBottom: spacing.lg },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.success,
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
});
