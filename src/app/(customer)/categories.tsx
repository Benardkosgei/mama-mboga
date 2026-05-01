import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCategories } from '@/hooks';
import { colors, spacing, borderRadius } from '@/constants/theme';

const CATEGORY_EMOJIS: Record<string, string> = {
  vegetables: '🥦',
  fruits: '🍎',
  'grains & cereals': '🌾',
  grains: '🌾',
  cereals: '🌾',
  legumes: '🫘',
  'herbs & spices': '🌿',
  herbs: '🌿',
  spices: '🌿',
  'tubers & roots': '🥔',
  tubers: '🥔',
  roots: '🥔',
  'dairy & eggs': '🥚',
  dairy: '🥛',
  eggs: '🥚',
  'cooking oils': '🫙',
  oils: '🫙',
};

function getCategoryEmoji(name: string): string {
  const key = name.toLowerCase();
  return CATEGORY_EMOJIS[key] ?? '🛒';
}

export default function CategoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: categories, isLoading } = useCategories();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.title}>Categories</Text>
      </View>
      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() =>
              router.push({
                pathname: '/(customer)/home',
                params: { categoryId: item.id, categoryName: item.name },
              })
            }
          >
            <Text style={styles.emoji}>{getCategoryEmoji(item.name)}</Text>
            <Text style={styles.cardLabel}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  list: { padding: spacing.md, gap: spacing.md },
  row: { gap: spacing.md },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: { fontSize: 32, marginBottom: spacing.xs },
  cardLabel: { fontSize: 13, fontWeight: '600', color: colors.text.primary, textAlign: 'center', paddingHorizontal: spacing.xs },
});
