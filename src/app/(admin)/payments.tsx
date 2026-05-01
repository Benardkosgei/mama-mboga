import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, Surface, ActivityIndicator, Chip } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/utils';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { Payment } from '@/types';

export default function AdminPayments() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, order:orders(order_number, total)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as (Payment & { order: { order_number: string; total: number } })[];
    },
  });

  const completed = payments?.filter((p) => p.status === 'completed') || [];
  const allTimeTotal = completed.reduce((sum, p) => sum + p.amount, 0);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTotal = completed
    .filter((p) => new Date(p.created_at) >= todayStart)
    .reduce((sum, p) => sum + p.amount, 0);

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Text style={styles.title}>Payment Overview</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatPrice(todayTotal)}</Text>
            <Text style={styles.statLabel}>Today's Revenue</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatPrice(allTimeTotal)}</Text>
            <Text style={styles.statLabel}>All-Time Revenue</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{completed.length}</Text>
            <Text style={styles.statLabel}>Transactions</Text>
          </View>
        </View>
      </Surface>

      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Surface style={styles.paymentRow} elevation={1}>
            <View>
              <Text style={styles.orderNumber}>{item.order?.order_number || item.order_id.slice(0, 8)}</Text>
              <Text style={styles.paymentDate}>{new Date(item.created_at).toLocaleDateString('en-KE')}</Text>
              {item.mpesa_receipt && <Text style={styles.receipt}>Ref: {item.mpesa_receipt}</Text>}
            </View>
            <View style={styles.paymentRight}>
              <Text style={styles.paymentAmount}>{formatPrice(item.amount)}</Text>
              <Chip
                style={{ backgroundColor: item.status === 'completed' ? colors.success + '20' : colors.warning + '20' }}
                textStyle={{ color: item.status === 'completed' ? colors.success : colors.warning, fontSize: 11 }}
              >
                {item.status}
              </Chip>
            </View>
          </Surface>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: spacing.lg, backgroundColor: colors.surface, marginBottom: spacing.md },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.lg },
  statsRow: { flexDirection: 'row', gap: spacing.lg },
  statItem: { flex: 1, padding: spacing.md, backgroundColor: colors.primary[50], borderRadius: borderRadius.md, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: colors.primary[600] },
  statLabel: { fontSize: 12, color: colors.text.secondary, marginTop: spacing.xs },
  list: { padding: spacing.md },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.surface, marginBottom: spacing.sm },
  orderNumber: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  paymentDate: { fontSize: 12, color: colors.text.secondary },
  receipt: { fontSize: 10, color: colors.text.secondary },
  paymentRight: { alignItems: 'flex-end', gap: spacing.xs },
  paymentAmount: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
});
