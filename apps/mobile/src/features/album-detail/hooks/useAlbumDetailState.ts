import { Alert } from '@bucketlist/ui';
import { useState, useRef, useEffect } from 'react';
import type { View, ScrollView} from 'react-native';
import { Share, Platform, Dimensions, Keyboard, Animated, Image as RNImage } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useToast, confirm } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';

import type { TaskItem } from '@/services/api/albumsService';
import { useAlbumDetail, useDeleteAlbumDetail } from '@/services/api/albumsService';
import { supabase } from '@/services/supabase';
import { patchTasks, settleTaskCaches } from '@/utils/optimisticCache';
import { useAuthStore } from '@/stores/auth.store';
import type { CollaboratorItem } from '@/components/CollaboratorPickerSheet';
import { useUserFavorites, useToggleFavoriteAlbum } from '@/hooks/useFavorites';
import { useEntitySubscription } from '@/hooks/useEntityNotifications';
import {
  useCopyBucket,
  useCopiedBucketIds,
  useSavedAlbumIds,
  useToggleSaveAlbum,
  useUserLikedAlbumIds,
  useToggleAlbumLike,
} from '@/hooks/useSocial';
import { uploadAlbumCover } from '@/services/api/albumCover';
import type { TaskSortField, TaskSortDir } from '../components/AlbumSortModal';
import { useAlbumTags, useSyncAlbumTags } from '@/hooks/useAlbumTags';
import type { TagItem } from '@/components/TagAssignSheet';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useAlbumDetailState() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const cleanId = Array.isArray(id) ? id[0] : (id ? String(id) : '');
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
  const { data: savedAlbumIds } = useSavedAlbumIds(currentUserId);
  const toggleSaveAlbum = useToggleSaveAlbum();
  const isSaved = !!savedAlbumIds?.includes(cleanId);
  const handleToggleSaveAlbum = () => {
    if (!currentUserId) return;
    toggleSaveAlbum.mutate(
      { userId: currentUserId, albumId: cleanId, currentlySaved: isSaved },
      {
        onSuccess: () => {
          toast.success(isSaved ? t('album_detail.saved_removed', { defaultValue: 'Álbum quitado de guardados' }) : t('album_detail.saved_success', { defaultValue: 'Álbum guardado' }));
        },
        onError: (err: any) => {
          toast.error(err?.message || t('album_detail.save_error', { defaultValue: 'No se pudo guardar el álbum' }));
        },
      }
    );
  };

  const { data: likedAlbumIds } = useUserLikedAlbumIds(currentUserId);
  const toggleAlbumLike = useToggleAlbumLike();
  const isLiked = !!likedAlbumIds?.includes(cleanId);
  const handleToggleLikeAlbum = () => {
    if (!currentUserId) return;
    toggleAlbumLike.mutate(
      { albumId: cleanId, userId: currentUserId },
      {
        onSuccess: () => {
          toast.success(isLiked ? t('album_detail.like_removed', { defaultValue: 'Me gusta eliminado' }) : t('album_detail.like_success', { defaultValue: 'Te gusta este álbum' }));
        },
      }
    );
  };

  const isSelf = (targetId?: string | null) => {
    if (!targetId || !currentUserId) return false;
    return String(targetId).toLowerCase() === String(currentUserId).toLowerCase();
  };

  const [showCollaboratorPicker, setShowCollaboratorPicker] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const { data: entitySub } = useEntitySubscription('album', id, currentUserId);
  const subStatus = entitySub?.status;

  const [taskSortField, setTaskSortFieldState] = useState<TaskSortField>('manual');
  const setTaskSortField = (field: TaskSortField) => {
    setTaskSortFieldState(field);
    void AsyncStorage.setItem('@album_task_sort_field', field).catch(() => undefined);
  };

  const [taskSortDir, setTaskSortDirState] = useState<TaskSortDir>('asc');
  const setTaskSortDir = (dir: TaskSortDir | ((prev: TaskSortDir) => TaskSortDir)) => {
    setTaskSortDirState((prev) => {
      const next = typeof dir === 'function' ? dir(prev) : dir;
      void AsyncStorage.setItem('@album_task_sort_dir', next).catch(() => undefined);
      return next;
    });
  };

  useEffect(() => {
    AsyncStorage.getItem('@album_task_sort_field')
      .then((saved) => {
        if (saved) setTaskSortFieldState(saved as TaskSortField);
      })
      .catch(() => undefined);
    AsyncStorage.getItem('@album_task_sort_dir')
      .then((saved) => {
        if (saved) setTaskSortDirState(saved as TaskSortDir);
      })
      .catch(() => undefined);
  }, []);
  const [taskSortMenuOpen, setTaskSortMenuOpen] = useState(false);
  const [taskSortMenuPos, setTaskSortMenuPos] = useState({ top: 0, right: 20 });
  const taskSortTriggerRef = useRef<View>(null);
  const [taskSearchOpen, setTaskSearchOpen] = useState(false);
  const [taskSearch, setTaskSearch] = useState('');
  const [dragging, setDragging] = useState(false);
  const [isReorderingTasks, setIsReorderingTasks] = useState(false);

  // Modo selección (igual que en «Mi lista»): selecciona varias tareas y actúa sobre todas.
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const toggleSelectTask = (taskId: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(taskId) ? prev.filter((x) => x !== taskId) : [...prev, taskId],
    );
  };
  const startSelection = (taskId?: string) => {
    setIsSelectionMode(true);
    setSelectedTaskIds(taskId ? [taskId] : []);
  };
  const handleExitSelection = () => {
    setIsSelectionMode(false);
    setSelectedTaskIds([]);
  };

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



  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<'menu' | 'visibility' | 'priority' | 'status' | 'cover'>('menu');
  const [showCoverLinkModal, setShowCoverLinkModal] = useState(false);
  const [showTagAssignSheet, setShowTagAssignSheet] = useState(false);
  const sheetTranslateY = useRef(new Animated.Value(420)).current;

  const [cropRequest, setCropRequest] = useState<{
    uri: string;
    width: number;
    height: number;
    index: number;
    total: number;
  } | null>(null);
  const cropResolver = useRef<((uri: string | null) => void) | null>(null);

  const requestPhotoEdit = (base: { uri: string; width: number; height: number }, index: number, total: number) =>
    new Promise<string | null>((resolve) => {
      cropResolver.current = resolve;
      setCropRequest({ ...base, index, total });
    });

  const finishPhotoEdit = (uri: string | null) => {
    const resolve = cropResolver.current;
    cropResolver.current = null;
    resolve?.(uri);
  };

  const titleTimeout = useRef<any>(null);
  const descTimeout = useRef<any>(null);

  const { data: album, isLoading, isError, refetch } = useAlbumDetail(id || '1');
  const { data: albumTags = [] } = useAlbumTags(id);
  const syncAlbumTags = useSyncAlbumTags();
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

  const { data: albumCollaborators = [] } = useQuery({
    queryKey: ['albumCollaborators', cleanId],
    queryFn: async () => {
      if (!cleanId || cleanId === 'unassigned') return [];
      const { data, error } = await supabase
        .from('album_members')
        .select('user_id, status, profiles:user_id(id, username, display_name, avatar_url)')
        .eq('album_id', cleanId);
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
    enabled: !!cleanId && cleanId !== 'unassigned',
  });

  const isOwner = Boolean(rawOwnerId && isSelf(rawOwnerId));
  const isCollaborator = !isOwner && albumCollaborators.some((c: any) => isSelf(c.id) && c.status === 'accepted');
  const canEdit = isOwner || isCollaborator;

  /** El dueño o cualquier colaborador quita a otro colaborador o cancela su invitación pendiente. */
  const handleRemoveAlbumCollaborator = async (targetUserId: string) => {
    if (!cleanId || cleanId === 'unassigned' || !canEdit) return;
    if (rawOwnerId && targetUserId === rawOwnerId) return; // al dueño no lo puede quitar nadie
    const previous = queryClient.getQueryData(['albumCollaborators', cleanId]);
    queryClient.setQueryData(['albumCollaborators', cleanId], (old: any) =>
      Array.isArray(old) ? old.filter((c: any) => c.id !== targetUserId) : old,
    );
    const { error } = await supabase
      .from('album_members')
      .delete()
      .eq('album_id', cleanId)
      .eq('user_id', targetUserId);
    if (error) {
      queryClient.setQueryData(['albumCollaborators', cleanId], previous);
      Alert.alert(t('common.error'), error.message || t('album_detail.remove_collab_error', { defaultValue: 'No se pudo quitar al colaborador' }));
      throw error;
    }
    void queryClient.invalidateQueries({ queryKey: ['albumCollaborators', cleanId] });
    void queryClient.invalidateQueries({ queryKey: ['item_participants'] });
    void queryClient.invalidateQueries({ queryKey: ['albums'] });
    void queryClient.invalidateQueries({ queryKey: ['album', cleanId, user?.id] });
  };

  const handleCollaboratorsChange = async (newCollabs: CollaboratorItem[]) => {
    const collabKey = ['albumCollaborators', cleanId];
    const prevCollabs = queryClient.getQueryData(collabKey);
    try {
      const currentIds = new Set(albumCollaborators.map((c: any) => c.id));
      const newIds = new Set(newCollabs.map((c) => c.id));

      const toAdd = newCollabs.filter(
        (c) => !currentIds.has(c.id) && c.id !== rawOwnerId && !isSelf(c.id)
      );
      const toRemoveIds = albumCollaborators
        .filter((c: any) => !newIds.has(c.id) && c.id !== rawOwnerId && !isSelf(c.id))
        .map((c: any) => c.id);
      const needsShared =
        !album?.isShared && newCollabs.some((c) => c.id !== rawOwnerId && !isSelf(c.id));
      if (toAdd.length === 0 && toRemoveIds.length === 0 && !needsShared) return;
      const removeSet = new Set(toRemoveIds);

      // Evita que una carga en vuelo pise el cambio optimista
      await queryClient.cancelQueries({ queryKey: collabKey });

      // Optimista: aparece al instante con su foto y «Pendiente»
      queryClient.setQueryData(collabKey, [
        ...albumCollaborators.filter((c: any) => !removeSet.has(c.id)),
        ...toAdd.map((c) => ({
          id: c.id,
          username: c.username,
          display_name: c.display_name ?? null,
          avatar_url: c.avatar_url ?? null,
          status: 'pending',
        })),
      ]);

      // Todo en paralelo (antes: insertar → borrar → marcar como compartido, en serie)
      const [insRes, delRes, shareRes] = await Promise.all([
        toAdd.length > 0
          ? supabase.from('album_members').insert(
              toAdd.map((c) => ({ album_id: cleanId, user_id: c.id, role: 'member', status: 'pending' })),
            )
          : Promise.resolve({ error: null } as any),
        toRemoveIds.length > 0
          ? supabase.from('album_members').delete().eq('album_id', cleanId).in('user_id', toRemoveIds)
          : Promise.resolve({ error: null } as any),
        needsShared
          ? supabase.from('albums').update({ is_shared: true }).eq('id', cleanId)
          : Promise.resolve({ error: null } as any),
      ]);
      const opError = insRes?.error || delRes?.error;
      if (opError) {
        console.warn('Error updating album collaborators:', opError);
        queryClient.setQueryData(collabKey, prevCollabs);
        Alert.alert(t('common.error'), opError.message || t('album_detail.update_collabs_error', { defaultValue: 'No se pudo actualizar a los colaboradores' }));
      } else if (shareRes?.error) {
        console.warn('Error sharing album:', shareRes.error);
      }
    } catch (err: any) {
      console.warn('Error updating album collaborators:', err);
      queryClient.setQueryData(collabKey, prevCollabs);
      Alert.alert(t('common.error'), err?.message || t('album_detail.update_collabs_error', { defaultValue: 'No se pudo actualizar a los colaboradores' }));
    } finally {
      void queryClient.invalidateQueries({ queryKey: collabKey });
      void queryClient.invalidateQueries({ queryKey: ['item_participants'] });
      void queryClient.invalidateQueries({ queryKey: ['bucketParticipants'] });
      void queryClient.invalidateQueries({ queryKey: ['album', cleanId, user?.id] });
      if (cleanId !== id) void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['albums'] });
    }
  };

  const confirmLeaveAlbum = () => {
    closeSheet(() => {
      confirm.show({
        title: t('albums.leave_collab_title'),
        message: t('albums.leave_collab_msg'),
        confirmLabel: t('albums.leave_collab_confirm'),
        cancelLabel: t('common.cancel'),
        destructive: true,
        onConfirm: async () => {
          const { error } = await supabase
            .from('album_members')
            .delete()
            .eq('album_id', id)
            .eq('user_id', user!.id);
          if (error) {
            toast.error(error.message);
          } else {
            void queryClient.invalidateQueries({ queryKey: ['albums'] });
            router.back();
          }
        },
      });
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
      toast.error(t('album_detail.change_visibility_error', { defaultValue: 'No se pudo cambiar la visibilidad' }));
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
      toast.error(t('album_detail.change_priority_error', { defaultValue: 'No se pudo cambiar la prioridad' }));
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
      toast.error(close ? t('album_detail.close_album_error', { defaultValue: 'No se pudo cerrar el álbum' }) : t('album_detail.reopen_album_error', { defaultValue: 'No se pudo reabrir el álbum' }));
    }
    void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
    void queryClient.invalidateQueries({ queryKey: ['albums'] });
  };

  const pickAndUploadCover = async () => {
    if (!canEdit || !currentUserId) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset) return;

      const base = await ImageManipulator.manipulateAsync(
        asset.uri,
        asset.width && asset.width > 1600 ? [{ resize: { width: 1600 } }] : [],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );

      const edited = await requestPhotoEdit(base, 0, 1);
      if (edited === null) {
        setCropRequest(null);
        return;
      }
      setCropRequest(null);

      let determinedRatio: '1:1' | '16:9' | '3:4' = '16:9';
      let ratioVal = 16 / 9;
      try {
        await new Promise<void>((resolve) => {
          RNImage.getSize(
            edited,
            (w, h) => {
              if (w && h) {
                ratioVal = w / h;
                determinedRatio = Math.abs(ratioVal - 1) < 0.25 ? '1:1' : ratioVal < 0.85 ? '3:4' : '16:9';
              }
              resolve();
            },
            () => resolve()
          );
        });
      } catch {}

      const publicUrl = await uploadAlbumCover(currentUserId, edited);
      const currentTagIds = albumTags.map((t) => t.id);
      const coverJson = JSON.stringify({
        id: 'custom-img',
        type: 'image',
        uri: publicUrl,
        aspectRatio: determinedRatio,
        aspectRatioValue: ratioVal,
        tag_ids: currentTagIds,
      });

      queryClient.setQueryData(['album', cleanId, user?.id], (old: any) =>
        old ? { ...old, coverPath: coverJson, coverKey: 'custom-img' } : old
      );
      if (cleanId !== id) {
        queryClient.setQueryData(['album', id, user?.id], (old: any) =>
          old ? { ...old, coverPath: coverJson, coverKey: 'custom-img' } : old
        );
      }

      const { error } = await supabase.from('albums').update({ cover_path: coverJson }).eq('id', cleanId);
      if (error) throw error;

      void queryClient.invalidateQueries({ queryKey: ['album', cleanId, user?.id] });
      if (cleanId !== id) void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.success(t('album_detail.cover_updated'));
    } catch (err: any) {
      setCropRequest(null);
      toast.error(err?.message || t('album_detail.cover_update_error'));
    }
  };

  const takePhotoAndUploadCover = async () => {
    if (!canEdit || !currentUserId) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        toast.error(t('album_detail.cover_camera_perm_error', { defaultValue: 'Necesitamos acceso a la cámara para la portada' }));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      if (!asset) return;

      const base = await ImageManipulator.manipulateAsync(
        asset.uri,
        asset.width && asset.width > 1600 ? [{ resize: { width: 1600 } }] : [],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );

      const edited = await requestPhotoEdit(base, 0, 1);
      if (edited === null) {
        setCropRequest(null);
        return;
      }
      setCropRequest(null);

      let determinedRatio: '1:1' | '16:9' | '3:4' = '16:9';
      let ratioVal = 16 / 9;
      try {
        await new Promise<void>((resolve) => {
          RNImage.getSize(
            edited,
            (w, h) => {
              if (w && h) {
                ratioVal = w / h;
                determinedRatio = Math.abs(ratioVal - 1) < 0.25 ? '1:1' : ratioVal < 0.85 ? '3:4' : '16:9';
              }
              resolve();
            },
            () => resolve()
          );
        });
      } catch {}

      const publicUrl = await uploadAlbumCover(currentUserId, edited);
      const currentTagIds = albumTags.map((t) => t.id);
      const coverJson = JSON.stringify({
        id: 'custom-img',
        type: 'image',
        uri: publicUrl,
        aspectRatio: determinedRatio,
        aspectRatioValue: ratioVal,
        tag_ids: currentTagIds,
      });

      queryClient.setQueryData(['album', cleanId, user?.id], (old: any) =>
        old ? { ...old, coverPath: coverJson, coverKey: 'custom-img' } : old
      );
      if (cleanId !== id) {
        queryClient.setQueryData(['album', id, user?.id], (old: any) =>
          old ? { ...old, coverPath: coverJson, coverKey: 'custom-img' } : old
        );
      }

      const { error } = await supabase.from('albums').update({ cover_path: coverJson }).eq('id', cleanId);
      if (error) throw error;

      void queryClient.invalidateQueries({ queryKey: ['album', cleanId, user?.id] });
      if (cleanId !== id) void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.success(t('album_detail.cover_updated'));
    } catch (err: any) {
      setCropRequest(null);
      toast.error(err?.message || t('album_detail.cover_update_error'));
    }
  };

  const recropCurrentCover = async () => {
    if (!canEdit || !currentUserId || !album?.coverPath) return;
    try {
      let parsed: any = null;
      try {
        parsed = JSON.parse(album.coverPath);
      } catch {}
      const uri = parsed?.uri;
      if (!uri) return;

      const base = await ImageManipulator.manipulateAsync(
        uri,
        [],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
      );

      const edited = await requestPhotoEdit(base, 0, 1);
      if (edited === null) {
        setCropRequest(null);
        return;
      }
      setCropRequest(null);

      let determinedRatio: '1:1' | '16:9' | '3:4' = '16:9';
      let ratioVal = 16 / 9;
      try {
        await new Promise<void>((resolve) => {
          RNImage.getSize(
            edited,
            (w, h) => {
              if (w && h) {
                ratioVal = w / h;
                determinedRatio = Math.abs(ratioVal - 1) < 0.25 ? '1:1' : ratioVal < 0.85 ? '3:4' : '16:9';
              }
              resolve();
            },
            () => resolve()
          );
        });
      } catch {}

      const publicUrl = await uploadAlbumCover(currentUserId, edited);
      const currentTagIds = albumTags.map((t) => t.id);
      const coverJson = JSON.stringify({
        ...parsed,
        uri: publicUrl,
        aspectRatio: determinedRatio,
        aspectRatioValue: ratioVal,
        tag_ids: currentTagIds,
      });

      queryClient.setQueryData(['album', cleanId, user?.id], (old: any) =>
        old ? { ...old, coverPath: coverJson, coverKey: 'custom-img' } : old
      );
      if (cleanId !== id) {
        queryClient.setQueryData(['album', id, user?.id], (old: any) =>
          old ? { ...old, coverPath: coverJson, coverKey: 'custom-img' } : old
        );
      }

      const { error } = await supabase.from('albums').update({ cover_path: coverJson }).eq('id', cleanId);
      if (error) throw error;

      void queryClient.invalidateQueries({ queryKey: ['album', cleanId, user?.id] });
      if (cleanId !== id) void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.success(t('album_detail.cover_recropped'));
    } catch (err: any) {
      setCropRequest(null);
      toast.error(err?.message || t('album_detail.cover_recrop_error'));
    }
  };

  const removeCover = async () => {
    if (!canEdit || !cleanId) return;
    try {
      queryClient.setQueryData(['album', cleanId, user?.id], (old: any) =>
        old ? { ...old, coverPath: null, coverKey: 'aurora' } : old
      );
      if (cleanId !== id) {
        queryClient.setQueryData(['album', id, user?.id], (old: any) =>
          old ? { ...old, coverPath: null, coverKey: 'aurora' } : old
        );
      }
      const { error } = await supabase.from('albums').update({ cover_path: null }).eq('id', cleanId);
      if (error) throw error;

      void queryClient.invalidateQueries({ queryKey: ['album', cleanId, user?.id] });
      if (cleanId !== id) void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.success(t('album_detail.cover_removed', { defaultValue: 'Portada eliminada' }));
    } catch (err: any) {
      toast.error(err?.message || t('album_detail.cover_remove_error', { defaultValue: 'No se pudo quitar la portada' }));
    }
  };

  const handleSaveCoverLink = async (url: string) => {
    try {
      setShowCoverLinkModal(false);

      let finalUrl = url;
      const isOurStorage = url.includes('/storage/v1/object/public/photos/') ||
        (url.startsWith('album-covers/') && !url.includes('://'));

      if (!isOurStorage) {
        if (!currentUserId) throw new Error('Debes iniciar sesión para subir la portada.');
        try {
          finalUrl = await uploadAlbumCover(currentUserId, url);
        } catch (e: any) {
          console.error('Error uploading cover from link:', e);
          throw new Error(e?.message || 'No se pudo procesar la imagen del enlace.');
        }
      }

      let determinedRatio: '1:1' | '16:9' | '3:4' = '16:9';
      let ratioVal = 16 / 9;

      if (!finalUrl.startsWith('data:')) {
        try {
          await new Promise<void>((resolve) => {
            RNImage.getSize(
              finalUrl,
              (w, h) => {
                if (w && h) {
                  ratioVal = w / h;
                  determinedRatio =
                    Math.abs(ratioVal - 1) < 0.25 ? '1:1' : ratioVal < 0.85 ? '3:4' : '16:9';
                }
                resolve();
              },
              () => resolve()
            );
          });
        } catch {}
      }

      const currentTagIds = albumTags.map((t) => t.id);
      const coverJson = JSON.stringify({
        id: 'custom-img',
        type: 'image',
        uri: finalUrl,
        aspectRatio: determinedRatio,
        aspectRatioValue: ratioVal,
        tag_ids: currentTagIds,
      });

      queryClient.setQueryData(['album', cleanId, user?.id], (old: any) =>
        old ? { ...old, coverPath: coverJson, coverKey: 'custom-img' } : old
      );
      if (cleanId !== id) {
        queryClient.setQueryData(['album', id, user?.id], (old: any) =>
          old ? { ...old, coverPath: coverJson, coverKey: 'custom-img' } : old
        );
      }

      const { error } = await supabase.from('albums').update({ cover_path: coverJson }).eq('id', cleanId);
      if (error) {
        console.error('Error updating album cover:', error);
        toast.error(error.message || 'No se pudo guardar la portada.');
        void queryClient.invalidateQueries({ queryKey: ['album', cleanId, user?.id] });
        return;
      }

      void queryClient.invalidateQueries({ queryKey: ['album', cleanId, user?.id] });
      if (cleanId !== id) void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.success(t('album_detail.cover_updated'));
    } catch (err: any) {
      console.error('Error saving cover link:', err);
      toast.error(err?.message || t('album_detail.cover_update_error'));
    }
  };

  const handleChangeCoverShape = async (newRatio: '1:1' | '16:9' | '3:4') => {
    try {
      let currentObj: any = {};
      if (album?.coverPath) {
        try {
          currentObj = JSON.parse(album.coverPath);
        } catch {}
      }
      const updated = {
        ...currentObj,
        aspectRatio: newRatio,
        tag_ids: albumTags.map((t) => t.id),
      };
      const coverJson = JSON.stringify(updated);
      queryClient.setQueryData(['album', cleanId, user?.id], (old: any) =>
        old ? { ...old, coverPath: coverJson } : old
      );
      if (cleanId !== id) {
        queryClient.setQueryData(['album', id, user?.id], (old: any) =>
          old ? { ...old, coverPath: coverJson } : old
        );
      }
      await supabase.from('albums').update({ cover_path: coverJson }).eq('id', cleanId);
      void queryClient.invalidateQueries({ queryKey: ['album', cleanId, user?.id] });
      if (cleanId !== id) void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.success(t('album_detail.cover_shape_updated', { defaultValue: 'Formato de portada actualizado' }));
    } catch {
      toast.error(t('album_detail.cover_shape_error', { defaultValue: 'No se pudo cambiar la forma de la portada.' }));
    }
  };

  /** Portada con degradado o color sólido (se guarda como JSON en `albums.cover_path`). */
  const handleSelectCoverColors = async (
    colors: [string, string],
    type: 'gradient' | 'solid',
    coverId: string | null,
  ) => {
    if (!canEdit || !cleanId) return;
    try {
      const coverJson = JSON.stringify({
        id: coverId ?? (type === 'solid' ? 'custom-solid' : 'custom-gradient'),
        type,
        colors,
        tag_ids: albumTags.map((t) => t.id),
      });
      queryClient.setQueryData(['album', cleanId, user?.id], (old: any) =>
        old ? { ...old, coverPath: coverJson, coverKey: coverId ?? 'aurora' } : old
      );
      if (cleanId !== id) {
        queryClient.setQueryData(['album', id, user?.id], (old: any) =>
          old ? { ...old, coverPath: coverJson, coverKey: coverId ?? 'aurora' } : old
        );
      }
      const { error } = await supabase.from('albums').update({ cover_path: coverJson }).eq('id', cleanId);
      if (error) throw error;

      void queryClient.invalidateQueries({ queryKey: ['album', cleanId, user?.id] });
      if (cleanId !== id) void queryClient.invalidateQueries({ queryKey: ['album', id, user?.id] });
      void queryClient.invalidateQueries({ queryKey: ['albums'] });
      toast.success(t('album_detail.cover_updated'));
    } catch (err: any) {
      toast.error(err?.message || t('album_detail.cover_update_error'));
      void queryClient.invalidateQueries({ queryKey: ['album', cleanId, user?.id] });
    }
  };

  const handleSaveAlbumTags = async (newTags: TagItem[]) => {
    setShowTagAssignSheet(false);
    if (!id || id === 'unassigned') return;

    const cleanId = Array.isArray(id) ? id[0] : String(id);

    // Actualización optimista inmediata en la UI para la pantalla del álbum
    queryClient.setQueryData(['album_tags', cleanId, user?.id], newTags);
    if (cleanId !== id) {
      queryClient.setQueryData(['album_tags', id, user?.id], newTags);
    }

    const currentTagIds = albumTags.map((t) => t.id);
    const newTagIds = newTags.map((t) => t.id);
    const removed = albumTags.filter((t) => !newTagIds.includes(t.id));
    const taskIds = album?.tasks?.map((t) => t.id) || [];

    // Actualización optimista de las tareas del álbum para que muestren las etiquetas añadidas
    const applyTagsToAlbumTasks = (tagsToApply: TagItem[]) => {
      const updater = (old: any) => {
        if (!old || !old.tasks) return old;
        const updatedTasks = old.tasks.map((task: any) => {
          const existingTags = task.tags || [];
          const existingIds = new Set(existingTags.map((t: any) => t.id));
          const toAdd = tagsToApply.filter((t) => !existingIds.has(t.id));
          return {
            ...task,
            tags: [...existingTags, ...toAdd],
          };
        });
        return { ...old, tasks: updatedTasks };
      };
      queryClient.setQueryData(['album', cleanId, user?.id], updater);
      if (cleanId !== id) queryClient.setQueryData(['album', id, user?.id], updater);
    };

    applyTagsToAlbumTasks(newTags);

    if (removed.length > 0 && taskIds.length > 0) {
      Alert.alert(
        t('album_detail.remove_tags_tasks_title', { defaultValue: 'Quitar etiquetas de las tareas' }),
        t('album_detail.remove_tags_tasks_msg', { tags: removed.map((t) => `«${t.name}»`).join(', '), plural: removed.length === 1 ? (i18n.language === 'en' ? 'this tag' : 'esta etiqueta') : (i18n.language === 'en' ? 'these tags' : 'estas etiquetas'), defaultValue: `Has deseleccionado ${removed.map((t) => `«${t.name}»`).join(', ')}. ¿Deseas quitar ${removed.length === 1 ? 'esta etiqueta' : 'estas etiquetas'} también de todas las tareas del álbum?` }),
        [
          {
            text: t('album_detail.remove_tags_only_album', { defaultValue: 'Solo del álbum' }),
            onPress: () => {
              void syncAlbumTags.mutateAsync({
                albumId: id,
                selectedTagIds: newTagIds,
                tags: newTags,
                removedTagIds: removed.map((t) => t.id),
                removeTagsFromTasks: false,
                taskIds,
              });
            },
          },
          {
            text: t('album_detail.remove_tags_also_tasks'),
            onPress: () => {
              // Optimistamente quitar las etiquetas de las tareas
              const removedIds = new Set(removed.map((t) => t.id));
              const removeUpdater = (old: any) => {
                if (!old || !old.tasks) return old;
                const updatedTasks = old.tasks.map((task: any) => ({
                  ...task,
                  tags: (task.tags || []).filter((t: any) => !removedIds.has(t.id)),
                }));
                return { ...old, tasks: updatedTasks };
              };
              queryClient.setQueryData(['album', cleanId, user?.id], removeUpdater);
              if (cleanId !== id) queryClient.setQueryData(['album', id, user?.id], removeUpdater);

              void syncAlbumTags.mutateAsync({
                albumId: id,
                selectedTagIds: newTagIds,
                tags: newTags,
                removedTagIds: removed.map((t) => t.id),
                removeTagsFromTasks: true,
                taskIds,
              });
            },
          },
          { text: t('common.cancel'), style: 'cancel',
            onPress: () => {
              // Revertir optimismo
              queryClient.setQueryData(['album_tags', cleanId, user?.id], albumTags);
              if (cleanId !== id) queryClient.setQueryData(['album_tags', id, user?.id], albumTags);
              void queryClient.invalidateQueries({ queryKey: ['album', cleanId] });
            },
          },
        ]
      );
      return;
    }

    try {
      await syncAlbumTags.mutateAsync({
        albumId: id,
        selectedTagIds: newTagIds,
        tags: newTags,
        taskIds,
      });
    } catch {
      // Revertir optimismo si falló
      queryClient.setQueryData(['album_tags', cleanId, user?.id], albumTags);
      if (cleanId !== id) queryClient.setQueryData(['album_tags', id, user?.id], albumTags);
      void queryClient.invalidateQueries({ queryKey: ['album', cleanId] });
    }
  };

  const toggleTaskCompleted = async (task: TaskItem, e: any) => {
    e.stopPropagation();
    if (!canEdit) return;
    const nextCompleted = !task.isCompleted;
    const nextStatus = nextCompleted ? 'completed' : 'pending';
    const nextCompletedAt = nextCompleted ? new Date().toISOString() : null;

    // Optimista: tarea + contador de progreso del álbum + listas, todo al instante.
    patchTasks(queryClient, [task.id], {
      bucket: { status: nextStatus, completed_at: nextCompletedAt },
      task: { isCompleted: nextCompleted, completedAt: nextCompletedAt },
    });

    const { error } = await supabase
      .from('buckets')
      .update({ status: nextStatus, completed_at: nextCompletedAt })
      .eq('id', task.id);

    if (error) {
      console.error('Error toggling task status:', error);
      settleTaskCaches(queryClient);
      return;
    }

    // La caché ya tiene el valor correcto: no recargamos el álbum entero (era lo que
    // provocaba el parpadeo y la espera). Solo se marcan como obsoletas las demás vistas.
    void queryClient.invalidateQueries({ queryKey: ['buckets'] });
    void queryClient.invalidateQueries({ queryKey: ['albums'] });
    void queryClient.invalidateQueries({ queryKey: ['bucketDetail', task.id] });
  };

  const handleToggleAllTasks = async () => {
    if (!canEdit || !album || album.tasks.length === 0) return;
    const areAllCompleted = album.tasks.every((t) => t.isCompleted);
    const nextCompleted = !areAllCompleted;
    const nextStatus = nextCompleted ? 'completed' : 'pending';
    const nextCompletedAt = nextCompleted ? new Date().toISOString() : null;
    const taskIds = album.tasks.map((t) => t.id);

    closeSheet();
    const confirmedToggle = await confirm.ask({
      title: nextCompleted ? t('albums.toggle_complete_all_title') : t('albums.toggle_pending_all_title'),
      message: nextCompleted
        ? t('albums.toggle_complete_all_msg', { count: taskIds.length })
        : t('albums.toggle_pending_all_msg', { count: taskIds.length }),
      confirmLabel: nextCompleted ? t('albums.complete_all_btn') : t('albums.mark_pending_btn'),
      cancelLabel: t('common.cancel'),
    });
    if (!confirmedToggle) return;

    patchTasks(queryClient, taskIds, {
      bucket: { status: nextStatus, completed_at: nextCompletedAt },
      task: { isCompleted: nextCompleted, completedAt: nextCompletedAt },
    });

    closeSheet();

    const { error } = await supabase
      .from('buckets')
      .update({ status: nextStatus, completed_at: nextCompletedAt })
      .in('id', taskIds);

    if (error) {
      toast.error(t('album_detail.update_tasks_error', { defaultValue: 'No se pudieron actualizar las tareas' }));
      settleTaskCaches(queryClient);
      return;
    }

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
      toast.info(t('album_detail.login_to_add_tasks', { defaultValue: 'Debes iniciar sesión para añadir tareas a tu lista.' }));
      return;
    }
    const alreadyCopied = !!copiedIds?.includes(task.id);
    if (alreadyCopied) {
      toast.info(t('album_detail.task_already_in_list', { defaultValue: 'Ya tienes esta tarea en tu lista.' }));
      return;
    }
    copyBucket.mutate(
      { bucketId: task.id, userId: currentUserId },
      {
        onSuccess: () => {
          toast.success(t('album_detail.task_added_to_list', { defaultValue: 'Tarea añadida a tu lista 🎉' }));
        },
        onError: (err: any) => {
          toast.error(err?.message || t('album_detail.task_add_error', { defaultValue: 'No se pudo añadir. Inténtalo de nuevo.' }));
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
          copied_from_id: cleanId,
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

      confirm.show({
        title: t('albums.copy_success_title'),
        message: t('albums.copy_success_msg'),
        confirmLabel: t('albums.view_new_album'),
        cancelLabel: t('albums.stay_here'),
        onConfirm: () => router.push(`/album/${newAlbum.id}` as any),
      });
    } catch (err: any) {
      console.error('Error copying entire album:', err);
      toast.error(err?.message || t('album_detail.copy_album_error', { defaultValue: 'No se pudo copiar el álbum. Inténtalo de nuevo.' }));
    } finally {
      setCopyingAlbum(false);
    }
  };

  const handleCopyEntireAlbum = () => {
    if (!currentUserId) {
      toast.info(t('albums.login_to_copy'));
      return;
    }
    confirm.show({
      title: t('albums.copy_entire_confirm_title'),
      message: t('albums.copy_entire_confirm_msg', { title: album?.title, count: album?.tasks?.length ?? 0 }),
      confirmLabel: t('albums.copy_album_btn'),
      cancelLabel: t('common.cancel'),
      onConfirm: () => void executeCopyEntireAlbum(),
    });
  };

  const handleMore = () => {
    setSheetMode('menu');
    setSheetVisible(true);
  };

  const confirmDeleteAlbum = () => {
    closeSheet(() => {
      confirm.show({
        title: t('albums.delete_confirm_title'),
        message: t('albums.delete_confirm_desc'),
        confirmLabel: t('albums.delete_album_btn'),
        cancelLabel: t('common.cancel'),
        destructive: true,
        onConfirm: () => {
          router.back();
          deleteMutation.mutate(id || '1');
        },
      });
    });
  };

  return {
    id,
    router,
    queryClient,
    isSelectionMode,
    selectedTaskIds,
    setSelectedTaskIds,
    toggleSelectTask,
    startSelection,
    handleExitSelection,
    user,
    currentUserId,
    isFav,
    toggleFavoriteAlbum,
    isSaved,
    handleToggleSaveAlbum,
    isLiked,
    handleToggleLikeAlbum,
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
    handleRemoveAlbumCollaborator,
    confirmLeaveAlbum,
    handleTitleChange,
    flushTitleChange,
    handleDescriptionChange,
    flushDescriptionChange,
    handleChangeVisibility,
    handleChangePriority,
    handleToggleCloseAlbum,
    pickAndUploadCover,
    takePhotoAndUploadCover,
    recropCurrentCover,
    removeCover,
    cropRequest,
    finishPhotoEdit,
    showCoverLinkModal,
    setShowCoverLinkModal,
    handleSaveCoverLink,
    handleChangeCoverShape,
    handleSelectCoverColors,
    albumTags,
    showTagAssignSheet,
    setShowTagAssignSheet,
    handleSaveAlbumTags,
    toggleTaskCompleted,
    handleToggleAllTasks,
    handleShare,
    handleCopySingleTask,
    handleCopyEntireAlbum,
    handleMore,
    confirmDeleteAlbum,
  };
}
