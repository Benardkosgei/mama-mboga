import React from 'react';
import { View, StyleSheet, ScrollView, Alert, Linking } from 'react-native';
import { Text, Surface, Chip, Button, Divider, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/utils';
import { DELIVERY_STATUSES, ORDER_STATUSES } from '@/constants';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { DeliveryStatus } from '@/types';

const STATUS_FLOW: Record<string, DeliveryStatus> = {
  assigned: 'accepted',
  accepted: 'picked_up',
  picked_up: 'on_the_way',
  on_the_way: 'delivered',
};

const ACTION_LABELS: Record<string, string> = {
  assigned: 'Accept Delivery',
  accepted: 'Mark Picked Up',
  picked_up: 'Start Delivery',
  on_the_way: 'Mark as Delivered',
};

export default function RiderDeliveryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: delivery, isLoading } = useQuery({
    queryKey: ['rider-delivery', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('delivery_assignments')
        .select(`
          *,
          order:orders(
            id, order_number, status, total, subtotal, delivery_fee,
            payment_status, notes,
            customer:profiles!customer_id(id, full_name, phone),
            address:addresses(name, street_address, landmark, phone),
            items:order_items(
              id, quantity, price, total,
              product:products(id, name, unit_type)
            )
          )
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (newStatus: DeliveryStatus) => {
      const updates: any = { status: newStatus };
      if (newStatus === 'picked_up') updates.picked_up_at = new Date().toISOString();
      if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString();

      const { error } = await supabase
        .from('delivery_assignments')
        .update(updates)
        .eq('id', id);
      if (error) throw error;

      // Sync order status
      const orderStatusMap: Partial<Record<DeliveryStatus, string>> = {
        picked_up: 'dispatched',
        on_the_way: 'out_for_delivery',
        delivered: 'delivered',
      };
      if (orderStatusMap[newStatus] && order?.id) {
        await supabase
          .from('orders')
          .update({ status: orderStatusMap[newStatus] })
          .eq('id', order.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rider-delivery', id] });
      queryClient.invalidateQueries({ queryKey: ['rider-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['rider-active-deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['rider-stats'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('delivery_assignments')
        .update({ status: 'rejected' })
        .eq('id', id);
      if (error) throw error;

      const currentOrder = (delivery?.order as any);

      // Revert order status to 'paid' so admin can reassign
      if (currentOrder?.id) {
        await supabase
          .from('orders')
          .update({ status: 'paid' })
          .eq('id', currentOrder.id);
      }

      // Notify all admins that this delivery was rejected and needs reassignment
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin');

      if (admins?.length) {
        await supabase.from('notifications').insert(
          admins.map((admin: any) => ({
            user_id: admin.id,
            title: 'Delivery Rejected',
            body: `Rider rejected order ${currentOrder?.order_number ?? ''}. Please reassign a rider.`,
            data: { orderId: currentOrder?.id, type: 'delivery_rejected' },
          }))
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rider-deliveries'] });
      router.back();
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  if (isLoading || !delivery) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  const order = delivery.order as any;
  const customer = order?.customer;
  const address = order?.address;
  const statusInfo = DELIVERY_STATUSES[delivery.status as DeliveryStatus] ?? {
    label: delivery.status,
    color: colors.text.secondary,
  };
  const nextStatus = STATUS_FLOW[delivery.status];

  const callCustomer = () => {
    const phone = customer?.phone?.replace('+', '');
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Status header */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.orderNumber}>{order?.order_number}</Text>
              <Text style={styles.date}>
                {new Date(delivery.created_at).toLocaleDateString('en-KE', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </Text>
            </View>
            <Chip
              style={{ backgroundColor: statusInfo.color + '20' }}
              textStyle={{ color: statusInfo.color, fontWeight: '600' }}
            >
              {statusInfo.label}
            </Chip>
          </View>
        </Surface>

        {/* Customer */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <Text style={styles.infoMain}>{customer?.full_name}</Text>
          <Text style={styles.infoSub}>{customer?.phone}</Text>
          <Button
            mode="outlined"
            icon="phone"
            onPress={callCustomer}
            style={styles.callButton}
          >
            Call Customer
          </Button>
        </Surface>

        {/* Delivery address */}
        <Surface style={[styles.card, styles.addressCard]} elevation={1}>
          <Text style={styles.sectionTitle}>📍 Delivery Address</Text>
          <Text style={styles.addressName}>{address?.name}</Text>
          <Text style={styles.addressText}>{address?.street_address}</Text>
          {address?.landmark ? (
            <Text style={styles.addressLandmark}>Near {address.landmark}</Text>
          ) : null}
          {address?.phone ? (
            <Text style={styles.infoSub}>Contact: {address.phone}</Text>
          ) : null}
        </Surface>

        {/* Order items */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.sectionTitle}>Items ({order?.items?.length ?? 0})</Text>
          {order?.items?.map((item: any, index: number) => (
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
              {index < (order?.items?.length ?? 0) - 1 && <Divider />}
            </React.Fragment>
          ))}
          <Divider style={{ marginVertical: spacing.sm }} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatPrice(order?.subtotal ?? 0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>{formatPrice(order?.delivery_fee ?? 0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(order?.total ?? 0)}</Text>
          </View>
        </Surface>

        {/* Payment status */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <Chip
            icon={order?.payment_status === 'completed' ? 'check-circle' : 'clock-outline'}
            style={{
              alignSelf: 'flex-start',
              backgroundColor: order?.payment_status === 'completed'
                ? colors.success + '20'
                : colors.warning + '20',
            }}
            textStyle={{
              color: order?.payment_status === 'completed' ? colors.success : colors.warning,
            }}
          >
            {order?.payment_status === 'completed' ? 'Paid' : 'Pay on Delivery'}
          </Chip>
          {order?.payment_status !== 'completed' && (
            <Text style={styles.podNote}>
              Collect {formatPrice(order?.total ?? 0)} from the customer upon delivery.
            </Text>
          )}
        </Surface>

        {order?.notes ? (
          <Surface style={styles.card} elevation={1}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.infoSub}>{order.notes}</Text>
          </Surface>
        ) : null}
      </ScrollView>

      {/* Action footer */}
      {delivery.status !== 'delivered' && delivery.status !== 'rejected' && (
        <View style={styles.footer}>
          {delivery.status === 'assigned' && (
            <Button
              mode="outlined"
              textColor={colors.error}
              onPress={() =>
                Alert.alert('Reject Delivery', 'Are you sure you want to reject this delivery?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reject', style: 'destructive', onPress: () => rejectMutation.mutate() },
                ])
              }
              style={styles.rejectBtn}
              disabled={rejectMutation.isPending || updateMutation.isPending}
            >
              Reject
            </Button>
          )}
          {nextStatus && (
            <Button
              mode="contained"
              onPress={() => updateMutation.mutate(nextStatus)}
              loading={updateMutation.isPending}
              disabled={updateMutation.isPending || rejectMutation.isPending}
              style={styles.actionBtn}
            >
              {ACTION_LABELS[delivery.status]}
            </Button>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: 120, gap: spacing.md },
  card: { padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.surface },
  addressCard: { backgroundColor: colors.primary[50] },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderNumber: { fontSize: 20, fontWeight: 'bold', color: colors.text.primary },
  date: { fontSize: 12, color: colors.text.secondary, marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.sm },
  infoMain: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  infoSub: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  callButton: { marginTop: spacing.md, borderRadius: borderRadius.md },
  addressName: { fontSize: 14, fontWeight: '600', color: colors.primary[700] },
  addressText: { fontSize: 14, color: colors.primary[600], marginTop: 2 },
  addressLandmark: { fontSize: 12, color: colors.primary[500], marginTop: 2 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  itemQty: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  summaryLabel: { fontSize: 13, color: colors.text.secondary },
  summaryValue: { fontSize: 13, color: colors.text.primary },
  totalLabel: { fontSize: 15, fontWeight: 'bold', color: colors.text.primary },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: colors.primary[500] },
  podNote: { fontSize: 13, color: colors.warning, marginTop: spacing.sm },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  rejectBtn: { flex: 1, borderColor: colors.error, borderRadius: borderRadius.md },
  actionBtn: { flex: 2, borderRadius: borderRadius.md },
});
