import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Alert, Share, ActivityIndicator, ScrollView, Image, Pressable, FlatList, Dimensions, Platform, StatusBar, Modal, Animated, NativeSyntheticEvent, NativeScrollEvent, TextInput, PanResponder, KeyboardAvoidingView, RefreshControl } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Typography, useTheme } from '@bucketlist/ui';
import { ArrowLeft, Share2, MoreHorizontal, MapPin, Calendar, Heart, MessageCircle, FolderOpen, CheckCircle2, Circle, Camera, Check, Eye, Lock, Users, FolderPlus, Pencil, Trash2, X, ListPlus, Plus, Minus, Download, ArrowUp, ArrowDown, Tag, Flag, Star, GripVertical, Link2 } from 'lucide-react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../../src/services/supabase';
import { normalizeStorageUrl } from '../../src/constants/urls';
import { storageApi } from '../../src/services/api/storage';
import { processBucketImage } from '@bucketlist/shared';
import { useAuthStore } from '../../src/stores/auth.store';
import { usePullToRefresh } from '../../src/hooks/useAutoRefresh';
import { useAddComment, useCopyBucket, useToggleReaction } from '../../src/hooks/useSocial';
import { useDeleteBucket } from '../../src/hooks/useBuckets';
import { useAlbums } from '../../src/hooks/useAlbums';
import { useUserFavorites, useToggleFavoriteBucket } from '../../src/hooks/useFavorites';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';
import { BucketCover } from '../../src/components/BucketCover';
import { resolveTaskImage, type ThumbnailMode } from '../../src/utils/taskImage';
import { SubtaskList } from '../../src/components/SubtaskList';
import { BucketPhotoViewer } from '../../src/components/BucketPhotoViewer';
import { PhotoCropModal } from '../../src/components/PhotoCropModal';
import { DraggableTaskList } from '../../src/components/DraggableTaskList';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TaskMentionPickerSheet, MENTION_TASK_COLUMNS, type MentionTask } from '../../src/components/TaskMentionPickerSheet';
import { TaskMentionList } from '../../src/components/TaskMentionList';
import { BucketBottomSheet } from '../../src/components/BucketBottomSheet';
import { LocationAutocomplete } from '../../src/components/LocationAutocomplete';
import { styles } from './BucketDetail.styles';
import { ItemTagsRow } from '../../src/components/ItemTagsRow';
import { CollaboratorPickerSheet, type CollaboratorItem } from '../../src/components/CollaboratorPickerSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 220;
const BADGES_OVERLAP = 32;
// Cuánto se meten las etiquetas sobre la portada.

import { ProgressBar, BucketCounterSection } from './BucketCounterSection';
import { BucketCollaboratorsRow, getInitials } from './BucketCollaboratorsRow';
import { BucketMetaSection } from './BucketMetaSection';
import { BucketThumbnailSelector } from './BucketThumbnailSelector';
import { BucketPhotosSection } from './BucketPhotosSection';
import { PhotoSortModal, type PhotoSortField, type PhotoSortDir } from './PhotoSortModal';
import { BucketLocationModal } from './BucketLocationModal';
import { BucketDatePickerModal, type DatePickerConfig } from './BucketDatePickerModal';

