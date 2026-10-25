import { useCoverOverlay } from '@bucketlist/ui';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Check, Heart, MessageCircle, Bookmark } from 'lucide-react-native';
import { Avatar, fontFamily, gold, useTheme, toast } from '@bucketlist/ui';
import { BucketCover } from './BucketCover';
import { TaskCommentsModal } from './TaskCommentsModal';
import { ItemLikesModal } from './ItemLikesModal';
import { resolveTaskImage } from '../utils/taskImage';
import { useAuthStore } from '../stores/auth.store';
import { useCopiedBucketIds, useCopyBucket, useToggleLike, useBatchBucketSaveCounts, useSavedBucketIds, useToggleSaveBucket } from '../hooks/useSocial';
import { daysBetween, timeAgo } from '../utils/timeAgo';
import { displayNameOf, initialsOf } from '../utils/initials';
import { OfficialBadge, isUserAdmin } from './OfficialBadge';
import { useTranslation } from '@bucketlist/shared';

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
 * y pie con la descripción.
 * Soporta modos: 'list' (por defecto), 'gallery' y 'compact'.
 */
function FeedCardComponent({ event, onPress, index, mode = 'list' }: FeedCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const overlay = useCoverOverlay();
  const router = useRouter();
  const { user } = useAuthStore();
  const [showComments, setShowComments] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
  const toggleLike = useToggleLike();
  const copyBucket = useCopyBucket();
  const { data: copiedIds } = useCopiedBucketIds(user?.id);
  const { data: saveCounts } = useBatchBucketSaveCounts(event?.bucket?.id ? [event.bucket.id] : []);
  const saveCount = saveCounts?.[event?.bucket?.id] ?? 0;

  const actor = event?.actor;
  const bucket = event?.bucket;
  const isOwn = !!user && !!bucket && bucket.user_id === user.id;
  const { data: savedBucketIds } = useSavedBucketIds(isOwn ? undefined : user?.id);
  const toggleSaveBucket = useToggleSaveBucket();

  if (!actor || !bucket) return null;

  const isBucketSaved = !isOwn && !!user && !!savedBucketIds?.includes(bucket.id);

  const handleSaveBucket = () => {
    if (!user || isOwn) return;
    toggleSaveBucket.mutate({ userId: user.id, bucketId: bucket.id, currentlySaved: isBucketSaved });
  };
  // Foto subida más reciente, portada o degradado, según lo que haya elegido el dueño de la tarea.
  const coverValue: string | null = resolveTaskImage(bucket);
  const isImageCover = !!coverValue && !coverValue.startsWith('preset:');

  const reactions: Array<{ emoji: string; user_id: string }> = bucket.reactions ?? [];
  const likeCount = reactions.length;
  const liked = !!user && reactions.some((r) => r.user_id === user.id);
  const commentCount: number = bucket.comments?.[0]?.count ?? 0;

  const alreadyCopied = !!copiedIds?.includes(bucket.id);

  const caption = bucket.description?.trim() || null;

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
      { onError: (error: any) => toast.error(error?.message ?? t('feed.copy_error', { defaultValue: 'No se pudo añadir. Inténtalo de nuevo.' })) }
    );
  };

  if (mode === 'gallery') {
    const isLeftColumn = index % 2 === 0;
    return (
      <Animated.View
        entering={index < 6 ? FadeInUp.delay(index * 40).duration(260) : undefined}
        style={[
          styles.galleryCardWrapper,
          isLeftColumn ? styles.galleryLeftCol : styles.galleryRightCol,
        ]}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.galleryCard,
            { backgroundColor: theme.dark ? '#1E1E1E' : '#F0EDE6', borderColor: theme.colors.border, opacity: pressed ? 0.9 : 1 },
          ]}
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
            {!isImageCover && (
              <LinearGradient
                colors={overlay.softBoth as any}
                locations={[0, 0.45, 1]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            )}

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
                <View style={styles.galleryActionItem}>
                  <Pressable onPress={handleLike} hitSlop={6}>
                    <Heart size={14} color={liked ? gold[400] : '#F2EFE8'} fill={liked ? gold[400] : 'transparent'} strokeWidth={1.8} />
                  </Pressable>
                  <Pressable onPress={() => setShowLikes(true)} hitSlop={6}>
                    <Text style={styles.galleryActionText}>{likeCount}</Text>
                  </Pressable>
                </View>
                <Pressable onPress={() => setShowComments(true)} hitSlop={6} style={styles.galleryActionItem}>
                  <MessageCircle size={14} color="#F2EFE8" strokeWidth={1.8} />
                  <Text style={styles.galleryActionText}>{commentCount}</Text>
                </Pressable>
                <Pressable onPress={handleSaveBucket} hitSlop={6} style={styles.galleryActionItem} disabled={isOwn}>
                  <Bookmark
                    size={13}
                    color={isBucketSaved ? gold[400] : '#F2EFE8'}
                    fill={isBucketSaved ? gold[400] : 'transparent'}
                    strokeWidth={1.8}
                  />
                  <Text style={styles.galleryActionText}>{saveCount}</Text>
                </Pressable>
              </View>
            </View>
          </BucketCover>
        </Pressable>

        {showComments && (
          <TaskCommentsModal
            visible={showComments}
            onClose={() => setShowComments(false)}
            bucketId={bucket.id}
            bucketTitle={bucket.title}
            bucketOwnerId={bucket.user_id}
          />
        )}

        {showLikes && (
          <ItemLikesModal
            visible={showLikes}
            onClose={() => setShowLikes(false)}
            targetId={bucket.id}
            targetType="bucket"
            title={bucket.title}
          />
        )}
      </Animated.View>
    );
  }

  if (mode === 'compact') {
    return (
      <Animated.View
        entering={index < 6 ? FadeInUp.delay(index * 40).duration(260) : undefined}
        style={styles.compactCardWrapper}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.compactCard,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: pressed ? 0.85 : 1 },
          ]}
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
              <Text style={[styles.compactUsername, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
                @{actor.username}
              </Text>
              <Text style={[styles.compactDot, { color: theme.colors.foregroundSubtle }]}>·</Text>
              <Text style={[styles.compactTime, { color: theme.colors.foregroundSubtle }]}>
                {timeAgo(event.created_at ?? bucket.completed_at ?? bucket.created_at)}
              </Text>
            </Pressable>
            <Text style={[styles.compactTitle, { color: theme.colors.foreground }]} numberOfLines={1}>
              {bucket.title}
            </Text>
          </View>

          <View style={styles.compactActions}>
            <View style={styles.compactActionBtn}>
              <Pressable onPress={handleLike} hitSlop={6}>
                <Heart size={16} color={liked ? theme.colors.primary : theme.colors.foregroundSubtle} fill={liked ? theme.colors.primary : 'transparent'} strokeWidth={1.8} />
              </Pressable>
              <Pressable onPress={() => setShowLikes(true)} hitSlop={6}>
                <Text style={[styles.compactActionCount, { color: liked ? theme.colors.primary : theme.colors.foregroundSubtle }]}>{likeCount}</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setShowComments(true)} hitSlop={6} style={styles.compactActionBtn}>
              <MessageCircle size={16} color={theme.colors.foregroundSubtle} strokeWidth={1.8} />
              <Text style={[styles.compactActionCount, { color: theme.colors.foregroundSubtle }]}>{commentCount}</Text>
            </Pressable>

          </View>
        </Pressable>

        {showComments && (
          <TaskCommentsModal
            visible={showComments}
            onClose={() => setShowComments(false)}
            bucketId={bucket.id}
            bucketTitle={bucket.title}
            bucketOwnerId={bucket.user_id}
          />
        )}

        {showLikes && (
          <ItemLikesModal
            visible={showLikes}
            onClose={() => setShowLikes(false)}
            targetId={bucket.id}
            targetType="bucket"
            title={bucket.title}
          />
        )}
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={index < 6 ? FadeInUp.delay(index * 60).duration(260) : undefined}
      style={styles.container}
    >
      {/* Cabecera */}
      <Pressable onPress={openProfile} style={styles.header} accessibilityRole="button">
        <Avatar uri={actor.avatar_url} initials={initialsOf(actor)} size="lg" goldRing />
        <View style={styles.headerText}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Text style={[styles.name, { color: theme.colors.foreground }]} numberOfLines={1}>
              {displayNameOf(actor)}
            </Text>
            {isUserAdmin(actor) && <OfficialBadge size="xs" />}
          </View>
          <Text style={[styles.handle, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
            @{actor.username}
          </Text>
        </View>
        <Text style={[styles.time, { color: theme.colors.foregroundSubtle }]}>{timeAgo(event.created_at ?? bucket.completed_at ?? bucket.created_at)}</Text>
      </Pressable>

      {/* Portada */}
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={bucket.title}>
        <BucketCover
          value={coverValue}
          title={bucket.title}
          categorySlug={bucket.category?.slug}
          seed={bucket.id}
          iconSize={170}
          style={[styles.cover, { borderColor: theme.colors.border }]}
        >
          {!isImageCover && (
            <LinearGradient
              colors={overlay.softFade}
              locations={[0.35, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          )}
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
        <View style={styles.action}>
          <Pressable
            onPress={handleLike}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={liked ? t('feed.unlike', { defaultValue: 'Quitar me gusta' }) : t('feed.like', { defaultValue: 'Me gusta' })}
            accessibilityState={{ selected: liked }}
          >
            <Heart size={24} color={liked ? theme.colors.primary : theme.colors.foreground} fill={liked ? theme.colors.primary : 'transparent'} strokeWidth={1.8} />
          </Pressable>
          <Pressable
            onPress={() => setShowLikes(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('feed.view_likes', { defaultValue: 'Ver me gusta' })}
          >
            <Text style={[styles.count, { color: theme.colors.foreground }]}>{likeCount}</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => setShowComments(true)}
          style={styles.action}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('feed.comments', { defaultValue: 'Comentarios' })}
        >
          <MessageCircle size={24} color={theme.colors.foreground} strokeWidth={1.8} />
          <Text style={[styles.count, { color: theme.colors.foreground }]}>{commentCount}</Text>
        </Pressable>

        <Pressable
          onPress={handleSaveBucket}
          style={styles.action}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={isBucketSaved ? t('feed.unsave_task', { defaultValue: 'Quitar de guardados' }) : t('feed.save_task', { defaultValue: 'Guardar tarea' })}
          disabled={isOwn}
        >
          <Bookmark
            size={22}
            color={isBucketSaved ? gold[400] : theme.colors.foreground}
            fill={isBucketSaved ? gold[400] : 'transparent'}
            strokeWidth={1.8}
          />
          <Text style={[styles.count, { color: isBucketSaved ? gold[400] : theme.colors.foreground }]}>{saveCount}</Text>
        </Pressable>

        <View style={styles.flex} />

        {!isOwn && (
          <Pressable
            onPress={handleCopy}
            disabled={alreadyCopied || copyBucket.isPending}
            style={({ pressed }) => [
              styles.copyButton,
              { borderColor: theme.colors.primary },
              alreadyCopied && [styles.copyButtonDone, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSunken }],
              { opacity: pressed ? 0.75 : 1 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={alreadyCopied ? t('feed.already_in_list', { defaultValue: 'Ya está en tu lista' }) : t('feed.me_too', { defaultValue: 'Yo también' })}
          >
            {alreadyCopied ? <Check size={16} color={theme.colors.foregroundSubtle} style={styles.copyIcon} /> : null}
            <Text style={[styles.copyText, { color: alreadyCopied ? theme.colors.foregroundSubtle : theme.colors.primary }]}>
              {alreadyCopied ? t('feed.in_your_list', { defaultValue: 'En tu lista' }) : t('feed.me_too', { defaultValue: 'Yo también' })}
            </Text>
          </Pressable>
        )}
      </View>

      {caption ? <Text style={[styles.caption, { color: theme.colors.foregroundMuted }]}>{caption}</Text> : null}

      {showComments && (
        <TaskCommentsModal
          visible={showComments}
          onClose={() => setShowComments(false)}
          bucketId={bucket.id}
          bucketTitle={bucket.title}
          bucketOwnerId={bucket.user_id}
        />
      )}

      {showLikes && (
        <ItemLikesModal
          visible={showLikes}
          onClose={() => setShowLikes(false)}
          targetId={bucket.id}
          targetType="bucket"
          title={bucket.title}
        />
      )}
    </Animated.View>
  );
}

export const FeedCard = React.memo(FeedCardComponent);

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
    paddingVertical: 5,
  },
  galleryLeftCol: {
    paddingLeft: 16,
    paddingRight: 5,
  },
  galleryRightCol: {
    paddingLeft: 5,
    paddingRight: 16,
  },
  galleryCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
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
    ...Platform.select({
      web: { textShadow: '0 1px 3px rgba(0,0,0,0.85)' } as any,
      default: {
        textShadowColor: 'rgba(0,0,0,0.85)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
    }),
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
    ...Platform.select({
      web: { textShadow: '0 1px 4px rgba(0,0,0,0.9)' } as any,
      default: {
        textShadowColor: 'rgba(0,0,0,0.9)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      },
    }),
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
    borderWidth: 1,
    borderRadius: 14,
    padding: 10,
    gap: 12,
  },
  compactThumbWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
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
