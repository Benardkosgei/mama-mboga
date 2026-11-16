import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Redirect } from 'expo-router';
import { Text, Button, Surface } from 'react-native-paper';
import { useAuthStore } from '@/store/authStore';
import { LoadingScreen } from '@/components/common/LoadingScreen';
import { colors, spacing, borderRadius } from '@/constants/theme';

function PendingApprovalScreen({ role }: { role: string }) {
  const { logout, clearSignOutError } = useAuthStore();

  const handleLogout = async () => {
    clearSignOutError();
    await logout();
    const { signOutError } = useAuthStore.getState();
    if (signOutError) {
      Alert.alert('Signed out locally', `${signOutError}\n\nPlease close and reopen the app if this keeps happening.`);
    }
  };

  return (
    <View style={styles.container}>
      <Surface style={styles.card} elevation={2}>
        <Text style={styles.icon}>⏳</Text>
        <Text style={styles.title}>Account Pending Approval</Text>
        <Text style={styles.message}>
          Your {role} account is under review. Our team will approve it shortly.
          You'll be able to access the app once approved.
        </Text>
        <Button
          mode="outlined"
          onPress={handleLogout}
          style={styles.logoutButton}
          textColor={colors.error}
        >
          Sign Out
        </Button>
      </Surface>
    </View>
  );
}

export default function IndexScreen() {
  const { isLoading, isAuthenticated, profile } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen message="Welcome to Mama Mboga..." />;
  }

  if (!isAuthenticated || !profile) {
    return <Redirect href="/(auth)/login" />;
  }

  // Sellers and riders must be approved before accessing their dashboards
  if ((profile.role === 'seller' || profile.role === 'rider') && profile.is_approved === false) {
    return <PendingApprovalScreen role={profile.role} />;
  }

  switch (profile.role) {
    case 'admin':
      return <Redirect href="/(admin)/dashboard" />;
    case 'seller':
      return <Redirect href="/(seller)/dashboard" />;
    case 'rider':
      return <Redirect href="/(rider)/dashboard" />;
    default:
      return <Redirect href="/(customer)/home" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  card: {
    padding: spacing.xl,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    width: '100%',
  },
  icon: { fontSize: 64, marginBottom: spacing.lg },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  logoutButton: {
    borderColor: colors.error,
    borderRadius: borderRadius.md,
    width: '100%',
  },
});
