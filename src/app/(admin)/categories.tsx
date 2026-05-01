import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Surface, TextInput, ActivityIndicator, Menu, IconButton, Divider } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { colors, spacing, borderRadius } from '@/constants/theme';

const PAGE_SIZE = 10;

export default function AdminCategories() {
  const [newCategory, setNewCategory] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();

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

  const totalPages = Math.ceil((categories?.length ?? 0) / PAGE_SIZE);
  const paginated = (categories ?? []).slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Add form */}
      <Surface style={styles.addCard} elevation={1}>
        <Text style={styles.sectionTitle}>Add New Category</Text>
        <View style={styles.addForm}>
          <TextInput
            mode="outlined"
            label="Category Name"
            value={newCategory}
            onChangeText={setNewCategory}
            style={styles.input}
          />
          <Button
            mode="contained"
            onPress={() => newCategory.trim() && addMutation.mutate(newCategory.trim())}
            loading={addMutation.isPending}
            disabled={!newCategory.trim() || addMutation.isPending}
            style={styles.addButton}
          >
            Add
          </Button>
        </View>
      </Surface>

      {/* Table */}
      <Surface style={styles.tableCard} elevation={1}>
        <View style={styles.tableHeader}>
          <Text style={[styles.colHeader, styles.colName]}>Name</Text>
          <Text style={[styles.colHeader, styles.colProducts]}>Products</Text>
          <Text style={[styles.colHeader, styles.colStatus]}>Status</Text>
          <View style={styles.colAction} />
        </View>
        <Divider />

        {paginated.map((item, index) => (
          <View key={item.id}>
            {editingId === item.id ? (
              <View style={styles.editRow}>
                <TextInput
                  mode="outlined"
                  value={editName}
                  onChangeText={setEditName}
                  style={styles.editInput}
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
              <View style={styles.tableRow}>
                <Text style={[styles.cell, styles.colName]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.cell, styles.colProducts]}>{(item as any).products?.length ?? 0}</Text>
                <View style={styles.colStatus}>
                  <View style={[styles.statusDot, { backgroundColor: item.is_active ? colors.success : colors.error }]} />
                  <Text style={[styles.statusText, { color: item.is_active ? colors.success : colors.error }]}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                <View style={styles.colAction}>
                  <Menu
                    visible={menuOpenId === item.id}
                    onDismiss={() => setMenuOpenId(null)}
                    anchor={
                      <IconButton
                        icon="dots-vertical"
                        size={20}
                        onPress={() => setMenuOpenId(item.id)}
                      />
                    }
                  >
                    <Menu.Item
                      leadingIcon="pencil-outline"
                      onPress={() => {
                        setMenuOpenId(null);
                        setEditingId(item.id);
                        setEditName(item.name);
                      }}
                      title="Edit"
                    />
                    <Menu.Item
                      leadingIcon={item.is_active ? 'eye-off-outline' : 'eye-outline'}
                      onPress={() => {
                        setMenuOpenId(null);
                        toggleMutation.mutate({ id: item.id, active: !item.is_active });
                      }}
                      title={item.is_active ? 'Disable' : 'Enable'}
                    />
                    <Divider />
                    <Menu.Item
                      leadingIcon="trash-can-outline"
                      onPress={() => {
                        setMenuOpenId(null);
                        Alert.alert(
                          'Delete Category',
                          `Delete "${item.name}"? This cannot be undone.`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
                          ]
                        );
                      }}
                      title="Delete"
                      titleStyle={{ color: colors.error }}
                    />
                  </Menu>
                </View>
              </View>
            )}
            {index < paginated.length - 1 && <Divider />}
          </View>
        ))}

        {paginated.length === 0 && (
          <Text style={styles.emptyText}>No categories found</Text>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <View style={styles.pagination}>
            <Button
              mode="text"
              compact
              disabled={page === 0}
              onPress={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Text style={styles.pageInfo}>
              Page {page + 1} of {totalPages}
            </Text>
            <Button
              mode="text"
              compact
              disabled={page >= totalPages - 1}
              onPress={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </View>
        )}
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addCard: { padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.surface },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.md },
  addForm: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: colors.surface },
  addButton: { marginBottom: spacing.xs },
  tableCard: { borderRadius: borderRadius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  colHeader: { fontSize: 12, fontWeight: '700', color: colors.text.secondary, textTransform: 'uppercase' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 52,
  },
  cell: { fontSize: 14, color: colors.text.primary },
  colName: { flex: 1 },
  colProducts: { width: 72, textAlign: 'center' },
  colStatus: { width: 80, flexDirection: 'row', alignItems: 'center', gap: 4 },
  colAction: { width: 44, alignItems: 'center' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '500' },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  editInput: { flex: 1, backgroundColor: colors.surface },
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
