import React, { useState } from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Surface, Chip, SegmentedButtons, ActivityIndicator, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/utils';
import { ORDER_STATUSES } from '@/constants';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { OrderStatus } from '@/types';

export default function SellerOrders() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const [filter, setFilter] = useState('active');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['seller-orders', profile?.id, filter],
    queryFn: async () => {
      if (!profile?.id) return [];

      // Get distinct order IDs for this seller
      const { data: items, error } = await supabase
        .from('order_items')
        .select(`
          order_id,
          total,
          order:orders!inner(
            id, order_number, status, payment_status, total,
            created_at,
            customer:profiles!customer_id(full_name, phone),
            address:addresses(street_address)
          )
        `)
        .eq('seller_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Deduplicate by order_id and aggregate seller's item totals
      const orderMap = new Map<string, any>();
      for (const item of items || []) {
        const order = item.order as any;
        if (!order) continue;
        if (orderMap.has(order.id)) {
          orderMap.get(order.id).sellerTotal += item.total;
        } else {
          orderMap.set(order.id, { ...order, sellerTotal: item.total });
        }
      }

      const allOrders = Array.from(orderMap.values());

      if (filter === 'active') {
        return allOrders.filter((o) =>
          ['paid', 'processing', 'dispatched', 'out_for_delivery'].includes(o.status)
        );
      }
      if (filter === 'completed') {
        return allOrders.filter((o) => o.status === 'delivered');
      }
      if (filter === 'cancelled') {
        return allOrders.filter((o) => o.status === 'cancelled');
      }
      return allOrders;
    },
    enabled: !!profile?.id,
  });

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={filter}
        onValueChange={setFilter}
        buttons={[
          { value: 'active', label: 'Active' },
          { value: 'completed', label: 'Done' },
          { value: 'all', label: 'All' },
        ]}
        style={styles.filter}
      />

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🛒</Text>
            <Text style={styles.emptyTitle}>No Orders</Text>
            <Text style={styles.emptyText}>
              {filter === 'active'
                ? 'No active orders right now'
                : 'No orders in this category'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusInfo = ORDER_STATUSES[item.status as OrderStatus] ?? {
            label: item.status,
            color: colors.text.secondary,
          };
          return (
            <Surface style={styles.card} elevation={1}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderNumber}>{item.order_number}</Text>
                <Chip
                  style={{ backgroundColor: statusInfo.color + '20' }}
                  textStyle={{ color: statusInfo.color, fontSize: 11 }}
                >
                  {statusInfo.label}
                </Chip>
              </View>

              <Text style={styles.customer}>{item.customer?.full_name}</Text>
              <Text style={styles.address}>📍 {item.address?.street_address}</Text>

              <View style={styles.footer}>
                <View>
                  <Text style={styles.totalLabel}>Your earnings</Text>
                  <Text style={styles.total}>{formatPrice(item.sellerTotal)}</Text>
                </View>
                <Button
                  mode="outlined"
                  compact
                  onPress={() => router.push(`/(seller)/order/${item.id}`)}
                >
                  View Details
                </Button>
              </View>

              <Text style={styles.date}>
                {new Date(item.created_at).toLocaleDateString('en-KE', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </Surface>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filter: { margin: spacing.md },
  list: { padding: spacing.md, paddingTop: 0, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: { fontSize: 64, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text.primary },
  emptyText: { fontSize: 14, color: colors.text.secondary, marginTop: spacing.xs, textAlign: 'center' },
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  orderNumber: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary },
  customer: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  address: { fontSize: 13, color: colors.text.secondary, marginTop: 2, marginBottom: spacing.md },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 11, color: colors.text.secondary },
  total: { fontSize: 16, fontWeight: 'bold', color: colors.primary[500] },
  date: { fontSize: 11, color: colors.text.disabled, marginTop: spacing.sm },
});
