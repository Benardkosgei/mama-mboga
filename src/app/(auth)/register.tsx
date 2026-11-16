import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Text, TextInput, Button, Surface, HelperText, SegmentedButtons } from 'react-native-paper';
import { useRouter, Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { validatePhoneNumber, formatPhoneNumber } from '@/utils';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { UserRole } from '@/types';

export default function RegisterScreen() {
  const router = useRouter();
  const { setSession, setProfile } = useAuthStore();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<UserRole>('customer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const buildPhoneFormats = (phoneInput: string): string[] => {
    const raw = phoneInput.trim().replace(/\s/g, '');
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
    return Array.from(formats);
  };

  const validate = (): string | null => {
    if (!fullName.trim()) return 'Please enter your full name';
    if (!validatePhoneNumber(phone)) return 'Please enter a valid phone number (e.g. 0712 345 678)';
    if (!email.trim() || !email.includes('@') || !email.includes('.')) {
      return 'Please enter a valid email address';
    }
    if (password.length < 8) return 'Password must be at least 8 characters';
    return null;
  };

  const handleRegister = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formattedPhone = formatPhoneNumber(phone);

      // Check phone not already taken in any legacy/canonical format
      const phoneFormats = buildPhoneFormats(phone);
      const { data: existingByPhone } = await supabase
        .from('profiles')
        .select('id')
        .in('phone', phoneFormats)
        .limit(1);

      if ((existingByPhone?.length ?? 0) > 0) {
        setError('An account with this phone number already exists');
        setLoading(false);
        return;
      }

      // Check email not already taken (gives a better UX than waiting for Supabase to reject it)
      const { data: existingByEmail } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();

      if (existingByEmail) {
        setError('An account with this email address already exists');
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            phone: formattedPhone,
            full_name: fullName.trim(),
            role,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (!data.user) throw new Error('Sign up failed — no user returned.');

      // Upsert the profile so we handle both cases:
      //   1. No DB trigger — we create the row
      //   2. A DB trigger already created a partial row — we fill in the fields
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert(
          {
            id: data.user.id,
            phone: formattedPhone,
            email: email.trim().toLowerCase(),
            full_name: fullName.trim(),
            role,
            is_approved: role === 'seller' || role === 'rider' ? false : true,
          },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (profileError) throw profileError;

      // data.session is null when email confirmation is required.
      // In that case we still set the profile so the user sees a useful screen,
      // but we don't set a session (they'll need to confirm then log in).
      if (data.session) {
        setSession(data.session);
      }
      setProfile(profile);

      switch (role) {
        case 'admin':
          router.replace('/(admin)/dashboard');
          break;
        case 'seller':
          router.replace('/(seller)/dashboard');
          break;
        case 'rider':
          router.replace('/(rider)/dashboard');
          break;
        default:
          router.replace('/(customer)/home');
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
          accessibilityLabel="Create account form"
        >
          <Text style={styles.title} accessibilityRole="header">Create Account</Text>
          <Text style={styles.subtitle}>Join Mama Mboga today</Text>

          <TextInput
            mode="outlined"
            label="Full Name"
            placeholder="John Doe"
            value={fullName}
            onChangeText={(v) => { setFullName(v); setError(''); }}
            left={<TextInput.Icon icon="account-outline" accessibilityElementsHidden />}
            style={styles.input}
            accessibilityLabel="Full name"
            accessibilityHint="Enter your first and last name"
            testID="register-fullname-input"
          />

          <TextInput
            mode="outlined"
            label="Phone Number"
            placeholder="0712 345 678"
            value={phone}
            onChangeText={(v) => { setPhone(v); setError(''); }}
            keyboardType="phone-pad"
            left={<TextInput.Icon icon="phone-outline" accessibilityElementsHidden />}
            style={styles.input}
            accessibilityLabel="Phone number"
            accessibilityHint="Enter your Kenyan mobile number, for example 0712 345 678"
            testID="register-phone-input"
          />

          <TextInput
            mode="outlined"
            label="Email Address"
            placeholder="you@example.com"
            value={email}
            onChangeText={(v) => { setEmail(v); setError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            left={<TextInput.Icon icon="email-outline" accessibilityElementsHidden />}
            style={styles.input}
            accessibilityLabel="Email address"
            accessibilityHint="Enter a valid email address"
            testID="register-email-input"
          />

          <TextInput
            mode="outlined"
            label="Password"
            placeholder="At least 8 characters"
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
            accessibilityLabel="Password"
            accessibilityHint="Must be at least 8 characters"
            testID="register-password-input"
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

          {/* Role selector */}
          <Text
            style={styles.roleLabel}
            accessibilityRole="none"
            nativeID="role-label"
          >
            I am a:
          </Text>
          <SegmentedButtons
            value={role}
            onValueChange={(value) => setRole(value as UserRole)}
            buttons={[
              {
                value: 'customer',
                label: 'Customer',
                icon: 'account',
                accessibilityLabel: 'Register as a customer',
              },
              {
                value: 'seller',
                label: 'Seller',
                icon: 'store',
                accessibilityLabel: 'Register as a seller',
              },
              {
                value: 'rider',
                label: 'Rider',
                icon: 'motorbike',
                accessibilityLabel: 'Register as a delivery rider',
              },
            ]}
            style={styles.roleSelector}
          />
          <Text
            style={styles.roleHint}
            accessibilityLiveRegion="polite"
            accessibilityLabel={
              role === 'customer'
                ? 'Customer: Browse products and order fresh produce'
                : role === 'seller'
                ? 'Seller: Sell your products to customers — requires approval'
                : 'Rider: Deliver orders to customers — requires approval'
            }
          >
            {role === 'customer'
              ? 'Browse products and order fresh produce'
              : role === 'seller'
              ? 'Sell your products to customers — requires approval'
              : 'Deliver orders to customers — requires approval'}
          </Text>

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading || !fullName || !phone || !email || !password}
            style={styles.button}
            contentStyle={styles.buttonContent}
            accessibilityLabel={loading ? 'Creating account, please wait' : 'Create account'}
            accessibilityState={{
              disabled: loading || !fullName || !phone || !email || !password,
              busy: loading,
            }}
            testID="register-submit-button"
          >
            Create Account
          </Button>

          <View
            style={styles.footer}
            accessible
            accessibilityLabel="Already have an account? Sign in"
          >
            <Text style={styles.footerText}>Already have an account?</Text>
            <Link href="/(auth)/login" asChild>
              <Text
                style={styles.link}
                accessibilityRole="link"
                accessibilityLabel="Sign in — go to the login screen"
              >
                {' '}Sign In
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
    fontSize: 14,
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
  roleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  roleSelector: {
    marginBottom: spacing.sm,
  },
  roleHint: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  button: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
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
