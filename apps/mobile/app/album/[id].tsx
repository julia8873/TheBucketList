import React, { useState, useRef, useEffect } from 'react';
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
  Dimensions,
  Keyboard,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronLeft,
  Share as ShareIcon,
  MoreHorizontal,
  Lock,
  Users,
  Check,
  Globe,
  CheckCircle2,
  RotateCcw,
  X,
  Star,
  Flag,
  FolderPlus,
  Search,
  ArrowUp,
  ArrowDown,
  GripVertical,
} from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '@bucketlist/ui';
import { useAlbumDetail, useDeleteAlbumDetail, TaskItem } from '../../src/services/api/albumsService';
import { supabase } from '../../src/services/supabase';
import { normalizeStorageUrl } from '../../src/constants/urls';
import { useAuthStore } from '../../src/stores/auth.store';
import { CollaboratorPickerSheet, type CollaboratorItem } from '../../src/components/CollaboratorPickerSheet';
import { useUserFavorites, useToggleFavoriteAlbum } from '../../src/hooks/useFavorites';
import { useCopyBucket, useCopiedBucketIds } from '../../src/hooks/useSocial';
import { uploadAlbumCover } from '../../src/services/api/albumCover';
import { DraggableTaskList } from '../../src/components/DraggableTaskList';
import { styles } from './AlbumDetail.styles';
import { AlbumTaskCard } from './AlbumTaskCard';
import { AlbumOptionsSheet } from './AlbumOptionsSheet';

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

  const toast = useToast();
  const copyBucket = useCopyBucket();
  const { data: copiedIds } = useCopiedBucketIds(currentUserId);
  const [copyingAlbum, setCopyingAlbum] = useState(false);

  const isSelf = (targetId?: string | null) => {
    if (!targetId || !currentUserId) return false;
    return String(targetId).toLowerCase() === String(currentUserId).toLowerCase();
  };

  const [showCollaboratorPicker, setShowCollaboratorPicker] = useState(false);

  // ── Buscar / ordenar tareas del álbum ────────────────────────────────────
  type TaskSortField = 'manual' | 'priority' | 'alphabetical' | 'completed_at';
  const [taskSortField, setTaskSortField] = useState<TaskSortField>('manual');
  const [taskSortDir, setTaskSortDir] = useState<'asc' | 'desc'>('asc');
  const [taskSortMenuOpen, setTaskSortMenuOpen] = useState(false);
  const [taskSortMenuPos, setTaskSortMenuPos] = useState({ top: 0, right: 20 });
  const taskSortTriggerRef = useRef<View>(null);
  const [taskSearchOpen, setTaskSearchOpen] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [dragging, setDragging] = useState(false);
  const [isReorderingTasks, setIsReorderingTasks] = useState(false);

  // Al buscar, el teclado no debe tapar las tareas: se añade espacio al final del scroll
  // y se sube la barra de búsqueda a la parte superior de la pantalla.
  const scrollRef = useRef<ScrollView>(null);
  const toolbarY = useRef(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  useEffect(() => {
    if (!taskSearchOpen) return;
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, toolbarY.current - 12), animated: true });
    }, 250);
    return () => clearTimeout(t);
  }, [taskSearchOpen, keyboardHeight]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<'menu' | 'visibility' | 'priority' | 'status'>('menu');
  const sheetTranslateY = useRef(new Animated.Value(420)).current;

  const titleTimeout = useRef<NodeJS.Timeout | null>(null);
  const descTimeout = useRef<NodeJS.Timeout | null>(null);

  const { data: album, isLoading, isError, refetch } = useAlbumDetail(id || '1');
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const handleRefresh = async () => {
    setManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setManualRefreshing(false);
    }
  };
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

  const isOwnerUser = Boolean(rawOwnerId && isSelf(rawOwnerId));
  const resolvedOwner = ownerProfile || album?.owner;
  const ownerEntry = {
    id: rawOwnerId || '',
    username: resolvedOwner?.username || (isOwnerUser ? user?.user_metadata?.username || user?.email?.split('@')[0] || '' : ''),
    display_name: resolvedOwner?.display_name || (isOwnerUser ? user?.user_metadata?.display_name || user?.user_metadata?.full_name || null : null),
    avatar_url: resolvedOwner?.avatar_url || (isOwnerUser ? user?.user_metadata?.avatar_url || null : null),
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
      // Anyone who can edit can remove collaborators except the creator (rawOwnerId) and self
      const toRemoveIds = albumCollaborators
        .filter((c: any) => !newIds.has(c.id) && c.id !== rawOwnerId && !isSelf(c.id))
        .map((c: any) => c.id);

      // Optimistic update: preserve existing status if already set
      const existingStatusMap = new Map<string, string>(
        albumCollaborators.map((c: any) => [c.id, c.status])
      );
      const selfCollab = albumCollaborators.find((c: any) => isSelf(c.id));
      const remainingCollabs = newCollabs.filter(c => c.id !== rawOwnerId && !isSelf(c.id));
      const mergedCollabs = [
        ...(selfCollab ? [selfCollab] : []),
        ...remainingCollabs.map((c) => ({
          ...c,
          status: existingStatusMap.get(c.id) || 'pending',
        })),
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
        if (!currentUserId) {
          Alert.alert('Inicia sesión', 'Debes iniciar sesión para cambiar la portada.');
          return;
        }
        const localUri = result.assets[0].uri;

        // Vista previa inmediata con la imagen local mientras se sube
        const previewJson = JSON.stringify({ id: 'custom-img', type: 'image', uri: localUri });
        queryClient.setQueryData(['album', id, user?.id], (old: any) =>
          old ? { ...old, coverPath: previewJson, coverKey: 'custom-img' } : old
        );

        // Subir a Supabase Storage: lo que se guarda es una URL pública que ven todos los usuarios
        let publicUrl: string;
        try {
          publicUrl = await uploadAlbumCover(currentUserId, localUri);
        } catch (uploadErr: any) {
          Alert.alert('No se pudo subir la portada', uploadErr?.message || 'Inténtalo de nuevo.');
          void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
          return;
        }
        const coverJson = JSON.stringify({ id: 'custom-img', type: 'image', uri: publicUrl });

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
    if (!canEdit) return;
    const nextCompleted = !task.isCompleted;
    const nextStatus = nextCompleted ? 'completed' : 'pending';
    const nextCompletedAt = nextCompleted ? new Date().toISOString() : null;

    // Optimistic update
    queryClient.setQueryData(['album', id, user?.id], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        tasks: old.tasks.map((t: TaskItem) =>
          t.id === task.id ? { ...t, isCompleted: nextCompleted, completedAt: nextCompletedAt } : t
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
    if (!canEdit || !album || album.tasks.length === 0) return;
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
        tasks: old.tasks.map((t: TaskItem) => ({ ...t, isCompleted: nextCompleted, completedAt: nextCompletedAt })),
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

  // Copiar una tarea concreta del álbum a mi lista
  const handleCopySingleTask = (task: TaskItem, e: any) => {
    e.stopPropagation();
    if (!currentUserId) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para añadir tareas a tu lista.');
      return;
    }
    const alreadyCopied = !!copiedIds?.includes(task.id);
    if (alreadyCopied) {
      Alert.alert('Ya en tu lista', 'Ya tienes esta tarea en tu lista.');
      return;
    }
    copyBucket.mutate(
      { bucketId: task.id, userId: currentUserId },
      {
        onSuccess: () => {
          toast.show({ message: 'Tarea añadida a tu lista 🎉' });
        },
        onError: (err: any) => {
          Alert.alert('No se pudo añadir', err?.message || 'Inténtalo de nuevo.');
        },
      }
    );
  };

  // Copiar el álbum completo con todas sus tareas
  const handleCopyEntireAlbum = () => {
    if (!currentUserId) {
      Alert.alert('Inicia sesión', 'Debes iniciar sesión para copiar este álbum.');
      return;
    }
    Alert.alert(
      '¿Copiar álbum entero?',
      `Se creará una copia de «${album?.title}» y sus ${album?.tasks?.length ?? 0} tareas en tu perfil.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Copiar álbum',
          style: 'default',
          onPress: () => void executeCopyEntireAlbum(),
        },
      ]
    );
  };

  const executeCopyEntireAlbum = async () => {
    if (!currentUserId || !album) return;
    try {
      setCopyingAlbum(true);

      // 1. Crear el nuevo álbum en el perfil del usuario actual
      const { data: newAlbum, error: albumErr } = await supabase
        .from('albums')
        .insert({
          owner_id: currentUserId,
          title: album.title,
          description: album.description || null,
          cover_path: album.coverPath || null,
          priority: album.priority || 'medium',
          visibility: 'private',
          is_shared: false,
        })
        .select()
        .single();

      if (albumErr || !newAlbum) {
        throw new Error(albumErr?.message || 'Error al crear el nuevo álbum');
      }

      // 2. Copiar cada una de las tareas del álbum
      for (const t of album.tasks) {
        const { data: origBucket } = await supabase
          .from('buckets')
          .select('*, item_subtasks(title, position)')
          .eq('id', t.id)
          .single();

        if (!origBucket) continue;

        const { data: newBucket, error: bucketErr } = await supabase
          .from('buckets')
          .insert({
            user_id: currentUserId,
            category_id: origBucket.category_id,
            title: origBucket.title,
            description: origBucket.description,
            location_text: origBucket.location_text,
            location_lat: origBucket.location_lat,
            location_lng: origBucket.location_lng,
            cover_image:
              typeof origBucket.cover_image === 'string' && origBucket.cover_image.startsWith('preset:')
                ? origBucket.cover_image
                : null,
            tags: origBucket.tags ?? null,
            visibility: 'private',
            status: 'pending',
            copied_from_id: origBucket.id,
            copied_from_user_id: origBucket.user_id,
            priority: origBucket.priority || 'medium',
          })
          .select()
          .single();

        if (bucketErr || !newBucket) continue;

        // Vincular la nueva tarea al nuevo álbum
        await supabase.from('album_items').insert({
          album_id: newAlbum.id,
          bucket_id: newBucket.id,
          position: 0,
        });

        // Copiar subtareas si tiene
        const subtasks = (origBucket.item_subtasks ?? []) as Array<{ title: string; position: number | null }>;
        if (subtasks.length > 0) {
          await supabase.from('item_subtasks').insert(
            subtasks.map((s, i) => ({
              bucket_id: newBucket.id,
              title: s.title,
              done: false,
              position: s.position ?? i,
            }))
          );
        }
      }

      // 3. Invalidar cachés
      void queryClient.invalidateQueries({ queryKey: ['albums'] });
      void queryClient.invalidateQueries({ queryKey: ['buckets'] });
      void queryClient.invalidateQueries({ queryKey: ['copiedBuckets'] });

      toast.show({ message: 'Álbum y tareas copiados a tu perfil 🎉' });

      Alert.alert(
        '¡Álbum copiado!',
        'El álbum y todas sus tareas se han añadido a tu perfil.',
        [
          { text: 'Seguir aquí', style: 'cancel' },
          {
            text: 'Ver mi nuevo álbum',
            onPress: () => router.push(`/album/${newAlbum.id}` as any),
          },
        ]
      );
    } catch (err: any) {
      console.error('Error copying entire album:', err);
      Alert.alert('No se pudo copiar el álbum', err?.message || 'Inténtalo de nuevo.');
    } finally {
      setCopyingAlbum(false);
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

  // ── Búsqueda y orden de las tareas del álbum ─────────────────────────────
  const normalizeText = (v: string) =>
    v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const searchQ = normalizeText(taskSearch.trim());
  const isSearchingTasks = searchQ.length > 0;

  const byDeadline = (a: TaskItem, b: TaskItem) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  };
  // Orden manual (album_items.position); si aún no hay orden guardado, por fecha límite.
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

  const dirSign = taskSortDir === 'asc' ? 1 : -1;
  const compareTasks = (a: TaskItem, b: TaskItem) => {
    if (taskSortField === 'priority') {
      const wa = priorityWeight(a.priority);
      const wb = priorityWeight(b.priority);
      const diff = taskSortDir === 'desc' ? wb - wa : wa - wb;
      return diff !== 0 ? diff : byManual(a, b);
    }
    if (taskSortField === 'alphabetical') {
      const cmp = a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
      return cmp !== 0 ? cmp * dirSign : byManual(a, b);
    }
    if (taskSortField === 'completed_at') {
      const ta = a.completedAt ? new Date(a.completedAt).getTime() : null;
      const tb = b.completedAt ? new Date(b.completedAt).getTime() : null;
      if (ta === null && tb === null) return byManual(a, b);
      if (ta === null) return 1; // sin fecha siempre al final
      if (tb === null) return -1;
      return ta !== tb ? (ta - tb) * dirSign : byManual(a, b);
    }
    return byManual(a, b);
  };
  const visibleTasks = isSearchingTasks
    ? tasks.filter((t) => normalizeText(t.title).includes(searchQ))
    : tasks;
  const pendientes = visibleTasks.filter((t) => !t.isCompleted).sort(compareTasks);
  const hechas = visibleTasks.filter((t) => t.isCompleted).sort(compareTasks);
  const allDone = tasks.filter((t) => t.isCompleted);

  // Arrastrar para reordenar: solo en orden manual, en modo reordenación, sin búsqueda activa y con permiso de edición.
  const manualDragEnabled =
    canEdit && id !== 'unassigned' && taskSortField === 'manual' && !isSearchingTasks && isReorderingTasks;

  const persistTaskOrder = async (orderedIds: string[]) => {
    const current = new Map(tasks.map((t) => [t.id, t.position ?? null]));
    queryClient.setQueryData(['album', id, user?.id], (old: any) => {
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
        supabase.from('album_items').update({ position: idx }).eq('album_id', id).eq('bucket_id', bid),
      ),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      console.error('Error guardando el orden de las tareas:', failed.error);
      Alert.alert('Error', 'No se pudo guardar el nuevo orden');
    }
    void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
  };

  const handleReorderSection = (section: 'pendientes' | 'hechas', orderedIds: string[]) => {
    const pendIds = pendientes.map((t) => t.id);
    const doneIds = hechas.map((t) => t.id);
    void persistTaskOrder(section === 'pendientes' ? [...orderedIds, ...doneIds] : [...pendIds, ...orderedIds]);
  };

  const openTaskSortMenu = () => {
    taskSortTriggerRef.current?.measureInWindow((x, y, w, h) => {
      setTaskSortMenuPos({
        top: y + h + 6,
        right: Dimensions.get('window').width - (x + w),
      });
      setTaskSortMenuOpen(true);
    });
  };

  const handleTaskSortOption = (field: TaskSortField) => {
    if (field === 'manual') {
      setTaskSortField('manual');
      setIsReorderingTasks(true);
      setTaskSortMenuOpen(false);
      return;
    }
    setIsReorderingTasks(false);
    if (taskSortField === field) {
      setTaskSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setTaskSortField(field);
      setTaskSortDir(field === 'alphabetical' ? 'asc' : 'desc');
      setTaskSortMenuOpen(false);
    }
  };

  const toggleTaskSearch = () => {
    if (taskSearchOpen) setTaskSearch('');
    setTaskSearchOpen((v) => !v);
  };

  const taskSortLabel =
    taskSortField === 'priority'
      ? 'Prioridad'
      : taskSortField === 'alphabetical'
      ? 'Nombre'
      : taskSortField === 'completed_at'
      ? 'Fecha de completado'
      : 'Manual';

  const total = tasks.length;
  const completedCount = allDone.length;
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

  const renderTaskCard = (task: TaskItem, drag?: { panHandlers: any; isActive: boolean }) => (
    <AlbumTaskCard
      key={task.id}
      task={task}
      canEdit={canEdit}
      copiedIds={copiedIds ?? []}
      drag={drag}
      onToggleCompleted={toggleTaskCompleted}
      onCopySingleTask={handleCopySingleTask}
    />
  );

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        scrollEnabled={!dragging}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingBottom:
            insets.bottom + (id === 'unassigned' ? 40 : 120) + (taskSearchOpen ? keyboardHeight : 0),
        }}
        refreshControl={
          manualDragEnabled || dragging ? undefined : (
            <RefreshControl refreshing={manualRefreshing} onRefresh={handleRefresh} tintColor="#D4B13A" />
          )
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

          {parsedCover?.type !== 'image' && (
            <LinearGradient
              colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)', '#0D0D0D']}
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
              onPress={() => router.back()}
            >
              <ChevronLeft size={22} color="#F3EEE3" strokeWidth={1.8} />
            </Pressable>

            {id !== 'unassigned' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
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
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Compartir"
                  style={styles.heroBtn}
                  onPress={handleShare}
                >
                  <ShareIcon size={20} color="#F3EEE3" strokeWidth={1.8} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Más opciones"
                  style={styles.heroBtn}
                  onPress={handleMore}
                >
                  <MoreHorizontal size={20} color="#F3EEE3" strokeWidth={1.8} />
                </Pressable>
              </View>
            )}
          </SafeAreaView>
        </View>

        {/* Chips */}
        {id !== 'unassigned' && (
          <View style={styles.chipsContainer}>
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
            </View>

            {/* Fila de abajo: Prioridad clickeable */}
            <View style={styles.chipsRowSecond}>
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
                  Prioridad:{' '}
                  {album.priority === 'high' || album.priority === 'urgent'
                    ? 'Alta'
                    : album.priority === 'low'
                    ? 'Baja'
                    : 'Media'}
                </Text>
              </Pressable>
            </View>
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

          // Build full participant list: owner first, then collaborators
          const everyone = [
            ...(rawOwnerId ? [ownerEntry] : []),
            ...visibleCollaborators.filter((c: any) => c.id !== rawOwnerId),
          ];

          const hasOtherCollaborators = everyone.some((c: any) => !isSelf(c.id));
          const participants = hasOtherCollaborators ? everyone : [];

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
                          source={{ uri: normalizeStorageUrl(c.avatar_url) }}
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

        {/* Botón rápido: Marcar todas completadas / Desmarcar todas (solo si puede editar) */}
        {canEdit && id !== 'unassigned' && tasks.length > 0 && (
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

        {/* Buscar y ordenar tareas */}
        {tasks.length > 0 && (
          <View
            style={styles.tasksToolbarWrap}
            onLayout={(e) => {
              toolbarY.current = e.nativeEvent.layout.y;
            }}
          >
            <View style={styles.tasksToolbar}>
              <Pressable
                onPress={toggleTaskSearch}
                hitSlop={8}
                style={styles.toolbarIconBtn}
                accessibilityRole="button"
                accessibilityLabel={taskSearchOpen ? 'Cerrar búsqueda' : 'Buscar tareas'}
              >
                {taskSearchOpen ? (
                  <X size={18} color="#D4B13A" strokeWidth={2} />
                ) : (
                  <Search size={18} color="#D4B13A" strokeWidth={2} />
                )}
              </Pressable>
              <View style={{ flex: 1 }} />
              <Text style={styles.toolbarLabel}>Ordenar por:</Text>
              <Pressable
                ref={taskSortTriggerRef}
                collapsable={false}
                onPress={openTaskSortMenu}
                hitSlop={8}
                style={styles.toolbarSortBtn}
                accessibilityRole="button"
                accessibilityLabel="Ordenar tareas"
              >
                <Text style={styles.toolbarSortText}>{taskSortLabel}</Text>
                {taskSortField !== 'manual' &&
                  (taskSortDir === 'desc' ? (
                    <ArrowDown color="#D4B13A" size={14} />
                  ) : (
                    <ArrowUp color="#D4B13A" size={14} />
                  ))}
              </Pressable>

              {taskSortField === 'manual' && canEdit && id !== 'unassigned' && !isSearchingTasks && isReorderingTasks && (
                <Pressable
                  onPress={() => setIsReorderingTasks(false)}
                  style={{
                    backgroundColor: '#D4B13A',
                    paddingHorizontal: 12,
                    paddingVertical: 4,
                    borderRadius: 6,
                    marginLeft: 8,
                  }}
                  hitSlop={8}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#0D0D0D' }}>OK</Text>
                </Pressable>
              )}
            </View>
            {taskSearchOpen && (
              <View style={styles.taskSearchBox}>
                <Search size={18} color="#8F8F8F" strokeWidth={1.8} />
                <TextInput
                  style={styles.taskSearchInput}
                  value={taskSearch}
                  onChangeText={setTaskSearch}
                  placeholder="Buscar en las tareas del álbum"
                  placeholderTextColor="#6B6B6B"
                  autoFocus
                  returnKeyType="search"
                />
                {taskSearch.length > 0 && (
                  <Pressable onPress={() => setTaskSearch('')} hitSlop={10}>
                    <X size={18} color="#8F8F8F" strokeWidth={2} />
                  </Pressable>
                )}
              </View>
            )}
          </View>
        )}

        {isSearchingTasks && pendientes.length === 0 && hechas.length === 0 && (
          <Text style={styles.noResultsText}>No hay tareas que coincidan con la búsqueda.</Text>
        )}

        {/* Pendientes */}
        {pendientes.length > 0 && (
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitleLeft}>
                <Text style={{ color: '#D4B13A' }}>PENDIENTES</Text>
                <Text style={{ color: '#FFF' }}> · {pendientes.length}</Text>
              </Text>
            </View>
            {manualDragEnabled ? (
              <View style={styles.taskListDraggable}>
                <DraggableTaskList
                  items={pendientes}
                  renderItem={(task, drag) => renderTaskCard(task, drag)}
                  onReorder={(ids) => handleReorderSection('pendientes', ids)}
                  onDraggingChange={setDragging}
                />
              </View>
            ) : (
              <View style={styles.taskList}>{pendientes.map((t) => renderTaskCard(t))}</View>
            )}
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
            {manualDragEnabled ? (
              <View style={styles.taskListDraggable}>
                <DraggableTaskList
                  items={hechas}
                  renderItem={(task, drag) => renderTaskCard(task, drag)}
                  onReorder={(ids) => handleReorderSection('hechas', ids)}
                  onDraggingChange={setDragging}
                />
              </View>
            ) : (
              <View style={styles.taskList}>{hechas.map((t) => renderTaskCard(t))}</View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Bar */}
      {id !== 'unassigned' && (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(30, insets.bottom) }]}>
          {canEdit ? (
            <>
              <Pressable
                style={styles.btnEdit}
                onPress={() => router.push(`/(modals)/create-album?id=${id}`)}
              >
                <Text style={styles.btnEditText}>Editar</Text>
              </Pressable>
              <Pressable
                style={styles.btnAdd}
                onPress={() => router.push(`/add-task?albumId=${id}`)}
              >
                <Text style={styles.btnAddText}>Añadir tarea</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              style={[styles.btnCopyAlbum, copyingAlbum && { opacity: 0.7 }]}
              onPress={handleCopyEntireAlbum}
              disabled={copyingAlbum}
            >
              {copyingAlbum ? (
                <ActivityIndicator size="small" color="#0D0D0D" />
              ) : (
                <>
                  <FolderPlus size={18} color="#0D0D0D" strokeWidth={2.2} />
                  <Text style={styles.btnCopyAlbumText}>Copiar álbum entero a mi perfil</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      )}

      {/* Menú de orden de tareas */}
      <Modal
        visible={taskSortMenuOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setTaskSortMenuOpen(false)}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setTaskSortMenuOpen(false)}>
          <View style={[styles.sortMenu, { top: taskSortMenuPos.top, right: taskSortMenuPos.right }]}>
            {([
              { field: 'manual' as const, label: 'Manual' },
              { field: 'priority' as const, label: 'Prioridad' },
              { field: 'alphabetical' as const, label: 'Nombre' },
              { field: 'completed_at' as const, label: 'Fecha de completado' },
            ]).map((option, i) => {
              const selected = taskSortField === option.field;
              return (
                <Pressable
                  key={option.field}
                  onPress={() => handleTaskSortOption(option.field)}
                  style={[styles.sortMenuItem, i > 0 && styles.sortMenuItemBorder]}
                >
                  <Text style={[styles.sortMenuText, selected && { color: '#D4B13A', fontFamily: 'Inter_600SemiBold' }]}>
                    {option.label}
                  </Text>
                  {selected && option.field !== 'manual' &&
                    (taskSortDir === 'desc' ? (
                      <ArrowDown color="#D4B13A" size={16} />
                    ) : (
                      <ArrowUp color="#D4B13A" size={16} />
                    ))}
                  {selected && option.field === 'manual' && <Check color="#D4B13A" size={16} strokeWidth={2.5} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

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
        readOnlyIds={rawOwnerId ? [rawOwnerId] : []}
      />

      {/* Options Sheet */}
      <AlbumOptionsSheet
        visible={sheetVisible}
        sheetMode={sheetMode}
        sheetTranslateY={sheetTranslateY}
        isFav={isFav}
        isOwner={isOwner}
        isCollaborator={isCollaborator}
        canEdit={canEdit}
        areAllCompleted={areAllCompleted}
        isAlbumClosed={isAlbumClosed}
        albumVisibility={album.visibility}
        albumPriority={album.priority}
        albumIsClosed={Boolean(album.is_closed)}
        tasksLength={tasks.length}
        currentUserId={currentUserId}
        albumId={id}
        onClose={() => closeSheet()}
        onToggleFavorite={() => { toggleFavoriteAlbum.mutate({ albumId: id, currentlyFavorite: isFav }); closeSheet(); }}
        onToggleAllTasks={() => void handleToggleAllTasks()}
        onCopyAlbum={() => closeSheet(() => handleCopyEntireAlbum())}
        onShare={() => closeSheet(() => void handleShare())}
        onPickCover={() => closeSheet(() => void pickAndUploadCover())}
        onToggleClose={handleToggleCloseAlbum}
        onChangePriority={handleChangePriority}
        onChangeVisibility={handleChangeVisibility}
        onSetSheetMode={setSheetMode}
        onOpenCollaborators={() => closeSheet(() => setShowCollaboratorPicker(true))}
        onConfirmDelete={confirmDeleteAlbum}
        onConfirmLeave={confirmLeaveAlbum}
      />
    </View>
  );
}
