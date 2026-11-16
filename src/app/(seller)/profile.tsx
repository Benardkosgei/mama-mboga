import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  Linking, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { Text, Divider, TextInput, Button, Surface, Switch } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ShoppingBag, Package, ChevronRight,
  HelpCircle, MessageCircle, Phone, LogOut,
  User, Settings, PlusCircle,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { useAppSettings } from '@/hooks';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { useBiometrics } from '@/hooks/useBiometrics';

type MenuItem = {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
};

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function MenuRow({ icon, label, sublabel, onPress }: MenuItem) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.menuIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.menuLabel}>{label}</Text>
        {sublabel && <Text style={styles.menuSublabel}>{sublabel}</Text>}
      </View>
      <ChevronRight size={18} color={colors.text.secondary} />
    </TouchableOpacity>
  );
}

export default function SellerProfile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, setProfile, logout, clearSignOutError } = useAuthStore();
  const { data: appSettings } = useAppSettings();

  const SUPPORT_PHONE = appSettings?.support_phone ?? '+254754008271';
  const SUPPORT_WHATSAPP = appSettings?.support_whatsapp ?? '254754008271';

  const biometrics = useBiometrics();

  const [signingOut, setSigningOut] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [saving, setSaving] = useState(false);

  // Cross-platform password prompt for biometric enable
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordModalLoading, setPasswordModalLoading] = useState(false);

  // Seller stats for the summary strip
  const { data: stats } = useQuery({
    queryKey: ['seller-profile-stats', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;
      const [productsRes, ordersRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('seller_id', profile.id),
        supabase
          .from('order_items')
          .select('order_id, order:orders!inner(status)', { count: 'exact', head: true })
          .eq('seller_id', profile.id)
          .in('order.status', ['paid', 'processing', 'dispatched', 'out_for_delivery']),
      ]);
      return {
        products: productsRes.count ?? 0,
        activeOrders: ordersRes.count ?? 0,
      };
    },
    enabled: !!profile?.id,
  });

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

  const handleSaveName = async () => {
    if (!fullName.trim()) { Alert.alert('Error', 'Name cannot be empty'); return; }
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
      setEditingName(false);
      Alert.alert('Saved', 'Your name has been updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setSigningOut(true);
    clearSignOutError();
    await logout();
    const { signOutError } = useAuthStore.getState();
    if (signOutError) {
      Alert.alert('Signed out locally', `${signOutError}\n\nPlease close and reopen the app if this keeps happening.`);
    }
    router.replace('/(auth)/login');
  };

  const handleLiveChat = async () => {
    const url = `whatsapp://send?phone=${SUPPORT_WHATSAPP}&text=${encodeURIComponent('Hi, I need help with my Mama Mboga seller account.')}`;
    const canOpen = await Linking.canOpenURL(url);
    Linking.openURL(canOpen ? url : `https://wa.me/${SUPPORT_WHATSAPP}`);
  };

  const handleCallUs = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() =>
      Alert.alert('Error', 'Unable to make a call from this device.')
    );
  };

  const storeItems: MenuItem[] = [
    {
      icon: <PlusCircle size={20} color={colors.text.primary} />,
      label: 'Add New Product',
      onPress: () => router.push('/(seller)/add-product'),
    },
    {
      icon: <Package size={20} color={colors.text.primary} />,
      label: 'My Products',
      sublabel: stats ? `${stats.products} listed` : undefined,
      onPress: () => router.push('/(seller)/products'),
    },
    {
      icon: <ShoppingBag size={20} color={colors.text.primary} />,
      label: 'My Orders',
      sublabel: stats?.activeOrders ? `${stats.activeOrders} active` : undefined,
      onPress: () => router.push('/(seller)/orders'),
    },
  ];

  const settingsItems: MenuItem[] = [
    {
      icon: <User size={20} color={colors.text.primary} />,
      label: editingName ? 'Cancel Editing Name' : 'Edit Display Name',
      onPress: () => {
        if (editingName) { setEditingName(false); setFullName(profile?.full_name || ''); }
        else setEditingName(true);
      },
    },
    {
      icon: <Settings size={20} color={colors.text.primary} />,
      label: 'Account Settings',
      onPress: () => router.push('/(customer)/account-management'),
    },
  ];

  const supportItems: MenuItem[] = [
    {
      icon: <MessageCircle size={20} color={colors.text.primary} />,
      label: 'Live Chat',
      onPress: handleLiveChat,
    },
    {
      icon: <Phone size={20} color={colors.text.primary} />,
      label: 'Call Support',
      onPress: handleCallUs,
    },
    {
      icon: <HelpCircle size={20} color={colors.text.primary} />,
      label: 'Help & FAQs',
      onPress: handleLiveChat,
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

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

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.full_name?.charAt(0).toUpperCase() || 'S'}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.welcomeText}>
            {profile?.full_name?.split(' ')[0] || 'Seller'}
          </Text>
          <Text style={styles.phoneText}>{profile?.phone || ''}</Text>
          <View style={styles.sellerBadge}>
            <Text style={styles.sellerBadgeText}>🛒 Seller Account</Text>
          </View>
        </View>
      </View>

      {/* ── Inline name edit ──────────────────────────────────────────────── */}
      {editingName && (
        <View style={styles.editNameCard}>
          <TextInput
            mode="outlined"
            label="Display Name"
            value={fullName}
            onChangeText={setFullName}
            style={styles.editNameInput}
            left={<TextInput.Icon icon="account" />}
            autoFocus
          />
          <View style={styles.editNameActions}>
            <Button
              mode="contained"
              onPress={handleSaveName}
              loading={saving}
              disabled={saving || fullName.trim() === profile?.full_name}
              style={{ flex: 1 }}
            >
              Save
            </Button>
            <Button
              mode="outlined"
              onPress={() => { setEditingName(false); setFullName(profile?.full_name || ''); }}
              disabled={saving}
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
          </View>
        </View>
      )}

      {/* ── Stats strip ───────────────────────────────────────────────────── */}
      <View style={styles.statsStrip}>
        <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(seller)/products')} activeOpacity={0.7}>
          <Text style={styles.statValue}>{stats?.products ?? '—'}</Text>
          <Text style={styles.statLabel}>Products</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(seller)/orders')} activeOpacity={0.7}>
          <Text style={styles.statValue}>{stats?.activeOrders ?? '—'}</Text>
          <Text style={styles.statLabel}>Active Orders</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(seller)/orders')} activeOpacity={0.7}>
          <Text style={styles.statValue}>
            {profile?.created_at
              ? new Date(profile.created_at).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })
              : '—'}
          </Text>
          <Text style={styles.statLabel}>Member Since</Text>
        </TouchableOpacity>
      </View>

      {/* ── Support buttons ───────────────────────────────────────────────── */}
      <View style={styles.supportRow}>
        <TouchableOpacity style={styles.supportBtn} activeOpacity={0.8} onPress={handleLiveChat}>
          <MessageCircle size={18} color={colors.white} />
          <Text style={styles.supportBtnText}>Live Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.supportBtn, styles.supportBtnOutline]} activeOpacity={0.8} onPress={handleCallUs}>
          <Phone size={18} color={colors.primary[500]} />
          <Text style={[styles.supportBtnText, styles.supportBtnTextOutline]}>Call Us</Text>
        </TouchableOpacity>
      </View>

      {/* ── My Store ──────────────────────────────────────────────────────── */}
      <SectionHeader title="My Store" />
      <View style={styles.menuGroup}>
        {storeItems.map((item, i) => (
          <React.Fragment key={item.label}>
            <MenuRow {...item} />
            {i < storeItems.length - 1 && <Divider style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>

      {/* ── Settings ──────────────────────────────────────────────────────── */}
      <SectionHeader title="My Settings" />
      <View style={styles.menuGroup}>
        {settingsItems.map((item, i) => (
          <React.Fragment key={item.label}>
            <MenuRow {...item} />
            {i < settingsItems.length - 1 && <Divider style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>

      {/* ── Security ──────────────────────────────────────────────────────── */}
      {biometrics.isSupported && biometrics.isEnrolled && (
        <>
          <SectionHeader title="Security" />
          <View style={[styles.menuGroup, { paddingHorizontal: spacing.lg, paddingVertical: spacing.md + 2 }]}>
            <View style={styles.biometricRow}>
              <View style={styles.biometricInfo}>
                <Text style={styles.menuLabel}>
                  {biometrics.biometricLabel === 'Face ID' ? '🪪' : '👆'}{' '}
                  {biometrics.biometricLabel} Login
                </Text>
                <Text style={styles.menuSublabel}>Sign in without typing your password</Text>
              </View>
              <Switch
                value={biometrics.isEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: colors.border, true: colors.primary[300] }}
                thumbColor={biometrics.isEnabled ? colors.primary[500] : colors.text.disabled}
              />
            </View>
          </View>
        </>
      )}

      {/* ── Support ───────────────────────────────────────────────────────── */}
      <SectionHeader title="Need Assistance?" />
      <View style={styles.menuGroup}>
        {supportItems.map((item, i) => (
          <React.Fragment key={item.label}>
            <MenuRow {...item} />
            {i < supportItems.length - 1 && <Divider style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>

      {/* ── Sign out ──────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.logoutRow, signingOut && styles.logoutRowDisabled]}
        onPress={handleLogout}
        activeOpacity={0.7}
        disabled={signingOut}
      >
        {signingOut
          ? <ActivityIndicator size={18} color={colors.error} />
          : <LogOut size={18} color={colors.error} />
        }
        <Text style={styles.logoutText}>{signingOut ? 'Signing out…' : 'Sign Out'}</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Mama Mboga Seller v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: { fontSize: 22, fontWeight: 'bold', color: colors.white },
  headerInfo: { flex: 1 },
  welcomeText: { fontSize: 17, fontWeight: '700', color: colors.text.primary },
  phoneText: { fontSize: 13, color: colors.primary[500], marginTop: 2 },
  sellerBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.full,
  },
  sellerBadgeText: { fontSize: 11, color: colors.primary[600], fontWeight: '600' },

  // Inline name edit
  editNameCard: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  editNameInput: { backgroundColor: colors.surface },
  editNameActions: { flexDirection: 'row', gap: spacing.sm },

  // Stats strip
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  statValue: { fontSize: 16, fontWeight: 'bold', color: colors.primary[500] },
  statLabel: { fontSize: 11, color: colors.text.secondary, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: spacing.sm },

  // Support buttons
  supportRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  supportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary[500],
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
  },
  supportBtnOutline: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary[500],
  },
  supportBtnText: { fontSize: 14, fontWeight: '600', color: colors.white },
  supportBtnTextOutline: { color: colors.primary[500] },

  // Section headers
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: colors.background,
  },

  // Menu groups
  menuGroup: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
  },
  menuIcon: { width: 32, alignItems: 'center', marginRight: spacing.md },
  menuLabel: { fontSize: 15, color: colors.text.primary },
  menuSublabel: { fontSize: 12, color: colors.text.secondary, marginTop: 1 },
  divider: { marginLeft: spacing.lg + 32 + spacing.md },

  // Logout
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md + 2,
    marginTop: spacing.sm,
  },
  logoutRowDisabled: { opacity: 0.6 },
  logoutText: { fontSize: 15, fontWeight: '600', color: colors.error },

  version: {
    textAlign: 'center',
    color: colors.text.disabled,
    fontSize: 12,
    marginTop: spacing.lg,
    marginBottom: 100,
  },

  biometricRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  biometricInfo: { flex: 1, marginRight: spacing.md },
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
