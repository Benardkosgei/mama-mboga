import React, { useState, useMemo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Surface, ActivityIndicator, Chip, Searchbar, Menu, IconButton, Button } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/utils';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { Payment } from '@/types';

type DateFilter = 'today' | 'week' | 'month' | 'all';

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
];

const PAGE_SIZE = 20;

export default function AdminPayments() {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'failed' | 'pending'>('all');
  const [dateMenuOpen, setDateMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [page, setPage] = useState(0);

  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, order:orders(order_number, total, customer:profiles!customer_id(full_name, phone))')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as (Payment & { order: { order_number: string; total: number; customer: { full_name: string; phone: string } } })[];
    },
  });

  const filtered = useMemo(() => {
    if (!payments) return [];
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return payments.filter((p) => {
      // Date filter
      if (dateFilter !== 'all') {
        const created = new Date(p.created_at);
        if (dateFilter === 'today' && created < todayStart) return false;
        if (dateFilter === 'week' && created < weekStart) return false;
        if (dateFilter === 'month' && created < monthStart) return false;
      }
      // Status filter
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      // Search
      if (search) {
        const q = search.toLowerCase();
        const orderNum = (p.order as any)?.order_number?.toLowerCase() ?? '';
        const receipt = (p.mpesa_receipt ?? '').toLowerCase();
        const phone = (p.phone ?? '').toLowerCase();
        const name = (p.order as any)?.customer?.full_name?.toLowerCase() ?? '';
        if (!orderNum.includes(q) && !receipt.includes(q) && !phone.includes(q) && !name.includes(q)) return false;
      }
      return true;
    });
  }, [payments, dateFilter, statusFilter, search]);

  const completed = filtered.filter((p) => p.status === 'completed');
  const totalRevenue = completed.reduce((sum, p) => sum + p.amount, 0);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleSearch = (v: string) => { setSearch(v); setPage(0); };
  const handleDateFilter = (v: DateFilter) => { setDateFilter(v); setPage(0); };
  const handleStatusFilter = (v: typeof statusFilter) => { setStatusFilter(v); setPage(0); };

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Stats header */}
      <Surface style={styles.header} elevation={1}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatPrice(totalRevenue)}</Text>
            <Text style={styles.statLabel}>
              {DATE_OPTIONS.find((d) => d.value === dateFilter)?.label ?? 'All Time'} Revenue
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completed.length}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{filtered.filter((p) => p.status === 'pending').length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
        </View>
      </Surface>

      {/* Filters */}
      <Surface style={styles.filterCard} elevation={1}>
        <Searchbar
          placeholder="Search order, receipt, phone, name..."
          value={search}
          onChangeText={handleSearch}
          style={styles.searchbar}
        />
        <View style={styles.filterRow}>
          {/* Date filter */}
          <Menu
            visible={dateMenuOpen}
            onDismiss={() => setDateMenuOpen(false)}
            anchor={
              <TouchableOpacity
                style={[styles.filterChip, dateFilter !== 'all' && styles.filterChipActive]}
                onPress={() => setDateMenuOpen(true)}
              >
                <Text style={[styles.filterChipText, dateFilter !== 'all' && styles.filterChipTextActive]}>
                  📅 {DATE_OPTIONS.find((d) => d.value === dateFilter)?.label}
                </Text>
              </TouchableOpacity>
            }
          >
            {DATE_OPTIONS.map((opt) => (
              <Menu.Item
                key={opt.value}
                title={opt.label}
                leadingIcon={dateFilter === opt.value ? 'check' : undefined}
                onPress={() => { setDateMenuOpen(false); handleDateFilter(opt.value); }}
                titleStyle={dateFilter === opt.value ? { color: colors.primary[500], fontWeight: '700' } : undefined}
              />
            ))}
          </Menu>

          {/* Status filter */}
          <Menu
            visible={statusMenuOpen}
            onDismiss={() => setStatusMenuOpen(false)}
            anchor={
              <TouchableOpacity
                style={[styles.filterChip, statusFilter !== 'all' && styles.filterChipActive]}
                onPress={() => setStatusMenuOpen(true)}
              >
                <Text style={[styles.filterChipText, statusFilter !== 'all' && styles.filterChipTextActive]}>
                  {statusFilter === 'all' ? 'All Status' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                </Text>
              </TouchableOpacity>
            }
          >
            {(['all', 'completed', 'pending', 'failed'] as const).map((s) => (
              <Menu.Item
                key={s}
                title={s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
                leadingIcon={statusFilter === s ? 'check' : undefined}
                onPress={() => { setStatusMenuOpen(false); handleStatusFilter(s); }}
                titleStyle={statusFilter === s ? { color: colors.primary[500], fontWeight: '700' } : undefined}
              />
            ))}
          </Menu>
        </View>
      </Surface>

      {/* List */}
      <FlatList
        data={paginated}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No payments found</Text>
          </View>
        }
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.pagination}>
              <Button mode="text" compact disabled={page === 0} onPress={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Text style={styles.pageInfo}>
                {filtered.length === 0
                  ? '0 payments'
                  : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
              </Text>
              <Button mode="text" compact disabled={page >= totalPages - 1} onPress={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const statusColor =
            item.status === 'completed' ? colors.success :
            item.status === 'failed' ? colors.error : colors.warning;
          return (
            <Surface style={styles.paymentRow} elevation={1}>
              <View style={styles.paymentLeft}>
                <Text style={styles.orderNumber}>{(item.order as any)?.order_number ?? item.order_id.slice(0, 8)}</Text>
                {(item.order as any)?.customer?.full_name && (
                  <Text style={styles.customerName}>{(item.order as any).customer.full_name}</Text>
                )}
                <Text style={styles.paymentDate}>
                  {new Date(item.created_at).toLocaleDateString('en-KE', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </Text>
                {item.mpesa_receipt && (
                  <Text style={styles.receipt}>Ref: {item.mpesa_receipt}</Text>
                )}
                <Text style={styles.phone}>{item.phone}</Text>
              </View>
              <View style={styles.paymentRight}>
                <Text style={styles.paymentAmount}>{formatPrice(item.amount)}</Text>
                <Chip
                  style={{ backgroundColor: statusColor + '20' }}
                  textStyle={{ color: statusColor, fontSize: 11 }}
                >
                  {item.status}
                </Chip>
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
  header: { padding: spacing.lg, backgroundColor: colors.surface, marginBottom: spacing.sm },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statItem: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  statValue: { fontSize: 18, fontWeight: 'bold', color: colors.primary[600] },
  statLabel: { fontSize: 11, color: colors.text.secondary, marginTop: spacing.xs, textAlign: 'center' },
  filterCard: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  searchbar: { borderRadius: borderRadius.md },
  filterRow: { flexDirection: 'row', gap: spacing.sm },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  filterChipText: { fontSize: 13, color: colors.text.secondary },
  filterChipTextActive: { color: colors.primary[500], fontWeight: '600' },
  list: { padding: spacing.md, paddingBottom: 100 },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  paymentLeft: { flex: 1 },
  orderNumber: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  customerName: { fontSize: 13, color: colors.text.secondary, marginTop: 1 },
  paymentDate: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  receipt: { fontSize: 11, color: colors.text.secondary, marginTop: 1 },
  phone: { fontSize: 11, color: colors.text.secondary, marginTop: 1 },
  paymentRight: { alignItems: 'flex-end', gap: spacing.xs },
  paymentAmount: { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  pageInfo: { fontSize: 13, color: colors.text.secondary },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyText: { fontSize: 14, color: colors.text.secondary },
});
