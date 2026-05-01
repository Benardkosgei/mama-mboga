import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Surface, Switch } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { colors, spacing, borderRadius } from '@/constants/theme';

export default function RiderProfile() {
  const router = useRouter();
  const { profile, logout } = useAuthStore();
  const queryClient = useQueryClient();

  // Local optimistic state — defaults true, no DB column yet for is_online
  // When `is_online` column is added: fetch it here and seed useState with the result
  const [isOnline, setIsOnline] = useState(true);

  const onlineStatusMutation = useMutation({
    mutationFn: async (online: boolean) => {
      // Persist to a dedicated `is_online` column when it exists.
      // For now this is intentionally a no-op to avoid corrupting is_approved.
      // Add: ALTER TABLE profiles ADD COLUMN is_online boolean DEFAULT true;
      // then swap the line below to: .update({ is_online: online })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rider-status'] }),
  });

  const handleToggleOnline = (value: boolean) => {
    setIsOnline(value);
    onlineStatusMutation.mutate(value);
  };

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <ScrollView style={styles.container}>
      <Surface style={styles.header} elevation={1}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.full_name?.charAt(0).toUpperCase() || 'R'}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.full_name || 'Rider'}</Text>
        <Text style={styles.phone}>{profile?.phone || ''}</Text>
        <Surface style={styles.riderBadge}>
          <Text style={styles.riderBadgeText}>🚴 Rider Account</Text>
        </Surface>
      </Surface>

      {/* Online Status */}
      <Surface style={styles.section} elevation={1}>
        <View style={styles.statusRow}>
          <View>
            <Text style={styles.sectionTitle}>Online Status</Text>
            <Text style={styles.statusDescription}>
              {isOnline ? 'You are available for deliveries' : 'You are offline'}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={handleToggleOnline}
            color={colors.success}
            disabled={onlineStatusMutation.isPending}
          />
        </View>
      </Surface>

      {/* Menu */}
      <Surface style={styles.section} elevation={1}>
        <View style={styles.menuItem}>
          <Text style={styles.menuIcon}>📋</Text>
          <Text style={styles.menuLabel}>My Deliveries</Text>
        </View>
        <View style={styles.menuItem}>
          <Text style={styles.menuIcon}>📊</Text>
          <Text style={styles.menuLabel}>Earnings History</Text>
        </View>
        <View style={styles.menuItem}>
          <Text style={styles.menuIcon}>⚙️</Text>
          <Text style={styles.menuLabel}>Settings</Text>
        </View>
        <View style={styles.menuItem}>
          <Text style={styles.menuIcon}>❓</Text>
          <Text style={styles.menuLabel}>Help & Support</Text>
        </View>
      </Surface>

      <Button
        mode="outlined"
        onPress={handleLogout}
        style={styles.logoutButton}
        textColor={colors.error}
      >
        Log Out
      </Button>

      <Text style={styles.version}>Mama Mboga Rider v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  phone: {
    fontSize: 14,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  riderBadge: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.full,
  },
  riderBadgeText: {
    fontSize: 12,
    color: colors.primary[600],
    fontWeight: '500',
  },
  section: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statusDescription: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: colors.text.primary,
  },
  logoutButton: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    borderColor: colors.error,
  },
  version: {
    textAlign: 'center',
    color: colors.text.disabled,
    fontSize: 12,
    marginTop: spacing.xl,
    marginBottom: 100,
  },
});
