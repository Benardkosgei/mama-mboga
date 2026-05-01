import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Surface, HelperText } from 'react-native-paper';
import { useRouter, Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { validatePhoneNumber, formatPhoneNumber } from '@/utils';
import { colors, spacing, borderRadius } from '@/constants/theme';

// Set to true to use password login (no SMS needed) for testing
const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

export default function LoginScreen() {
  const router = useRouter();
  const { setSession, setProfile } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleDevLogin = async () => {
    if (!validatePhoneNumber(phone)) {
      setError('Please enter a valid Kenyan phone number');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formattedPhone = formatPhoneNumber(phone);

      // Sign in with the user's actual email
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) throw signInError;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user!.id)
        .single();

      setSession(data.session);
      setProfile(profile);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!validatePhoneNumber(phone)) {
      setError('Please enter a valid Kenyan phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formattedPhone = formatPhoneNumber(phone);

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', formattedPhone)
        .single();

      if (!existingProfile) {
        setError('No account found with this phone number');
        setLoading(false);
        return;
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (otpError) throw otpError;

      router.push({
        pathname: '/(auth)/otp',
        params: { phone: formattedPhone, mode: 'login' },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.logo}>🛒 Mama Mboga</Text>
          <Text style={styles.tagline}>Fresh produce, delivered fast</Text>
        </View>

        <Surface style={styles.form} elevation={2}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            {DEV_MODE ? 'Sign in with your phone and password' : 'Enter your phone number to sign in'}
          </Text>

          <TextInput
            mode="outlined"
            label="Phone Number"
            placeholder="0712 345 678"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            left={<TextInput.Icon icon="phone" />}
            style={styles.input}
            error={!!error}
          />

          {DEV_MODE && (
            <TextInput
              mode="outlined"
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              left={<TextInput.Icon icon="email" />}
              style={styles.input}
            />
          )}

          {DEV_MODE && (
            <TextInput
              mode="outlined"
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              left={<TextInput.Icon icon="lock" />}
              right={<TextInput.Icon icon={showPassword ? 'eye-off' : 'eye'} onPress={() => setShowPassword(v => !v)} />}
              style={styles.input}
            />
          )}

          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>

          <Button
            mode="contained"
            onPress={DEV_MODE ? handleDevLogin : handleSendOTP}
            loading={loading}
            disabled={loading || !phone || (DEV_MODE && (!email || !password))}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {DEV_MODE ? 'Sign In' : 'Send OTP'}
          </Button>

          {DEV_MODE && (
            <Surface style={styles.testAccounts} elevation={0}>
              <Text style={styles.testTitle}>Test Accounts (password: Test1234!)</Text>
              <Text style={styles.testAccount}>👑 Admin: 0700000001</Text>
              <Text style={styles.testAccount}>🛒 Seller: 0700000002</Text>
              <Text style={styles.testAccount}>🛍️ Customer: 0700000003</Text>
              <Text style={styles.testAccount}>🚴 Rider: 0700000004</Text>
            </Surface>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <Link href="/(auth)/register" asChild>
              <Text style={styles.link}> Register</Text>
            </Link>
          </View>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  header: { alignItems: 'center', marginBottom: spacing.xl },
  logo: { fontSize: 36, fontWeight: 'bold', color: colors.primary[500], marginBottom: spacing.sm },
  tagline: { fontSize: 16, color: colors.text.secondary },
  form: { padding: spacing.lg, borderRadius: borderRadius.xl, backgroundColor: colors.surface },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.sm },
  subtitle: { fontSize: 14, color: colors.text.secondary, marginBottom: spacing.lg },
  input: { marginBottom: spacing.md, backgroundColor: colors.surface },
  button: { marginTop: spacing.sm, borderRadius: borderRadius.md },
  buttonContent: { paddingVertical: spacing.sm },
  testAccounts: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
  },
  testTitle: { fontSize: 12, fontWeight: '600', color: colors.primary[700], marginBottom: spacing.sm },
  testAccount: { fontSize: 12, color: colors.primary[600], marginBottom: 2 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg },
  footerText: { color: colors.text.secondary },
  link: { color: colors.primary[500], fontWeight: '600' },
});
