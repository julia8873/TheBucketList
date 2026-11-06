import { useCoverOverlay, HEART_COLOR } from '@bucketlist/ui';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Check, CheckCircle2, Heart, MessageCircle, Bookmark } from 'lucide-react-native';
import { Avatar, fontFamily, gold, useTheme, toast } from '@bucketlist/ui';
import { BucketCover } from './BucketCover';
import { TaskCommentsModal } from './TaskCommentsModal';
import { ItemLikesModal } from './ItemLikesModal';
import { ParticipantsStack, useParticipantsOf, ParticipantsSheet } from './ItemParticipants';
import { resolveTaskImage } from '../utils/taskImage';
import { useAuthStore } from '../stores/auth.store';
import { useCopiedBucketIds, useCopyBucket, useToggleLike, useBatchBucketSaveCounts, useSavedBucketIds, useToggleSaveBucket } from '../hooks/useSocial';
import { daysBetween, timeAgo } from '../utils/timeAgo';
import { displayNameOf, initialsOf } from '../utils/initials';
import { OfficialBadge, isUserAdmin } from './OfficialBadge';
import { useTranslation } from '@bucketlist/shared';

import type { TaskViewMode } from './ViewModeSelector';

interface FeedCardProps {
  /** { actor, bucket, type, created_at } — en explorar se construye al vuelo. */
  event: any;
  onPress: () => void;
  index: number;
  mode?: TaskViewMode;
  saveCount?: number;
}

/**
 * Momento de un amigo: cabecera (avatar, nombre, @usuario, hace X h),
 * portada con título y lugar, acciones (me gusta, comentarios, "Yo también")
 * y pie con la descripción.
 * Soporta modos: 'list' (por defecto), 'gallery' y 'compact'.
 */
