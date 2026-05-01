import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Button, Surface, Chip, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/utils';
import { DELIVERY_STATUSES } from '@/constants';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { DeliveryStatus } from '@/types';

const STATUS_FLOW: Record<string, DeliveryStatus> = {
  assigned: 'accepted',
  accepted: 'picked_up',
  picked_up: 'on_the_way',
  on_the_way: 'delivered',
};

const ACTION_LABELS: Record<string, string> = {
  assigned: 'Accept',
  accepted: 'Picked Up',
  picked_up: 'Start Delivery',
  on_the_way: 'Mark Delivered',
};

export default function RiderDeliveries() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('active');

  const { data: deliveries, isLoading } = useQuery({
    queryKey: ['rider-deliveries', profile?.id, filter],
    queryFn: async () => {
      if (!profile?.id) return [];
      let query = supabase
        .from('delivery_assignments')
        .select(`
          *,
          order:orders(
            id, order_number, total,
            customer:profiles!customer_id(full_name, phone),
            address:addresses(street_address, landmark),
            items:order_items(id)
          )
        `)
        .eq('rider_id', profile.id)
        .order('created_at', { ascending: false });

      if (filter === 'active') {
        query = query.in('status', ['assigned', 'accepted', 'picked_up', 'on_the_way']);
      } else if (filter === 'completed') {
        query = query.eq('status', 'delivered');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ assignmentId, orderId, newStatus }: { assignmentId: string; orderId: string; newStatus: DeliveryStatus }) => {
      const updates: any = { status: newStatus };
      if (newStatus === 'picked_up') updates.picked_up_at = new Date().toISOString();
      if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString();

      const { error } = await supabase.from('delivery_assignments').update(updates).eq('id', assignmentId);
      if (error) throw error;

      const orderStatusMap: Partial<Record<DeliveryStatus, string>> = {
        picked_up: 'dispatched',
        on_the_way: 'out_for_delivery',
        delivered: 'delivered',
      };
      if (orderStatusMap[newStatus]) {
        await supabase.from('orders').update({ status: orderStatusMap[newStatus] }).eq('id', orderId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rider-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['rider-active-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['rider-stats'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;
  }

  return (
    <View style={styles.container}>
      <SegmentedButtons
        value={filter}
        onValueChange={setFilter}
        buttons={[
          { value: 'active', label: 'Active' },
          { value: 'completed', label: 'Completed' },
          { value: 'all', label: 'All' },
        ]}
        style={styles.filterButtons}
      />

      <FlatList
        data={deliveries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No Deliveries</Text>
            <Text style={styles.emptyText}>
              {filter === 'active' ? 'No active deliveries at the moment' : 'No completed deliveries yet'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const statusInfo = DELIVERY_STATUSES[item.status as DeliveryStatus] || { label: item.status, color: colors.text.secondary };
          const nextStatus = STATUS_FLOW[item.status];
          const order = item.order as any;
          return (
            <Surface style={styles.card} elevation={1}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>{order?.order_number}</Text>
                <Chip
                  style={{ backgroundColor: statusInfo.color + '20' }}
                  textStyle={{ color: statusInfo.color, fontSize: 10 }}
                >
                  {statusInfo.label}
                </Chip>
              </View>

              <Text style={styles.customerName}>{order?.customer?.full_name}</Text>
              <Text style={styles.customerPhone}>{order?.customer?.phone}</Text>

              <View style={styles.addressBox}>
                <Text style={styles.addressLabel}>📍 Delivery Location</Text>
                <Text style={styles.addressText}>{order?.address?.street_address}</Text>
                {order?.address?.landmark && (
                  <Text style={styles.addressLandmark}>Near {order.address.landmark}</Text>
                )}
              </View>

              <View style={styles.orderMeta}>
                <Text style={styles.orderMetaText}>{order?.items?.length ?? 0} items</Text>
                <Text style={styles.orderTotal}>{formatPrice(order?.total || 0)}</Text>
              </View>

              <View style={styles.actions}>
                <Button mode="outlined" onPress={() => router.push(`/(rider)/delivery/${order?.id}`)} style={styles.viewBtn}>
                  Details
                </Button>
                {nextStatus && (
                  <Button
                    mode="contained"
                    onPress={() => updateMutation.mutate({ assignmentId: item.id, orderId: order?.id, newStatus: nextStatus })}
                    loading={updateMutation.isPending}
                    style={styles.actionBtn}
                  >
                    {ACTION_LABELS[item.status]}
                  </Button>
                )}
              </View>
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
  filterButtons: { margin: spacing.md },
  list: { padding: spacing.md, paddingTop: 0, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: { fontSize: 64, marginBottom: spacing.lg },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text.primary },
  emptyText: { fontSize: 14, color: colors.text.secondary, marginTop: spacing.sm, textAlign: 'center' },
  card: { padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.surface, marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  orderId: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary },
  customerName: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  customerPhone: { fontSize: 13, color: colors.text.secondary, marginTop: 2, marginBottom: spacing.md },
  addressBox: { padding: spacing.md, backgroundColor: colors.primary[50], borderRadius: borderRadius.md, marginBottom: spacing.md },
  addressLabel: { fontSize: 12, color: colors.text.secondary, marginBottom: 4 },
  addressText: { fontSize: 14, fontWeight: '600', color: colors.primary[600] },
  addressLandmark: { fontSize: 12, color: colors.primary[500], marginTop: 2 },
  orderMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  orderMetaText: { fontSize: 13, color: colors.text.secondary },
  orderTotal: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  actions: { flexDirection: 'row', gap: spacing.sm },
  viewBtn: { flex: 1 },
  actionBtn: { flex: 2, borderRadius: borderRadius.md },
});
