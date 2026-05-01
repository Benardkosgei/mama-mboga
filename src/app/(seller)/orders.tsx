import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { OrderCard } from '@/components/order/OrderCard';
import { colors, spacing } from '@/constants/theme';

export default function SellerOrders() {
  const router = useRouter();
  const { profile } = useAuthStore();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['seller-orders', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select(`
          order:orders!(
            *,
            customer:profiles!customer_id(id, full_name, phone),
            address:addresses(*),
            items:order_items(*)
          )
        `)
        .eq('seller_id', profile?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Get unique orders
      const uniqueOrders = Object.values(
        data?.reduce((acc, item) => {
          acc[item.order.id] = item.order;
          return acc;
        }, {} as Record<string, any>) || {}
      );
      return uniqueOrders;
    },
    enabled: !!profile?.id,
  });

  const handleOrderPress = (orderId: string) => {
    router.push(`/(customer)/order/${orderId}`);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (!orders?.length) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🛒</Text>
        <Text style={styles.emptyTitle}>No Orders Yet</Text>
        <Text style={styles.emptyText}>
          Your orders will appear here when customers buy your products
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => handleOrderPress(item.id)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
});
