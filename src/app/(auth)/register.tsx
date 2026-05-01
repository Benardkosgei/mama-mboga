import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Surface, HelperText, SegmentedButtons } from 'react-native-paper';
import { useRouter, Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { validatePhoneNumber, formatPhoneNumber } from '@/utils';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { UserRole } from '@/types';

// Set to true to use password login (no SMS needed) for testing
const DEV_MODE = process.env.EXPO_PUBLIC_DEV_MODE === 'true';

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

  const handleDevRegister = async () => {
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!validatePhoneNumber(phone)) {
      setError('Please enter a valid Kenyan phone number');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formattedPhone = formatPhoneNumber(phone);

      // Check if user exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', formattedPhone)
        .single();

      if (existingProfile) {
        setError('An account with this phone number already exists');
        setLoading(false);
        return;
      }

      // Use the actual email provided by user
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

      // Create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user!.id,
          phone: formattedPhone,
          full_name: fullName.trim(),
          role,
          is_approved: role === 'seller' ? false : true,
        })
        .select()
        .single();

      if (profileError) throw profileError;

      setSession(data.session);
      setProfile(profile);

      // Navigate based on role
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
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async () => {
    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
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
        .select('id')
        .eq('phone', formattedPhone)
        .single();

      if (existingProfile) {
        setError('An account with this phone number already exists');
        setLoading(false);
        return;
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (otpError) throw otpError;

      router.push({
        pathname: '/(auth)/otp',
        params: {
          phone: formattedPhone,
          mode: 'register',
          fullName: fullName.trim(),
          role,
        },
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Mama Mboga today</Text>

          <TextInput
            mode="outlined"
            label="Full Name"
            placeholder="John Doe"
            value={fullName}
            onChangeText={setFullName}
            left={<TextInput.Icon icon="account" />}
            style={styles.input}
          />

          <TextInput
            mode="outlined"
            label="Phone Number"
            placeholder="0712 345 678"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            left={<TextInput.Icon icon="phone" />}
            style={styles.input}
          />

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

          {DEV_MODE && (
            <TextInput
              mode="outlined"
              label="Password"
              placeholder="At least 6 characters"
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

          <Text style={styles.roleLabel}>I am a:</Text>
          <SegmentedButtons
            value={role}
            onValueChange={(value) => setRole(value as UserRole)}
            buttons={[
              { value: 'customer', label: 'Customer', icon: 'account' },
              { value: 'seller', label: 'Seller', icon: 'store' },
            ]}
            style={styles.roleSelector}
          />
          <Text style={styles.roleHint}>
            {role === 'customer'
              ? 'Browse products and order fresh produce'
              : 'Sell your products to customers'}
          </Text>

          <Button
            mode="contained"
            onPress={DEV_MODE ? handleDevRegister : handleSendOTP}
            loading={loading}
            disabled={loading || !fullName || !phone || !email || (DEV_MODE && !password)}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {DEV_MODE ? 'Create Account' : 'Continue with OTP'}
          </Button>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Link href="/(auth)/login" asChild>
              <Text style={styles.link}> Sign In</Text>
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
  logo: { fontSize: 32, fontWeight: 'bold', color: colors.primary[500], marginBottom: spacing.sm },
  tagline: { fontSize: 14, color: colors.text.secondary },
  form: { padding: spacing.lg, borderRadius: borderRadius.xl, backgroundColor: colors.surface },
  title: { fontSize: 24, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.sm },
  subtitle: { fontSize: 14, color: colors.text.secondary, marginBottom: spacing.lg },
  input: { marginBottom: spacing.md, backgroundColor: colors.surface },
  roleLabel: { fontSize: 14, fontWeight: '600', color: colors.text.primary, marginBottom: spacing.sm },
  roleSelector: { marginBottom: spacing.sm },
  roleHint: { fontSize: 12, color: colors.text.secondary, marginBottom: spacing.md, textAlign: 'center' },
  button: { marginTop: spacing.md, borderRadius: borderRadius.md },
  buttonContent: { paddingVertical: spacing.sm },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg },
  footerText: { color: colors.text.secondary },
  link: { color: colors.primary[500], fontWeight: '600' },
});
