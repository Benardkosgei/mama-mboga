import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Surface, HelperText } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { colors, spacing, borderRadius } from '@/constants/theme';

export default function OTPScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    phone: string;
    mode: 'login' | 'register';
    fullName?: string;
    role?: string;
  }>();

  const { setSession, setProfile, setLoading: setGlobalLoading } = useAuthStore();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleVerify = async () => {
    if (otp.length < 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOTP({
        phone: params.phone,
        token: otp,
        type: 'sms',
      });

      if (verifyError) throw verifyError;

      if (params.mode === 'register') {
        // Create profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user!.id,
            phone: params.phone,
            full_name: params.fullName,
            role: params.role || 'customer',
            is_approved: params.role === 'seller' ? false : true, // Sellers need approval
          })
          .select()
          .single();

        if (profileError) throw profileError;
        setProfile(profile);
      } else {
        // Fetch existing profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user!.id)
          .single();

        setProfile(profile);
      }

      setSession(data.session);

      // Navigate based on role — profile was already set above
      const role = params.mode === 'register' ? params.role : (
        await supabase.from('profiles').select('role').eq('id', data.user!.id).single()
      ).data?.role;

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
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendTimer(60);
    try {
      await supabase.auth.signInWithOtp({
        phone: params.phone,
      });
    } catch (err) {
      console.error('Resend error:', err);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Surface style={styles.form} elevation={2}>
          <Text style={styles.title}>Verify OTP</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit code sent to{' '}
            <Text style={styles.phone}>{params.phone}</Text>
          </Text>

          <TextInput
            mode="outlined"
            label="OTP Code"
            placeholder="123456"
            value={otp}
            onChangeText={setOtp}
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
            error={!!error}
          />
          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleVerify}
            loading={loading}
            disabled={loading || otp.length < 6}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Verify
          </Button>

          <View style={styles.resendContainer}>
            {resendTimer > 0 ? (
              <Text style={styles.resendText}>
                Resend code in {resendTimer}s
              </Text>
            ) : (
              <Button
                mode="text"
                onPress={handleResend}
                disabled={loading}
              >
                Resend OTP
              </Button>
            )}
          </View>
        </Surface>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
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
    marginBottom: spacing.xl,
  },
  phone: {
    color: colors.primary[500],
    fontWeight: '600',
  },
  input: {
    marginBottom: spacing.xs,
    backgroundColor: colors.surface,
  },
  button: {
    marginTop: spacing.md,
    borderRadius: borderRadius.md,
  },
  buttonContent: {
    paddingVertical: spacing.sm,
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  resendText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
});
