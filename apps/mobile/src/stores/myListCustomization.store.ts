import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TaskViewCustomization {
  showThumbnails: boolean;
  showPriority: boolean;
  showFavorite: boolean;
  showTags: boolean;
  showDates: boolean;
  showCategoryLocation: boolean;
  showSubtasksProgress: boolean;
  showCollaborators: boolean;
  showDescription: boolean;
}

export interface AlbumViewCustomization {
  showThumbnails: boolean;
  showPriority: boolean;
  showTaskCount: boolean;
  showProgress: boolean;
  showBadges: boolean;
  showDate: boolean;
  showCollaborators: boolean;
  showDescription: boolean;
}

export type ViewModeType = 'list' | 'gallery' | 'compact';

export const DEFAULT_TASK_CUSTOMIZATION: Record<ViewModeType, TaskViewCustomization> = {
  list: {
    showThumbnails: true,
    showPriority: true,
    showFavorite: true,
    showTags: true,
    showDates: true,
    showCategoryLocation: true,
    showSubtasksProgress: true,
    showCollaborators: true,
    showDescription: false,
  },
  gallery: {
    showThumbnails: true,
    showPriority: true,
    showFavorite: true,
    showTags: true,
    showDates: true,
    showCategoryLocation: true,
    showSubtasksProgress: true,
    showCollaborators: true,
    showDescription: false,
  },
  compact: {
    showThumbnails: true,
    showPriority: true,
    showFavorite: true,
    showTags: false,
    showDates: false,
    showCategoryLocation: false,
    showSubtasksProgress: true,
    showCollaborators: false,
    showDescription: false,
  },
};

export const DEFAULT_ALBUM_CUSTOMIZATION: Record<ViewModeType, AlbumViewCustomization> = {
  list: {
    showThumbnails: true,
    showPriority: true,
    showTaskCount: true,
    showProgress: true,
    showBadges: true,
    showDate: false,
    showCollaborators: true,
    showDescription: false,
  },
  gallery: {
    showThumbnails: true,
    showPriority: true,
    showTaskCount: true,
    showProgress: true,
    showBadges: true,
    showDate: false,
    showCollaborators: true,
    showDescription: false,
  },
  compact: {
    showThumbnails: true,
    showPriority: false,
    showTaskCount: true,
    showProgress: false,
    showBadges: true,
    showDate: false,
    showCollaborators: false,
    showDescription: false,
  },
};

interface MyListCustomizationStore {
  taskViews: Record<ViewModeType, TaskViewCustomization>;
  albumViews: Record<ViewModeType, AlbumViewCustomization>;
  taskGroupByStatus: boolean;
  albumGroupByStatus: boolean;
  /** Favoritas (tareas) en 2 columnas dentro de la sección FAVORITAS. */
  taskFavoritesAsGrid: boolean;
  /** Favoritos (álbumes) en 2 columnas dentro de la sección FAVORITOS. */
  albumFavoritesAsGrid: boolean;
  setTaskOption: (mode: ViewModeType, key: keyof TaskViewCustomization, val: boolean) => void;
  setAlbumOption: (mode: ViewModeType, key: keyof AlbumViewCustomization, val: boolean) => void;
  setTaskGroupByStatus: (val: boolean) => void;
  setAlbumGroupByStatus: (val: boolean) => void;
  setTaskFavoritesAsGrid: (val: boolean) => void;
  setAlbumFavoritesAsGrid: (val: boolean) => void;
  resetTaskOptions: (mode?: ViewModeType) => void;
  resetAlbumOptions: (mode?: ViewModeType) => void;
}

const STORAGE_KEY = '@my_list_customization_v1';

export const useMyListCustomizationStore = create<MyListCustomizationStore>((set, get): MyListCustomizationStore => {
  /** Aplica el cambio y guarda el estado completo. */
  const update = (patch: Partial<MyListCustomizationStore>) => {
    set(patch);
    void persistState(get());
  };

  return {
    taskViews: { ...DEFAULT_TASK_CUSTOMIZATION },
    albumViews: { ...DEFAULT_ALBUM_CUSTOMIZATION },
    taskGroupByStatus: true,
    albumGroupByStatus: true,
    taskFavoritesAsGrid: true,
    albumFavoritesAsGrid: true,

    setTaskOption: (mode, key, val) => {
      const { taskViews } = get();
      update({ taskViews: { ...taskViews, [mode]: { ...taskViews[mode], [key]: val } } });
    },

    setAlbumOption: (mode, key, val) => {
      const { albumViews } = get();
      update({ albumViews: { ...albumViews, [mode]: { ...albumViews[mode], [key]: val } } });
    },

    setTaskGroupByStatus: (val) => update({ taskGroupByStatus: val }),
    setAlbumGroupByStatus: (val) => update({ albumGroupByStatus: val }),
    setTaskFavoritesAsGrid: (val) => update({ taskFavoritesAsGrid: val }),
    setAlbumFavoritesAsGrid: (val) => update({ albumFavoritesAsGrid: val }),

    resetTaskOptions: (mode) => {
      const { taskViews } = get();
      update({
        taskViews: mode
          ? { ...taskViews, [mode]: { ...DEFAULT_TASK_CUSTOMIZATION[mode] } }
          : { ...DEFAULT_TASK_CUSTOMIZATION },
      });
    },

    resetAlbumOptions: (mode) => {
      const { albumViews } = get();
      update({
        albumViews: mode
          ? { ...albumViews, [mode]: { ...DEFAULT_ALBUM_CUSTOMIZATION[mode] } }
          : { ...DEFAULT_ALBUM_CUSTOMIZATION },
      });
    },
  };
});

async function persistState(state: MyListCustomizationStore) {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        taskViews: state.taskViews,
        albumViews: state.albumViews,
        taskGroupByStatus: state.taskGroupByStatus,
        albumGroupByStatus: state.albumGroupByStatus,
        taskFavoritesAsGrid: state.taskFavoritesAsGrid,
        albumFavoritesAsGrid: state.albumFavoritesAsGrid,
      }),
    );
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
      taskGroupByStatus: typeof data.taskGroupByStatus === 'boolean' ? data.taskGroupByStatus : true,
      albumGroupByStatus: typeof data.albumGroupByStatus === 'boolean' ? data.albumGroupByStatus : true,
      taskFavoritesAsGrid: typeof data.taskFavoritesAsGrid === 'boolean' ? data.taskFavoritesAsGrid : true,
      albumFavoritesAsGrid: typeof data.albumFavoritesAsGrid === 'boolean' ? data.albumFavoritesAsGrid : true,
    });
  } catch {
    // Ignore error
  }
}

// Auto-hydrate on import
void hydrateMyListCustomization();