function FeedCardComponent({ event, onPress, index, mode = 'list', saveCount: propSaveCount }: FeedCardProps) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const overlay = useCoverOverlay();
  const router = useRouter();
  const { user } = useAuthStore();
  const [showComments, setShowComments] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
  const toggleLike = useToggleLike();
  const copyBucket = useCopyBucket();
  const { data: copiedIds } = useCopiedBucketIds(user?.id);
  const { data: saveCounts } = useBatchBucketSaveCounts(
    propSaveCount !== undefined || !event?.bucket?.id ? [] : [event.bucket.id]
  );
  const saveCount = propSaveCount ?? saveCounts?.[event?.bucket?.id] ?? 0;

  const actor = event?.actor;
  const bucket = event?.bucket;
  const isOwn = !!user && !!bucket && bucket.user_id === user.id;
  const { data: savedBucketIds } = useSavedBucketIds(isOwn ? undefined : user?.id);
  const toggleSaveBucket = useToggleSaveBucket();
  const participants = useParticipantsOf('task', bucket?.id);

  const [showParticipantsModal, setShowParticipantsModal] = useState(false);

  if (!actor || !bucket) return null;

  // Si el usuario actual es el creador o colabora en la tarea, no debe salir en momentos
  const isCollaborating =
    isOwn ||
    (!!user && !!participants && participants.some((p) => p.id === user.id));
  if (isCollaborating) return null;

  const hasCollabs = !!participants && participants.length > 1;

  const creatorId = bucket?.user_id ?? actor?.id;
  const collaboratorsOnly = React.useMemo(() => {
    if (!participants) return [];
    const collabs = participants.filter((p) => p.id !== creatorId && !p.isOwner);
    return collabs.length > 0 ? collabs : participants.filter((p) => p.id !== actor?.id);
  }, [participants, creatorId, actor?.id]);

  // Textos descriptivos cuando la tarea es colaborativa
  const { collabTitle, collabSubtitle } = React.useMemo(() => {
    if (!hasCollabs || !participants || participants.length < 2) return { collabTitle: '', collabSubtitle: '' };
    const p1 = participants[0];
    const p2 = participants[1];
    if (!p1 || !p2) return { collabTitle: '', collabSubtitle: '' };

    const name1 = displayNameOf(p1);
    const name2 = displayNameOf(p2);
    const isEn = i18n.language === 'en';
    const andWord = isEn ? 'and' : 'y';

    if (participants.length === 2) {
      return {
        collabTitle: `${name1} ${andWord} ${name2}`,
        collabSubtitle: `@${p1.username} · @${p2.username}`,
      };
    }

    const remaining = participants.length - 2;
    const moreWord = isEn
      ? (remaining === 1 ? '1 more' : `${remaining} more`)
      : (remaining === 1 ? '1 más' : `${remaining} más`);
    return {
      collabTitle: `${name1}, ${name2} ${andWord} ${moreWord}`,
      collabSubtitle: `@${p1.username}, @${p2.username} +${remaining}`,
    };
  }, [hasCollabs, participants, i18n.language]);

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
    const timeStr = timeAgo(event.created_at ?? bucket.completed_at ?? bucket.created_at);
    const metaParts: string[] = [];
    if (bucket.location_text) {
      metaParts.push(bucket.location_text);
    }
    if (timeStr) {
      metaParts.push(timeStr);
    }
    const metaText = metaParts.join(' · ');

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
            { backgroundColor: theme.dark ? '#1E1E1E' : '#F0EDE6', borderColor: theme.colors.border, opacity: pressed ? 0.92 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={bucket.title}
        >
          <View style={styles.galleryCover}>
            <BucketCover
              value={coverValue}
              title={bucket.title}
              categorySlug={bucket.category?.slug}
              seed={bucket.id}
              iconSize={44}
              style={StyleSheet.absoluteFill}
            />

            {!isImageCover && (
              <LinearGradient
                colors={overlay.softBoth as any}
                locations={[0, 0.45, 1]}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
            )}

            {/* Badges superiores: Autor + colaboradores solapados a la izquierda, completado a la derecha */}
            <View style={styles.galleryTopBadges} pointerEvents="box-none">
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    openProfile();
                  }}
                  style={[styles.galleryUserBadge, { zIndex: 2 }]}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={actor.username}
                >
                  <Avatar uri={actor.avatar_url} initials={initialsOf(actor)} size="xs" goldRing />
                </Pressable>

                {hasCollabs && collaboratorsOnly.length > 0 && (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      setShowParticipantsModal(true);
                    }}
                    hitSlop={6}
                    style={{ marginLeft: -8, zIndex: 1 }}
                    accessibilityRole="button"
                    accessibilityLabel={t('participants.title', { defaultValue: 'Colaboradores' })}
                  >
                    <ParticipantsStack
                      participants={collaboratorsOnly}
                      max={2}
                      ringColor="rgba(0,0,0,0.5)"
                    />
                  </Pressable>
                )}
              </View>

              {bucket.status === 'completed' && (
                <View style={styles.galleryCompletedBadge}>
                  <CheckCircle2 size={12} color="#FFFFFF" strokeWidth={2.5} />
                </View>
              )}
            </View>

            {/* Overlay inferior estilo mis tareas: título, meta y acciones */}
            <View
              style={[
                styles.galleryBottomOverlay,
                { backgroundColor: isImageCover ? 'rgba(0,0,0,0.58)' : overlay.panel },
              ]}
              pointerEvents="box-none"
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.galleryCardTitle, { color: overlay.title }]} numberOfLines={2}>
                    {bucket.title}
                  </Text>
                  {metaText ? (
                    <Text style={[styles.galleryCardMeta, { color: overlay.meta }]} numberOfLines={1}>
                      {metaText}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View style={styles.galleryActionRow} pointerEvents="box-none">
                <View style={styles.galleryActionsGroup}>
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      handleLike();
                    }}
                    hitSlop={6}
                    style={styles.galleryActionItem}
                  >
                    <Heart
                      size={13}
                      color={liked ? HEART_COLOR : '#F2EFE8'}
                      fill={liked ? HEART_COLOR : 'transparent'}
                      strokeWidth={1.8}
                    />
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setShowLikes(true);
                      }}
                      hitSlop={4}
                    >
                      <Text style={styles.galleryActionText}>{likeCount}</Text>
                    </Pressable>
                  </Pressable>

                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      setShowComments(true);
                    }}
                    hitSlop={6}
                    style={styles.galleryActionItem}
                  >
                    <MessageCircle size={13} color="#F2EFE8" strokeWidth={1.8} />
                    <Text style={styles.galleryActionText}>{commentCount}</Text>
                  </Pressable>

                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      handleSaveBucket();
                    }}
                    hitSlop={6}
                    style={styles.galleryActionItem}
                    disabled={isOwn}
                  >
                    <Bookmark
                      size={12}
                      color={isBucketSaved ? gold[400] : '#F2EFE8'}
                      fill={isBucketSaved ? gold[400] : 'transparent'}
                      strokeWidth={1.8}
                    />
                    <Text style={styles.galleryActionText}>{saveCount}</Text>
                  </Pressable>
                </View>
              </View>
            </View>
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

        {showParticipantsModal && participants && (
          <ParticipantsSheet
            visible={showParticipantsModal}
            participants={participants}
            onClose={() => setShowParticipantsModal(false)}
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
            <Pressable
              onPress={hasCollabs ? () => setShowParticipantsModal(true) : openProfile}
              style={styles.compactUserHeader}
              hitSlop={4}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
                <View style={{ zIndex: 2 }}>
                  <Avatar uri={actor.avatar_url} initials={initialsOf(actor)} size="xs" goldRing />
                </View>
                {hasCollabs && collaboratorsOnly.length > 0 && (
                  <View style={{ marginLeft: -8, zIndex: 1 }}>
                    <ParticipantsStack
                      participants={collaboratorsOnly}
                      max={2}
                      ringColor={theme.colors.surface}
                    />
                  </View>
                )}
              </View>
              <Text
                style={[styles.compactUsername, { color: theme.colors.foregroundMuted, flexShrink: 1 }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {hasCollabs ? collabTitle : `@${actor.username}`}
              </Text>
              <Text style={[styles.compactDot, { color: theme.colors.foregroundSubtle, flexShrink: 0 }]}>·</Text>
              <Text style={[styles.compactTime, { color: theme.colors.foregroundSubtle, flexShrink: 0 }]}>
                {timeAgo(event.created_at ?? bucket.completed_at ?? bucket.created_at)}
              </Text>
            </Pressable>
            <Text style={[styles.compactTitle, { color: theme.colors.foreground }]} numberOfLines={1}>
              {bucket.title}
            </Text>
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

        {showParticipantsModal && participants && (
          <ParticipantsSheet
            visible={showParticipantsModal}
            participants={participants}
            onClose={() => setShowParticipantsModal(false)}
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
      <View style={styles.header}>
        {hasCollabs && participants ? (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={openProfile} accessibilityRole="button" accessibilityLabel={actor.username} style={{ zIndex: 2 }}>
              <Avatar uri={actor.avatar_url} initials={initialsOf(actor)} size="md" goldRing />
            </Pressable>
            {collaboratorsOnly.length > 0 && (
              <Pressable
                onPress={() => setShowParticipantsModal(true)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={t('participants.title', { defaultValue: 'Colaboradores' })}
                style={{ marginLeft: -10, zIndex: 1 }}
              >
                <ParticipantsStack
                  participants={collaboratorsOnly}
                  max={2}
                  ringColor={theme.colors.background}
                />
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable onPress={openProfile} accessibilityRole="button">
            <Avatar uri={actor.avatar_url} initials={initialsOf(actor)} size="lg" goldRing />
          </Pressable>
        )}

        <View style={styles.headerText}>
          {hasCollabs ? (
            <Pressable
              onPress={() => setShowParticipantsModal(true)}
              accessibilityRole="button"
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={[styles.name, { color: theme.colors.foreground }]} numberOfLines={1}>
                  {collabTitle}
                </Text>
              </View>
              <Text style={[styles.handle, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
                {collabSubtitle}
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={openProfile} accessibilityRole="button">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Text style={[styles.name, { color: theme.colors.foreground }]} numberOfLines={1}>
                  {displayNameOf(actor)}
                </Text>
                {isUserAdmin(actor) && <OfficialBadge size="xs" />}
              </View>
              <Text style={[styles.handle, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
                @{actor.username}
              </Text>
            </Pressable>
          )}
        </View>

        <Text style={[styles.time, { color: theme.colors.foregroundSubtle }]}>
          {timeAgo(event.created_at ?? bucket.completed_at ?? bucket.created_at)}
        </Text>
      </View>

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
            {caption ? (
              <Text style={styles.coverDescription} numberOfLines={2}>
                {caption}
              </Text>
            ) : null}
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
            <Heart size={24} color={liked ? HEART_COLOR : theme.colors.foreground} fill={liked ? HEART_COLOR : 'transparent'} strokeWidth={1.8} />
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

      {showParticipantsModal && participants && (
        <ParticipantsSheet
          visible={showParticipantsModal}
          participants={participants}
          onClose={() => setShowParticipantsModal(false)}
        />
      )}
    </Animated.View>
  );
}

export const FeedCard = React.memo(FeedCardComponent);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  collabAvatarCluster: {
    width: 46,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collabSecondAvatar: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderRadius: 999,
    borderWidth: 2,
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
  coverDescription: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 18,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    ...Platform.select({
      web: { textShadow: '0 1px 3px rgba(0,0,0,0.85)' } as any,
      default: {
        textShadowColor: 'rgba(0,0,0,0.85)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
    }),
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
    paddingLeft: 12,
    paddingRight: 5,
  },
  galleryRightCol: {
    paddingLeft: 5,
    paddingRight: 12,
  },
  galleryCard: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  galleryCover: {
    width: '100%',
    aspectRatio: 1 / 1.3,
    position: 'relative',
    ...Platform.select({
      web: { maxHeight: 320 } as any,
    }),
  },
  galleryTopBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  galleryUserBadge: {
    borderRadius: 999,
    ...Platform.select({
      web: { filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.5))' } as any,
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.35,
        shadowRadius: 3,
        elevation: 3,
      },
    }),
  },
  galleryUsername: {
    fontFamily: fontFamily.medium,
    fontSize: 11.5,
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
  galleryCompletedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryBottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    minHeight: 96,
  },
  galleryCardTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    lineHeight: 17,
    minHeight: 34,
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
  galleryCardMeta: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 2,
  },
  galleryActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.14)',
  },
  galleryActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flexShrink: 1,
    minWidth: 0,
  },
  galleryActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  galleryActionText: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: '#F2EFE8',
  },
  // Compacto
  compactCardWrapper: {
    paddingHorizontal: 12,
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
    position: 'relative',
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
