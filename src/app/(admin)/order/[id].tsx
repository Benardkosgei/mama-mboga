import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Chip, Button, Surface, Divider, ActivityIndicator } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/utils';
import { ORDER_STATUSES } from '@/constants';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { Order, OrderStatus } from '@/types';

export default function AdminOrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:profiles!customer_id(id, full_name, phone),
          address:addresses(*),
          items:order_items(
            *,
            product:products(id, name, unit_type),
            seller:profiles!seller_id(id, full_name)
          ),
          delivery_assignment:delivery_assignments(
            *,
            rider:profiles!rider_id(id, full_name, phone)
          )
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Order;
    },
    enabled: !!id,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: OrderStatus) => {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  if (isLoading || !order) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  const statusInfo = ORDER_STATUSES[order.status] ?? { label: order.status, color: colors.text.secondary };
  const customer = order.customer as any;
  const address = order.address as any;
  const assignment = order.delivery_assignment as any;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* Header */}
        <Surface style={styles.card} elevation={1}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.orderNumber}>{order.order_number}</Text>
              <Text style={styles.orderDate}>
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
              {order.mpesa_receipt && (
                <Text style={styles.receipt}>Ref: {order.mpesa_receipt}</Text>
              )}
            </View>
          )}
        </Surface>

        {/* Customer */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <Text style={styles.infoMain}>{customer?.full_name}</Text>
          <Text style={styles.infoSub}>{customer?.phone}</Text>
        </Surface>

        {/* Items */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.sectionTitle}>Items ({order.items?.length ?? 0})</Text>
          {order.items?.map((item: any, index: number) => (
            <React.Fragment key={item.id}>
              <View style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.product?.name}</Text>
                  <Text style={styles.itemSeller}>by {item.seller?.full_name}</Text>
                  <Text style={styles.itemQty}>{item.quantity} × {formatPrice(item.price)}</Text>
                </View>
                <Text style={styles.itemTotal}>{formatPrice(item.total)}</Text>
              </View>
              {index < (order.items?.length ?? 0) - 1 && <Divider />}
            </React.Fragment>
          ))}
        </Surface>

        {/* Delivery Address */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          <Text style={styles.infoMain}>{address?.name}</Text>
          <Text style={styles.infoSub}>{address?.street_address}</Text>
          {address?.landmark && <Text style={styles.infoSub}>Near {address.landmark}</Text>}
        </Surface>

        {/* Rider */}
        {assignment && (
          <Surface style={styles.card} elevation={1}>
            <Text style={styles.sectionTitle}>Assigned Rider</Text>
            <Text style={styles.infoMain}>{assignment.rider?.full_name}</Text>
            <Text style={styles.infoSub}>{assignment.rider?.phone}</Text>
            <Chip style={styles.riderStatusChip} textStyle={{ fontSize: 11 }}>
              {assignment.status}
            </Chip>
          </Surface>
        )}

        {/* Summary */}
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>{formatPrice(order.subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Fee</Text>
            <Text style={styles.summaryValue}>{formatPrice(order.delivery_fee)}</Text>
          </View>
          <Divider style={{ marginVertical: spacing.sm }} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(order.total)}</Text>
          </View>
        </Surface>

        {order.notes && (
          <Surface style={styles.card} elevation={1}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.infoSub}>{order.notes}</Text>
          </Surface>
        )}
      </ScrollView>

      {/* Action footer */}
      {(order.status === 'paid' || order.status === 'processing' ||
        order.status === 'pending_payment') && (
        <View style={styles.footer}>
          {order.status === 'paid' && (
            <Button
              mode="contained"
              onPress={() => updateStatusMutation.mutate('processing')}
              loading={updateStatusMutation.isPending}
              style={styles.footerBtn}
            >
              Mark as Processing
            </Button>
          )}
          {order.status === 'processing' && (
            <Button
              mode="contained"
              onPress={() => updateStatusMutation.mutate('dispatched')}
              loading={updateStatusMutation.isPending}
              style={styles.footerBtn}
            >
              Mark as Dispatched
            </Button>
          )}
          <Button
            mode="outlined"
            textColor={colors.error}
            onPress={() =>
              Alert.alert('Cancel Order', 'Are you sure?', [
                { text: 'No', style: 'cancel' },
                { text: 'Cancel Order', style: 'destructive', onPress: () => updateStatusMutation.mutate('cancelled') },
              ])
            }
            style={styles.footerBtn}
          >
            Cancel Order
          </Button>
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderNumber: { fontSize: 20, fontWeight: 'bold', color: colors.text.primary },
  orderDate: { fontSize: 12, color: colors.text.secondary, marginTop: 4 },
  statusChip: {},
  paidRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  paidChip: { backgroundColor: colors.success + '20' },
  receipt: { fontSize: 12, color: colors.text.secondary, marginLeft: spacing.md },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.sm },
  infoMain: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  infoSub: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: spacing.sm },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  itemSeller: { fontSize: 12, color: colors.text.secondary },
  itemQty: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  riderStatusChip: { alignSelf: 'flex-start', marginTop: spacing.sm },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
  summaryLabel: { fontSize: 14, color: colors.text.secondary },
  summaryValue: { fontSize: 14, color: colors.text.primary },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary },
  totalValue: { fontSize: 18, fontWeight: 'bold', color: colors.primary[500] },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.sm },
  footerBtn: { borderRadius: borderRadius.md },
});
