import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Alert, Share, ActivityIndicator, ScrollView, Image, Pressable, FlatList, Dimensions, Platform, StatusBar, Modal, Animated, NativeSyntheticEvent, NativeScrollEvent, TextInput, PanResponder } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Typography, useTheme } from '@bucketlist/ui';
import { ArrowLeft, Share2, MoreHorizontal, MapPin, Calendar, Heart, MessageCircle, FolderOpen, CheckCircle2, Circle, Camera, Check, Eye, Lock, Users, FolderPlus, Pencil, Trash2, X, ListPlus, Plus, Minus, Download, ArrowUp, ArrowDown } from 'lucide-react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../../src/services/supabase';
import { storageApi } from '../../src/services/api/storage';
import { processBucketImage } from '@bucketlist/shared';
import { useAuthStore } from '../../src/stores/auth.store';
import { useAddComment, useCopyBucket, useToggleReaction } from '../../src/hooks/useSocial';
import { useDeleteBucket } from '../../src/hooks/useBuckets';
import { useAlbums } from '../../src/hooks/useAlbums';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';
import { BucketCover } from '../../src/components/BucketCover';
import { SubtaskList } from '../../src/components/SubtaskList';
import { BucketPhotoViewer } from '../../src/components/BucketPhotoViewer';
import { BucketBottomSheet } from '../../src/components/BucketBottomSheet';
import { styles } from './BucketDetail.styles';

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

