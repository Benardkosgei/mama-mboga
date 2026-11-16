import React from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, ShoppingBag, Users, Package, CreditCard, UserCircle } from 'lucide-react-native';
import { colors } from '@/constants/theme';

export default function AdminLayout() {
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
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text.primary,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: true,
      }}
    >
      {/* Dashboard has its own hero header */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          headerShown: false,
          tabBarIcon: ({ color }) => <LayoutDashboard size={22} color={color} />,
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          headerShown: true,
          tabBarIcon: ({ color }) => <ShoppingBag size={22} color={color} />,
        }}
      />

      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          headerShown: true,
          tabBarIcon: ({ color }) => <Users size={22} color={color} />,
        }}
      />

      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          headerShown: true,
          tabBarIcon: ({ color }) => <Package size={22} color={color} />,
        }}
      />

      <Tabs.Screen
        name="payments"
        options={{
          title: 'Payments',
          headerShown: true,
          tabBarIcon: ({ color }) => <CreditCard size={22} color={color} />,
        }}
      />

      {/* Account has its own inline header with safe-area handling */}
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          headerShown: false,
          tabBarIcon: ({ color }) => <UserCircle size={22} color={color} />,
        }}
      />

      {/* Hidden screens — not shown in tab bar */}
      <Tabs.Screen name="categories" options={{ href: null, title: 'Categories' }} />
      <Tabs.Screen name="riders" options={{ href: null, title: 'Riders', headerShown: true }} />
      <Tabs.Screen name="order/[id]" options={{ href: null, title: 'Order Detail', headerShown: true }} />
    </Tabs>
  );
}
