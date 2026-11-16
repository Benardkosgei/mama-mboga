import React from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, Package, ShoppingBag, User } from 'lucide-react-native';
import { colors } from '@/constants/theme';

export default function SellerLayout() {
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
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: true,
      }}
    >
      {/* Dashboard has its own sticky coloured hero header */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          headerShown: false,
          tabBarIcon: ({ color }) => <LayoutDashboard size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="products"
        options={{
          title: 'My Products',
          headerShown: true,
          tabBarIcon: ({ color }) => <Package size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: 'My Orders',
          headerShown: true,
          tabBarIcon: ({ color }) => <ShoppingBag size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'My Account',
          headerShown: false,
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />

      {/* Hidden screen — not shown in tab bar */}
      <Tabs.Screen name="add-product" options={{ href: null, title: 'Add Product', headerShown: true }} />
      <Tabs.Screen name="order/[id]" options={{ href: null, title: 'Order Details', headerShown: true }} />
    </Tabs>
  );
}
