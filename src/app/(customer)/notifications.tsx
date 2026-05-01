import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Surface, ActivityIndicator, Button } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { Notification } from '@/types';

export default function NotificationsScreen() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Notification[];
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;
  }

  return (
    <View style={styles.container}>
      {unreadCount > 0 && (
        <View style={styles.header}>
          <Text style={styles.unreadText}>{unreadCount} unread</Text>
          <Button mode="text" compact onPress={() => markAllReadMutation.mutate()}>
            Mark all read
          </Button>
        </View>
      )}
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>You're all caught up!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={item.is_read ? 1 : 0.7}
            onPress={() => !item.is_read && markReadMutation.mutate(item.id)}
          >
            <Surface
              style={[styles.notifCard, !item.is_read && styles.unread]}
              elevation={1}
            >
              <View style={styles.notifContent}>
                {!item.is_read && <View style={styles.dot} />}
                <View style={styles.notifText}>
                  <Text style={styles.notifTitle}>{item.title}</Text>
                  {item.body ? <Text style={styles.notifBody}>{item.body}</Text> : null}
                  <Text style={styles.notifDate}>
                    {new Date(item.created_at).toLocaleDateString('en-KE', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            </Surface>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, backgroundColor: colors.surface },
  unreadText: { fontSize: 14, color: colors.text.secondary },
  list: { padding: spacing.md, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: { fontSize: 64, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text.primary },
  emptyText: { fontSize: 14, color: colors.text.secondary, marginTop: spacing.xs },
  notifCard: { borderRadius: borderRadius.lg, backgroundColor: colors.surface, marginBottom: spacing.sm, padding: spacing.md },
  unread: { backgroundColor: colors.primary[50] },
  notifContent: { flexDirection: 'row', alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary[500], marginTop: 6, marginRight: spacing.sm },
  notifText: { flex: 1 },
  notifTitle: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  notifBody: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  notifDate: { fontSize: 11, color: colors.text.disabled, marginTop: spacing.xs },
});
