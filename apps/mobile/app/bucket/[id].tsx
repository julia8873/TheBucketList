import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Image,
  Pressable,
  FlatList,
  Dimensions,
  Platform,
  StatusBar,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react-native';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from '../../src/services/supabase';
import { storageApi } from '../../src/services/api/storage';
import { useAuthStore } from '../../src/stores/auth.store';
import { useAddComment, useCopyBucket, useToggleReaction } from '../../src/hooks/useSocial';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 300;

export default function BucketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const addComment = useAddComment();
  const copyBucket = useCopyBucket();
  const toggleReaction = useToggleReaction();

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
            colors={['transparent', 'rgba(0,0,0,0.85)', theme.colors.background]}
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
              <Pressable style={styles.navButton}>
                <Share2 color="#FFF" size={20} strokeWidth={2} />
              </Pressable>
              <Pressable style={styles.navButton}>
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
                <View key={st.id} style={styles.subtaskRow}>
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
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Bottom action bar ─────────────────────────────────────────────── */}
      <View style={[styles.actionBar, { borderTopColor: dark[400], backgroundColor: theme.colors.background }]}>
        {isOwner ? (
          <>
            <Pressable style={[styles.actionBtn, styles.actionBtnOutlined, { borderColor: gold[400] }]}>
              <Typography variant="bodySemibold" color={theme.colors.foreground}>
                Editar
              </Typography>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.actionBtnFilled, { backgroundColor: gold[400] }]}>
              <Typography variant="bodySemibold" color="#000">
                Compartir momento
              </Typography>
            </Pressable>
          </>
        ) : (
          <Pressable
            style={[styles.actionBtn, styles.actionBtnFilled, { backgroundColor: gold[400], flex: 1 }]}
            onPress={() => user && copyBucket.mutate({ bucketId: id, userId: user.id })}
          >
            <Typography variant="bodySemibold" color="#000">
              Yo también quiero hacerlo
            </Typography>
          </Pressable>
        )}
      </View>
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
    bottom: 0,
    left: 0,
    right: 0,
    height: COVER_HEIGHT * 0.6,
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
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
    fontSize: 26,
    lineHeight: 32,
    marginBottom: 16,
  },
  meta: {
    gap: 8,
    marginBottom: 16,
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
    marginBottom: 20,
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

  // ── Action bar ─────────────────────────────────────────────────────────────
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
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
