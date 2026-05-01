import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Switch, Surface, Divider, Button } from 'react-native-paper';
import { colors, spacing, borderRadius } from '@/constants/theme';

interface PrefItem {
  key: string;
  label: string;
  description: string;
}

const PREFS: PrefItem[] = [
  { key: 'order_updates', label: 'Order Updates', description: 'Status changes for your orders (paid, dispatched, delivered)' },
  { key: 'payment_success', label: 'Payment Confirmations', description: 'Confirmation when your M-Pesa payment is received' },
  { key: 'delivery_updates', label: 'Delivery Updates', description: 'Rider assignment and delivery progress' },
  { key: 'promotions', label: 'Deals & Promotions', description: 'Discounts and special offers from sellers' },
  { key: 'new_products', label: 'New Products', description: 'Alerts when new produce is listed in your area' },
];

export default function NotificationPreferencesScreen() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    order_updates: true,
    payment_success: true,
    delivery_updates: true,
    promotions: false,
    new_products: false,
  });

  const toggle = (key: string) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSave = () => {
    // Stored locally — push notification topic subscriptions would go here
    Alert.alert('Saved', 'Your notification preferences have been updated.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Surface style={styles.card} elevation={1}>
        <Text style={styles.cardTitle}>Push Notifications</Text>
        {PREFS.map((item, i) => (
          <React.Fragment key={item.key}>
            <View style={styles.prefRow}>
              <View style={styles.prefInfo}>
                <Text style={styles.prefLabel}>{item.label}</Text>
                <Text style={styles.prefDesc}>{item.description}</Text>
              </View>
              <Switch
                value={prefs[item.key]}
                onValueChange={() => toggle(item.key)}
                color={colors.primary[500]}
              />
            </View>
            {i < PREFS.length - 1 && <Divider style={styles.divider} />}
          </React.Fragment>
        ))}
      </Surface>

      <Button
        mode="contained"
        onPress={handleSave}
        style={styles.saveButton}
        contentStyle={styles.saveButtonContent}
      >
        Save Preferences
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.md },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  prefInfo: { flex: 1, marginRight: spacing.md },
  prefLabel: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  prefDesc: { fontSize: 12, color: colors.text.secondary, marginTop: 2, lineHeight: 18 },
  divider: { marginVertical: spacing.xs },
  saveButton: { borderRadius: borderRadius.md },
  saveButtonContent: { paddingVertical: spacing.sm },
});
