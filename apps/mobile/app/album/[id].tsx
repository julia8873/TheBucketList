import { Alert } from '@bucketlist/ui';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { View, Text, Pressable, ScrollView, RefreshControl, TextInput, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  MoreHorizontal,
  Star,
  Heart,
  Bookmark,
  Bell,
  Search,
  ArrowUp,
  ArrowDown,
  Plus,
  RotateCcw,
  CheckCircle2,
  FolderPlus,
  UserPlus,
  ListChecks,
  X,
} from 'lucide-react-native';
import { Skeleton, Avatar, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { useQueryClient } from '@tanstack/react-query';

import { TaskRowSkeleton } from '@/components/TaskSkeletons';
import { TaskItem } from '@/services/api/albumsService';
import { supabase } from '@/services/supabase';
import { normalizeStorageUrl } from '@/constants/urls';
import { CollaboratorPickerSheet } from '@/components/CollaboratorPickerSheet';
import { DraggableTaskList } from '@/components/DraggableTaskList';
import { BulkTaskActionBar } from '@/components/BulkTaskActionBar';
import { NotificationSubscribersModal } from '@/components/NotificationSubscribersModal';
import { ImageLinkModal } from '@/components/ImageLinkModal';
import { TagAssignSheet } from '@/components/TagAssignSheet';
import { PhotoCropModal } from '@/components/PhotoCropModal';
import { hexToRgba } from '@/constants/tagPresets';
import { TaskCommentsModal } from '@/components/TaskCommentsModal';
import { ItemCommentsSection } from '@/components/ItemCommentsSection';
import { ItemLikesModal } from '@/components/ItemLikesModal';
import { useItemLikes } from '@/hooks/useSocial';

import { styles } from '@/features/album-detail/styles/album-detail.styles';
import { AlbumTaskCard } from '@/features/album-detail/components/AlbumTaskCard';
import { ReportModal } from '@/components/ReportModal';
import { useReportContent } from '@/hooks/useBlockReport';
import { AlbumOptionsSheet } from '@/features/album-detail/components/AlbumOptionsSheet';
import { AlbumHeaderBadges } from '@/features/album-detail/components/AlbumHeaderBadges';
import { AlbumSortModal, TaskSortField } from '@/features/album-detail/components/AlbumSortModal';
import { useAlbumDetailState } from '@/features/album-detail/hooks/useAlbumDetailState';
import { useIsAdmin } from '@/hooks/useCurrentUserProfile';
import { usePromoteAlbumToCollection } from '@/features/collections/hooks/useCollections';

const GRADIENTS = {
  aurora: ['#0E4B43', '#1F8560'],
  atardecer: ['#F4A460', '#C8602F'],
  cielo: ['#3A78C4', '#8CC8F4'],
  violeta: ['#5B2F98', '#2E1A5E'],
  dorado: ['#3A2F18', '#5E4E1F'],
};

export function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  const first = parts[0];
  const second = parts[1];
  if (first && second && first[0] && second[0]) {
    return `${first[0]}${second[0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function AlbumDetailScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const state = useAlbumDetailState();
  const isAdmin = useIsAdmin();
  const promoteMutation = usePromoteAlbumToCollection();
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [commentsAutoFocus, setCommentsAutoFocus] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const { data: albumLikes = [] } = useItemLikes(state.id !== 'unassigned' ? state.id : undefined, 'album');
  const albumLikesCount = albumLikes.length;

  // Al llegar desde una notificación de comentario (?openComments=1) se abre la hoja de comentarios
  const { openComments } = useLocalSearchParams<{ openComments?: string }>();
  const openedFromNotificationRef = useRef(false);
  useEffect(() => {
    if (!openComments || openedFromNotificationRef.current) return;
    openedFromNotificationRef.current = true;
    const t = setTimeout(() => setShowCommentsModal(true), 350);
    return () => clearTimeout(t);
  }, [openComments]);
  const [reportVisible, setReportVisible] = useState(false);
  const reportContent = useReportContent();
  const queryClient = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({ queryKey: ['album', state.id], stale: true });
    }, [queryClient, state.id])
  );

  useEffect(() => {
    if (state.taskSearchOpen) {
      const timer = setTimeout(() => {
        state.scrollRef.current?.scrollTo({
          y: Math.max(0, state.toolbarY.current - 20),
          animated: true,
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state.taskSearchOpen]);

  useEffect(() => {
    if (state.taskSearchOpen && state.keyboardHeight > 0) {
      state.scrollRef.current?.scrollTo({
        y: Math.max(0, state.toolbarY.current - 20),
        animated: true,
      });
    }
  }, [state.keyboardHeight, state.taskSearchOpen]);

  const handlePromoteToCollection = () => {
    const currentAlbum = state.album;
    if (!currentAlbum) return;
    Alert.alert(
      'Promocionar a Colección',
      `¿Deseas convertir el álbum "${currentAlbum.title}" en una colección pública destacada en la pestaña Colecciones?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Promocionar',
          onPress: () => {
            promoteMutation.mutate({
              albumId: currentAlbum.id,
              category: 'general',
              badge: '⭐ Destacada',
              emoji: '🌟',
            });
          },
        },
      ]
    );
  };

  if (state.isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Skeleton width="100%" height={270} borderRadius={0} />
        <View style={{ padding: 20 }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            <Skeleton width={100} height={32} borderRadius={16} />
            <Skeleton width={80} height={32} borderRadius={16} />
          </View>
          <Skeleton width="75%" height={32} borderRadius={8} style={{ marginBottom: 12 }} />
          <Skeleton width="50%" height={16} borderRadius={6} style={{ marginBottom: 24 }} />
          <TaskRowSkeleton />
          <TaskRowSkeleton />
          <TaskRowSkeleton />
        </View>
      </View>
    );
  }

  if (state.isError || !state.album) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={styles.errorText}>No se pudo cargar el álbum</Text>
      </View>
    );
  }

  const { album } = state;
  const { title, coverKey, coverPath, isShared, tasks } = album;

  const normalizeText = (v: string) =>
    v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const searchQ = normalizeText(state.taskSearch.trim());
  const isSearchingTasks = searchQ.length > 0;

  const byDeadline = (a: TaskItem, b: TaskItem) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  };

  const byManual = (a: TaskItem, b: TaskItem) => {
    const pa = a.position ?? 0;
    const pb = b.position ?? 0;
    return pa !== pb ? pa - pb : byDeadline(a, b);
  };

  const priorityWeight = (p?: string | null): number => {
    switch (p) {
      case 'urgent': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  };

  const dirSign = state.taskSortDir === 'asc' ? 1 : -1;
  const compareTasks = (a: TaskItem, b: TaskItem) => {
    if (state.taskSortField === 'priority') {
      const wa = priorityWeight(a.priority);
      const wb = priorityWeight(b.priority);
      const diff = state.taskSortDir === 'desc' ? wb - wa : wa - wb;
      return diff !== 0 ? diff : byManual(a, b);
    }
    if (state.taskSortField === 'alphabetical') {
      const cmp = a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
      return cmp !== 0 ? cmp * dirSign : byManual(a, b);
    }
    if (state.taskSortField === 'completed_at') {
      const ta = a.completedAt ? new Date(a.completedAt).getTime() : null;
      const tb = b.completedAt ? new Date(b.completedAt).getTime() : null;
      if (ta === null && tb === null) return byManual(a, b);
      if (ta === null) return 1;
      if (tb === null) return -1;
      return ta !== tb ? (ta - tb) * dirSign : byManual(a, b);
    }
    return byManual(a, b);
  };

  const visibleTasks = isSearchingTasks
    ? tasks.filter((t) => normalizeText(t.title).includes(searchQ))
    : tasks;
  const pendientes = visibleTasks.filter((t) => !t.isCompleted).sort(compareTasks);
  const completadas = visibleTasks.filter((t) => t.isCompleted).sort(compareTasks);
  const allDone = tasks.filter((t) => t.isCompleted);

  const manualDragEnabled =
    state.canEdit &&
    !state.isSelectionMode &&
    state.id !== 'unassigned' &&
    state.taskSortField === 'manual' &&
    !isSearchingTasks &&
    state.isReorderingTasks;

  const persistTaskOrder = async (orderedIds: string[]) => {
    const current = new Map(tasks.map((t) => [t.id, t.position ?? null]));
    state.queryClient.setQueryData(['album', state.id, state.user?.id], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        tasks: old.tasks.map((t: TaskItem) => {
          const idx = orderedIds.indexOf(t.id);
          return idx >= 0 ? { ...t, position: idx } : t;
        }),
      };
    });
    const changed = orderedIds
      .map((bid, idx) => ({ bid, idx }))
      .filter(({ bid, idx }) => current.get(bid) !== idx);
    const results = await Promise.all(
      changed.map(({ bid, idx }) =>
        supabase.from('album_items').update({ position: idx }).eq('album_id', state.id).eq('bucket_id', bid),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      console.error('Error guardando el orden de las tareas:', failed.error);
      Alert.alert('Error', 'No se pudo guardar el nuevo orden');
    }
    void state.queryClient.invalidateQueries({ queryKey: ['album', state.id, state.user?.id] });
  };

  const handleReorderSection = (section: 'pendientes' | 'completadas', orderedIds: string[]) => {
    const pendIds = pendientes.map((t) => t.id);
    const doneIds = completadas.map((t) => t.id);
    void persistTaskOrder(section === 'pendientes' ? [...orderedIds, ...doneIds] : [...pendIds, ...orderedIds]);
  };

  const openTaskSortMenu = () => {
    state.taskSortTriggerRef.current?.measureInWindow((x, y, w, h) => {
      state.setTaskSortMenuPos({
        top: y + h + 6,
        right: 20,
      });
      state.setTaskSortMenuOpen(true);
    });
  };

  const handleTaskSortOption = (field: TaskSortField) => {
    if (field === 'manual') {
      state.setTaskSortField('manual');
      state.setIsReorderingTasks(true);
      state.setTaskSortMenuOpen(false);
      return;
    }
    state.setIsReorderingTasks(false);
    if (state.taskSortField === field) {
      state.setTaskSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      state.setTaskSortField(field);
      state.setTaskSortDir(field === 'alphabetical' ? 'asc' : 'desc');
      state.setTaskSortMenuOpen(false);
    }
  };

  const total = tasks.length;
  const completedCount = allDone.length;
  const progressPercent = total === 0 ? 0 : Math.round((completedCount / total) * 100);
  const areAllCompleted = total > 0 && completedCount === total;

  let parsedCover: any = null;
  if (coverPath) {
    try {
      parsedCover = JSON.parse(coverPath);
    } catch {}
  }

  const gradientColors = GRADIENTS[coverKey as keyof typeof GRADIENTS] || GRADIENTS.aurora;
  const heroColors = [gradientColors[0] || '#0E4B43', gradientColors[1] || '#1F8560', theme.colors.background] as readonly [
    string,
    string,
    ...string[]
  ];
  const isAlbumClosed = Boolean(album.is_closed);

  const visibleTaskIds = [...pendientes, ...completadas].map((t) => t.id);
  const isAllSelected =
    visibleTaskIds.length > 0 && visibleTaskIds.every((tid) => state.selectedTaskIds.includes(tid));

  const renderTaskCard = (task: TaskItem, drag?: { panHandlers: any; isActive: boolean }) => (
    <AlbumTaskCard
      key={task.id}
      task={task}
      canEdit={state.canEdit}
      copiedIds={state.copiedIds ?? []}
      drag={drag}
      onToggleCompleted={state.toggleTaskCompleted}
      onCopySingleTask={state.handleCopySingleTask}
      isSelectionMode={state.isSelectionMode}
      isSelected={state.selectedTaskIds.includes(task.id)}
      onToggleSelect={(t) => state.toggleSelectTask(t.id)}
      onLongPressTask={(t) => state.startSelection(t.id)}
    />
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={state.scrollRef}
        style={styles.scroll}
        scrollEnabled={!state.dragging}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{
          paddingBottom:
            insets.bottom +
            (state.isSelectionMode ? 170 : state.id === 'unassigned' ? 40 : 120) +
            (state.keyboardHeight > 0 ? state.keyboardHeight + 60 : 0),
        }}
        refreshControl={
          manualDragEnabled || state.dragging ? undefined : (
            <RefreshControl refreshing={state.manualRefreshing} onRefresh={state.handleRefresh} tintColor="#D4B13A" />
          )
        }
      >
        {/* Hero */}
        <View
          style={[
            styles.hero,
            (parsedCover?.aspectRatio === '1:1' ||
              (typeof parsedCover?.aspectRatioValue === 'number' &&
                Math.abs(parsedCover.aspectRatioValue - 1) < 0.25)) && { height: 350 },
          ]}
        >
          {parsedCover?.type === 'image' && parsedCover?.uri ? (
            <Image source={{ uri: parsedCover.uri }} style={StyleSheet.absoluteFill} />
          ) : parsedCover?.type === 'solid' && parsedCover?.colors ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: parsedCover.colors[0] }]} />
          ) : (
            <LinearGradient
              colors={heroColors}
              locations={[0, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
          )}

          {parsedCover?.type !== 'image' && (
            <LinearGradient
              colors={
                theme.dark
                  ? ['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)', theme.colors.background]
                  : ['rgba(0,0,0,0.05)', 'rgba(250,248,243,0.55)', theme.colors.background]
              }
              locations={[0, 0.6, 1]}
              style={StyleSheet.absoluteFill}
            />
          )}

          {/* Nav overlay */}
          <SafeAreaView style={styles.navOverlay} edges={['top']}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Volver"
              style={styles.heroBtn}
              onPress={() => state.router.back()}
            >
              <ChevronLeft size={22} color="#F3EEE3" strokeWidth={1.8} />
            </Pressable>

            {state.id !== 'unassigned' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {state.canEdit && state.currentUserId && (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={state.isFav ? 'Quitar de favoritos' : 'Marcar como favorito'}
                      style={styles.heroBtn}
                      onPress={() =>
                        state.toggleFavoriteAlbum.mutate({
                          albumId: state.id,
                          currentlyFavorite: state.isFav,
                        })
                      }
                    >
                      <Star
                        size={20}
                        color={state.isFav ? '#D4B13A' : '#F3EEE3'}
                        fill={state.isFav ? '#D4B13A' : 'transparent'}
                        strokeWidth={1.8}
                      />
                    </Pressable>
                    {albumLikesCount > 0 && (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Ver me gusta"
                        style={styles.heroBtn}
                        onPress={() => setShowLikesModal(true)}
                      >
                        <Heart
                          size={20}
                          color="#EF4444"
                          fill="#EF4444"
                          strokeWidth={1.8}
                        />
                      </Pressable>
                    )}
                  </>
                )}
                {!state.canEdit && state.currentUserId && (
                  <>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={state.isLiked ? 'Quitar me gusta' : 'Dar me gusta'}
                      style={styles.heroBtn}
                      onPress={state.handleToggleLikeAlbum}
                      onLongPress={() => setShowLikesModal(true)}
                    >
                      <Heart
                        size={20}
                        color={state.isLiked ? '#EF4444' : '#F3EEE3'}
                        fill={state.isLiked ? '#EF4444' : 'transparent'}
                        strokeWidth={1.8}
                      />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={state.isSaved ? 'Quitar de guardados' : 'Guardar álbum'}
                      style={styles.heroBtn}
                      onPress={state.handleToggleSaveAlbum}
                    >
                      <Bookmark
                        size={20}
                        color={state.isSaved ? '#D4B13A' : '#F3EEE3'}
                        fill={state.isSaved ? '#D4B13A' : 'transparent'}
                        strokeWidth={1.8}
                      />
                    </Pressable>
                  </>
                )}
                {state.currentUserId && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Notificaciones"
                    style={styles.heroBtn}
                    onPress={() => state.setShowNotificationModal(true)}
                  >
                    <Bell
                      size={20}
                      color={state.subStatus === 'accepted' ? '#D4B13A' : '#F3EEE3'}
                      fill={state.subStatus === 'accepted' ? '#D4B13A' : 'transparent'}
                      strokeWidth={1.8}
                    />
                  </Pressable>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Más opciones"
                  style={styles.heroBtn}
                  onPress={state.handleMore}
                >
                  <MoreHorizontal size={20} color="#F3EEE3" strokeWidth={1.8} />
                </Pressable>
              </View>
            )}
          </SafeAreaView>
        </View>

        {/* Chips */}
        {state.id !== 'unassigned' && (
          <AlbumHeaderBadges
            album={album}
            canEdit={state.canEdit}
            isAlbumClosed={isAlbumClosed}
            areAllCompleted={areAllCompleted}
            onOpenStatus={() => {
              if (state.canEdit) {
                state.setSheetMode('status');
                state.setSheetVisible(true);
              }
            }}
            onOpenVisibility={() => {
              if (state.canEdit) {
                state.setSheetMode('visibility');
                state.setSheetVisible(true);
              }
            }}
            onOpenPriority={() => {
              if (state.canEdit) {
                state.setSheetMode('priority');
                state.setSheetVisible(true);
              }
            }}
          />
        )}

        {/* Título */}
        {state.canEdit && state.id !== 'unassigned' ? (
          <TextInput
            defaultValue={title}
            onChangeText={state.handleTitleChange}
            onBlur={state.flushTitleChange}
            placeholder={t('albums.album_name_placeholder', { defaultValue: 'Nombre del álbum' })}
            placeholderTextColor="#8F8F8F"
            style={styles.titleInput}
            multiline
          />
        ) : (
          <Text style={styles.title}>{title}</Text>
        )}

        {/* Descripción */}
        {state.canEdit && state.id !== 'unassigned' ? (
          <TextInput
            defaultValue={album.description || ''}
            onChangeText={state.handleDescriptionChange}
            onBlur={state.flushDescriptionChange}
            placeholder={t('albums.add_description_placeholder', { defaultValue: 'Añade una descripción...' })}
            placeholderTextColor="#666666"
            style={styles.albumDescriptionInput}
            multiline
          />
        ) : album.description ? (
          <Text style={styles.albumDescription}>{album.description}</Text>
        ) : null}

        {/* Colaboradores y creadores del álbum (círculos consistentes con tareas, sin "Creado por:") */}
        {(album.owner || (state.albumCollaborators && state.albumCollaborators.length > 0) || state.canEdit) && state.id !== 'unassigned' && (
          <View style={styles.collaboratorsSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.collaboratorsRow}
            >
              {/* Propietario */}
              {album.owner && (
                <Pressable
                  key={`owner-${album.owner.id}`}
                  onPress={() => state.router.push(`/profile/${album.owner!.id}` as any)}
                  style={[styles.collaboratorCircle, { borderColor: '#D4B13A', borderWidth: 2.5 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Perfil de ${album.owner.display_name || album.owner.username || 'propietario'}`}
                >
                  {album.owner.avatar_url ? (
                    <Image
                      source={{ uri: normalizeStorageUrl(album.owner.avatar_url) }}
                      style={styles.collaboratorAvatarImg}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <Text style={styles.collaboratorInitials}>
                      {(album.owner.display_name || album.owner.username || '?').slice(0, 2).toUpperCase()}
                    </Text>
                  )}
                </Pressable>
              )}

              {/* Colaboradores */}
              {state.albumCollaborators
                ?.filter((c: any) => c.id !== album.owner?.id)
                .map((collab: any) => {
                  const isPending = collab.status === 'pending';
                  return (
                    <Pressable
                      key={collab.id}
                      onPress={() => {
                        if (isPending && state.canEdit) {
                          state.setShowCollaboratorPicker(true);
                        } else if (collab.id) {
                          state.router.push(`/profile/${collab.id}` as any);
                        }
                      }}
                      style={[
                        styles.collaboratorCircle,
                        { borderColor: isPending ? 'rgba(212, 177, 58, 0.45)' : 'rgba(255, 255, 255, 0.15)', borderWidth: 2 },
                        isPending && styles.collaboratorCirclePending,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Perfil de ${collab.display_name || collab.username || 'colaborador'}`}
                    >
                      {collab.avatar_url ? (
                        <Image
                          source={{ uri: normalizeStorageUrl(collab.avatar_url) }}
                          style={[styles.collaboratorAvatarImg, isPending && { opacity: 0.35 }]}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <Text style={[styles.collaboratorInitials, isPending && { opacity: 0.35 }]}>
                          {(collab.display_name || collab.username || '?').slice(0, 2).toUpperCase()}
                        </Text>
                      )}
                      {isPending && (
                        <View style={styles.pendingCenterOverlay}>
                          <Text style={styles.pendingCenterText}>
                            {t('albums.collaborator_pending', { defaultValue: 'Pendiente' })}
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}

              {/* Botón para añadir colaborador si puede editar */}
              {state.canEdit && (
                <Pressable
                  style={styles.addCollaboratorCircle}
                  onPress={() => state.setShowCollaboratorPicker(true)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={t('albums.add_collaborator', { defaultValue: 'Añadir colaborador' })}
                >
                  <UserPlus size={22} color="#D4B13A" strokeWidth={1.8} />
                </Pressable>
              )}
            </ScrollView>
          </View>
        )}

        {/* Etiquetas del álbum */}
        {(state.albumTags.length > 0 || (state.canEdit && state.id !== 'unassigned')) && (
          <View style={{ paddingHorizontal: 20, marginTop: 10, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              {state.albumTags.map((tItem) => (
                <Pressable
                  key={tItem.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 11,
                    paddingVertical: 5,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: tItem.color || '#D4B13A',
                    backgroundColor: hexToRgba(tItem.color || '#D4B13A', 0.15),
                  }}
                  onPress={() => {
                    if (state.canEdit) {
                      state.setShowTagAssignSheet(true);
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Etiqueta ${tItem.name}`}
                >
                  {tItem.emoji ? <Text style={{ fontSize: 13 }}>{tItem.emoji}</Text> : null}
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: tItem.color || '#D4B13A' }}>
                    {tItem.name}
                  </Text>
                </Pressable>
              ))}

              {state.canEdit && state.id !== 'unassigned' && (
                <Pressable
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surfaceSunken,
                  }}
                  onPress={() => state.setShowTagAssignSheet(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('albums.tags', { defaultValue: 'Etiquetas' })}
                >
                  <Plus size={14} color="#8F8F8F" strokeWidth={2} />
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: '#8F8F8F' }}>
                    {state.albumTags.length === 0
                      ? t('albums.add_tag', { defaultValue: 'Añadir etiqueta' })
                      : t('albums.tags', { defaultValue: 'Etiquetas' })}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Barra de progreso */}
        <View style={styles.progressCard}>
          <Text style={styles.progressPercent}>{progressPercent}%</Text>
          <View style={styles.progressRight}>
            <Text style={styles.progressTitle}>
              {t('albums.progress_completed_of', {
                completed: completedCount,
                total,
                defaultValue: `${completedCount} de ${total} completadas`,
              })}
            </Text>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressSub}>
              {total === 0
                ? t('albums.progress_empty', { defaultValue: 'Sin tareas en este álbum' })
                : areAllCompleted
                ? t('albums.progress_all_done', { defaultValue: '¡Álbum completado!' })
                : t('albums.progress_keep_going', { defaultValue: 'Sigue sumando momentos' })}
            </Text>
          </View>
        </View>

        {/* Botón rápido marcar todas */}
        {state.canEdit && total > 0 && (
          <Pressable
            style={[styles.toggleAllBtn, areAllCompleted && styles.toggleAllBtnActive]}
            onPress={state.handleToggleAllTasks}
          >
            {areAllCompleted ? (
              <>
                <RotateCcw size={16} color="#D4B13A" />
                <Text style={styles.toggleAllBtnText}>
                  {t('albums.mark_all_pending', { defaultValue: 'Marcar todas como pendientes' })}
                </Text>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} color="#D4B13A" />
                <Text style={styles.toggleAllBtnText}>
                  {t('albums.mark_all_completed', { defaultValue: 'Marcar todas como completadas' })}
                </Text>
              </>
            )}
          </Pressable>
        )}

        {/* Toolbar de tareas (orden y búsqueda) */}
        {total > 0 && (
          <View
            style={styles.tasksToolbarWrap}
            onLayout={(e) => {
              state.toolbarY.current = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.tasksToolbar}>
              <Text style={styles.toolbarLabel}>
                {t('albums.sort_by', { defaultValue: 'Ordenar por:' })}
              </Text>
              <Pressable
                ref={state.taskSortTriggerRef}
                collapsable={false}
                style={styles.toolbarSortBtn}
                onPress={openTaskSortMenu}
              >
                <Text style={styles.toolbarSortText}>
                  {state.taskSortField === 'priority'
                    ? t('albums.sort_priority', { defaultValue: 'Prioridad' })
                    : state.taskSortField === 'alphabetical'
                    ? t('albums.sort_name', { defaultValue: 'Nombre' })
                    : state.taskSortField === 'completed_at'
                    ? t('albums.sort_completed_date', { defaultValue: 'Fecha de completado' })
                    : t('albums.sort_manual', { defaultValue: 'Manual' })}
                </Text>
                {state.taskSortField !== 'manual' &&
                  (state.taskSortDir === 'desc' ? (
                    <ArrowDown size={14} color="#D4B13A" />
                  ) : (
                    <ArrowUp size={14} color="#D4B13A" />
                  ))}
              </Pressable>

              <View style={{ flex: 1 }} />

              {state.canEdit && (
                <Pressable
                  style={styles.toolbarIconBtn}
                  onPress={() => (state.isSelectionMode ? state.handleExitSelection() : state.startSelection())}
                  accessibilityLabel={state.isSelectionMode ? 'Salir de la selección' : 'Seleccionar tareas'}
                >
                  <ListChecks size={16} color={state.isSelectionMode ? '#D4B13A' : '#8F8F8F'} />
                </Pressable>
              )}

              <Pressable
                style={styles.toolbarIconBtn}
                onPress={() => {
                  if (state.taskSearchOpen) state.setTaskSearch('');
                  state.setTaskSearchOpen(!state.taskSearchOpen);
                }}
              >
                <Search size={16} color={state.taskSearchOpen ? '#D4B13A' : '#8F8F8F'} />
              </Pressable>
            </View>

            {state.taskSearchOpen && (
              <View style={styles.taskSearchBox}>
                <Search size={16} color="#8F8F8F" />
                <TextInput
                  placeholder={t('albums.search_placeholder', { defaultValue: 'Buscar en el álbum...' })}
                  placeholderTextColor="#8F8F8F"
                  value={state.taskSearch}
                  onChangeText={state.setTaskSearch}
                  onFocus={() => {
                    setTimeout(() => {
                      state.scrollRef.current?.scrollTo({
                        y: Math.max(0, state.toolbarY.current - 20),
                        animated: true,
                      });
                    }, 150);
                  }}
                  autoFocus
                  style={styles.taskSearchInput}
                />
                {state.taskSearch.length > 0 && (
                  <Pressable
                    onPress={() => state.setTaskSearch('')}
                    hitSlop={8}
                    accessibilityLabel="Borrar búsqueda"
                  >
                    <X size={16} color="#8F8F8F" />
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}

        {/* Tareas pendientes */}
        {pendientes.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitleLeft, { color: '#D4B13A' }]}>
                {t('albums.pending_section', {
                  count: pendientes.length,
                  defaultValue: `PENDIENTES · ${pendientes.length}`,
                })}
              </Text>
            </View>
            {manualDragEnabled ? (
              <View style={styles.taskListDraggable}>
                <DraggableTaskList
                  items={pendientes}
                  onReorder={(ids) => handleReorderSection('pendientes', ids)}
                  onDraggingChange={state.setDragging}
                  renderItem={(item, drag) => renderTaskCard(item, drag)}
                />
              </View>
            ) : (
              <View style={styles.taskList}>
                {pendientes.map((task) => renderTaskCard(task))}
              </View>
            )}
          </View>
        )}

        {/* Tareas completadas */}
        {completadas.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitleLeft, { color: '#22C55E' }]}>
                {t('albums.completed_section', {
                  count: completadas.length,
                  defaultValue: `COMPLETADAS · ${completadas.length}`,
                })}
              </Text>
            </View>
            {manualDragEnabled ? (
              <View style={styles.taskListDraggable}>
                <DraggableTaskList
                  items={completadas}
                  onReorder={(ids) => handleReorderSection('completadas', ids)}
                  onDraggingChange={state.setDragging}
                  renderItem={(item, drag) => renderTaskCard(item, drag)}
                />
              </View>
            ) : (
              <View style={styles.taskList}>
                {completadas.map((task) => renderTaskCard(task))}
              </View>
            )}
          </View>
        )}

        {isSearchingTasks && pendientes.length === 0 && completadas.length === 0 && (
          <Text style={styles.noResultsText}>
            {t('albums.no_tasks_search', { defaultValue: 'No se encontraron tareas con ese nombre' })}
          </Text>
        )}

        {/* Sección de comentarios y me gusta del álbum al final */}
        {state.id !== 'unassigned' && (
          <View style={{ paddingHorizontal: 20, marginTop: 24, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Pressable
                onPress={() => setShowLikesModal(true)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Ver me gusta"
              >
                <Heart
                  size={16}
                  color="#EF4444"
                  fill={state.isLiked ? '#EF4444' : 'transparent'}
                  strokeWidth={1.8}
                />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, color: theme.colors.foregroundMuted }}>
                  {albumLikesCount}{' '}
                  {albumLikesCount === 1
                    ? t('collections.likes_count_single', { count: 1, defaultValue: 'me gusta' })
                    : t('collections.likes_count_plural', { count: albumLikesCount, defaultValue: 'me gusta' })}
                </Text>
              </Pressable>
            </View>

            <ItemCommentsSection
              targetId={album.id}
              targetType="album"
              ownerId={album.ownerId}
              title={album.title}
              onOpenModal={(autoFocus) => {
                setCommentsAutoFocus(!!autoFocus);
                setShowCommentsModal(true);
              }}
            />
          </View>
        )}
      </ScrollView>

      {/* Selección múltiple: mismo menú inferior que en «Mi lista» */}
      {state.isSelectionMode && state.canEdit && (
        <BulkTaskActionBar
          selectedIds={state.selectedTaskIds.filter((sid) => tasks.some((t) => t.id === sid))}
          totalTasksCount={visibleTaskIds.length}
          onClearSelection={state.handleExitSelection}
          onSelectAll={() => {
            state.setSelectedTaskIds(isAllSelected ? [] : visibleTaskIds);
          }}
          isAllSelected={isAllSelected}
        />
      )}

      {/* Barra inferior */}
      {!state.isSelectionMode && (
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {state.canEdit ? (
          <>
            {state.id !== 'unassigned' && (
              <Pressable
                style={styles.btnEdit}
                onPress={() => state.router.push(`/(modals)/create-album?id=${state.id}` as any)}
              >
                <Text style={styles.btnEditText}>
                  {t('albums.edit_album', { defaultValue: 'Editar' })}
                </Text>
              </Pressable>
            )}
            <Pressable
              style={styles.btnAdd}
              onPress={() => state.router.push(state.id === 'unassigned' ? '/add-task' : `/add-task?albumId=${state.id}`)}
            >
              <Text style={styles.btnAddText}>
                {t('albums.add_task', { defaultValue: 'Añadir tarea' })}
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={styles.btnCopyAlbum}
            onPress={state.handleCopyEntireAlbum}
            disabled={state.copyingAlbum}
          >
            <FolderPlus size={18} color="#0D0D0D" strokeWidth={2.4} />
            <Text style={styles.btnCopyAlbumText}>
              {state.copyingAlbum
                ? t('albums.copying_album', { defaultValue: 'Copiando álbum…' })
                : t('albums.copy_album_to_list', { defaultValue: 'Copiar álbum a mi lista' })}
            </Text>
          </Pressable>
        )}
      </View>
      )}

      {/* Sheet de opciones */}
      <AlbumOptionsSheet
        onReport={() => setTimeout(() => setReportVisible(true), 250)}
        visible={state.sheetVisible}
        sheetMode={state.sheetMode}
        sheetTranslateY={state.sheetTranslateY}
        isFav={state.isFav}
        isSaved={state.isSaved}
        isOwner={state.isOwner}
        isCollaborator={state.isCollaborator}
        canEdit={state.canEdit}
        areAllCompleted={areAllCompleted}
        isAlbumClosed={isAlbumClosed}
        albumVisibility={album.visibility}
        albumPriority={album.priority}
        albumIsClosed={album.is_closed}
        tasksLength={tasks.length}
        currentUserId={state.currentUserId}
        albumId={state.id}
        hasCustomCover={Boolean(parsedCover?.type === 'image' && parsedCover?.uri)}
        coverAspectRatio={parsedCover?.aspectRatio || '16:9'}
        onClose={() => state.closeSheet()}
        onToggleFavorite={() =>
          state.toggleFavoriteAlbum.mutate({
            albumId: state.id,
            currentlyFavorite: state.isFav,
          })
        }
        onToggleSave={state.handleToggleSaveAlbum}
        onToggleAllTasks={state.handleToggleAllTasks}
        onCopyAlbum={state.handleCopyEntireAlbum}
        onShare={state.handleShare}
        onPickGallery={() => void state.pickAndUploadCover()}
        onTakePhoto={() => void state.takePhotoAndUploadCover()}
        onOpenCoverLink={() => state.setShowCoverLinkModal(true)}
        onRecropCover={() => void state.recropCurrentCover()}
        onChangeCoverShape={(ratio) => void state.handleChangeCoverShape(ratio)}
        onRemoveCover={() => void state.removeCover()}
        onToggleClose={state.handleToggleCloseAlbum}
        onChangePriority={state.handleChangePriority}
        onChangeVisibility={state.handleChangeVisibility}
        onSetSheetMode={state.setSheetMode}
        onOpenCollaborators={() => {
          state.closeSheet();
          state.setShowCollaboratorPicker(true);
        }}
        onOpenTags={() => {
          state.closeSheet();
          state.setShowTagAssignSheet(true);
        }}
        isAdmin={isAdmin}
        onPromoteToCollection={handlePromoteToCollection}
        onConfirmDelete={state.confirmDeleteAlbum}
        onConfirmLeave={state.confirmLeaveAlbum}
      />

      {/* Recorte y edición de fotos para portada */}
      <PhotoCropModal
        visible={!!state.cropRequest}
        uri={state.cropRequest?.uri ?? null}
        width={state.cropRequest?.width ?? 0}
        height={state.cropRequest?.height ?? 0}
        index={state.cropRequest?.index ?? 0}
        total={state.cropRequest?.total ?? 1}
        onCancel={() => state.finishPhotoEdit(null)}
        onDone={(uri) => state.finishPhotoEdit(uri)}
      />

      {/* Modal de orden de tareas */}
      <AlbumSortModal
        visible={state.taskSortMenuOpen}
        canEdit={state.canEdit}
        albumId={state.id}
        taskSortField={state.taskSortField}
        taskSortDir={state.taskSortDir}
        isReorderingTasks={state.isReorderingTasks}
        sortMenuPos={state.taskSortMenuPos}
        onClose={() => state.setTaskSortMenuOpen(false)}
        onSelectOption={handleTaskSortOption}
      />

      {/* Colaboradores */}
      <CollaboratorPickerSheet
        visible={state.showCollaboratorPicker}
        selected={[
          ...(state.ownerEntry.id ? [state.ownerEntry] : []),
          ...state.albumCollaborators.filter((c: any) => c.id !== state.ownerEntry.id),
        ]}
        onChange={state.handleCollaboratorsChange}
        onClose={() => state.setShowCollaboratorPicker(false)}
        readOnlyIds={[state.ownerEntry.id]}
      />

      {/* Notificaciones */}
      <NotificationSubscribersModal
        visible={state.showNotificationModal}
        onClose={() => state.setShowNotificationModal(false)}
        targetType="album"
        targetId={state.id}
        targetTitle={album.title}
        ownerId={album.ownerId}
        currentUserId={state.currentUserId}
      />

      {/* Modal para añadir portada desde enlace web o Google */}
      <ImageLinkModal
        visible={state.showCoverLinkModal}
        onClose={() => state.setShowCoverLinkModal(false)}
        initialQuery={album.title}
        onApplyImage={(url: string) => void state.handleSaveCoverLink(url)}
      />

      {/* Modal de etiquetas del álbum */}
      <TagAssignSheet
        visible={state.showTagAssignSheet}
        selectedTags={state.albumTags}
        onChange={state.handleSaveAlbumTags}
        onClose={() => state.setShowTagAssignSheet(false)}
      />

      {state.id !== 'unassigned' && (
        <ReportModal
          visible={reportVisible}
          onClose={() => setReportVisible(false)}
          kind="album"
          subject={album.title}
          isLoading={reportContent.isPending}
          onSubmit={async (reason, details) => {
            await reportContent.mutateAsync({
              targetType: 'album',
              targetId: state.id as string,
              reason,
              details,
            });
          }}
        />
      )}

      {/* Modal de comentarios */}
      {state.id !== 'unassigned' && (
        <TaskCommentsModal
          visible={showCommentsModal}
          onClose={() => {
            setShowCommentsModal(false);
            setCommentsAutoFocus(false);
          }}
          albumId={album.id}
          targetType="album"
          albumTitle={album.title}
          albumOwnerId={album.ownerId}
          autoFocus={commentsAutoFocus}
        />
      )}

      {/* Modal de me gusta */}
      {state.id !== 'unassigned' && (
        <ItemLikesModal
          visible={showLikesModal}
          onClose={() => setShowLikesModal(false)}
          targetId={album.id}
          targetType="album"
          title={album.title}
        />
      )}
    </View>
  );
}
