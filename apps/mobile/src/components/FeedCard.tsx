import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Check, Heart, MessageCircle } from 'lucide-react-native';
import { Avatar, fontFamily, gold } from '@bucketlist/ui';
import { BucketCover } from './BucketCover';
import { TaskCommentsModal } from './TaskCommentsModal';
import { resolveTaskImage } from '../utils/taskImage';
import { useAuthStore } from '../stores/auth.store';
import { useCopiedBucketIds, useCopyBucket, useToggleLike } from '../hooks/useSocial';
import { daysBetween, timeAgo } from '../utils/timeAgo';
import { displayNameOf, initialsOf } from '../utils/initials';

import { TaskViewMode } from './ViewModeSelector';

interface FeedCardProps {
  /** { actor, bucket, type, created_at } — en explorar se construye al vuelo. */
  event: any;
  onPress: () => void;
  index: number;
  mode?: TaskViewMode;
}

/**
 * Momento de un amigo: cabecera (avatar, nombre, @usuario, hace X h),
 * portada con título y lugar, acciones (me gusta, comentarios, "Yo también")
 * y pie con los días que tardó en completarla.
 * Soporta modos: 'list' (por defecto), 'gallery' y 'compact'.
 */
export function FeedCard({ event, onPress, index, mode = 'list' }: FeedCardProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const [showComments, setShowComments] = useState(false);
  const toggleLike = useToggleLike();
  const copyBucket = useCopyBucket();
  const { data: copiedIds } = useCopiedBucketIds(user?.id);

  const actor = event?.actor;
  const bucket = event?.bucket;
  if (!actor || !bucket) return null;

  const isOwn = !!user && bucket.user_id === user.id;
  // Foto subida más reciente, portada o degradado, según lo que haya elegido el dueño de la tarea.
  const coverValue: string | null = resolveTaskImage(bucket);

  const reactions: Array<{ emoji: string; user_id: string }> = bucket.reactions ?? [];
  const likeCount = reactions.length;
  const liked = !!user && reactions.some((r) => r.user_id === user.id);
  const commentCount: number = bucket.comments?.[0]?.count ?? 0;

  const alreadyCopied = !!copiedIds?.includes(bucket.id);

  const isCompleted = (event.type ?? 'completed') === 'completed' && bucket.status === 'completed';
  const days = isCompleted ? daysBetween(bucket.created_at, bucket.completed_at ?? event.created_at) : null;
  const durationText =
    days === null
      ? null
      : days === 0
        ? 'Completada el mismo día.'
        : `Completada en ${days} ${days === 1 ? 'día' : 'días'}.`;
  const caption = [durationText, bucket.description?.trim()].filter(Boolean).join(' ');

  const openProfile = () => {
    if (isOwn) {
      router.push('/(tabs)/profile' as any);
    } else {
      router.push(`/profile/${actor.id}` as any);
    }
  };

  const handleLike = () => {
    if (!user) return;
    toggleLike.mutate({ bucketId: bucket.id, userId: user.id });
  };

  const handleCopy = () => {
    if (!user || alreadyCopied || copyBucket.isPending) return;
    copyBucket.mutate(
      { bucketId: bucket.id, userId: user.id },
      { onError: (error: any) => Alert.alert('No se pudo añadir', error?.message ?? 'Inténtalo de nuevo.') }
    );
  };

  if (mode === 'gallery') {
    return (
      <Animated.View entering={FadeInUp.delay(Math.min(index, 6) * 50).springify()} style={styles.galleryCardWrapper}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.galleryCard, { opacity: pressed ? 0.9 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={bucket.title}
        >
          <BucketCover
            value={coverValue}
            title={bucket.title}
            categorySlug={bucket.category?.slug}
            seed={bucket.id}
            iconSize={90}
            style={styles.galleryCover}
          >
            <LinearGradient
              colors={['rgba(0,0,0,0.65)', 'transparent', 'rgba(0,0,0,0.88)']}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Header flotante: autor */}
            <Pressable onPress={openProfile} style={styles.galleryHeader} hitSlop={6} accessibilityRole="button">
              <Avatar uri={actor.avatar_url} initials={initialsOf(actor)} size="xs" goldRing />
              <Text style={styles.galleryUsername} numberOfLines={1}>
                @{actor.username}
              </Text>
            </Pressable>

            {/* Pie: título y métricas */}
            <View style={styles.galleryBottom} pointerEvents="box-none">
              <Text style={styles.galleryTitle} numberOfLines={2}>
                {bucket.title}
              </Text>
              {bucket.location_text ? (
                <Text style={styles.galleryLocation} numberOfLines={1}>
                  {bucket.location_text}
                </Text>
              ) : null}

              <View style={styles.galleryActions}>
                <Pressable onPress={handleLike} hitSlop={6} style={styles.galleryActionItem}>
                  <Heart size={14} color={liked ? gold[400] : '#F2EFE8'} fill={liked ? gold[400] : 'transparent'} strokeWidth={1.8} />
                  <Text style={styles.galleryActionText}>{likeCount}</Text>
                </Pressable>
                <Pressable onPress={() => setShowComments(true)} hitSlop={6} style={styles.galleryActionItem}>
                  <MessageCircle size={14} color="#F2EFE8" strokeWidth={1.8} />
                  <Text style={styles.galleryActionText}>{commentCount}</Text>
                </Pressable>
              </View>
            </View>
          </BucketCover>
        </Pressable>

        <TaskCommentsModal
          visible={showComments}
          onClose={() => setShowComments(false)}
          bucketId={bucket.id}
          bucketTitle={bucket.title}
          bucketOwnerId={bucket.user_id}
        />
      </Animated.View>
    );
  }

  if (mode === 'compact') {
    return (
      <Animated.View entering={FadeInUp.delay(Math.min(index, 6) * 50).springify()} style={styles.compactCardWrapper}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.compactCard, { opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={bucket.title}
        >
          <View style={styles.compactThumbWrapper}>
            <BucketCover
              value={resolveTaskImage(bucket, { preferThumb: true })}
              title={bucket.title}
              categorySlug={bucket.category?.slug}
              seed={bucket.id}
              iconSize={40}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <View style={styles.compactInfo}>
            <Pressable onPress={openProfile} style={styles.compactUserHeader} hitSlop={4}>
              <Avatar uri={actor.avatar_url} initials={initialsOf(actor)} size="xs" />
              <Text style={styles.compactUsername} numberOfLines={1}>
                @{actor.username}
              </Text>
              <Text style={styles.compactDot}>·</Text>
              <Text style={styles.compactTime}>
                {timeAgo(event.created_at ?? bucket.completed_at ?? bucket.created_at)}
              </Text>
            </Pressable>
            <Text style={styles.compactTitle} numberOfLines={1}>
              {bucket.title}
            </Text>
          </View>

          <View style={styles.compactActions}>
            <Pressable onPress={handleLike} hitSlop={6} style={styles.compactActionBtn}>
              <Heart size={16} color={liked ? gold[400] : '#A0A0A0'} fill={liked ? gold[400] : 'transparent'} strokeWidth={1.8} />
              <Text style={[styles.compactActionCount, liked && { color: gold[400] }]}>{likeCount}</Text>
            </Pressable>
            <Pressable onPress={() => setShowComments(true)} hitSlop={6} style={styles.compactActionBtn}>
              <MessageCircle size={16} color="#A0A0A0" strokeWidth={1.8} />
              <Text style={styles.compactActionCount}>{commentCount}</Text>
            </Pressable>
          </View>
        </Pressable>

        <TaskCommentsModal
          visible={showComments}
          onClose={() => setShowComments(false)}
          bucketId={bucket.id}
          bucketTitle={bucket.title}
          bucketOwnerId={bucket.user_id}
        />
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInUp.delay(Math.min(index, 4) * 80).springify()} style={styles.container}>
      {/* Cabecera */}
      <Pressable onPress={openProfile} style={styles.header} accessibilityRole="button">
        <Avatar uri={actor.avatar_url} initials={initialsOf(actor)} size="lg" goldRing />
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {displayNameOf(actor)}
          </Text>
          <Text style={styles.handle} numberOfLines={1}>
            @{actor.username}
          </Text>
        </View>
        <Text style={styles.time}>{timeAgo(event.created_at ?? bucket.completed_at ?? bucket.created_at)}</Text>
      </Pressable>

      {/* Portada */}
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={bucket.title}>
        <BucketCover
          value={coverValue}
          title={bucket.title}
          categorySlug={bucket.category?.slug}
          seed={bucket.id}
          iconSize={170}
          style={styles.cover}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.78)']}
            locations={[0.35, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.coverText} pointerEvents="none">
            <Text style={styles.coverTitle} numberOfLines={2}>
              {bucket.title}
            </Text>
            {bucket.location_text ? (
              <Text style={styles.coverLocation} numberOfLines={1}>
                {bucket.location_text}
              </Text>
            ) : null}
          </View>
        </BucketCover>
      </Pressable>

      {/* Acciones */}
      <View style={styles.actions}>
        <Pressable
          onPress={handleLike}
          style={styles.action}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Quitar me gusta' : 'Me gusta'}
          accessibilityState={{ selected: liked }}
        >
          <Heart size={24} color={liked ? gold[400] : '#F2EFE8'} fill={liked ? gold[400] : 'transparent'} strokeWidth={1.8} />
          <Text style={styles.count}>{likeCount}</Text>
        </Pressable>

        <Pressable
          onPress={() => setShowComments(true)}
          style={styles.action}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Comentarios"
        >
          <MessageCircle size={24} color="#F2EFE8" strokeWidth={1.8} />
          <Text style={styles.count}>{commentCount}</Text>
        </Pressable>

        <View style={styles.flex} />

        {!isOwn && (
          <Pressable
            onPress={handleCopy}
            disabled={alreadyCopied || copyBucket.isPending}
            style={({ pressed }) => [styles.copyButton, alreadyCopied && styles.copyButtonDone, { opacity: pressed ? 0.75 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={alreadyCopied ? 'Ya está en tu lista' : 'Yo también'}
          >
            {alreadyCopied ? <Check size={16} color="#9A9A9A" style={styles.copyIcon} /> : null}
            <Text style={[styles.copyText, alreadyCopied && { color: '#9A9A9A' }]}>
              {alreadyCopied ? 'En tu lista' : 'Yo también'}
            </Text>
          </Pressable>
        )}
      </View>

      {caption ? <Text style={styles.caption}>{caption}</Text> : null}

      <TaskCommentsModal
        visible={showComments}
        onClose={() => setShowComments(false)}
        bucketId={bucket.id}
        bucketTitle={bucket.title}
        bucketOwnerId={bucket.user_id}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  headerText: { flex: 1 },
  name: { fontFamily: fontFamily.semibold, fontSize: 16, color: '#FFFFFF' },
  handle: { fontFamily: fontFamily.regular, fontSize: 13, color: '#9A9A9A', marginTop: 1 },
  time: { fontFamily: fontFamily.regular, fontSize: 13, color: '#9A9A9A', alignSelf: 'flex-start', marginTop: 4 },
  cover: {
    width: '100%',
    aspectRatio: 1.4,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  coverText: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 18,
  },
  coverTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: 27,
    lineHeight: 32,
    color: '#FFFFFF',
  },
  coverLocation: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 3,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
    marginTop: 14,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { fontFamily: fontFamily.medium, fontSize: 15, color: '#F2EFE8' },
  flex: { flex: 1 },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: gold[400],
  },
  copyButtonDone: { borderColor: '#2A2A2A', backgroundColor: '#161616' },
  copyIcon: { marginRight: 6 },
  copyText: { fontFamily: fontFamily.semibold, fontSize: 14, color: gold[400] },
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: '#CFCFCF',
    marginTop: 12,
  },
  // Galería
  galleryCardWrapper: {
    flex: 1,
    padding: 6,
  },
  galleryCard: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  galleryCover: {
    width: '100%',
    aspectRatio: 0.85,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
  },
  galleryUsername: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  galleryBottom: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
  },
  galleryTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: 15,
    lineHeight: 19,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  galleryLocation: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  galleryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  galleryActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  galleryActionText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: '#F2EFE8',
  },
  // Compacto
  compactCardWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 14,
    padding: 10,
    gap: 12,
  },
  compactThumbWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#2A2A2A',
  },
  compactInfo: {
    flex: 1,
    gap: 2,
  },
  compactUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactUsername: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: '#A0A0A0',
  },
  compactDot: {
    color: '#666',
    fontSize: 12,
  },
  compactTime: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: '#777',
  },
  compactTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  compactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  compactActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactActionCount: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: '#A0A0A0',
  },
});
