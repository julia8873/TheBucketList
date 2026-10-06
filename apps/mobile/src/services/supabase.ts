import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabaseUrl, getSupabaseAnonKey } from '../constants/urls';

const isServer = typeof window === 'undefined';
const dummyStorage = {
  getItem: (key: string) => Promise.resolve(null),
  setItem: (key: string, value: string) => Promise.resolve(),
  removeItem: (key: string) => Promise.resolve(),
};

/**
 * Typed Supabase client singleton.
 * Database types will be generated (Phase 2) and injected here.
 */
export const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
  auth: {
    storage: isServer ? dummyStorage as any : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
