import React from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { Text, Button, Surface, Chip, Divider, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
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

const STATUS_LABELS: Record<string, string> = {
  assigned: 'Accept Delivery',
  accepted: 'Mark Picked Up',
  picked_up: 'Start Delivery',
  on_the_way: 'Mark Delivered',
};

export default function DeliveryDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: assignment, isLoading } = useQuery({
    queryKey: ['delivery', params.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_assignments')
        .select(`
          *,
          order:orders(
            *,
            customer:profiles!customer_id(id, full_name, phone),
            address:addresses(*),
            items:order_items(
              *,
              product:products(id, name)
            )
          )
        `)
        .eq('order_id', params.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!params.id,
  });

  const updateMutation = useMutation({
    mutationFn: async (newStatus: DeliveryStatus) => {
      const updates: any = { status: newStatus };
      if (newStatus === 'picked_up') updates.picked_up_at = new Date().toISOString();
      if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString();

      const { error: assignError } = await supabase
        .from('delivery_assignments')
        .update(updates)
        .eq('id', assignment!.id);
      if (assignError) throw assignError;

      // Sync order status
      const orderStatusMap: Partial<Record<DeliveryStatus, string>> = {
        picked_up: 'dispatched',
        on_the_way: 'out_for_delivery',
        delivered: 'delivered',
      };
      if (orderStatusMap[newStatus]) {
        await supabase
          .from('orders')
          .update({ status: orderStatusMap[newStatus] })
          .eq('id', assignment!.order_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery', params.id] });
      queryClient.invalidateQueries({ queryKey: ['rider-deliveries'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('delivery_assignments')
        .update({ status: 'rejected' })
        .eq('id', assignment!.id);
      if (error) throw error;
    },
    onSuccess: () => router.back(),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const handleCallCustomer = () => {
    const phone = (assignment?.order as any)?.customer?.phone;
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  if (isLoading || !assignment) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;
  }

  const order = assignment.order as any;
  const statusInfo = DELIVERY_STATUSES[assignment.status as DeliveryStatus] || { label: assignment.status, color: colors.text.secondary };
  const nextStatus = STATUS_FLOW[assignment.status];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Status */}
        <Surface style={styles.statusCard} elevation={2}>
          <View style={styles.statusRow}>
            <Text style={styles.orderId}>{order?.order_number}</Text>
            <Chip
              style={[styles.statusChip, { backgroundColor: statusInfo.color + '20' }]}
              textStyle={{ color: statusInfo.color }}
            >
              {statusInfo.label}
            </Chip>
          </View>
        </Surface>

        {/* Customer */}
        <Surface style={styles.section} elevation={1}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <Text style={styles.customerName}>{order?.customer?.full_name}</Text>
          <Text style={styles.customerPhone}>{order?.customer?.phone}</Text>
          <Button mode="outlined" icon="phone" onPress={handleCallCustomer} style={styles.callButton}>
            Call Customer
          </Button>
        </Surface>

        {/* Delivery Address */}
        <Surface style={styles.section} elevation={1}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <View style={styles.addressBox}>
            <Text style={styles.addressName}>{order?.address?.name}</Text>
            <Text style={styles.addressText}>{order?.address?.street_address}</Text>
            {order?.address?.landmark && (
              <Text style={styles.addressLandmark}>Near {order.address.landmark}</Text>
            )}
          </View>
        </Surface>

        {/* Items */}
        <Surface style={styles.section} elevation={1}>
          <Text style={styles.sectionTitle}>Items ({order?.items?.length || 0})</Text>
          {order?.items?.map((item: any, index: number) => (
            <React.Fragment key={item.id}>
              <View style={styles.itemRow}>
                <Text style={styles.itemName}>{item.product?.name}</Text>
                <Text style={styles.itemQty}>×{item.quantity}</Text>
              </View>
              {index < (order.items.length - 1) && <Divider />}
            </React.Fragment>
          ))}
          <Divider style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(order?.total || 0)}</Text>
          </View>
        </Surface>

        {/* Notes */}
        {assignment.notes && (
          <Surface style={styles.section} elevation={1}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{assignment.notes}</Text>
          </Surface>
        )}
      </ScrollView>

      {/* Action Footer */}
      {assignment.status !== 'delivered' && assignment.status !== 'rejected' && (
        <Surface style={styles.footer} elevation={3}>
          {assignment.status === 'assigned' && (
            <Button
              mode="outlined"
              textColor={colors.error}
              onPress={() =>
                Alert.alert('Reject Delivery', 'Are you sure?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reject', style: 'destructive', onPress: () => rejectMutation.mutate() },
                ])
              }
              style={styles.rejectButton}
              loading={rejectMutation.isPending}
            >
              Reject
            </Button>
          )}
          {nextStatus && (
            <Button
              mode="contained"
              onPress={() => updateMutation.mutate(nextStatus)}
              loading={updateMutation.isPending}
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
            >
              {STATUS_LABELS[assignment.status]}
            </Button>
          )}
        </Surface>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: 120 },
  statusCard: { padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.surface, marginBottom: spacing.md },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: 20, fontWeight: 'bold', color: colors.text.primary },
  statusChip: {},
  section: { padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.surface, marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.md },
  customerName: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  customerPhone: { fontSize: 14, color: colors.text.secondary, marginTop: 4 },
  callButton: { marginTop: spacing.md },
  addressBox: { padding: spacing.md, backgroundColor: colors.primary[50], borderRadius: borderRadius.md },
  addressName: { fontSize: 14, fontWeight: '600', color: colors.primary[700] },
  addressText: { fontSize: 14, color: colors.primary[600], marginTop: 4 },
  addressLandmark: { fontSize: 12, color: colors.primary[500], marginTop: 2 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  itemName: { fontSize: 14, color: colors.text.primary, flex: 1 },
  itemQty: { fontSize: 14, color: colors.text.secondary },
  divider: { marginVertical: spacing.sm },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: colors.primary[500] },
  notesText: { fontSize: 14, color: colors.text.secondary },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, backgroundColor: colors.surface, flexDirection: 'row', gap: spacing.md },
  rejectButton: { flex: 1, borderColor: colors.error },
  actionButton: { flex: 2, borderRadius: borderRadius.md },
  actionButtonContent: { paddingVertical: spacing.sm },
});
