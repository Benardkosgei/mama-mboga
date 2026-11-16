import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const DEFAULT_SUPPORT_PHONE = '+254754008271';
export const DEFAULT_SUPPORT_WHATSAPP = '254754008271';

export interface AppSettings {
  support_phone: string;
  support_whatsapp: string;
}

async function fetchAppSettings(): Promise<AppSettings> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['support_phone', 'support_whatsapp']);

    if (error || !data) {
      return {
        support_phone: DEFAULT_SUPPORT_PHONE,
        support_whatsapp: DEFAULT_SUPPORT_WHATSAPP,
      };
    }

    const map: Record<string, string> = {};
    data.forEach((row: any) => { map[row.key] = row.value; });

    return {
      support_phone: map['support_phone'] ?? DEFAULT_SUPPORT_PHONE,
      support_whatsapp: map['support_whatsapp'] ?? DEFAULT_SUPPORT_WHATSAPP,
    };
  } catch {
    return {
      support_phone: DEFAULT_SUPPORT_PHONE,
      support_whatsapp: DEFAULT_SUPPORT_WHATSAPP,
    };
  }
}

export function useAppSettings() {
  return useQuery({
    queryKey: ['app-settings'],
    queryFn: fetchAppSettings,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUpdateAppSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('app_settings')
        .upsert({ key, value }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    },
  });
}
