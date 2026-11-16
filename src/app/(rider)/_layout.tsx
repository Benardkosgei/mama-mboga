import React from 'react';
import { Tabs } from 'expo-router';
import { Bike, PackageCheck, Wallet, User } from 'lucide-react-native';
import { colors } from '@/constants/theme';

export default function RiderLayout() {
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
      {/* Dashboard has its own coloured hero header */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          headerShown: false,
          tabBarIcon: ({ color }) => <Bike size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="deliveries"
        options={{
          title: 'My Deliveries',
          headerShown: true,
          tabBarIcon: ({ color }) => <PackageCheck size={24} color={color} />,
        }}
      />

      {/* Earnings has its own coloured hero header */}
      <Tabs.Screen
        name="earnings"
        options={{
          title: 'Earnings',
          headerShown: false,
          tabBarIcon: ({ color }) => <Wallet size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'My Profile',
          headerShown: true,
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />

      {/* Hidden screen — not shown in tab bar */}
      <Tabs.Screen
        name="delivery/[id]"
        options={{ href: null, title: 'Delivery Details', headerShown: true }}
      />
    </Tabs>
  );
}
