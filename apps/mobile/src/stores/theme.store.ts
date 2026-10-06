import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ColorScheme } from '@bucketlist/ui';

interface ThemeStore {
  override: ColorScheme | 'system';
  setOverride: (scheme: ColorScheme | 'system') => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  override: 'dark',
  setOverride: (scheme) => {
    set({ override: scheme });
    if (typeof window !== 'undefined') {
      void AsyncStorage.setItem('@theme_override', scheme);
    }
  },
}));

/** Call this at app startup to restore persisted preference */
export async function hydrateThemeStore(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const stored = await AsyncStorage.getItem('@theme_override');
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      useThemeStore.setState({ override: stored });
    }
  } catch {
    // ignore
  }
}
