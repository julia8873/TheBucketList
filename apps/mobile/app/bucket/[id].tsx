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
import { TaskMentionPickerSheet, MentionThumb, MENTION_TASK_COLUMNS, type MentionTask } from '../../src/components/TaskMentionPickerSheet';
import { BucketBottomSheet } from '../../src/components/BucketBottomSheet';
import { LocationAutocomplete } from '../../src/components/LocationAutocomplete';
import { styles } from './BucketDetail.styles';
import { ItemTagsRow } from '../../src/components/ItemTagsRow';
import { CollaboratorPickerSheet, type CollaboratorItem } from '../../src/components/CollaboratorPickerSheet';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 220;
const BADGES_OVERLAP = 32;
// Cuánto se meten las etiquetas sobre la portada.

function ProgressBar({ value, total, color, track }: { value: number; total: number; color: string; track: string }) {
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: track, overflow: 'hidden' }}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

/** Miniatura seleccionable de la sección "Imagen de la tarea". */
function ThumbOption({
  label,
  selected,
  onPress,
  children,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Imagen de la tarea: ${label}`}
      style={{ width: 72, alignItems: 'center', gap: 6 }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 12,
          overflow: 'hidden',
          borderWidth: 2,
          borderColor: selected ? gold[400] : 'transparent',
          backgroundColor: dark[300],
        }}
      >
        {children}
        {selected && (
          <View
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: gold[400],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={12} color="#0D0D0D" strokeWidth={3} />
          </View>
        )}
      </View>
      <Text
        numberOfLines={1}
        style={{ fontSize: 11, color: selected ? gold[400] : '#9A9A9A' }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

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
      return ((data ?? []) as any[])
        .map((row) => {
          const other = row.bucket_a === id ? row.b : row.a;
          return other ? { mentionId: row.id as string, task: other as MentionTask } : null;
        })
        .filter(Boolean) as { mentionId: string; task: MentionTask }[];
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
      // Only the owner can remove collaborators
      const toRemoveIds = isOwner
        ? collaborators.filter((c: any) => !newIds.has(c.id) && !lockedIds.has(c.id)).map((c: any) => c.id)
        : [];

      // Optimistic update: preserve existing status if already set
      const existingStatusMap = new Map<string, string>(collaborators.map((c: any) => [c.id, c.status]));
      // Merge: if not owner, keep existing collabs + add new ones
      const mergedCollabs = isOwner
        ? newCollabs.map(c => ({ ...c, status: existingStatusMap.get(c.id) || 'pending' }))
        : [
            ...collaborators,
            ...toAdd.map(c => ({ ...c, status: 'pending' })),
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
    // Refresca esta tarea y la mencionada (la otra pantalla puede estar abierta en la pila).
    void queryClient.invalidateQueries({ queryKey: ['bucketMentions'] });
  };

  const deleteMention = async (mentionId: string) => {
    const previous = queryClient.getQueryData(['bucketMentions', id]);
    queryClient.setQueryData(['bucketMentions', id], (old: any) =>
      (old ?? []).filter((m: any) => m.mentionId !== mentionId),
    );
    const { data, error } = await supabase.from('bucket_mentions').delete().eq('id', mentionId).select('id');
    if (error || !data || data.length === 0) {
      queryClient.setQueryData(['bucketMentions', id], previous);
      Alert.alert('No se pudo quitar la mención', error?.message || 'No tienes permiso para quitarla.');
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ['bucketMentions'] });
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
          {/* Bottom gradient fade */}
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
          {(() => {
            // Always show the bucket owner first, then accepted collaborators,
            // then pending ones (owner or the pending user themselves can see them)
            const ownerEntry = {
              id: bucket.user_id,
              username: bucket.user?.username || '',
              display_name: bucket.user?.display_name || null,
              avatar_url: bucket.user?.avatar_url || null,
              status: 'accepted',
              isOwner: true,
            };

            const visibleCollaborators = collaborators.filter((c: any) => {
              if (c.status === 'accepted') return true;
              if (c.status === 'pending') return canEdit || c.id === user?.id;
              return false;
            });

            // Lista completa de participantes: dueño de la tarea, miembros de los álbumes
            // compartidos que la contienen (aceptados) y colaboradores directos. Sin duplicados
            // (el primero gana, así un miembro aceptado no se queda como «Pendiente»).
            // Incluye al usuario actual, pero solo cuando la tarea es realmente compartida.
            const ownerId = bucket.user_id;
            const byId = new Map<string, any>();
            [
              ownerEntry,
              ...participantsData.filter((p: any) => p.id !== ownerId),
              ...visibleCollaborators.filter((c: any) => c.id !== ownerId),
            ].forEach((c: any) => {
              if (!byId.has(c.id)) byId.set(c.id, c);
            });
            const everyone = Array.from(byId.values());
            const participants = everyone.some((c: any) => c.id !== user?.id) ? everyone : [];

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
                      accessibilityLabel="Añadir colaborador"
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

          {/* Meta */}
          <View style={styles.meta}>
            {/* Ubicación */}
            {bucket.location_text ? (
              <View style={styles.metaRowBetween}>
                <Pressable
                  style={styles.metaRowClickable}
                  onPress={() => canEdit && setLocationModalVisible(true)}
                  disabled={!canEdit}
                >
                  <MapPin color={gold[400]} size={16} strokeWidth={1.8} />
                  <Typography variant="body" color={theme.colors.foregroundMuted} style={styles.metaText} numberOfLines={1}>
                    {bucket.location_text}
                  </Typography>
                </Pressable>
                {canEdit && (
                  <Pressable
                    onPress={() => void handleRemoveLocation()}
                    hitSlop={8}
                    style={styles.metaRemoveBtn}
                  >
                    <X color={theme.colors.foregroundMuted} size={14} />
                  </Pressable>
                )}
              </View>
            ) : canEdit ? (
              <Pressable
                style={styles.metaRowClickable}
                onPress={() => setLocationModalVisible(true)}
              >
                <MapPin color={gold[400]} size={16} strokeWidth={1.8} />
                <Typography variant="body" color={gold[400]} style={styles.metaText}>
                  + Añadir ubicación
                </Typography>
              </Pressable>
            ) : null}

            {/* Fecha completada */}
            {bucket.completed_at || bucket.status === 'completed' ? (
              <View style={styles.metaRowBetween}>
                <Pressable
                  style={styles.metaRowClickable}
                  onPress={() =>
                    canEdit &&
                    setDatePickerConfig({
                      visible: true,
                      type: 'completed_at',
                      date: new Date(bucket.completed_at || bucket.updated_at || new Date()),
                    })
                  }
                  disabled={!canEdit}
                >
                  <CheckCircle2 color={gold[400]} size={16} strokeWidth={1.8} />
                  <Typography variant="body" color={theme.colors.foregroundMuted} style={styles.metaText}>
                    Completada el {format(new Date(bucket.completed_at || bucket.updated_at || new Date()), "d 'de' MMMM 'de' yyyy", { locale: es })}
                  </Typography>
                </Pressable>
                {canEdit && (
                  <Pressable
                    onPress={() => void handleRemoveCompletedAt()}
                    hitSlop={8}
                    style={styles.metaRemoveBtn}
                  >
                    <X color={theme.colors.foregroundMuted} size={14} />
                  </Pressable>
                )}
              </View>
            ) : canEdit ? (
              <Pressable
                style={styles.metaRowClickable}
                onPress={() =>
                  setDatePickerConfig({
                    visible: true,
                    type: 'completed_at',
                    date: new Date(),
                  })
                }
              >
                <CheckCircle2 color={gold[400]} size={16} strokeWidth={1.8} />
                <Typography variant="body" color={gold[400]} style={styles.metaText}>
                  + Añadir fecha de completado
                </Typography>
              </Pressable>
            ) : null}

            {/* Fecha límite */}
            {bucket.deadline ? (
              <View style={styles.metaRowBetween}>
                <Pressable
                  style={styles.metaRowClickable}
                  onPress={() =>
                    canEdit &&
                    setDatePickerConfig({
                      visible: true,
                      type: 'deadline',
                      date: new Date(bucket.deadline!),
                    })
                  }
                  disabled={!canEdit}
                >
                  <Calendar color={gold[400]} size={16} strokeWidth={1.8} />
                  <Typography variant="body" color={theme.colors.foregroundMuted} style={styles.metaText}>
                    {bucket.status === 'completed'
                      ? `Programada para el ${format(new Date(bucket.deadline), "d 'de' MMMM 'de' yyyy", { locale: es })}`
                      : `Vence el ${format(new Date(bucket.deadline), "d 'de' MMMM 'de' yyyy", { locale: es })}`
                    }
                  </Typography>
                </Pressable>
                {canEdit && (
                  <Pressable
                    onPress={() => void handleRemoveDeadline()}
                    hitSlop={8}
                    style={styles.metaRemoveBtn}
                  >
                    <X color={theme.colors.foregroundMuted} size={14} />
                  </Pressable>
                )}
              </View>
            ) : canEdit ? (
              <Pressable
                style={styles.metaRowClickable}
                onPress={() =>
                  setDatePickerConfig({
                    visible: true,
                    type: 'deadline',
                    date: new Date(),
                  })
                }
              >
                <Calendar color={gold[400]} size={16} strokeWidth={1.8} />
                <Typography variant="body" color={gold[400]} style={styles.metaText}>
                  + Añadir fecha límite
                </Typography>
              </Pressable>
            ) : null}
          </View>

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
                  {(mentionsData ?? []).map((m) => (
                    <Pressable
                      key={m.mentionId}
                      onPress={() => router.push(`/bucket/${m.task.id}` as any)}
                      onLongPress={canEdit ? () => removeMention(m.mentionId, m.task.title) : undefined}
                      style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                        paddingVertical: 8,
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <MentionThumb task={m.task} size={44} />
                      <Typography
                        variant="bodySemibold"
                        numberOfLines={2}
                        color={m.task.status === 'completed' ? theme.colors.foregroundMuted : theme.colors.foreground}
                        style={{ flex: 1 }}
                      >
                        {m.task.title}
                      </Typography>
                    </Pressable>
                  ))}
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

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: dark[400] }]} />

          {/* Contador */}
          {(bucket.counter_enabled || canEdit) && (
            <View style={{ marginBottom: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 }}>
                <Typography variant="caption" color={gold[400]} style={styles.subtasksLabel}>
                  CONTADOR
                </Typography>
                {bucket.counter_enabled && canEdit && (
                  <Pressable
                    onPress={removeCounter}
                    hitSlop={8}
                    accessibilityLabel="Quitar contador"
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      height: 28,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: 'rgba(248,113,113,0.45)',
                      backgroundColor: pressed ? 'rgba(248,113,113,0.22)' : 'rgba(248,113,113,0.10)',
                    })}
                  >
                    <Trash2 color="#F87171" size={13} strokeWidth={2.2} />
                    <Typography variant="caption" color="#F87171" style={{ fontWeight: '600' }}>
                      Quitar
                    </Typography>
                  </Pressable>
                )}
              </View>

              {bucket.counter_enabled ? (
                <>
                  <View
                    style={{
                      marginTop: 12,
                      padding: 16,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: dark[400],
                      backgroundColor: dark[300],
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      {canEdit ? (
                        <TextInput
                          defaultValue={bucket.counter_label || ''}
                          onChangeText={handleCounterLabelChange}
                          placeholder="¿Qué cuentas?"
                          placeholderTextColor={theme.colors.foregroundMuted}
                          style={{ padding: 0, color: theme.colors.foregroundMuted, marginBottom: 4 }}
                        />
                      ) : bucket.counter_label ? (
                        <Typography variant="body" color={theme.colors.foregroundMuted} style={{ marginBottom: 4 }}>
                          {bucket.counter_label}
                        </Typography>
                      ) : null}

                      {canEdit ? (
                        <TextInput
                          defaultValue={String(bucket.counter_count ?? 0)}
                          onChangeText={(text) => {
                            const n = parseInt(text.replace(/[^0-9]/g, ''), 10);
                            if (!Number.isNaN(n)) {
                              handleCounterCountChange(n);
                            }
                          }}
                          keyboardType="number-pad"
                          style={{
                            padding: 0,
                            color: theme.colors.foreground,
                            fontFamily: 'PlayfairDisplay_700Bold', // H1 equivalent
                            fontSize: 32,
                            lineHeight: 38,
                          }}
                        />
                      ) : (
                        <Typography variant="h1" color={theme.colors.foreground}>
                          {bucket.counter_count ?? 0}
                        </Typography>
                      )}
                    </View>

                    {canEdit && (
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Pressable
                          onPress={() => changeCounter(-1)}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: dark[400],
                          }}
                        >
                          <Minus color={theme.colors.foregroundMuted} size={20} strokeWidth={2} />
                        </Pressable>
                        <Pressable
                          onPress={() => changeCounter(1)}
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 22,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: gold[400],
                          }}
                        >
                          <Plus color="#000" size={20} strokeWidth={2.4} />
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {/* Barra y objetivo (independiente de la barra de pasos) */}
                  {(bucket.counter_target || canEdit) && (
                    <View style={{ marginTop: 16 }}>
                      {bucket.counter_target ? (
                        <ProgressBar
                          value={bucket.counter_count ?? 0}
                          total={bucket.counter_target}
                          color={gold[400]}
                          track={dark[400]}
                        />
                      ) : null}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                        <Typography variant="bodySemibold" color={theme.colors.foregroundMuted}>
                          {bucket.counter_target ? `${bucket.counter_count ?? 0} de ${bucket.counter_target}` : 'Sin objetivo'}
                        </Typography>
                        {canEdit && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Typography variant="body" color={theme.colors.foreground}>Objetivo</Typography>
                            <TextInput
                              defaultValue={bucket.counter_target ? String(bucket.counter_target) : ''}
                              onChangeText={handleCounterTargetChange}
                              keyboardType="number-pad"
                              placeholder="0"
                              placeholderTextColor={theme.colors.foregroundMuted}
                              style={{
                                minWidth: 56,
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                borderRadius: 10,
                                borderWidth: 1,
                                borderColor: gold[400],
                                backgroundColor: dark[400],
                                textAlign: 'center',
                                color: gold[400],
                                fontWeight: 'bold',
                              }}
                            />
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                </>
              ) : (
                canEdit ? (
                  <Pressable
                    onPress={() => void updateCounter({ counter_enabled: true, counter_count: 0 })}
                    style={({ pressed }) => ({
                      marginTop: 12,
                      padding: 14,
                      borderRadius: 18,
                      borderWidth: 1,
                      borderColor: 'rgba(212,168,46,0.35)',
                      backgroundColor: pressed ? 'rgba(212,168,46,0.14)' : 'rgba(212,168,46,0.06)',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 14,
                    })}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: gold[400],
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Plus color="#000" size={22} strokeWidth={2.4} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Typography variant="bodySemibold" color={gold[400]}>
                        Añadir contador
                      </Typography>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>
                        Cuenta repeticiones, kilómetros, libros…
                      </Typography>
                    </View>
                  </Pressable>
                ) : null
              )}
            </View>
          )}

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
            <>
              <View style={[styles.divider, { backgroundColor: dark[400], marginTop: 20 }]} />
              <View style={styles.photosSection}>
                <Typography variant="caption" color={gold[400]} style={styles.subtasksLabel}>
                  IMAGEN DE LA TAREA
                </Typography>
                <Typography variant="caption" color={theme.colors.foregroundMuted} style={{ marginTop: 4, marginBottom: 12 }}>
                  Es la que verán los demás en el feed y en explorar.
                </Typography>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingRight: 8 }}
                >
                  <ThumbOption
                    label="Automática"
                    selected={thumbSelection === 'auto'}
                    onPress={() => void chooseThumbnail('auto')}
                  >
                    <BucketCover
                      value={resolveTaskImage({ ...bucket, thumbnail_mode: 'auto' }, { preferThumb: true })}
                      title={bucket.title}
                      categorySlug={bucket.category?.slug}
                      seed={bucket.id}
                      iconSize={64}
                      style={StyleSheet.absoluteFill}
                    />
                  </ThumbOption>
                  {hasCover && (
                    <ThumbOption
                      label="Portada"
                      selected={thumbSelection === 'cover'}
                      onPress={() => void chooseThumbnail('cover')}
                    >
                      <BucketCover
                        value={bucket.cover_image}
                        title={bucket.title}
                        categorySlug={bucket.category?.slug}
                        seed={bucket.id}
                        iconSize={64}
                        style={StyleSheet.absoluteFill}
                      />
                    </ThumbOption>
                  )}
                  {thumbPhotos.map((photo: any, index: number) => (
                    <ThumbOption
                      key={photo.id}
                      label={`Foto ${thumbPhotos.length - index}`}
                      selected={thumbSelection === 'photo' && chosenPhotoId === photo.id}
                      onPress={() => void chooseThumbnail('photo', photo.id)}
                    >
                      <Image
                        source={{ uri: storageApi.getPublicUrl(photo.thumb_path || photo.storage_path) }}
                        style={StyleSheet.absoluteFill}
                        resizeMode="cover"
                      />
                    </ThumbOption>
                  ))}
                </ScrollView>
              </View>
            </>
          )}

          {/* ── Fotos ──────────────────────────────────────────────────────── */}
          {(bucket.bucket_photos?.length > 0 || canEdit) && (
            <>
              <View style={[styles.divider, { backgroundColor: dark[400], marginTop: 20 }]} />
              <View style={styles.photosSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Typography variant="caption" color={gold[400]} style={styles.subtasksLabel}>
                    FOTOS{bucket.bucket_photos?.length > 0 ? ` · ${bucket.bucket_photos?.length}` : ''}
                  </Typography>
                  {bucket.bucket_photos?.length > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>
                        Ordenar por:
                      </Typography>
                      <Pressable
                        ref={sortTriggerRef}
                        collapsable={false}
                        onPress={openSortMenu}
                        hitSlop={8}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                      >
                        <Typography variant="caption" color={gold[400]}>
                          {photoSortField === 'date' ? 'Fecha' : photoSortField === 'title' ? 'Nombre' : 'Manual'}
                        </Typography>
                        {photoSortField === 'manual' ? null : photoSortDir === 'desc' ? (
                          <ArrowDown color={gold[400]} size={14} />
                        ) : (
                          <ArrowUp color={gold[400]} size={14} />
                        )}
                      </Pressable>
                    </View>
                  )}
                </View>



                {bucket.bucket_photos?.length > 0 && (
                  <TextInput
                    placeholder="Buscar foto..."
                    placeholderTextColor="rgba(255,255,255,0.5)"
                    value={photoSearchQuery}
                    onChangeText={setPhotoSearchQuery}
                    style={{
                      backgroundColor: dark[400],
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      color: '#FFF',
                      marginBottom: 16,
                    }}
                  />
                )}

                {photoSortField === 'manual' && canEdit && photos.length > 1 && !photoSearchQuery.trim() ? (
                  <>
                    <Typography variant="caption" color={theme.colors.foregroundMuted} style={{ marginBottom: 10 }}>
                      Arrastra el asa ⠿ para cambiar el orden de las fotos.
                    </Typography>
                    <DraggableTaskList
                      items={photos}
                      onReorder={(ids) => void persistPhotoOrder(ids)}
                      onDraggingChange={(dragging) => setScrollEnabled(!dragging)}
                      renderItem={(photo, drag) => (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            height: 72,
                            padding: 8,
                            borderRadius: 14,
                            backgroundColor: dark[300],
                            borderWidth: 1,
                            borderColor: drag.isActive ? gold[400] : dark[400],
                            gap: 12,
                          }}
                        >
                          <Pressable
                            onPress={() => setViewingPhotoIndex(photos.findIndex((p: any) => p.id === photo.id))}
                            style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', backgroundColor: dark[400] }}
                          >
                            <Image
                              source={{ uri: storageApi.getPublicUrl(photo.thumb_path || photo.storage_path) }}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="cover"
                            />
                          </Pressable>
                          <View style={{ flex: 1 }}>
                            <Typography variant="bodySemibold" color="#fff" numberOfLines={1}>
                              {photo.title || 'Sin título'}
                            </Typography>
                            <Typography variant="caption" color={theme.colors.foregroundMuted}>
                              {photo.created_at ? new Date(photo.created_at).toLocaleDateString() : ''}
                            </Typography>
                          </View>
                          <View
                            {...drag.panHandlers}
                            hitSlop={10}
                            style={{ width: 44, height: 56, alignItems: 'center', justifyContent: 'center' }}
                          >
                            <GripVertical color={gold[400]} size={22} strokeWidth={2} />
                          </View>
                        </View>
                      )}
                    />
                    <View style={{ height: 14 }} />
                    <Pressable
                      style={[styles.photoAddThumb, { width: '100%', height: 64, flexDirection: 'row' }]}
                      onPress={() => void pickAndUploadPhotos()}
                    >
                      <Camera color={gold[400]} size={22} strokeWidth={1.8} />
                      <Typography variant="bodySemibold" color={gold[400]} style={{ marginLeft: 10 }}>
                        Añadir foto
                      </Typography>
                    </Pressable>
                  </>
                ) : (
                <View style={styles.photosGrid}>
                  {photos.map((photo, index) => (
                    <Pressable
                      key={photo.id}
                      onPress={() => setViewingPhotoIndex(index)}
                      style={[
                        styles.photoThumb,
                        photos.length === 1 && { width: '100%', height: (SCREEN_WIDTH - 40) * 1.25, marginBottom: 40 }
                      ]}
                    >
                      <Image
                        source={{ uri: storageApi.getPublicUrl(photo.storage_path) }}
                        style={styles.photoThumbImage}
                        resizeMode="cover"
                      />
                      <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 6 }}>
                        <Typography variant="caption" color="#fff" numberOfLines={1}>
                          {photo.title || 'Sin título'}
                        </Typography>
                        <Typography variant="caption" color="rgba(255,255,255,0.7)">
                          {photo.created_at ? new Date(photo.created_at).toLocaleDateString() : ''}
                        </Typography>
                      </View>
                    </Pressable>
                  ))}
                  {canEdit && (
                    <Pressable
                      style={[
                        styles.photoAddThumb,
                        photos.length === 0 && { width: '100%', height: 72, flexDirection: 'row' }
                      ]}
                      onPress={() => void pickAndUploadPhotos()}
                    >
                      <Camera color={gold[400]} size={24} strokeWidth={1.8} />
                      {photos.length === 0 && (
                        <Typography variant="bodySemibold" color={gold[400]} style={{ marginLeft: 10 }}>
                          Añadir foto
                        </Typography>
                      )}
                    </Pressable>
                  )}
                </View>
                )}
              </View>
            </>
          )}
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
      <Modal
        visible={photoSortMenuOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPhotoSortMenuOpen(false)}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setPhotoSortMenuOpen(false)}
        >
          <View
            style={{
              position: 'absolute',
              top: sortMenuPos.top,
              right: sortMenuPos.right,
              minWidth: 130,
              backgroundColor: dark[400],
              borderRadius: 12,
              overflow: 'hidden',
              elevation: 8,
              shadowColor: '#000',
              shadowOpacity: 0.3,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 4 },
            }}
          >
            {([
              { field: 'date', label: 'Fecha' },
              { field: 'title', label: 'Nombre' },
              ...(canEdit ? [{ field: 'manual', label: 'Manual' } as const] : []),
            ] as const).map((option, i) => {
              const selected = photoSortField === option.field;
              return (
                <Pressable
                  key={option.field}
                  onPress={() => handleSortOption(option.field)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 11,
                    borderTopWidth: i === 0 ? 0 : StyleSheet.hairlineWidth,
                    borderTopColor: 'rgba(255,255,255,0.1)',
                  }}
                >
                  <Typography
                    variant={selected ? 'bodySemibold' : 'body'}
                    color={selected ? gold[400] : theme.colors.foreground}
                  >
                    {option.label}
                  </Typography>
                  {selected && option.field !== 'manual' &&
                    (photoSortDir === 'desc' ? (
                      <ArrowDown color={gold[400]} size={16} />
                    ) : (
                      <ArrowUp color={gold[400]} size={16} />
                    ))}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* Location Picker Modal */}
      <Modal
        visible={locationModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.7)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 20,
            }}
            onPress={() => setLocationModalVisible(false)}
          >
            <Pressable
              style={{
                width: '100%',
                maxWidth: 420,
                backgroundColor: '#161616',
                borderRadius: 20,
                borderWidth: 1,
                borderColor: dark[400],
                padding: 20,
                minHeight: 320,
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MapPin color={gold[400]} size={20} />
                  <Typography variant="h3" color={theme.colors.foreground}>Ubicación</Typography>
                </View>
                <Pressable hitSlop={10} onPress={() => setLocationModalVisible(false)}>
                  <X color={theme.colors.foregroundMuted} size={20} />
                </Pressable>
              </View>

              <LocationAutocomplete
                value={bucket.location_text || ''}
                onChangeLocation={async (loc) => {
                  await handleSaveLocation(loc);
                  setLocationModalVisible(false);
                }}
              />

              {bucket.location_text ? (
                <Pressable
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    marginTop: 20,
                    paddingVertical: 12,
                    borderRadius: 12,
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  }}
                  onPress={async () => {
                    await handleRemoveLocation();
                    setLocationModalVisible(false);
                  }}
                >
                  <Trash2 color={theme.colors.error} size={16} />
                  <Typography variant="bodySemibold" color={theme.colors.error}>
                    Quitar ubicación
                  </Typography>
                </Pressable>
              ) : null}
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {datePickerConfig && datePickerConfig.visible && (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide" visible={true}>
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <View style={{ backgroundColor: '#1C1C1E', padding: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10 }}>
                  <Pressable onPress={() => setDatePickerConfig(null)}>
                    <Typography variant="bodySemibold" color="#0A84FF">Hecho</Typography>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={datePickerConfig.date}
                  mode="date"
                  display="spinner"
                  themeVariant="dark"
                  onChange={async (_event, date) => {
                    if (date) {
                      setDatePickerConfig({ ...datePickerConfig, date });
                      const type = datePickerConfig.type;
                      const patch: Record<string, any> = { [type]: date.toISOString() };
                      if (type === 'completed_at' && bucket.status !== 'completed') {
                        patch.status = 'completed';
                      }
                      queryClient.setQueryData(['bucketDetail', id], (oldData: any) => oldData ? { ...oldData, ...patch } : oldData);
                      await supabase.from('buckets').update(patch).eq('id', id);
                      void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
                      void queryClient.invalidateQueries({ queryKey: ['buckets'] });
                      void queryClient.invalidateQueries({ queryKey: ['calendar_month'] });
                    }
                  }}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={datePickerConfig.date}
            mode="date"
            display="default"
            onChange={async (event, date) => {
              const type = datePickerConfig.type;
              setDatePickerConfig(null);
              if (event.type === 'set' && date) {
                const patch: Record<string, any> = { [type]: date.toISOString() };
                if (type === 'completed_at' && bucket.status !== 'completed') {
                  patch.status = 'completed';
                }
                queryClient.setQueryData(['bucketDetail', id], (oldData: any) => oldData ? { ...oldData, ...patch } : oldData);
                await supabase.from('buckets').update(patch).eq('id', id);
                void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
                void queryClient.invalidateQueries({ queryKey: ['buckets'] });
                void queryClient.invalidateQueries({ queryKey: ['calendar_month'] });
              }
            }}
          />
        )
      )}

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
          ...(isOwner
            ? []
            : [
                bucket.user_id,
                ...collaborators
                  .filter((c: any) => c.status === 'accepted' && c.id !== user?.id)
                  .map((c: any) => c.id),
              ]),
          ...participantsData.filter((p: any) => p.id !== user?.id).map((p: any) => p.id),
        ]}
      />
    </View>
  );
}

