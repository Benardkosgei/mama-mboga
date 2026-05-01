import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Button, Surface, Chip, Searchbar, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/utils';
import { ORDER_STATUSES } from '@/constants';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { Order, OrderStatus } from '@/types';

export default function AdminOrders() {
  const router = useRouter();
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:profiles!customer_id(id, full_name, phone),
          address:addresses(*),
          items:order_items(id)
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as (Order & { items: { id: string }[] })[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: OrderStatus }) => {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const filtered = (orders || []).filter((o) => {
    const matchesStatus = status === 'all' || o.status === status;
    const matchesSearch = !search || o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer as any)?.full_name?.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Text style={styles.title}>Order Management</Text>
        <Searchbar placeholder="Search orders..." value={search} onChangeText={setSearch} style={styles.searchbar} />
        <View style={styles.filters}>
          {['all', 'pending_payment', 'paid', 'processing', 'dispatched', 'delivered'].map((s) => (
            <Chip key={s} selected={status === s} onPress={() => setStatus(s)} style={styles.filterChip}>
              {s === 'all' ? 'All' : ORDER_STATUSES[s as OrderStatus]?.label || s}
            </Chip>
          ))}
        </View>
      </Surface>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const statusInfo = ORDER_STATUSES[item.status] || { label: item.status, color: colors.text.secondary };
          return (
            <Surface style={styles.orderCard} elevation={1}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderId}>{item.order_number}</Text>
                  <Text style={styles.orderCustomer}>{(item.customer as any)?.full_name}</Text>
                </View>
                <Chip
                  style={[styles.statusChip, { backgroundColor: statusInfo.color + '20' }]}
                  textStyle={{ color: statusInfo.color, fontSize: 11 }}
                >
                  {statusInfo.label}
                </Chip>
              </View>
              <View style={styles.orderFooter}>
                <Text style={styles.orderAmount}>{formatPrice(item.total)}</Text>
                <Text style={styles.orderItems}>{item.items?.length ?? 0} items</Text>
              </View>
              <View style={styles.orderActions}>
                <Button mode="outlined" compact onPress={() => router.push(`/(admin)/order/${item.id}`)}>
                  View
                </Button>
                {item.status === 'paid' && (
                  <Button
                    mode="contained"
                    compact
                    onPress={() => updateStatusMutation.mutate({ id: item.id, newStatus: 'processing' })}
                    loading={updateStatusMutation.isPending}
                  >
                    Process
                  </Button>
                )}
                {item.status === 'processing' && (
                  <Button
                    mode="contained"
                    compact
                    onPress={() => updateStatusMutation.mutate({ id: item.id, newStatus: 'dispatched' })}
                    loading={updateStatusMutation.isPending}
                  >
                    Dispatch
                  </Button>
                )}
                {(item.status === 'pending_payment' || item.status === 'paid' || item.status === 'processing') && (
                  <Button
                    mode="outlined"
                    compact
                    textColor={colors.error}
                    onPress={() =>
                      Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
                        { text: 'No', style: 'cancel' },
                        { text: 'Cancel Order', style: 'destructive', onPress: () => updateStatusMutation.mutate({ id: item.id, newStatus: 'cancelled' }) },
                      ])
                    }
                  >
                    Cancel
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
  header: { padding: spacing.lg, backgroundColor: colors.surface },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.md },
  searchbar: { marginBottom: spacing.md, borderRadius: borderRadius.md },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  filterChip: { marginBottom: spacing.xs },
  list: { padding: spacing.md },
  orderCard: { padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.surface, marginBottom: spacing.md },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.md },
  orderId: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary },
  orderCustomer: { fontSize: 14, color: colors.text.secondary, marginTop: 2 },
  statusChip: {},
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  orderAmount: { fontSize: 18, fontWeight: 'bold', color: colors.primary[500] },
  orderItems: { fontSize: 14, color: colors.text.secondary },
  orderActions: { flexDirection: 'row', gap: spacing.sm },
});
