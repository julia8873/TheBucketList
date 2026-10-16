import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

interface HapticsStore {
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
  triggerTaskCompletedHaptic: () => void;
}

export const useHapticsStore = create<HapticsStore>((set, get) => ({
  hapticsEnabled: true,
  setHapticsEnabled: (enabled) => {
    set({ hapticsEnabled: enabled });
    void AsyncStorage.setItem('@haptics_enabled', JSON.stringify(enabled)).catch(() => undefined);
  },
  triggerTaskCompletedHaptic: () => {
    if (get().hapticsEnabled) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
  },
}));

/** Llamar al arrancar la app para restaurar la preferencia de vibración */
export async function hydrateHapticsStore(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem('@haptics_enabled');
    if (stored !== null) {
      useHapticsStore.setState({ hapticsEnabled: JSON.parse(stored) });
    }
  } catch {
    // ignorar
  }
}

/** Dispara una vibración háptica ligera si la opción está activada */
export function triggerTaskCompletedHaptic(): void {
  useHapticsStore.getState().triggerTaskCompletedHaptic();
}
