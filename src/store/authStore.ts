import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserRole, Profile } from '@/types';

interface AuthState {
  session: any;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (session: any) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      profile: null,
      isLoading: true,
      isAuthenticated: false,
      setSession: (session) => set({ session, isAuthenticated: !!session }),
      setProfile: (profile) => set({ profile, isAuthenticated: !!profile }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ session: null, profile: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ session: state.session, profile: state.profile }),
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
