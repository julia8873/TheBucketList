import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ColorScheme } from '@bucketlist/ui';

interface ThemeStore {
  override: ColorScheme | 'system';
  setOverride: (scheme: ColorScheme | 'system') => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  override: 'dark',
  setOverride: (scheme) => {
    set({ override: scheme });
    void AsyncStorage.setItem('@theme_override', scheme).catch(() => {});
  },
  toggleTheme: () => {
    const current = get().override;
    const next: ColorScheme = current === 'light' ? 'dark' : 'light';
    get().setOverride(next);
  },
}));

/** Call this at app startup to restore persisted preference */
export async function hydrateThemeStore(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem('@theme_override');
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      useThemeStore.setState({ override: stored });
    }
  } catch {
    // ignore
  }
}
