import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'payment_settings';

export interface PaymentSettings {
  defaultMethod: 'mpesa' | 'pod';
  mpesaPhone: string;
}

const DEFAULT_SETTINGS: PaymentSettings = {
  defaultMethod: 'mpesa',
  mpesaPhone: '',
};

async function loadSettings(): Promise<PaymentSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function saveSettings(settings: PaymentSettings): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function usePaymentSettings() {
  return useQuery({
    queryKey: ['payment-settings'],
    queryFn: loadSettings,
    staleTime: Infinity,
  });
}

export function useSavePaymentSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveSettings,
    onSuccess: (_, variables) => {
      queryClient.setQueryData(['payment-settings'], variables);
    },
  });
}
