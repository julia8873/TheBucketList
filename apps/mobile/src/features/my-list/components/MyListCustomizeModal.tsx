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
    taskGroupBy,
    albumGroupBy,
    taskGalleryColumns,
    albumGalleryColumns,
    setTaskGalleryColumns,
    setAlbumGalleryColumns,
    setTaskOption,
    setAlbumOption,
    setTaskGroupBy,
    setAlbumGroupBy,
    resetTaskOptions,
    resetAlbumOptions,
  } = useMyListCustomizationStore();

  const taskCfg = taskViews[mode] ?? taskViews.list;
  const albumCfg = albumViews[mode] ?? albumViews.list;

  const handleReset = () => {
    if (isTasks) {
      resetTaskOptions(mode);
    } else {
      resetAlbumOptions(mode);
    }
  };

  const currentGroupBy = isTasks ? taskGroupBy : albumGroupBy;
  const setGroupBy = isTasks ? setTaskGroupBy : setAlbumGroupBy;

  const taskOptions: Array<{ key: TaskKey; label: string }> = useMemo(() => [
    { key: 'showThumbnails', label: t('my_list.customize_opt_thumbnails', { defaultValue: 'Miniaturas de imagen' }) },
    { key: 'showStatus', label: t('my_list.customize_opt_status', { defaultValue: 'Insignia de estado' }) },
    { key: 'showPriority', label: t('my_list.customize_opt_priority') },
    { key: 'showVisibility', label: t('my_list.customize_opt_visibility', { defaultValue: 'Visibilidad' }) },
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
    { key: 'showVisibility' as AlbumKey, label: t('my_list.customize_opt_visibility', { defaultValue: 'Visibilidad' }) },
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
            value={currentGroupBy === 'status'}
            onChange={(v) => setGroupBy(v ? 'status' : 'none')}
          />
          <SheetToggle
            theme={theme}
            label={t('my_list.customize_opt_group_by_priority', { defaultValue: 'Separar por prioridad' })}
            value={currentGroupBy === 'priority'}
            onChange={(v) => setGroupBy(v ? 'priority' : 'none')}
          />
          <SheetToggle
            theme={theme}
            label={t('my_list.customize_opt_group_by_visibility', { defaultValue: 'Separar por visibilidad' })}
            value={currentGroupBy === 'visibility'}
            onChange={(v) => setGroupBy(v ? 'visibility' : 'none')}
          />
          {mode === 'gallery' && (
            <View
              style={{
                height: 48,
                paddingHorizontal: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTopWidth: 1,
                borderTopColor: theme.colors.border,
              }}
            >
              <Text
                style={{
                  color: theme.colors.foreground,
                  fontSize: 13,
                  fontFamily: 'Inter_400Regular',
                  flexShrink: 1,
                  paddingRight: 12,
                }}
              >
                {t('my_list.gallery_columns_label', { defaultValue: 'Número de columnas' })}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {([2, 3, 4] as const).map((cols) => {
                  const active = (isTasks ? (taskGalleryColumns ?? 3) : (albumGalleryColumns ?? 3)) === cols;
                  return (
                    <Pressable
                      key={cols}
                      onPress={() => (isTasks ? setTaskGalleryColumns(cols) : setAlbumGalleryColumns(cols))}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        borderRadius: 8,
                        backgroundColor: active ? theme.colors.primary : (theme.dark ? '#222222' : '#ECECEC'),
                        borderWidth: 1,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${cols} ${t('my_list.gallery_columns_label', { defaultValue: 'columnas' })}`}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '700',
                          fontFamily: 'Inter_600SemiBold',
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
          )}
        </SheetGroup>
      </View>

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

