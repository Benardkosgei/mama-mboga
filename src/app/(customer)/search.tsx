import React, { useState } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Searchbar, Text, ActivityIndicator, Chip } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useProducts, useCategories } from '@/hooks';
import { ProductCard } from '@/components/product/ProductCard';
import { colors, spacing } from '@/constants/theme';
import { debounce } from '@/utils';

export default function SearchScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const { data: categories } = useCategories();
  const {
    data: productsData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProducts(undefined, debouncedQuery || undefined);

  const allProducts = productsData?.pages.flatMap((page) => page) || [];

  const debouncedSearch = React.useCallback(
    debounce((query: string) => {
      setDebouncedQuery(query);
    }, 500),
    []
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    debouncedSearch(text);
  };

  const handleProductPress = (productId: string) => {
    router.push(`/(customer)/product/${productId}`);
  };

  const handleCategoryPress = (categoryId: string) => {
    setSearchQuery('');
    setDebouncedQuery('');
    router.push({ pathname: '/(customer)/home', params: { categoryId: categoryId } });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      {debouncedQuery ? (
        <>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptyText}>
            Try searching for something else
          </Text>
        </>
      ) : (
        <>
          <Text style={styles.emptyIcon}>🍎</Text>
          <Text style={styles.emptyTitle}>Search for produce</Text>
          <Text style={styles.emptyText}>
            Browse categories or search by name
          </Text>
          <View style={styles.categoriesSection}>
            <Text style={styles.categoriesTitle}>Popular Categories</Text>
            <View style={styles.categoriesChips}>
              {categories?.slice(0, 6).map((category) => (
                <Chip
                  key={category.id}
                  onPress={() => handleCategoryPress(category.id)}
                  style={styles.categoryChip}
                >
                  {category.name}
                </Chip>
              ))}
            </View>
          </View>
        </>
      )}
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <Searchbar
          placeholder="Search products..."
          onChangeText={handleSearchChange}
          value={searchQuery}
          style={styles.searchBar}
          autoFocus
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : allProducts.length > 0 ? (
        <FlatList
          data={allProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={({ item }) => (
            <View style={styles.productItem}>
              <ProductCard
                product={item}
                onPress={() => handleProductPress(item.id)}
                compact
              />
            </View>
          )}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator size="small" color={colors.primary[500]} />
            ) : null
          }
        />
      ) : (
        renderEmptyState()
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  searchBar: {
    borderRadius: 12,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 100,
  },
  productItem: {
    flex: 1,
    minWidth: 0,
  },
  columnWrapper: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
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
  categoriesSection: {
    marginTop: spacing.xl,
    width: '100%',
  },
  categoriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  categoriesChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  categoryChip: {
    backgroundColor: colors.primary[50],
  },
});
