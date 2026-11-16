import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import {
  Text, Surface, Chip, ActivityIndicator,
  Button, Divider, Searchbar, Menu, IconButton,
} from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { Profile, UserRole } from '@/types';

const PAGE_SIZE = 10;

const ROLE_COLORS: Record<string, string> = {
  admin: colors.primary[500],
  seller: colors.secondary[500],
  customer: '#42A5F5',
  rider: '#AB47BC',
};

const ALL_ROLES: UserRole[] = ['customer', 'seller', 'rider', 'admin'];

export default function AdminUsers() {
  const [userType, setUserType] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fix #3: per-row loading via approvingId
  const approveMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean | null }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: approved })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      setApprovingId(null);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e: any) => {
      setApprovingId(null);
      Alert.alert('Error', e.message);
    },
  });

  // Fix #4: role change mutation
  const changeRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: UserRole }) => {
      const { error } = await supabase.from('profiles').update({ role }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const handleApprove = (user: Profile) => {
    setApprovingId(user.id);
    approveMutation.mutate({ id: user.id, approved: true });
  };

  const handleReject = (user: Profile) => {
    Alert.alert('Reject Seller', `Reject ${user.full_name}'s application?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: () => {
          setApprovingId(user.id);
          approveMutation.mutate({ id: user.id, approved: false });
        },
      },
    ]);
  };

  const handleChangeRole = (user: Profile) => {
    Alert.alert(
      'Change Role',
      `Current role: ${user.role}\nSelect new role:`,
      [
        ...ALL_ROLES.filter((r) => r !== user.role).map((r) => ({
          text: r.charAt(0).toUpperCase() + r.slice(1),
          onPress: () => changeRoleMutation.mutate({ id: user.id, role: r }),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  // Fix #7: show pending banner on both 'all' and 'seller' tabs
  const pendingSellers = (users ?? []).filter(
    (u) => u.role === 'seller' && u.is_approved === null
  );
  const showPendingBanner = pendingSellers.length > 0 && (userType === 'all' || userType === 'seller');

  const filtered = (users ?? []).filter((u) => {
    const matchesRole = userType === 'all' || u.role === userType;
    const matchesSearch =
      !search ||
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search);
    return matchesRole && matchesSearch;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const handleRoleChange = (v: string) => { setUserType(v); setPage(0); };
  const handleSearch = (v: string) => { setSearch(v); setPage(0); };

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Fix #7: pending banner visible on 'all' and 'seller' tabs */}
      {showPendingBanner && (
        <Surface style={styles.pendingCard} elevation={1}>
          <View style={styles.pendingHeader}>
            <Text style={styles.pendingTitle}>Pending Seller Approvals</Text>
            <Chip style={styles.warningChip} textStyle={{ color: colors.white, fontSize: 12 }}>
              {pendingSellers.length}
            </Chip>
          </View>
          {pendingSellers.map((user) => (
            <View key={user.id} style={styles.pendingRow}>
              <View style={styles.pendingInfo}>
                <Text style={styles.pendingName}>{user.full_name}</Text>
                <Text style={styles.pendingPhone}>{user.phone}</Text>
                {/* Fix #5: show join date */}
                <Text style={styles.pendingDate}>
                  Joined {new Date(user.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <View style={styles.pendingActions}>
                <Button
                  mode="contained"
                  compact
                  onPress={() => handleApprove(user)}
                  // Fix #3: per-row loading
                  loading={approvingId === user.id && approveMutation.isPending}
                  disabled={approveMutation.isPending}
                >
                  Approve
                </Button>
                <Button
                  mode="outlined"
                  compact
                  textColor={colors.error}
                  onPress={() => handleReject(user)}
                  disabled={approveMutation.isPending}
                >
                  Reject
                </Button>
              </View>
            </View>
          ))}
        </Surface>
      )}

      {/* Filters */}
      <Surface style={styles.filterCard} elevation={1}>
        <View style={styles.searchRow}>
          <Searchbar
            placeholder="Search by name or phone..."
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
                style={[styles.filterBtn, userType !== 'all' && styles.filterBtnActive]}
                iconColor={userType !== 'all' ? colors.primary[500] : colors.text.secondary}
                onPress={() => setFilterMenuOpen(true)}
              />
            }
          >
            {[
              { value: 'all', label: 'All Roles' },
              { value: 'customer', label: 'Customers' },
              { value: 'seller', label: 'Sellers' },
              { value: 'rider', label: 'Riders' },
            ].map((opt) => (
              <Menu.Item
                key={opt.value}
                title={opt.label}
                leadingIcon={userType === opt.value ? 'check' : undefined}
                onPress={() => { setFilterMenuOpen(false); handleRoleChange(opt.value); }}
                titleStyle={userType === opt.value ? { color: colors.primary[500], fontWeight: '700' } : undefined}
              />
            ))}
          </Menu>
        </View>
      </Surface>

      {/* Table */}
      <Surface style={styles.tableCard} elevation={1}>
        <View style={styles.tableHeader}>
          <Text style={[styles.colHeader, styles.colName]}>Name</Text>
          <Text style={[styles.colHeader, styles.colDate]}>Joined</Text>
          <Text style={[styles.colHeader, styles.colRole]}>Role</Text>
          <Text style={[styles.colHeader, styles.colStatus]}>Status</Text>
          <View style={styles.colAction} />
        </View>
        <Divider />

        {paginated.map((item, index) => (
          <View key={item.id}>
            <View style={styles.tableRow}>
              <View style={styles.colName}>
                <Text style={styles.cellName} numberOfLines={1}>{item.full_name}</Text>
                <Text style={styles.cellPhone} numberOfLines={1}>{item.phone}</Text>
              </View>
              {/* Fix #5: joined date */}
              <Text style={[styles.cell, styles.colDate]}>
                {new Date(item.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
              </Text>
              <View style={styles.colRole}>
                <View style={[styles.rolePill, { backgroundColor: (ROLE_COLORS[item.role] ?? colors.text.secondary) + '20' }]}>
                  <Text style={[styles.roleText, { color: ROLE_COLORS[item.role] ?? colors.text.secondary }]}>
                    {item.role}
                  </Text>
                </View>
              </View>
              <View style={styles.colStatus}>
                {item.role === 'seller' ? (
                  item.is_approved === null ? (
                    <Text style={[styles.statusLabel, { color: colors.warning }]}>Pending</Text>
                  ) : item.is_approved ? (
                    <Text style={[styles.statusLabel, { color: colors.success }]}>Approved</Text>
                  ) : (
                    <Text style={[styles.statusLabel, { color: colors.error }]}>Rejected</Text>
                  )
                ) : (
                  <Text style={[styles.statusLabel, { color: colors.text.secondary }]}>—</Text>
                )}
              </View>
              {/* Fix #4: per-row action menu */}
              <View style={styles.colAction}>
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
                    leadingIcon="account-convert-outline"
                    title="Change Role"
                    onPress={() => { setMenuOpenId(null); handleChangeRole(item); }}
                  />
                  {item.role === 'seller' && item.is_approved === null && (
                    <>
                      <Divider />
                      <Menu.Item
                        leadingIcon="check-circle-outline"
                        title="Approve"
                        onPress={() => { setMenuOpenId(null); handleApprove(item); }}
                      />
                      <Menu.Item
                        leadingIcon="close-circle-outline"
                        title="Reject"
                        titleStyle={{ color: colors.error }}
                        onPress={() => { setMenuOpenId(null); handleReject(item); }}
                      />
                    </>
                  )}
                  {item.role === 'seller' && item.is_approved === false && (
                    <>
                      <Divider />
                      <Menu.Item
                        leadingIcon="check-circle-outline"
                        title="Re-approve"
                        onPress={() => { setMenuOpenId(null); handleApprove(item); }}
                      />
                    </>
                  )}
                </Menu>
              </View>
            </View>
            {index < paginated.length - 1 && <Divider />}
          </View>
        ))}

        {paginated.length === 0 && (
          <Text style={styles.emptyText}>No users found</Text>
        )}

        {/* Fix #6: pagination with count always visible */}
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
            {filtered.length === 0
              ? '0 users'
              : `${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
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
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  pendingCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.warning + '10',
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  pendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  pendingTitle: { fontSize: 15, fontWeight: 'bold', color: colors.text.primary },
  warningChip: { backgroundColor: colors.warning },
  pendingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pendingInfo: { flex: 1 },
  pendingName: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  pendingPhone: { fontSize: 13, color: colors.text.secondary },
  pendingDate: { fontSize: 11, color: colors.text.secondary, marginTop: 2 },
  pendingActions: { flexDirection: 'row', gap: spacing.sm },

  filterCard: { padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.surface },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  searchbar: { flex: 1, borderRadius: borderRadius.md },
  filterBtn: { margin: 0, borderRadius: borderRadius.md, backgroundColor: colors.background },
  filterBtnActive: { backgroundColor: colors.primary[50] },

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
    minHeight: 56,
  },
  cell: { fontSize: 13, color: colors.text.secondary },
  colName: { flex: 1.2 },
  cellName: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  cellPhone: { fontSize: 12, color: colors.text.secondary, marginTop: 1 },
  colDate: { width: 64, fontSize: 12 },
  colRole: { width: 76, alignItems: 'flex-start' },
  colStatus: { width: 68, alignItems: 'flex-end' },
  colAction: { width: 40, alignItems: 'center' },
  rolePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: borderRadius.full },
  roleText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
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
