import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { Text, TextInput, Button, Surface, Divider, Switch } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { useBiometrics } from '@/hooks/useBiometrics';

export default function RiderProfile() {
  const router = useRouter();
  const { profile, setProfile, logout, clearSignOutError } = useAuthStore();
  const queryClient = useQueryClient();

  const biometrics = useBiometrics();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isOnline, setIsOnline] = useState(profile?.is_online ?? true);

  // Cross-platform password prompt for biometric enable
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordModalLoading, setPasswordModalLoading] = useState(false);

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      setPasswordInput('');
      setPasswordModalVisible(true);
    } else {
      Alert.alert(
        `Disable ${biometrics.biometricLabel} Login`,
        'You will need to use your password to sign in.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Disable', style: 'destructive', onPress: () => biometrics.disableBiometrics() },
        ]
      );
    }
  };

  const handleConfirmBiometricEnable = async () => {
    if (!passwordInput) return;
    setPasswordModalLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) { Alert.alert('Error', 'Could not retrieve account email.'); return; }
      const ok = await biometrics.enableBiometrics({ email: user.email, password: passwordInput });
      if (!ok) Alert.alert('Failed', 'Could not enable biometric login. Check your password and try again.');
      else setPasswordModalVisible(false);
    } finally {
      setPasswordModalLoading(false);
      setPasswordInput('');
    }
  };

  // ── Online status toggle ──────────────────────────────────────────────────
  const onlineStatusMutation = useMutation({
    mutationFn: async (online: boolean) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_online: online })
        .eq('id', profile!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rider-status'] }),
    onError: (err: any) => Alert.alert('Error', err.message || 'Could not update status'),
  });

  const handleToggleOnline = (value: boolean) => {
    setIsOnline(value);
    onlineStatusMutation.mutate(value);
  };

  // ── Save name ─────────────────────────────────────────────────────────────
  const handleSaveName = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id)
        .select()
        .single();
      if (error) throw error;
      setProfile(data);
      Alert.alert('Saved', 'Your name has been updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    setSigningOut(true);
    clearSignOutError();
    await logout();
    const { signOutError } = useAuthStore.getState();
    if (signOutError) {
      Alert.alert(
        'Signed out locally',
        `${signOutError}\n\nPlease close and reopen the app if this keeps happening.`,
      );
    }
    router.replace('/(auth)/login');
  };

  // ── Delete account ────────────────────────────────────────────────────────
  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const { error: fnError } = await supabase.functions.invoke('delete-account');
              if (fnError) throw fnError;
              clearSignOutError();
              await logout();
              router.replace('/(auth)/login');
            } catch {
              clearSignOutError();
              await logout();
              Alert.alert(
                'Account Deletion',
                'Your local session has been cleared. If the account was not fully deleted, please contact support.',
              );
              router.replace('/(auth)/login');
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Cross-platform password prompt for enabling biometrics */}
      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalCard} elevation={4}>
            <Text style={styles.modalTitle}>Enable {biometrics.biometricLabel} Login</Text>
            <Text style={styles.modalSubtitle}>Enter your password to enable biometric sign-in.</Text>
            <TextInput
              mode="outlined"
              label="Password"
              value={passwordInput}
              onChangeText={setPasswordInput}
              secureTextEntry
              autoFocus
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => { setPasswordModalVisible(false); setPasswordInput(''); }}
                disabled={passwordModalLoading}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleConfirmBiometricEnable}
                loading={passwordModalLoading}
                disabled={!passwordInput || passwordModalLoading}
                style={{ flex: 1 }}
              >
                Enable
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>

      {/* ── Avatar header ─────────────────────────────────────────────────── */}
      <Surface style={styles.avatarCard} elevation={1}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.full_name?.charAt(0).toUpperCase() || 'R'}
          </Text>
        </View>
        <Text style={styles.avatarName}>{profile?.full_name || 'Rider'}</Text>
        <Text style={styles.avatarPhone}>{profile?.phone || ''}</Text>
        <Surface style={styles.riderBadge} elevation={0}>
          <Text style={styles.riderBadgeText}>🚴 Rider Account</Text>
        </Surface>
      </Surface>

      {/* ── Online status ─────────────────────────────────────────────────── */}
      <Surface style={styles.card} elevation={1}>
        <View style={styles.statusRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Online Status</Text>
            <Text style={styles.statusDescription}>
              {isOnline ? 'You are available for deliveries' : 'You are currently offline'}
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

      {/* ── Profile information ───────────────────────────────────────────── */}
      <Surface style={styles.card} elevation={1}>
        <Text style={styles.cardTitle}>Profile Information</Text>
        <TextInput
          mode="outlined"
          label="Full Name"
          value={fullName}
          onChangeText={setFullName}
          style={styles.input}
          left={<TextInput.Icon icon="account" />}
        />
        <TextInput
          mode="outlined"
          label="Phone Number"
          value={profile?.phone || ''}
          editable={false}
          style={styles.input}
          left={<TextInput.Icon icon="phone" />}
          right={<TextInput.Icon icon="lock" />}
        />
        <Text style={styles.hint}>Phone number cannot be changed. Contact support if needed.</Text>
        <Button
          mode="contained"
          onPress={handleSaveName}
          loading={saving}
          disabled={saving || fullName.trim() === profile?.full_name}
          style={styles.saveButton}
        >
          Save Changes
        </Button>
      </Surface>

      {/* ── Account details ───────────────────────────────────────────────── */}
      <Surface style={styles.card} elevation={1}>
        <Text style={styles.cardTitle}>Account Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Role</Text>
          <Text style={styles.detailValue}>Rider</Text>
        </View>
        <Divider style={styles.divider} />
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Approval Status</Text>
          <Text style={[styles.detailValue, { color: profile?.is_approved ? colors.success : colors.warning }]}>
            {profile?.is_approved ? 'Approved' : 'Pending'}
          </Text>
        </View>
        <Divider style={styles.divider} />
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Member Since</Text>
          <Text style={styles.detailValue}>
            {profile?.created_at
              ? new Date(profile.created_at).toLocaleDateString('en-KE', { month: 'long', year: 'numeric' })
              : '—'}
          </Text>
        </View>
      </Surface>

      {/* ── Security ──────────────────────────────────────────────────────── */}
      {biometrics.isSupported && biometrics.isEnrolled && (
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.cardTitle}>Security</Text>
          <View style={styles.biometricRow}>
            <View style={styles.biometricInfo}>
              <Text style={styles.biometricTitle}>
                {biometrics.biometricLabel === 'Face ID' ? '🪪' : '👆'}{' '}
                {biometrics.biometricLabel} Login
              </Text>
              <Text style={styles.biometricSubtitle}>
                Sign in without typing your password
              </Text>
            </View>
            <Switch
              value={biometrics.isEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: colors.border, true: colors.primary[300] }}
              thumbColor={biometrics.isEnabled ? colors.primary[500] : colors.text.disabled}
            />
          </View>
        </Surface>
      )}

      {/* ── Sign out ──────────────────────────────────────────────────────── */}
      <Surface style={styles.card} elevation={1}>
        <Button
          mode="outlined"
          onPress={handleLogout}
          loading={signingOut}
          disabled={signingOut || deleting}
          textColor={colors.error}
          style={styles.deleteButton}
          icon="logout"
        >
          Sign Out
        </Button>
      </Surface>

      {/* ── Danger zone ───────────────────────────────────────────────────── */}
      <Surface style={[styles.card, styles.dangerCard]} elevation={1}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <Text style={styles.dangerText}>
          Deleting your account is permanent and cannot be undone. All your delivery history and earnings data will be removed.
        </Text>
        <Button
          mode="outlined"
          onPress={handleDeleteAccount}
          loading={deleting}
          disabled={deleting}
          textColor={colors.error}
          style={styles.deleteButton}
        >
          Delete My Account
        </Button>
      </Surface>

      <Text style={styles.version}>Mama Mboga Rider v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },

  // Avatar header
  avatarCard: {
    alignItems: 'center',
    padding: spacing.xl,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
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
  avatarText: { fontSize: 32, fontWeight: 'bold', color: colors.white },
  avatarName: { fontSize: 20, fontWeight: 'bold', color: colors.text.primary },
  avatarPhone: { fontSize: 14, color: colors.text.secondary, marginTop: spacing.xs },
  riderBadge: {
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.full,
  },
  riderBadgeText: { fontSize: 12, color: colors.primary[600], fontWeight: '500' },

  // Shared card
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.md },

  // Online status
  statusRow: { flexDirection: 'row', alignItems: 'center' },
  statusDescription: { fontSize: 12, color: colors.text.secondary, marginTop: 4 },

  // Profile form
  input: { marginBottom: spacing.md, backgroundColor: colors.surface },
  hint: { fontSize: 12, color: colors.text.secondary, marginBottom: spacing.md },
  saveButton: { borderRadius: borderRadius.md },

  // Account details
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  detailLabel: { fontSize: 14, color: colors.text.secondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  divider: { marginVertical: spacing.xs },

  // Danger zone
  dangerCard: { borderWidth: 1, borderColor: colors.error + '40' },
  dangerTitle: { fontSize: 16, fontWeight: 'bold', color: colors.error, marginBottom: spacing.sm },
  dangerText: { fontSize: 13, color: colors.text.secondary, marginBottom: spacing.md, lineHeight: 20 },
  deleteButton: { borderColor: colors.error, borderRadius: borderRadius.md },

  biometricRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  biometricInfo: { flex: 1, marginRight: spacing.md },
  biometricTitle: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  biometricSubtitle: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },

  version: {
    textAlign: 'center',
    color: colors.text.disabled,
    fontSize: 12,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.xs },
  modalSubtitle: { fontSize: 13, color: colors.text.secondary, marginBottom: spacing.md },
  modalInput: { marginBottom: spacing.md, backgroundColor: colors.surface },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
});
