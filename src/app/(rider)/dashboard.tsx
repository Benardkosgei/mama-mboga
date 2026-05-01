import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Surface, Button, ActivityIndicator, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/utils';
import { DELIVERY_STATUSES } from '@/constants';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { DeliveryStatus } from '@/types';

export default function RiderDashboard() {
  const router = useRouter();
  const { profile } = useAuthStore();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['rider-stats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const [totalRes, completedRes, pendingRes, earningsRes] = await Promise.all([
        supabase.from('delivery_assignments').select('id', { count: 'exact', head: true }).eq('rider_id', profile.id),
        supabase.from('delivery_assignments').select('id', { count: 'exact', head: true }).eq('rider_id', profile.id).eq('status', 'delivered'),
        supabase.from('delivery_assignments').select('id', { count: 'exact', head: true }).eq('rider_id', profile.id).in('status', ['assigned', 'accepted', 'picked_up', 'on_the_way']),
        supabase.from('delivery_assignments').select('order:orders(delivery_fee)').eq('rider_id', profile.id).eq('status', 'delivered'),
      ]);
      const earnings = (earningsRes.data || []).reduce((sum: number, d: any) => sum + (d.order?.delivery_fee || 0), 0);
      return {
        total: totalRes.count ?? 0,
        completed: completedRes.count ?? 0,
        pending: pendingRes.count ?? 0,
        earnings,
      };
    },
    enabled: !!profile?.id,
  });

  const { data: activeDeliveries, isLoading: deliveriesLoading } = useQuery({
    queryKey: ['rider-active-deliveries', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('delivery_assignments')
        .select(`
          *,
          order:orders(
            id, order_number, total,
            customer:profiles!customer_id(full_name, phone),
            address:addresses(street_address, landmark)
          )
        `)
        .eq('rider_id', profile.id)
        .in('status', ['assigned', 'accepted', 'picked_up', 'on_the_way'])
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const statCards = [
    { label: "Today's Deliveries", value: statsLoading ? '—' : String(stats?.total ?? 0), icon: '📦' },
    { label: 'Completed', value: statsLoading ? '—' : String(stats?.completed ?? 0), icon: '✅' },
    { label: 'Pending', value: statsLoading ? '—' : String(stats?.pending ?? 0), icon: '⏳' },
    { label: 'Earnings', value: statsLoading ? '—' : formatPrice(stats?.earnings ?? 0), icon: '💰' },
  ];

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Text style={styles.greeting}>Hello, {profile?.full_name?.split(' ')[0] || 'Rider'}! 🚴</Text>
        <Text style={styles.subtitle}>Ready for deliveries?</Text>
        <View style={styles.statusBadge}>
          <View style={styles.onlineIndicator} />
          <Text style={styles.statusText}>Online</Text>
        </View>
      </Surface>

      <View style={styles.statsGrid}>
        {statCards.map((stat, index) => (
          <Surface key={index} style={styles.statCard} elevation={1}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </Surface>
        ))}
      </View>

      <Surface style={styles.section} elevation={1}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Deliveries</Text>
          <Button mode="text" onPress={() => router.push('/(rider)/deliveries')}>View All</Button>
        </View>
        {deliveriesLoading ? (
          <ActivityIndicator size="small" color={colors.primary[500]} style={{ marginVertical: spacing.lg }} />
        ) : activeDeliveries?.length ? (
          activeDeliveries.map((delivery: any) => {
            const statusInfo = DELIVERY_STATUSES[delivery.status as DeliveryStatus] || { label: delivery.status, color: colors.text.secondary };
            return (
              <View key={delivery.id} style={styles.deliveryCard}>
                <View style={styles.deliveryInfo}>
                  <Text style={styles.deliveryId}>{delivery.order?.order_number}</Text>
                  <Text style={styles.deliveryCustomer}>{delivery.order?.customer?.full_name}</Text>
                  <Text style={styles.deliveryLocation}>📍 {delivery.order?.address?.street_address}</Text>
                </View>
                <View style={styles.deliveryRight}>
                  <Chip
                    style={{ backgroundColor: statusInfo.color + '20' }}
                    textStyle={{ color: statusInfo.color, fontSize: 10 }}
                  >
                    {statusInfo.label}
                  </Chip>
                  <Button mode="contained" compact onPress={() => router.push(`/(rider)/delivery/${delivery.order_id}`)} style={{ marginTop: spacing.xs }}>
                    View
                  </Button>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyText}>No active deliveries</Text>
            <Text style={styles.emptyHint}>New deliveries will appear here</Text>
          </View>
        )}
      </Surface>

      <Surface style={styles.section} elevation={1}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <Button mode="outlined" onPress={() => router.push('/(rider)/deliveries')} style={styles.actionButton}>
            All Deliveries
          </Button>
          <Button mode="outlined" onPress={() => router.push('/(rider)/earnings')} style={styles.actionButton}>
            My Earnings
          </Button>
        </View>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.xl, backgroundColor: colors.primary[500], borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: colors.white },
  subtitle: { fontSize: 14, color: colors.primary[100], marginTop: spacing.xs },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: spacing.md, paddingVertical: spacing.xs, paddingHorizontal: spacing.md, backgroundColor: colors.white + '20', borderRadius: borderRadius.full },
  onlineIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success, marginRight: spacing.sm },
  statusText: { color: colors.white, fontSize: 12, fontWeight: '500' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.md, gap: spacing.md },
  statCard: { flex: 1, minWidth: 140, padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.surface, alignItems: 'center' },
  statIcon: { fontSize: 24, marginBottom: spacing.sm },
  statValue: { fontSize: 20, fontWeight: 'bold', color: colors.text.primary },
  statLabel: { fontSize: 12, color: colors.text.secondary, marginTop: spacing.xs, textAlign: 'center' },
  section: { margin: spacing.md, marginTop: 0, padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.surface },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary },
  deliveryCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: spacing.md, backgroundColor: colors.background, borderRadius: borderRadius.md, marginBottom: spacing.sm },
  deliveryInfo: { flex: 1 },
  deliveryId: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  deliveryCustomer: { fontSize: 14, color: colors.text.secondary, marginTop: 2 },
  deliveryLocation: { fontSize: 12, color: colors.text.secondary, marginTop: 4 },
  deliveryRight: { alignItems: 'flex-end', gap: spacing.xs },
  emptyState: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  emptyHint: { fontSize: 12, color: colors.text.secondary, marginTop: spacing.xs },
  actionsGrid: { flexDirection: 'row', gap: spacing.sm },
  actionButton: { flex: 1 },
});
