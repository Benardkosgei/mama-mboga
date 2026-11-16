import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Surface, Button, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/utils';
import { colors, spacing, borderRadius } from '@/constants/theme';

export default function SellerDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['seller-stats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const [productsRes, activeOrdersRes, revenueRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('seller_id', profile.id),
        supabase
          .from('order_items')
          .select('order_id, order:orders!inner(status)', { count: 'exact', head: true })
          .eq('seller_id', profile.id)
          .in('order.status', ['paid', 'processing', 'dispatched', 'out_for_delivery']),
        supabase
          .from('order_items')
          .select('total, order:orders!inner(payment_status)')
          .eq('seller_id', profile.id)
          .eq('order.payment_status', 'completed'),
      ]);
      const totalRevenue = (revenueRes.data || []).reduce((sum: number, i: any) => sum + (i.total || 0), 0);
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
    {
      label: 'Total Products',
      value: isLoading ? '—' : String(stats?.totalProducts ?? 0),
      icon: '📦',
      color: colors.primary[500],
      onPress: () => router.push('/(seller)/products'),
    },
    {
      label: 'Active Orders',
      value: isLoading ? '—' : String(stats?.activeOrders ?? 0),
      icon: '🛒',
      color: colors.warning,
      onPress: () => router.push('/(seller)/orders'),
    },
    {
      label: 'Total Sales',
      value: isLoading ? '—' : formatPrice(stats?.totalRevenue ?? 0),
      icon: '💰',
      color: colors.success,
      onPress: () => router.push('/(seller)/orders'),
    },
  ];

  const quickActions = [
    { label: 'Add Product', icon: 'plus-circle-outline', onPress: () => router.push('/(seller)/add-product') },
    { label: 'My Products', icon: 'package-variant', onPress: () => router.push('/(seller)/products') },
    { label: 'View Orders', icon: 'clipboard-list-outline', onPress: () => router.push('/(seller)/orders') },
  ];

  return (
    <View style={styles.container}>

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <Surface style={[styles.header, { paddingTop: insets.top + spacing.md }]} elevation={2}>
        <Text style={styles.greeting}>Hello, {profile?.full_name?.split(' ')[0] || 'Seller'}! 👋</Text>
        <Text style={styles.subtitle}>Welcome to your seller dashboard</Text>
      </Surface>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* ── Stat cards ──────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          {statCards.map((stat, index) => (
            <TouchableOpacity
              key={index}
              style={styles.statCardWrapper}
              onPress={stat.onPress}
              activeOpacity={0.75}
            >
              <Surface style={[styles.statCard, { borderTopColor: stat.color }]} elevation={1}>
                <View style={styles.statCardTop}>
                  <Text style={styles.statIcon}>{stat.icon}</Text>
                  <ChevronRight size={14} color={colors.text.disabled} />
                </View>
                <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </Surface>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Quick actions ────────────────────────────────────────────────── */}
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

        {/* ── Recent activity ──────────────────────────────────────────────── */}
        <Surface style={styles.recentCard} elevation={1}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Button mode="text" compact onPress={() => router.push('/(seller)/orders')}>
              View All
            </Button>
          </View>
          {ordersLoading ? (
            <ActivityIndicator size="small" color={colors.primary[500]} style={{ marginVertical: spacing.lg }} />
          ) : recentOrders?.length ? (
            recentOrders.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                style={styles.activityRow}
                onPress={() => router.push('/(seller)/orders')}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityOrder}>{item.order?.order_number}</Text>
                  <Text style={styles.activityCustomer}>{item.order?.customer?.full_name}</Text>
                </View>
                <Text style={styles.activityAmount}>{formatPrice(item.total)}</Text>
                <ChevronRight size={16} color={colors.text.disabled} style={{ marginLeft: spacing.sm }} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyText}>No recent activity</Text>
              <Text style={styles.emptyHint}>Your recent orders will appear here</Text>
            </View>
          )}
        </Surface>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Sticky header
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    backgroundColor: colors.primary[500],
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    zIndex: 10,
  },
  greeting: { fontSize: 24, fontWeight: 'bold', color: colors.white },
  subtitle: { fontSize: 14, color: colors.primary[100], marginTop: spacing.xs },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 100 },

  // Stat cards
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  statCardWrapper: { flex: 1 },
  statCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 3,
  },
  statCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  statLabel: { fontSize: 10, color: colors.text.secondary, marginTop: spacing.xs },

  // Quick actions
  actionsCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.md },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  actionButton: { flex: 1, minWidth: 100 },
  actionButtonContent: { paddingVertical: spacing.sm },

  // Recent activity
  recentCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  activityOrder: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  activityCustomer: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  activityAmount: { fontSize: 14, fontWeight: '600', color: colors.primary[500] },

  emptyState: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md, opacity: 0.5 },
  emptyText: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  emptyHint: { fontSize: 12, color: colors.text.secondary, marginTop: spacing.xs, textAlign: 'center' },
});
