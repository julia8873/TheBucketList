import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TaskViewCustomization {
  showPriority: boolean;
  showTags: boolean;
  showDates: boolean;
  showCategoryLocation: boolean;
  showSubtasksProgress: boolean;
  showDescription: boolean;
}

export interface AlbumViewCustomization {
  showPriority: boolean;
  showTaskCount: boolean;
  showProgress: boolean;
  showBadges: boolean;
  showDate: boolean;
  showDescription: boolean;
}

export type ViewModeType = 'list' | 'gallery' | 'compact';

export const DEFAULT_TASK_CUSTOMIZATION: Record<ViewModeType, TaskViewCustomization> = {
  list: {
    showPriority: true,
    showTags: true,
    showDates: true,
    showCategoryLocation: true,
    showSubtasksProgress: true,
    showDescription: false,
  },
  gallery: {
    showPriority: true,
    showTags: true,
    showDates: true,
    showCategoryLocation: true,
    showSubtasksProgress: true,
    showDescription: false,
  },
  compact: {
    showPriority: true,
    showTags: false,
    showDates: false,
    showCategoryLocation: false,
    showSubtasksProgress: true,
    showDescription: false,
  },
};

export const DEFAULT_ALBUM_CUSTOMIZATION: Record<ViewModeType, AlbumViewCustomization> = {
  list: {
    showPriority: true,
    showTaskCount: true,
    showProgress: true,
    showBadges: true,
    showDate: false,
    showDescription: false,
  },
  gallery: {
    showPriority: true,
    showTaskCount: true,
    showProgress: true,
    showBadges: true,
    showDate: false,
    showDescription: false,
  },
  compact: {
    showPriority: false,
    showTaskCount: true,
    showProgress: false,
    showBadges: true,
    showDate: false,
    showDescription: false,
  },
};

interface MyListCustomizationStore {
  taskViews: Record<ViewModeType, TaskViewCustomization>;
  albumViews: Record<ViewModeType, AlbumViewCustomization>;
  setTaskOption: (mode: ViewModeType, key: keyof TaskViewCustomization, val: boolean) => void;
  setAlbumOption: (mode: ViewModeType, key: keyof AlbumViewCustomization, val: boolean) => void;
  resetTaskOptions: (mode?: ViewModeType) => void;
  resetAlbumOptions: (mode?: ViewModeType) => void;
}

const STORAGE_KEY = '@my_list_customization_v1';

export const useMyListCustomizationStore = create<MyListCustomizationStore>((set, get) => ({
  taskViews: { ...DEFAULT_TASK_CUSTOMIZATION },
  albumViews: { ...DEFAULT_ALBUM_CUSTOMIZATION },

  setTaskOption: (mode, key, val) => {
    set((state) => {
      const nextTaskViews = {
        ...state.taskViews,
        [mode]: {
          ...state.taskViews[mode],
          [key]: val,
        },
      };
      void persistState(nextTaskViews, state.albumViews);
      return { taskViews: nextTaskViews };
    });
  },

  setAlbumOption: (mode, key, val) => {
    set((state) => {
      const nextAlbumViews = {
        ...state.albumViews,
        [mode]: {
          ...state.albumViews[mode],
          [key]: val,
        },
      };
      void persistState(state.taskViews, nextAlbumViews);
      return { albumViews: nextAlbumViews };
    });
  },

  resetTaskOptions: (mode) => {
    set((state) => {
      const nextTaskViews = mode
        ? { ...state.taskViews, [mode]: { ...DEFAULT_TASK_CUSTOMIZATION[mode] } }
        : { ...DEFAULT_TASK_CUSTOMIZATION };
      void persistState(nextTaskViews, state.albumViews);
      return { taskViews: nextTaskViews };
    });
  },

  resetAlbumOptions: (mode) => {
    set((state) => {
      const nextAlbumViews = mode
        ? { ...state.albumViews, [mode]: { ...DEFAULT_ALBUM_CUSTOMIZATION[mode] } }
        : { ...DEFAULT_ALBUM_CUSTOMIZATION };
      void persistState(state.taskViews, nextAlbumViews);
      return { albumViews: nextAlbumViews };
    });
  },
}));

async function persistState(taskViews: any, albumViews: any) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ taskViews, albumViews }));
  } catch {
    // Ignore storage errors
  }
}

export async function hydrateMyListCustomization(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    useMyListCustomizationStore.setState({
      taskViews: {
        list: { ...DEFAULT_TASK_CUSTOMIZATION.list, ...(data.taskViews?.list ?? {}) },
        gallery: { ...DEFAULT_TASK_CUSTOMIZATION.gallery, ...(data.taskViews?.gallery ?? {}) },
        compact: { ...DEFAULT_TASK_CUSTOMIZATION.compact, ...(data.taskViews?.compact ?? {}) },
      },
      albumViews: {
        list: { ...DEFAULT_ALBUM_CUSTOMIZATION.list, ...(data.albumViews?.list ?? {}) },
        gallery: { ...DEFAULT_ALBUM_CUSTOMIZATION.gallery, ...(data.albumViews?.gallery ?? {}) },
        compact: { ...DEFAULT_ALBUM_CUSTOMIZATION.compact, ...(data.albumViews?.compact ?? {}) },
      },
    });
  } catch {
    // Ignore error
  }
}

// Auto-hydrate on import
void hydrateMyListCustomization();
