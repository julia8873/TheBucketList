import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CloneTaskFields {
  description: boolean;
  deadline: boolean;
  location: boolean;
  subtasks: boolean;
  cover: boolean;
}

export const DEFAULT_CLONE_FIELDS: CloneTaskFields = {
  description: true,
  deadline: true,
  location: true,
  subtasks: true,
  cover: true,
};

const STORAGE_KEY = '@clone_task_preferences';

export interface CloneTaskPreferencesStore {
  askEveryTime: boolean;
  fields: CloneTaskFields;
  isHydrated: boolean;
  setAskEveryTime: (ask: boolean) => void;
  setField: (field: keyof CloneTaskFields, value: boolean) => void;
  savePreferences: (askEveryTime: boolean, fields: CloneTaskFields) => void;
}

export const useCloneTaskPreferencesStore = create<CloneTaskPreferencesStore>((set, get) => ({
  askEveryTime: true,
  fields: { ...DEFAULT_CLONE_FIELDS },
  isHydrated: false,
  setAskEveryTime: (askEveryTime) => {
    set({ askEveryTime });
    persist(askEveryTime, get().fields);
  },
  setField: (field, value) => {
    const updated = { ...get().fields, [field]: value };
    set({ fields: updated });
    persist(get().askEveryTime, updated);
  },
  savePreferences: (askEveryTime, fields) => {
    set({ askEveryTime, fields });
    persist(askEveryTime, fields);
  },
}));

function persist(askEveryTime: boolean, fields: CloneTaskFields) {
  void AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ askEveryTime, fields })
  ).catch(() => undefined);
}

export async function hydrateCloneTaskPreferencesStore(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      useCloneTaskPreferencesStore.setState({
        askEveryTime: parsed.askEveryTime !== undefined ? parsed.askEveryTime : true,
        fields: { ...DEFAULT_CLONE_FIELDS, ...(parsed.fields || {}) },
        isHydrated: true,
      });
      return;
    }
  } catch {
    // ignorar
  }
  useCloneTaskPreferencesStore.setState({ isHydrated: true });
}

