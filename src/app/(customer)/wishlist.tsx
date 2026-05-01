import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart, Trash2 } from 'lucide-react-native';
import { useWishlistStore } from '@/store/wishlistStore';
import { ProductCard } from '@/components/product/ProductCard';
import { colors, spacing, borderRadius } from '@/constants/theme';

export default function WishlistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, removeItem, clearWishlist } = useWishlistStore();

  const handleClearAll = () => {
    Alert.alert('Clear Wishlist', 'Remove all items from your wishlist?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: clearWishlist },
    ]);
  };

  // Chunk items into rows of 2
  const rows: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
          <Text style={styles.title}>Wishlist</Text>
        </View>
        <View style={styles.empty}>
          <Heart size={56} color={colors.border} />
          <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
          <Text style={styles.emptySubtitle}>Save items you love and find them here anytime.</Text>
          <Button
            mode="contained"
            onPress={() => router.push('/(customer)/home')}
            style={styles.shopButton}
          >
            Start Shopping
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Wishlist ({items.length})</Text>
        <TouchableOpacity onPress={handleClearAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Trash2 size={20} color={colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((item) => (
              <View key={item.id} style={styles.cell}>
                <ProductCard
                  product={item}
                  onPress={() => router.push(`/(customer)/product/${item.id}`)}
                  compact
                />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => removeItem(item.id)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Heart size={16} color={colors.error} fill={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            {/* Fill empty cell if odd number of items */}
            {row.length === 1 && <View style={styles.cell} />}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary, marginTop: spacing.md },
  emptySubtitle: { fontSize: 14, color: colors.text.secondary, textAlign: 'center' },
  shopButton: { marginTop: spacing.lg, borderRadius: borderRadius.md },
  list: { padding: spacing.md, paddingBottom: 100 },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  cell: {
    flex: 1,
    position: 'relative',
  },
  removeBtn: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
});
