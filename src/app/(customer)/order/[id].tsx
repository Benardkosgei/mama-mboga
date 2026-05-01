import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Chip, Button, Surface, Divider, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatPrice, formatWhatsAppMessage } from '@/utils';
import { ORDER_STATUSES } from '@/constants';
import { colors, spacing, borderRadius } from '@/constants/theme';
import * as Linking from 'expo-linking';
import type { Order } from '@/types';

export default function OrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();
  const canDispatch = profile?.role === 'admin' || profile?.role === 'seller';

  // Realtime: refresh when order status changes
  useEffect(() => {
    if (!params.id) return;
    const channel = supabase
      .channel(`order-${params.id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${params.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['order', params.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [params.id, queryClient]);

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', params.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:profiles!customer_id(id, full_name, phone),
          address:addresses(*),
          items:order_items(
            *,
            product:products(id, name, images:product_images(*)),
            seller:profiles!seller_id(id, full_name)
          ),
          delivery_assignment:delivery_assignments(
            *,
            rider:profiles!rider_id(id, full_name, phone)
          )
        `)
        .eq('id', params.id)
        .single();
      if (error) throw error;
      return data as Order;
    },
    enabled: !!params.id,
  });

  const handleWhatsAppDispatch = async () => {
    if (!order) return;

    const message = formatWhatsAppMessage(order);
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `whatsapp://send?text=${encodedMessage}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        // Fallback to web WhatsApp
        const webUrl = `https://wa.me/?text=${encodedMessage}`;
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      console.error('WhatsApp error:', error);
    }
  };

  if (isLoading || !order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  const statusInfo = ORDER_STATUSES[order.status] || {
    label: order.status,
    color: colors.text.secondary,
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Order Header */}
        <Surface style={styles.headerCard} elevation={2}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.orderNumber}>{order.order_number}</Text>
              <Text style={styles.orderDate}>
                {new Date(order.created_at).toLocaleDateString('en-KE', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <Chip
              style={[styles.statusChip, { backgroundColor: statusInfo.color + '20' }]}
              textStyle={{ color: statusInfo.color }}
            >
              {statusInfo.label}
            </Chip>
          </View>

          {order.payment_status === 'completed' && (
            <View style={styles.paymentInfo}>
              <Chip icon="check-circle" style={styles.paidChip}>
                PAID
              </Chip>
              {order.mpesa_receipt && (
                <Text style={styles.receiptText}>
                  {order.mpesa_receipt}
                </Text>
              )}
            </View>
          )}
        </Surface>

        {/* Order Progress */}
        {order.status !== 'cancelled' && order.status !== 'pending_payment' && (
          <Surface style={styles.sectionCard} elevation={1}>
            <Text style={styles.sectionTitle}>Order Progress</Text>
            {(['paid', 'processing', 'dispatched', 'out_for_delivery', 'delivered'] as const).map((step, index, arr) => {
              const stepInfo = ORDER_STATUSES[step];
              const statusOrder = ['paid', 'processing', 'dispatched', 'out_for_delivery', 'delivered'];
              const currentIndex = statusOrder.indexOf(order.status);
              const stepIndex = statusOrder.indexOf(step);
              const isDone = stepIndex <= currentIndex;
              const isLast = index === arr.length - 1;
              return (
                <View key={step} style={styles.progressStep}>
                  {/* Left column: dot + connector line */}
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressDot, isDone && { backgroundColor: stepInfo.color }]} />
                    {!isLast && (
                      <View style={[
                        styles.progressLine,
                        isDone && stepIndex < currentIndex && { backgroundColor: colors.primary[300] },
                      ]} />
                    )}
                  </View>
                  <Text style={[styles.progressLabel, isDone && { color: stepInfo.color, fontWeight: '600' }]}>
                    {stepInfo.label}
                  </Text>
                </View>
              );
            })}
          </Surface>
        )}

        {/* Order Items */}
        <Surface style={styles.sectionCard} elevation={1}>
          <Text style={styles.sectionTitle}>Items</Text>
          {order.items?.map((item, index) => (
            <React.Fragment key={item.id}>
              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product?.name}</Text>
                  <Text style={styles.itemDetails}>
                    {item.quantity} × {formatPrice(item.price)}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>{formatPrice(item.total)}</Text>
              </View>
              {index < (order.items?.length || 0) - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Surface>

        {/* Delivery Address */}
        <Surface style={styles.sectionCard} elevation={1}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <Text style={styles.addressName}>{order.address?.name}</Text>
          <Text style={styles.addressText}>{order.address?.street_address}</Text>
          {order.address?.landmark && (
            <Text style={styles.addressLandmark}>Near {order.address?.landmark}</Text>
          )}
        </Surface>

        {/* Delivery Status (if assigned) */}
        {order.delivery_assignment && (
          <Surface style={styles.sectionCard} elevation={1}>
            <Text style={styles.sectionTitle}>Delivery</Text>
            <Text style={styles.riderName}>
              Rider: {order.delivery_assignment.rider?.full_name}
            </Text>
            <Text style={styles.riderPhone}>
              {order.delivery_assignment.rider?.phone}
            </Text>
          </Surface>
        )}

        {/* Order Summary */}
        <Surface style={styles.sectionCard} elevation={1}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatPrice(order.subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>{formatPrice(order.delivery_fee)}</Text>
          </View>
          <Divider style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(order.total)}</Text>
          </View>
        </Surface>

        {/* Notes */}
        {order.notes && (
          <Surface style={styles.sectionCard} elevation={1}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{order.notes}</Text>
          </Surface>
        )}
      </ScrollView>

      {/* WhatsApp Dispatch Button (admin/seller only) */}
      {canDispatch && order.status === 'paid' && (
        <View style={styles.footer}>
          <Button
            mode="contained"
            onPress={handleWhatsAppDispatch}
            icon="whatsapp"
            style={styles.dispatchButton}
            contentStyle={styles.dispatchButtonContent}
          >
            Send to WhatsApp Group
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  headerCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  orderDate: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  statusChip: {
    height: 28,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paidChip: {
    backgroundColor: colors.success + '20',
  },
  receiptText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: spacing.md,
  },
  sectionCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  itemDetails: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  addressName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  addressText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
  },
  addressLandmark: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  riderName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  riderPhone: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.text.primary,
  },
  summaryDivider: {
    marginVertical: spacing.sm,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary[500],
  },
  notesText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  progressStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
  },
  progressTrack: {
    alignItems: 'center',
    width: 20,
    marginRight: spacing.md,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  progressLine: {
    width: 2,
    height: spacing.lg,
    backgroundColor: colors.border,
  },
  progressLabel: {
    fontSize: 13,
    color: colors.text.secondary,
    paddingTop: 0,
    lineHeight: 12,
    marginBottom: spacing.lg,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dispatchButton: {
    borderRadius: borderRadius.md,
  },
  dispatchButtonContent: {
    paddingVertical: spacing.sm,
  },
});
