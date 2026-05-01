import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, Divider, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { colors, spacing, borderRadius } from '@/constants/theme';

export default function AccountManagementScreen() {
  const router = useRouter();
  const { profile, setProfile, logout } = useAuthStore();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
              await supabase.auth.signOut();
              logout();
              router.replace('/(auth)/login');
            } catch (e: any) {
              Alert.alert('Error', e.message);
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
          Save Changes
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
});
