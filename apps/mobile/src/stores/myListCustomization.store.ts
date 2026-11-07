import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TaskViewCustomization {
  showThumbnails: boolean;
  showPriority: boolean;
  showVisibility?: boolean;
  showStatus?: boolean;
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
  showVisibility?: boolean;
  showStatus?: boolean;
  showTaskCount: boolean;
  showProgress: boolean;
  showBadges: boolean;
  showDate: boolean;
  showCollaborators: boolean;
  showDescription: boolean;
}

export type ViewModeType = 'list' | 'gallery' | 'compact';
export type GalleryColumns = 2 | 3 | 4;
export type GroupByOption = 'status' | 'priority' | 'visibility' | 'none';

export const DEFAULT_TASK_CUSTOMIZATION: Record<ViewModeType, TaskViewCustomization> = {
  list: {
    showThumbnails: true,
    showPriority: true,
    showVisibility: true,
    showStatus: true,
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
    showVisibility: true,
    showStatus: true,
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
    showVisibility: true,
    showStatus: true,
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
    showVisibility: true,
    showStatus: true,
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
    showVisibility: true,
    showStatus: true,
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
    showVisibility: true,
    showStatus: true,
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
  taskGroupBy: GroupByOption;
  albumGroupBy: GroupByOption;
  taskGroupByStatus: boolean;
  albumGroupByStatus: boolean;
  /** Favoritas (tareas) en 2 columnas dentro de la sección FAVORITAS. */
  taskFavoritesAsGrid: boolean;
  /** Favoritos (álbumes) en 2 columnas dentro de la sección FAVORITOS. */
  albumFavoritesAsGrid: boolean;
  /** Columnas en modo galería para tareas (2, 3 o 4). */
  taskGalleryColumns: GalleryColumns;
  /** Columnas en modo galería para álbumes (2, 3 o 4). */
  albumGalleryColumns: GalleryColumns;
  setTaskOption: (mode: ViewModeType, key: keyof TaskViewCustomization, val: boolean) => void;
  setAlbumOption: (mode: ViewModeType, key: keyof AlbumViewCustomization, val: boolean) => void;
  setTaskGalleryColumns: (cols: GalleryColumns) => void;
  setAlbumGalleryColumns: (cols: GalleryColumns) => void;
  setTaskGroupBy: (val: GroupByOption) => void;
  setAlbumGroupBy: (val: GroupByOption) => void;
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
    taskGroupBy: 'status',
    albumGroupBy: 'status',
    taskGroupByStatus: true,
    albumGroupByStatus: true,
    taskFavoritesAsGrid: true,
    albumFavoritesAsGrid: true,
    taskGalleryColumns: 3,
    albumGalleryColumns: 3,

    setTaskOption: (mode, key, val) => {
      const { taskViews } = get();
      update({ taskViews: { ...taskViews, [mode]: { ...taskViews[mode], [key]: val } } });
    },

    setAlbumOption: (mode, key, val) => {
      const { albumViews } = get();
      update({ albumViews: { ...albumViews, [mode]: { ...albumViews[mode], [key]: val } } });
    },

    setTaskGalleryColumns: (cols) => update({ taskGalleryColumns: cols }),
    setAlbumGalleryColumns: (cols) => update({ albumGalleryColumns: cols }),

    setTaskGroupBy: (val) => update({ taskGroupBy: val, taskGroupByStatus: val === 'status' }),
    setAlbumGroupBy: (val) => update({ albumGroupBy: val, albumGroupByStatus: val === 'status' }),
    setTaskGroupByStatus: (val) => update({ taskGroupBy: val ? 'status' : 'none', taskGroupByStatus: val }),
    setAlbumGroupByStatus: (val) => update({ albumGroupBy: val ? 'status' : 'none', albumGroupByStatus: val }),
    setTaskFavoritesAsGrid: (val) => update({ taskFavoritesAsGrid: val }),
    setAlbumFavoritesAsGrid: (val) => update({ albumFavoritesAsGrid: val }),

    resetTaskOptions: (mode) => {
      const { taskViews } = get();
      update({
        taskViews: mode
          ? { ...taskViews, [mode]: { ...DEFAULT_TASK_CUSTOMIZATION[mode] } }
          : { ...DEFAULT_TASK_CUSTOMIZATION },
        taskGroupBy: 'status',
        taskGroupByStatus: true,
        ...(mode === 'gallery' || !mode ? { taskGalleryColumns: 3 } : {}),
      });
    },

    resetAlbumOptions: (mode) => {
      const { albumViews } = get();
      update({
        albumViews: mode
          ? { ...albumViews, [mode]: { ...DEFAULT_ALBUM_CUSTOMIZATION[mode] } }
          : { ...DEFAULT_ALBUM_CUSTOMIZATION },
        albumGroupBy: 'status',
        albumGroupByStatus: true,
        ...(mode === 'gallery' || !mode ? { albumGalleryColumns: 3 } : {}),
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
        taskGroupBy: state.taskGroupBy,
        albumGroupBy: state.albumGroupBy,
        taskGroupByStatus: state.taskGroupBy === 'status',
        albumGroupByStatus: state.albumGroupBy === 'status',
        taskFavoritesAsGrid: state.taskFavoritesAsGrid,
        albumFavoritesAsGrid: state.albumFavoritesAsGrid,
        taskGalleryColumns: state.taskGalleryColumns,
        albumGalleryColumns: state.albumGalleryColumns,
      }),
    );
  } catch {
    // Ignore storage errors
  }
}

