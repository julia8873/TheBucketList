import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DailyTaskCustomization {
  showPriority: boolean;
  showTags: boolean;
  showDates: boolean;
  showSubtasksProgress: boolean;
  showRecurrence: boolean;
  showDescription: boolean;
}

export const DEFAULT_DAILY_TASK_CUSTOMIZATION: DailyTaskCustomization = {
  showPriority: true,
  showTags: true,
  showDates: true,
  showSubtasksProgress: true,
  showRecurrence: true,
  showDescription: true,
};

interface DailyTasksCustomizationStore {
  customization: DailyTaskCustomization;
  setOption: (key: keyof DailyTaskCustomization, val: boolean) => void;
  resetOptions: () => void;
}

const STORAGE_KEY = '@daily_tasks_customization_v1';

export const useDailyTasksCustomizationStore = create<DailyTasksCustomizationStore>((set) => ({
  customization: { ...DEFAULT_DAILY_TASK_CUSTOMIZATION },

  setOption: (key, val) => {
    set((state) => {
      const nextCustomization = {
        ...state.customization,
        [key]: val,
      };
      void persistState(nextCustomization);
      return { customization: nextCustomization };
    });
  },

  resetOptions: () => {
    set(() => {
      const nextCustomization = { ...DEFAULT_DAILY_TASK_CUSTOMIZATION };
      void persistState(nextCustomization);
      return { customization: nextCustomization };
    });
  },
}));

async function persistState(customization: DailyTaskCustomization) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customization));
  } catch {
    // Ignore storage errors
  }
}

export async function hydrateDailyTasksCustomization(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      useDailyTasksCustomizationStore.setState({
        customization: {
          ...DEFAULT_DAILY_TASK_CUSTOMIZATION,
          ...parsed,
        },
      });
    }
  } catch {
    // Ignore hydration errors
  }
}

// Auto-hydrate on import
void hydrateDailyTasksCustomization();
