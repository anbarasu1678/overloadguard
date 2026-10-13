import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { UserProfile, UserRole } from '../types';

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    organization?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true });
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        set({ user: null, isLoading: false });
        return;
      }

      // Fetch user profile from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (profile) {
        set({
          user: {
            id: session.user.id,
            email: session.user.email,
            full_name: profile.full_name || 'System User',
            role: profile.role || 'fleet_owner',
            organization: profile.organization,
            created_at: profile.created_at,
          },
          isLoading: false,
        });
      } else {
        // Fallback to metadata if profile record is slightly delayed
        set({
          user: {
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || 'System User',
            role: session.user.user_metadata?.role || 'fleet_owner',
            organization: session.user.user_metadata?.organization,
          },
          isLoading: false,
        });
      }
    } catch (err: any) {
      console.error('[AuthStore] Initialization failed:', err);
      set({ user: null, isLoading: false, error: err.message });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      set({ isLoading: false, error: error.message });
      throw error;
    }

    if (data.user) {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      set({
        user: {
          id: data.user.id,
          email: data.user.email,
          full_name: profile?.full_name || data.user.user_metadata?.full_name || 'User',
          role: profile?.role || data.user.user_metadata?.role || 'fleet_owner',
          organization: profile?.organization || data.user.user_metadata?.organization,
        },
        isLoading: false,
      });
    }
  },

  register: async (email, password, fullName, role, organization) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          organization: organization || 'Logistics Fleet',
        },
      },
    });

    if (error) {
      set({ isLoading: false, error: error.message });
      throw error;
    }

    if (data.user) {
      // Profile trigger creates row, or we set local user
      set({
        user: {
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          role,
          organization,
        },
        isLoading: false,
      });
    }
  },

  logout: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({ user: null, isLoading: false, error: null });
  },

  setUser: (user) => set({ user }),
}));
