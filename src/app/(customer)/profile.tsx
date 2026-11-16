import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, ActivityIndicator } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ShoppingBag, Bell, MapPin, ChevronRight,
  HelpCircle, MessageCircle, Phone, LogOut,
  User, Settings, CreditCard,
} from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { useAppSettings } from '@/hooks';
import { colors, spacing, borderRadius } from '@/constants/theme';

type MenuItem = {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  chevron?: boolean;
};

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function MenuRow({ icon, label, onPress }: MenuItem) {
  return (
    <TouchableOpacity style={styles.menuRow} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.menuIcon}>{icon}</View>
      <Text style={styles.menuLabel}>{label}</Text>
      <ChevronRight size={18} color={colors.text.secondary} />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, logout, clearSignOutError } = useAuthStore();
  const { data: appSettings } = useAppSettings();
  const [signingOut, setSigningOut] = useState(false);

  const SUPPORT_PHONE = appSettings?.support_phone ?? '+254754008271';
  const SUPPORT_WHATSAPP = appSettings?.support_whatsapp ?? '254754008271';

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
    const url = `whatsapp://send?phone=${SUPPORT_WHATSAPP}&text=${encodeURIComponent('Hi, I need help with my Mama Mboga order.')}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    } else {
      Linking.openURL(`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent('Hi, I need help with my Mama Mboga order.')}`);
    }
  };

  const handleCallUs = () => {
    Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() =>
      Alert.alert('Error', 'Unable to make a call from this device.')
    );
  };

  const accountItems: MenuItem[] = [
    {
      icon: <ShoppingBag size={20} color={colors.text.primary} />,
      label: 'My Orders',
      onPress: () => router.push('/(customer)/orders'),
    },
    {
      icon: <Bell size={20} color={colors.text.primary} />,
      label: 'Notifications',
      onPress: () => router.push('/(customer)/notifications'),
    },
    {
      icon: <MapPin size={20} color={colors.text.primary} />,
      label: 'Address Book',
      onPress: () => router.push('/(customer)/addresses'),
    },
  ];

  const settingsItems: MenuItem[] = [
    {
      icon: <CreditCard size={20} color={colors.text.primary} />,
      label: 'Payment Settings',
      onPress: () => router.push('/(customer)/payment-settings'),
    },
    {
      icon: <User size={20} color={colors.text.primary} />,
      label: 'Account Management',
      onPress: () => router.push('/(customer)/account-management'),
    },
    {
      icon: <Settings size={20} color={colors.text.primary} />,
      label: 'Notification Preferences',
      onPress: () => router.push('/(customer)/notification-preferences'),
    },
    {
      icon: <HelpCircle size={20} color={colors.text.primary} />,
      label: 'Terms & Privacy Policy',
      onPress: () => router.push('/(customer)/legal'),
    },
  ];

  const supportItems: MenuItem[] = [
    {
      icon: <HelpCircle size={20} color={colors.text.primary} />,
      label: 'Help & Support',
      onPress: handleLiveChat,
    },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.welcomeText}>
            Welcome, {profile?.full_name?.split(' ')[0] || 'there'}!
          </Text>
          <Text style={styles.phoneText}>{profile?.phone || ''}</Text>
        </View>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceIcon}>
          <CreditCard size={18} color={colors.primary[500]} />
        </View>
        <Text style={styles.balanceText}>
          Mama Mboga balance: <Text style={styles.balanceAmount}>KES 0</Text>
        </Text>
      </View>

      {/* Support Buttons */}
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

      {/* Need Assistance */}
      <SectionHeader title="Need Assistance?" />
      <View style={styles.menuGroup}>
        {supportItems.map((item, i) => (
          <React.Fragment key={item.label}>
            <MenuRow {...item} />
            {i < supportItems.length - 1 && <Divider style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>

      {/* My Account */}
      <SectionHeader title="My Mama Mboga Account" />
      <View style={styles.menuGroup}>
        {accountItems.map((item, i) => (
          <React.Fragment key={item.label}>
            <MenuRow {...item} />
            {i < accountItems.length - 1 && <Divider style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>

      {/* Settings */}
      <SectionHeader title="My Settings" />
      <View style={styles.menuGroup}>
        {settingsItems.map((item, i) => (
          <React.Fragment key={item.label}>
            <MenuRow {...item} />
            {i < settingsItems.length - 1 && <Divider style={styles.divider} />}
          </React.Fragment>
        ))}
      </View>

      {/* Logout */}
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
        <Text style={styles.logoutText}>{signingOut ? 'Signing out…' : 'Logout'}</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Mama Mboga v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

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
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerInfo: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
  },
  phoneText: {
    fontSize: 13,
    color: colors.primary[500],
    marginTop: 2,
  },

  // Balance
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  balanceIcon: {
    marginRight: spacing.sm,
  },
  balanceText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  balanceAmount: {
    color: colors.primary[500],
    fontWeight: '600',
  },

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
  supportBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.white,
  },
  supportBtnTextOutline: {
    color: colors.primary[500],
  },

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
  menuIcon: {
    width: 32,
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary,
  },
  divider: {
    marginLeft: spacing.lg + 32 + spacing.md,
  },

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
  logoutRowDisabled: {
    opacity: 0.6,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.error,
  },

  version: {
    textAlign: 'center',
    color: colors.text.disabled,
    fontSize: 12,
    marginTop: spacing.lg,
    marginBottom: 100,
  },
});
