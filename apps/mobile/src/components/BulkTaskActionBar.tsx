import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { confirm, toast } from '@bucketlist/ui';
import {
  FolderInput,
  Tag as TagIcon,
  UserPlus,
  CheckCircle2,
  MoreHorizontal,
  X,
} from 'lucide-react-native';
import { useBulkTaskOperations } from '../hooks/useBulkTaskOperations';
import { useAlbums } from '../hooks/useAlbums';
import { useAlbumSync, type AlbumSyncChanges } from '../hooks/useAlbumSync';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';
import { CollaboratorPickerSheet, type CollaboratorItem } from './CollaboratorPickerSheet';

import { styles } from '../features/bulk-task-actions/styles/bulk-actions.styles';
import { BulkMoveModal } from '../features/bulk-task-actions/components/BulkMoveModal';
import { BulkTagsSheet } from './BulkTagsSheet';
import { BulkMoreMenuModal } from '../features/bulk-task-actions/components/BulkMoreMenuModal';
import { BulkPriorityModal, BulkVisibilityModal } from '../features/bulk-task-actions/components/BulkMetaModals';
import { useTranslation } from '@bucketlist/shared';

interface BulkTaskActionBarProps {
  selectedIds: string[];
  totalTasksCount?: number;
  onClearSelection: () => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
}

