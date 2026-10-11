import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  RefreshControl,
  Image,
  TextInput,
  Modal,
  Animated,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Share as ShareIcon,
  MoreHorizontal,
  Lock,
  Users,
  Plus,
  Check,
  Globe,
  Camera,
  CheckCircle2,
  RotateCcw,
  Eye,
  Pencil,
  Trash2,
  X,
  Star,
  Flag,
} from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useAlbumDetail, useDeleteAlbumDetail, TaskItem } from '../../src/services/api/albumsService';
import { supabase } from '../../src/services/supabase';
import { useAuthStore } from '../../src/stores/auth.store';
import { CollaboratorPickerSheet, type CollaboratorItem } from '../../src/components/CollaboratorPickerSheet';
import { useUserFavorites, useToggleFavoriteAlbum } from '../../src/hooks/useFavorites';

const GRADIENTS = {
  aurora: ['#0E4B43', '#1F8560'],
  atardecer: ['#F4A460', '#C8602F'],
  cielo: ['#3A78C4', '#8CC8F4'],
  violeta: ['#5B2F98', '#2E1A5E'],
  dorado: ['#3A2F18', '#5E4E1F'],
};

function getInitials(name?: string | null): string {
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, session } = useAuthStore();
  const currentUserId = user?.id || session?.user?.id;
  const { isAlbumFavorite } = useUserFavorites(currentUserId);
  const toggleFavoriteAlbum = useToggleFavoriteAlbum();
  const isFav = isAlbumFavorite(id);

  const isSelf = (targetId?: string | null) => {
    if (!targetId || !currentUserId) return false;
    return String(targetId).toLowerCase() === String(currentUserId).toLowerCase();
  };

  const [showCollaboratorPicker, setShowCollaboratorPicker] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<'menu' | 'visibility' | 'priority' | 'status'>('menu');
  const sheetTranslateY = useRef(new Animated.Value(420)).current;

  const titleTimeout = useRef<NodeJS.Timeout | null>(null);
  const descTimeout = useRef<NodeJS.Timeout | null>(null);

  const { data: album, isLoading, isError, refetch, isRefetching } = useAlbumDetail(id || '1');
  const deleteMutation = useDeleteAlbumDetail();

  const rawOwnerId = album?.ownerId || (album as any)?.owner_id;

  const { data: ownerProfile } = useQuery({
    queryKey: ['albumOwnerProfile', rawOwnerId],
    queryFn: async () => {
      if (!rawOwnerId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .eq('id', rawOwnerId)
        .single();
      if (error) {
        console.warn('Error fetching album owner profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!rawOwnerId,
  });

  const resolvedOwner = ownerProfile || album?.owner;
  const ownerEntry = {
    id: rawOwnerId || '',
    username: resolvedOwner?.username || '',
    display_name: resolvedOwner?.display_name || null,
    avatar_url: resolvedOwner?.avatar_url || null,
    status: 'accepted' as const,
    isOwner: true,
  };

  // Bottom sheet animation
  useEffect(() => {
    if (!sheetVisible) return;
    sheetTranslateY.setValue(420);
    Animated.spring(sheetTranslateY, {
      toValue: 0,
      damping: 24,
      stiffness: 220,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [sheetVisible, sheetTranslateY]);

  const closeSheet = (after?: () => void) => {
    Animated.timing(sheetTranslateY, {
      toValue: 420,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setSheetVisible(false);
        after?.();
      }
    });
  };

  const { data: albumCollaborators = [], refetch: refetchCollaborators } = useQuery({
    queryKey: ['albumCollaborators', id, currentUserId],
    queryFn: async () => {
      if (!id || id === 'unassigned') return [];
      const { data, error } = await supabase
        .from('album_members')
        .select('user_id, status, profiles:user_id(id, username, display_name, avatar_url)')
        .eq('album_id', id);
      if (error) {
        console.warn('Error fetching album collaborators:', error);
        return [];
      }
      return (data || []).map((row: any) => {
        const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
        return {
          id: row.user_id,
          username: p?.username || '',
          display_name: p?.display_name || null,
          avatar_url: p?.avatar_url || null,
          status: row.status,
        };
      });
    },
    enabled: !!id && id !== 'unassigned',
  });

  const isOwner = Boolean(rawOwnerId && isSelf(rawOwnerId));
  const isCollaborator = !isOwner && albumCollaborators.some((c: any) => isSelf(c.id) && c.status === 'accepted');
  const canEdit = isOwner || isCollaborator;

  // Collaborators change handler
  const handleCollaboratorsChange = async (newCollabs: CollaboratorItem[]) => {
    try {
      const currentIds = new Set(albumCollaborators.map((c: any) => c.id));
      const newIds = new Set(newCollabs.map((c) => c.id));

      const toAdd = newCollabs.filter(
        (c) => !currentIds.has(c.id) && c.id !== rawOwnerId && !isSelf(c.id)
      );
      // Only the owner can remove collaborators
      const toRemoveIds = isOwner
        ? albumCollaborators.filter((c: any) => !newIds.has(c.id)).map((c: any) => c.id)
        : [];

      // Optimistic update: preserve existing status if already set
      const existingStatusMap = new Map<string, string>(
        albumCollaborators.map((c: any) => [c.id, c.status])
      );
      // Merge: if not owner, keep existing collabs + add new ones
      const mergedCollabs = isOwner
        ? newCollabs.map((c) => ({
            ...c,
            status: existingStatusMap.get(c.id) || 'pending',
          }))
        : [
            ...albumCollaborators,
            ...toAdd.map((c) => ({ ...c, status: 'pending' })),
          ];
      queryClient.setQueryData(['albumCollaborators', id], mergedCollabs);

      if (toAdd.length > 0) {
        const { error: insErr } = await supabase.from('album_members').insert(
          toAdd.map((c) => ({
            album_id: id,
            user_id: c.id,
            role: 'member',
            status: 'pending',
          }))
        );
        if (insErr) console.warn('Error adding album members:', insErr);
      }

      if (toRemoveIds.length > 0) {
        const { error: delErr } = await supabase
          .from('album_members')
          .delete()
          .eq('album_id', id)
          .in('user_id', toRemoveIds);
        if (delErr) console.warn('Error removing album members:', delErr);
      }

      if (newCollabs.length > 0 && !album?.isShared) {
        await supabase.from('albums').update({ is_shared: true }).eq('id', id);
        void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
        void queryClient.invalidateQueries({ queryKey: ['albums'] });
      }

      void refetchCollaborators();
      void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['albums'] });
    } catch (err) {
      console.warn('Error updating album collaborators:', err);
      void refetchCollaborators();
    }
  };

  const confirmLeaveAlbum = () => {
    closeSheet(() => {
      Alert.alert(
        'Dejar de colaborar',
        '¿Quieres salir de este álbum compartido? Dejará de aparecer en tu lista.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Salir',
            style: 'destructive',
            onPress: async () => {
              const { error } = await supabase
                .from('album_members')
                .delete()
                .eq('album_id', id)
                .eq('user_id', user!.id);
              if (error) {
                Alert.alert('Error', error.message);
              } else {
                void queryClient.invalidateQueries({ queryKey: ['albums'] });
                router.back();
              }
            },
          },
        ]
      );
    });
  };

  // Inline Title Change
  const handleTitleChange = (newTitle: string) => {
    queryClient.setQueryData(['album', id, user?.id], (old: any) =>
      old ? { ...old, title: newTitle } : old
    );
    if (titleTimeout.current) clearTimeout(titleTimeout.current);
    titleTimeout.current = setTimeout(async () => {
      if (!newTitle.trim()) return;
      const { error } = await supabase
        .from('albums')
        .update({ title: newTitle.trim() })
        .eq('id', id);
      if (!error) {
        void queryClient.invalidateQueries({ queryKey: ['albums'] });
      }
    }, 500);
  };

  // Inline Description Change
  const handleDescriptionChange = (newDesc: string) => {
    queryClient.setQueryData(['album', id, user?.id], (old: any) =>
      old ? { ...old, description: newDesc } : old
    );
    if (descTimeout.current) clearTimeout(descTimeout.current);
    descTimeout.current = setTimeout(async () => {
      const { error } = await supabase
        .from('albums')
        .update({ description: newDesc.trim() })
        .eq('id', id);
      if (!error) {
        void queryClient.invalidateQueries({ queryKey: ['albums'] });
      }
    }, 500);
  };

  // Visibility Change
  const handleChangeVisibility = async (newVisibility: 'public' | 'followers' | 'private') => {
    queryClient.setQueryData(['album', id, user?.id], (old: any) =>
      old ? { ...old, visibility: newVisibility } : old
    );
    closeSheet();

    const { error } = await supabase
      .from('albums')
      .update({ visibility: newVisibility })
      .eq('id', id);

    if (error) {
      Alert.alert('Error', 'No se pudo cambiar la visibilidad');
      void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
      return;
    }

    void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
    void queryClient.invalidateQueries({ queryKey: ['albums'] });
  };

  // Priority Change
  const handleChangePriority = async (newPriority: 'low' | 'medium' | 'high') => {
    queryClient.setQueryData(['album', id, user?.id], (old: any) =>
      old ? { ...old, priority: newPriority } : old
    );
    closeSheet();

    const { error } = await supabase
      .from('albums')
      .update({ priority: newPriority })
      .eq('id', id);

    if (error) {
      Alert.alert('Error', 'No se pudo cambiar la prioridad');
    }
    void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
    void queryClient.invalidateQueries({ queryKey: ['albums'] });
  };

  // Close / Reopen Album
  const handleToggleCloseAlbum = async (close: boolean) => {
    queryClient.setQueryData(['album', id, user?.id], (old: any) =>
      old ? { ...old, is_closed: close, closed_at: close ? new Date().toISOString() : null } : old
    );
    closeSheet();

    const { error } = await supabase
      .from('albums')
      .update({
        is_closed: close,
        closed_at: close ? new Date().toISOString() : null,
      })
      .eq('id', id);

    if (error) {
      Alert.alert('Error', close ? 'No se pudo cerrar el álbum' : 'No se pudo reabrir el álbum');
    }
    void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
    void queryClient.invalidateQueries({ queryKey: ['albums'] });
  };

  // Cover Change directly from album screen
  const pickAndUploadCover = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const newCover = {
          id: 'custom-img',
          type: 'image',
          uri: result.assets[0].uri,
        };
        const coverJson = JSON.stringify(newCover);

        queryClient.setQueryData(['album', id, user?.id], (old: any) =>
          old ? { ...old, coverPath: coverJson, coverKey: 'custom-img' } : old
        );

        const { error } = await supabase
          .from('albums')
          .update({ cover_path: coverJson })
          .eq('id', id);

        if (error) {
          Alert.alert('Error', 'No se pudo actualizar la portada');
          void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
          return;
        }

        void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
        void queryClient.invalidateQueries({ queryKey: ['albums'] });
      }
    } catch (err: any) {
      Alert.alert('Error al seleccionar imagen', err?.message || 'Inténtalo de nuevo');
    }
  };

  // Toggle single task completed / pending
  const toggleTaskCompleted = async (task: TaskItem, e: any) => {
    e.stopPropagation();
    const nextCompleted = !task.isCompleted;
    const nextStatus = nextCompleted ? 'completed' : 'pending';
    const nextCompletedAt = nextCompleted ? new Date().toISOString() : null;

    // Optimistic update
    queryClient.setQueryData(['album', id, user?.id], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        tasks: old.tasks.map((t: TaskItem) =>
          t.id === task.id ? { ...t, isCompleted: nextCompleted } : t
        ),
      };
    });

    const { error } = await supabase
      .from('buckets')
      .update({ status: nextStatus, completed_at: nextCompletedAt })
      .eq('id', task.id);

    if (error) {
      console.error('Error toggling task status:', error);
      void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
      return;
    }

    void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
    void queryClient.invalidateQueries({ queryKey: ['buckets'] });
    void queryClient.invalidateQueries({ queryKey: ['bucketDetail', task.id] });
  };

  // Toggle all tasks completed / pending
  const handleToggleAllTasks = async () => {
    if (!album || album.tasks.length === 0) return;
    const areAllCompleted = album.tasks.every((t) => t.isCompleted);
    const nextCompleted = !areAllCompleted;
    const nextStatus = nextCompleted ? 'completed' : 'pending';
    const nextCompletedAt = nextCompleted ? new Date().toISOString() : null;
    const taskIds = album.tasks.map((t) => t.id);

    // Optimistic update
    queryClient.setQueryData(['album', id, user?.id], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        tasks: old.tasks.map((t: TaskItem) => ({ ...t, isCompleted: nextCompleted })),
      };
    });

    closeSheet();

    const { error } = await supabase
      .from('buckets')
      .update({ status: nextStatus, completed_at: nextCompletedAt })
      .in('id', taskIds);

    if (error) {
      Alert.alert('Error', 'No se pudieron actualizar las tareas');
      void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
      return;
    }

    void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
    void queryClient.invalidateQueries({ queryKey: ['albums'] });
    void queryClient.invalidateQueries({ queryKey: ['buckets'] });
  };

  const handleShare = async () => {
    if (!album) return;
    try {
      await Share.share({
        message: `Mira mi álbum «${album.title}» en TheBucketList`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleMore = () => {
    setSheetMode('menu');
    setSheetVisible(true);
  };

  const confirmDeleteAlbum = () => {
    closeSheet(() => {
      Alert.alert('¿Eliminar este álbum?', 'Las tareas pasarán a Sin álbum.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar álbum',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(id || '1', {
              onSuccess: () => router.back(),
            });
          },
        },
      ]);
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: '#0D0D0D' }]}>
        <ActivityIndicator color="#D4B13A" size="large" />
      </View>
    );
  }

  if (isError || !album) {
    return (
      <View style={[styles.center, { backgroundColor: '#0D0D0D' }]}>
        <Text style={styles.errorText}>No se pudo cargar el álbum</Text>
      </View>
    );
  }

  const { title, coverKey, coverPath, isShared, tasks } = album;
  const pendientes = tasks
    .filter((t) => !t.isCompleted)
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  const hechas = tasks.filter((t) => t.isCompleted);

  const total = tasks.length;
  const completedCount = hechas.length;
  const progressPercent = total === 0 ? 0 : Math.round((completedCount / total) * 100);
  const areAllCompleted = total > 0 && completedCount === total;

  let parsedCover: any = null;
  if (coverPath) {
    try {
      parsedCover = JSON.parse(coverPath);
    } catch {
      // Ignored
    }
  }

  const gradientColors = GRADIENTS[coverKey as keyof typeof GRADIENTS] || GRADIENTS.aurora;
  const heroColors = [gradientColors[0], gradientColors[1], '#0D0D0D'] as readonly [
    string,
    string,
    ...string[]
  ];
  const isAlbumClosed = Boolean(album.is_closed);
  const statusLabel = isAlbumClosed
    ? 'Cerrado'
    : total === 0
    ? 'En curso'
    : completedCount === total
    ? 'Completado'
    : 'En curso';

  const getBadgeText = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Mañana';
    if (diffDays > 1) return `${diffDays} días`;
    return null;
  };

  const getSubTitle = (task: TaskItem) => {
    if (task.isCompleted) return `${task.categoryName} · Completada`;
    if (task.stepsTotal && task.stepsTotal > 0)
      return `${task.categoryName} · ${task.stepsCompleted || 0} de ${task.stepsTotal} pasos`;
    if (task.location) return `${task.categoryName} · ${task.location}`;
    return task.categoryName;
  };

  const renderTask = (task: TaskItem) => {
    const isDone = task.isCompleted;
    const thumbGradient = (GRADIENTS[task.coverKey as keyof typeof GRADIENTS] ||
      GRADIENTS.aurora) as unknown as readonly [string, string, ...string[]];
    const isDiagonal = task.coverKey === 'dorado';
    const subTitle = getSubTitle(task);
    const badge = getBadgeText(task.dueDate);

    return (
      <Pressable
        key={task.id}
        style={styles.taskCard}
        onPress={() => router.push(`/bucket/${task.id}`)}
        accessibilityRole="button"
      >
        <View style={[styles.taskThumbContainer, isDone && { opacity: 0.5 }]}>
          <LinearGradient
            colors={thumbGradient}
            start={isDiagonal ? { x: 0, y: 0 } : { x: 0.5, y: 0 }}
            end={isDiagonal ? { x: 1, y: 1 } : { x: 0.5, y: 1 }}
            style={styles.taskThumb}
          />
        </View>
        <View style={styles.taskContent}>
          <Text
            style={[styles.taskTitle, isDone && { color: '#BDB7AA', textDecorationLine: 'line-through' }]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          <Text style={styles.taskSub}>{subTitle}</Text>
          {!isDone &&
            task.dueDate &&
            new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0) && (
              <Text style={[styles.taskSub, { color: '#EF4444', marginTop: 2 }]}>
                Programada para:{' '}
                {new Date(task.dueDate).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            )}
          {!isDone && task.stepsTotal !== undefined && task.stepsTotal > 0 && (
            <View style={styles.taskStepsTrack}>
              <View
                style={[
                  styles.taskStepsFill,
                  { width: `${((task.stepsCompleted || 0) / task.stepsTotal) * 100}%` },
                ]}
              />
            </View>
          )}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {!isDone && badge && (
            <View style={styles.taskBadge}>
              <Text style={styles.taskBadgeText}>{badge}</Text>
            </View>
          )}

          {/* Interactive Checkbox */}
          <Pressable
            hitSlop={8}
            onPress={(e) => void toggleTaskCompleted(task, e)}
            style={[
              styles.checkCircleTouch,
              isDone ? styles.checkCircleDone : styles.checkCircleEmpty,
            ]}
          >
            {isDone && <Check size={16} color="#0D0D0D" strokeWidth={3} />}
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + (id === 'unassigned' ? 40 : 120) }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#D4B13A" />
        }
      >
        {/* Hero */}
        <View style={styles.hero}>
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

          <LinearGradient
            colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)', '#0D0D0D']}
            locations={[0, 0.6, 1]}
            style={StyleSheet.absoluteFill}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver"
            style={[styles.heroBtn, { left: 20, top: Math.max(52, insets.top) }]}
            onPress={() => router.back()}
          >
            <ChevronLeft size={22} color="#F3EEE3" strokeWidth={1.8} />
          </Pressable>

          {id !== 'unassigned' && (
            <View style={{ position: 'absolute', right: 12, top: Math.max(52, insets.top), flexDirection: 'row', gap: 8 }}>
              {currentUserId && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isFav ? 'Quitar de favoritos' : 'Marcar como favorito'}
                  style={styles.heroBtn}
                  onPress={() => toggleFavoriteAlbum.mutate({ albumId: id, currentlyFavorite: isFav })}
                >
                  <Star
                    size={20}
                    color={isFav ? '#D4B13A' : '#F3EEE3'}
                    fill={isFav ? '#D4B13A' : 'transparent'}
                    strokeWidth={1.8}
                  />
                </Pressable>
              )}
              {canEdit && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cambiar portada"
                  style={styles.heroBtn}
                  onPress={() => void pickAndUploadCover()}
                >
                  <Camera size={20} color="#F3EEE3" strokeWidth={1.8} />
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Compartir"
                style={styles.heroBtn}
                onPress={handleShare}
              >
                <ShareIcon size={22} color="#F3EEE3" strokeWidth={1.8} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Más opciones"
                style={styles.heroBtn}
                onPress={handleMore}
              >
                <MoreHorizontal size={22} color="#F3EEE3" strokeWidth={1.8} />
              </Pressable>
            </View>
          )}
        </View>

        {/* Chips */}
        {id !== 'unassigned' && (
          <View style={styles.chipsRow}>
            {/* Estado clickeable */}
            <Pressable
              style={[
                styles.chip,
                styles.chipStatus,
                isAlbumClosed && { borderColor: '#D4B13A', backgroundColor: '#2C2512' },
                !isAlbumClosed && areAllCompleted && { borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.14)' },
                canEdit && styles.chipPressable,
              ]}
              onPress={() => {
                if (canEdit) {
                  setSheetMode('status');
                  setSheetVisible(true);
                }
              }}
            >
              {isAlbumClosed ? (
                <>
                  <Lock size={14} color="#D4B13A" strokeWidth={2} />
                  <Text style={[styles.chipStatusText, { color: '#D4B13A' }]}>Cerrado</Text>
                </>
              ) : areAllCompleted ? (
                <>
                  <Check size={14} color="#22C55E" strokeWidth={2.5} />
                  <Text style={[styles.chipStatusText, { color: '#22C55E' }]}>Completado</Text>
                </>
              ) : (
                <Text style={styles.chipStatusText}>En curso</Text>
              )}
            </Pressable>

            {/* Prioridad clickeable */}
            <Pressable
              style={[styles.chip, canEdit && styles.chipPressable]}
              onPress={() => {
                if (canEdit) {
                  setSheetMode('priority');
                  setSheetVisible(true);
                }
              }}
            >
              <Flag
                size={14}
                color={
                  album.priority === 'high' || album.priority === 'urgent'
                    ? '#EF4444'
                    : album.priority === 'low'
                    ? '#10B981'
                    : '#D4B13A'
                }
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.chipText,
                  {
                    color:
                      album.priority === 'high' || album.priority === 'urgent'
                        ? '#EF4444'
                        : album.priority === 'low'
                        ? '#10B981'
                        : '#D4B13A',
                    fontWeight: '600',
                  },
                ]}
              >
                {album.priority === 'high' || album.priority === 'urgent'
                  ? 'Alta'
                  : album.priority === 'low'
                  ? 'Baja'
                  : 'Media'}
              </Text>
            </Pressable>

            {/* Visibilidad clickeable para cambiar al instante */}
            <Pressable
              style={[styles.chip, canEdit && styles.chipPressable]}
              onPress={() => {
                if (canEdit) {
                  setSheetMode('visibility');
                  setSheetVisible(true);
                }
              }}
            >
              {album.visibility === 'public' ? (
                <>
                  <Globe size={15} color="#F3EEE3" strokeWidth={1.8} />
                  <Text style={styles.chipText}>Público</Text>
                </>
              ) : album.visibility === 'followers' ? (
                <>
                  <Users size={15} color="#F3EEE3" strokeWidth={1.8} />
                  <Text style={styles.chipText}>Solo amigos</Text>
                </>
              ) : (
                <>
                  <Lock size={15} color="#F3EEE3" strokeWidth={1.8} />
                  <Text style={styles.chipText}>Privado</Text>
                </>
              )}
            </Pressable>

            {/* Compartido clickeable para gestionar colaboradores */}
            {isShared && (
              <Pressable
                style={[styles.chip, styles.chipShared, canEdit && styles.chipPressable]}
                onPress={() => {
                  if (canEdit) setShowCollaboratorPicker(true);
                }}
              >
                <Users size={15} color="#D4B13A" strokeWidth={1.8} />
                <Text style={styles.chipSharedText}>Compartido</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Title (Inline editable con auto-save) */}
        {canEdit && id !== 'unassigned' ? (
          <TextInput
            style={styles.titleInput}
            defaultValue={title}
            onChangeText={handleTitleChange}
            multiline
            placeholder="Nombre del álbum"
            placeholderTextColor="#6B6B6B"
          />
        ) : (
          <Text style={styles.title}>{title}</Text>
        )}

        {/* Description (Inline editable con auto-save) */}
        {canEdit && id !== 'unassigned' ? (
          <TextInput
            style={styles.albumDescriptionInput}
            defaultValue={album.description || ''}
            onChangeText={handleDescriptionChange}
            multiline
            placeholder="Añade una descripción al álbum..."
            placeholderTextColor="#6B6B6B"
          />
        ) : album.description ? (
          <Text style={styles.albumDescription}>{album.description}</Text>
        ) : null}

        {/* Colaboradores del álbum */}
        {id !== 'unassigned' && (() => {
          const visibleCollaborators = albumCollaborators.filter((c: any) => {
            if (c.status === 'accepted') return true;
            if (c.status === 'pending') return canEdit || isSelf(c.id);
            return false;
          });

          // Build full participant list: owner first (if not current user), then collaborators
          // Exclude the current user (you already know you're in the album)
          // and avoid duplicating if owner is also in album_members table
          const participants = [
            ...(rawOwnerId && !isSelf(rawOwnerId) ? [ownerEntry] : []),
            ...visibleCollaborators.filter((c: any) => c.id !== rawOwnerId && !isSelf(c.id)),
          ];

          if (participants.length === 0 && !canEdit) return null;

          return (
            <View style={styles.collaboratorsSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.collaboratorsRow}
              >
                {participants.map((c: any) => {
                  const isPending = c.status === 'pending';
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => canEdit && setShowCollaboratorPicker(true)}
                      style={[
                        styles.collaboratorCircle,
                        isPending && styles.collaboratorCirclePending,
                        c.isOwner && { borderColor: '#D4B13A', borderWidth: 2.5 },
                      ]}
                    >
                      {c.avatar_url ? (
                        <Image
                          source={{ uri: c.avatar_url }}
                          style={[styles.collaboratorAvatarImg, isPending && { opacity: 0.35 }]}
                        />
                      ) : (
                        <Text style={[styles.collaboratorInitials, isPending && { opacity: 0.35 }]}>
                          {getInitials(c.display_name || c.username)}
                        </Text>
                      )}
                      {isPending && (
                        <View style={styles.pendingCenterOverlay}>
                          <Text style={styles.pendingCenterText}>Pendiente</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}

                {canEdit && (
                  <Pressable
                    style={styles.addCollaboratorCircle}
                    onPress={() => setShowCollaboratorPicker(true)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Añadir colaborador al álbum"
                  >
                    <View style={styles.addCollabIconRow}>
                      <Text style={styles.addCollabEmoji}>👤</Text>
                      <Text style={styles.addCollabPlus}>+</Text>
                    </View>
                  </Pressable>
                )}
              </ScrollView>
            </View>
          );
        })()}

        {/* Progress Card */}
        <View style={styles.progressCard}>
          <Text style={styles.progressPercent}>{progressPercent}%</Text>
          <View style={styles.progressRight}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.progressTitle}>Progreso del álbum</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
            </View>
            <Text style={styles.progressSub}>
              {completedCount} de {total} tareas completadas
            </Text>
          </View>
        </View>

        {/* Botón rápido: Marcar todas completadas / Desmarcar todas */}
        {id !== 'unassigned' && tasks.length > 0 && (
          <Pressable
            style={[styles.toggleAllBtn, areAllCompleted && styles.toggleAllBtnActive]}
            onPress={() => void handleToggleAllTasks()}
          >
            {areAllCompleted ? (
              <>
                <RotateCcw size={15} color="#D4B13A" strokeWidth={2.2} />
                <Text style={styles.toggleAllBtnText}>Desmarcar todas las tareas</Text>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} color="#D4B13A" strokeWidth={2.2} />
                <Text style={styles.toggleAllBtnText}>Marcar todas como completadas</Text>
              </>
            )}
          </Pressable>
        )}

        {/* Pendientes */}
        {pendientes.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleLeft}>
                <Text style={{ color: '#D4B13A' }}>PENDIENTES</Text>
                <Text style={{ color: '#FFF' }}> · {pendientes.length}</Text>
              </Text>
              {id !== 'unassigned' && (
                <Pressable
                  style={styles.addBtn}
                  onPress={() => router.push(`/add-task?albumId=${id}`)}
                >
                  <Plus size={16} color="#D4B13A" strokeWidth={2} />
                  <Text style={styles.addBtnText}>Añadir</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.taskList}>{pendientes.map(renderTask)}</View>
          </View>
        )}

        {/* Hechas */}
        {hechas.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleLeft}>
                <Text style={{ color: '#D4B13A' }}>HECHAS</Text>
                <Text style={{ color: '#FFF' }}> · {hechas.length}</Text>
              </Text>
            </View>
            <View style={styles.taskList}>{hechas.map(renderTask)}</View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Bar */}
      {id !== 'unassigned' && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(30, insets.bottom) }]}>
          {canEdit && (
            <Pressable
              style={styles.btnEdit}
              onPress={() => router.push(`/(modals)/create-album?id=${id}`)}
            >
              <Text style={styles.btnEditText}>Editar</Text>
            </Pressable>
          )}
          <Pressable
            style={styles.btnAdd}
            onPress={() => router.push(`/add-task?albumId=${id}`)}
          >
            <Text style={styles.btnAddText}>Añadir tarea</Text>
          </Pressable>
        </View>
      )}

      {/* Collaborator Picker Sheet */}
      <CollaboratorPickerSheet
        visible={showCollaboratorPicker}
        selected={[
          // Owner entry (always shown, unless the current user IS the owner)
          ...(rawOwnerId && !isSelf(rawOwnerId) ? [{
            id: rawOwnerId,
            username: resolvedOwner?.username || '',
            display_name: resolvedOwner?.display_name || null,
            avatar_url: resolvedOwner?.avatar_url || null,
            status: 'accepted' as const,
          }] : []),
          // Other collaborators except the current user
          ...albumCollaborators.filter((c: any) => !isSelf(c.id) && c.status === 'accepted'),
        ]}
        onChange={handleCollaboratorsChange}
        onClose={() => setShowCollaboratorPicker(false)}
        readOnlyIds={isOwner
          ? []
          : [
              ...(rawOwnerId ? [rawOwnerId] : []),
              ...albumCollaborators
                .filter((c: any) => c.status === 'accepted' && !isSelf(c.id))
                .map((c: any) => c.id),
            ]
        }
      />

      {/* Album Options & Visibility Bottom Sheet */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="none"
        onRequestClose={() => closeSheet()}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => closeSheet()} />
          <Animated.View
            style={[
              styles.bottomSheet,
              { transform: [{ translateY: sheetTranslateY }] },
            ]}
          >
            <View style={styles.sheetHandle} />

            {sheetMode === 'menu' && (
              <>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetHeaderText}>Opciones del álbum</Text>
                  <Pressable style={styles.sheetCloseBtn} onPress={() => closeSheet()}>
                    <X color="#8F8F8F" size={20} />
                  </Pressable>
                </View>

                <View style={styles.sheetOptions}>
                  {currentUserId && id !== 'unassigned' && (
                    <Pressable
                      style={styles.sheetOption}
                      onPress={() => {
                        toggleFavoriteAlbum.mutate({ albumId: id, currentlyFavorite: isFav });
                        closeSheet();
                      }}
                    >
                      <View style={styles.sheetIconBox}>
                        <Star
                          color="#D4B13A"
                          fill={isFav ? '#D4B13A' : 'transparent'}
                          size={20}
                        />
                      </View>
                      <View style={styles.sheetOptionTexts}>
                        <Text style={styles.sheetOptionTitle}>
                          {isFav ? 'Quitar de favoritos' : 'Marcar como favorito'}
                        </Text>
                        <Text style={styles.sheetOptionSubtitle}>
                          {isFav
                            ? 'Elimina este álbum de tu lista de favoritos'
                            : 'Guarda este álbum en tus favoritos'}
                        </Text>
                      </View>
                    </Pressable>
                  )}

                  {tasks.length > 0 && (
                    <Pressable
                      style={styles.sheetOption}
                      onPress={() => void handleToggleAllTasks()}
                    >
                      <View style={styles.sheetIconBox}>
                        {areAllCompleted ? (
                          <RotateCcw color="#D4B13A" size={20} />
                        ) : (
                          <CheckCircle2 color="#D4B13A" size={20} />
                        )}
                      </View>
                      <View style={styles.sheetOptionTexts}>
                        <Text style={styles.sheetOptionTitle}>
                          {areAllCompleted
                            ? 'Marcar todas como pendientes'
                            : 'Marcar todas como completadas'}
                        </Text>
                        <Text style={styles.sheetOptionSubtitle}>
                          {areAllCompleted
                            ? 'Revertir estado de todas las tareas'
                            : 'Completa todas las tareas del álbum'}
                        </Text>
                      </View>
                    </Pressable>
                  )}

                  {canEdit && (
                    <Pressable
                      style={styles.sheetOption}
                      onPress={() => {
                        closeSheet(() => void pickAndUploadCover());
                      }}
                    >
                      <View style={styles.sheetIconBox}>
                        <Camera color="#D4B13A" size={20} />
                      </View>
                      <View style={styles.sheetOptionTexts}>
                        <Text style={styles.sheetOptionTitle}>Cambiar portada</Text>
                        <Text style={styles.sheetOptionSubtitle}>
                          Elige una foto de tu galería
                        </Text>
                      </View>
                    </Pressable>
                  )}

                  {canEdit && (
                    <Pressable
                      style={styles.sheetOption}
                      onPress={() => {
                        handleToggleCloseAlbum(!isAlbumClosed);
                      }}
                    >
                      <View style={styles.sheetIconBox}>
                        <Lock color="#D4B13A" size={20} />
                      </View>
                      <View style={styles.sheetOptionTexts}>
                        <Text style={styles.sheetOptionTitle}>
                          {isAlbumClosed ? 'Reabrir álbum' : 'Cerrar álbum para siempre'}
                        </Text>
                        <Text style={styles.sheetOptionSubtitle}>
                          {isAlbumClosed
                            ? 'Permite volver a añadir tareas al álbum'
                            : 'Marca el álbum como cerrado y completado definitivamente'}
                        </Text>
                      </View>
                    </Pressable>
                  )}

                  {canEdit && (
                    <Pressable
                      style={styles.sheetOption}
                      onPress={() => setSheetMode('priority')}
                    >
                      <View style={styles.sheetIconBox}>
                        <Flag color="#D4B13A" size={20} />
                      </View>
                      <View style={styles.sheetOptionTexts}>
                        <Text style={styles.sheetOptionTitle}>Cambiar prioridad</Text>
                        <Text style={styles.sheetOptionSubtitle}>
                          {album.priority === 'high' || album.priority === 'urgent'
                            ? 'Prioridad Alta'
                            : album.priority === 'low'
                            ? 'Prioridad Baja'
                            : 'Prioridad Media'}
                        </Text>
                      </View>
                    </Pressable>
                  )}

                  {canEdit && (
                    <Pressable
                      style={styles.sheetOption}
                      onPress={() => setSheetMode('visibility')}
                    >
                      <View style={styles.sheetIconBox}>
                        <Eye color="#D4B13A" size={20} />
                      </View>
                      <View style={styles.sheetOptionTexts}>
                        <Text style={styles.sheetOptionTitle}>Cambiar visibilidad</Text>
                        <Text style={styles.sheetOptionSubtitle}>
                          {album.visibility === 'public'
                            ? 'Público actualmente'
                            : album.visibility === 'followers'
                            ? 'Solo amigos actualmente'
                            : 'Privado actualmente'}
                        </Text>
                      </View>
                    </Pressable>
                  )}

                  {canEdit && (
                    <Pressable
                      style={styles.sheetOption}
                      onPress={() => {
                        closeSheet(() => setShowCollaboratorPicker(true));
                      }}
                    >
                      <View style={styles.sheetIconBox}>
                        <Users color="#D4B13A" size={20} />
                      </View>
                      <View style={styles.sheetOptionTexts}>
                        <Text style={styles.sheetOptionTitle}>Gestionar colaboradores</Text>
                        <Text style={styles.sheetOptionSubtitle}>
                          Invita o quita personas de este álbum
                        </Text>
                      </View>
                    </Pressable>
                  )}

                  {canEdit && (
                    <Pressable
                      style={styles.sheetOption}
                      onPress={() => {
                        closeSheet(() => router.push(`/(modals)/create-album?id=${id}`));
                      }}
                    >
                      <View style={styles.sheetIconBox}>
                        <Pencil color="#D4B13A" size={20} />
                      </View>
                      <View style={styles.sheetOptionTexts}>
                        <Text style={styles.sheetOptionTitle}>Editar detalles completos</Text>
                        <Text style={styles.sheetOptionSubtitle}>
                          Nombre, portada, privacidad y más
                        </Text>
                      </View>
                    </Pressable>
                  )}

                  {isOwner && (
                    <Pressable
                      style={[styles.sheetOption, { borderBottomWidth: 0 }]}
                      onPress={confirmDeleteAlbum}
                    >
                      <View style={[styles.sheetIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                        <Trash2 color="#EF4444" size={20} />
                      </View>
                      <View style={styles.sheetOptionTexts}>
                        <Text style={[styles.sheetOptionTitle, { color: '#EF4444' }]}>
                          Eliminar álbum
                        </Text>
                        <Text style={styles.sheetOptionSubtitle}>
                          Las tareas se moverán a Sin álbum
                        </Text>
                      </View>
                    </Pressable>
                  )}

                  {isCollaborator && (
                    <Pressable
                      style={[styles.sheetOption, { borderBottomWidth: 0 }]}
                      onPress={confirmLeaveAlbum}
                    >
                      <View style={[styles.sheetIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                        <Trash2 color="#EF4444" size={20} />
                      </View>
                      <View style={styles.sheetOptionTexts}>
                        <Text style={[styles.sheetOptionTitle, { color: '#EF4444' }]}>
                          Dejar de colaborar
                        </Text>
                        <Text style={styles.sheetOptionSubtitle}>
                          El álbum dejará de aparecer en tu lista
                        </Text>
                      </View>
                    </Pressable>
                  )}
                </View>
              </>
            )}

            {sheetMode === 'visibility' && (
              <>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetHeaderText}>Visibilidad del álbum</Text>
                  <Pressable style={styles.sheetCloseBtn} onPress={() => closeSheet()}>
                    <X color="#8F8F8F" size={20} />
                  </Pressable>
                </View>

                <View style={styles.sheetOptions}>
                  {([
                    {
                      value: 'public',
                      title: 'Público',
                      subtitle: 'Visible para toda la comunidad',
                      icon: Globe,
                    },
                    {
                      value: 'followers',
                      title: 'Solo amigos',
                      subtitle: 'Visible solo para tus seguidores',
                      icon: Users,
                    },
                    {
                      value: 'private',
                      title: 'Privado',
                      subtitle: 'Solo tú y los colaboradores que invites',
                      icon: Lock,
                    },
                  ] as const).map((item) => {
                    const IconComponent = item.icon;
                    const isSelected = album.visibility === item.value;
                    return (
                      <Pressable
                        key={item.value}
                        style={styles.sheetOption}
                        onPress={() => void handleChangeVisibility(item.value)}
                      >
                        <View style={[styles.sheetIconBox, isSelected && { backgroundColor: 'rgba(212, 177, 58, 0.2)' }]}>
                          <IconComponent color={isSelected ? '#D4B13A' : '#8F8F8F'} size={20} />
                        </View>
                        <View style={styles.sheetOptionTexts}>
                          <Text style={[styles.sheetOptionTitle, isSelected && { color: '#D4B13A' }]}>
                            {item.title}
                          </Text>
                          <Text style={styles.sheetOptionSubtitle}>{item.subtitle}</Text>
                        </View>
                        {isSelected && <Check color="#D4B13A" size={20} strokeWidth={2.5} />}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {sheetMode === 'priority' && (
              <>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetHeaderText}>Prioridad del álbum</Text>
                  <Pressable style={styles.sheetCloseBtn} onPress={() => closeSheet()}>
                    <X color="#8F8F8F" size={20} />
                  </Pressable>
                </View>

                <View style={styles.sheetOptions}>
                  {([
                    {
                      value: 'high' as const,
                      title: 'Alta',
                      subtitle: 'Máxima prioridad para este álbum',
                      color: '#EF4444',
                    },
                    {
                      value: 'medium' as const,
                      title: 'Media',
                      subtitle: 'Prioridad normal',
                      color: '#EAB308',
                    },
                    {
                      value: 'low' as const,
                      title: 'Baja',
                      subtitle: 'Prioridad secundaria',
                      color: '#10B981',
                    },
                  ]).map((item) => {
                    const isSelected = (album.priority ?? 'medium') === item.value;
                    return (
                      <Pressable
                        key={item.value}
                        style={styles.sheetOption}
                        onPress={() => void handleChangePriority(item.value)}
                      >
                        <View style={[styles.sheetIconBox, { backgroundColor: `${item.color}20` }]}>
                          <Flag color={item.color} size={20} fill={isSelected ? item.color : 'none'} />
                        </View>
                        <View style={styles.sheetOptionTexts}>
                          <Text style={[styles.sheetOptionTitle, isSelected && { color: item.color }]}>
                            {item.title}
                          </Text>
                          <Text style={styles.sheetOptionSubtitle}>{item.subtitle}</Text>
                        </View>
                        {isSelected && <Check color="#D4B13A" size={20} strokeWidth={2.5} />}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {sheetMode === 'status' && (
              <>
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetHeaderText}>Estado del álbum</Text>
                  <Pressable style={styles.sheetCloseBtn} onPress={() => closeSheet()}>
                    <X color="#8F8F8F" size={20} />
                  </Pressable>
                </View>

                <View style={styles.sheetOptions}>
                  <Pressable
                    style={styles.sheetOption}
                    onPress={() => void handleToggleCloseAlbum(false)}
                  >
                    <View style={[styles.sheetIconBox, !album.is_closed && { backgroundColor: 'rgba(212, 177, 58, 0.2)' }]}>
                      <RotateCcw color={!album.is_closed ? '#D4B13A' : '#8F8F8F'} size={20} />
                    </View>
                    <View style={styles.sheetOptionTexts}>
                      <Text style={[styles.sheetOptionTitle, !album.is_closed && { color: '#D4B13A' }]}>
                        Abierto (En progreso / Completado)
                      </Text>
                      <Text style={styles.sheetOptionSubtitle}>
                        El álbum permanece activo y se pueden seguir completando o añadiendo tareas
                      </Text>
                    </View>
                    {!album.is_closed && <Check color="#D4B13A" size={20} strokeWidth={2.5} />}
                  </Pressable>

                  <Pressable
                    style={styles.sheetOption}
                    onPress={() => void handleToggleCloseAlbum(true)}
                  >
                    <View style={[styles.sheetIconBox, album.is_closed && { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                      <Lock color={album.is_closed ? '#EF4444' : '#8F8F8F'} size={20} />
                    </View>
                    <View style={styles.sheetOptionTexts}>
                      <Text style={[styles.sheetOptionTitle, album.is_closed && { color: '#EF4444' }]}>
                        Cerrar álbum (Completado para siempre)
                      </Text>
                      <Text style={styles.sheetOptionSubtitle}>
                        El álbum se marca como cerrado definitivamente
                      </Text>
                    </View>
                    {album.is_closed && <Check color="#EF4444" size={20} strokeWidth={2.5} />}
                  </Pressable>
                </View>
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#A0A0A0',
  },
  scroll: {
    flex: 1,
  },
  hero: {
    height: 200,
    width: '100%',
  },
  heroBtn: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(13,13,13,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    marginTop: 14,
    paddingHorizontal: 20,
    gap: 8,
  },
  chip: {
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chipPressable: {
    borderColor: '#383838',
  },
  chipStatus: {
    borderColor: '#D4B13A',
    backgroundColor: '#2C2512',
  },
  chipShared: {
    borderColor: '#6B5A22',
    backgroundColor: 'rgba(212, 177, 58, 0.12)',
  },
  chipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#F3EEE3',
  },
  chipStatusText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#D4B13A',
  },
  chipSharedText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#D4B13A',
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 34,
    lineHeight: 40,
    color: '#F3EEE3',
    marginTop: 14,
    marginHorizontal: 20,
  },
  titleInput: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 34,
    lineHeight: 40,
    color: '#F3EEE3',
    marginTop: 14,
    marginHorizontal: 20,
    padding: 0,
  },
  albumDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#A0A0A0',
    marginTop: 6,
    marginHorizontal: 20,
  },
  albumDescriptionInput: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#C0BAAF',
    marginTop: 6,
    marginHorizontal: 20,
    padding: 0,
  },
  collaboratorsSection: {
    marginHorizontal: 20,
    marginTop: 14,
  },
  collaboratorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  collaboratorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#D4B13A',
    backgroundColor: '#181818',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  collaboratorCirclePending: {
    borderColor: 'rgba(212, 177, 58, 0.45)',
    borderStyle: 'dashed',
    backgroundColor: '#141414',
  },
  pendingCenterOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  pendingCenterText: {
    fontSize: 6.5,
    fontFamily: 'Inter_600SemiBold',
    color: '#D4B13A',
    letterSpacing: 0.2,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  collaboratorAvatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  collaboratorInitials: {
    color: '#D4B13A',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  addCollaboratorCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.8,
    borderColor: '#D4B13A',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 177, 58, 0.04)',
  },
  addCollabIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCollabEmoji: {
    fontSize: 18,
  },
  addCollabPlus: {
    fontSize: 16,
    fontWeight: '800',
    color: '#D4B13A',
    marginLeft: 1,
  },
  progressCard: {
    marginTop: 18,
    marginHorizontal: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  progressPercent: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 36,
    lineHeight: 40,
    color: '#D4B13A',
  },
  progressRight: {
    flex: 1,
  },
  progressTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#F3EEE3',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2A2A2A',
    marginTop: 8,
    marginBottom: 6,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#D4B13A',
  },
  progressSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#A0A0A0',
  },
  toggleAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#383218',
    backgroundColor: 'rgba(212, 177, 58, 0.08)',
  },
  toggleAllBtnActive: {
    borderColor: '#423719',
    backgroundColor: 'rgba(212, 177, 58, 0.12)',
  },
  toggleAllBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#D4B13A',
  },
  sectionContainer: {
    marginTop: 24,
  },
  sectionHeader: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleLeft: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 15,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#D4B13A',
  },
  taskList: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 10,
  },
  taskCard: {
    minHeight: 76,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    padding: 10,
    paddingRight: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  taskThumbContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
  },
  taskThumb: {
    flex: 1,
  },
  taskContent: {
    flex: 1,
    justifyContent: 'center',
  },
  taskTitle: {
    fontFamily: 'PlayfairDisplay_600SemiBold',
    fontSize: 18,
    lineHeight: 22,
    color: '#F3EEE3',
  },
  taskSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 3,
  },
  taskStepsTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2A2A2A',
    marginTop: 8,
    width: '100%',
  },
  taskStepsFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#D4B13A',
  },
  taskBadge: {
    height: 30,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#6B5A22',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#D4B13A',
  },
  checkCircleTouch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: {
    backgroundColor: '#D4B13A',
  },
  checkCircleEmpty: {
    borderWidth: 1.5,
    borderColor: '#4A4A4A',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0D0D0D',
    borderTopWidth: 1,
    borderTopColor: '#262626',
    paddingTop: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 12,
  },
  btnEdit: {
    height: 56,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D4B13A',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnEditText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: '#D4B13A',
  },
  btnAdd: {
    height: 56,
    borderRadius: 999,
    backgroundColor: '#D4B13A',
    flex: 1.4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnAddText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 17,
    color: '#0D0D0D',
  },

  // Bottom Sheet
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  bottomSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    paddingHorizontal: 20,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.22)',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 8,
  },
  sheetHeaderText: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
    color: '#F3EEE3',
  },
  sheetCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptions: {
    gap: 2,
  },
  sheetOption: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#262626',
  },
  sheetIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,177,58,0.10)',
    marginRight: 14,
  },
  sheetOptionTexts: {
    flex: 1,
  },
  sheetOptionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#F3EEE3',
    marginBottom: 2,
  },
  sheetOptionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#8F8F8F',
  },
});
