import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import {
  FolderInput,
  Tag as TagIcon,
  UserPlus,
  CheckCircle2,
  MoreHorizontal,
  Trash2,
  BellOff,
  Flag,
  Lock,
  Star,
  X,
  Check,
  FolderOpen,
} from 'lucide-react-native';
import { useBulkTaskOperations } from '../hooks/useBulkTaskOperations';
import { useAlbums } from '../hooks/useAlbums';
import { useTags, type Tag } from '../hooks/useTags';
import { useAuthStore } from '../stores/auth.store';
import { CollaboratorPickerSheet, type CollaboratorItem } from './CollaboratorPickerSheet';

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

  // 1. Move to Album handler
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

  // 2. Assign Tags handler
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

  // 3. Share with Collaborator handler
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

  // 4. Complete All handler
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

  // 5. Delete All handler
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

  // 6. Clear notifications handler
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
      {/* Floating Bottom Action Bar */}
      <View
        style={[
          styles.container,
          { paddingBottom: Math.max(insets.bottom, 12) + 6 },
        ]}
      >
        {/* Top Info Bar: Count & Select All & Close */}
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

        {/* Action Buttons Row */}
        <View style={styles.actionsRow}>
          {/* Action 1: Move to Album */}
          <Pressable style={styles.actionBtn} onPress={() => setShowMoveModal(true)}>
            <View style={styles.actionIconBox}>
              <FolderInput size={18} color={gold[400]} />
            </View>
            <Text style={styles.actionLabel}>Mover</Text>
          </Pressable>

          {/* Action 2: Add Tags */}
          <Pressable style={styles.actionBtn} onPress={() => setShowTagsModal(true)}>
            <View style={styles.actionIconBox}>
              <TagIcon size={18} color={gold[400]} />
            </View>
            <Text style={styles.actionLabel}>Etiquetas</Text>
          </Pressable>

          {/* Action 3: Share with Person */}
          <Pressable style={styles.actionBtn} onPress={() => setShowCollaboratorSheet(true)}>
            <View style={styles.actionIconBox}>
              <UserPlus size={18} color={gold[400]} />
            </View>
            <Text style={styles.actionLabel}>Compartir</Text>
          </Pressable>

          {/* Action 4: Complete All */}
          <Pressable style={styles.actionBtn} onPress={handleCompleteAll}>
            <View style={[styles.actionIconBox, { backgroundColor: '#13281A', borderColor: '#1F472B' }]}>
              <CheckCircle2 size={18} color="#34C759" />
            </View>
            <Text style={styles.actionLabel}>Completar</Text>
          </Pressable>

          {/* Action 5: More Options */}
          <Pressable style={styles.actionBtn} onPress={() => setShowMoreMenuModal(true)}>
            <View style={styles.actionIconBox}>
              <MoreHorizontal size={18} color="#FFF" />
            </View>
            <Text style={styles.actionLabel}>Más</Text>
          </Pressable>
        </View>
      </View>

      {/* ========================================================================= */}
      {/* MODAL 1: MOVER A ÁLBUM                                                    */}
      {/* ========================================================================= */}
      {showMoveModal && (
        <Modal
          transparent
          animationType="slide"
          visible={showMoveModal}
          onRequestClose={() => setShowMoveModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowMoveModal(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Mover {count} tareas a un álbum</Text>
                <Pressable onPress={() => setShowMoveModal(false)} hitSlop={10}>
                  <X size={20} color="#888" />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 340 }}>
                {/* Option: Sin álbum */}
                <Pressable
                  style={styles.albumOptionRow}
                  onPress={() => void handleMoveToAlbum(null)}
                >
                  <View style={styles.albumOptionLeft}>
                    <FolderOpen size={18} color="#888" />
                    <Text style={styles.albumOptionTitle}>Sin álbum</Text>
                  </View>
                </Pressable>

                {/* List of user albums */}
                {albums.map((alb) => (
                  <Pressable
                    key={alb.id}
                    style={styles.albumOptionRow}
                    onPress={() => void handleMoveToAlbum(alb.id)}
                  >
                    <View style={styles.albumOptionLeft}>
                      <FolderInput size={18} color={gold[400]} />
                      <Text style={styles.albumOptionTitle}>{alb.title}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ASIGNAR ETIQUETAS                                                */}
      {/* ========================================================================= */}
      {showTagsModal && (
        <Modal
          transparent
          animationType="slide"
          visible={showTagsModal}
          onRequestClose={() => setShowTagsModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowTagsModal(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Etiquetas para {count} tareas</Text>
                <Pressable onPress={() => setShowTagsModal(false)} hitSlop={10}>
                  <X size={20} color="#888" />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 280 }}>
                <View style={styles.tagsContainer}>
                  {allTags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <Pressable
                        key={tag.id}
                        style={[
                          styles.tagPill,
                          isSelected && {
                            borderColor: tag.color || gold[400],
                            backgroundColor: `${tag.color || gold[400]}33`,
                          },
                        ]}
                        onPress={() => {
                          setSelectedTagIds((prev) =>
                            prev.includes(tag.id)
                              ? prev.filter((id) => id !== tag.id)
                              : [...prev, tag.id]
                          );
                        }}
                      >
                        {tag.emoji && <Text style={{ fontSize: 13, marginRight: 4 }}>{tag.emoji}</Text>}
                        <Text
                          style={[
                            styles.tagText,
                            isSelected && { color: tag.color || gold[400], fontWeight: '600' },
                          ]}
                        >
                          {tag.name}
                        </Text>
                        {isSelected && <Check size={12} color={tag.color || gold[400]} style={{ marginLeft: 4 }} />}
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>

              <Pressable
                style={[styles.applyBtn, !selectedTagIds.length && styles.applyBtnDisabled]}
                disabled={!selectedTagIds.length}
                onPress={handleAssignTags}
              >
                <Text style={styles.applyBtnText}>Asignar etiquetas ({selectedTagIds.length})</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: COMPARTIR CON PERSONA (CollaboratorPickerSheet)                   */}
      {/* ========================================================================= */}
      {showCollaboratorSheet && (
        <CollaboratorPickerSheet
          visible={showCollaboratorSheet}
          selected={[]}
          onChange={handleCollaboratorsSelected}
          onClose={() => setShowCollaboratorSheet(false)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: MÁS OPCIONES                                                     */}
      {/* ========================================================================= */}
      {showMoreMenuModal && (
        <Modal
          transparent
          animationType="fade"
          visible={showMoreMenuModal}
          onRequestClose={() => setShowMoreMenuModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowMoreMenuModal(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Opciones para {count} tareas</Text>
                <Pressable onPress={() => setShowMoreMenuModal(false)} hitSlop={10}>
                  <X size={20} color="#888" />
                </Pressable>
              </View>

              {/* Vaciar notificaciones */}
              <Pressable style={styles.menuItem} onPress={handleClearNotifications}>
                <BellOff size={18} color="#E0A343" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.menuItemTitle}>Vaciar notificaciones</Text>
                  <Text style={styles.menuItemSubtitle}>
                    Desactiva y limpia los avisos de las tareas seleccionadas
                  </Text>
                </View>
              </Pressable>

              {/* Cambiar prioridad */}
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setShowMoreMenuModal(false);
                  setShowPriorityModal(true);
                }}
              >
                <Flag size={18} color={gold[400]} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.menuItemTitle}>Cambiar prioridad</Text>
                  <Text style={styles.menuItemSubtitle}>Asignar Alta, Media o Baja</Text>
                </View>
              </Pressable>

              {/* Cambiar visibilidad */}
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setShowMoreMenuModal(false);
                  setShowVisibilityModal(true);
                }}
              >
                <Lock size={18} color={gold[400]} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.menuItemTitle}>Cambiar visibilidad</Text>
                  <Text style={styles.menuItemSubtitle}>Pública, Privada o Sólo seguidores</Text>
                </View>
              </Pressable>

              {/* Añadir a Favoritas */}
              <Pressable
                style={styles.menuItem}
                onPress={async () => {
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
              >
                <Star size={18} color={gold[400]} fill={gold[400]} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.menuItemTitle}>Añadir a favoritas</Text>
                  <Text style={styles.menuItemSubtitle}>Marcar con estrella todas a la vez</Text>
                </View>
              </Pressable>

              {/* Reabrir como pendientes */}
              <Pressable
                style={styles.menuItem}
                onPress={async () => {
                  setShowMoreMenuModal(false);
                  try {
                    await reopenAllTasks.mutateAsync(selectedIds);
                    onClearSelection();
                    Alert.alert('Reabiertas', `Se han marcado ${count} tareas como pendientes.`);
                  } catch (e: any) {
                    Alert.alert('Error', e?.message || 'Error al reabrir tareas');
                  }
                }}
              >
                <Check size={18} color="#AAA" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.menuItemTitle}>Reabrir como pendientes</Text>
                  <Text style={styles.menuItemSubtitle}>Volver a ponerlas en estado activo</Text>
                </View>
              </Pressable>

              {/* Borrar todas */}
              <Pressable style={[styles.menuItem, styles.menuItemDelete]} onPress={handleDeleteAll}>
                <Trash2 size={18} color="#FF453A" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.menuItemTitle, { color: '#FF453A' }]}>
                    Eliminar todas ({count})
                  </Text>
                  <Text style={styles.menuItemSubtitle}>
                    Borra definitivamente las tareas seleccionadas
                  </Text>
                </View>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Sub-modal: Cambiar Prioridad */}
      {showPriorityModal && (
        <Modal
          transparent
          animationType="fade"
          visible={showPriorityModal}
          onRequestClose={() => setShowPriorityModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowPriorityModal(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Prioridad para {count} tareas</Text>
                <Pressable onPress={() => setShowPriorityModal(false)} hitSlop={10}>
                  <X size={20} color="#888" />
                </Pressable>
              </View>

              {(['high', 'medium', 'low'] as const).map((p) => {
                const label = p === 'high' ? 'Alta' : p === 'medium' ? 'Media' : 'Baja';
                const col = p === 'high' ? '#EF4444' : p === 'medium' ? '#D4B13A' : '#10B981';
                return (
                  <Pressable
                    key={p}
                    style={styles.albumOptionRow}
                    onPress={async () => {
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
                  >
                    <View style={styles.albumOptionLeft}>
                      <Flag size={18} color={col} />
                      <Text style={styles.albumOptionTitle}>Prioridad {label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Sub-modal: Cambiar Visibilidad */}
      {showVisibilityModal && (
        <Modal
          transparent
          animationType="fade"
          visible={showVisibilityModal}
          onRequestClose={() => setShowVisibilityModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowVisibilityModal(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Visibilidad para {count} tareas</Text>
                <Pressable onPress={() => setShowVisibilityModal(false)} hitSlop={10}>
                  <X size={20} color="#888" />
                </Pressable>
              </View>

              {(['public', 'followers', 'private'] as const).map((v) => {
                const label = v === 'public' ? 'Pública' : v === 'followers' ? 'Solo seguidores' : 'Privada';
                return (
                  <Pressable
                    key={v}
                    style={styles.albumOptionRow}
                    onPress={async () => {
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
                  >
                    <View style={styles.albumOptionLeft}>
                      <Lock size={18} color={gold[400]} />
                      <Text style={styles.albumOptionTitle}>{label}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#181818',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#303030',
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 20,
    zIndex: 999,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  badgeCount: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: gold[400],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  badgeCountText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#0E0E0E',
  },
  infoTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    color: '#FFF',
    flex: 1,
  },
  infoRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#262626',
  },
  selectAllText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: gold[400],
  },
  closeBtn: {
    padding: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
  },
  actionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#242014',
    borderWidth: 1,
    borderColor: '#3D3316',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10.5,
    color: '#DDD',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
    maxHeight: '75%',
    borderWidth: 1,
    borderColor: '#262626',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#262626',
    marginBottom: 12,
  },
  modalTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#FFF',
  },
  albumOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#242424',
  },
  albumOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  albumOptionTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13.5,
    color: '#EEE',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2C2C2C',
  },
  tagText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#888',
  },
  applyBtn: {
    backgroundColor: gold[400],
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  applyBtnDisabled: {
    opacity: 0.4,
  },
  applyBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    color: '#0E0E0E',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#242424',
  },
  menuItemTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13.5,
    color: '#EEE',
  },
  menuItemSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: '#888',
    marginTop: 2,
  },
  menuItemDelete: {
    borderBottomWidth: 0,
    marginTop: 6,
  },
});
