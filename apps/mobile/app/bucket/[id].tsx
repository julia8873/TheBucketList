import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Share,
  ActivityIndicator,
  ScrollView,
  Image,
  Pressable,
  FlatList,
  Dimensions,
  Platform,
  StatusBar,
  Modal,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Typography, useTheme } from '@bucketlist/ui';
import {
  ArrowLeft,
  Share2,
  MoreHorizontal,
  MapPin,
  Calendar,
  Heart,
  MessageCircle,
  FolderOpen,
  CheckCircle2,
  Circle,
  Camera,
  Check,
  Eye,
  Lock,
  Users,
  FolderPlus,
  Pencil,
  Trash2,
  X,
  ListPlus,
} from 'lucide-react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../../src/services/supabase';
import { storageApi } from '../../src/services/api/storage';
import { processBucketImage } from '@bucketlist/shared';
import { useAuthStore } from '../../src/stores/auth.store';
import { useAddComment, useCopyBucket, useToggleReaction } from '../../src/hooks/useSocial';
import { useDeleteBucket } from '../../src/hooks/useBuckets';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 220;

export default function BucketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode, setSheetMode] = useState<'menu' | 'visibility' | 'albums'>('menu');
  const [albums, setAlbums] = useState<any[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(false);
  const sheetTranslateY = useRef(new Animated.Value(420)).current;
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
  const subtasks: any[] = bucket.item_subtasks || [];
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

  const handleMarkCompleted = async () => {
    if (bucket.status === 'completed') {
      closeSheet(() => Alert.alert('Ya está completada', 'Esta tarea ya está marcada como completada.'));
      return;
    }

    const { error } = await supabase
      .from('buckets')
      .update({ status: 'completed' })
      .eq('id', id);

    if (error) {
      closeSheet(() => Alert.alert('No se pudo completar', error.message));
      return;
    }

    invalidateBucket();
    closeSheet();
  };

  const handleChangeVisibility = async (visibility: 'public' | 'followers' | 'private') => {
    const { error } = await supabase
      .from('buckets')
      .update({ visibility })
      .eq('id', id);

    if (error) {
      Alert.alert('No se pudo cambiar la visibilidad', error.message);
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

  const uploadPhotos = async () => {
    if (!user) return;

    closeSheet(async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos para subirlas a este momento.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
    });
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
    const { error } = await supabase
      .from('item_subtasks')
      .update({ done: nextDone })
      .eq('id', subtask.id);

    if (error) {
      Alert.alert('No se pudo actualizar el paso', error.message);
      return;
    }

    void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
    void queryClient.invalidateQueries({ queryKey: ['buckets'] });
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
        <View style={styles.coverContainer}>
          {/* Photo pager */}
          {photos.length > 0 ? (
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handlePhotoScroll}
              scrollEventThrottle={16}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: storageApi.getPublicUrl(item.storage_path) }}
                  style={styles.coverImage}
                />
              )}
              style={{ width: SCREEN_WIDTH, height: COVER_HEIGHT }}
            />
          ) : (
            // Fallback gradient cover using category color or default
            <LinearGradient
              colors={[bucket.category?.color || '#C5763A', '#1A0D00']}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.coverImage}
            />
          )}

          {/* Bottom gradient fade */}
          <LinearGradient
            // El cambio de color se retrasa para que ocurra a la altura
            // del comienzo del texto, no sobre la parte superior de la portada.
            colors={[
              'transparent',
              'transparent',
              'rgba(0,0,0,0.12)',
              'rgba(0,0,0,0.72)',
              theme.colors.background,
            ]}
            locations={[0, 0.48, 0.66, 0.84, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.coverGradient}
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

          {/* Photo dots */}
          {photos.length > 1 && (
            <View style={styles.dotsRow}>
              {photos.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    { backgroundColor: i === activePhotoIndex ? gold[400] : 'rgba(255,255,255,0.4)' }
                  ]}
                />
              ))}
            </View>
          )}
        </View>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <View style={styles.content}>

          {/* Badges */}
          <View style={styles.badges}>
            {/* Status */}
            <View style={[styles.badge, styles.badgeGold]}>
              <Typography variant="caption" color={gold[400]} style={{ fontWeight: '700' }}>
                {statusLabel(bucket.status)}
              </Typography>
            </View>
            {/* Visibility */}
            <View style={[styles.badge, styles.badgeMuted]}>
              <Typography variant="caption" color={theme.colors.foreground} style={{ fontWeight: '600' }}>
                {visibilityLabel(bucket.visibility)}
              </Typography>
            </View>
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
          <Typography variant="h1" color={theme.colors.foreground} style={styles.title}>
            {bucket.title}
          </Typography>

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
          {bucket.description && (
            <Typography variant="body" color={theme.colors.foregroundMuted} style={styles.description}>
              {bucket.description}
            </Typography>
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

          {/* Subtasks */}
          {subtasks.length > 0 && (
            <View style={styles.subtasksSection}>
              <View style={styles.subtasksHeader}>
                <Typography variant="caption" color={gold[400]} style={styles.subtasksLabel}>
                  PASOS · {subtasksDone} DE {subtasks.length}
                </Typography>
              </View>
              {subtasks.map((st: any) => (
                <Pressable key={st.id} style={styles.subtaskRow} onPress={() => void toggleSubtask(st)}>
                  {st.done ? (
                    <CheckCircle2 color={gold[400]} size={22} strokeWidth={1.8} fill={dark[200]} />
                  ) : (
                    <Circle color={theme.colors.foregroundMuted} size={22} strokeWidth={1.8} />
                  )}
                  <Typography
                    variant="body"
                    color={st.done ? theme.colors.foreground : theme.colors.foregroundMuted}
                    style={[styles.subtaskText, st.done && styles.subtaskDoneText]}
                  >
                    {st.title}
                  </Typography>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Bottom action bar ─────────────────────────────────────────────── */}
      <View style={[styles.actionBar, { borderTopColor: dark[400], backgroundColor: theme.colors.background }]}>
        <Pressable
          style={[styles.actionBtn, styles.actionBtnFilled, { backgroundColor: gold[400] }]}
          onPress={() => void shareMoment()}
        >
          <Share2 color="#000" size={18} strokeWidth={2} />
          <Typography variant="bodySemibold" color="#000" style={{ marginLeft: 8 }}>
            Compartir momento
          </Typography>
        </Pressable>
      </View>

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
              { backgroundColor: theme.colors.background, transform: [{ translateY: sheetTranslateY }] },
            ]}
          >
            <View style={styles.sheetHandle} />

            {sheetMode === 'menu' && (
              <>
                <View style={styles.sheetHeader}>
                  <Typography variant="h3" color={theme.colors.foreground}>Opciones</Typography>
                  <Pressable style={styles.sheetClose} onPress={() => closeSheet()}>
                    <X color={theme.colors.foregroundMuted} size={20} />
                  </Pressable>
                </View>

                <View style={styles.sheetOptions}>
                  {isOwner && (
                    <Pressable style={styles.sheetOption} onPress={() => void uploadPhotos()}>
                      <View style={styles.sheetIcon}><Camera color={gold[400]} size={21} /></View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold">Subir fotos</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>Añade recuerdos a este momento</Typography>
                      </View>
                    </Pressable>
                  )}

                  {isOwner && (
                    <Pressable style={styles.sheetOption} onPress={() => void handleMarkCompleted()}>
                      <View style={styles.sheetIcon}><CheckCircle2 color={gold[400]} size={21} /></View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold">{bucket.status === 'completed' ? 'Completada' : 'Marcar como completado'}</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>Actualiza el estado de la tarea</Typography>
                      </View>
                    </Pressable>
                  )}

                  {isOwner && (
                    <Pressable style={styles.sheetOption} onPress={() => setSheetMode('visibility')}>
                      <View style={styles.sheetIcon}>
                        {bucket.visibility === 'public' ? <Eye color={gold[400]} size={21} /> : bucket.visibility === 'followers' ? <Users color={gold[400]} size={21} /> : <Lock color={gold[400]} size={21} />}
                      </View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold">Cambiar visibilidad</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>{visibilityLabel(bucket.visibility)}</Typography>
                      </View>
                    </Pressable>
                  )}

                  {isOwner && (
                    <Pressable style={styles.sheetOption} onPress={() => void loadAlbums()}>
                      <View style={styles.sheetIcon}><FolderPlus color={gold[400]} size={21} /></View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold">Mover a carpetas</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>Organiza esta tarea en un álbum</Typography>
                      </View>
                    </Pressable>
                  )}

                  <Pressable style={styles.sheetOption} onPress={() => closeSheet(() => router.push(`/(modals)/edit-bucket?id=${id}` as any))}>
                    <View style={styles.sheetIcon}><Pencil color={gold[400]} size={21} /></View>
                    <View style={styles.sheetOptionText}>
                      <Typography variant="bodySemibold">Editar</Typography>
                      <Typography variant="caption" color={theme.colors.foregroundMuted}>Modifica los datos del momento</Typography>
                    </View>
                  </Pressable>

                  {!isOwner && user && (
                    <Pressable
                      style={styles.sheetOption}
                      onPress={() => {
                        closeSheet(() => copyBucket.mutate({ bucketId: id, userId: user.id }, {
                          onSuccess: () => Alert.alert('Añadido a tu lista', 'La tarea se ha copiado a tu lista.'),
                          onError: (error) => Alert.alert('No se pudo copiar', error.message),
                        }));
                      }}
                    >
                      <View style={styles.sheetIcon}><ListPlus color={gold[400]} size={21} /></View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold">Yo también quiero hacerlo</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>Añádelo a tu lista</Typography>
                      </View>
                    </Pressable>
                  )}

                  {isOwner && (
                    <Pressable style={[styles.sheetOption, styles.dangerOption]} onPress={handleDelete}>
                      <View style={styles.sheetIcon}><Trash2 color={theme.colors.error} size={21} /></View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold" color={theme.colors.error}>Eliminar</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>Esta acción no se puede deshacer</Typography>
                      </View>
                    </Pressable>
                  )}
                </View>
              </>
            )}

            {sheetMode === 'visibility' && (
              <>
                <View style={styles.sheetHeader}>
                  <Pressable style={styles.backSheetButton} onPress={() => setSheetMode('menu')}>
                    <ArrowLeft color={theme.colors.foreground} size={20} />
                  </Pressable>
                  <Typography variant="h3" color={theme.colors.foreground}>Visibilidad</Typography>
                  <View style={{ width: 36 }} />
                </View>
                <View style={styles.sheetOptions}>
                  {([
                    { value: 'public', title: 'Pública', subtitle: 'Cualquiera puede ver este momento', icon: Eye },
                    { value: 'followers', title: 'Seguidores', subtitle: 'Solo tus seguidores pueden verlo', icon: Users },
                    { value: 'private', title: 'Privada', subtitle: 'Solo tú puedes verlo', icon: Lock },
                  ] as const).map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <Pressable key={item.value} style={styles.sheetOption} onPress={() => void handleChangeVisibility(item.value)}>
                        <View style={styles.sheetIcon}><IconComponent color={gold[400]} size={21} /></View>
                        <View style={styles.sheetOptionText}>
                          <Typography variant="bodySemibold">{item.title}</Typography>
                          <Typography variant="caption" color={theme.colors.foregroundMuted}>{item.subtitle}</Typography>
                        </View>
                        {bucket.visibility === item.value && <Check color={gold[400]} size={21} />}
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            {sheetMode === 'albums' && (
              <>
                <View style={styles.sheetHeader}>
                  <Pressable style={styles.backSheetButton} onPress={() => setSheetMode('menu')}>
                    <ArrowLeft color={theme.colors.foreground} size={20} />
                  </Pressable>
                  <Typography variant="h3" color={theme.colors.foreground}>Mover a carpeta</Typography>
                  <View style={{ width: 36 }} />
                </View>
                {albumsLoading ? (
                  <View style={styles.sheetLoading}><ActivityIndicator color={gold[400]} /></View>
                ) : (
                  <View style={styles.sheetOptions}>
                    <Pressable style={styles.sheetOption} onPress={() => void moveToAlbum(null)}>
                      <View style={styles.sheetIcon}><FolderOpen color={gold[400]} size={21} /></View>
                      <View style={styles.sheetOptionText}>
                        <Typography variant="bodySemibold">Sin carpeta</Typography>
                        <Typography variant="caption" color={theme.colors.foregroundMuted}>Dejar la tarea fuera de álbumes</Typography>
                      </View>
                    </Pressable>
                    {albums.map((album) => (
                      <Pressable key={album.id} style={styles.sheetOption} onPress={() => void moveToAlbum(album.id)}>
                        <View style={styles.sheetIcon}><FolderOpen color={gold[400]} size={21} /></View>
                        <View style={styles.sheetOptionText}>
                          <Typography variant="bodySemibold">{album.title}</Typography>
                          <Typography variant="caption" color={theme.colors.foregroundMuted}>{visibilityLabel(album.visibility)}</Typography>
                        </View>
                      </Pressable>
                    ))}
                    {albums.length === 0 && (
                      <Typography variant="body" color={theme.colors.foregroundMuted} style={styles.emptySheetText}>No tienes carpetas creadas todavía.</Typography>
                    )}
                  </View>
                )}
              </>
            )}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },

  // ── Cover ──────────────────────────────────────────────────────────────────
  coverContainer: {
    width: SCREEN_WIDTH,
    height: COVER_HEIGHT,
  },
  coverImage: {
    width: SCREEN_WIDTH,
    height: COVER_HEIGHT,
  },
  coverGradient: {
    position: 'absolute',
    bottom: -250,
    left: 0,
    right: 0,
    // Se prolonga bastante por debajo de la portada para que la transición
    // visible ocurra cerca del comienzo del título y del contenido.
    height: COVER_HEIGHT + 250,
    zIndex: 0,
    pointerEvents: 'none',
  },
  navOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 52,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // ── Content ────────────────────────────────────────────────────────────────
  content: {
    position: 'relative',
    zIndex: 2,
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeGold: {
    borderColor: gold[400],
    backgroundColor: 'transparent',
  },
  badgeMuted: {
    borderColor: dark[500],
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 23,
    lineHeight: 28,
    marginBottom: 10,
  },
  meta: {
    gap: 8,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    marginLeft: 8,
  },
  description: {
    lineHeight: 22,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginBottom: 14,
  },

  // ── Subtasks ───────────────────────────────────────────────────────────────
  subtasksSection: {
    gap: 4,
  },
  subtasksHeader: {
    marginBottom: 12,
  },
  subtasksLabel: {
    fontWeight: '700',
    letterSpacing: 0.8,
    fontSize: 13,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: dark[400],
    gap: 12,
  },
  subtaskText: {
    flex: 1,
    fontSize: 16,
  },
  subtaskDoneText: {
    // no strikethrough — matching the design
  },

  // ── iOS-style bottom sheet ───────────────────────────────────────────────
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.52)',
  },
  bottomSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 18,
    paddingHorizontal: 20,
    maxHeight: '82%',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -8 },
    elevation: 18,
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
  sheetClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backSheetButton: {
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
    borderBottomColor: dark[400],
  },
  sheetIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,168,46,0.10)',
    marginRight: 13,
  },
  sheetOptionText: {
    flex: 1,
  },
  dangerOption: {
    borderBottomWidth: 0,
  },
  sheetLoading: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySheetText: {
    paddingVertical: 24,
    textAlign: 'center',
  },

  // ── Action bar ─────────────────────────────────────────────────────────────
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnOutlined: {
    borderWidth: 1,
  },
  actionBtnFilled: {},
});
