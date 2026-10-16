import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gold } from '@bucketlist/ui/src/tokens/colors';
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

  const handleMoveToAlbum = async (albumId: string | null) => {
    try {
      await moveTasksToAlbum.mutateAsync({
        taskIds: selectedIds,
        albumId,
      });
      setShowMoveModal(false);
      onClearSelection();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudieron mover las tareas');
    }
  };

  const handleAssignTags = async () => {
    if (!selectedTagIds.length) return;
    try {
      await assignTagsToTasks.mutateAsync({
        taskIds: selectedIds,
        tagIds: selectedTagIds,
      });
      setShowTagsModal(false);
      setSelectedTagIds([]);
      onClearSelection();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudieron asignar las etiquetas');
    }
  };

  const handleCollaboratorsSelected = async (collabs: CollaboratorItem[]) => {
    setShowCollaboratorSheet(false);
    if (!collabs.length) return;
    const friend = collabs[collabs.length - 1];
    if (!friend) return;
    try {
      await shareTasksWithUser.mutateAsync({
        taskIds: selectedIds,
        collaboratorId: friend.id,
      });
      onClearSelection();
      Alert.alert(
        'Compartido con éxito',
        `Se ha añadido a ${friend.display_name || friend.username} a las ${count} tareas.`
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'No se pudieron compartir las tareas');
    }
  };

  const handleCompleteAll = () => {
    Alert.alert(
      '¿Completar tareas?',
      `Se marcarán como completadas las ${count} tareas seleccionadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Completar todas',
          onPress: async () => {
            try {
              await completeAllTasks.mutateAsync(selectedIds);
              onClearSelection();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Error al completar las tareas');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAll = () => {
    setShowMoreMenuModal(false);
    Alert.alert(
      'Eliminar tareas',
      `¿Estás seguro de que quieres eliminar ${count} tareas seleccionadas? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar todas',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllTasks.mutateAsync(selectedIds);
              onClearSelection();
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Error al eliminar las tareas');
            }
          },
        },
      ]
    );
  };

  const handleClearNotifications = () => {
    setShowMoreMenuModal(false);
    Alert.alert(
      'Vaciar notificaciones',
      `¿Deseas vaciar y desactivar las notificaciones de las ${count} tareas seleccionadas?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vaciar',
          style: 'destructive',
          onPress: async () => {
            try {
              await clearNotificationsForTasks.mutateAsync(selectedIds);
              onClearSelection();
              Alert.alert('Éxito', 'Notificaciones vaciadas de las tareas seleccionadas.');
            } catch (e: any) {
              Alert.alert('Error', e?.message || 'Error al vaciar notificaciones');
            }
          },
        },
      ]
    );
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
          try {
            await setFavoritesForTasks.mutateAsync({
              taskIds: selectedIds,
              favorite: true,
            });
            onClearSelection();
            Alert.alert('Favoritas', `Añadidas ${count} tareas a tus favoritas.`);
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Error al marcar como favoritas');
          }
        }}
        onReopenTasks={async () => {
          setShowMoreMenuModal(false);
          try {
            await reopenAllTasks.mutateAsync(selectedIds);
            onClearSelection();
            Alert.alert('Reabiertas', `Se han marcado ${count} tareas como pendientes.`);
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Error al reabrir tareas');
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
          try {
            await changePriorityForTasks.mutateAsync({
              taskIds: selectedIds,
              priority: p,
            });
            onClearSelection();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Error al cambiar prioridad');
          }
        }}
      />

      <BulkVisibilityModal
        visible={showVisibilityModal}
        count={count}
        onClose={() => setShowVisibilityModal(false)}
        onSelectVisibility={async (v) => {
          setShowVisibilityModal(false);
          try {
            await changeVisibilityForTasks.mutateAsync({
              taskIds: selectedIds,
              visibility: v,
            });
            onClearSelection();
          } catch (e: any) {
            Alert.alert('Error', e?.message || 'Error al cambiar visibilidad');
          }
        }}
      />
    </>
  );
}
