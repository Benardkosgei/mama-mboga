import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserRole, Profile } from '@/types';

interface AuthState {
  session: any;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOutError: string | null;
  setSession: (session: any) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  clearSignOutError: () => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      profile: null,
      isLoading: true,
      isAuthenticated: false,
      signOutError: null,
      setSession: (session) => set((state) => ({ 
        session, 
        isAuthenticated: !!session && !!state.profile 
      })),
      setProfile: (profile) => set((state) => ({ 
        profile, 
        isAuthenticated: !!profile && !!state.session 
      })),
      setLoading: (isLoading) => set({ isLoading }),
      clearSignOutError: () => set({ signOutError: null }),
      logout: async () => {
        // Clear local state first for immediate UX; still attempt remote sign-out.
        set({ session: null, profile: null, isAuthenticated: false });
        try {
          const { supabase } = await import('@/lib/supabase');
          const { error } = await supabase.auth.signOut();
          if (error) {
            set({ signOutError: error.message });
          } else {
            set({ signOutError: null });
          }
        } catch (error: any) {
          set({ signOutError: error?.message || 'Failed to sign out from server session.' });
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist session and profile — never persist isLoading.
      // isLoading always starts as true and is resolved by the auth listener.
      partialize: (state) => ({ session: state.session, profile: state.profile }),
      onRehydrateStorage: () => (state) => {
        // After rehydration, ensure isLoading is true so the auth listener
        // in _layout.tsx always runs and resolves it.
        if (state) {
          state.isLoading = true;
        }
      },
    }
  )
);

interface AppState {
  selectedRole: UserRole | null;
  isAdminMode: boolean;
  defaultAddressId: string | null;
  setSelectedRole: (role: UserRole | null) => void;
  setIsAdminMode: (isAdmin: boolean) => void;
  setDefaultAddressId: (id: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedRole: null,
      isAdminMode: false,
      defaultAddressId: null,
      setSelectedRole: (role) => set({ selectedRole: role }),
      setIsAdminMode: (isAdmin) => set({ isAdminMode: isAdmin }),
      setDefaultAddressId: (id) => set({ defaultAddressId: id }),
    }),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