export default function BucketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { refreshing, onRefresh } = usePullToRefresh();

  const insets = useSafeAreaInsets();
  const coverTotalHeight = COVER_HEIGHT + insets.top;

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<'menu' | 'visibility' | 'albums' | 'status' | 'category' | 'priority'>('menu');
  const [viewingPhotoIndex, setViewingPhotoIndex] = useState<number | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  // Editor de recorte/giro al añadir fotos: se pide una foto cada vez y se espera el resultado.
  const [cropRequest, setCropRequest] = useState<{ uri: string; width: number; height: number; index: number; total: number } | null>(null);
  const cropResolver = useRef<((uri: string | null) => void) | null>(null);
  const [datePickerConfig, setDatePickerConfig] = useState<{ visible: boolean, type: 'deadline' | 'completed_at', date: Date } | null>(null);
  const [showCollaboratorPicker, setShowCollaboratorPicker] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const sheetTranslateY = useRef(new Animated.Value(420)).current;
  const subtaskTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const titleTimeout = useRef<NodeJS.Timeout | null>(null);
  const descTimeout = useRef<NodeJS.Timeout | null>(null);
  const counterLabelTimeout = useRef<NodeJS.Timeout | null>(null);
  const counterTargetTimeout = useRef<NodeJS.Timeout | null>(null);
  const counterCountTimeout = useRef<NodeJS.Timeout | null>(null);
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

  // Menciones: relación simétrica; cada fila trae las dos tareas y nos quedamos con la otra.
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
      } catch {
        // Fallback al orden de la consulta
      }

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

  // Participantes de la tarea que vienen de álbumes compartidos (dueño del álbum y miembros
  // aceptados) además del dueño de la tarea y sus colaboradores. Se refresca por Realtime.
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

  const handleCollaboratorsChange = async (rawCollabs: CollaboratorItem[]) => {
    try {
      // Dueño de la tarea y miembros de álbum no son filas de bucket_collaborators:
      // no se añaden ni se quitan desde aquí.
      const lockedIds = new Set<string>([
        ...(bucket?.user_id ? [bucket.user_id] : []),
        ...participantsData.map((p: any) => p.id),
      ]);
      const newCollabs = rawCollabs.filter(c => !lockedIds.has(c.id));
      const currentIds = new Set(collaborators.map((c: any) => c.id));
      const newIds = new Set(newCollabs.map(c => c.id));

      const toAdd = newCollabs.filter(c => !currentIds.has(c.id));
      // Anyone who can edit can remove collaborators except lockedIds (creator & album participants) and self
      const toRemoveIds = collaborators
        .filter((c: any) => !newIds.has(c.id) && !lockedIds.has(c.id) && c.id !== user?.id)
        .map((c: any) => c.id);

      // Optimistic update: preserve existing status if already set
      const existingStatusMap = new Map<string, string>(collaborators.map((c: any) => [c.id, c.status]));
      const selfCollab = collaborators.find((c: any) => c.id === user?.id);
      const remainingCollabs = newCollabs.filter(c => !lockedIds.has(c.id));
      const mergedCollabs = [
        ...(selfCollab ? [selfCollab] : []),
        ...remainingCollabs.map(c => ({ ...c, status: existingStatusMap.get(c.id) || 'pending' })),
      ];
      queryClient.setQueryData(['bucketCollaborators', id], mergedCollabs);

      if (toAdd.length > 0) {
        const { error: insErr } = await supabase.from('bucket_collaborators').insert(
          toAdd.map(c => ({
            bucket_id: id,
            user_id: c.id,
            status: 'pending',
          }))
        );
        if (insErr) console.warn('Error adding collaborators:', insErr);
      }

      if (toRemoveIds.length > 0) {
        const { error: delErr } = await supabase.from('bucket_collaborators')
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

  // Los hooks deben ejecutarse siempre, antes de cualquier return anticipado.
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

  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagText, setNewTagText] = useState('');

  const handleRemoveTag = async (tagToRemove: string) => {
    const currentTags = bucket.tags || [];
    const newTags = currentTags.filter((t: string) => t !== tagToRemove);
    queryClient.setQueryData(['bucketDetail', id], (old: any) => old ? { ...old, tags: newTags } : old);
    await supabase.from('buckets').update({ tags: newTags }).eq('id', id);
  };

  const handleAddTag = async () => {
    if (!newTagText.trim()) {
      setIsAddingTag(false);
      return;
    }
    const currentTags = bucket.tags || [];
    if (currentTags.includes(newTagText.trim())) {
      setNewTagText('');
      setIsAddingTag(false);
      return;
    }
    const newTags = [...currentTags, newTagText.trim()];
    queryClient.setQueryData(['bucketDetail', id], (old: any) => old ? { ...old, tags: newTags } : old);
    setNewTagText('');
    setIsAddingTag(false);
    await supabase.from('buckets').update({ tags: newTags }).eq('id', id);
  };

  const [photoSearchQuery, setPhotoSearchQuery] = useState('');
  const [photoSortField, setPhotoSortField] = useState<'date' | 'title' | 'manual'>('date');
  const [photoSortDir, setPhotoSortDir] = useState<'desc' | 'asc'>('desc');
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

  const handleSortOption = (field: 'date' | 'title' | 'manual') => {
    if (field === 'manual') {
      setPhotoSortField('manual');
      setPhotoSortMenuOpen(false);
      return;
    }
    if (photoSortField === field) {
      setPhotoSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setPhotoSortField(field);
      setPhotoSortDir(field === 'date' ? 'desc' : 'asc');
      setPhotoSortMenuOpen(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={gold[400]} />
      </View>
    );
  }

  if (!bucket) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: theme.colors.background }]}>
        <Typography variant="body" color={theme.colors.error}>Tarea no encontrada.</Typography>
      </View>
    );
  }

  const isOwner = bucket.user_id === user?.id;
  const isCollaborator = !isOwner && collaborators.some((c: any) => c.id === user?.id && c.status === 'accepted');
  // Miembro (o dueño) de un álbum compartido que contiene esta tarea: puede editarla como cualquier otra.
  // useAlbums() solo devuelve álbumes propios o donde el usuario ha aceptado la invitación.
  const isInSharedAlbum = (bucketAlbums ?? []).some((bi: any) =>
    (albumsData ?? []).some((a: any) => a.id === bi.album_id),
  );
  const canEdit = isOwner || isCollaborator || isInSharedAlbum;
  let photos: any[] = [...(bucket.bucket_photos || [])];

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
  // Imagen de la tarea: opciones y selección vigente (una foto borrada vuelve a Automática).
  const thumbPhotos: any[] = [...(bucket.bucket_photos || [])]
    .filter((p: any) => !!p.storage_path)
    .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  const hasCover = !!bucket.cover_image;
  const isCustomCover = !!bucket.cover_image && !bucket.cover_image.startsWith('preset:');
  const chosenPhotoId =
    bucket.thumbnail_mode === 'photo' && thumbPhotos.some((p: any) => p.id === bucket.thumbnail_photo_id)
      ? (bucket.thumbnail_photo_id as string)
      : null;
  const thumbSelection: ThumbnailMode = chosenPhotoId
    ? 'photo'
    : bucket.thumbnail_mode === 'cover' && hasCover
      ? 'cover'
      : 'auto';
  const showThumbnailPicker = canEdit && (thumbPhotos.length > 0 || hasCover);
  const subtasks: any[] = [...(bucket.item_subtasks || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const comments: any[] = commentsData || [];
  const subtasksDone = subtasks.filter((s) => s.done).length;

  const totalReactions = reactionsData?.length || 0;
  const myReaction = reactionsData?.find((r: any) => r.user_id === user?.id);

  const handlePhotoScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActivePhotoIndex(index);
  };

  const shareMoment = async () => {
    try {
      await Share.share({
        title: bucket.title,
        message: `${bucket.title}${bucket.location_text ? `\n${bucket.location_text}` : ''}${bucket.description ? `\n\n${bucket.description}` : ''}`,
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
      patch.completed_at = new Date().toISOString();
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

  // ── Menciones entre tareas ─────────────────────────────────────────────
  const addMention = async (task: MentionTask) => {
    // Actualiza la pantalla al momento; después se sustituye por los datos reales.
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
    // Refresca esta tarea y la mencionada (la otra pantalla puede estar abierta en la pila).
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

  // Reorganizar menciones (como los pasos en una tarea)
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

  // En el menú desplegable: tocar una tarea la menciona o le quita la mención.
  const toggleMention = (task: MentionTask) => {
    const existing = (mentionsData ?? []).find((m) => m.task.id === task.id);
    if (existing) {
      if (existing.mentionId.startsWith('tmp-')) return; // aún guardándose
      void deleteMention(existing.mentionId);
    } else {
      void addMention(task);
    }
  };

  // Mantener pulsada una mención para quitarla (también se puede desde el menú de menciones).
  const removeMention = (mentionId: string, title: string) => {
    if (mentionId.startsWith('tmp-')) return;
    Alert.alert('Quitar mención', `Se quitará la relación con "${title}" en ambas tareas.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => void deleteMention(mentionId) },
    ]);
  };

  // Abre el editor (recortar / girar) y espera a que el usuario termine. null = cancelado.
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

  // Selecciona fotos de la galería, deja recortarlas/girarlas y las sube a esta tarea.
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
      // En iOS el selector tarda un instante en cerrarse del todo antes de poder abrir otro modal.
      if (Platform.OS === 'ios') await new Promise((r) => setTimeout(r, 350));

      // 1. Editar cada foto (recorte + giro). Cancelar en cualquier momento aborta toda la subida.
      const editedUris: string[] = [];
      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i]!;
        // Normaliza orientación (EXIF) y limita el tamaño para que el editor vaya fluido.
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
          // Deja que el editor se reinicie con la siguiente foto.
          setCropRequest(null);
          await new Promise((r) => setTimeout(r, 50));
        }
      }
      setCropRequest(null);

      // 2. Subir. Las nuevas van al final del orden manual.
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

  // Guarda el nuevo orden manual de las fotos (arrastrar y soltar).
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

  // Borra una foto de la tarea (pide confirmación).
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

    // Actualiza la pantalla al momento.
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

    // Limpia los archivos (si no eres quien la subió, el almacenamiento puede rechazarlo: no es grave).
    try {
      const files = [photo.storage_path, photo.thumb_path].filter(Boolean) as string[];
      if (files.length) await supabase.storage.from('photos').remove(files);
    } catch (e) {
      console.warn('No se pudieron borrar los archivos de la foto', e);
    }

    void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
    invalidateBucket();
  };

  // Desde el menú de opciones: cierra el menú y después abre la galería.
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

  /** Elige qué imagen representa a la tarea en listas, feed y explorar. Se guarda al tocar. */
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
    // No se invalida bucketDetail: con toques rápidos, un refetch antiguo pisaría el número
    void queryClient.invalidateQueries({ queryKey: ['buckets'] });
  };

  const changeCounter = (delta: number) => {
    // Se lee de la caché y no del render, para que los toques rápidos no se pierdan
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

    // Optimistic update
    queryClient.setQueryData(['bucketDetail', id], (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        item_subtasks: (oldData.item_subtasks || []).map((st: any) =>
          st.id === subtask.id ? { ...st, done: nextDone } : st
        )
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
    // Optimistic update
    queryClient.setQueryData(['bucketDetail', id], (oldData: any) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        item_subtasks: (oldData.item_subtasks || []).map((s: any) =>
          s.id === st.id ? { ...s, title: newText } : s
        )
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

  const handleTitleChange = (newTitle: string) => {
    queryClient.setQueryData(['bucketDetail', id], (oldData: any) => oldData ? { ...oldData, title: newTitle } : oldData);
    if (titleTimeout.current) clearTimeout(titleTimeout.current);
    titleTimeout.current = setTimeout(async () => {
      if (!newTitle.trim()) return;
      const { error } = await supabase.from('buckets').update({ title: newTitle.trim() }).eq('id', id);
      if (!error) {
        void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
        void queryClient.invalidateQueries({ queryKey: ['buckets'] });
      }
    }, 500);
  };

  const handleDescriptionChange = (newDesc: string) => {
    queryClient.setQueryData(['bucketDetail', id], (oldData: any) => oldData ? { ...oldData, description: newDesc } : oldData);
    if (descTimeout.current) clearTimeout(descTimeout.current);
    descTimeout.current = setTimeout(async () => {
      const { error } = await supabase.from('buckets').update({ description: newDesc.trim() }).eq('id', id);
      if (!error) {
        void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
        void queryClient.invalidateQueries({ queryKey: ['buckets'] });
      }
    }, 500);
  };

  const handleAddSubtask = async () => {
    const text = newSubtaskText.trim();
    if (!text) return;
    setNewSubtaskText('');
    const { error } = await supabase.from('item_subtasks').insert({
      bucket_id: id,
      title: text,
      done: false,
      position: subtasks.length
    });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
    }
  };

  // ── Cover image ────────────────────────────────────────────────────────────
  const coverUri = photos.length > 0
    ? storageApi.getPublicUrl(photos[activePhotoIndex]?.storage_path)
    : null;

  const statusLabel = (s: string) => {
    switch (s) {
      case 'completed': return 'Completada';
      case 'in_progress': return 'En progreso';
      case 'pending': return 'Pendiente';
      case 'expired': return 'Caducada';
      default: return s;
    }
  };

  const visibilityLabel = (v: string) => {
    switch (v) {
      case 'public': return 'Pública';
      case 'private': return 'Privada';
      case 'followers': return 'Seguidores';
      default: return v;
    }
  };

  const priorityColor = (p?: string) => {
    switch (p) {
      case 'high': return '#EF4444';
      case 'low': return '#10B981';
      case 'medium':
      default: return '#D4B13A';
    }
  };

  const priorityLabel = (p?: string) => {
    switch (p) {
      case 'high': return 'Prioridad Alta';
      case 'low': return 'Prioridad Baja';
      case 'medium':
      default: return 'Prioridad Media';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={{ flex: 1 }}
        scrollEnabled={scrollEnabled}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor="#D4B13A" />}
      >
        {/* ── Cover ──────────────────────────────────────────────────────── */}
        <BucketCover
          value={bucket.cover_image}
          title={bucket.title}
          categorySlug={bucket.category?.slug}
          seed={bucket.id}
          style={{ width: SCREEN_WIDTH, height: coverTotalHeight }}
        >
          {/* Bottom gradient fade (solo cuando no hay portada personalizada) */}
          {!isCustomCover && (
            <LinearGradient
              colors={[
                'rgba(0,0,0,0.15)',
                'transparent',
                'rgba(0,0,0,0.25)',
                'rgba(0,0,0,0.80)',
                theme.colors.background,
              ]}
              locations={[0, 0.35, 0.65, 0.88, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          )}

          {/* Nav buttons */}
          <SafeAreaView style={styles.navOverlay} edges={['top']}>
            <Pressable style={styles.navButton} onPress={() => router.back()}>
              <ArrowLeft color="#FFF" size={20} strokeWidth={2} />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {user && (
                <Pressable
                  style={styles.navButton}
                  accessibilityRole="button"
                  accessibilityLabel={isFav ? 'Quitar de favoritas' : 'Marcar como favorita'}
                  onPress={() => toggleFavorite.mutate({ bucketId: id, currentlyFavorite: isFav })}
                >
                  <Star
                    color={isFav ? gold[400] : '#FFF'}
                    fill={isFav ? gold[400] : 'transparent'}
                    size={20}
                    strokeWidth={2}
                  />
                </Pressable>
              )}
              <Pressable style={styles.navButton} onPress={() => void shareMoment()}>
                <Share2 color="#FFF" size={20} strokeWidth={2} />
              </Pressable>
              <Pressable style={styles.navButton} onPress={openMoreMenu}>
                <MoreHorizontal color="#FFF" size={20} strokeWidth={2} />
              </Pressable>
            </View>
          </SafeAreaView>
        </BucketCover>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <View style={styles.content}>

          {/* Badges */}
          <View style={styles.badges}>
            {/* Status */}
            <Pressable
              style={[styles.badge, styles.badgeGold]}
              onPress={() => {
                if (canEdit) {
                  setSheetMode('status');
                  setSheetVisible(true);
                }
              }}
            >
              <Typography variant="caption" color={gold[400]} style={{ fontWeight: '700' }}>
                {statusLabel(bucket.status)}
              </Typography>
            </Pressable>

            {/* Priority */}
            <Pressable
              style={[styles.badge, styles.badgeMuted]}
              onPress={() => {
                if (canEdit) {
                  setSheetMode('priority');
                  setSheetVisible(true);
                }
              }}
            >
              <Flag color={priorityColor(bucket.priority)} size={13} strokeWidth={2} style={{ marginRight: 4 }} />
              <Typography variant="caption" color={priorityColor(bucket.priority)} style={{ fontWeight: '600' }}>
                {priorityLabel(bucket.priority)}
              </Typography>
            </Pressable>

            {/* Visibility */}
            <Pressable
              style={[styles.badge, styles.badgeMuted]}
              onPress={() => {
                if (canEdit) {
                  setSheetMode('visibility');
                  setSheetVisible(true);
                }
              }}
            >
              <Typography variant="caption" color={theme.colors.foreground} style={{ fontWeight: '600' }}>
                {visibilityLabel(bucket.visibility)}
              </Typography>
            </Pressable>

            {/* Album */}
            <Pressable
              style={[styles.badge, styles.badgeMuted]}
              onPress={() => {
                if (canEdit) {
                  setSheetVisible(true);
                  void loadAlbums();
                }
              }}
            >
              <FolderOpen color={theme.colors.foregroundMuted} size={13} strokeWidth={1.8} style={{ marginRight: 4 }} />
              <Typography variant="caption" color={theme.colors.foreground} style={{ fontWeight: '600' }}>
                {bucketAlbums && bucketAlbums.length > 0
                  ? (bucketAlbums.length === 1
                    ? (albumsData?.find((a: any) => a.id === bucketAlbums[0]?.album_id)?.title || 'Sin álbum')
                    : `${bucketAlbums.length} álbumes`)
                  : 'Sin álbum'}
              </Typography>
            </Pressable>
          </View>

          {/* Title */}
          {canEdit ? (
            <TextInput
              style={[styles.title, { color: theme.colors.foreground, padding: 0 }]}
              defaultValue={bucket.title}
              onChangeText={handleTitleChange}
              multiline
            />
          ) : (
            <Typography variant="h1" color={theme.colors.foreground} style={styles.title}>
              {bucket.title}
            </Typography>
          )}

          {/* Etiquetas */}
          <ItemTagsRow bucketId={id as string} isOwner={canEdit} />

          {/* Colaboradores */}
          <BucketCollaboratorsRow
            bucket={bucket}
            collaborators={collaborators}
            participantsData={participantsData}
            user={user}
            canEdit={canEdit}
            onOpenPicker={() => setShowCollaboratorPicker(true)}
          />

          {/* Meta */}
          <BucketMetaSection
            bucket={bucket}
            canEdit={canEdit}
            theme={theme}
            onOpenLocationModal={() => setLocationModalVisible(true)}
            onRemoveLocation={() => void handleRemoveLocation()}
            onOpenDatePicker={(config) => setDatePickerConfig(config)}
            onRemoveCompletedAt={() => void handleRemoveCompletedAt()}
            onRemoveDeadline={() => void handleRemoveDeadline()}
          />

          {/* Description */}
          {canEdit ? (
            <TextInput
              style={[styles.description, { color: theme.colors.foregroundMuted, padding: 0 }]}
              defaultValue={bucket.description || ''}
              onChangeText={handleDescriptionChange}
              placeholder="Añadir descripción..."
              placeholderTextColor={theme.colors.foregroundMuted}
              multiline
            />
          ) : bucket.description ? (
            <Typography variant="body" color={theme.colors.foregroundMuted} style={styles.description}>
              {bucket.description}
            </Typography>
          ) : null}

          {/* Menciones (debajo de la descripción) */}
          {((mentionsData?.length ?? 0) > 0 || canEdit) && (
            <View style={{ marginBottom: 20 }}>
              {(mentionsData?.length ?? 0) > 0 ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="caption" color={gold[400]} style={styles.subtasksLabel}>
                      MENCIONES · {mentionsData?.length}
                    </Typography>
                    {canEdit && (
                      <Pressable onPress={() => setShowMentionPicker(true)} hitSlop={10}>
                        <Typography variant="caption" color={gold[400]} style={{ fontWeight: '600' }}>
                          Editar
                        </Typography>
                      </Pressable>
                    )}
                  </View>
                  <View style={{ marginTop: 8 }}>
                    <TaskMentionList
                      mentions={mentionsData ?? []}
                      isOwner={canEdit}
                      theme={theme}
                      onPress={(task) => router.push(`/bucket/${task.id}` as any)}
                      onDelete={(mentionId, title) => removeMention(mentionId, title)}
                      onMove={(from, to) => void handleMoveMention(from, to)}
                      onDraggingChange={(dragging) => setScrollEnabled(!dragging)}
                    />
                  </View>
                </>
              ) : (
                <Pressable
                  onPress={() => setShowMentionPicker(true)}
                  hitSlop={8}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' }}
                >
                  <Link2 color={gold[400]} size={16} strokeWidth={1.8} />
                  <Typography variant="body" color={gold[400]}>
                    + Mencionar tarea
                  </Typography>
                </Pressable>
              )}
            </View>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <Pressable
              style={styles.statItem}
              onPress={() => user && toggleReaction.mutate({ bucketId: id, userId: user.id, emoji: '❤️' })}
            >
              <Heart
                color={myReaction ? '#f97316' : theme.colors.foregroundMuted}
                fill={myReaction ? '#f97316' : 'transparent'}
                size={18}
                strokeWidth={1.8}
              />
              <Typography variant="body" color={theme.colors.foregroundMuted} style={{ marginLeft: 6 }}>
                {totalReactions}
              </Typography>
            </Pressable>
            <View style={[styles.statItem, { marginLeft: 24 }]}>
              <MessageCircle color={theme.colors.foregroundMuted} size={18} strokeWidth={1.8} />
              <Typography variant="body" color={theme.colors.foregroundMuted} style={{ marginLeft: 6 }}>
                {comments.length} {comments.length === 1 ? 'comentario' : 'comentarios'}
              </Typography>
            </View>
          </View>

          {/* Contador */}
          <BucketCounterSection
            bucket={bucket}
            canEdit={canEdit}
            theme={theme}
            removeCounter={removeCounter}
            handleCounterLabelChange={handleCounterLabelChange}
            handleCounterCountChange={handleCounterCountChange}
            changeCounter={changeCounter}
            handleCounterTargetChange={handleCounterTargetChange}
            updateCounter={updateCounter}
          />

          {/* Subtasks */}
          {(subtasks.length > 0 || canEdit) && (
            <View style={styles.subtasksSection}>
              <View style={styles.subtasksHeader}>
                <Typography variant="caption" color={gold[400]} style={styles.subtasksLabel}>
                  PASOS · {subtasksDone} DE {subtasks.length}
                </Typography>
              </View>
              {subtasks.length > 0 && (
                <View style={{ marginTop: 10, marginBottom: 8 }}>
                  <ProgressBar value={subtasksDone} total={subtasks.length} color={gold[400]} track={dark[400]} />
                </View>
              )}
              <SubtaskList
                subtasks={subtasks}
                isOwner={canEdit}
                theme={theme}
                onToggle={(subtask) => void toggleSubtask(subtask)}
                onChange={handleSubtaskChange}
                onDelete={handleDeleteSubtask}
                onMove={(from, to) => void handleMoveSubtask(from, to)}
                onDraggingChange={(dragging) => setScrollEnabled(!dragging)}
              />

              {/* Añadir paso */}
              {canEdit && (
                <View style={[styles.subtaskRow, { opacity: 0.7 }]}>
                  <Pressable onPress={handleAddSubtask}>
                    <Plus color={theme.colors.foregroundMuted} size={22} strokeWidth={1.8} />
                  </Pressable>
                  <TextInput
                    placeholder="Añadir paso..."
                    placeholderTextColor={theme.colors.foregroundMuted}
                    style={[styles.subtaskText, { flex: 1, padding: 0, color: theme.colors.foreground }]}
                    value={newSubtaskText}
                    onChangeText={setNewSubtaskText}
                    onSubmitEditing={handleAddSubtask}
                  />
                </View>
              )}
            </View>
          )}

          {/* ── Imagen de la tarea ─────────────────────────────────────────── */}
          {showThumbnailPicker && (
            <BucketThumbnailSelector
              bucket={bucket}
              hasCover={hasCover}
              thumbSelection={thumbSelection}
              chosenPhotoId={chosenPhotoId}
              thumbPhotos={thumbPhotos}
              theme={theme}
              onChooseThumbnail={(mode, photoId) => void chooseThumbnail(mode, photoId)}
            />
          )}

          {/* ── Fotos ──────────────────────────────────────────────────────── */}
          <BucketPhotosSection
            bucket={bucket}
            photos={photos}
            canEdit={canEdit}
            theme={theme}
            photoSortField={photoSortField}
            photoSortDir={photoSortDir}
            sortTriggerRef={sortTriggerRef}
            openSortMenu={openSortMenu}
            photoSearchQuery={photoSearchQuery}
            setPhotoSearchQuery={setPhotoSearchQuery}
            setScrollEnabled={setScrollEnabled}
            persistPhotoOrder={(ids) => void persistPhotoOrder(ids)}
            setViewingPhotoIndex={setViewingPhotoIndex}
            pickAndUploadPhotos={() => void pickAndUploadPhotos()}
          />
        </View>
      </ScrollView>

      {/* ── Editor de foto (recortar / girar) ───────────────────────────── */}
      <PhotoCropModal
        visible={!!cropRequest}
        uri={cropRequest?.uri ?? null}
        width={cropRequest?.width ?? 0}
        height={cropRequest?.height ?? 0}
        index={cropRequest?.index ?? 0}
        total={cropRequest?.total ?? 1}
        onCancel={() => finishPhotoEdit(null)}
        onDone={(uri) => finishPhotoEdit(uri)}
      />

      {/* ── Fullscreen photo viewer ─────────────────────────────────────── */}
      <BucketPhotoViewer
        photos={photos}
        viewingPhotoIndex={viewingPhotoIndex}
        setViewingPhotoIndex={setViewingPhotoIndex}
        isOwner={canEdit}
        onDelete={confirmDeletePhoto}
        onUpdateTitle={(photoId, title) => {
          queryClient.setQueryData(['bucketDetail', id], (oldData: any) => {
            if (!oldData) return oldData;
            return {
              ...oldData,
              bucket_photos: (oldData.bucket_photos || []).map((p: any) => p.id === photoId ? { ...p, title } : p),
            };
          });
          void supabase.from('bucket_photos').update({ title: title.trim() || null }).eq('id', photoId).then(({ error }) => {
            if (error) console.error('Failed to update photo title:', error);
          });
        }}
      />

      {/* ── Bottom action bar ─────────────────────────────────────────────── */}
      {canEdit && (
        <View style={[styles.actionBar, { borderTopColor: dark[400], backgroundColor: theme.colors.background }]}>
          <Pressable
            style={[styles.actionBtn, styles.actionBtnFilled, { backgroundColor: bucket.status === 'completed' ? dark[300] : gold[400] }]}
            onPress={() => void handleChangeStatus(bucket.status === 'completed' ? 'pending' : 'completed')}
          >
            {bucket.status === 'completed' ? (
              <X color="#fff" size={18} strokeWidth={2} />
            ) : (
              <CheckCircle2 color="#000" size={18} strokeWidth={2} />
            )}
            <Typography variant="bodySemibold" color={bucket.status === 'completed' ? '#fff' : '#000'} style={{ marginLeft: 8 }}>
              {bucket.status === 'completed' ? 'Marcar como pendiente' : 'Marcar como completado'}
            </Typography>
          </Pressable>
        </View>
      )}

      <BucketBottomSheet
        sheetVisible={sheetVisible}
        sheetMode={sheetMode}
        sheetTranslateY={sheetTranslateY}
        closeSheet={closeSheet}
        theme={theme}
        isOwner={isOwner}
        canEdit={canEdit}
        isCollaborator={isCollaborator}
        isFavorite={isFav}
        onToggleFavorite={() => {
          toggleFavorite.mutate({ bucketId: id, currentlyFavorite: isFav });
        }}
        onLeaveCollaboration={handleLeaveCollaboration}
        uploadPhotos={uploadPhotos}
        uploadCover={uploadCover}
        loadAlbums={loadAlbums}
        user={user}
        copyBucket={copyBucket}
        id={id}
        handleDelete={handleDelete}
        bucket={bucket}
        handleChangeStatus={handleChangeStatus}
        handleChangeVisibility={handleChangeVisibility}
        setSheetMode={setSheetMode}
        albumsLoading={albumsLoading}
        toggleAlbum={toggleAlbum}
        removeAllAlbums={removeAllAlbums}
        albums={albumsData ?? []}
        bucketAlbums={bucketAlbums ?? []}
        categories={categories}
        handleChangeCategory={handleChangeCategory}
        handleChangePriority={handleChangePriority}
      />

      {/* Sort Menu Modal */}
      <PhotoSortModal
        visible={photoSortMenuOpen}
        canEdit={canEdit}
        photoSortField={photoSortField}
        photoSortDir={photoSortDir}
        sortMenuPos={sortMenuPos}
        theme={theme}
        onClose={() => setPhotoSortMenuOpen(false)}
        onSelectSort={handleSortOption}
      />

      {/* Location Picker Modal */}
      <BucketLocationModal
        visible={locationModalVisible}
        locationText={bucket.location_text}
        theme={theme}
        onClose={() => setLocationModalVisible(false)}
        onSaveLocation={handleSaveLocation}
        onRemoveLocation={handleRemoveLocation}
      />

      {/* Date Picker Modal */}
      <BucketDatePickerModal
        config={datePickerConfig}
        onClose={() => setDatePickerConfig(null)}
        onChangeDate={async (date, type) => {
          setDatePickerConfig(null);
          const patch: Record<string, any> = { [type]: date.toISOString() };
          if (type === 'completed_at' && bucket.status !== 'completed') {
            patch.status = 'completed';
          }
          queryClient.setQueryData(['bucketDetail', id], (oldData: any) => oldData ? { ...oldData, ...patch } : oldData);
          await supabase.from('buckets').update(patch).eq('id', id);
          void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
          void queryClient.invalidateQueries({ queryKey: ['buckets'] });
          void queryClient.invalidateQueries({ queryKey: ['calendar_month'] });
        }}
      />

      <TaskMentionPickerSheet
        visible={showMentionPicker}
        currentBucketId={id}
        mentionedIds={(mentionsData ?? []).map((m) => m.task.id)}
        onToggle={toggleMention}
        onClose={() => setShowMentionPicker(false)}
      />

      <CollaboratorPickerSheet
        visible={showCollaboratorPicker}
        selected={[
          // Owner entry (always shown, unless the current user IS the owner)
          ...(bucket.user_id !== user?.id ? [{
            id: bucket.user_id,
            username: bucket.user?.username || '',
            display_name: bucket.user?.display_name || null,
            avatar_url: bucket.user?.avatar_url || null,
            status: 'accepted' as const,
          }] : []),
          // Miembros de álbumes compartidos que contienen la tarea (no se pueden quitar desde aquí)
          ...participantsData.filter((p: any) => p.id !== user?.id && p.id !== bucket.user_id),
          // Otros colaboradores directos, salvo el usuario actual y los ya incluidos arriba
          ...collaborators.filter(
            (c: any) =>
              c.id !== user?.id &&
              c.status === 'accepted' &&
              !participantsData.some((p: any) => p.id === c.id),
          ),
        ]}
        onChange={(collabs) => void handleCollaboratorsChange(collabs)}
        onClose={() => setShowCollaboratorPicker(false)}
        readOnlyIds={[
          ...(bucket.user_id ? [bucket.user_id] : []),
          ...participantsData.filter((p: any) => p.id !== user?.id).map((p: any) => p.id),
        ]}
      />
    </View>
  );
}

