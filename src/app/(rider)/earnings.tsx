import React from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { Text, Surface, ActivityIndicator } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/utils';
import { colors, spacing, borderRadius } from '@/constants/theme';

export default function RiderEarnings() {
  const { profile } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['rider-earnings', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const { data, error } = await supabase
        .from('delivery_assignments')
        .select(`
          id, status, delivered_at, created_at,
          order:orders(id, order_number, delivery_fee, total)
        `)
        .eq('rider_id', profile.id)
        .eq('status', 'delivered')
        .order('delivered_at', { ascending: false });
      if (error) throw error;

      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const total = (data || []).reduce((sum: number, d: any) => sum + (d.order?.delivery_fee || 0), 0);
      const today = (data || []).filter((d: any) => new Date(d.delivered_at) >= todayStart)
        .reduce((sum: number, d: any) => sum + (d.order?.delivery_fee || 0), 0);
      const week = (data || []).filter((d: any) => new Date(d.delivered_at) >= weekStart)
        .reduce((sum: number, d: any) => sum + (d.order?.delivery_fee || 0), 0);
      const month = (data || []).filter((d: any) => new Date(d.delivered_at) >= monthStart)
        .reduce((sum: number, d: any) => sum + (d.order?.delivery_fee || 0), 0);

      return { total, today, week, month, deliveries: data || [] };
    },
    enabled: !!profile?.id,
  });

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;
  }

  const periods = [
    { label: 'Today', amount: data?.today ?? 0, deliveries: (data?.deliveries || []).filter((d: any) => new Date(d.delivered_at) >= new Date(new Date().setHours(0, 0, 0, 0))).length },
    { label: 'This Week', amount: data?.week ?? 0, deliveries: (data?.deliveries || []).filter((d: any) => { const w = new Date(); w.setDate(w.getDate() - 7); return new Date(d.delivered_at) >= w; }).length },
    { label: 'This Month', amount: data?.month ?? 0, deliveries: (data?.deliveries || []).filter((d: any) => new Date(d.delivered_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).length },
  ];

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.summaryCard} elevation={2}>
        <Text style={styles.summaryTitle}>Total Earnings</Text>
        <Text style={styles.summaryAmount}>{formatPrice(data?.total ?? 0)}</Text>
        <Text style={styles.summarySubtitle}>{data?.deliveries?.length || 0} deliveries completed</Text>
      </Surface>

      <View style={styles.periodGrid}>
        {periods.map((item, index) => (
          <Surface key={index} style={styles.periodCard} elevation={1}>
            <Text style={styles.periodLabel}>{item.label}</Text>
            <Text style={styles.periodAmount}>{formatPrice(item.amount)}</Text>
            <Text style={styles.periodDeliveries}>{item.deliveries} deliveries</Text>
          </Surface>
        ))}
      </View>

      <Surface style={styles.section} elevation={1}>
        <Text style={styles.sectionTitle}>Recent Earnings</Text>
        {data?.deliveries?.length ? (
          data.deliveries.slice(0, 20).map((item: any) => (
            <View key={item.id} style={styles.earningRow}>
              <View>
                <Text style={styles.earningOrder}>{item.order?.order_number}</Text>
                <Text style={styles.earningDate}>
                  {item.delivered_at ? new Date(item.delivered_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                </Text>
              </View>
              <Text style={styles.earningAmount}>{formatPrice(item.order?.delivery_fee || 0)}</Text>
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💰</Text>
            <Text style={styles.emptyText}>No earnings yet</Text>
            <Text style={styles.emptyHint}>Complete deliveries to start earning</Text>
          </View>
        )}
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard: { padding: spacing.xl, backgroundColor: colors.primary[500], borderBottomLeftRadius: 24, borderBottomRightRadius: 24, alignItems: 'center' },
  summaryTitle: { fontSize: 14, color: colors.primary[100] },
  summaryAmount: { fontSize: 36, fontWeight: 'bold', color: colors.white, marginVertical: spacing.sm },
  summarySubtitle: { fontSize: 14, color: colors.primary[100] },
  periodGrid: { flexDirection: 'row', padding: spacing.md, gap: spacing.md },
  periodCard: { flex: 1, padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.surface, alignItems: 'center' },
  periodLabel: { fontSize: 12, color: colors.text.secondary },
  periodAmount: { fontSize: 16, fontWeight: 'bold', color: colors.primary[500], marginVertical: spacing.xs },
  periodDeliveries: { fontSize: 10, color: colors.text.secondary },
  section: { margin: spacing.md, marginTop: 0, padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.surface },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.md },
  earningRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  earningOrder: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  earningDate: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  earningAmount: { fontSize: 16, fontWeight: '600', color: colors.success },
  empty: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: { fontSize: 48, marginBottom: spacing.md },
  emptyText: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  emptyHint: { fontSize: 12, color: colors.text.secondary, marginTop: spacing.xs },
});
