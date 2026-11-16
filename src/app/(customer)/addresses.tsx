import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Alert } from 'react-native';
import { Text, Button, Surface, TextInput, RadioButton, ActivityIndicator } from 'react-native-paper';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { formatDeliveryPhone } from '@/utils';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { Address } from '@/types';

export default function AddressesScreen() {
  const queryClient = useQueryClient();
  const { profile } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');

  // Pre-fill phone from profile when opening the form
  const openForm = () => {
    const profilePhone = profile?.phone ? formatDeliveryPhone(profile.phone) : '';
    setPhone(profilePhone);
    setName('');
    setStreet('');
    setLandmark('');
    setShowForm(true);
  };

  const { data: addresses, isLoading } = useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });
      if (error) throw error;
      return data as Address[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const isFirst = !addresses?.length;
      const { error } = await supabase.from('addresses').insert({
        user_id: user.id,
        name: name.trim(),
        phone: phone.trim(),
        street_address: street.trim(),
        landmark: landmark.trim() || null,
        is_default: isFirst,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
      setShowForm(false);
      setName(''); setPhone(''); setStreet(''); setLandmark('');
    },
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', user.id);
      await supabase.from('addresses').update({ is_default: true }).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('addresses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['addresses'] }),
    onError: (e: any) => Alert.alert('Error', e.message),
  });

  if (isLoading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary[500]} /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📍</Text>
            <Text style={styles.emptyTitle}>No addresses saved</Text>
            <Text style={styles.emptyText}>Add a delivery address to get started</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Surface style={styles.addressCard} elevation={1}>
            <View style={styles.addressRow}>
              <RadioButton
                value={item.id}
                status={item.is_default ? 'checked' : 'unchecked'}
                onPress={() => setDefaultMutation.mutate(item.id)}
              />
              <View style={styles.addressInfo}>
                <Text style={styles.addressName}>{item.name}</Text>
                <Text style={styles.addressText}>{item.street_address}</Text>
                {item.landmark ? <Text style={styles.addressLandmark}>Near {item.landmark}</Text> : null}
                <Text style={styles.addressPhone}>{item.phone}</Text>
                {item.is_default && <Text style={styles.defaultBadge}>Default</Text>}
              </View>
              <Button
                mode="text"
                compact
                textColor={colors.error}
                onPress={() =>
                  Alert.alert('Delete Address', 'Remove this address?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
                  ])
                }
              >
                Delete
              </Button>
            </View>
          </Surface>
        )}
        ListFooterComponent={
          showForm ? (
            <Surface style={styles.form} elevation={1}>
              <Text style={styles.formTitle}>New Address</Text>
              <TextInput mode="outlined" label="Label (e.g. Home)" value={name} onChangeText={setName} style={styles.input} />
              <TextInput
                mode="outlined"
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={styles.input}
                left={<TextInput.Icon icon="phone-outline" />}
                right={
                  profile?.phone && phone !== formatDeliveryPhone(profile.phone)
                    ? <TextInput.Icon icon="refresh" onPress={() => setPhone(formatDeliveryPhone(profile.phone!))} />
                    : undefined
                }
              />
              <TextInput mode="outlined" label="Street Address *" value={street} onChangeText={setStreet} style={styles.input} />
              <TextInput mode="outlined" label="Landmark (optional)" value={landmark} onChangeText={setLandmark} style={styles.input} />
              <View style={styles.formActions}>
                <Button mode="outlined" onPress={() => { setShowForm(false); }} style={styles.formBtn}>Cancel</Button>
                <Button
                  mode="contained"
                  onPress={() => addMutation.mutate()}
                  loading={addMutation.isPending}
                  disabled={!name || !phone || !street || addMutation.isPending}
                  style={styles.formBtn}
                >
                  Save
                </Button>
              </View>
            </Surface>
          ) : (
            <Button mode="contained" icon="plus" onPress={openForm} style={styles.addButton}>
              Add New Address
            </Button>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: spacing.md, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingVertical: spacing.xxl },
  emptyIcon: { fontSize: 64, marginBottom: spacing.md },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: colors.text.primary },
  emptyText: { fontSize: 14, color: colors.text.secondary, marginTop: spacing.xs },
  addressCard: { borderRadius: borderRadius.lg, backgroundColor: colors.surface, marginBottom: spacing.md, overflow: 'hidden' },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.md },
  addressInfo: { flex: 1, marginLeft: spacing.sm },
  addressName: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  addressText: { fontSize: 14, color: colors.text.secondary, marginTop: 2 },
  addressLandmark: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  addressPhone: { fontSize: 14, color: colors.text.secondary, marginTop: 4 },
  defaultBadge: { fontSize: 11, color: colors.primary[500], fontWeight: '600', marginTop: 4 },
  form: { padding: spacing.lg, borderRadius: borderRadius.lg, backgroundColor: colors.surface, marginBottom: spacing.md },
  formTitle: { fontSize: 16, fontWeight: 'bold', color: colors.text.primary, marginBottom: spacing.md },
  input: { marginBottom: spacing.md, backgroundColor: colors.surface },
  formActions: { flexDirection: 'row', gap: spacing.md },
  formBtn: { flex: 1 },
  addButton: { borderRadius: borderRadius.md, marginTop: spacing.sm },
});
