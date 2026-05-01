import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Surface, ActivityIndicator, Button, Chip, Searchbar } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { Profile } from '@/types';

export default function AdminRiders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: riders, isLoading } = useQuery({
    queryKey: ['admin-riders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, active_deliveries:delivery_assignments(id)')
        .eq('role', 'rider')
        .order('full_name');
      if (error) throw error;
      return data as (Profile & { active_deliveries: { id: string }[] })[];
    },
  });

  // Orders that are paid but have no rider assigned yet
  const { data: unassignedOrders } = useQuery({
    queryKey: ['unassigned-orders'],
    queryFn: async () => {
      // Step 1: get all order IDs that already have an assignment
      const { data: assigned } = await supabase
        .from('delivery_assignments')
        .select('order_id');
      const assignedIds = (assigned || []).map((a) => a.order_id);

      // Step 2: fetch paid orders excluding already-assigned ones
      let query = supabase
        .from('orders')
        .select('id, order_number, total, address:addresses(street_address), customer:profiles!customer_id(full_name)')
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(20);

      if (assignedIds.length > 0) {
        query = query.not('id', 'in', `(${assignedIds.join(',')})`);
      }

      const { data, error } = await query;
      if (error) return [];
      return data || [];
    },
  });

  const assignMutation = useMutation({
    mutationFn: async ({ orderId, riderId }: { orderId: string; riderId: string }) => {
      // Check if assignment already exists
      const { data: existing } = await supabase
        .from('delivery_assignments')
        .select('id')
        .eq('order_id', orderId)
        .single();

      if (existing) {
        const { error } = await supabase
          .from('delivery_assignments')
          .update({ rider_id: riderId, status: 'assigned' })
          .eq('order_id', orderId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('delivery_assignments')
          .insert({ order_id: orderId, rider_id: riderId, status: 'assigned' });
        if (error) throw error;
      }

      await supabase.from('orders').update({ status: 'dispatched' }).eq('id', orderId);

      // Notify rider
      await supabase.from('notifications').insert({
        user_id: riderId,
        title: 'New Delivery Assigned',
        body: 'You have a new delivery to pick up.',
        data: { orderId, type: 'delivery_assigned' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unassigned-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      Alert.alert('Success', 'Rider assigned successfully');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const handleAssign = (orderId: string, orderNumber: string) => {
    if (!riders?.length) {
      Alert.alert('No Riders', 'No riders are registered yet');
      return;
    }
    Alert.alert(
      `Assign Rider for ${orderNumber}`,
      'Select a rider:',
      [
        ...riders.map((r) => ({
          text: r.full_name,
          onPress: () => assignMutation.mutate({ orderId, riderId: r.id }),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  const filtered = (riders || []).filter((r) =>
    !search || r.full_name.toLowerCase().includes(search.toLowerCase()) || r.phone.includes(search)
  ) as (Profile & { active_deliveries: { id: string }[] })[];

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Text style={styles.title}>Rider Management</Text>
        <Text style={styles.subtitle}>{riders?.length || 0} riders registered</Text>
        <Searchbar placeholder="Search riders..." value={search} onChangeText={setSearch} style={styles.searchbar} />
      </Surface>

      {/* Unassigned Orders */}
      {unassignedOrders && unassignedOrders.length > 0 && (
        <Surface style={styles.unassignedSection} elevation={1}>
          <Text style={styles.sectionTitle}>Orders Needing Rider ({unassignedOrders.length})</Text>
          {unassignedOrders.map((order: any) => (
            <View key={order.id} style={styles.unassignedRow}>
              <View style={styles.unassignedInfo}>
                <Text style={styles.unassignedOrder}>{order.order_number}</Text>
                <Text style={styles.unassignedCustomer}>{order.customer?.full_name}</Text>
                <Text style={styles.unassignedAddress}>{order.address?.street_address}</Text>
              </View>
              <Button
                mode="contained"
                compact
                onPress={() => handleAssign(order.id, order.order_number)}
                loading={assignMutation.isPending}
              >
                Assign
              </Button>
            </View>
          ))}
        </Surface>
      )}

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🚴</Text>
            <Text style={styles.emptyText}>No riders registered yet</Text>
          </View>
        }
        renderItem={({ item }) => {
          const activeCount = item.active_deliveries?.length ?? 0;
          return (
            <Surface style={styles.riderCard} elevation={1}>
              <View style={styles.riderInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.full_name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.riderDetails}>
                  <Text style={styles.riderName}>{item.full_name}</Text>
                  <Text style={styles.riderPhone}>{item.phone}</Text>
                </View>
              </View>
              <Chip
                style={[styles.activeChip, activeCount > 0 && styles.busyChip]}
                textStyle={{ fontSize: 11, color: activeCount > 0 ? colors.warning : colors.success }}
              >
                {activeCount > 0 ? `${activeCount} active` : 'Available'}
              </Chip>
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
  header: { padding: spacing.lg, backgroundColor: colors.surface, marginBottom: spacing.sm },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.text.primary },
  subtitle: { fontSize: 14, color: colors.text.secondary, marginTop: spacing.xs, marginBottom: spacing.md },
  searchbar: { borderRadius: borderRadius.md },
  unassignedSection: { margin: spacing.md, marginTop: 0, padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.warning + '10', borderWidth: 1, borderColor: colors.warning + '40' },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.md },
  unassignedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  unassignedInfo: { flex: 1 },
  unassignedOrder: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  unassignedCustomer: { fontSize: 13, color: colors.text.secondary },
  unassignedAddress: { fontSize: 12, color: colors.text.secondary },
  list: { padding: spacing.md, paddingTop: 0 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: { fontSize: 64, marginBottom: spacing.md },
  emptyText: { fontSize: 16, color: colors.text.secondary },
  riderCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.surface, marginBottom: spacing.sm },
  riderInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary[500], justifyContent: 'center', alignItems: 'center', marginRight: spacing.md },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: colors.white },
  riderDetails: {},
  riderName: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  riderPhone: { fontSize: 14, color: colors.text.secondary },
  activeChip: { backgroundColor: colors.success + '20' },
  busyChip: { backgroundColor: colors.warning + '20' },
});
