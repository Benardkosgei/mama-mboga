import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Button, Surface, Chip, Searchbar, ActivityIndicator } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/utils';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { Product } from '@/types';

export default function AdminProducts() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          seller:profiles!seller_id(id, full_name),
          category:categories(id, name),
          images:product_images(*)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, available }: { id: string; available: boolean }) => {
      const { error } = await supabase.from('products').update({ is_available: available }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-products'] }),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const filtered = (products || []).filter((p) => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && p.is_available) ||
      (filter === 'out_of_stock' && !p.is_available);
    return matchesSearch && matchesFilter;
  });

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;
  }

  return (
    <View style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <Text style={styles.title}>Product Management</Text>
        <Searchbar placeholder="Search products..." value={search} onChangeText={setSearch} style={styles.searchbar} />
        <View style={styles.filters}>
          {['all', 'active', 'out_of_stock'].map((f) => (
            <Chip key={f} selected={filter === f} onPress={() => setFilter(f)}>
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Out of Stock'}
            </Chip>
          ))}
        </View>
      </Surface>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Surface style={styles.productCard} elevation={1}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productSeller}>by {(item.seller as any)?.full_name || 'Unknown'}</Text>
              <View style={styles.productMeta}>
                <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
                <Text style={styles.productStock}>Stock: {item.stock_quantity}</Text>
              </View>
            </View>
            <View style={styles.productActions}>
              <Chip
                style={{ backgroundColor: item.is_available ? colors.success + '20' : colors.error + '20' }}
                textStyle={{ color: item.is_available ? colors.success : colors.error, fontSize: 11 }}
              >
                {item.is_available ? 'Active' : 'Inactive'}
              </Chip>
              <Button
                mode="text"
                compact
                onPress={() => toggleMutation.mutate({ id: item.id, available: !item.is_available })}
              >
                {item.is_available ? 'Disable' : 'Enable'}
              </Button>
              <Button
                mode="text"
                compact
                textColor={colors.error}
                onPress={() =>
                  Alert.alert('Remove Product', 'Are you sure?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
                  ])
                }
              >
                Remove
              </Button>
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
  header: { padding: spacing.lg, backgroundColor: colors.surface },
  title: { fontSize: 20, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.md },
  searchbar: { marginBottom: spacing.md, borderRadius: borderRadius.md },
  filters: { flexDirection: 'row', gap: spacing.sm },
  list: { padding: spacing.md },
  productCard: { padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.surface, marginBottom: spacing.md },
  productInfo: { marginBottom: spacing.md },
  productName: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  productSeller: { fontSize: 14, color: colors.text.secondary },
  productMeta: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  productPrice: { fontSize: 14, fontWeight: '600', color: colors.primary[500] },
  productStock: { fontSize: 14, color: colors.text.secondary },
  productActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
