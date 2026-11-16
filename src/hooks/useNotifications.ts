import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Registers the device for push notifications and saves the Expo push token
 * to the profiles table so the server can target this device.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  try {
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  } catch {
    return null;
  }
}

/**
 * Hook that registers push notifications on mount and keeps the token
 * in sync with the profiles table. Also subscribes to real-time
 * notification inserts so the badge count updates live.
 */
export function usePushNotifications() {
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const registeredRef = useRef(false);

  // Register token once per session
  useEffect(() => {
    if (!profile?.id || registeredRef.current) return;
    registeredRef.current = true;

    registerForPushNotifications().then(async (token) => {
      if (!token) return;
      await supabase
        .from('profiles')
        .update({ push_token: token } as any)
        .eq('id', profile.id);
    });
  }, [profile?.id]);

  // Real-time subscription: invalidate notifications query on new insert
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`notifications-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['unread-notification-count'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, queryClient]);
}

/** Returns the count of unread notifications for the badge. */
export function useUnreadNotificationCount() {
  const { profile } = useAuthStore();

  return useQuery({
    queryKey: ['unread-notification-count', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);
      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!profile?.id,
  });
}