const MIGRATION_COLS_V3_KEY = '@my_list_default_v3_cols_migrated';

export async function hydrateMyListCustomization(): Promise<void> {
  try {
    const colsMigrated = await AsyncStorage.getItem(MIGRATION_COLS_V3_KEY);
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};

    const initialTaskCols = !colsMigrated
      ? 3
      : [2, 3, 4].includes(data.taskGalleryColumns)
      ? data.taskGalleryColumns
      : 3;
    const initialAlbumCols = !colsMigrated
      ? 3
      : [2, 3, 4].includes(data.albumGalleryColumns)
      ? data.albumGalleryColumns
      : 3;

    if (!colsMigrated) {
      await AsyncStorage.setItem(MIGRATION_COLS_V3_KEY, 'true');
    }

    let taskGroupBy: GroupByOption = 'status';
    if (data.taskGroupBy && ['status', 'priority', 'visibility', 'none'].includes(data.taskGroupBy)) {
      taskGroupBy = data.taskGroupBy;
    } else if (typeof data.taskGroupByStatus === 'boolean') {
      taskGroupBy = data.taskGroupByStatus ? 'status' : 'none';
    }

    let albumGroupBy: GroupByOption = 'status';
    if (data.albumGroupBy && ['status', 'priority', 'visibility', 'none'].includes(data.albumGroupBy)) {
      albumGroupBy = data.albumGroupBy;
    } else if (typeof data.albumGroupByStatus === 'boolean') {
      albumGroupBy = data.albumGroupByStatus ? 'status' : 'none';
    }

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
      taskGroupBy,
      albumGroupBy,
      taskGroupByStatus: taskGroupBy === 'status',
      albumGroupByStatus: albumGroupBy === 'status',
      taskFavoritesAsGrid: typeof data.taskFavoritesAsGrid === 'boolean' ? data.taskFavoritesAsGrid : true,
      albumFavoritesAsGrid: typeof data.albumFavoritesAsGrid === 'boolean' ? data.albumFavoritesAsGrid : true,
      taskGalleryColumns: initialTaskCols,
      albumGalleryColumns: initialAlbumCols,
    });
  } catch {
    // Ignore error
  }
}

// Auto-hydrate on import
void hydrateMyListCustomization();
