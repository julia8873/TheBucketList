import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { confirm, toast } from '@bucketlist/ui';
import {
  Tag as TagIcon,
  UserPlus,
  CheckCircle2,
  FolderArchive,
  MoreHorizontal,
  X,
} from 'lucide-react-native';
import { useBulkAlbumOperations } from '../hooks/useBulkAlbumOperations';
import { useTags } from '../hooks/useTags';
import { CollaboratorPickerSheet, type CollaboratorItem } from './CollaboratorPickerSheet';

import { styles } from '../features/bulk-task-actions/styles/bulk-actions.styles';
import { BulkTagsModal } from '../features/bulk-task-actions/components/BulkTagsModal';
import { BulkAlbumMoreMenuModal } from '../features/bulk-album-actions/components/BulkAlbumMoreMenuModal';
import { BulkPriorityModal, BulkVisibilityModal } from '../features/bulk-task-actions/components/BulkMetaModals';
import { useTranslation } from '@bucketlist/shared';

interface BulkAlbumActionBarProps {
  selectedIds: string[];
  totalAlbumsCount?: number;
  onClearSelection: () => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
}

export function BulkAlbumActionBar({
  selectedIds,
  totalAlbumsCount = 0,
  onClearSelection,
  onSelectAll,
  isAllSelected = false,
}: BulkAlbumActionBarProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const count = selectedIds.length;

  const {
    assignTagsToAlbums,
    shareAlbumsWithUser,
    completeAllTasksInAlbums,
    reopenAllTasksInAlbums,
    toggleCloseAlbums,
    deleteAllAlbums,
    clearNotificationsForAlbums,
    changePriorityForAlbums,
    changeVisibilityForAlbums,
    setFavoritesForAlbums,
  } = useBulkAlbumOperations();

  const { data: allTags = [] } = useTags();

  // Modals state
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showCollaboratorSheet, setShowCollaboratorSheet] = useState(false);
  const [showMoreMenuModal, setShowMoreMenuModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  if (count === 0) return null;

  const plural = count === 1 ? t('bulk_album_actions.selected_single') : t('bulk_album_actions.selected_plural', { count });
  const askBulk = (title: string, message: string, confirmLabel: string) =>
    confirm.ask({ title, message, confirmLabel, cancelLabel: t('common.cancel') });

  // 1. Asignar etiquetas
  const handleAssignTags = async () => {
    if (!selectedTagIds.length) return;
    const okTags = await askBulk(
      t('bulk_album_actions.confirm_tags_title'),
      `Se asignarán ${selectedTagIds.length === 1 ? 'la etiqueta elegida' : `las ${selectedTagIds.length} etiquetas elegidas`} a ${plural}.`,
      t('bulk_album_actions.action_tags'),
    );
    if (!okTags) return;

    const pending = assignTagsToAlbums.mutateAsync({
      albumIds: selectedIds,
      tagIds: selectedTagIds,
    });
    setShowTagsModal(false);
    setSelectedTagIds([]);
    onClearSelection();
    toast.success(t('bulk_album_actions.toast_tags_assigned'));
    try {
      await pending;
    } catch (e: any) {
      toast.error(e?.message || 'No se pudieron asignar las etiquetas');
    }
  };

  // 2. Compartir álbumes
  const handleCollaboratorsSelected = async (collabs: CollaboratorItem[]) => {
    setShowCollaboratorSheet(false);
    if (!collabs.length) return;
    const friend = collabs[collabs.length - 1];
    if (!friend) return;
    const okShare = await askBulk(
      t('bulk_album_actions.confirm_share_title'),
      `Se invitará a ${friend.display_name || friend.username} a colaborar en ${plural}.`,
      t('bulk_album_actions.action_share'),
    );
    if (!okShare) return;
    try {
      await shareAlbumsWithUser.mutateAsync({
        albumIds: selectedIds,
        collaboratorId: friend.id,
      });
      onClearSelection();
      toast.success(t('bulk_album_actions.toast_shared', { name: friend.display_name || friend.username, count }));
    } catch (e: any) {
      toast.error(e?.message || 'No se pudieron compartir los álbumes');
    }
  };

  // 3. Completar todas las tareas de los álbumes
  const handleCompleteAllTasks = () => {
    confirm.show({
      title: t('bulk_album_actions.confirm_complete_title'),
      message: t('bulk_album_actions.confirm_complete_msg', { count }),
      confirmLabel: t('bulk_album_actions.action_complete_tasks'),
      cancelLabel: t('common.cancel'),
      onConfirm: async () => {
        const pending = completeAllTasksInAlbums.mutateAsync(selectedIds);
        onClearSelection();
        toast.success(t('bulk_album_actions.toast_completed', { count }));
        try {
          await pending;
        } catch (e: any) {
          toast.error(e?.message || 'Error al completar las tareas de los álbumes');
        }
      },
    });
  };

  // 4. Cerrar álbumes
  const handleCloseAlbums = () => {
    setShowMoreMenuModal(false);
    confirm.show({
      title: t('bulk_album_actions.confirm_close_title'),
      message: t('bulk_album_actions.confirm_close_msg', { count }),
      confirmLabel: t('bulk_album_actions.action_close_album'),
      cancelLabel: t('common.cancel'),
      onConfirm: async () => {
        const pending = toggleCloseAlbums.mutateAsync({ albumIds: selectedIds, isClosed: true });
        onClearSelection();
        toast.success(t('bulk_album_actions.toast_closed', { count }));
        try {
          await pending;
        } catch (e: any) {
          toast.error(e?.message || 'Error al cerrar los álbumes');
        }
      },
    });
  };

  // Reabrir álbumes
  const handleReopenAlbums = () => {
    setShowMoreMenuModal(false);
    confirm.show({
      title: t('bulk_album_actions.confirm_reopen_title', { defaultValue: '¿Reabrir álbumes?' }),
      message: t('bulk_album_actions.confirm_reopen_msg', { count, defaultValue: `Se reabrirán ${plural}.` }),
      confirmLabel: t('bulk_album_actions.reopen_albums'),
      cancelLabel: t('common.cancel'),
      onConfirm: async () => {
        const pending = toggleCloseAlbums.mutateAsync({ albumIds: selectedIds, isClosed: false });
        onClearSelection();
        toast.success(t('bulk_album_actions.toast_reopened_albums', { count }));
        try {
          await pending;
        } catch (e: any) {
          toast.error(e?.message || 'Error al reabrir los álbumes');
        }
      },
    });
  };

  // 5. Eliminar álbumes
  const handleDeleteAll = () => {
    setShowMoreMenuModal(false);
    confirm.show({
      title: t('bulk_album_actions.confirm_delete_title'),
      message: t('bulk_album_actions.confirm_delete_msg', { count }),
      confirmLabel: t('bulk_album_actions.delete_all', { count }),
      cancelLabel: t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        const pending = deleteAllAlbums.mutateAsync(selectedIds);
        onClearSelection();
        toast.success(t('bulk_album_actions.toast_deleted', { count }));
        try {
          await pending;
        } catch (e: any) {
          toast.error(e?.message || 'Error al eliminar los álbumes');
        }
      },
    });
  };

  // 6. Vaciar notificaciones
  const handleClearNotifications = () => {
    setShowMoreMenuModal(false);
    confirm.show({
      title: t('bulk_album_actions.confirm_clear_notifications_title'),
      message: t('bulk_album_actions.confirm_clear_notifications_msg', { count }),
      confirmLabel: t('bulk_album_actions.clear_notifications'),
      cancelLabel: t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        try {
          await clearNotificationsForAlbums.mutateAsync(selectedIds);
          onClearSelection();
          toast.success(t('bulk_album_actions.toast_notifications_cleared'));
        } catch (e: any) {
          toast.error(e?.message || 'Error al vaciar notificaciones');
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
      >
        <View style={styles.infoRow}>
          <View style={styles.badgeCount}>
            <Text style={styles.badgeCountText}>{count}</Text>
          </View>
          <Text style={styles.infoTitle}>
            {count === 1 ? t('bulk_album_actions.selected_single') : t('bulk_album_actions.selected_plural', { count })}
          </Text>

          <View style={styles.infoRight}>
            {onSelectAll && (
              <Pressable style={styles.selectAllBtn} onPress={onSelectAll} hitSlop={6}>
                <Text style={styles.selectAllText}>
                  {isAllSelected ? t('bulk_album_actions.deselect_all') : t('bulk_album_actions.select_all')}
                </Text>
              </Pressable>
            )}
            <Pressable style={styles.closeBtn} onPress={onClearSelection} hitSlop={8}>
              <X size={18} color="#AAA" />
            </Pressable>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={styles.actionBtn} onPress={() => setShowTagsModal(true)}>
            <View style={styles.actionIconBox}>
              <TagIcon size={18} color={gold[400]} />
            </View>
            <Text style={styles.actionLabel}>{t('bulk_album_actions.action_tags')}</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={() => setShowCollaboratorSheet(true)}>
            <View style={styles.actionIconBox}>
              <UserPlus size={18} color={gold[400]} />
            </View>
            <Text style={styles.actionLabel}>{t('bulk_album_actions.action_share')}</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={handleCompleteAllTasks}>
            <View style={[styles.actionIconBox, { backgroundColor: '#13281A', borderColor: '#1F472B' }]}>
              <CheckCircle2 size={18} color="#34C759" />
            </View>
            <Text style={styles.actionLabel}>{t('bulk_album_actions.action_complete_tasks')}</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={handleCloseAlbums}>
            <View style={styles.actionIconBox}>
              <FolderArchive size={18} color={gold[400]} />
            </View>
            <Text style={styles.actionLabel}>{t('bulk_album_actions.action_close_album')}</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={() => setShowMoreMenuModal(true)}>
            <View style={styles.actionIconBox}>
              <MoreHorizontal size={18} color="#FFF" />
            </View>
            <Text style={styles.actionLabel}>{t('bulk_album_actions.action_more')}</Text>
          </Pressable>
        </View>
      </View>

      <BulkTagsModal
        visible={showTagsModal}
        count={count}
        allTags={allTags}
        selectedTagIds={selectedTagIds}
        title={t('bulk_album_actions.tags_modal_title', { count })}
        onToggleTag={(tagId) => {
          setSelectedTagIds((prev) =>
            prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
          );
        }}
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

      <BulkAlbumMoreMenuModal
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
            t('bulk_album_actions.add_favorites'),
            `Se marcarán como favoritos ${plural}.`,
            t('common.add'),
          );
          if (!okFav) return;
          try {
            await setFavoritesForAlbums.mutateAsync({
              albumIds: selectedIds,
              favorite: true,
            });
            onClearSelection();
            toast.success(t('bulk_album_actions.toast_favorites_added', { count }));
          } catch (e: any) {
            toast.error(e?.message || 'Error al marcar como favoritos');
          }
        }}
        onReopenTasks={async () => {
          setShowMoreMenuModal(false);
          const okReopen = await askBulk(
            t('bulk_album_actions.confirm_reopen_tasks_title'),
            t('bulk_album_actions.confirm_reopen_tasks_msg', { count }),
            t('bulk_album_actions.reopen_tasks'),
          );
          if (!okReopen) return;
          const pending = reopenAllTasksInAlbums.mutateAsync(selectedIds);
          onClearSelection();
          toast.success(t('bulk_album_actions.toast_reopened_tasks'));
          try {
            await pending;
          } catch (e: any) {
            toast.error(e?.message || 'Error al reabrir tareas de álbumes');
          }
        }}
        onCloseAlbums={handleCloseAlbums}
        onReopenAlbums={handleReopenAlbums}
        onDeleteAll={handleDeleteAll}
      />

      <BulkPriorityModal
        visible={showPriorityModal}
        count={count}
        title={t('bulk_album_actions.priority_modal_title', { count })}
        onClose={() => setShowPriorityModal(false)}
        onSelectPriority={async (p) => {
          setShowPriorityModal(false);
          const okPrio = await askBulk(
            t('bulk_album_actions.change_priority'),
            `Se cambiará la prioridad de ${plural}.`,
            t('common.save'),
          );
          if (!okPrio) return;
          const pending = changePriorityForAlbums.mutateAsync({
            albumIds: selectedIds,
            priority: p,
          });
          onClearSelection();
          toast.success(t('bulk_album_actions.toast_priority_updated'));
          try {
            await pending;
          } catch (e: any) {
            toast.error(e?.message || 'Error al cambiar prioridad');
          }
        }}
      />

      <BulkVisibilityModal
        visible={showVisibilityModal}
        count={count}
        title={t('bulk_album_actions.visibility_modal_title', { count })}
        onClose={() => setShowVisibilityModal(false)}
        onSelectVisibility={async (v) => {
          setShowVisibilityModal(false);
          const okVis = await askBulk(
            t('bulk_album_actions.change_visibility'),
            `Se cambiará la visibilidad de ${plural}.`,
            t('common.save'),
          );
          if (!okVis) return;
          const pending = changeVisibilityForAlbums.mutateAsync({
            albumIds: selectedIds,
            visibility: v,
          });
          onClearSelection();
          toast.success(t('bulk_album_actions.toast_visibility_updated'));
          try {
            await pending;
          } catch (e: any) {
            toast.error(e?.message || 'Error al cambiar visibilidad');
          }
        }}
      />
    </>
  );
}
