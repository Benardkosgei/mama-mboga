import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Switch, Surface, Divider, Button, ActivityIndicator } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius } from '@/constants/theme';

const STORAGE_KEY = 'notification_preferences';

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

const DEFAULT_PREFS: Record<string, boolean> = {
  order_updates: true,
  payment_success: true,
  delivery_updates: true,
  promotions: false,
  new_products: false,
};

export default function NotificationPreferencesScreen() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (key: string) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      Alert.alert('Saved', 'Your notification preferences have been updated.');
    } catch {
      Alert.alert('Error', 'Could not save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

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
        loading={saving}
        disabled={saving}
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
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
