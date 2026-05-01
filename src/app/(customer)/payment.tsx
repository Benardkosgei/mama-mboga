import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Surface, TextInput, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Truck } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/utils';
import { colors, spacing, borderRadius } from '@/constants/theme';

const MPESA_API_URL = process.env.EXPO_PUBLIC_MPESA_API_URL || 'http://localhost:3000';

export default function PaymentScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId: string; method: string }>();
  const isPod = params.method === 'pod';

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const cancelPollRef = useRef<(() => void) | null>(null);

  // Cleanup poll on unmount
  useEffect(() => {
    return () => { cancelPollRef.current?.(); };
  }, []);

  const { data: order } = useQuery({
    queryKey: ['order', params.orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', params.orderId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!params.orderId,
  });

  // For POD, auto-show success state immediately
  useEffect(() => {
    if (isPod && order) {
      setPaymentStatus('success');
    }
  }, [isPod, order]);

  const handleInitiatePayment = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${MPESA_API_URL}/api/mpesa/stkpush`, {
        phone,
        amount: order.total,
        orderId: order.id,
      });
      if (response.data.success) {
        setPaymentStatus('pending');
        cancelPollRef.current = pollPaymentStatus(response.data.data.checkoutRequestId) ?? null;
      } else {
        throw new Error(response.data.error?.message || 'Payment initiation failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Payment failed');
      setPaymentStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const pollPaymentStatus = (checkoutId: string) => {
    const maxAttempts = 30;
    let attempts = 0;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      attempts++;
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('checkout_request_id', checkoutId)
        .single();

      if (cancelled) return;

      if (payment?.status === 'completed') {
        setPaymentStatus('success');
        return;
      }
      if (payment?.status === 'failed') {
        setPaymentStatus('failed');
        setError('Payment failed. Please try again.');
        return;
      }
      if (attempts < maxAttempts) {
        setTimeout(poll, 2000);
      } else {
        setPaymentStatus('failed');
        setError('Payment timeout. Please check your phone and try again.');
      }
    };

    poll();
    // Return a cancel function
    return () => { cancelled = true; };
  };

  if (!order) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  // Success state — shared by both M-Pesa and POD
  if (paymentStatus === 'success') {
    return (
      <View style={styles.centered}>
        <Text style={styles.successIcon}>{isPod ? '🚚' : '✅'}</Text>
        <Text style={styles.successTitle}>
          {isPod ? 'Order Placed!' : 'Payment Successful!'}
        </Text>
        <Text style={styles.successText}>
          {isPod
            ? 'Your order has been confirmed. Pay the rider upon delivery.'
            : 'Your order has been confirmed and is being processed.'}
        </Text>
        {isPod && (
          <Surface style={styles.podNote} elevation={1}>
            <Truck size={18} color={colors.secondary[500]} />
            <Text style={styles.podNoteText}>
              Have {formatPrice(order.total)} ready for the delivery rider.
            </Text>
          </Surface>
        )}
        <Button
          mode="contained"
          onPress={() => router.replace('/(customer)/orders')}
          style={styles.ordersButton}
        >
          View My Orders
        </Button>
        <Button
          mode="text"
          onPress={() => router.replace('/(customer)/home')}
        >
          Continue Shopping
        </Button>
      </View>
    );
  }

  // POD should never reach here (useEffect sets success), but guard anyway
  if (isPod) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Order Summary */}
        <Surface style={styles.summaryCard} elevation={2}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Order Total</Text>
            <Text style={styles.rowValue}>{formatPrice(order.total)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Order Number</Text>
            <Text style={styles.rowValue}>{order.order_number}</Text>
          </View>
        </Surface>

        {/* M-Pesa Payment */}
        <Surface style={styles.paymentCard} elevation={2}>
          <Text style={styles.cardTitle}>M-Pesa Payment</Text>
          <Text style={styles.instructions}>
            Enter your Safaricom number to receive an STK push prompt.
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

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          {paymentStatus === 'pending' ? (
            <View style={styles.pendingContainer}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
              <Text style={styles.pendingText}>Waiting for payment confirmation...</Text>
              <Text style={styles.pendingHint}>
                Check your phone and complete the M-Pesa payment
              </Text>
            </View>
          ) : (
            <Button
              mode="contained"
              onPress={handleInitiatePayment}
              loading={loading}
              disabled={loading || !phone}
              style={styles.payButton}
              contentStyle={styles.payButtonContent}
            >
              Pay {formatPrice(order.total)} with M-Pesa
            </Button>
          )}
        </Surface>

        {/* Steps */}
        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>How to Pay</Text>
          {[
            'Enter your Safaricom phone number',
            'Tap "Pay with M-Pesa"',
            'Check your phone for the M-Pesa prompt',
            'Enter your PIN to confirm',
            'Wait for confirmation',
          ].map((step, i) => (
            <Text key={i} style={styles.step}>{i + 1}. {step}</Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  // Summary
  summaryCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  rowLabel: { fontSize: 14, color: colors.text.secondary },
  rowValue: { fontSize: 14, fontWeight: '600', color: colors.text.primary },

  // Payment card
  paymentCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  instructions: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  input: { marginBottom: spacing.md, backgroundColor: colors.surface },
  errorText: { color: colors.error, fontSize: 12, marginBottom: spacing.md },
  pendingContainer: { alignItems: 'center', paddingVertical: spacing.lg },
  pendingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  pendingHint: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  payButton: { borderRadius: borderRadius.md },
  payButtonContent: { paddingVertical: spacing.sm },

  // Steps
  stepsCard: {
    padding: spacing.lg,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.lg,
  },
  stepsTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.primary[600],
    marginBottom: spacing.sm,
  },
  step: { fontSize: 14, color: colors.primary[600], marginBottom: spacing.xs },

  // Success
  successIcon: { fontSize: 72, marginBottom: spacing.lg },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.success,
    marginBottom: spacing.md,
  },
  successText: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  podNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.secondary[50],
    marginBottom: spacing.lg,
  },
  podNoteText: {
    flex: 1,
    fontSize: 14,
    color: colors.secondary[600],
    fontWeight: '500',
  },
  ordersButton: { borderRadius: borderRadius.md, marginBottom: spacing.sm, width: '100%' },
});
