import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Surface, Button, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/utils';
import { ORDER_STATUSES } from '@/constants';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { OrderStatus } from '@/types';

export default function AdminDashboard() {
  const router = useRouter();
  const { profile } = useAuthStore();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [usersRes, sellersRes, pendingOrdersRes, revenueRes, pendingSellersRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'seller').eq('is_approved', true),
        supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['paid', 'processing', 'dispatched']),
        supabase.from('orders').select('total').eq('payment_status', 'completed').gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'seller').eq('is_approved', false),
      ]);
      const todayRevenue = (revenueRes.data || []).reduce((sum, o) => sum + (o.total || 0), 0);
      return {
        totalUsers: usersRes.count ?? 0,
        activeSellers: sellersRes.count ?? 0,
        pendingOrders: pendingOrdersRes.count ?? 0,
        todayRevenue,
        pendingSellers: pendingSellersRes.count ?? 0,
      };
    },
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['admin-recent-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number, total, status, customer:profiles!customer_id(full_name)')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
  });

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.totalUsers ?? '—',
      icon: '👥',
      color: colors.primary[500],
      onPress: () => router.push('/(admin)/users'),
    },
    {
      label: 'Active Sellers',
      value: stats?.activeSellers ?? '—',
      icon: '🛒',
      color: colors.secondary[500],
      onPress: () => router.push('/(admin)/users'),
    },
    {
      label: 'Active Orders',
      value: stats?.pendingOrders ?? '—',
      icon: '📦',
      color: colors.warning,
      onPress: () => router.push('/(admin)/orders'),
    },
    {
      label: "Today's Revenue",
      value: stats ? formatPrice(stats.todayRevenue) : '—',
      icon: '💰',
      color: colors.success,
      onPress: () => router.push('/(admin)/payments'),
    },
    {
      label: 'Pending Approvals',
      value: stats?.pendingSellers ?? '—',
      icon: '⏳',
      color: colors.error,
      onPress: () => router.push('/(admin)/users'),
    },
  ];

  const quickActions = [
    { label: 'Manage Users', icon: 'account-group-outline', onPress: () => router.push('/(admin)/users') },
    { label: 'Manage Orders', icon: 'shopping-outline', onPress: () => router.push('/(admin)/orders') },
    { label: 'Categories', icon: 'tag-multiple-outline', onPress: () => router.push('/(admin)/categories') },
    { label: 'Payments', icon: 'credit-card-outline', onPress: () => router.push('/(admin)/payments') },
    { label: 'Riders', icon: 'bike', onPress: () => router.push('/(admin)/riders') },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Surface style={styles.header} elevation={1}>
        <Text style={styles.greeting}>Hello, {profile?.full_name?.split(' ')[0] || 'Admin'}! 👋</Text>
        <Text style={styles.subtitle}>Platform overview and management</Text>
      </Surface>

      {/* Stats Grid */}
      {statsLoading ? (
        <View style={styles.statsLoading}>
          <ActivityIndicator size="small" color={colors.primary[500]} />
        </View>
      ) : (
        <View style={styles.statsGrid}>
          {statCards.map((stat, index) => (
            <TouchableOpacity
              key={index}
              onPress={stat.onPress}
              activeOpacity={0.75}
              style={styles.statCardWrapper}
            >
              <Surface style={[styles.statCard, { borderLeftColor: stat.color }]} elevation={1}>
                <View style={styles.statCardTop}>
                  <Text style={styles.statIcon}>{stat.icon}</Text>
                  <ChevronRight size={14} color={colors.text.disabled} />
                </View>
                <Text style={[styles.statValue, { color: stat.color }]}>{String(stat.value)}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </Surface>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Recent Orders */}
      <Surface style={styles.section} elevation={1}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <Button mode="text" onPress={() => router.push('/(admin)/orders')}>
            View All
          </Button>
        </View>
        {ordersLoading ? (
          <ActivityIndicator size="small" color={colors.primary[500]} />
        ) : recentOrders?.length ? (
          recentOrders.map((order) => {
            const statusInfo = ORDER_STATUSES[order.status as OrderStatus] || { label: order.status, color: colors.text.secondary };
            return (
              <TouchableOpacity
                key={order.id}
                style={styles.orderRow}
                onPress={() => router.push(`/(admin)/order/${order.id}`)}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={styles.orderId}>{order.order_number}</Text>
                  <Text style={styles.orderCustomer}>{(order.customer as any)?.full_name}</Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderAmount}>{formatPrice(order.total)}</Text>
                  <Text style={[styles.orderStatus, { color: statusInfo.color }]}>
                    {statusInfo.label}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.text.disabled} style={styles.orderChevron} />
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No orders yet</Text>
        )}
      </Surface>

      {/* Quick Actions */}
      <Surface style={styles.section} elevation={1}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <Button
              key={index}
              mode="outlined"
              icon={action.icon}
              onPress={action.onPress}
              style={styles.actionButton}
              contentStyle={styles.actionButtonContent}
            >
              {action.label}
            </Button>
          ))}
        </View>
      </Surface>

      {/* Pending Approvals */}
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => router.push('/(admin)/users')}
      >
        <Surface style={styles.section} elevation={1}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending Seller Approvals</Text>
            <View style={styles.sectionHeaderRight}>
              {stats?.pendingSellers ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{stats.pendingSellers}</Text>
                </View>
              ) : null}
              <ChevronRight size={18} color={colors.text.secondary} />
            </View>
          </View>
          <Text style={styles.pendingHint}>
            Review and approve new seller registrations
          </Text>
          <Button mode="contained" onPress={() => router.push('/(admin)/users')}>
            Review Applications
          </Button>
        </Surface>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.xl,
    backgroundColor: colors.primary[500],
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.white,
  },
  subtitle: {
    fontSize: 14,
    color: colors.primary[100],
    marginTop: spacing.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.md,
  },
  statCardWrapper: {
    flex: 1,
    minWidth: 140,
  },
  statCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
  },
  statCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statIcon: {
    fontSize: 24,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  section: {
    margin: spacing.md,
    marginTop: 0,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  badge: {
    backgroundColor: colors.error,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  orderCustomer: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  orderRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  orderAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  orderStatus: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  orderChevron: {
    marginLeft: spacing.sm,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    minWidth: 100,
  },
  actionButtonContent: {
    paddingVertical: spacing.sm,
  },
  pendingHint: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  statsLoading: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
});
