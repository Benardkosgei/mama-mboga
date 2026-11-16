import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity,
  Linking, Alert, ActivityIndicator, Image, Switch, Modal,
} from 'react-native';
import { Text, Divider, TextInput, Button, Surface } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  ShoppingBag, Users, Package, CreditCard, Bike,
  ChevronRight, MessageCircle, Phone, LogOut,
  Settings, User, Mail, Camera, Edit2,
} from 'lucide-react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/utils';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { useBiometrics } from '@/hooks/useBiometrics';

// ── App-settings helpers ──────────────────────────────────────────────────────
// Reads/writes key-value pairs from an `app_settings` table.
// Falls back silently if the table doesn't exist yet.
async function getSetting(key: string, fallback: string): Promise<string> {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .single();
    return data?.value ?? fallback;
  } catch {
    return fallback;
  }
}

async function setSetting(key: string, value: string): Promise<void> {
  await supabase
    .from('app_settings')
    .upsert({ key, value }, { onConflict: 'key' });
}

const DEFAULT_SUPPORT_PHONE = '+254754008271';
const DEFAULT_SUPPORT_WHATSAPP = '254754008271';

// ── Shared sub-components ─────────────────────────────────────────────────────
type MenuItem = {
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
  onPress: () => void;
};

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function MenuRow({ icon, label, badge, onPress }: MenuItem) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.menuIcon}>{icon}</View>
      <Text style={styles.menuLabel}>{label}</Text>
      {badge !== undefined && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <ChevronRight size={18} color={colors.text.secondary} />
    </TouchableOpacity>
  );
}

// ── Inline edit row ───────────────────────────────────────────────────────────
type EditRowProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  dirty: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  hint?: string;
  icon?: string;
};

