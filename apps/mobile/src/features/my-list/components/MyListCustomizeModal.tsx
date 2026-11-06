/**
 * «Personalizar vista» — mismo diseño que en Mi_lista.html:
 *  hoja inferior con asa, título, grupos de interruptores («Secciones» y «Elementos visibles»)
 *  y botón principal «Listo». Se aplica a la pestaña (Tareas / Álbumes) y al modo de vista actuales.
 */
import React, { useMemo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTranslation } from '@bucketlist/shared';
import { useTheme } from '@bucketlist/ui';
import {
  useMyListCustomizationStore,
  type ViewModeType,
  type TaskViewCustomization,
  type AlbumViewCustomization,
} from '@/stores/myListCustomization.store';
import { SheetFrame, SheetGroup, SheetLabel, SheetToggle } from './ListControls';

interface MyListCustomizeModalProps {
  visible: boolean;
  onClose: () => void;
  initialTab?: 'tasks' | 'albums';
  initialMode?: ViewModeType;
}

type TaskKey = keyof TaskViewCustomization;
type AlbumKey = keyof AlbumViewCustomization;

function MyListCustomizeModalComponent({
  visible,
  onClose,
  initialTab = 'tasks',
  initialMode = 'list',
}: MyListCustomizeModalProps) {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const isTasks = initialTab === 'tasks';
  const mode = initialMode;

  const {
    taskViews,
    albumViews,
    taskGroupByStatus,
    albumGroupByStatus,
    taskFavoritesAsGrid,
    albumFavoritesAsGrid,
    taskGalleryColumns,
    setTaskGalleryColumns,
    setTaskOption,
    setAlbumOption,
    setTaskGroupByStatus,
    setAlbumGroupByStatus,
    setTaskFavoritesAsGrid,
    setAlbumFavoritesAsGrid,
    resetTaskOptions,
    resetAlbumOptions,
  } = useMyListCustomizationStore();

  const taskCfg = taskViews[mode] ?? taskViews.list;
  const albumCfg = albumViews[mode] ?? albumViews.list;

  const handleReset = () => {
    if (isTasks) {
      resetTaskOptions(mode);
      setTaskGroupByStatus(true);
      setTaskFavoritesAsGrid(true);
    } else {
      resetAlbumOptions(mode);
      setAlbumGroupByStatus(true);
      setAlbumFavoritesAsGrid(true);
    }
  };

  const groupByStatus = isTasks ? taskGroupByStatus : albumGroupByStatus;
  const favoritesAsGrid = isTasks ? taskFavoritesAsGrid : albumFavoritesAsGrid;

  const taskOptions: Array<{ key: TaskKey; label: string }> = useMemo(() => [
    { key: 'showThumbnails', label: t('my_list.customize_opt_thumbnails', { defaultValue: 'Miniaturas de imagen' }) },
    { key: 'showStatus', label: t('my_list.customize_opt_status', { defaultValue: 'Insignia de estado' }) },
    { key: 'showPriority', label: t('my_list.customize_opt_priority') },
    { key: 'showFavorite', label: t('my_list.customize_opt_favorite') },
    { key: 'showTags', label: t('my_list.customize_opt_tags') },
    { key: 'showDates', label: t('my_list.customize_opt_dates', { defaultValue: 'Fechas límite' }) },
    { key: 'showCategoryLocation', label: t('my_list.customize_opt_cat_loc', { defaultValue: 'Lugar' }) },
    { key: 'showSubtasksProgress', label: t('my_list.customize_opt_subtasks') },
    { key: 'showCollaborators', label: t('my_list.customize_opt_collaborators', { defaultValue: 'Colaboradores' }) },
    { key: 'showDescription', label: t('my_list.customize_opt_desc') },
  ], [t]);

  const albumOptions: Array<{ key: AlbumKey; label: string }> = useMemo(() => [
    // En la vista de galería el álbum siempre se pinta con su portada.
    ...(mode === 'gallery'
      ? []
      : [
          {
            key: 'showThumbnails' as AlbumKey,
            label: t('my_list.customize_opt_thumbnails', { defaultValue: 'Miniaturas de imagen' }),
          },
        ]),
    { key: 'showBadges', label: t('my_list.customize_opt_status', { defaultValue: 'Insignia de estado' }) },
    { key: 'showPriority', label: t('my_list.customize_opt_album_priority') },
    { key: 'showTaskCount', label: t('my_list.customize_opt_album_task_count') },
    { key: 'showProgress', label: t('my_list.customize_opt_album_progress') },
    { key: 'showDate', label: t('my_list.customize_opt_album_date') },
    { key: 'showCollaborators', label: t('my_list.customize_opt_album_collaborators', { defaultValue: 'Colaboradores' }) },
    { key: 'showDescription', label: t('my_list.customize_opt_album_desc') },
  ], [t, mode]);

  return (
    <SheetFrame
      visible={visible}
      onClose={onClose}
      theme={theme}
      title={t('my_list.customize_view')}
      action={{ label: t('my_list.customize_reset', { defaultValue: 'Restablecer' }), onPress: handleReset }}
      footerLabel={t('my_list.customize_done')}
    >
      <View>
        <SheetLabel theme={theme}>{t('my_list.customize_section_sections', { defaultValue: 'Secciones' })}</SheetLabel>
        <SheetGroup theme={theme}>
          <SheetToggle
            theme={theme}
            label={t(isTasks ? 'my_list.customize_opt_group_by_status' : 'my_list.customize_opt_album_group_by_status')}
            value={groupByStatus}
            onChange={isTasks ? setTaskGroupByStatus : setAlbumGroupByStatus}
          />
          {groupByStatus ? (
            <SheetToggle
              theme={theme}
              label={t(
                isTasks ? 'my_list.customize_opt_favorites_grid' : 'my_list.customize_opt_album_favorites_grid',
                { defaultValue: isTasks ? 'Favoritas en 2 columnas' : 'Favoritos en 2 columnas' },
              )}
              value={favoritesAsGrid}
              onChange={isTasks ? setTaskFavoritesAsGrid : setAlbumFavoritesAsGrid}
            />
          ) : null}
        </SheetGroup>
      </View>

      {isTasks && mode === 'gallery' && (
        <View>
          <SheetLabel theme={theme}>{t('my_list.customize_gallery_columns', { defaultValue: 'Columnas' })}</SheetLabel>
          <SheetGroup theme={theme}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ fontSize: 15, color: theme.colors.foreground, fontFamily: 'Inter_500Medium' }}>
                {t('my_list.gallery_columns_label', { defaultValue: 'Número de columnas' })}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([2, 3, 4] as const).map((cols) => {
                  const active = (taskGalleryColumns ?? 2) === cols;
                  return (
                    <Pressable
                      key={cols}
                      onPress={() => setTaskGalleryColumns(cols)}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                        borderRadius: 10,
                        backgroundColor: active ? theme.colors.primary : (theme.dark ? '#222222' : '#ECECEC'),
                        borderWidth: 1,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '700',
                          color: active ? theme.colors.primaryForeground : theme.colors.foregroundMuted,
                        }}
                      >
                        {cols}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </SheetGroup>
        </View>
      )}

      <View>
        <SheetLabel theme={theme}>{t('my_list.customize_section_elements')}</SheetLabel>
        <SheetGroup theme={theme}>
          {isTasks
            ? taskOptions.map((o) => (
                <SheetToggle
                  key={o.key}
                  theme={theme}
                  label={o.label}
                  value={!!taskCfg[o.key]}
                  onChange={(v) => setTaskOption(mode, o.key, v)}
                />
              ))
            : albumOptions.map((o) => (
                <SheetToggle
                  key={o.key}
                  theme={theme}
                  label={o.label}
                  value={!!albumCfg[o.key]}
                  onChange={(v) => setAlbumOption(mode, o.key, v)}
                />
              ))}
        </SheetGroup>
      </View>
    </SheetFrame>
  );
}

export const MyListCustomizeModal = React.memo(MyListCustomizeModalComponent);

