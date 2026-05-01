import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Button, ActivityIndicator, Surface, Chip, Menu } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatPrice, getImageUrl } from '@/utils';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { Image } from 'react-native';

export default function SellerProducts() {
  const router = useRouter();
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [menuVisible, setMenuVisible] = useState<string | null>(null);

  const { data: products, isLoading } = useQuery({
    queryKey: ['seller-products', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, category:categories(id, name), images:product_images(*)')
        .eq('seller_id', profile?.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, available }: { id: string; available: boolean }) => {
      const { error } = await supabase.from('products').update({ is_available: available }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seller-products'] }),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seller-products'] }),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;
  }

  if (!products?.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📦</Text>
        <Text style={styles.emptyTitle}>No Products Yet</Text>
        <Text style={styles.emptyText}>Start selling by adding your first product</Text>
        <Button mode="contained" onPress={() => router.push('/(seller)/add-product')} style={styles.addButton}>
          Add Product
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const imageUrl = item.images?.[0]?.image_url;
          const hasDiscount = !!item.discount_price && item.discount_price < item.price;
          return (
            <Surface style={styles.card} elevation={1}>
              <View style={styles.cardRow}>
                {imageUrl ? (
                  <Image source={{ uri: getImageUrl(imageUrl) }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={styles.thumbIcon}>📷</Text>
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.category}>{item.category?.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{formatPrice(hasDiscount ? item.discount_price : item.price)}</Text>
                    {hasDiscount && <Text style={styles.originalPrice}>{formatPrice(item.price)}</Text>}
                  </View>
                  <Text style={styles.stock}>Stock: {item.stock_quantity}</Text>
                </View>
                <Menu
                  visible={menuVisible === item.id}
                  onDismiss={() => setMenuVisible(null)}
                  anchor={
                    <Button
                      mode="text"
                      compact
                      onPress={() => setMenuVisible(item.id)}
                      icon="dots-vertical"
                    >
                      {''}
                    </Button>
                  }
                >
                  <Menu.Item
                    onPress={() => {
                      setMenuVisible(null);
                      router.push(`/(seller)/add-product?id=${item.id}`);
                    }}
                    title="Edit"
                    leadingIcon="pencil-outline"
                  />
                  <Menu.Item
                    onPress={() => {
                      setMenuVisible(null);
                      toggleMutation.mutate({ id: item.id, available: !item.is_available });
                    }}
                    title={item.is_available ? 'Mark Unavailable' : 'Mark Available'}
                    leadingIcon={item.is_available ? 'eye-off' : 'eye'}
                  />
                  <Menu.Item
                    onPress={() => {
                      setMenuVisible(null);
                      Alert.alert('Delete Product', `Delete "${item.name}"? This cannot be undone.`, [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
                      ]);
                    }}
                    title="Delete"
                    leadingIcon="trash-can"
                    titleStyle={{ color: colors.error }}
                  />
                </Menu>
              </View>
              <Chip
                style={[styles.statusChip, { backgroundColor: item.is_available ? colors.success + '20' : colors.error + '20' }]}
                textStyle={{ color: item.is_available ? colors.success : colors.error, fontSize: 11 }}
              >
                {item.is_available ? 'Active' : 'Inactive'}
              </Chip>
            </Surface>
          );
        }}
      />
      <View style={styles.fab}>
        <Button mode="contained" icon="plus" onPress={() => router.push('/(seller)/add-product')} style={styles.fabButton}>
          Add Product
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyIcon: { fontSize: 80, marginBottom: spacing.lg },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.sm },
  emptyText: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', marginBottom: spacing.xl },
  addButton: { paddingHorizontal: spacing.xl },
  list: { padding: spacing.md, paddingBottom: 100 },
  card: { padding: spacing.md, borderRadius: borderRadius.lg, backgroundColor: colors.surface, marginBottom: spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  thumb: { width: 72, height: 72, borderRadius: borderRadius.md, marginRight: spacing.md },
  thumbPlaceholder: { backgroundColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  thumbIcon: { fontSize: 24, opacity: 0.4 },
  info: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  category: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  price: { fontSize: 15, fontWeight: 'bold', color: colors.primary[500] },
  originalPrice: { fontSize: 12, color: colors.text.disabled, textDecorationLine: 'line-through' },
  stock: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  statusChip: { alignSelf: 'flex-start' },
  fab: { position: 'absolute', bottom: spacing.lg, left: spacing.lg, right: spacing.lg },
  fabButton: { borderRadius: borderRadius.md },
});
