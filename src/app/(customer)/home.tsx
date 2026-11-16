import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, FlatList, RefreshControl } from 'react-native';
import { Text, Searchbar, Chip, ActivityIndicator, Button } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCategories, useProducts, useFeaturedProducts } from '@/hooks';
import { ProductCard } from '@/components/product/ProductCard';
import { useAuthStore } from '@/store/authStore';
import { colors, spacing } from '@/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuthStore();
  // Accept categoryId from the categories tab navigation
  const params = useLocalSearchParams<{ categoryId?: string; categoryName?: string }>();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    params.categoryId ?? null
  );
  const [searchQuery, setSearchQuery] = useState('');

  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: featuredProducts, isLoading: featuredLoading } = useFeaturedProducts();

  const {
    data: productsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: productsLoading,
    refetch,
  } = useProducts(selectedCategory || undefined, searchQuery || undefined);

  const allProducts = productsData?.pages.flatMap((page) => page) || [];

  // Resolve the display name for the selected category
  const selectedCategoryName = selectedCategory
    ? (categories?.find((c) => c.id === selectedCategory)?.name ?? params.categoryName ?? 'Products')
    : null;

  const handleProductPress = (productId: string) => {
    router.push(`/(customer)/product/${productId}`);
  };

  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(selectedCategory === categoryId ? null : categoryId);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.greeting}>Hello, {profile?.full_name?.split(' ')[0] || 'there'} 👋</Text>
        <Text style={styles.subtitle}>What would you like to order?</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search fresh produce..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={styles.searchInput}
        />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetchingNextPage}
            onRefresh={() => refetch()}
            colors={[colors.primary[500]]}
          />
        }
      >
        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
          >
            {categoriesLoading ? (
              <ActivityIndicator size="small" color={colors.primary[500]} />
            ) : (
              categories?.map((category) => (
                <Chip
                  key={category.id}
                  selected={selectedCategory === category.id}
                  onPress={() => handleCategoryPress(category.id)}
                  style={[
                    styles.categoryChip,
                    selectedCategory === category.id && styles.categoryChipSelected,
                  ]}
                  textStyle={
                    selectedCategory === category.id
                      ? styles.categoryChipTextSelected
                      : styles.categoryChipText
                  }
                  showSelectedCheck={false}
                >
                  {category.name}
                </Chip>
              ))
            )}
          </ScrollView>
        </View>

        {/* Featured Products */}
        {featuredProducts && featuredProducts.length > 0 && !selectedCategory && !searchQuery && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔥 Deals</Text>
            <FlatList
              horizontal
              data={featuredProducts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  onPress={() => handleProductPress(item.id)}
                />
              )}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          </View>
        )}

        {/* All Products */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedCategoryName ?? (searchQuery ? 'Search Results' : 'All Products')}
          </Text>
          {productsLoading && !allProducts.length ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {allProducts.map((product) => (
                <View key={product.id} style={styles.productItem}>
                  <ProductCard
                    product={product}
                    onPress={() => handleProductPress(product.id)}
                    compact
                  />
                </View>
              ))}
            </View>
          )}
        {hasNextPage && (
            <View style={styles.loadMoreContainer}>
              <Button
                mode="outlined"
                onPress={() => fetchNextPage()}
                loading={isFetchingNextPage}
              >
                Load More
              </Button>
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.primary[500],
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
  },
  subtitle: {
    fontSize: 16,
    color: colors.primary[100],
    marginTop: spacing.xs,
  },
  searchContainer: {
    marginHorizontal: spacing.lg,
    marginTop: -20,
    marginBottom: spacing.md,
  },
  searchBar: {
    borderRadius: 12,
    elevation: 4,
    backgroundColor: colors.surface,
  },
  searchInput: {
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  categoriesContainer: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  categoryChip: {
    marginRight: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary[500],
  },
  categoryChipText: {
    color: colors.text.primary,
  },
  categoryChipTextSelected: {
    color: colors.white,
  },
  horizontalList: {
    paddingRight: spacing.lg,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  productItem: {
    width: '48%',
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  loadMoreContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
});
