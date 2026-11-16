import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Badge } from 'react-native-paper';
import { Home, LayoutGrid, ShoppingCart, Heart, User } from 'lucide-react-native';
import { useCart, useUnreadNotificationCount } from '@/hooks';
import { colors } from '@/constants/theme';

export default function CustomerLayout() {
  const { data: cart } = useCart();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const itemCount = cart?.items?.reduce((sum: number, item: any) => sum + item.quantity, 0) ?? 0;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color }) => <Home size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          headerShown: false,
          tabBarIcon: ({ color }) => <LayoutGrid size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <View>
              <ShoppingCart size={24} color={color} />
              {itemCount > 0 && (
                <Badge style={styles.badge} size={16}>
                  {itemCount > 99 ? '99+' : itemCount}
                </Badge>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="wishlist"
        options={{
          title: 'Wishlist',
          headerShown: false,
          tabBarIcon: ({ color }) => <Heart size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Account',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <View>
              <User size={24} color={color} />
              {unreadCount > 0 && (
                <Badge style={styles.notifBadge} size={14}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Badge>
              )}
            </View>
          ),
        }}
      />
      {/* Hidden screens — not shown in tab bar */}
      <Tabs.Screen name="search" options={{ href: null, title: 'Search' }} />
      <Tabs.Screen name="orders" options={{ href: null, title: 'My Orders' }} />
      <Tabs.Screen name="addresses" options={{ href: null, title: 'My Addresses' }} />
      <Tabs.Screen name="notifications" options={{ href: null, title: 'Notifications' }} />
      <Tabs.Screen name="checkout" options={{ href: null, title: 'Checkout' }} />
      <Tabs.Screen name="payment" options={{ href: null, title: 'Payment' }} />
      <Tabs.Screen name="payment-settings" options={{ href: null, title: 'Payment Settings' }} />
      <Tabs.Screen name="account-management" options={{ href: null, title: 'Account Management' }} />
      <Tabs.Screen name="notification-preferences" options={{ href: null, title: 'Notification Preferences' }} />
      <Tabs.Screen name="legal" options={{ href: null, title: 'Legal' }} />
      {/* Detail screens — hidden from tab bar, pushed via router.push */}
      <Tabs.Screen name="product/[id]" options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="order/[id]" options={{ href: null, headerShown: false, tabBarStyle: { display: 'none' } }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.error,
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: colors.primary[500],
  },
});
