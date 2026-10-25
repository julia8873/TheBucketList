import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { setAvatarUriResolver } from '@bucketlist/ui';
import { getSupabaseUrl, getSupabaseAnonKey, normalizeStorageUrl } from '../constants/urls';

setAvatarUriResolver((u) => normalizeStorageUrl(u));

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
    storage: isServer ? (dummyStorage as any) : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
