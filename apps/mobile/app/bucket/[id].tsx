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
import { ArrowLeft, Share2, MoreHorizontal, MapPin, Calendar, Heart, MessageCircle, FolderOpen, CheckCircle2, Circle, Camera, Check, Eye, Lock, Users, FolderPlus, Pencil, Trash2, X, ListPlus, Plus, Download } from 'lucide-react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../../src/services/supabase';
import { storageApi } from '../../src/services/api/storage';
import { processBucketImage } from '@bucketlist/shared';
import { useAuthStore } from '../../src/stores/auth.store';
import { useAddComment, useCopyBucket, useToggleReaction } from '../../src/hooks/useSocial';
import { useDeleteBucket } from '../../src/hooks/useBuckets';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';
import { BucketCover } from '../../src/components/BucketCover';
import { SubtaskItem } from '../../src/components/SubtaskItem';
import { BucketPhotoViewer } from '../../src/components/BucketPhotoViewer';
import { BucketBottomSheet } from '../../src/components/BucketBottomSheet';
import { styles } from './BucketDetail.styles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 220;
const BADGES_OVERLAP = 32;
// Cuánto se meten las etiquetas sobre la portada.

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
  const [albums, setAlbums] = useState<any[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const sheetTranslateY = useRef(new Animated.Value(420)).current;
  const subtaskTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const titleTimeout = useRef<NodeJS.Timeout | null>(null);
  const descTimeout = useRef<NodeJS.Timeout | null>(null);
  const addComment = useAddComment();
  const copyBucket = useCopyBucket();
  const toggleReaction = useToggleReaction();
  const deleteBucket = useDeleteBucket();

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
          bucket_photos(*)
        `)
        .eq('id', id)
        .single();
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
  const photos: any[] = bucket.bucket_photos || [];
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
    void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
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

  const loadAlbums = async () => {
    if (!user) return;
    setAlbumsLoading(true);
    const { data, error } = await supabase
      .from('albums')
      .select('id, title, visibility')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    setAlbumsLoading(false);
    if (error) {
      Alert.alert('No se pudieron cargar las carpetas', error.message);
      return;
    }
    setAlbums(data || []);
    setSheetMode('albums');
  };

  const moveToAlbum = async (albumId: string | null) => {
    if (!user) return;

    const { error: removeError } = await supabase
      .from('album_items')
      .delete()
      .eq('bucket_id', id);

    if (removeError) {
      Alert.alert('No se pudo mover la tarea', removeError.message);
      return;
    }

    if (albumId) {
      const { error: insertError } = await supabase
        .from('album_items')
        .insert({ album_id: albumId, bucket_id: id, position: 0 });

      if (insertError) {
        Alert.alert('No se pudo mover la tarea', insertError.message);
        return;
      }
    }

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
            {/* Category */}
            {bucket.category?.name_es && (
              <View style={[styles.badge, styles.badgeMuted]}>
                <FolderOpen color={theme.colors.foregroundMuted} size={13} strokeWidth={1.8} style={{ marginRight: 4 }} />
                <Typography variant="caption" color={theme.colors.foreground} style={{ fontWeight: '600' }}>
                  {bucket.category.name_es}
                </Typography>
              </View>
            )}
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
            {bucket.deadline && (
              <View style={styles.metaRow}>
                <Calendar color={gold[400]} size={16} strokeWidth={1.8} />
                <Typography variant="body" color={theme.colors.foregroundMuted} style={styles.metaText}>
                  {bucket.status === 'completed'
                    ? `Completada el ${format(new Date(bucket.updated_at || bucket.deadline), 'd \'de\' MMMM \'de\' yyyy', { locale: es })}`
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

          {/* Subtasks */}
          {(subtasks.length > 0 || isOwner) && (
            <View style={styles.subtasksSection}>
              <View style={styles.subtasksHeader}>
                <Typography variant="caption" color={gold[400]} style={styles.subtasksLabel}>
                  PASOS · {subtasksDone} DE {subtasks.length}
                </Typography>
              </View>
              {subtasks.map((st: any, index: number) => (
                <SubtaskItem
                  key={st.id}
                  st={st}
                  index={index}
                  isOwner={isOwner}
                  theme={theme}
                  onToggle={(subtask) => void toggleSubtask(subtask)}
                  onChange={handleSubtaskChange}
                  onDelete={handleDeleteSubtask}
                  onMove={(fromIndex, toIndex) => void handleMoveSubtask(fromIndex, toIndex)}
                />
              ))}

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
          {(photos.length > 0 || isOwner) && (
            <>
              <View style={[styles.divider, { backgroundColor: dark[400], marginTop: 20 }]} />
              <View style={styles.photosSection}>
                <Typography variant="caption" color={gold[400]} style={styles.subtasksLabel}>
                  FOTOS{photos.length > 0 ? ` · ${photos.length}` : ''}
                </Typography>
                <View style={styles.photosGrid}>
                  {photos.map((photo, index) => (
                    <Pressable
                      key={photo.id}
                      onPress={() => setViewingPhotoIndex(index)}
                      style={[
                        styles.photoThumb,
                        photos.length === 1 && { width: '100%', height: (SCREEN_WIDTH - 40) * 1.25 }
                      ]}
                    >
                      <Image
                        source={{ uri: storageApi.getPublicUrl(photo.storage_path) }}
                        style={styles.photoThumbImage}
                        resizeMode="cover"
                      />
                    </Pressable>
                  ))}
                  {isOwner && (
                    <Pressable
                      style={[
                        styles.photoAddThumb,
                        photos.length <= 1 && { width: '100%', height: 72, flexDirection: 'row' }
                      ]}
                      onPress={() => void pickAndUploadPhotos()}
                    >
                      <Camera color={gold[400]} size={24} strokeWidth={1.8} />
                      {photos.length <= 1 && (
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
        moveToAlbum={moveToAlbum}
        albums={albums}
      />
    </View>
  );
}

