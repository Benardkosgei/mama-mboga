import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, Button, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/utils';
import { colors, spacing, borderRadius } from '@/constants/theme';

export default function SellerDashboard() {
  const router = useRouter();
  const { profile } = useAuthStore();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['seller-stats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const [productsRes, activeOrdersRes, revenueRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('seller_id', profile.id),
        // Count distinct orders that contain this seller's items and are in active statuses
        supabase
          .from('order_items')
          .select('order_id', { count: 'exact', head: true })
          .eq('seller_id', profile.id),
        supabase.from('order_items').select('total').eq('seller_id', profile.id),
      ]);
      const totalRevenue = (revenueRes.data || []).reduce((sum, i) => sum + (i.total || 0), 0);
      return {
        totalProducts: productsRes.count ?? 0,
        activeOrders: activeOrdersRes.count ?? 0,
        totalRevenue,
      };
    },
    enabled: !!profile?.id,
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['seller-recent-orders', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('order_items')
        .select('*, order:orders(id, order_number, status, created_at, customer:profiles!customer_id(full_name))')
        .eq('seller_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const statCards = [
    { label: 'Total Products', value: isLoading ? '—' : String(stats?.totalProducts ?? 0), icon: '📦' },
    { label: 'Active Orders', value: isLoading ? '—' : String(stats?.activeOrders ?? 0), icon: '🛒' },
    { label: 'Total Sales', value: isLoading ? '—' : formatPrice(stats?.totalRevenue ?? 0), icon: '💰' },
  ];

  const quickActions = [
    { label: 'Add Product', icon: 'plus-circle-outline', onPress: () => router.push('/(seller)/add-product') },
    { label: 'Manage Products', icon: 'package-variant', onPress: () => router.push('/(seller)/products') },
    { label: 'View Orders', icon: 'clipboard-list-outline', onPress: () => router.push('/(seller)/orders') },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <Surface style={styles.header} elevation={1}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Hello, {profile?.full_name?.split(' ')[0] || 'Seller'}! 👋</Text>
              <Text style={styles.subtitle}>Welcome to your seller dashboard</Text>
            </View>
          </View>
        </Surface>

        {/* Stats */}
        <View style={styles.statsRow}>
          {statCards.map((stat, index) => (
            <Surface key={index} style={styles.statCard} elevation={1}>
              <Text style={styles.statIcon}>{stat.icon}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Surface>
          ))}
        </View>

        {/* Quick Actions */}
        <Surface style={styles.actionsCard} elevation={1}>
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

        {/* Recent Activity */}
        <Surface style={styles.recentCard} elevation={1}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {ordersLoading ? (
            <ActivityIndicator size="small" color={colors.primary[500]} style={{ marginVertical: spacing.lg }} />
          ) : recentOrders?.length ? (
            recentOrders.map((item: any) => (
              <View key={item.id} style={styles.activityRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityOrder}>{item.order?.order_number}</Text>
                  <Text style={styles.activityCustomer}>{item.order?.customer?.full_name}</Text>
                </View>
                <Text style={styles.activityAmount}>{formatPrice(item.total)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyText}>No recent activity</Text>
              <Text style={styles.emptyHint}>Your recent orders and updates will appear here</Text>
            </View>
          )}
        </Surface>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  header: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[500],
    marginBottom: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    marginHorizontal: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: 10,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  actionsCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
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
  recentCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  emptyHint: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityOrder: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  activityCustomer: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary[500],
  },
});
