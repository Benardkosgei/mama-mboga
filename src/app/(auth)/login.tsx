import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { Text, TextInput, Button, Surface, HelperText } from 'react-native-paper';
import { useRouter, Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { validatePhoneNumber } from '@/utils';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { useBiometrics } from '@/hooks/useBiometrics';

// Fingerprint icon rendered as text — no extra icon library needed
function FingerprintIcon({ size = 32, color = colors.primary[500] }: { size?: number; color?: string }) {
  return (
    <Text style={{ fontSize: size, color, lineHeight: size + 4 }}>
      {'\uD83D\uDC46'}
    </Text>
  );
}

export default function LoginScreen() {
  const router = useRouter();
  const { setSession, setProfile } = useAuthStore();
  const biometrics = useBiometrics();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState('');

  // After a successful password login, offer to enable biometrics
  const offerBiometricEnrollment = useCallback(
    async (email: string, pwd: string) => {
      if (!biometrics.isSupported || !biometrics.isEnrolled || biometrics.isEnabled) return;

      Alert.alert(
        `Enable ${biometrics.biometricLabel} Login`,
        `Sign in faster next time using your ${biometrics.biometricLabel.toLowerCase()}.`,
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Enable',
            onPress: async () => {
              const ok = await biometrics.enableBiometrics({ email, password: pwd });
              if (!ok) {
                Alert.alert('Setup failed', 'Could not enable biometric login. Please try again.');
              }
            },
          },
        ]
      );
    },
    [biometrics]
  );

  const validate = (): string | null => {
    if (!phone.trim()) return 'Please enter your phone number';
    if (!validatePhoneNumber(phone)) return 'Please enter a valid phone number (e.g. 0712 345 678)';
    if (!password) return 'Please enter your password';
    return null;
  };

  /** Core sign-in logic shared by password login and biometric login */
  const signInWithEmail = useCallback(
    async (email: string, pwd: string): Promise<boolean> => {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: pwd,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes('invalid')) {
          setError('Incorrect password. Please try again.');
        } else {
          setError(signInError.message);
        }
        return false;
      }

      const { data: fullProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      setSession(data.session);
      setProfile(fullProfile);
      return true;
    },
    [setSession, setProfile]
  );

  const handleLogin = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const raw = phone.trim().replace(/\s/g, '');

      // Build every plausible format the DB might have stored
      const formats = new Set<string>();
      formats.add(raw);

      if (raw.startsWith('0')) {
        formats.add('+254' + raw.slice(1));
        formats.add('254' + raw.slice(1));
      }
      if (raw.startsWith('+254')) {
        formats.add('0' + raw.slice(4));
        formats.add(raw.slice(1));
      }
      if (raw.startsWith('254') && !raw.startsWith('+')) {
        formats.add('0' + raw.slice(3));
        formats.add('+' + raw);
      }

      const { data: profiles, error: lookupError } = await supabase
        .from('profiles')
        .select('id, email, phone')
        .in('phone', Array.from(formats))
        .limit(1);

      if (lookupError) {
        console.error('Phone lookup error:', lookupError);
        const isNetworkError =
          lookupError.message?.toLowerCase().includes('network request failed') ||
          lookupError.details?.toLowerCase().includes('network request failed');
        setError(
          isNetworkError
            ? 'Network error. Check your internet connection and try again.'
            : 'Something went wrong. Please try again.'
        );
        return;
      }

      const profileData = profiles?.[0] ?? null;

      if (!profileData) {
        setError('No account found with this phone number');
        return;
      }

      if (!profileData.email) {
        setError('This account has no email set. Please contact support.');
        return;
      }

      const ok = await signInWithEmail(profileData.email, password);
      if (ok) {
        // Offer biometric enrollment after first successful password login
        await offerBiometricEnrollment(profileData.email, password);
        router.replace('/');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    setError('');

    try {
      const credentials = await biometrics.authenticate();

      if (!credentials) {
        // User cancelled or biometric failed — don't show an error
        return;
      }

      const ok = await signInWithEmail(credentials.email, credentials.password);
      if (ok) {
        router.replace('/');
      } else {
        // Stored credentials may be stale — disable biometrics so user re-enrolls
        await biometrics.disableBiometrics();
        setError('Biometric login failed. Please sign in with your password.');
      }
    } catch (err: any) {
      setError(err.message || 'Biometric login failed. Please try again.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const showBiometricButton = biometrics.isSupported && biometrics.isEnrolled && biometrics.isEnabled;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View
          style={styles.header}
          accessible
          accessibilityRole="header"
          accessibilityLabel="Mama Mboga — Fresh produce, delivered fast"
        >
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logo}
            resizeMode="contain"
            accessibilityLabel="Mama Mboga logo"
          />
          <Text style={styles.tagline}>Fresh produce, delivered fast</Text>
        </View>

        {/* ── Form ── */}
        <Surface
          style={styles.form}
          elevation={2}
          accessible
          accessibilityRole="none"
          accessibilityLabel="Sign in form"
        >
          <Text style={styles.title} accessibilityRole="header">Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in with your phone number</Text>

          <TextInput
            mode="outlined"
            label="Phone Number"
            placeholder="0712 345 678"
            value={phone}
            onChangeText={(v) => { setPhone(v); setError(''); }}
            keyboardType="phone-pad"
            autoCorrect={false}
            left={<TextInput.Icon icon="phone-outline" accessibilityElementsHidden />}
            style={styles.input}
            error={!!error}
            accessibilityLabel="Phone number"
            accessibilityHint="Enter your registered Kenyan phone number"
            testID="login-phone-input"
          />

          <TextInput
            mode="outlined"
            label="Password"
            value={password}
            onChangeText={(v) => { setPassword(v); setError(''); }}
            secureTextEntry={!showPassword}
            left={<TextInput.Icon icon="lock-outline" accessibilityElementsHidden />}
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShowPassword((v) => !v)}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              />
            }
            style={styles.input}
            error={!!error}
            accessibilityLabel="Password"
            accessibilityHint="Enter your account password"
            testID="login-password-input"
          />

          {/* Error — announced to screen readers */}
          <HelperText
            type="error"
            visible={!!error}
            style={styles.errorText}
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
          >
            {error}
          </HelperText>

          <View style={styles.forgotRow}>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot-password')}
              accessibilityRole="link"
              accessibilityLabel="Forgot password"
              accessibilityHint="Opens the password reset screen"
            >
              <Text style={styles.forgotLink}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading || biometricLoading || !phone || !password}
            style={styles.button}
            contentStyle={styles.buttonContent}
            accessibilityLabel={loading ? 'Signing in, please wait' : 'Sign in'}
            testID="login-submit-button"
          >
            Sign In
          </Button>

          {/* ── Biometric login ── */}
          {showBiometricButton && (
            <View style={styles.biometricSection}>
              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity
                style={styles.biometricButton}
                onPress={handleBiometricLogin}
                disabled={biometricLoading || loading}
                accessibilityRole="button"
                accessibilityLabel={`Sign in with ${biometrics.biometricLabel}`}
                accessibilityHint={`Authenticate using your ${biometrics.biometricLabel.toLowerCase()}`}
                testID="login-biometric-button"
              >
                <Text style={styles.biometricIcon}>
                  {biometrics.biometricLabel === 'Face ID' ? '🪪' : '👆'}
                </Text>
                <Text style={styles.biometricLabel}>
                  {biometricLoading ? 'Authenticating…' : `Sign in with ${biometrics.biometricLabel}`}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View
            style={styles.footer}
            accessible
            accessibilityLabel="Don't have an account? Register"
          >
            <Text style={styles.footerText}>Don't have an account?</Text>
            <Link href="/(auth)/register" asChild>
              <Text
                style={styles.link}
                accessibilityRole="link"
                accessibilityLabel="Register — create a new account"
              >
                {' '}Register
              </Text>
            </Link>
          </View>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logo: {
    width: 180,
    height: 72,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  form: {
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  input: {
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  errorText: {
    marginBottom: spacing.xs,
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  forgotLink: {
    fontSize: 13,
    color: colors.primary[500],
    fontWeight: '600',
  },
  button: {
    borderRadius: borderRadius.md,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  // ── Biometric ──
  biometricSection: {
    marginTop: spacing.md,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    marginHorizontal: spacing.sm,
    fontSize: 12,
    color: colors.text.secondary,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary[500],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  biometricIcon: {
    fontSize: 22,
  },
  biometricLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary[500],
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  footerText: {
    color: colors.text.secondary,
  },
  link: {
    color: colors.primary[500],
    fontWeight: '600',
  },
});
