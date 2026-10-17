import { useState, useRef, useEffect } from 'react';
import {
  View,
  Alert,
  Share,
  Platform,
  Dimensions,
  Keyboard,
  ScrollView,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useToast } from '@bucketlist/ui';

import { useAlbumDetail, useDeleteAlbumDetail, TaskItem } from '@/services/api/albumsService';
import { supabase } from '@/services/supabase';
import { useAuthStore } from '@/stores/auth.store';
import { CollaboratorItem } from '@/components/CollaboratorPickerSheet';
import { useUserFavorites, useToggleFavoriteAlbum } from '@/hooks/useFavorites';
import { useEntitySubscription } from '@/hooks/useEntityNotifications';
import { useCopyBucket, useCopiedBucketIds } from '@/hooks/useSocial';
import { uploadAlbumCover } from '@/services/api/albumCover';
import { TaskSortField, TaskSortDir } from '../components/AlbumSortModal';

export function useAlbumDetailState() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
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
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const { data: entitySub } = useEntitySubscription('album', id, currentUserId);
  const subStatus = entitySub?.status;

  const [taskSortField, setTaskSortField] = useState<TaskSortField>('manual');
  const [taskSortDir, setTaskSortDir] = useState<TaskSortDir>('asc');
  const [taskSortMenuOpen, setTaskSortMenuOpen] = useState(false);
  const [taskSortMenuPos, setTaskSortMenuPos] = useState({ top: 0, right: 20 });
  const taskSortTriggerRef = useRef<View>(null);
  const [taskSearchOpen, setTaskSearchOpen] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [dragging, setDragging] = useState(false);
  const [isReorderingTasks, setIsReorderingTasks] = useState(false);

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

  const titleTimeout = useRef<any>(null);
  const descTimeout = useRef<any>(null);

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

  const handleCollaboratorsChange = async (newCollabs: CollaboratorItem[]) => {
    try {
      const currentIds = new Set(albumCollaborators.map((c: any) => c.id));
      const newIds = new Set(newCollabs.map((c) => c.id));

      const toAdd = newCollabs.filter(
        (c) => !currentIds.has(c.id) && c.id !== rawOwnerId && !isSelf(c.id)
      );
      const toRemoveIds = albumCollaborators
        .filter((c: any) => !newIds.has(c.id) && c.id !== rawOwnerId && !isSelf(c.id))
        .map((c: any) => c.id);

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

  const pendingTitle = useRef<string | null>(null);
  const lastSavedTitle = useRef<string | null>(null);
  const pendingDesc = useRef<string | null>(null);
  const lastSavedDesc = useRef<string | null>(null);

  const flushTitleChange = async () => {
    if (titleTimeout.current) {
      clearTimeout(titleTimeout.current);
      titleTimeout.current = null;
    }
    const titleToSave = pendingTitle.current;
    if (titleToSave === null || !titleToSave.trim()) return;
    if (lastSavedTitle.current !== null && titleToSave.trim() === lastSavedTitle.current) return;

    lastSavedTitle.current = titleToSave.trim();
    const { error } = await supabase
      .from('albums')
      .update({ title: titleToSave.trim() })
      .eq('id', id);
    if (!error) {
      void queryClient.invalidateQueries({ queryKey: ['albums'] });
      void queryClient.invalidateQueries({ queryKey: ['album', id] });
    }
  };

  const handleTitleChange = (newTitle: string) => {
    pendingTitle.current = newTitle;
    queryClient.setQueryData(['album', id, user?.id], (old: any) =>
      old ? { ...old, title: newTitle } : old
    );
    if (titleTimeout.current) clearTimeout(titleTimeout.current);
    titleTimeout.current = setTimeout(flushTitleChange, 1500);
  };

  const flushDescriptionChange = async () => {
    if (descTimeout.current) {
      clearTimeout(descTimeout.current);
      descTimeout.current = null;
    }
    const descToSave = pendingDesc.current;
    if (descToSave === null) return;
    if (lastSavedDesc.current !== null && descToSave.trim() === (lastSavedDesc.current || '').trim()) return;

    lastSavedDesc.current = descToSave.trim();
    const { error } = await supabase
      .from('albums')
      .update({ description: descToSave.trim() })
      .eq('id', id);
    if (!error) {
      void queryClient.invalidateQueries({ queryKey: ['albums'] });
      void queryClient.invalidateQueries({ queryKey: ['album', id] });
    }
  };

  const handleDescriptionChange = (newDesc: string) => {
    pendingDesc.current = newDesc;
    queryClient.setQueryData(['album', id, user?.id], (old: any) =>
      old ? { ...old, description: newDesc } : old
    );
    if (descTimeout.current) clearTimeout(descTimeout.current);
    descTimeout.current = setTimeout(flushDescriptionChange, 1500);
  };

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
        const previewJson = JSON.stringify({ id: 'custom-img', type: 'image', uri: localUri });
        queryClient.setQueryData(['album', id, user?.id], (old: any) =>
          old ? { ...old, coverPath: previewJson, coverKey: 'custom-img' } : old
        );

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

  const toggleTaskCompleted = async (task: TaskItem, e: any) => {
    e.stopPropagation();
    if (!canEdit) return;
    const nextCompleted = !task.isCompleted;
    const nextStatus = nextCompleted ? 'completed' : 'pending';
    const nextCompletedAt = nextCompleted ? new Date().toISOString() : null;

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

  const handleToggleAllTasks = async () => {
    if (!canEdit || !album || album.tasks.length === 0) return;
    const areAllCompleted = album.tasks.every((t) => t.isCompleted);
    const nextCompleted = !areAllCompleted;
    const nextStatus = nextCompleted ? 'completed' : 'pending';
    const nextCompletedAt = nextCompleted ? new Date().toISOString() : null;
    const taskIds = album.tasks.map((t) => t.id);

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

  const executeCopyEntireAlbum = async () => {
    if (!currentUserId || !album) return;
    try {
      setCopyingAlbum(true);
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

        await supabase.from('album_items').insert({
          album_id: newAlbum.id,
          bucket_id: newBucket.id,
          position: 0,
        });

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

  return {
    id,
    router,
    queryClient,
    user,
    currentUserId,
    isFav,
    toggleFavoriteAlbum,
    copiedIds,
    copyingAlbum,
    album,
    isLoading,
    isError,
    ownerEntry,
    albumCollaborators,
    isOwner,
    isCollaborator,
    canEdit,
    taskSortField,
    setTaskSortField,
    taskSortDir,
    setTaskSortDir,
    taskSortMenuOpen,
    setTaskSortMenuOpen,
    taskSortMenuPos,
    setTaskSortMenuPos,
    taskSortTriggerRef,
    taskSearchOpen,
    setTaskSearchOpen,
    taskSearch,
    setTaskSearch,
    dragging,
    setDragging,
    isReorderingTasks,
    setIsReorderingTasks,
    scrollRef,
    toolbarY,
    keyboardHeight,
    sheetVisible,
    setSheetVisible,
    sheetMode,
    setSheetMode,
    sheetTranslateY,
    closeSheet,
    showCollaboratorPicker,
    setShowCollaboratorPicker,
    showNotificationModal,
    setShowNotificationModal,
    subStatus,
    manualRefreshing,
    handleRefresh,
    handleCollaboratorsChange,
    confirmLeaveAlbum,
    handleTitleChange,
    flushTitleChange,
    handleDescriptionChange,
    flushDescriptionChange,
    handleChangeVisibility,
    handleChangePriority,
    handleToggleCloseAlbum,
    pickAndUploadCover,
    toggleTaskCompleted,
    handleToggleAllTasks,
    handleShare,
    handleCopySingleTask,
    handleCopyEntireAlbum,
    handleMore,
    confirmDeleteAlbum,
  };
}
