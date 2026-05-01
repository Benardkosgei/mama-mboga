import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Button, Surface, RadioButton, TextInput, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Smartphone, Truck } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useCreateOrder, useCart } from '@/hooks';
import { formatPrice } from '@/utils';
import { DELIVERY_FEE } from '@/constants';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { Address } from '@/types';

type PaymentMethod = 'mpesa' | 'pod';

export default function CheckoutScreen() {
  const router = useRouter();
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');

  const { data: cart } = useCart();
  const createOrderMutation = useCreateOrder();

  const subtotal = (cart?.items || []).reduce((sum: number, item: any) => {
    const price = item.product?.discount_price || item.product?.price || 0;
    return sum + price * item.quantity;
  }, 0);
  const total = subtotal + DELIVERY_FEE;

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });
      if (error) throw error;
      return data as Address[];
    },
  });

  const handlePlaceOrder = () => {
    if (!selectedAddress) {
      Alert.alert('Select Address', 'Please select a delivery address');
      return;
    }
    createOrderMutation.mutate(
      { addressId: selectedAddress, subtotal, deliveryFee: DELIVERY_FEE, total, notes },
      {
        onSuccess: (order) => {
          if (paymentMethod === 'pod') {
            router.push(`/(customer)/payment?orderId=${order.id}&method=pod`);
          } else {
            router.push(`/(customer)/payment?orderId=${order.id}&method=mpesa`);
          }
        },
        onError: (e: any) => Alert.alert('Error', e.message || 'Failed to create order'),
      }
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <Button mode="text" onPress={() => router.push('/(customer)/addresses')}>
              Manage
            </Button>
          </View>

          {addresses?.length ? (
            addresses.map((address) => (
              <Surface key={address.id} style={styles.addressCard} elevation={1}>
                <RadioButton
                  value={address.id}
                  status={selectedAddress === address.id ? 'checked' : 'unchecked'}
                  onPress={() => setSelectedAddress(address.id)}
                  color={colors.primary[500]}
                />
                <View style={styles.addressInfo}>
                  <Text style={styles.addressName}>{address.name}</Text>
                  <Text style={styles.addressText}>{address.street_address}</Text>
                  {address.landmark && (
                    <Text style={styles.addressLandmark}>Near {address.landmark}</Text>
                  )}
                  <Text style={styles.addressPhone}>{address.phone}</Text>
                </View>
              </Surface>
            ))
          ) : (
            <Surface style={styles.emptyAddress} elevation={1}>
              <Text style={styles.emptyText}>No addresses saved</Text>
              <Button mode="contained" onPress={() => router.push('/(customer)/addresses')}>
                Add Address
              </Button>
            </Surface>
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          <TouchableOpacity
            style={[styles.methodCard, paymentMethod === 'mpesa' && styles.methodCardActive]}
            onPress={() => setPaymentMethod('mpesa')}
            activeOpacity={0.8}
          >
            <View style={[styles.methodIcon, { backgroundColor: colors.success + '18' }]}>
              <Smartphone size={22} color={colors.success} />
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>M-Pesa</Text>
              <Text style={styles.methodSubtitle}>Pay via Safaricom STK push</Text>
            </View>
            <RadioButton
              value="mpesa"
              status={paymentMethod === 'mpesa' ? 'checked' : 'unchecked'}
              onPress={() => setPaymentMethod('mpesa')}
              color={colors.primary[500]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.methodCard, paymentMethod === 'pod' && styles.methodCardActive]}
            onPress={() => setPaymentMethod('pod')}
            activeOpacity={0.8}
          >
            <View style={[styles.methodIcon, { backgroundColor: colors.secondary[50] }]}>
              <Truck size={22} color={colors.secondary[500]} />
            </View>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>Pay on Delivery</Text>
              <Text style={styles.methodSubtitle}>Cash or M-Pesa when order arrives</Text>
            </View>
            <RadioButton
              value="pod"
              status={paymentMethod === 'pod' ? 'checked' : 'unchecked'}
              onPress={() => setPaymentMethod('pod')}
              color={colors.primary[500]}
            />
          </TouchableOpacity>
        </View>

        {/* Order Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Notes (Optional)</Text>
          <TextInput
            mode="outlined"
            placeholder="Add special instructions..."
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            style={styles.notesInput}
          />
        </View>
      </ScrollView>

      {/* Order Summary Footer */}
      <Surface style={styles.footer} elevation={3}>
        <View style={styles.footerContent}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>{formatPrice(DELIVERY_FEE)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.totalLabel]}>Total</Text>
            <Text style={[styles.summaryValue, styles.totalValue]}>{formatPrice(total)}</Text>
          </View>
        </View>
        <Button
          mode="contained"
          onPress={handlePlaceOrder}
          loading={createOrderMutation.isPending}
          disabled={!selectedAddress || createOrderMutation.isPending}
          style={styles.continueButton}
          contentStyle={styles.continueButtonContent}
        >
          {paymentMethod === 'pod' ? 'Place Order' : 'Continue to Payment'}
        </Button>
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: 220 },

  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },

  // Address
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  addressInfo: { flex: 1, marginLeft: spacing.sm },
  addressName: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  addressText: { fontSize: 14, color: colors.text.secondary, marginTop: 2 },
  addressLandmark: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  addressPhone: { fontSize: 14, color: colors.text.secondary, marginTop: 4 },
  emptyAddress: {
    padding: spacing.lg,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  emptyText: { fontSize: 14, color: colors.text.secondary, marginBottom: spacing.md },

  // Payment method
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  methodCardActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  methodInfo: { flex: 1 },
  methodTitle: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  methodSubtitle: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },

  // Notes
  notesInput: { backgroundColor: colors.surface },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  footerContent: { marginBottom: spacing.md },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  summaryLabel: { fontSize: 14, color: colors.text.secondary },
  summaryValue: { fontSize: 14, color: colors.text.primary },
  totalLabel: { fontWeight: 'bold', color: colors.text.primary },
  totalValue: { fontWeight: 'bold', color: colors.primary[500], fontSize: 16 },
  continueButton: { borderRadius: borderRadius.md },
  continueButtonContent: { paddingVertical: spacing.sm },
});
