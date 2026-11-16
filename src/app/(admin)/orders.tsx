import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import {
  Text, Surface, Chip, ActivityIndicator,
  Button, Divider, Searchbar, Menu, IconButton,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/utils';
import { ORDER_STATUSES } from '@/constants';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { Order, OrderStatus } from '@/types';

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'processing', label: 'Processing' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AdminOrders() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['admin-orders', status, search, page],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(
          `*, customer:profiles!customer_id(id, full_name, phone), address:addresses(*), items:order_items(id)`,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (status !== 'all') {
        query = query.eq('status', status);
      }
      if (search.trim()) {
        // Supabase doesn't support OR across joined tables in a single filter,
        // so we filter by order_number only on the server and let client handle name/phone.
        query = query.ilike('order_number', `%${search.trim()}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { orders: (data ?? []) as (Order & { items: { id: string }[] })[], total: count ?? 0 };
    },
    placeholderData: (prev) => prev,
  });

  const orders = ordersData?.orders ?? [];
  const totalCount = ordersData?.total ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: OrderStatus }) => {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const handleStatusChange = (v: string) => { setStatus(v); setPage(0); };
  const handleSearch = (v: string) => { setSearch(v); setPage(0); };

  const activeFilterLabel = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? 'All Statuses';

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Filter card */}
      <Surface style={styles.filterCard} elevation={1}>
        <View style={styles.searchRow}>
          <Searchbar
            placeholder="Search by order # or customer..."
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
                style={[styles.filterBtn, status !== 'all' && styles.filterBtnActive]}
                iconColor={status !== 'all' ? colors.primary[500] : colors.text.secondary}
                onPress={() => setFilterMenuOpen(true)}
              />
            }
          >
            {STATUS_OPTIONS.map((opt) => (
              <Menu.Item
                key={opt.value}
                title={opt.label}
                leadingIcon={status === opt.value ? 'check' : undefined}
                onPress={() => { setFilterMenuOpen(false); handleStatusChange(opt.value); }}
                titleStyle={status === opt.value ? { color: colors.primary[500], fontWeight: '700' } : undefined}
              />
            ))}
          </Menu>
        </View>
        {status !== 'all' && (
          <Chip
            onClose={() => handleStatusChange('all')}
            style={styles.activeFilterChip}
            textStyle={{ fontSize: 12 }}
          >
            {activeFilterLabel}
          </Chip>
        )}
      </Surface>

      {/* Table */}
      <Surface style={styles.tableCard} elevation={1}>
        <View style={styles.tableHeader}>
          <Text style={[styles.colHeader, styles.colOrder]}>Order</Text>
          <Text style={[styles.colHeader, styles.colDate]}>Date</Text>
          <Text style={[styles.colHeader, styles.colAmount]}>Amount</Text>
          <Text style={[styles.colHeader, styles.colStatus]}>Status</Text>
          <View style={styles.colChevron} />
        </View>
        <Divider />

        {orders.map((item, index) => {
          const statusInfo = ORDER_STATUSES[item.status as OrderStatus] || { label: item.status, color: colors.text.secondary };
          return (
            <View key={item.id}>
              <TouchableOpacity
                style={styles.tableRow}
                onPress={() => router.push(`/(admin)/order/${item.id}`)}
                activeOpacity={0.7}
              >
                <View style={styles.colOrder}>
                  <Text style={styles.cellPrimary}>{item.order_number}</Text>
                  <Text style={styles.cellSecondary}>{(item.customer as any)?.full_name}</Text>
                </View>
                <Text style={[styles.cell, styles.colDate]}>
                  {new Date(item.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                </Text>
                <Text style={[styles.cell, styles.colAmount, { color: colors.primary[500], fontWeight: '600' }]}>
                  {formatPrice(item.total)}
                </Text>
                <View style={styles.colStatus}>
                  <Text style={[styles.statusLabel, { color: statusInfo.color }]}>
                    {statusInfo.label}
                  </Text>
                </View>
                <View style={styles.colChevron}>
                  <ChevronRight size={16} color={colors.text.disabled} />
                </View>
              </TouchableOpacity>
              {index < orders.length - 1 && <Divider />}
            </View>
          );
        })}

        {orders.length === 0 && (
          <Text style={styles.emptyText}>No orders found</Text>
        )}

        <View style={styles.pagination}>
          <Button mode="text" compact disabled={page === 0} onPress={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Text style={styles.pageInfo}>
            {totalCount === 0
              ? '0 orders'
              : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, totalCount)} of ${totalCount}`}
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
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  searchbar: { flex: 1, borderRadius: borderRadius.md },
  filterBtn: { margin: 0, borderRadius: borderRadius.md, backgroundColor: colors.background },
  filterBtnActive: { backgroundColor: colors.primary[50] },
  activeFilterChip: { alignSelf: 'flex-start', marginTop: spacing.sm },

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
    minHeight: 56,
  },
  cell: { fontSize: 13, color: colors.text.secondary },
  colOrder: { flex: 1.4 },
  colDate: { width: 60, fontSize: 12 },
  colAmount: { width: 80, textAlign: 'right' },
  colStatus: { width: 80, alignItems: 'flex-end' },
  colChevron: { width: 24, alignItems: 'center' },
  cellPrimary: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  cellSecondary: { fontSize: 12, color: colors.text.secondary, marginTop: 1 },
  statusLabel: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },

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
