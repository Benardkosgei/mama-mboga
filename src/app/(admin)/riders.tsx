import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text, Surface, ActivityIndicator, Button, Chip,
  Divider, Searchbar, Menu, IconButton,
} from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { Profile } from '@/types';

type RiderWithDeliveries = Profile & { active_deliveries: { id: string }[] };
type FilterTab = 'all' | 'pending' | 'approved';

const PAGE_SIZE = 10;

const FILTER_OPTIONS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All Riders' },
  { value: 'pending', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
];

export default function AdminRiders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [page, setPage] = useState(0);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  const { data: riders, isLoading } = useQuery({
    queryKey: ['admin-riders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, active_deliveries:delivery_assignments(id)')
        .eq('role', 'rider')
        .order('full_name');
      if (error) throw error;
      return data as RiderWithDeliveries[];
    },
  });

  // Orders that are paid but have no rider assigned yet
  const { data: unassignedOrders } = useQuery({
    queryKey: ['unassigned-orders'],
    queryFn: async () => {
      const { data: assigned } = await supabase
        .from('delivery_assignments')
        .select('order_id');
      const assignedIds = (assigned || []).map((a) => a.order_id).filter(Boolean);

      let query = supabase
        .from('orders')
        .select('id, order_number, total, address:addresses(street_address), customer:profiles!customer_id(full_name)')
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(20);

      // Only apply the NOT IN filter when there are actually assigned orders
      if (assignedIds.length > 0) {
        query = query.not('id', 'in', `(${assignedIds.join(',')})`);
      }

      const { data, error } = await query;
      if (error) return [];
      return data || [];
    },
  });

  // ── Approval mutation ────────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: async ({ riderId, approve }: { riderId: string; approve: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: approve })
        .eq('id', riderId);
      if (error) throw error;

      // Notify the rider
      await supabase.from('notifications').insert({
        user_id: riderId,
        title: approve ? 'Account Approved 🎉' : 'Account Approval Revoked',
        body: approve
          ? 'Your rider account has been approved. You can now start accepting deliveries!'
          : 'Your rider account approval has been revoked. Please contact support.',
        data: { type: approve ? 'account_approved' : 'account_revoked' },
      });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-riders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      Alert.alert(
        'Done',
        variables.approve ? 'Rider approved successfully.' : 'Rider approval revoked.',
      );
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const handleApprove = (rider: RiderWithDeliveries) => {
    Alert.alert(
      'Approve Rider',
      `Approve ${rider.full_name} to start accepting deliveries?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => approveMutation.mutate({ riderId: rider.id, approve: true }),
        },
      ],
    );
  };

  const handleRevoke = (rider: RiderWithDeliveries) => {
    Alert.alert(
      'Revoke Approval',
      `Revoke approval for ${rider.full_name}? They will no longer be able to accept deliveries.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Revoke',
          style: 'destructive',
          onPress: () => approveMutation.mutate({ riderId: rider.id, approve: false }),
        },
      ],
    );
  };

  // ── Assign mutation ──────────────────────────────────────────────────────
  const assignMutation = useMutation({
    mutationFn: async ({ orderId, riderId }: { orderId: string; riderId: string }) => {
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
    const approvedRiders = (riders || []).filter((r) => r.is_approved);
    if (!approvedRiders.length) {
      Alert.alert('No Approved Riders', 'There are no approved riders available to assign.');
      return;
    }
    Alert.alert(
      `Assign Rider for ${orderNumber}`,
      'Select a rider:',
      [
        ...approvedRiders.map((r) => ({
          text: r.full_name,
          onPress: () => assignMutation.mutate({ orderId, riderId: r.id }),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  // ── Filtering ────────────────────────────────────────────────────────────
  const filtered = (riders || []).filter((r) => {
    const matchesSearch =
      !search ||
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.phone.includes(search);
    const matchesFilter =
      filter === 'all' ||
      (filter === 'pending' && !r.is_approved) ||
      (filter === 'approved' && r.is_approved);
    return matchesSearch && matchesFilter;
  });

  const pendingCount = (riders || []).filter((r) => !r.is_approved).length;
  const approvedCount = (riders || []).filter((r) => r.is_approved).length;
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const handleFilterChange = (v: FilterTab) => { setFilter(v); setPage(0); };
  const handleSearch = (v: string) => { setSearch(v); setPage(0); };
  const activeFilterLabel = FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? 'All Riders';

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Filter card */}
      <Surface style={styles.filterCard} elevation={1}>
        {/* Summary chips */}
        <View style={styles.summaryRow}>
          <Chip icon="check-circle" style={styles.approvedSummaryChip} textStyle={styles.approvedSummaryText}>
            {approvedCount} Approved
          </Chip>
          {pendingCount > 0 && (
            <Chip icon="clock-outline" style={styles.pendingSummaryChip} textStyle={styles.pendingSummaryText}>
              {pendingCount} Pending
            </Chip>
          )}
        </View>

        <View style={styles.searchRow}>
          <Searchbar
            placeholder="Search by name or phone..."
            value={search}
            onChangeText={handleSearch}
            style={styles.searchbar}
          />
          <Menu
            visible={filterMenuOpen}
            onDismiss={() => setFilterMenuOpen(false)}
            anchor={
              <IconButton
                icon="filter-variant"
                size={22}
                style={[styles.filterBtn, filter !== 'all' && styles.filterBtnActive]}
                iconColor={filter !== 'all' ? colors.primary[500] : colors.text.secondary}
                onPress={() => setFilterMenuOpen(true)}
              />
            }
          >
            {FILTER_OPTIONS.map((opt) => (
              <Menu.Item
                key={opt.value}
                title={opt.value === 'pending' && pendingCount ? `${opt.label} (${pendingCount})` : opt.label}
                leadingIcon={filter === opt.value ? 'check' : undefined}
                onPress={() => { setFilterMenuOpen(false); handleFilterChange(opt.value); }}
                titleStyle={filter === opt.value ? { color: colors.primary[500], fontWeight: '700' } : undefined}
              />
            ))}
          </Menu>
        </View>
        {filter !== 'all' && (
          <Chip
            onClose={() => handleFilterChange('all')}
            style={styles.activeFilterChip}
            textStyle={{ fontSize: 12 }}
          >
            {activeFilterLabel}
          </Chip>
        )}
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

      {/* Table */}
      <Surface style={styles.tableCard} elevation={1}>
        <View style={styles.tableHeader}>
          <Text style={[styles.colHeader, styles.colRider]}>Rider</Text>
          <Text style={[styles.colHeader, styles.colAvail]}>Activity</Text>
          <Text style={[styles.colHeader, styles.colApproval]}>Approval</Text>
          <View style={styles.colAction} />
        </View>
        <Divider />

        {paginated.map((item, index) => {
          const activeCount = item.active_deliveries?.length ?? 0;
          const isApproved = item.is_approved === true;
          const isPending = !isApproved;
          const isMutating = approveMutation.isPending && approveMutation.variables?.riderId === item.id;

          return (
            <View key={item.id}>
              <View style={styles.tableRow}>
                {/* Avatar + name */}
                <View style={styles.colRider}>
                  <View style={styles.riderRow}>
                    <View style={[styles.avatar, isPending && styles.avatarPending]}>
                      <Text style={styles.avatarText}>{item.full_name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View>
                      <Text style={styles.cellPrimary} numberOfLines={1}>{item.full_name}</Text>
                      <Text style={styles.cellSecondary}>{item.phone}</Text>
                    </View>
                  </View>
                </View>

                {/* Activity chip */}
                <View style={styles.colAvail}>
                  <Text style={[styles.statusLabel, { color: activeCount > 0 ? colors.warning : colors.success }]}>
                    {activeCount > 0 ? `${activeCount} active` : 'Available'}
                  </Text>
                </View>

                {/* Approval status */}
                <View style={styles.colApproval}>
                  <Text style={[styles.statusLabel, { color: isApproved ? colors.success : colors.warning }]}>
                    {isApproved ? 'Approved' : 'Pending'}
                  </Text>
                </View>

                {/* Action menu */}
                <View style={styles.colAction}>
                  <IconButton
                    icon="dots-vertical"
                    size={18}
                    onPress={() =>
                      Alert.alert(
                        item.full_name,
                        isPending ? 'Approve this rider?' : 'Revoke approval?',
                        isPending
                          ? [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Approve', onPress: () => approveMutation.mutate({ riderId: item.id, approve: true }) },
                            ]
                          : [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Revoke', style: 'destructive', onPress: () => approveMutation.mutate({ riderId: item.id, approve: false }) },
                            ],
                      )
                    }
                    disabled={isMutating}
                  />
                </View>
              </View>
              {index < paginated.length - 1 && <Divider />}
            </View>
          );
        })}

        {paginated.length === 0 && (
          <Text style={styles.emptyText}>
            {filter === 'pending' ? 'No pending riders' : filter === 'approved' ? 'No approved riders' : 'No riders registered yet'}
          </Text>
        )}

        <View style={styles.pagination}>
          <Button mode="text" compact disabled={page === 0} onPress={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Text style={styles.pageInfo}>
            {filtered.length === 0
              ? '0 riders'
              : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </Text>
          <Button mode="text" compact disabled={page >= totalPages - 1} onPress={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </View>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  filterCard: { padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.surface },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  approvedSummaryChip: { backgroundColor: colors.success + '20' },
  approvedSummaryText: { color: colors.success, fontSize: 12 },
  pendingSummaryChip: { backgroundColor: colors.warning + '20' },
  pendingSummaryText: { color: colors.warning, fontSize: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  searchbar: { flex: 1, borderRadius: borderRadius.md },
  filterBtn: { margin: 0, borderRadius: borderRadius.md, backgroundColor: colors.background },
  filterBtnActive: { backgroundColor: colors.primary[50] },
  activeFilterChip: { alignSelf: 'flex-start', marginTop: spacing.sm },

  unassignedSection: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.warning + '10',
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.md },
  unassignedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  unassignedInfo: { flex: 1 },
  unassignedOrder: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  unassignedCustomer: { fontSize: 13, color: colors.text.secondary },
  unassignedAddress: { fontSize: 12, color: colors.text.secondary },

  tableCard: { borderRadius: borderRadius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  colHeader: { fontSize: 11, fontWeight: '700', color: colors.text.secondary, textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 60,
  },
  colRider: { flex: 1.6 },
  colAvail: { width: 72 },
  colApproval: { width: 68, alignItems: 'flex-end' },
  colAction: { width: 40, alignItems: 'center' },
  riderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPending: { backgroundColor: colors.text.secondary },
  avatarText: { fontSize: 15, fontWeight: 'bold', color: colors.white },
  cellPrimary: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  cellSecondary: { fontSize: 12, color: colors.text.secondary, marginTop: 1 },
  statusLabel: { fontSize: 11, fontWeight: '600' },

  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pageInfo: { fontSize: 13, color: colors.text.secondary },
  emptyText: { textAlign: 'center', color: colors.text.secondary, padding: spacing.xl },
});