function EditRow({
  label, value, onChange, onSave, onCancel,
  saving, dirty, keyboardType = 'default', hint, icon = 'pencil-outline',
}: EditRowProps) {
  return (
    <View style={styles.editBlock}>
      <TextInput
        mode="outlined"
        label={label}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        style={styles.editInput}
        left={<TextInput.Icon icon={icon} />}
        autoFocus
        dense
      />
      {hint && <Text style={styles.editHint}>{hint}</Text>}
      <View style={styles.editActions}>
        <Button
          mode="contained"
          compact
          onPress={onSave}
          loading={saving}
          disabled={saving || !dirty}
          style={{ flex: 1 }}
        >
          Save
        </Button>
        <Button
          mode="outlined"
          compact
          onPress={onCancel}
          disabled={saving}
          style={{ flex: 1 }}
        >
          Cancel
        </Button>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function AdminAccount() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { profile, setProfile, logout, clearSignOutError } = useAuthStore();

  const biometrics = useBiometrics();

  // ── Edit state ──────────────────────────────────────────────────────────────
  type EditField = 'name' | 'email' | 'phone' | 'supportPhone' | 'supportWhatsapp' | null;
  const [editing, setEditing] = useState<EditField>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [email, setEmail] = useState(profile?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [supportPhone, setSupportPhone] = useState(DEFAULT_SUPPORT_PHONE);
  const [supportWhatsapp, setSupportWhatsapp] = useState(DEFAULT_SUPPORT_WHATSAPP);
  const [savingField, setSavingField] = useState(false);

  // Load support contact settings from DB on mount
  useEffect(() => {
    getSetting('support_phone', DEFAULT_SUPPORT_PHONE).then(setSupportPhone);
    getSetting('support_whatsapp', DEFAULT_SUPPORT_WHATSAPP).then(setSupportWhatsapp);
  }, []);

  const cancelEdit = () => {
    setEditing(null);
    setFullName(profile?.full_name || '');
    setEmail(profile?.email || '');
    setPhone(profile?.phone || '');
  };

  // ── Platform stats ──────────────────────────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ['admin-account-stats'],
    queryFn: async () => {
      const [ordersRes, usersRes, revenueRes, pendingRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['paid', 'processing', 'dispatched']),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('total').eq('payment_status', 'completed').gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
        supabase.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['seller', 'rider']).eq('is_approved', false),
      ]);
      const todayRevenue = (revenueRes.data || []).reduce((sum: number, o: any) => sum + (o.total || 0), 0);
      return {
        activeOrders: ordersRes.count ?? 0,
        totalUsers: usersRes.count ?? 0,
        todayRevenue,
        pendingApprovals: pendingRes.count ?? 0,
      };
    },
  });

  // ── Save handlers ───────────────────────────────────────────────────────────
  const saveField = async (field: EditField) => {
    setSavingField(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (field === 'name') {
        if (!fullName.trim()) throw new Error('Name cannot be empty');
        const { data, error } = await supabase
          .from('profiles').update({ full_name: fullName.trim() })
          .eq('id', user.id).select().single();
        if (error) throw error;
        setProfile(data);

      } else if (field === 'email') {
        if (!email.trim()) throw new Error('Email cannot be empty');
        const { error } = await supabase.auth.updateUser({ email: email.trim() });
        if (error) throw error;
        const { data, error: pe } = await supabase
          .from('profiles').update({ email: email.trim() })
          .eq('id', user.id).select().single();
        if (pe) throw pe;
        setProfile(data);
        Alert.alert('Check your inbox', 'A confirmation link has been sent to your new email address.');

      } else if (field === 'phone') {
        if (!phone.trim()) throw new Error('Phone cannot be empty');
        const { data, error } = await supabase
          .from('profiles').update({ phone: phone.trim() })
          .eq('id', user.id).select().single();
        if (error) throw error;
        setProfile(data);

      } else if (field === 'supportPhone') {
        await setSetting('support_phone', supportPhone.trim());

      } else if (field === 'supportWhatsapp') {
        await setSetting('support_whatsapp', supportWhatsapp.trim());
      }

      setEditing(null);
      if (field !== 'email') Alert.alert('Saved', 'Changes saved successfully.');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingField(false);
    }
  };

  // ── Avatar upload ───────────────────────────────────────────────────────────
  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingAvatar(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `avatars/${user.id}.${ext}`;

      // Fetch the image as a blob
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: `image/${ext}` });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = urlData.publicUrl;

      const { data, error: updateError } = await supabase
        .from('profiles').update({ avatar_url: avatarUrl })
        .eq('id', user.id).select().single();
      if (updateError) throw updateError;
      setProfile(data);
    } catch (e: any) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Biometric toggle ────────────────────────────────────────────────────────
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

  // ── Logout ──────────────────────────────────────────────────────────────────
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

  // ── Support actions ─────────────────────────────────────────────────────────
  const handleLiveChat = async () => {
    const whatsapp = supportWhatsapp.replace(/\D/g, '');
    const url = `whatsapp://send?phone=${whatsapp}&text=${encodeURIComponent('Hi, I need help with the Mama Mboga admin panel.')}`;
    const canOpen = await Linking.canOpenURL(url);
    Linking.openURL(canOpen ? url : `https://wa.me/${whatsapp}`);
  };

  const handleCallUs = () => {
    Linking.openURL(`tel:${supportPhone}`).catch(() =>
      Alert.alert('Error', 'Unable to make a call from this device.')
    );
  };

  // ── Menu items ──────────────────────────────────────────────────────────────
  const platformItems: MenuItem[] = [
    { icon: <ShoppingBag size={20} color={colors.text.primary} />, label: 'Manage Orders', badge: stats?.activeOrders || undefined, onPress: () => router.push('/(admin)/orders') },
    { icon: <Users size={20} color={colors.text.primary} />, label: 'Manage Users', onPress: () => router.push('/(admin)/users') },
    { icon: <Package size={20} color={colors.text.primary} />, label: 'Products & Categories', onPress: () => router.push('/(admin)/products') },
    { icon: <CreditCard size={20} color={colors.text.primary} />, label: 'Payments', onPress: () => router.push('/(admin)/payments') },
    { icon: <Bike size={20} color={colors.text.primary} />, label: 'Riders', onPress: () => router.push('/(admin)/riders') },
  ];

  const avatarUri = profile?.avatar_url;

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
        {/* Avatar with edit button */}
        <TouchableOpacity style={styles.avatarWrapper} onPress={handlePickAvatar} activeOpacity={0.8}>
          {uploadingAvatar ? (
            <View style={styles.avatar}>
              <ActivityIndicator color={colors.white} />
            </View>
          ) : avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile?.full_name?.charAt(0).toUpperCase() || 'A'}</Text>
            </View>
          )}
          <View style={styles.cameraBtn}>
            <Camera size={12} color={colors.white} />
          </View>
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.welcomeText}>Hello, {profile?.full_name?.split(' ')[0] || 'Admin'}! 👋</Text>
          <Text style={styles.phoneText}>{profile?.phone || ''}</Text>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>🛡️ Administrator</Text>
          </View>
        </View>
      </View>

      {/* ── Platform stats ────────────────────────────────────────────────── */}
      <View style={styles.statsCard}>
        <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(admin)/orders')} activeOpacity={0.7}>
          <Text style={styles.statValue}>{stats?.activeOrders ?? '—'}</Text>
          <Text style={styles.statLabel}>Active Orders</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(admin)/users')} activeOpacity={0.7}>
          <Text style={styles.statValue}>{stats?.totalUsers ?? '—'}</Text>
          <Text style={styles.statLabel}>Total Users</Text>
        </TouchableOpacity>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem} onPress={() => router.push('/(admin)/payments')} activeOpacity={0.7}>
          <Text style={styles.statValue}>{stats ? formatPrice(stats.todayRevenue) : '—'}</Text>
          <Text style={styles.statLabel}>Today's Revenue</Text>
        </TouchableOpacity>
      </View>

      {/* Pending approvals banner */}
      {!!stats?.pendingApprovals && (
        <TouchableOpacity style={styles.pendingBanner} onPress={() => router.push('/(admin)/users')} activeOpacity={0.8}>
          <Text style={styles.pendingBannerText}>
            ⏳ {stats.pendingApprovals} pending approval{stats.pendingApprovals > 1 ? 's' : ''} — tap to review
          </Text>
          <ChevronRight size={16} color={colors.warning} />
        </TouchableOpacity>
      )}

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

      {/* ── Profile settings ──────────────────────────────────────────────── */}
      <SectionHeader title="My Profile" />
      <View style={styles.menuGroup}>

        {/* Full name */}
        <TouchableOpacity style={styles.menuRow} onPress={() => setEditing(editing === 'name' ? null : 'name')} activeOpacity={0.6}>
          <View style={styles.menuIcon}><User size={20} color={colors.text.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Full Name</Text>
            <Text style={styles.menuValue}>{profile?.full_name || '—'}</Text>
          </View>
          <Edit2 size={16} color={colors.text.secondary} />
        </TouchableOpacity>
        {editing === 'name' && (
          <EditRow
            label="Full Name" value={fullName} onChange={setFullName}
            onSave={() => saveField('name')} onCancel={cancelEdit}
            saving={savingField} dirty={fullName.trim() !== profile?.full_name}
            icon="account"
          />
        )}

        <Divider style={styles.divider} />

        {/* Email */}
        <TouchableOpacity style={styles.menuRow} onPress={() => setEditing(editing === 'email' ? null : 'email')} activeOpacity={0.6}>
          <View style={styles.menuIcon}><Mail size={20} color={colors.text.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Email Address</Text>
            <Text style={styles.menuValue}>{profile?.email || 'Not set'}</Text>
          </View>
          <Edit2 size={16} color={colors.text.secondary} />
        </TouchableOpacity>
        {editing === 'email' && (
          <EditRow
            label="Email Address" value={email} onChange={setEmail}
            onSave={() => saveField('email')} onCancel={cancelEdit}
            saving={savingField} dirty={email.trim() !== profile?.email}
            keyboardType="email-address" icon="email-outline"
            hint="A confirmation link will be sent to the new email."
          />
        )}

        <Divider style={styles.divider} />

        {/* Phone */}
        <TouchableOpacity style={styles.menuRow} onPress={() => setEditing(editing === 'phone' ? null : 'phone')} activeOpacity={0.6}>
          <View style={styles.menuIcon}><Phone size={20} color={colors.text.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Phone Number</Text>
            <Text style={styles.menuValue}>{profile?.phone || '—'}</Text>
          </View>
          <Edit2 size={16} color={colors.text.secondary} />
        </TouchableOpacity>
        {editing === 'phone' && (
          <EditRow
            label="Phone Number" value={phone} onChange={setPhone}
            onSave={() => saveField('phone')} onCancel={cancelEdit}
            saving={savingField} dirty={phone.trim() !== profile?.phone}
            keyboardType="phone-pad" icon="phone"
            hint="Used for login. Ensure this is a valid Kenyan number."
          />
        )}

        <Divider style={styles.divider} />

        {/* Profile image */}
        <TouchableOpacity style={styles.menuRow} onPress={handlePickAvatar} activeOpacity={0.6}>
          <View style={styles.menuIcon}><Camera size={20} color={colors.text.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Profile Photo</Text>
            <Text style={styles.menuValue}>{profile?.avatar_url ? 'Tap to change' : 'Tap to upload'}</Text>
          </View>
          {uploadingAvatar
            ? <ActivityIndicator size={16} color={colors.primary[500]} />
            : <Edit2 size={16} color={colors.text.secondary} />
          }
        </TouchableOpacity>
      </View>

      {/* ── App / Support settings ────────────────────────────────────────── */}
      <SectionHeader title="App Settings" />
      <Surface style={styles.settingsNote} elevation={0}>
        <Text style={styles.settingsNoteText}>
          These settings affect the support contact details shown to all users in the app.
        </Text>
      </Surface>
      <View style={styles.menuGroup}>

        {/* Support phone */}
        <TouchableOpacity style={styles.menuRow} onPress={() => setEditing(editing === 'supportPhone' ? null : 'supportPhone')} activeOpacity={0.6}>
          <View style={styles.menuIcon}><Phone size={20} color={colors.text.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Support Phone</Text>
            <Text style={styles.menuValue}>{supportPhone}</Text>
          </View>
          <Edit2 size={16} color={colors.text.secondary} />
        </TouchableOpacity>
        {editing === 'supportPhone' && (
          <EditRow
            label="Support Phone" value={supportPhone} onChange={setSupportPhone}
            onSave={() => saveField('supportPhone')} onCancel={() => setEditing(null)}
            saving={savingField} dirty={supportPhone !== DEFAULT_SUPPORT_PHONE}
            keyboardType="phone-pad" icon="phone"
            hint="Include country code, e.g. +254712345678"
          />
        )}

        <Divider style={styles.divider} />

        {/* Support WhatsApp */}
        <TouchableOpacity style={styles.menuRow} onPress={() => setEditing(editing === 'supportWhatsapp' ? null : 'supportWhatsapp')} activeOpacity={0.6}>
          <View style={styles.menuIcon}><MessageCircle size={20} color={colors.text.primary} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.menuLabel}>Support WhatsApp</Text>
            <Text style={styles.menuValue}>{supportWhatsapp}</Text>
          </View>
          <Edit2 size={16} color={colors.text.secondary} />
        </TouchableOpacity>
        {editing === 'supportWhatsapp' && (
          <EditRow
            label="WhatsApp Number" value={supportWhatsapp} onChange={setSupportWhatsapp}
            onSave={() => saveField('supportWhatsapp')} onCancel={() => setEditing(null)}
            saving={savingField} dirty={supportWhatsapp !== DEFAULT_SUPPORT_WHATSAPP}
            keyboardType="phone-pad" icon="whatsapp"
            hint="Without + prefix, e.g. 254712345678"
          />
        )}
      </View>

      {/* ── Platform management ───────────────────────────────────────────── */}
      <SectionHeader title="Platform Management" />
      <View style={styles.menuGroup}>
        {platformItems.map((item, i) => (
          <React.Fragment key={item.label}>
            <MenuRow {...item} />
            {i < platformItems.length - 1 && <Divider style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>

      {/* ── Need assistance ───────────────────────────────────────────────── */}
      <SectionHeader title="Need Assistance?" />
      <View style={styles.menuGroup}>
        <MenuRow icon={<MessageCircle size={20} color={colors.text.primary} />} label="Live Chat Support" onPress={handleLiveChat} />
        <Divider style={styles.divider} />
        <MenuRow icon={<Phone size={20} color={colors.text.primary} />} label="Call Support" onPress={handleCallUs} />
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
                <Text style={styles.menuValue}>Sign in without typing your password</Text>
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

      <Text style={styles.version}>Mama Mboga Admin v1.0.0</Text>
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
  avatarWrapper: { position: 'relative', marginRight: spacing.md },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: colors.white },
  cameraBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary[600],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  headerInfo: { flex: 1 },
  welcomeText: { fontSize: 17, fontWeight: '700', color: colors.text.primary },
  phoneText: { fontSize: 13, color: colors.primary[500], marginTop: 2 },
  adminBadge: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.full,
  },
  adminBadgeText: { fontSize: 11, color: colors.primary[600], fontWeight: '600' },

  // Stats
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  statValue: { fontSize: 18, fontWeight: 'bold', color: colors.primary[500] },
  statLabel: { fontSize: 11, color: colors.text.secondary, marginTop: 2, textAlign: 'center' },
  statDivider: { width: 1, backgroundColor: colors.border, marginVertical: spacing.sm },

  // Pending banner
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.warning + '15',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.warning + '40',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  pendingBannerText: { fontSize: 13, fontWeight: '600', color: colors.warning, flex: 1 },

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

  // Settings note
  settingsNote: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    backgroundColor: 'transparent',
  },
  settingsNoteText: { fontSize: 12, color: colors.text.secondary, lineHeight: 18 },

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
    paddingVertical: spacing.md,
  },
  menuIcon: { width: 32, alignItems: 'center', marginRight: spacing.md },
  menuLabel: { fontSize: 15, color: colors.text.primary },
  menuValue: { fontSize: 12, color: colors.text.secondary, marginTop: 1 },
  divider: { marginLeft: spacing.lg + 32 + spacing.md },

  // Inline edit block
  editBlock: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: colors.primary[50] + '80',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editInput: { backgroundColor: colors.surface, marginTop: spacing.sm },
  editHint: { fontSize: 11, color: colors.text.secondary, marginTop: 4, marginBottom: spacing.xs },
  editActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },

  // Badge
  badge: {
    backgroundColor: colors.error,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginRight: spacing.sm,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: 'bold' },

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