export default function BucketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const insets = useSafeAreaInsets();
  const coverTotalHeight = COVER_HEIGHT + insets.top;

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<'menu' | 'visibility' | 'albums' | 'status'>('menu');
  const [viewingPhotoIndex, setViewingPhotoIndex] = useState<number | null>(null);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [scrollEnabled, setScrollEnabled] = useState(true);
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
  const { data: albumsData, isLoading: albumsLoading } = useAlbums(user?.id);

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

  const [photoSearchQuery, setPhotoSearchQuery] = useState('');
  const [photoSortField, setPhotoSortField] = useState<'date' | 'title'>('date');
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

  const handleSortOption = (field: 'date' | 'title') => {
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
  let photos: any[] = bucket.bucket_photos || [];

  if (photoSearchQuery.trim()) {
    const q = photoSearchQuery.toLowerCase();
    photos = photos.filter((p: any) => p.title?.toLowerCase().includes(q));
  }
  photos.sort((a, b) => {
    if (photoSortField === 'title') {
      const cmp = (a.title || '').localeCompare(b.title || '');
      return photoSortDir === 'asc' ? cmp : -cmp;
    }
    const da = new Date(a.created_at || 0).getTime();
    const db = new Date(b.created_at || 0).getTime();
    return photoSortDir === 'asc' ? da - db : db - da;
  });
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
    queryClient.setQueryData(['bucketDetail', id], (oldData: any) => oldData ? { ...oldData, status } : oldData);
    const { error } = await supabase
      .from('buckets')
      .update({ status })
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

  // Selecciona fotos de la galería y las sube a esta tarea.
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
      for (const asset of result.assets) {
        const processed = await processBucketImage(asset.uri);
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
        });

        if (error) throw error;
      }

      void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
      invalidateBucket();
      Alert.alert('Fotos subidas', 'Las fotos se han añadido al momento.');
    } catch (error: any) {
      Alert.alert('No se pudieron subir las fotos', error?.message || 'Inténtalo de nuevo.');
    }
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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        style={{ flex: 1 }}
        scrollEnabled={scrollEnabled}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
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
                if (isOwner) {
                  setSheetMode('status');
                  setSheetVisible(true);
                }
              }}
            >
              <Typography variant="caption" color={gold[400]} style={{ fontWeight: '700' }}>
                {statusLabel(bucket.status)}
              </Typography>
            </Pressable>
            {/* Visibility */}
            <Pressable
              style={[styles.badge, styles.badgeMuted]}
              onPress={() => {
                if (isOwner) {
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
                if (isOwner) {
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
          {isOwner ? (
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
          {bucket.category?.name_es && (
            <View style={{ flexDirection: 'row', marginTop: 12, marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
              <View style={[styles.badge, { backgroundColor: bucket.category.color || theme.colors.border }]}>
                <Typography variant="caption" color="#FFF" style={{ fontWeight: '600' }}>
                  {bucket.category.name_es}
                </Typography>
              </View>
            </View>
          )}

          {/* Meta */}
          <View style={styles.meta}>
            {bucket.location_text && (
              <View style={styles.metaRow}>
                <MapPin color={gold[400]} size={16} strokeWidth={1.8} />
                <Typography variant="body" color={theme.colors.foregroundMuted} style={styles.metaText}>
                  {bucket.location_text}
                </Typography>
              </View>
            )}
            {bucket.status === 'completed' && (
              <View style={styles.metaRow}>
                <CheckCircle2 color={gold[400]} size={16} strokeWidth={1.8} />
                <Typography variant="body" color={theme.colors.foregroundMuted} style={styles.metaText}>
                  Completada el {format(new Date(bucket.completed_at || bucket.updated_at || new Date()), 'd \'de\' MMMM \'de\' yyyy', { locale: es })}
                </Typography>
              </View>
            )}
            {bucket.deadline && (
              <View style={styles.metaRow}>
                <Calendar color={gold[400]} size={16} strokeWidth={1.8} />
                <Typography variant="body" color={theme.colors.foregroundMuted} style={styles.metaText}>
                  {bucket.status === 'completed' 
                    ? `Programada para el ${format(new Date(bucket.deadline), 'd \'de\' MMMM \'de\' yyyy', { locale: es })}`
                    : `Vence el ${format(new Date(bucket.deadline), 'd \'de\' MMMM \'de\' yyyy', { locale: es })}`
                  }
                </Typography>
              </View>
            )}
          </View>

          {/* Description */}
          {isOwner ? (
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
          {(bucket.counter_enabled || isOwner) && (
            <View style={{ marginBottom: 24 }}>
              <Typography variant="caption" color={gold[400]} style={styles.subtasksLabel}>
                CONTADOR
              </Typography>

              {bucket.counter_enabled ? (
                <>
                  <View
                    style={{
                      marginTop: 12,
                      padding: 16,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: dark[400],
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      {isOwner ? (
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

                      {isOwner ? (
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

                    {isOwner && (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={() => changeCounter(-1)}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: 1,
                            borderColor: dark[400],
                          }}
                        >
                          <Minus color={theme.colors.foregroundMuted} size={18} strokeWidth={2} />
                        </Pressable>
                        <Pressable
                          onPress={() => changeCounter(1)}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: gold[400],
                          }}
                        >
                          <Plus color="#000" size={18} strokeWidth={2.4} />
                        </Pressable>
                      </View>
                    )}
                  </View>

                  {/* Barra y objetivo (independiente de la barra de pasos) */}
                  {(bucket.counter_target || isOwner) && (
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
                        {isOwner && (
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

                  {isOwner && (
                    <Pressable onPress={removeCounter} style={{ alignSelf: 'flex-start', marginTop: 10 }}>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>
                        Quitar contador
                      </Typography>
                    </Pressable>
                  )}
                </>
              ) : (
                <Pressable
                  onPress={() => void updateCounter({ counter_enabled: true, counter_count: 0 })}
                  style={{
                    marginTop: 12,
                    height: 56,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: dark[400],
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus color={gold[400]} size={20} strokeWidth={1.8} />
                  <Typography variant="bodySemibold" color={gold[400]} style={{ marginLeft: 8 }}>
                    Añadir contador
                  </Typography>
                </Pressable>
              )}
            </View>
          )}

          {/* Subtasks */}
          {(subtasks.length > 0 || isOwner) && (
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
                isOwner={isOwner}
                theme={theme}
                onToggle={(subtask) => void toggleSubtask(subtask)}
                onChange={handleSubtaskChange}
                onDelete={handleDeleteSubtask}
                onMove={(from, to) => void handleMoveSubtask(from, to)}
                onDraggingChange={(dragging) => setScrollEnabled(!dragging)}
              />

              {/* Añadir paso */}
              {isOwner && (
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

          {/* ── Fotos ──────────────────────────────────────────────────────── */}
          {(bucket.bucket_photos?.length > 0 || isOwner) && (
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
                          {photoSortField === 'date' ? 'Fecha' : 'Nombre'}
                        </Typography>
                        {photoSortDir === 'desc' ? (
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
                  {isOwner && (
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
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* ── Fullscreen photo viewer ─────────────────────────────────────── */}
      <BucketPhotoViewer
        photos={photos}
        viewingPhotoIndex={viewingPhotoIndex}
        setViewingPhotoIndex={setViewingPhotoIndex}
        isOwner={isOwner}
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
      {isOwner && (
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
                  {selected &&
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
    </View>
  );
}

