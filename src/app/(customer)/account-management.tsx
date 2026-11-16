import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Switch, Modal, Platform } from 'react-native';
import { Text, TextInput, Button, Surface, Divider, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { useBiometrics } from '@/hooks/useBiometrics';

export default function AccountManagementScreen() {
  const router = useRouter();
  const { profile, setProfile, logout, clearSignOutError } = useAuthStore();

  const biometrics = useBiometrics();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [saving, setSaving] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
          {
            text: 'Disable',
            style: 'destructive',
            onPress: () => biometrics.disableBiometrics(),
          },
        ]
      );
    }
  };

  const handleConfirmBiometricEnable = async () => {
    if (!passwordInput) return;
    setPasswordModalLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        Alert.alert('Error', 'Could not retrieve account email.');
        return;
      }
      const ok = await biometrics.enableBiometrics({ email: user.email, password: passwordInput });
      if (!ok) {
        Alert.alert('Failed', 'Could not enable biometric login. Check your password and try again.');
      } else {
        setPasswordModalVisible(false);
      }
    } finally {
      setPasswordModalLoading(false);
      setPasswordInput('');
    }
  };

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

  const handleSaveEmail = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    setSavingEmail(true);
    try {
      // Update Supabase Auth email (sends confirmation to new address)
      const { error: authError } = await supabase.auth.updateUser({ email: trimmed });
      if (authError) throw authError;
      // Also update the profiles table
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error: profileError } = await supabase
          .from('profiles')
          .update({ email: trimmed })
          .eq('id', user.id)
          .select()
          .single();
        if (profileError) throw profileError;
        setProfile(data);
      }
      Alert.alert(
        'Check your inbox',
        `A confirmation link has been sent to ${trimmed}. Your email will update once confirmed.`
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingEmail(false);
    }
  };

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
              // Call the delete-account edge function which uses the service role
              // to delete the auth user (and cascade to profile via DB trigger).
              const { error: fnError } = await supabase.functions.invoke('delete-account');
              if (fnError) throw fnError;

              clearSignOutError();
              await logout();
              router.replace('/(auth)/login');
            } catch (e: any) {
              // Even if the server call fails, sign out locally
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
      ]
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
      {/* Profile Info */}
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
          Save Name
        </Button>
      </Surface>

      {/* Email */}
      <Surface style={styles.card} elevation={1}>
        <Text style={styles.cardTitle}>Email Address</Text>
        <TextInput
          mode="outlined"
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          left={<TextInput.Icon icon="email-outline" />}
        />
        <Text style={styles.hint}>
          A confirmation link will be sent to the new address. Your email updates once confirmed.
        </Text>
        <Button
          mode="contained"
          onPress={handleSaveEmail}
          loading={savingEmail}
          disabled={savingEmail || email.trim().toLowerCase() === (profile?.email ?? '')}
          style={styles.saveButton}
        >
          Update Email
        </Button>
      </Surface>

      {/* Account Details */}
      <Surface style={styles.card} elevation={1}>
        <Text style={styles.cardTitle}>Account Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Role</Text>
          <Text style={styles.detailValue}>{profile?.role ? profile.role.charAt(0).toUpperCase() + profile.role.slice(1) : '—'}</Text>
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

      {/* Security */}
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
              accessibilityLabel={`${biometrics.biometricLabel} login`}
              accessibilityRole="switch"
            />
          </View>
        </Surface>
      )}

      {/* Danger Zone */}
      <Surface style={[styles.card, styles.dangerCard]} elevation={1}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <Text style={styles.dangerText}>
          Deleting your account is permanent and cannot be undone. All your orders, addresses, and data will be removed.
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.md },
  input: { marginBottom: spacing.md, backgroundColor: colors.surface },
  hint: { fontSize: 12, color: colors.text.secondary, marginBottom: spacing.md },
  saveButton: { borderRadius: borderRadius.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  detailLabel: { fontSize: 14, color: colors.text.secondary },
  detailValue: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  divider: { marginVertical: spacing.xs },
  dangerCard: { borderWidth: 1, borderColor: colors.error + '40' },
  dangerTitle: { fontSize: 16, fontWeight: 'bold', color: colors.error, marginBottom: spacing.sm },
  dangerText: { fontSize: 13, color: colors.text.secondary, marginBottom: spacing.md, lineHeight: 20 },
  deleteButton: { borderColor: colors.error, borderRadius: borderRadius.md },
  biometricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  biometricInfo: { flex: 1, marginRight: spacing.md },
  biometricTitle: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  biometricSubtitle: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
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
