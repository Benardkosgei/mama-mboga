import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Chip, Surface, Divider, ActivityIndicator, Button } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/utils';
import { ORDER_STATUSES } from '@/constants';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { OrderStatus } from '@/types';

export default function SellerOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();

  const { data: order, isLoading } = useQuery({
    queryKey: ['seller-order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, status, payment_status, total, subtotal,
          delivery_fee, notes, created_at,
          customer:profiles!customer_id(full_name, phone),
          address:addresses(name, street_address, landmark, phone),
          items:order_items!inner(
            id, quantity, price, total,
            product:products(id, name, unit_type)
          ),
          delivery_assignment:delivery_assignments(
            status,
            rider:profiles!rider_id(full_name, phone)
          )
        `)
        .eq('id', id)
        // Only return items belonging to this seller
        .eq('items.seller_id', profile?.id ?? '')
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!profile?.id,
  });

  if (isLoading || !order) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  const statusInfo = ORDER_STATUSES[order.status as OrderStatus] ?? {
    label: order.status,
    color: colors.text.secondary,
  };
  const customer = order.customer as any;
  const address = order.address as any;
  const assignment = order.delivery_assignment as any;
  const items = (order.items as any[]) ?? [];

  // Seller's portion of the order total
  const sellerTotal = items.reduce((sum: number, i: any) => sum + (i.total ?? 0), 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Header */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.orderNumber}>{order.order_number}</Text>
              <Text style={styles.date}>
                {new Date(order.created_at).toLocaleDateString('en-KE', {
                  day: 'numeric', month: 'long', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            </View>
            <Chip
              style={[styles.statusChip, { backgroundColor: statusInfo.color + '20' }]}
              textStyle={{ color: statusInfo.color, fontWeight: '600' }}
            >
              {statusInfo.label}
            </Chip>
          </View>
          {order.payment_status === 'completed' && (
            <View style={styles.paidRow}>
              <Chip icon="check-circle" style={styles.paidChip} textStyle={{ color: colors.success }}>
                PAID
              </Chip>
            </View>
          )}
        </Surface>

        {/* Customer */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <Text style={styles.infoMain}>{customer?.full_name}</Text>
          <Text style={styles.infoSub}>{customer?.phone}</Text>
        </Surface>

        {/* Delivery Address */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <Text style={styles.infoMain}>{address?.name}</Text>
          <Text style={styles.infoSub}>{address?.street_address}</Text>
          {address?.landmark ? <Text style={styles.infoSub}>Near {address.landmark}</Text> : null}
        </Surface>

        {/* Your Items */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.sectionTitle}>Your Items ({items.length})</Text>
          {items.map((item: any, index: number) => (
            <React.Fragment key={item.id}>
              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product?.name}</Text>
                  <Text style={styles.itemQty}>
                    {item.quantity} {item.product?.unit_type} × {formatPrice(item.price)}
                  </Text>
                </View>
                <Text style={styles.itemTotal}>{formatPrice(item.total)}</Text>
              </View>
              {index < items.length - 1 && <Divider />}
            </React.Fragment>
          ))}
          <Divider style={{ marginVertical: spacing.sm }} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Your Earnings</Text>
            <Text style={styles.totalValue}>{formatPrice(sellerTotal)}</Text>
          </View>
        </Surface>

        {/* Delivery */}
        {assignment && (
          <Surface style={styles.card} elevation={1}>
            <Text style={styles.sectionTitle}>Delivery</Text>
            <Text style={styles.infoMain}>{assignment.rider?.full_name ?? 'Rider assigned'}</Text>
            <Text style={styles.infoSub}>{assignment.rider?.phone}</Text>
            <Chip style={styles.riderChip} textStyle={{ fontSize: 11 }}>
              {assignment.status}
            </Chip>
          </Surface>
        )}

        {/* Notes */}
        {order.notes ? (
          <Surface style={styles.card} elevation={1}>
            <Text style={styles.sectionTitle}>Order Notes</Text>
            <Text style={styles.infoSub}>{order.notes}</Text>
          </Surface>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: 100, gap: spacing.md },
  card: { padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.surface },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderNumber: { fontSize: 20, fontWeight: 'bold', color: colors.text.primary },
  date: { fontSize: 12, color: colors.text.secondary, marginTop: 4 },
  statusChip: {},
  paidRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  paidChip: { backgroundColor: colors.success + '20' },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.sm },
  infoMain: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  infoSub: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: spacing.sm },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  itemQty: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 15, fontWeight: 'bold', color: colors.text.primary },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: colors.primary[500] },
  riderChip: { alignSelf: 'flex-start', marginTop: spacing.sm },
});
