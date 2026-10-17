import { useState, useRef, useEffect, useCallback } from 'react';
import { Alert, Share, Dimensions, Animated, Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/services/supabase';
import { storageApi } from '@/services/api/storage';
import { processBucketImage } from '@bucketlist/shared';
import { useAuthStore } from '@/stores/auth.store';
import { usePullToRefresh } from '@/hooks/useAutoRefresh';
import { useAddComment, useCopyBucket, useToggleReaction } from '@/hooks/useSocial';
import { useDeleteBucket } from '@/hooks/useBuckets';
import { useAlbums } from '@/hooks/useAlbums';
import { useUserFavorites, useToggleFavoriteBucket } from '@/hooks/useFavorites';
import { useEntitySubscription } from '@/hooks/useEntityNotifications';
import { MENTION_TASK_COLUMNS, MentionTask } from '@/components/TaskMentionPickerSheet';
import { CollaboratorItem } from '@/components/CollaboratorPickerSheet';
import { ThumbnailMode } from '@/utils/taskImage';
import { PhotoSortField, PhotoSortDir } from '../components/PhotoSortModal';
import { DatePickerConfig } from '../components/BucketDatePickerModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function useBucketDetailState() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { refreshing, onRefresh } = usePullToRefresh();

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<'menu' | 'visibility' | 'albums' | 'status' | 'category' | 'priority'>('menu');
  const [viewingPhotoIndex, setViewingPhotoIndex] = useState<number | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [showMentionPicker, setShowMentionPicker] = useState(false);

  const [cropRequest, setCropRequest] = useState<{ uri: string; width: number; height: number; index: number; total: number } | null>(null);
  const cropResolver = useRef<((uri: string | null) => void) | null>(null);
  const [datePickerConfig, setDatePickerConfig] = useState<DatePickerConfig | null>(null);
  const [showCollaboratorPicker, setShowCollaboratorPicker] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const { data: entitySub } = useEntitySubscription('bucket', id, user?.id);
  const subStatus = entitySub?.status;
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const sheetTranslateY = useRef(new Animated.Value(420)).current;

  const subtaskTimeouts = useRef<Record<string, any>>({});
  const titleTimeout = useRef<any>(null);
  const descTimeout = useRef<any>(null);
  const counterLabelTimeout = useRef<any>(null);
  const counterTargetTimeout = useRef<any>(null);
  const counterCountTimeout = useRef<any>(null);

  const addComment = useAddComment();
  const copyBucket = useCopyBucket();
  const toggleReaction = useToggleReaction();
  const deleteBucket = useDeleteBucket();
  const { isBucketFavorite } = useUserFavorites(user?.id);
  const toggleFavorite = useToggleFavoriteBucket();
  const isFav = isBucketFavorite(id);
  const { data: albumsData, isLoading: albumsLoading } = useAlbums(user?.id);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name_es');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: bucket, isLoading } = useQuery({
    queryKey: ['bucketDetail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('buckets')
        .select(`
          *,
          user:profiles!buckets_user_id_fkey(*),
          category:categories(*),
          item_subtasks(*),
          bucket_photos(*),
          album_items(album_id)
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: bucketAlbums } = useQuery({
    queryKey: ['bucketAlbum', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('album_items')
        .select('album_id')
        .eq('bucket_id', id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: mentionsData } = useQuery({
    queryKey: ['bucketMentions', id],
    queryFn: async () => {
      const cols = MENTION_TASK_COLUMNS;
      const { data, error } = await supabase
        .from('bucket_mentions')
        .select(`
          id,
          bucket_a,
          bucket_b,
          a:buckets!bucket_mentions_bucket_a_fkey(${cols}),
          b:buckets!bucket_mentions_bucket_b_fkey(${cols})
        `)
        .or(`bucket_a.eq.${id},bucket_b.eq.${id}`);
      if (error) throw error;
      const mapped = ((data ?? []) as any[])
        .map((row) => {
          const other = row.bucket_a === id ? row.b : row.a;
          return other ? { mentionId: row.id as string, task: other as MentionTask } : null;
        })
        .filter(Boolean) as { mentionId: string; task: MentionTask }[];

      try {
        const stored = await AsyncStorage.getItem(`@bucket_mentions_order_${id}`);
        if (stored) {
          const savedIds: string[] = JSON.parse(stored);
          mapped.sort((a, b) => {
            const idxA = savedIds.indexOf(a.task.id);
            const idxB = savedIds.indexOf(b.task.id);
            if (idxA === -1 && idxB === -1) return 0;
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          });
        }
      } catch {}

      return mapped;
    },
    enabled: !!id,
  });

  const { data: reactionsData } = useQuery({
    queryKey: ['bucketReactions', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('reactions')
        .select('*')
        .eq('bucket_id', id);
      return data || [];
    },
    enabled: !!id,
  });

  const { data: commentsData } = useQuery({
    queryKey: ['bucketComments', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('comments')
        .select('*, user:profiles!comments_user_id_fkey(*)')
        .eq('bucket_id', id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!id,
  });

  const { data: collaborators = [], refetch: refetchCollaborators } = useQuery({
    queryKey: ['bucketCollaborators', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bucket_collaborators')
        .select('user_id, status, profiles:user_id(id, username, display_name, avatar_url)')
        .eq('bucket_id', id);
      if (error) {
        console.warn('Error fetching collaborators:', error);
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
    enabled: !!id,
  });

  const { data: participantsData = [] } = useQuery({
    queryKey: ['bucketParticipants', id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_bucket_participants', { p_bucket_id: id });
      if (error) {
        console.warn('Error fetching participants:', error);
        return [];
      }
      return (data || []).map((r: any) => ({
        id: r.id as string,
        username: r.username || '',
        display_name: r.display_name || null,
        avatar_url: r.avatar_url || null,
        status: 'accepted' as const,
        isOwner: !!r.is_owner,
      }));
    },
    enabled: !!id,
  });

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

  const [photoSearchQuery, setPhotoSearchQuery] = useState('');
  const [photoSortField, setPhotoSortField] = useState<PhotoSortField>('date');
  const [photoSortDir, setPhotoSortDir] = useState<PhotoSortDir>('desc');
  const [photoSortMenuOpen, setPhotoSortMenuOpen] = useState(false);
  const [sortMenuPos, setSortMenuPos] = useState({ top: 0, right: 20 });
  const sortTriggerRef = useRef<View>(null);

  const openSortMenu = () => {
    sortTriggerRef.current?.measureInWindow((x, y, w, h) => {
      setSortMenuPos({
        top: y + h + 6,
        right: Dimensions.get('window').width - (x + w),
      });
      setPhotoSortMenuOpen(true);
    });
  };

  const handleSortOption = (field: PhotoSortField) => {
    if (field === 'manual') {
      setPhotoSortField('manual');
      setPhotoSortMenuOpen(false);
      return;
    }
    if (photoSortField === field) {
      setPhotoSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setPhotoSortField(field);
      setPhotoSortDir(field === 'date' ? 'desc' : 'asc');
      setPhotoSortMenuOpen(false);
    }
  };

  const isOwner = bucket?.user_id === user?.id;
  const isCollaborator = !isOwner && collaborators.some((c: any) => c.id === user?.id && c.status === 'accepted');
  const isInSharedAlbum = (bucketAlbums ?? []).some((bi: any) =>
    (albumsData ?? []).some((a: any) => a.id === bi.album_id),
  );
  const canEdit = isOwner || isCollaborator || isInSharedAlbum;

  let photos: any[] = [...(bucket?.bucket_photos || [])];
  if (photoSearchQuery.trim()) {
    const q = photoSearchQuery.toLowerCase();
    photos = photos.filter((p: any) => p.title?.toLowerCase().includes(q));
  }
  photos.sort((a, b) => {
    if (photoSortField === 'manual') {
      const dp = (a.position ?? 0) - (b.position ?? 0);
      if (dp !== 0) return dp;
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    }
    if (photoSortField === 'title') {
      const cmp = (a.title || '').localeCompare(b.title || '');
      return photoSortDir === 'asc' ? cmp : -cmp;
    }
    const da = new Date(a.created_at || 0).getTime();
    const db = new Date(b.created_at || 0).getTime();
    return photoSortDir === 'asc' ? da - db : db - da;
  });

  const thumbPhotos: any[] = [...(bucket?.bucket_photos || [])]
    .filter((p: any) => !!p.storage_path)
    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  const hasCover = !!bucket?.cover_image;
  const isCustomCover = !!bucket?.cover_image && !bucket.cover_image.startsWith('preset:');
  const chosenPhotoId =
    bucket?.thumbnail_mode === 'photo' && thumbPhotos.some((p: any) => p.id === bucket?.thumbnail_photo_id)
      ? (bucket.thumbnail_photo_id as string)
      : null;
  const thumbSelection: ThumbnailMode = chosenPhotoId
    ? 'photo'
    : bucket?.thumbnail_mode === 'cover' && hasCover
      ? 'cover'
      : 'auto';
  const showThumbnailPicker = canEdit && (thumbPhotos.length > 0 || hasCover);
  const subtasks: any[] = [...(bucket?.item_subtasks || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const comments: any[] = commentsData || [];
  const subtasksDone = subtasks.filter((s) => s.done).length;
  const totalReactions = reactionsData?.length || 0;
  const myReaction = reactionsData?.find((r: any) => r.user_id === user?.id);

  const shareMoment = async () => {
    try {
      await Share.share({
        title: bucket?.title,
        message: `${bucket?.title}${bucket?.location_text ? `\n${bucket.location_text}` : ''}${bucket?.description ? `\n\n${bucket.description}` : ''}`,
      });
    } catch (error) {
      console.error('Unable to share moment', error);
    }
  };

  const openMoreMenu = () => {
    setSheetMode('menu');
    setSheetVisible(true);
  };

  const closeSheet = (after?: () => void) => {
    Animated.timing(sheetTranslateY, {
      toValue: 420,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }: { finished: boolean }) => {
      if (finished) {
        setSheetVisible(false);
        after?.();
      }
    });
  };

  const invalidateBucket = () => {
    void queryClient.invalidateQueries({ queryKey: ['bucketAlbum', id] });
    void queryClient.invalidateQueries({ queryKey: ['buckets'] });
    void queryClient.invalidateQueries({ queryKey: ['albums'] });
  };

  const handleChangeStatus = async (status: string) => {
    const patch: Record<string, any> = { status };
    if (status !== 'completed') {
      patch.completed_at = null;
    } else {
      patch.completed_at = bucket?.completed_at || new Date().toISOString();
    }
    queryClient.setQueryData(['bucketDetail', id], (oldData: any) => oldData ? { ...oldData, ...patch } : oldData);
    const { error } = await supabase
      .from('buckets')
      .update(patch)
      .eq('id', id);

    if (error) {
      Alert.alert('No se pudo cambiar el estado', error.message);
      void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
      return;
    }

    invalidateBucket();
    closeSheet();
  };

  const handleChangeVisibility = async (visibility: 'public' | 'followers' | 'private') => {
    queryClient.setQueryData(['bucketDetail', id], (oldData: any) => oldData ? { ...oldData, visibility } : oldData);
    const { error } = await supabase
      .from('buckets')
      .update({ visibility })
      .eq('id', id);

    if (error) {
      Alert.alert('No se pudo cambiar la visibilidad', error.message);
      void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
      return;
    }

    invalidateBucket();
    closeSheet();
  };

  const handleChangeCategory = async (categoryId: string) => {
    const selectedCat = categories.find((c: any) => c.id === categoryId);
    queryClient.setQueryData(['bucketDetail', id], (oldData: any) =>
      oldData ? { ...oldData, category_id: categoryId, category: selectedCat } : oldData
    );
    const { error } = await supabase
      .from('buckets')
      .update({ category_id: categoryId })
      .eq('id', id);

    if (error) {
      Alert.alert('No se pudo cambiar la categoría', error.message);
      void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
      return;
    }

    void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
    void queryClient.invalidateQueries({ queryKey: ['buckets'] });
    closeSheet();
  };

  const handleChangePriority = async (priority: 'low' | 'medium' | 'high') => {
    queryClient.setQueryData(['bucketDetail', id], (oldData: any) =>
      oldData ? { ...oldData, priority } : oldData
    );
    const { error } = await supabase
      .from('buckets')
      .update({ priority })
      .eq('id', id);

    if (error) {
      Alert.alert('No se pudo cambiar la prioridad', error.message);
      void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
      return;
    }

    void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
    void queryClient.invalidateQueries({ queryKey: ['buckets'] });
    closeSheet();
  };

  const handleSaveLocation = async (loc: { text: string; lat: number; lng: number } | null) => {
    const newText = loc?.text || null;
    const newLat = loc?.lat || null;
    const newLng = loc?.lng || null;
    queryClient.setQueryData(['bucketDetail', id], (old: any) =>
      old ? { ...old, location_text: newText, location_lat: newLat, location_lng: newLng } : old
    );
    const { error } = await supabase
      .from('buckets')
      .update({ location_text: newText, location_lat: newLat, location_lng: newLng })
      .eq('id', id);

    if (error) {
      Alert.alert('No se pudo actualizar la ubicación', error.message);
    }
    void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
    void queryClient.invalidateQueries({ queryKey: ['buckets'] });
  };

  const handleRemoveLocation = async () => {
    await handleSaveLocation(null);
  };

  const handleRemoveDeadline = async () => {
    queryClient.setQueryData(['bucketDetail', id], (old: any) =>
      old ? { ...old, deadline: null } : old
    );
    const { error } = await supabase.from('buckets').update({ deadline: null }).eq('id', id);
    if (error) {
      Alert.alert('No se pudo quitar la fecha límite', error.message);
    }
    void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
    void queryClient.invalidateQueries({ queryKey: ['buckets'] });
    void queryClient.invalidateQueries({ queryKey: ['calendar_month'] });
  };

  const handleRemoveCompletedAt = async () => {
    Alert.alert(
      'Fecha de completado',
      '¿Deseas quitar la fecha o también marcar la tarea como pendiente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Solo quitar fecha',
          onPress: async () => {
            queryClient.setQueryData(['bucketDetail', id], (old: any) =>
              old ? { ...old, completed_at: null } : old
            );
            await supabase.from('buckets').update({ completed_at: null }).eq('id', id);
            void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
            void queryClient.invalidateQueries({ queryKey: ['buckets'] });
            void queryClient.invalidateQueries({ queryKey: ['calendar_month'] });
          },
        },
        {
          text: 'Marcar como pendiente',
          style: 'destructive',
          onPress: async () => {
            queryClient.setQueryData(['bucketDetail', id], (old: any) =>
              old ? { ...old, completed_at: null, status: 'pending' } : old
            );
            await supabase.from('buckets').update({ completed_at: null, status: 'pending' }).eq('id', id);
            void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
            void queryClient.invalidateQueries({ queryKey: ['buckets'] });
            void queryClient.invalidateQueries({ queryKey: ['calendar_month'] });
          },
        },
      ]
    );
  };

  const loadAlbums = () => {
    setSheetMode('albums');
  };

  const toggleAlbum = async (albumId: string) => {
    if (!user) return;
    const isCurrentlySelected = bucketAlbums?.some((a: any) => a.album_id === albumId);

    if (isCurrentlySelected) {
      const { error } = await supabase
        .from('album_items')
        .delete()
        .eq('bucket_id', id)
        .eq('album_id', albumId);
      if (error) Alert.alert('Error', error.message);
    } else {
      const { error } = await supabase
        .from('album_items')
        .insert({ album_id: albumId, bucket_id: id, position: 0 });
      if (error) Alert.alert('Error', error.message);
    }
    invalidateBucket();
  };

  const removeAllAlbums = async () => {
    if (!user) return;
    const { error } = await supabase
      .from('album_items')
      .delete()
      .eq('bucket_id', id);
    if (error) Alert.alert('Error', error.message);
    invalidateBucket();
    closeSheet();
  };

  const addMention = async (task: MentionTask) => {
    queryClient.setQueryData(['bucketMentions', id], (old: any) => [
      ...(old ?? []),
      { mentionId: `tmp-${task.id}`, task },
    ]);
    const { error } = await supabase.from('bucket_mentions').insert({ bucket_a: id, bucket_b: task.id });
    if (error && error.code !== '23505') {
      queryClient.setQueryData(['bucketMentions', id], (old: any) =>
        (old ?? []).filter((m: any) => m.task.id !== task.id),
      );
      Alert.alert('No se pudo mencionar la tarea', error.message || 'Inténtalo de nuevo.');
      return;
    }
    try {
      const stored = await AsyncStorage.getItem(`@bucket_mentions_order_${id}`);
      const savedIds: string[] = stored ? JSON.parse(stored) : [];
      if (!savedIds.includes(task.id)) {
        savedIds.push(task.id);
        await AsyncStorage.setItem(`@bucket_mentions_order_${id}`, JSON.stringify(savedIds));
      }
    } catch {}
    void queryClient.invalidateQueries({ queryKey: ['bucketMentions'] });
  };

  const deleteMention = async (mentionId: string) => {
    const previous = queryClient.getQueryData<any[]>(['bucketMentions', id]);
    const deleted = (previous ?? []).find((m) => m.mentionId === mentionId);
    queryClient.setQueryData(['bucketMentions', id], (old: any) =>
      (old ?? []).filter((m: any) => m.mentionId !== mentionId),
    );
    const { data, error } = await supabase.from('bucket_mentions').delete().eq('id', mentionId).select('id');
    if (error || !data || data.length === 0) {
      queryClient.setQueryData(['bucketMentions', id], previous);
      Alert.alert('No se pudo quitar la mención', error?.message || 'No tienes permiso para quitarla.');
      return;
    }
    if (deleted?.task?.id) {
      try {
        const stored = await AsyncStorage.getItem(`@bucket_mentions_order_${id}`);
        if (stored) {
          const savedIds: string[] = JSON.parse(stored);
          const next = savedIds.filter((tid) => tid !== deleted.task.id);
          await AsyncStorage.setItem(`@bucket_mentions_order_${id}`, JSON.stringify(next));
        }
      } catch {}
    }
    void queryClient.invalidateQueries({ queryKey: ['bucketMentions'] });
  };

  const handleMoveMention = async (fromIndex: number, toIndex: number) => {
    if (!mentionsData) return;
    const clampedToIndex = Math.max(0, Math.min(toIndex, mentionsData.length - 1));
    if (fromIndex === clampedToIndex || clampedToIndex < 0 || clampedToIndex >= mentionsData.length) return;

    const reordered = [...mentionsData];
    const [moved] = reordered.splice(fromIndex, 1);
    if (!moved) return;
    reordered.splice(clampedToIndex, 0, moved);

    queryClient.setQueryData(['bucketMentions', id], reordered);

    try {
      const orderedIds = reordered.map((m) => m.task.id);
      await AsyncStorage.setItem(`@bucket_mentions_order_${id}`, JSON.stringify(orderedIds));
    } catch (e) {
      console.warn('Error guardando el orden de las menciones:', e);
    }
  };

  const toggleMention = (task: MentionTask) => {
    const existing = (mentionsData ?? []).find((m) => m.task.id === task.id);
    if (existing) {
      if (existing.mentionId.startsWith('tmp-')) return;
      void deleteMention(existing.mentionId);
    } else {
      void addMention(task);
    }
  };

  const removeMention = (mentionId: string, title: string) => {
    if (mentionId.startsWith('tmp-')) return;
    Alert.alert('Quitar mención', `Se quitará la relación con "${title}" en ambas tareas.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => void deleteMention(mentionId) },
    ]);
  };

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

  const pickAndUploadPhotos = async () => {
    if (!user) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos para subirlas a este momento.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 6,
      quality: 1,
    });

    if (result.canceled || !result.assets.length) return;

    try {
      if (Platform.OS === 'ios') await new Promise((r) => setTimeout(r, 350));

      const editedUris: string[] = [];
      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i]!;
        const base = await ImageManipulator.manipulateAsync(
          asset.uri,
          asset.width && asset.width > 1600 ? [{ resize: { width: 1600 } }] : [],
          { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
        );
        const edited = await requestPhotoEdit(base, i, result.assets.length);
        if (edited === null) {
          setCropRequest(null);
          return;
        }
        editedUris.push(edited);
        if (i + 1 < result.assets.length) {
          setCropRequest(null);
          await new Promise((r) => setTimeout(r, 50));
        }
      }
      setCropRequest(null);

      const maxPosition = Math.max(-1, ...((bucket?.bucket_photos ?? []) as any[]).map((p: any) => p.position ?? 0));
      let nextPosition = maxPosition + 1;

      for (const uri of editedUris) {
        const processed = await processBucketImage(uri);
        const paths = await storageApi.uploadPhoto(
          user.id,
          id,
          processed.original.uri,
          processed.thumbnail.uri,
        );

        const { error } = await supabase.from('bucket_photos').insert({
          bucket_id: id,
          user_id: user.id,
          storage_path: paths.photoPath,
          thumb_path: paths.thumbPath,
          width: processed.original.width,
          height: processed.original.height,
          size_bytes: processed.original.sizeBytes,
          thumb_size_bytes: processed.thumbnail.sizeBytes,
          position: nextPosition++,
        });

        if (error) throw error;
      }

      void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
      invalidateBucket();
      Alert.alert('Fotos subidas', 'Las fotos se han añadido al momento.');
    } catch (error: any) {
      setCropRequest(null);
      Alert.alert('No se pudieron subir las fotos', error?.message || 'Inténtalo de nuevo.');
    }
  };

  const persistPhotoOrder = async (orderedIds: string[]) => {
    const current = new Map<string, number | null>(
      ((bucket?.bucket_photos ?? []) as any[]).map((p: any) => [p.id, p.position ?? null]),
    );
    queryClient.setQueryData(['bucketDetail', id], (old: any) => {
      if (!old) return old;
      return {
        ...old,
        bucket_photos: (old.bucket_photos || []).map((p: any) => {
          const idx = orderedIds.indexOf(p.id);
          return idx >= 0 ? { ...p, position: idx } : p;
        }),
      };
    });
    const changed = orderedIds
      .map((pid, idx) => ({ pid, idx }))
      .filter(({ pid, idx }) => current.get(pid) !== idx);
    const results = await Promise.all(
      changed.map(({ pid, idx }) => supabase.from('bucket_photos').update({ position: idx }).eq('id', pid)),
    );
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      console.error('Error guardando el orden de las fotos:', failed.error);
      Alert.alert('Error', 'No se pudo guardar el nuevo orden de las fotos');
    }
    void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
  };

  const confirmDeletePhoto = (photo: any) => {
    Alert.alert('Borrar foto', 'Se eliminará de esta tarea. Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar', style: 'destructive', onPress: () => void deletePhoto(photo) },
    ]);
  };

  const deletePhoto = async (photo: any) => {
    const previous = queryClient.getQueryData(['bucketDetail', id]);
    const shownIndex = photos.findIndex((p: any) => p.id === photo.id);
    const remaining = photos.length - 1;

    queryClient.setQueryData(['bucketDetail', id], (old: any) =>
      old ? { ...old, bucket_photos: (old.bucket_photos || []).filter((p: any) => p.id !== photo.id) } : old,
    );
    setViewingPhotoIndex(remaining <= 0 ? null : Math.min(Math.max(shownIndex, 0), remaining - 1));

    const { data, error } = await supabase.from('bucket_photos').delete().eq('id', photo.id).select('id');
    if (error || !data || data.length === 0) {
      queryClient.setQueryData(['bucketDetail', id], previous);
      Alert.alert('No se pudo borrar la foto', error?.message || 'No tienes permiso para borrar esta foto.');
      return;
    }

    try {
      const files = [photo.storage_path, photo.thumb_path].filter(Boolean) as string[];
      if (files.length) await supabase.storage.from('photos').remove(files);
    } catch (e) {
      console.warn('No se pudieron borrar los archivos de la foto', e);
    }

    void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
    invalidateBucket();
  };

  const handleUpdatePhotoTitle = useCallback(
    async (photoId: string, title: string) => {
      const targetId = Array.isArray(id) ? id[0] : id;
      queryClient.setQueryData(['bucketDetail', targetId], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          bucket_photos: (oldData.bucket_photos || []).map((p: any) =>
            p.id === photoId ? { ...p, title } : p
          ),
        };
      });
      const { error } = await supabase
        .from('bucket_photos')
        .update({ title: title.trim() || null })
        .eq('id', photoId);
      if (error) {
        console.error('Error al actualizar título de foto:', error);
      }
    },
    [id, queryClient]
  );

  const handleUpdatePhotoDate = useCallback(
    async (photoId: string, field: 'created_at' | 'completed_at', date: string | null) => {
      const targetId = Array.isArray(id) ? id[0] : id;
      const previous = queryClient.getQueryData(['bucketDetail', targetId]);

      // 1. Actualización optimista inmediata en cache
      queryClient.setQueryData(['bucketDetail', targetId], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          bucket_photos: (oldData.bucket_photos || []).map((p: any) =>
            p.id === photoId ? { ...p, [field]: date } : p
          ),
        };
      });

      // 2. Persistencia en Supabase
      const { error } = await supabase
        .from('bucket_photos')
        .update({ [field]: date })
        .eq('id', photoId);

      if (error) {
        console.error('Error al guardar fecha de foto:', error);
        queryClient.setQueryData(['bucketDetail', targetId], previous);
        Alert.alert('Error', 'No se pudo guardar la fecha: ' + (error.message || 'Error desconocido'));
        return;
      }

      // 3. Invalidación solo tras confirmación de la BD
      await queryClient.invalidateQueries({ queryKey: ['bucketDetail', targetId] });
      void queryClient.invalidateQueries({ queryKey: ['buckets'] });
    },
    [id, queryClient]
  );

  const uploadPhotos = () => {
    closeSheet(() => void pickAndUploadPhotos());
  };

  const pickAndUploadCover = async () => {
    if (!user) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos para la portada.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (result.canceled || !result.assets.length) return;
    const asset = result.assets[0];
    if (!asset) return;

    try {
      const processed = await processBucketImage(asset.uri);
      const path = `covers/${id}_${Date.now()}.jpg`;
      const publicUrl = await storageApi.uploadSingle(path, processed.original.uri);

      const { error } = await supabase
        .from('buckets')
        .update({ cover_image: publicUrl })
        .eq('id', id);

      if (error) throw error;

      queryClient.setQueryData(['bucketDetail', id], (oldData: any) => oldData ? { ...oldData, cover_image: publicUrl } : oldData);
      invalidateBucket();
      Alert.alert('Portada actualizada', 'La portada se ha actualizado correctamente.');
    } catch (error: any) {
      Alert.alert('No se pudo actualizar la portada', error?.message || 'Inténtalo de nuevo.');
    }
  };

  const uploadCover = () => {
    closeSheet(() => void pickAndUploadCover());
  };

  const chooseThumbnail = async (mode: ThumbnailMode, photoId: string | null = null) => {
    const patch = {
      thumbnail_mode: mode,
      thumbnail_photo_id: mode === 'photo' ? photoId : null,
    };
    const previous = queryClient.getQueryData(['bucketDetail', id]);
    queryClient.setQueryData(['bucketDetail', id], (oldData: any) =>
      oldData ? { ...oldData, ...patch } : oldData,
    );

    const { error } = await supabase.from('buckets').update(patch).eq('id', id);
    if (error) {
      queryClient.setQueryData(['bucketDetail', id], previous);
      Alert.alert('No se pudo cambiar la imagen', error.message || 'Inténtalo de nuevo.');
      return;
    }

    invalidateBucket();
    void queryClient.invalidateQueries({ queryKey: ['feed'] });
    void queryClient.invalidateQueries({ queryKey: ['explore'] });
    void queryClient.invalidateQueries({ queryKey: ['unassigned_tasks'] });
  };

  const handleDelete = () => {
    closeSheet(() => {
      Alert.alert('Eliminar tarea', '¿Seguro que quieres eliminar esta tarea? No se puede deshacer.', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteBucket.mutate(id, { onSuccess: () => router.back() }),
        },
      ]);
    });
  };

  const handleLeaveCollaboration = () => {
    closeSheet(() => {
      Alert.alert(
        'Dejar de colaborar',
        '¿Quieres salir de esta tarea colaborativa? Dejará de aparecer en tu lista.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Salir',
            style: 'destructive',
            onPress: async () => {
              const { error } = await supabase
                .from('bucket_collaborators')
                .delete()
                .eq('bucket_id', id)
                .eq('user_id', user!.id);
              if (error) {
                Alert.alert('Error', error.message);
              } else {
                void queryClient.invalidateQueries({ queryKey: ['buckets'] });
                router.back();
              }
            },
          },
        ]
      );
    });
  };

  const updateCounter = async (patch: Record<string, any>) => {
    queryClient.setQueryData(['bucketDetail', id], (oldData: any) => oldData ? { ...oldData, ...patch } : oldData);

    const { error } = await supabase.from('buckets').update(patch).eq('id', id);
    if (error) {
      Alert.alert('No se pudo actualizar el contador', error.message);
      void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ['buckets'] });
  };

  const changeCounter = (delta: number) => {
    const current = queryClient.getQueryData<any>(['bucketDetail', id])?.counter_count ?? 0;
    void updateCounter({ counter_count: Math.max(0, current + delta) });
  };

  const handleCounterCountChange = (n: number) => {
    queryClient.setQueryData(['bucketDetail', id], (oldData: any) => oldData ? { ...oldData, counter_count: n } : oldData);
    if (counterCountTimeout.current) clearTimeout(counterCountTimeout.current);
    counterCountTimeout.current = setTimeout(() => {
      void updateCounter({ counter_count: n });
    }, 500);
  };

  const handleCounterLabelChange = (text: string) => {
    queryClient.setQueryData(['bucketDetail', id], (oldData: any) => oldData ? { ...oldData, counter_label: text } : oldData);
    if (counterLabelTimeout.current) clearTimeout(counterLabelTimeout.current);
    counterLabelTimeout.current = setTimeout(() => {
      void supabase.from('buckets').update({ counter_label: text.trim() || null }).eq('id', id);
    }, 500);
  };

  const handleCounterTargetChange = (text: string) => {
    const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
    const value = Number.isFinite(n) && n > 0 ? n : null;

    queryClient.setQueryData(['bucketDetail', id], (oldData: any) => oldData ? { ...oldData, counter_target: value } : oldData);
    if (counterTargetTimeout.current) clearTimeout(counterTargetTimeout.current);
    counterTargetTimeout.current = setTimeout(() => {
      void supabase.from('buckets').update({ counter_target: value }).eq('id', id).then(({ error }) => {
        if (error) console.error('Failed to update counter_target:', error);
      });
    }, 500);
  };

  const removeCounter = () => {
    Alert.alert('Quitar contador', 'Se perderá la cuenta actual.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Quitar',
        style: 'destructive',
        onPress: () =>
          void updateCounter({ counter_enabled: false, counter_count: 0, counter_label: null, counter_target: null }),
      },
    ]);
  };

  const toggleSubtask = async (subtask: any) => {
    const nextDone = !subtask.done;
    queryClient.setQueryData(['bucketDetail', id], (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        item_subtasks: (oldData.item_subtasks || []).map((st: any) =>
          st.id === subtask.id ? { ...st, done: nextDone } : st
        ),
      };
    });

    const { error } = await supabase
      .from('item_subtasks')
      .update({ done: nextDone })
      .eq('id', subtask.id);

    if (error) {
      Alert.alert('No se pudo actualizar el paso', error.message);
      void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
      return;
    }

    void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
    void queryClient.invalidateQueries({ queryKey: ['buckets'] });
  };

  const handleSubtaskChange = (st: any, newText: string) => {
    queryClient.setQueryData(['bucketDetail', id], (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        item_subtasks: (oldData.item_subtasks || []).map((s: any) =>
          s.id === st.id ? { ...s, title: newText } : s
        ),
      };
    });

    if (subtaskTimeouts.current[st.id]) {
      clearTimeout(subtaskTimeouts.current[st.id]);
    }

    subtaskTimeouts.current[st.id] = setTimeout(async () => {
      if (!newText.trim()) return;
      const { error } = await supabase.from('item_subtasks').update({ title: newText.trim() }).eq('id', st.id);
      if (!error) void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
    }, 500);
  };

  const handleDeleteSubtask = (st: any) => {
    queryClient.setQueryData(['bucketDetail', id], (oldData: any) => {
      if (!oldData) return oldData;
      return { ...oldData, item_subtasks: (oldData.item_subtasks || []).filter((s: any) => s.id !== st.id) };
    });

    void supabase.from('item_subtasks').delete().eq('id', st.id).then(({ error }) => {
      if (error) {
        Alert.alert('No se pudo eliminar el paso', error.message);
        void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
      void queryClient.invalidateQueries({ queryKey: ['buckets'] });
    });
  };

  const handleMoveSubtask = async (fromIndex: number, toIndex: number) => {
    const clampedToIndex = Math.max(0, Math.min(toIndex, subtasks.length - 1));
    if (fromIndex === clampedToIndex || clampedToIndex < 0 || clampedToIndex >= subtasks.length) return;

    const reordered = [...subtasks];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(clampedToIndex, 0, moved);

    queryClient.setQueryData(['bucketDetail', id], (oldData: any) =>
      oldData ? { ...oldData, item_subtasks: reordered.map((st, index) => ({ ...st, position: index })) } : oldData,
    );

    const results = await Promise.all(
      reordered.map((st, index) =>
        supabase.from('item_subtasks').update({ position: index }).eq('id', st.id),
      ),
    );

    const error = results.find((result) => result.error)?.error;
    if (error) {
      Alert.alert('No se pudo reorganizar los pasos', error.message);
      void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
      return;
    }

    void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
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
    const { error } = await supabase.from('buckets').update({ title: titleToSave.trim() }).eq('id', id);
    if (!error) {
      void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
      void queryClient.invalidateQueries({ queryKey: ['buckets'] });
    }
  };

  const handleTitleChange = (newTitle: string) => {
    pendingTitle.current = newTitle;
    queryClient.setQueryData(['bucketDetail', id], (oldData: any) => oldData ? { ...oldData, title: newTitle } : oldData);
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
    const { error } = await supabase.from('buckets').update({ description: descToSave.trim() }).eq('id', id);
    if (!error) {
      void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
      void queryClient.invalidateQueries({ queryKey: ['buckets'] });
    }
  };

  const handleDescriptionChange = (newDesc: string) => {
    pendingDesc.current = newDesc;
    queryClient.setQueryData(['bucketDetail', id], (oldData: any) => oldData ? { ...oldData, description: newDesc } : oldData);
    if (descTimeout.current) clearTimeout(descTimeout.current);
    descTimeout.current = setTimeout(flushDescriptionChange, 1500);
  };

  const handleAddSubtask = async () => {
    const text = newSubtaskText.trim();
    if (!text) return;
    setNewSubtaskText('');
    const { error } = await supabase.from('item_subtasks').insert({
      bucket_id: id,
      title: text,
      done: false,
      position: subtasks.length,
    });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
    }
  };

  const handleCollaboratorsChange = async (rawCollabs: CollaboratorItem[]) => {
    try {
      const lockedIds = new Set<string>([
        ...(bucket?.user_id ? [bucket.user_id] : []),
        ...participantsData.map((p: any) => p.id),
      ]);
      const newCollabs = rawCollabs.filter((c) => !lockedIds.has(c.id));
      const currentIds = new Set(collaborators.map((c: any) => c.id));
      const newIds = new Set(newCollabs.map((c) => c.id));

      const toAdd = newCollabs.filter((c) => !currentIds.has(c.id));
      const toRemoveIds = collaborators
        .filter((c: any) => !newIds.has(c.id) && !lockedIds.has(c.id) && c.id !== user?.id)
        .map((c: any) => c.id);

      const existingStatusMap = new Map<string, string>(collaborators.map((c: any) => [c.id, c.status]));
      const selfCollab = collaborators.find((c: any) => c.id === user?.id);
      const remainingCollabs = newCollabs.filter((c) => !lockedIds.has(c.id));
      const mergedCollabs = [
        ...(selfCollab ? [selfCollab] : []),
        ...remainingCollabs.map((c) => ({ ...c, status: existingStatusMap.get(c.id) || 'pending' })),
      ];
      queryClient.setQueryData(['bucketCollaborators', id], mergedCollabs);

      if (toAdd.length > 0) {
        const { error: insErr } = await supabase.from('bucket_collaborators').insert(
          toAdd.map((c) => ({
            bucket_id: id,
            user_id: c.id,
            status: 'pending',
          }))
        );
        if (insErr) console.warn('Error adding collaborators:', insErr);
      }

      if (toRemoveIds.length > 0) {
        const { error: delErr } = await supabase
          .from('bucket_collaborators')
          .delete()
          .eq('bucket_id', id)
          .in('user_id', toRemoveIds);
        if (delErr) console.warn('Error removing collaborators:', delErr);
      }

      void refetchCollaborators();
      void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
    } catch (err) {
      console.warn('Error updating collaborators:', err);
      void refetchCollaborators();
    }
  };

  return {
    id,
    router,
    queryClient,
    user,
    refreshing,
    onRefresh,
    bucket,
    isLoading,
    categories,
    bucketAlbums,
    mentionsData,
    reactionsData,
    commentsData,
    collaborators,
    participantsData,
    albumsData,
    albumsLoading,
    isOwner,
    isCollaborator,
    isInSharedAlbum,
    canEdit,
    photos,
    thumbPhotos,
    hasCover,
    isCustomCover,
    chosenPhotoId,
    thumbSelection,
    showThumbnailPicker,
    subtasks,
    subtasksDone,
    comments,
    totalReactions,
    myReaction,
    activePhotoIndex,
    setActivePhotoIndex,
    sheetVisible,
    setSheetVisible,
    sheetMode,
    setSheetMode,
    sheetTranslateY,
    openMoreMenu,
    closeSheet,
    viewingPhotoIndex,
    setViewingPhotoIndex,
    newSubtaskText,
    setNewSubtaskText,
    scrollEnabled,
    setScrollEnabled,
    showMentionPicker,
    setShowMentionPicker,
    cropRequest,
    finishPhotoEdit,
    datePickerConfig,
    setDatePickerConfig,
    showCollaboratorPicker,
    setShowCollaboratorPicker,
    showNotificationModal,
    setShowNotificationModal,
    subStatus,
    locationModalVisible,
    setLocationModalVisible,
    photoSearchQuery,
    setPhotoSearchQuery,
    photoSortField,
    photoSortDir,
    photoSortMenuOpen,
    setPhotoSortMenuOpen,
    sortMenuPos,
    sortTriggerRef,
    openSortMenu,
    handleSortOption,
    shareMoment,
    handleChangeStatus,
    handleChangeVisibility,
    handleChangeCategory,
    handleChangePriority,
    handleSaveLocation,
    handleRemoveLocation,
    handleRemoveDeadline,
    handleRemoveCompletedAt,
    loadAlbums,
    toggleAlbum,
    removeAllAlbums,
    toggleMention,
    removeMention,
    handleMoveMention,
    pickAndUploadPhotos,
    persistPhotoOrder,
    confirmDeletePhoto,
    uploadPhotos,
    uploadCover,
    chooseThumbnail,
    handleDelete,
    handleLeaveCollaboration,
    updateCounter,
    changeCounter,
    handleCounterCountChange,
    handleCounterLabelChange,
    handleCounterTargetChange,
    removeCounter,
    toggleSubtask,
    handleSubtaskChange,
    handleDeleteSubtask,
    handleMoveSubtask,
    handleTitleChange,
    flushTitleChange,
    handleDescriptionChange,
    flushDescriptionChange,
    handleAddSubtask,
    handleCollaboratorsChange,
    isFav,
    toggleFavorite,
    toggleReaction,
    copyBucket,
    handleUpdatePhotoTitle,
    handleUpdatePhotoDate,
  };
}