export function BulkTaskActionBar({
  selectedIds,
  totalTasksCount = 0,
  onClearSelection,
  onSelectAll,
  isAllSelected = false,
}: BulkTaskActionBarProps) {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const count = selectedIds.length;

  const {
    moveTasksToAlbum,
    assignTagsToTasks,
    shareTasksWithUser,
    completeAllTasks,
    reopenAllTasks,
    deleteAllTasks,
    clearNotificationsForTasks,
    changePriorityForTasks,
    changeVisibilityForTasks,
    setFavoritesForTasks,
  } = useBulkTaskOperations();

  const { data: albums = [] } = useAlbums(user?.id);
  const { askAlbumSync, albumSyncSheet } = useAlbumSync();

  // Modals state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showCollaboratorSheet, setShowCollaboratorSheet] = useState(false);
  const [showMoreMenuModal, setShowMoreMenuModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  if (count === 0) return null;

  const plural = count === 1 ? t('bulk_actions.selected_single') : t('bulk_actions.selected_plural', { count });
  const askBulk = (title: string, message: string, confirmLabel: string) =>
    confirm.ask({ title, message, confirmLabel, cancelLabel: t('common.cancel') });

  const handleMoveToAlbum = async (albumId: string | null) => {
    const targetAlbum = albumId ? albums.find((a: any) => a.id === albumId) : null;
    const albumName = targetAlbum?.title;

    const executeMove = async (changes: AlbumSyncChanges = {}) => {
      // Actualización optimista: la UI cambia al instante; el servidor se sincroniza detrás.
      const pending = moveTasksToAlbum.mutateAsync({
        taskIds: selectedIds,
        albumId,
        updateVisibility: changes.visibility,
        updatePriority: changes.priority,
      });
      setShowMoveModal(false);
      onClearSelection();
      toast.success(albumId ? t('bulk_actions.toast_moved_album') : t('bulk_actions.toast_removed_album'));
      try {
        await pending;
      } catch (e: any) {
        toast.error(e?.message || t('bulk_actions.move_error'));
      }
    };

    if (albumId && targetAlbum) {
      // Se compara cada tarea con el álbum (datos reales de la BD) y, si difiere su
      // visibilidad o prioridad, se pregunta si se igualan a las del álbum.
      const { data: rows } = await supabase
        .from('buckets')
        .select('id, visibility, priority')
        .in('id', selectedIds);
      const tasks = rows && rows.length > 0 ? rows : selectedIds.map(() => ({}));
      const answer = await askAlbumSync(targetAlbum, tasks);
      if (answer === null) return;
      await executeMove(answer);
      return;
    }

    const okMove = await askBulk(
      t('bulk_actions.confirm_move_title'),
      albumId
        ? t('bulk_actions.move_to_album_msg', { plural, albumName: albumName || '' })
        : t('bulk_actions.remove_from_album_msg', { plural }),
      t('bulk_actions.action_move'),
    );
    if (!okMove) return;
    await executeMove();
  };

  const handleAssignTags = async () => {
    if (!selectedTagIds.length) return;
    const okTags = await askBulk(
      t('bulk_actions.confirm_tags_title'),
      t(`bulk_actions.confirm_tags_msg_${selectedTagIds.length === 1 ? '1' : 'n'}_${count === 1 ? '1' : 'n'}`, {
        tags: selectedTagIds.length,
        items: count,
      }),
      t('common.confirm'),
    );
    if (!okTags) return;
    // Optimista: las etiquetas se ven al instante; el servidor se sincroniza detrás.
    const pending = assignTagsToTasks.mutateAsync({
      taskIds: selectedIds,
      tagIds: selectedTagIds,
    });
    setShowTagsModal(false);
    setSelectedTagIds([]);
    onClearSelection();
    toast.success(t('bulk_actions.toast_tags_assigned'));
    try {
      await pending;
    } catch (e: any) {
      toast.error(e?.message || t('bulk_actions.assign_tags_error', { defaultValue: 'No se pudieron asignar las etiquetas' }));
    }
  };

  const handleCollaboratorsSelected = async (collabs: CollaboratorItem[]) => {
    setShowCollaboratorSheet(false);
    if (!collabs.length) return;
    const friend = collabs[collabs.length - 1];
    if (!friend) return;
    const okShare = await askBulk(
      t('bulk_actions.confirm_share_title'),
      t('bulk_actions.confirm_share_msg', { name: friend.display_name || friend.username, plural }),
      t('bulk_actions.action_share'),
    );
    if (!okShare) return;
    try {
      await shareTasksWithUser.mutateAsync({
        taskIds: selectedIds,
        collaboratorId: friend.id,
      });
      onClearSelection();
      toast.success(t('bulk_actions.toast_shared', { name: friend.display_name || friend.username, count }));
    } catch (e: any) {
      toast.error(e?.message || t('bulk_actions.share_error'));
    }
  };

  const handleCompleteAll = () => {
    confirm.show({
      title: t('bulk_actions.confirm_complete_title'),
      message: t('bulk_actions.confirm_complete_msg', { count }),
      confirmLabel: t('bulk_actions.action_complete'),
      cancelLabel: t('common.cancel'),
      onConfirm: async () => {
        // Actualización optimista: la UI cambia al instante; el servidor se sincroniza detrás.
        const pending = completeAllTasks.mutateAsync(selectedIds);
        onClearSelection();
        toast.success(t('bulk_actions.toast_completed', { count }));
        try {
          await pending;
        } catch (e: any) {
          toast.error(e?.message || t('bulk_actions.complete_error', { defaultValue: 'Error al completar las tareas' }));
        }
      },
    });
  };

  const handleDeleteAll = () => {
    setShowMoreMenuModal(false);
    confirm.show({
      title: t('bulk_actions.confirm_delete_title'),
      message: t('bulk_actions.confirm_delete_msg', { count }),
      confirmLabel: t('bulk_actions.delete_all', { count }),
      cancelLabel: t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        // Actualización optimista: la UI cambia al instante; el servidor se sincroniza detrás.
        const pending = deleteAllTasks.mutateAsync(selectedIds);
        onClearSelection();
        toast.success(t('bulk_actions.toast_deleted', { count }));
        try {
          await pending;
        } catch (e: any) {
          toast.error(e?.message || t('bulk_actions.delete_error', { defaultValue: 'Error al eliminar las tareas' }));
        }
      },
    });
  };

  const handleClearNotifications = () => {
    setShowMoreMenuModal(false);
    confirm.show({
      title: t('bulk_actions.confirm_clear_notifications_title'),
      message: t('bulk_actions.confirm_clear_notifications_msg', { count }),
      confirmLabel: t('bulk_actions.clear_notifications'),
      cancelLabel: t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        try {
          await clearNotificationsForTasks.mutateAsync(selectedIds);
          onClearSelection();
          toast.success(t('bulk_actions.toast_notifications_cleared'));
        } catch (e: any) {
          toast.error(e?.message || t('bulk_actions.clear_notif_error', { defaultValue: 'Error al vaciar notificaciones' }));
        }
      },
    });
  };

  return (
    <>
      <View
        style={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom, 12) + 6 },
        ]}
        onStartShouldSetResponder={() => true}
      >
        <View style={styles.infoRow}>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>{count}</Text>
          </View>
          <Text style={styles.infoTitle}>
            {count === 1 ? t('bulk_actions.selected_single') : t('bulk_actions.selected_plural', { count })}
          </Text>

          <View style={styles.infoRight}>
            {onSelectAll && (
              <Pressable style={styles.selectAllBtn} onPress={onSelectAll} hitSlop={6}>
                <Text style={styles.selectAllText}>
                  {isAllSelected ? t('bulk_actions.deselect_all') : t('bulk_actions.select_all')}
                </Text>
              </Pressable>
            )}
            <Pressable
              style={styles.closeBtn}
              onPress={(e) => {
                e?.stopPropagation?.();
                onClearSelection();
              }}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('bulk_actions.close_label', { defaultValue: 'Cerrar selección' })}
            >
              <X size={18} color="#AAA" />
            </Pressable>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={styles.actionBtn} onPress={() => setShowMoveModal(true)}>
            <View style={styles.actionIconBox}>
              <FolderInput size={18} color={gold[400]} />
            </View>
            <Text style={styles.actionLabel}>{t('bulk_actions.action_move')}</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={() => setShowTagsModal(true)}>
            <View style={styles.actionIconBox}>
              <TagIcon size={18} color={gold[400]} />
            </View>
            <Text style={styles.actionLabel}>{t('bulk_actions.action_tags')}</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={() => setShowCollaboratorSheet(true)}>
            <View style={styles.actionIconBox}>
              <UserPlus size={18} color={gold[400]} />
            </View>
            <Text style={styles.actionLabel}>{t('bulk_actions.action_share')}</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={handleCompleteAll}>
            <View style={[styles.actionIconBox, { backgroundColor: '#13281A', borderColor: '#1F472B' }]}>
              <CheckCircle2 size={18} color="#34C759" />
            </View>
            <Text style={styles.actionLabel}>{t('bulk_actions.action_complete')}</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={() => setShowMoreMenuModal(true)}>
            <View style={styles.actionIconBox}>
              <MoreHorizontal size={18} color="#FFF" />
            </View>
            <Text style={styles.actionLabel}>{t('bulk_actions.action_more')}</Text>
          </Pressable>
        </View>
      </View>

      <BulkMoveModal
        visible={showMoveModal}
        count={count}
        albums={albums}
        onClose={() => setShowMoveModal(false)}
        onSelectAlbum={(albId) => void handleMoveToAlbum(albId)}
      />

      {/* Pregunta al mover a un álbum: igualar visibilidad y prioridad */}
      {albumSyncSheet}

      <BulkTagsSheet
        visible={showTagsModal}
        itemType="task"
        selectedTagIds={selectedTagIds}
        onChange={setSelectedTagIds}
        onClose={() => setShowTagsModal(false)}
        onApply={handleAssignTags}
      />

      {showCollaboratorSheet && (
        <CollaboratorPickerSheet
          visible={showCollaboratorSheet}
          selected={[]}
          onChange={handleCollaboratorsSelected}
          onClose={() => setShowCollaboratorSheet(false)}
        />
      )}

      <BulkMoreMenuModal
        visible={showMoreMenuModal}
        count={count}
        onClose={() => setShowMoreMenuModal(false)}
        onClearNotifications={handleClearNotifications}
        onChangePriority={() => {
          setShowMoreMenuModal(false);
          setShowPriorityModal(true);
        }}
        onChangeVisibility={() => {
          setShowMoreMenuModal(false);
          setShowVisibilityModal(true);
        }}
        onAddFavorites={async () => {
          setShowMoreMenuModal(false);
          const okFav = await askBulk(
            t('bulk_actions.add_favorites'),
            `Se marcarán como favoritas ${plural}.`,
            t('common.add'),
          );
          if (!okFav) return;
          try {
            await setFavoritesForTasks.mutateAsync({
              taskIds: selectedIds,
              favorite: true,
            });
            onClearSelection();
            toast.success(t('bulk_actions.toast_favorites_added', { count }));
          } catch (e: any) {
            toast.error(e?.message || t('bulk_actions.favorites_error', { defaultValue: 'Error al marcar como favoritas' }));
          }
        }}
        onReopenTasks={async () => {
          setShowMoreMenuModal(false);
          const okReopen = await askBulk(
            t('bulk_actions.reopen_tasks'),
            t('bulk_actions.reopen_confirm_msg', { plural, defaultValue: `Se volverán a marcar como pendientes ${plural}.` }),
            t('bulk_actions.reopen_tasks'),
          );
          if (!okReopen) return;
          // Actualización optimista: la UI cambia al instante; el servidor se sincroniza detrás.
          const pending = reopenAllTasks.mutateAsync(selectedIds);
          onClearSelection();
          toast.success(t('bulk_actions.toast_reopened', { count }));
          try {
            await pending;
          } catch (e: any) {
            toast.error(e?.message || t('bulk_actions.reopen_error', { defaultValue: 'Error al reabrir tareas' }));
          }
        }}
        onDeleteAll={handleDeleteAll}
      />

      <BulkPriorityModal
        visible={showPriorityModal}
        count={count}
        onClose={() => setShowPriorityModal(false)}
        onSelectPriority={async (p) => {
          setShowPriorityModal(false);
          const okPrio = await askBulk(
            t('bulk_actions.change_priority'),
            `Se cambiará la prioridad de ${plural}.`,
            t('common.save'),
          );
          if (!okPrio) return;
          // Actualización optimista: la UI cambia al instante; el servidor se sincroniza detrás.
          const pending = changePriorityForTasks.mutateAsync({
              taskIds: selectedIds,
              priority: p,
            });
          onClearSelection();
          toast.success(t('bulk_actions.toast_priority_updated'));
          try {
            await pending;
          } catch (e: any) {
            toast.error(e?.message || t('bulk_actions.priority_error', { defaultValue: 'Error al cambiar prioridad' }));
          }
        }}
      />

      <BulkVisibilityModal
        visible={showVisibilityModal}
        count={count}
        onClose={() => setShowVisibilityModal(false)}
        onSelectVisibility={async (v) => {
          setShowVisibilityModal(false);
          const okVis = await askBulk(
            t('bulk_actions.change_visibility'),
            `Se cambiará la visibilidad de ${plural}.`,
            t('common.save'),
          );
          if (!okVis) return;
          // Actualización optimista: la UI cambia al instante; el servidor se sincroniza detrás.
          const pending = changeVisibilityForTasks.mutateAsync({
              taskIds: selectedIds,
              visibility: v,
            });
          onClearSelection();
          toast.success(t('bulk_actions.toast_visibility_updated'));
          try {
            await pending;
          } catch (e: any) {
            toast.error(e?.message || t('bulk_actions.visibility_error', { defaultValue: 'Error al cambiar visibilidad' }));
          }
        }}
      />
    </>
  );
}
