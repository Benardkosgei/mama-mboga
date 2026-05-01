import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';
import { LoadingScreen } from '@/components/common/LoadingScreen';

export default function IndexScreen() {
  const { isLoading, isAuthenticated, profile } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen message="Welcome to Mama Mboga..." />;
  }

  if (!isAuthenticated || !profile) {
    return <Redirect href="/(auth)/login" />;
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
