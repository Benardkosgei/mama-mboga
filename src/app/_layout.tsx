import 'react-native-get-random-values';
import 'react-native-url-polyfill/auto';
import '../../global.css';
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { queryClient } from '@/lib/queryClient';
import { useAuthStore } from '@/store/authStore';
import { colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { usePushNotifications } from '@/hooks';

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.primary[500],
    secondary: colors.secondary[500],
    background: colors.background,
    surface: colors.surface,
    error: colors.error,
  },
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <RootLayoutContent />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutContent() {
  const { setLoading, setProfile, setSession } = useAuthStore();

  // Register push notifications and subscribe to real-time notification inserts
  usePushNotifications();

  useEffect(() => {
    // Safety net: if nothing resolves within 5 seconds, stop loading anyway.
    // This prevents an infinite spinner if Supabase is unreachable or the
    // INITIAL_SESSION event never fires (e.g. bad env vars, no network).
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setProfile(null);
          clearTimeout(timeout);
          setLoading(false);
        } else if (
          (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') &&
          session?.user
        ) {
          setSession(session);
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single();
            setProfile(profile ?? null);
          } catch {
            // Profile fetch failed — clear session so user lands on login
            setSession(null);
            setProfile(null);
          } finally {
            clearTimeout(timeout);
            setLoading(false);
          }
        } else if (event === 'INITIAL_SESSION' && !session) {
          // No session on startup — stop loading so the login screen can show.
          clearTimeout(timeout);
          setLoading(false);
        } else {
          // Any other event (PASSWORD_RECOVERY, USER_UPDATED, etc.) — unblock loading.
          clearTimeout(timeout);
          setLoading(false);
        }
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  // Always render the Stack — never return early before it mounts
  // Loading/redirect logic is handled in index.tsx
  return (
    <PaperProvider theme={theme}>
      <StatusBar style="dark" />
      {/* Top-level error boundary catches crashes in any screen */}
      <ErrorBoundary name="App">
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text.primary,
            headerTitleStyle: { fontWeight: '600' },
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(customer)" options={{ headerShown: false }} />
          <Stack.Screen name="(seller)" options={{ headerShown: false }} />
          <Stack.Screen name="(admin)" options={{ headerShown: false }} />
          <Stack.Screen name="(rider)" options={{ headerShown: false }} />
        </Stack>
      </ErrorBoundary>
    </PaperProvider>
  );
}
