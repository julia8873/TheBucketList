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
import { useTags } from '../hooks/useTags';
import { useAuthStore } from '../stores/auth.store';
import { CollaboratorPickerSheet, type CollaboratorItem } from './CollaboratorPickerSheet';

import { styles } from '../features/bulk-task-actions/styles/bulk-actions.styles';
import { BulkMoveModal } from '../features/bulk-task-actions/components/BulkMoveModal';
import { BulkTagsModal } from '../features/bulk-task-actions/components/BulkTagsModal';
import { BulkMoreMenuModal } from '../features/bulk-task-actions/components/BulkMoreMenuModal';
import { BulkPriorityModal, BulkVisibilityModal } from '../features/bulk-task-actions/components/BulkMetaModals';

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
  const { data: allTags = [] } = useTags();

  // Modals state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [showCollaboratorSheet, setShowCollaboratorSheet] = useState(false);
  const [showMoreMenuModal, setShowMoreMenuModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  if (count === 0) return null;

  const plural = count === 1 ? '1 tarea seleccionada' : `${count} tareas seleccionadas`;
  const askBulk = (title: string, message: string, confirmLabel: string) =>
    confirm.ask({ title, message, confirmLabel, cancelLabel: 'Cancelar' });

  const handleMoveToAlbum = async (albumId: string | null) => {
    const targetAlbum = albumId ? albums.find((a: any) => a.id === albumId) : null;
    const albumName = targetAlbum?.title;

    const executeMove = async (updateVis?: 'public' | 'followers' | 'private') => {
      try {
        await moveTasksToAlbum.mutateAsync({
          taskIds: selectedIds,
          albumId,
          updateVisibility: updateVis,
        });
        setShowMoveModal(false);
        onClearSelection();
        toast.success(albumId ? 'Tareas movidas al álbum' : 'Tareas sacadas del álbum');
      } catch (e: any) {
        toast.error(e?.message || 'No se pudieron mover las tareas');
      }
    };

    if (albumId && targetAlbum?.visibility) {
      const visLabels: Record<string, string> = {
        private: 'privada',
        followers: 'solo para seguidores',
        public: 'pública',
      };
      const visLabel = visLabels[targetAlbum.visibility] || targetAlbum.visibility;

      confirm.show({
        title: count === 1 ? '¿Cambiar privacidad de la tarea?' : '¿Cambiar privacidad de las tareas?',
        message: `El álbum «${albumName || 'Álbum'}» es ${visLabel}. ¿Quieres poner la visibilidad de ${plural} en ${visLabel} para que coincida con el álbum?`,
        actions: [
          {
            label: `Poner en ${visLabel}`,
            onPress: () => void executeMove(targetAlbum.visibility as any),
          },
          {
            label: 'Mantener actual',
            style: 'cancel',
            onPress: () => void executeMove(undefined),
          },
        ],
      });
      return;
    }

    const okMove = await askBulk(
      '¿Mover tareas?',
      albumId
        ? `Se moverán ${plural} al álbum${albumName ? ` «${albumName}»` : ''}.`
        : `Se sacarán de su álbum ${plural} (quedarán sin álbum).`,
      'Mover',
    );
    if (!okMove) return;
    await executeMove(undefined);
  };

  const handleAssignTags = async () => {
    if (!selectedTagIds.length) return;
    const okTags = await askBulk(
      '¿Asignar etiquetas?',
      `Se asignarán ${selectedTagIds.length === 1 ? 'la etiqueta elegida' : `las ${selectedTagIds.length} etiquetas elegidas`} a ${plural}.`,
      'Asignar',
    );
    if (!okTags) return;
    try {
      await assignTagsToTasks.mutateAsync({
        taskIds: selectedIds,
        tagIds: selectedTagIds,
      });
      setShowTagsModal(false);
      setSelectedTagIds([]);
      onClearSelection();
      toast.success('Etiquetas asignadas');
    } catch (e: any) {
      toast.error(e?.message || 'No se pudieron asignar las etiquetas');
    }
  };

  const handleCollaboratorsSelected = async (collabs: CollaboratorItem[]) => {
    setShowCollaboratorSheet(false);
    if (!collabs.length) return;
    const friend = collabs[collabs.length - 1];
    if (!friend) return;
    const okShare = await askBulk(
      '¿Compartir tareas?',
      `Se invitará a ${friend.display_name || friend.username} a colaborar en ${plural}.`,
      'Compartir',
    );
    if (!okShare) return;
    try {
      await shareTasksWithUser.mutateAsync({
        taskIds: selectedIds,
        collaboratorId: friend.id,
      });
      onClearSelection();
      toast.success(`Se ha añadido a ${friend.display_name || friend.username} a las ${count} tareas.`);
    } catch (e: any) {
      toast.error(e?.message || 'No se pudieron compartir las tareas');
    }
  };

  const handleCompleteAll = () => {
    confirm.show({
      title: '¿Completar tareas?',
      message: `Se marcarán como completadas las ${count} tareas seleccionadas.`,
      confirmLabel: 'Completar todas',
      cancelLabel: 'Cancelar',
      onConfirm: async () => {
        try {
          await completeAllTasks.mutateAsync(selectedIds);
          onClearSelection();
          toast.success(`${count} tareas completadas`);
        } catch (e: any) {
          toast.error(e?.message || 'Error al completar las tareas');
        }
      },
    });
  };

  const handleDeleteAll = () => {
    setShowMoreMenuModal(false);
    confirm.show({
      title: '¿Eliminar tareas?',
      message: `¿Estás seguro de que quieres eliminar ${count} tareas seleccionadas? Esta acción no se puede deshacer.`,
      confirmLabel: `Eliminar todas (${count})`,
      cancelLabel: 'Cancelar',
      destructive: true,
      onConfirm: async () => {
        try {
          await deleteAllTasks.mutateAsync(selectedIds);
          onClearSelection();
          toast.success(`${count} tareas eliminadas`);
        } catch (e: any) {
          toast.error(e?.message || 'Error al eliminar las tareas');
        }
      },
    });
  };

  const handleClearNotifications = () => {
    setShowMoreMenuModal(false);
    confirm.show({
      title: 'Vaciar notificaciones',
      message: `¿Deseas vaciar y desactivar las notificaciones de las ${count} tareas seleccionadas?`,
      confirmLabel: 'Vaciar notificaciones',
      cancelLabel: 'Cancelar',
      destructive: true,
      onConfirm: async () => {
        try {
          await clearNotificationsForTasks.mutateAsync(selectedIds);
          onClearSelection();
          toast.success('Notificaciones vaciadas de las tareas seleccionadas');
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
            {count === 1 ? '1 tarea seleccionada' : `${count} tareas seleccionadas`}
          </Text>

          <View style={styles.infoRight}>
            {onSelectAll && (
              <Pressable style={styles.selectAllBtn} onPress={onSelectAll} hitSlop={6}>
                <Text style={styles.selectAllText}>
                  {isAllSelected ? 'Deseleccionar' : 'Todas'}
                </Text>
              </Pressable>
            )}
            <Pressable style={styles.closeBtn} onPress={onClearSelection} hitSlop={8}>
              <X size={18} color="#AAA" />
            </Pressable>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={styles.actionBtn} onPress={() => setShowMoveModal(true)}>
            <View style={styles.actionIconBox}>
              <FolderInput size={18} color={gold[400]} />
            </View>
            <Text style={styles.actionLabel}>Mover</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={() => setShowTagsModal(true)}>
            <View style={styles.actionIconBox}>
              <TagIcon size={18} color={gold[400]} />
            </View>
            <Text style={styles.actionLabel}>Etiquetas</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={() => setShowCollaboratorSheet(true)}>
            <View style={styles.actionIconBox}>
              <UserPlus size={18} color={gold[400]} />
            </View>
            <Text style={styles.actionLabel}>Compartir</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={handleCompleteAll}>
            <View style={[styles.actionIconBox, { backgroundColor: '#13281A', borderColor: '#1F472B' }]}>
              <CheckCircle2 size={18} color="#34C759" />
            </View>
            <Text style={styles.actionLabel}>Completar</Text>
          </Pressable>

          <Pressable style={styles.actionBtn} onPress={() => setShowMoreMenuModal(true)}>
            <View style={styles.actionIconBox}>
              <MoreHorizontal size={18} color="#FFF" />
            </View>
            <Text style={styles.actionLabel}>Más</Text>
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

      <BulkTagsModal
        visible={showTagsModal}
        count={count}
        allTags={allTags}
        selectedTagIds={selectedTagIds}
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
            '¿Añadir a favoritas?',
            `Se marcarán como favoritas ${plural}.`,
            'Añadir',
          );
          if (!okFav) return;
          try {
            await setFavoritesForTasks.mutateAsync({
              taskIds: selectedIds,
              favorite: true,
            });
            onClearSelection();
            toast.success(`Añadidas ${count} tareas a tus favoritas.`);
          } catch (e: any) {
            toast.error(e?.message || 'Error al marcar como favoritas');
          }
        }}
        onReopenTasks={async () => {
          setShowMoreMenuModal(false);
          const okReopen = await askBulk(
            '¿Marcar como pendientes?',
            `Se volverán a marcar como pendientes ${plural}.`,
            'Marcar pendientes',
          );
          if (!okReopen) return;
          try {
            await reopenAllTasks.mutateAsync(selectedIds);
            onClearSelection();
            toast.success(`Se han marcado ${count} tareas como pendientes.`);
          } catch (e: any) {
            toast.error(e?.message || 'Error al reabrir tareas');
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
            '¿Cambiar prioridad?',
            `Se cambiará la prioridad de ${plural}.`,
            'Cambiar',
          );
          if (!okPrio) return;
          try {
            await changePriorityForTasks.mutateAsync({
              taskIds: selectedIds,
              priority: p,
            });
            onClearSelection();
            toast.success('Prioridad actualizada');
          } catch (e: any) {
            toast.error(e?.message || 'Error al cambiar prioridad');
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
            '¿Cambiar visibilidad?',
            `Se cambiará la visibilidad de ${plural}.`,
            'Cambiar',
          );
          if (!okVis) return;
          try {
            await changeVisibilityForTasks.mutateAsync({
              taskIds: selectedIds,
              visibility: v,
            });
            onClearSelection();
            toast.success('Visibilidad actualizada');
          } catch (e: any) {
            toast.error(e?.message || 'Error al cambiar visibilidad');
          }
        }}
      />
    </>
  );
}
