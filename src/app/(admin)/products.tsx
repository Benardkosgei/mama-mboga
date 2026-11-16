import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import {
  Text, Surface, Chip, ActivityIndicator,
  Button, Divider, Searchbar, Menu, IconButton, TextInput,
} from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { formatPrice } from '@/utils';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { Product } from '@/types';

const PAGE_SIZE = 10;

const FILTER_OPTIONS = [
  { value: 'all', label: 'All Products' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Categories sub-section
// ─────────────────────────────────────────────────────────────────────────────
const CAT_PAGE_SIZE = 10;

function CategoriesSection() {
  const queryClient = useQueryClient();
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [catPage, setCatPage] = useState(0);

  const { data: categories, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*, products:products(id)')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('categories').insert({ name, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewCategory('');
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from('categories').update({ name }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('categories').update({ is_active: active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-categories'] }),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const totalCatPages = Math.ceil((categories?.length ?? 0) / CAT_PAGE_SIZE);
  const paginatedCats = (categories ?? []).slice(catPage * CAT_PAGE_SIZE, catPage * CAT_PAGE_SIZE + CAT_PAGE_SIZE);

  return (
    <Surface style={catStyles.card} elevation={1}>
      {/* Add form */}
      <Text style={catStyles.sectionTitle}>Categories</Text>
      <View style={catStyles.addForm}>
        <TextInput
          mode="outlined"
          label="New category name"
          value={newCategory}
          onChangeText={setNewCategory}
          style={catStyles.input}
          dense
        />
        <Button
          mode="contained"
          onPress={() => newCategory.trim() && addMutation.mutate(newCategory.trim())}
          loading={addMutation.isPending}
          disabled={!newCategory.trim() || addMutation.isPending}
          style={catStyles.addButton}
        >
          Add
        </Button>
      </View>

      {/* Table */}
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.primary[500]} style={{ marginVertical: spacing.md }} />
      ) : (
        <>
          <View style={catStyles.tableHeader}>
            <Text style={[catStyles.colHeader, catStyles.colName]}>Name</Text>
            <Text style={[catStyles.colHeader, catStyles.colProducts]}>Products</Text>
            <Text style={[catStyles.colHeader, catStyles.colStatus]}>Status</Text>
            <View style={catStyles.colAction} />
          </View>
          <Divider />

          {paginatedCats.map((item, index) => (
            <View key={item.id}>
              {editingId === item.id ? (
                <View style={catStyles.editRow}>
                  <TextInput
                    mode="outlined"
                    value={editName}
                    onChangeText={setEditName}
                    style={catStyles.editInput}
                    dense
                    autoFocus
                  />
                  <Button
                    compact
                    mode="contained"
                    onPress={() => updateMutation.mutate({ id: item.id, name: editName })}
                    loading={updateMutation.isPending}
                  >
                    Save
                  </Button>
                  <Button compact onPress={() => setEditingId(null)}>Cancel</Button>
                </View>
              ) : (
                <View style={catStyles.tableRow}>
                  <Text style={[catStyles.cell, catStyles.colName]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[catStyles.cell, catStyles.colProducts]}>{(item as any).products?.length ?? 0}</Text>
                  <View style={catStyles.colStatus}>
                    <View style={[catStyles.statusDot, { backgroundColor: item.is_active ? colors.success : colors.error }]} />
                    <Text style={[catStyles.statusText, { color: item.is_active ? colors.success : colors.error }]}>
                      {item.is_active ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                  <View style={catStyles.colAction}>
                    <Menu
                      visible={menuOpenId === item.id}
                      onDismiss={() => setMenuOpenId(null)}
                      anchor={
                        <IconButton
                          icon="dots-vertical"
                          size={18}
                          onPress={() => setMenuOpenId(item.id)}
                        />
                      }
                    >
                      <Menu.Item
                        leadingIcon="pencil-outline"
                        title="Edit"
                        onPress={() => { setMenuOpenId(null); setEditingId(item.id); setEditName(item.name); }}
                      />
                      <Menu.Item
                        leadingIcon={item.is_active ? 'eye-off-outline' : 'eye-outline'}
                        title={item.is_active ? 'Disable' : 'Enable'}
                        onPress={() => { setMenuOpenId(null); toggleMutation.mutate({ id: item.id, active: !item.is_active }); }}
                      />
                      <Divider />
                      <Menu.Item
                        leadingIcon="trash-can-outline"
                        title="Delete"
                        titleStyle={{ color: colors.error }}
                        onPress={() => {
                          setMenuOpenId(null);
                          Alert.alert(
                            'Delete Category',
                            `Delete "${item.name}"? This cannot be undone.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
                            ],
                          );
                        }}
                      />
                    </Menu>
                  </View>
                </View>
              )}
              {index < paginatedCats.length - 1 && <Divider />}
            </View>
          ))}

          {paginatedCats.length === 0 && (
            <Text style={catStyles.emptyText}>No categories yet</Text>
          )}

          {totalCatPages > 1 && (
            <View style={catStyles.pagination}>
              <Button mode="text" compact disabled={catPage === 0} onPress={() => setCatPage((p) => p - 1)}>
                Previous
              </Button>
              <Text style={catStyles.pageInfo}>Page {catPage + 1} of {totalCatPages}</Text>
              <Button mode="text" compact disabled={catPage >= totalCatPages - 1} onPress={() => setCatPage((p) => p + 1)}>
                Next
              </Button>
            </View>
          )}
        </>
      )}
    </Surface>
  );
}

const catStyles = StyleSheet.create({
  card: { borderRadius: borderRadius.lg, backgroundColor: colors.surface, overflow: 'hidden', padding: spacing.lg },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.md },
  addForm: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end', marginBottom: spacing.md },
  input: { flex: 1, backgroundColor: colors.surface },
  addButton: { marginBottom: spacing.xs },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  colHeader: { fontSize: 11, fontWeight: '700', color: colors.text.secondary, textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, minHeight: 48 },
  cell: { fontSize: 14, color: colors.text.primary },
  colName: { flex: 1 },
  colProducts: { width: 72, textAlign: 'center' },
  colStatus: { width: 80, flexDirection: 'row', alignItems: 'center', gap: 4 },
  colAction: { width: 40, alignItems: 'center' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '500' },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  editInput: { flex: 1, backgroundColor: colors.surface },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  pageInfo: { fontSize: 13, color: colors.text.secondary },
  emptyText: { textAlign: 'center', color: colors.text.secondary, paddingVertical: spacing.lg },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Products screen
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminProducts() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [categoriesExpanded, setCategoriesExpanded] = useState(false);

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
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.seller as any)?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && p.is_available) ||
      (filter === 'inactive' && !p.is_available);
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const handleFilterChange = (v: string) => { setFilter(v); setPage(0); };
  const handleSearch = (v: string) => { setSearch(v); setPage(0); };

  const activeFilterLabel = FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? 'All Products';

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Categories collapsible ─────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.categoriesToggle}
        onPress={() => setCategoriesExpanded((v) => !v)}
        activeOpacity={0.7}
      >
        <Surface style={styles.categoriesToggleSurface} elevation={1}>
          <View style={styles.categoriesToggleInner}>
            <Text style={styles.categoriesToggleLabel}>📂 Manage Categories</Text>
            {categoriesExpanded
              ? <ChevronUp size={18} color={colors.text.secondary} />
              : <ChevronDown size={18} color={colors.text.secondary} />
            }
          </View>
        </Surface>
      </TouchableOpacity>

      {categoriesExpanded && <CategoriesSection />}

      {/* ── Filter card ────────────────────────────────────────────────── */}
      <Surface style={styles.filterCard} elevation={1}>
        <View style={styles.searchRow}>
          <Searchbar
            placeholder="Search by name or seller..."
            value={search}
            onChangeText={handleSearch}
            style={styles.searchbar}
          />
          <Menu
            visible={filterMenuOpen}
            onDismiss={() => setFilterMenuOpen(false)}
            anchor={
              <IconButton
                icon="filter-variant"
                size={22}
                style={[styles.filterBtn, filter !== 'all' && styles.filterBtnActive]}
                iconColor={filter !== 'all' ? colors.primary[500] : colors.text.secondary}
                onPress={() => setFilterMenuOpen(true)}
              />
            }
          >
            {FILTER_OPTIONS.map((opt) => (
              <Menu.Item
                key={opt.value}
                title={opt.label}
                leadingIcon={filter === opt.value ? 'check' : undefined}
                onPress={() => { setFilterMenuOpen(false); handleFilterChange(opt.value); }}
                titleStyle={filter === opt.value ? { color: colors.primary[500], fontWeight: '700' } : undefined}
              />
            ))}
          </Menu>
        </View>
        {filter !== 'all' && (
          <Chip
            onClose={() => handleFilterChange('all')}
            style={styles.activeFilterChip}
            textStyle={{ fontSize: 12 }}
          >
            {activeFilterLabel}
          </Chip>
        )}
      </Surface>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <Surface style={styles.tableCard} elevation={1}>
        <View style={styles.tableHeader}>
          <Text style={[styles.colHeader, styles.colProduct]}>Product</Text>
          <Text style={[styles.colHeader, styles.colPrice]}>Price</Text>
          <Text style={[styles.colHeader, styles.colStock]}>Stock</Text>
          <Text style={[styles.colHeader, styles.colStatusH]}>Status</Text>
          <View style={styles.colActions} />
        </View>
        <Divider />

        {paginated.map((item, index) => (
          <View key={item.id}>
            <View style={styles.tableRow}>
              <View style={styles.colProduct}>
                <Text style={styles.cellPrimary} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cellSecondary} numberOfLines={1}>
                  {(item.seller as any)?.full_name || 'Unknown seller'}
                </Text>
                {(item.category as any)?.name && (
                  <Text style={styles.cellCategory}>{(item.category as any).name}</Text>
                )}
              </View>
              <Text style={[styles.cell, styles.colPrice, { color: colors.primary[500], fontWeight: '600' }]}>
                {formatPrice(item.price)}
              </Text>
              <Text style={[styles.cell, styles.colStock, { color: item.stock_quantity === 0 ? colors.error : colors.text.secondary }]}>
                {item.stock_quantity}
              </Text>
              <View style={styles.colStatusH}>
                <Text style={[styles.statusLabel, { color: item.is_available ? colors.success : colors.error }]}>
                  {item.is_available ? 'Active' : 'Inactive'}
                </Text>
              </View>
              <View style={styles.colActions}>
                <IconButton
                  icon="dots-vertical"
                  size={18}
                  onPress={() =>
                    Alert.alert(
                      item.name,
                      'Choose an action:',
                      [
                        {
                          text: item.is_available ? 'Disable' : 'Enable',
                          onPress: () => toggleMutation.mutate({ id: item.id, available: !item.is_available }),
                        },
                        {
                          text: 'Remove',
                          style: 'destructive',
                          onPress: () =>
                            Alert.alert('Remove Product', `Remove "${item.name}"? This cannot be undone.`, [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Remove', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
                            ]),
                        },
                        { text: 'Cancel', style: 'cancel' },
                      ],
                    )
                  }
                />
              </View>
            </View>
            {index < paginated.length - 1 && <Divider />}
          </View>
        ))}

        {paginated.length === 0 && (
          <Text style={styles.emptyText}>No products found</Text>
        )}

        <View style={styles.pagination}>
          <Button mode="text" compact disabled={page === 0} onPress={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Text style={styles.pageInfo}>
            {filtered.length === 0
              ? '0 products'
              : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </Text>
          <Button mode="text" compact disabled={page >= totalPages - 1} onPress={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </View>
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  categoriesToggle: {},
  categoriesToggleSurface: { borderRadius: borderRadius.lg, backgroundColor: colors.surface },
  categoriesToggleInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  categoriesToggleLabel: { fontSize: 15, fontWeight: '600', color: colors.text.primary },

  filterCard: { padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.surface },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  searchbar: { flex: 1, borderRadius: borderRadius.md },
  filterBtn: { margin: 0, borderRadius: borderRadius.md, backgroundColor: colors.background },
  filterBtnActive: { backgroundColor: colors.primary[50] },
  activeFilterChip: { alignSelf: 'flex-start', marginTop: spacing.sm },

  tableCard: { borderRadius: borderRadius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  colHeader: { fontSize: 11, fontWeight: '700', color: colors.text.secondary, textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 60,
  },
  cell: { fontSize: 13, color: colors.text.secondary },
  colProduct: { flex: 1.4 },
  colPrice: { width: 72, textAlign: 'right' },
  colStock: { width: 48, textAlign: 'center' },
  colStatusH: { width: 60, alignItems: 'flex-end' },
  colActions: { width: 40, alignItems: 'center' },
  cellPrimary: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  cellSecondary: { fontSize: 12, color: colors.text.secondary, marginTop: 1 },
  cellCategory: { fontSize: 11, color: colors.primary[400], marginTop: 1 },
  statusLabel: { fontSize: 11, fontWeight: '600' },

  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pageInfo: { fontSize: 13, color: colors.text.secondary },
  emptyText: { textAlign: 'center', color: colors.text.secondary, padding: spacing.xl },
});
