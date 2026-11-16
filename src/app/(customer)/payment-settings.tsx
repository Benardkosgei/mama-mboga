import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, TextInput, Button, Surface, RadioButton, ActivityIndicator } from 'react-native-paper';
import { Smartphone, Truck } from 'lucide-react-native';
import { useAuthStore } from '@/store/authStore';
import { validatePhoneNumber } from '@/utils';
import { colors, spacing, borderRadius } from '@/constants/theme';
import { usePaymentSettings, useSavePaymentSettings } from '@/hooks';

type DefaultPayment = 'mpesa' | 'pod';

export default function PaymentSettingsScreen() {
  const { profile } = useAuthStore();
  const { data: settings, isLoading } = usePaymentSettings();
  const saveMutation = useSavePaymentSettings();

  const rawPhone = profile?.phone?.replace('+254', '0').replace(/^254/, '0') || '';

  const [mpesaPhone, setMpesaPhone] = useState(rawPhone);
  const [defaultMethod, setDefaultMethod] = useState<DefaultPayment>('mpesa');

  // Populate from persisted settings once loaded
  useEffect(() => {
    if (!settings) return;
    setDefaultMethod(settings.defaultMethod);
    setMpesaPhone(settings.mpesaPhone || rawPhone);
  }, [settings]);

  const handleSave = () => {
    if (defaultMethod === 'mpesa' && !validatePhoneNumber(mpesaPhone)) {
      Alert.alert('Invalid Number', 'Please enter a valid Safaricom number.');
      return;
    }
    saveMutation.mutate(
      { defaultMethod, mpesaPhone },
      {
        onSuccess: () => Alert.alert('Saved', 'Your payment preferences have been saved.'),
        onError: (e: any) => Alert.alert('Error', e.message),
      }
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Default Payment Method */}
      <Surface style={styles.card} elevation={1}>
        <Text style={styles.cardTitle}>Default Payment Method</Text>
        <Text style={styles.hint}>
          This will be pre-selected at checkout. You can always change it per order.
        </Text>

        <View style={[styles.methodRow, defaultMethod === 'mpesa' && styles.methodRowActive]}>
          <View style={[styles.methodIcon, { backgroundColor: colors.success + '18' }]}>
            <Smartphone size={20} color={colors.success} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>M-Pesa</Text>
            <Text style={styles.methodSub}>Safaricom STK push</Text>
          </View>
          <RadioButton
            value="mpesa"
            status={defaultMethod === 'mpesa' ? 'checked' : 'unchecked'}
            onPress={() => setDefaultMethod('mpesa')}
            color={colors.primary[500]}
          />
        </View>

        <View style={[styles.methodRow, defaultMethod === 'pod' && styles.methodRowActive]}>
          <View style={[styles.methodIcon, { backgroundColor: colors.secondary[50] }]}>
            <Truck size={20} color={colors.secondary[500]} />
          </View>
          <View style={styles.methodInfo}>
            <Text style={styles.methodTitle}>Pay on Delivery</Text>
            <Text style={styles.methodSub}>Cash or M-Pesa at door</Text>
          </View>
          <RadioButton
            value="pod"
            status={defaultMethod === 'pod' ? 'checked' : 'unchecked'}
            onPress={() => setDefaultMethod('pod')}
            color={colors.primary[500]}
          />
        </View>
      </Surface>

      {/* M-Pesa Number */}
      {defaultMethod === 'mpesa' && (
        <Surface style={styles.card} elevation={1}>
          <Text style={styles.cardTitle}>M-Pesa Number</Text>
          <Text style={styles.hint}>
            Pre-filled at checkout. You can still change it per order.
          </Text>
          <TextInput
            mode="outlined"
            label="Safaricom Number"
            placeholder="0712 345 678"
            value={mpesaPhone}
            onChangeText={setMpesaPhone}
            keyboardType="phone-pad"
            left={<TextInput.Icon icon="phone" />}
            style={styles.input}
          />
        </Surface>
      )}

      <Button
        mode="contained"
        onPress={handleSave}
        loading={saveMutation.isPending}
        disabled={saveMutation.isPending}
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
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.xs },
  hint: { fontSize: 13, color: colors.text.secondary, marginBottom: spacing.md },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  methodRowActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  methodIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  methodInfo: { flex: 1 },
  methodTitle: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  methodSub: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  input: { backgroundColor: colors.surface },
  saveButton: { borderRadius: borderRadius.md },
  saveButtonContent: { paddingVertical: spacing.sm },
});
