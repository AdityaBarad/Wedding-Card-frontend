import { create } from 'zustand';
import { supabase } from '../lib/supabase';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    
    if (data.user) {
      // Get or create user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .upsert(
          { id: data.user.id },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (profileError) throw profileError;
      
      set({ user: { ...data.user, ...profile } });
    }
  },
  signUp: async (email, password, fullName) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    if (authError) throw authError;

    if (authData.user) {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .insert([{ id: authData.user.id, full_name: fullName }])
        .select()
        .single();
      
      if (profileError) throw profileError;
      set({ user: { ...authData.user, ...profile } });
    }
  },
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null });
  },
  setUser: async (user) => {
    if (user) {
      // Get or create user profile when setting user (e.g., on page load)
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .upsert(
          { id: user.id },
          { onConflict: 'id' }
        )
        .select()
        .single();

      if (!profileError) {
        set({ user: { ...user, ...profile } });
        return;
      }
    }
    set({ user });
  },
}));