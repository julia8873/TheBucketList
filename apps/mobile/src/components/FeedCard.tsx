import { useCoverOverlay, HEART_COLOR } from '@bucketlist/ui';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View, Platform, useWindowDimensions, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Check, CheckCircle2, Heart, MessageCircle, Bookmark } from 'lucide-react-native';
import { Avatar, fontFamily, gold, useTheme, toast, radii } from '@bucketlist/ui';
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
import { CloneTaskDialog } from './CloneTaskDialog';
import { useCloneTaskPreferencesStore, type CloneTaskFields } from '../stores/cloneTaskPreferences.store';
import { useTranslation } from '@bucketlist/shared';
import { getTaskStatusType, getStatusConfig } from '../utils/statusBadge';

import type { TaskViewMode } from './ViewModeSelector';

interface FeedCardProps {
  /** { actor, bucket, type, created_at } — en explorar se construye al vuelo. */
  event: any;
  onPress: () => void;
  index: number;
  mode?: TaskViewMode;
  saveCount?: number;
  columns?: 2 | 3 | 4;
}

/**
 * Momento de un amigo: cabecera (avatar, nombre, @usuario, hace X h),
 * portada con título y lugar, acciones (me gusta, comentarios, "Yo también")
 * y pie con la descripción.
 * Soporta modos: 'list' (por defecto), 'gallery' y 'compact'.
 */
function FeedCardComponent({ event, onPress, index, mode = 'list', saveCount: propSaveCount, columns = 2 }: FeedCardProps) {
  const { width: windowWidth } = useWindowDimensions();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const overlay = useCoverOverlay();
  const router = useRouter();
  const { user } = useAuthStore();
  const [showComments, setShowComments] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const { askEveryTime, fields: cloneFields, savePreferences } = useCloneTaskPreferencesStore();
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

  const creatorId = bucket?.user_id ?? actor?.id;
  const hasCollabs = !!participants && participants.length > 1;

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

  if (!actor || !bucket) return null;

  const statusType = getTaskStatusType(bucket);
  const statusCfg = getStatusConfig(statusType, t);

  // Si el usuario actual es el creador o colabora en la tarea, no debe salir en momentos
  const isCollaborating =
    isOwn ||
    (!!user && !!participants && participants.some((p) => p.id === user.id));
  if (isCollaborating) return null;

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

  const performCopy = (options: CloneTaskFields) => {
    if (!user) return;
    copyBucket.mutate(
      { bucketId: bucket.id, userId: user.id, options },
      {
        onSuccess: () => {
          setShowCloneDialog(false);
          toast.success(t('feed.copy_success', { defaultValue: '¡Tarea añadida a tu lista!' }));
        },
        onError: (error: any) =>
          toast.error(error?.message ?? t('feed.copy_error', { defaultValue: 'No se pudo añadir. Inténtalo de nuevo.' })),
      }
    );
  };

  const handleCopy = () => {
    if (!user || alreadyCopied || copyBucket.isPending) return;
    if (askEveryTime) {
      setShowCloneDialog(true);
      return;
    }
    performCopy(cloneFields);
  };

  const handleConfirmClone = (options: CloneTaskFields, dontAskAgain: boolean) => {
    if (dontAskAgain) {
      savePreferences(false, options);
    }
    performCopy(options);
  };

  if (mode === 'gallery') {
    const is4Cols = columns === 4;
    const is3Cols = columns === 3;
    const cols = columns || 2;
    const colIndex = index % cols;

    // Cálculo de ancho y alto fijos idénticos para que todas las tarjetas midan exactamente lo mismo
    const screenWidth = windowWidth > 0 ? windowWidth : Dimensions.get('window').width;
    const sideMargin = is4Cols ? 6 : 12;
    const totalGaps = is4Cols ? 3 * 4 : is3Cols ? 2 * 6 : 10;
    const availableWidth = screenWidth - (sideMargin * 2) - totalGaps;
    const cardWidth = Math.floor(availableWidth / cols);
    const ratio = is4Cols ? 1.15 : is3Cols ? 1.25 : 1.3;
    const cardHeight = Math.floor(cardWidth * ratio);

    let paddingLeft = 0;
    let paddingRight = 0;
    if (is4Cols) {
      if (colIndex === 0) {
        paddingLeft = 6;
        paddingRight = 0;
      } else if (colIndex === 1) {
        paddingLeft = 4;
        paddingRight = 2;
      } else if (colIndex === 2) {
        paddingLeft = 2;
        paddingRight = 4;
      } else {
        paddingLeft = 0;
        paddingRight = 6;
      }
    } else if (is3Cols) {
      if (colIndex === 0) {
        paddingLeft = 12;
        paddingRight = 0;
      } else if (colIndex === 1) {
        paddingLeft = 6;
        paddingRight = 6;
      } else {
        paddingLeft = 0;
        paddingRight = 12;
      }
    } else {
      if (colIndex === 0) {
        paddingLeft = 12;
        paddingRight = 5;
      } else {
        paddingLeft = 5;
        paddingRight = 12;
      }
    }

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
        entering={index < 8 ? FadeInUp.delay(index * 35).duration(240) : undefined}
        style={[
          styles.galleryCardWrapper,
          {
            paddingVertical: is4Cols ? 2 : is3Cols ? 3 : 5,
            paddingLeft,
            paddingRight,
            alignItems: 'center',
          },
        ]}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.galleryCard,
            {
              width: cardWidth,
              height: cardHeight,
              borderRadius: is4Cols ? 8 : is3Cols ? 10 : 14,
              backgroundColor: theme.dark ? '#1E1E1E' : '#F0EDE6',
              borderColor: theme.colors.border,
              opacity: pressed ? 0.92 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={bucket.title}
        >
          <View
            style={[
              styles.galleryCover,
              { width: cardWidth, height: cardHeight, aspectRatio: undefined, maxHeight: undefined },
            ]}
          >
            <BucketCover
              value={coverValue}
              title={bucket.title}
              categorySlug={bucket.category?.slug}
              seed={bucket.id}
              iconSize={is4Cols ? 26 : is3Cols ? 34 : 44}
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
            <View
              style={[
                styles.galleryTopBadges,
                is4Cols && { top: 4, left: 4, right: 4 },
                is3Cols && { top: 5, left: 5, right: 5 },
              ]}
              pointerEvents="box-none"
            >
              {hasCollabs && participants ? (
                <ParticipantsStack
                  participants={participants}
                  max={2}
                  size="xs"
                  bubbleSize={is4Cols ? 16 : is3Cols ? 18 : undefined}
                  ringColor="rgba(0,0,0,0.55)"
                />
              ) : (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    openProfile();
                  }}
                  style={styles.galleryUserBadge}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={actor.username}
                >
                  <Avatar
                    uri={actor.avatar_url}
                    initials={initialsOf(actor)}
                    size="xs"
                    customSize={is4Cols ? 16 : is3Cols ? 20 : undefined}
                    goldRing
                  />
                </Pressable>
              )}

              <View
                style={[
                  styles.galleryCompletedBadge,
                  is3Cols && { width: 18, height: 18, borderRadius: 9 },
                  is4Cols && { width: 16, height: 16, borderRadius: 8 },
                  { backgroundColor: statusCfg.badgeBg },
                ]}
              >
                {statusCfg.renderGalleryIcon(is4Cols ? 9 : is3Cols ? 10 : 12)}
              </View>
            </View>

            {/* Overlay inferior estilo mis tareas: título, meta y acciones */}
            <View
              style={[
                styles.galleryBottomOverlay,
                { backgroundColor: isImageCover ? 'rgba(0,0,0,0.58)' : overlay.panel },
                is3Cols && { minHeight: 56, paddingHorizontal: 6, paddingVertical: 4, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
                is4Cols && { minHeight: 40, paddingHorizontal: 4, paddingVertical: 2, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
              ]}
              pointerEvents="box-none"
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.galleryCardTitle,
                      { color: overlay.title },
                      is3Cols && { fontSize: 11, lineHeight: 14, minHeight: 24 },
                      is4Cols && { fontSize: 9.5, lineHeight: 12, minHeight: 12 },
                    ]}
                    numberOfLines={is4Cols ? 1 : 2}
                  >
                    {bucket.title}
                  </Text>
                  {!is4Cols && metaText ? (
                    <Text
                      style={[
                        styles.galleryCardMeta,
                        { color: overlay.meta },
                        is3Cols && { fontSize: 9, marginTop: 1 },
                      ]}
                      numberOfLines={1}
                    >
                      {metaText}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View
                style={[
                  styles.galleryActionRow,
                  is3Cols && { marginTop: 3, paddingTop: 3 },
                  is4Cols && { marginTop: 2, paddingTop: 2 },
                ]}
                pointerEvents="box-none"
              >
                <View
                  style={[
                    styles.galleryActionsGroup,
                    is3Cols && { gap: 4 },
                    is4Cols && { gap: 3 },
                  ]}
                >
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      handleLike();
                    }}
                    hitSlop={6}
                    style={[styles.galleryActionItem, is4Cols && { gap: 2 }, is3Cols && { gap: 2.5 }]}
                  >
                    <Heart
                      size={is4Cols ? 9.5 : is3Cols ? 11 : 13}
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
                      <Text style={[styles.galleryActionText, is3Cols && { fontSize: 9.5 }, is4Cols && { fontSize: 8 }]}>
                        {likeCount}
                      </Text>
                    </Pressable>
                  </Pressable>

                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      setShowComments(true);
                    }}
                    hitSlop={6}
                    style={[styles.galleryActionItem, is4Cols && { gap: 2 }, is3Cols && { gap: 2.5 }]}
                  >
                    <MessageCircle size={is4Cols ? 9.5 : is3Cols ? 11 : 13} color="#F2EFE8" strokeWidth={1.8} />
                    <Text style={[styles.galleryActionText, is3Cols && { fontSize: 9.5 }, is4Cols && { fontSize: 8 }]}>
                      {commentCount}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      handleSaveBucket();
                    }}
                    hitSlop={6}
                    style={[styles.galleryActionItem, is4Cols && { gap: 2 }, is3Cols && { gap: 2.5 }]}
                    disabled={isOwn}
                  >
                    <Bookmark
                      size={is4Cols ? 9 : is3Cols ? 10.5 : 12}
                      color={isBucketSaved ? gold[400] : '#F2EFE8'}
                      fill={isBucketSaved ? gold[400] : 'transparent'}
                      strokeWidth={1.8}
                    />
                    <Text style={[styles.galleryActionText, is3Cols && { fontSize: 9.5 }, is4Cols && { fontSize: 8 }]}>
                      {saveCount}
                    </Text>
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
              {hasCollabs && participants ? (
                <ParticipantsStack
                  participants={participants}
                  max={2}
                  size="xs"
                  ringColor={theme.colors.surface}
                  style={{ marginRight: 2 }}
                />
              ) : (
                <Avatar uri={actor.avatar_url} initials={initialsOf(actor)} size="xs" goldRing />
              )}
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
      style={[
        styles.card,
        { borderColor: theme.dark ? '#2A2A2A' : '#E0D9CE' },
      ]}
    >
      {/* Portada */}
      <View style={styles.coverWrapper}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [StyleSheet.absoluteFill, { opacity: pressed ? 0.92 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={bucket.title}
        >
          <BucketCover
            value={coverValue}
            title={bucket.title}
            categorySlug={bucket.category?.slug}
            seed={bucket.id}
            iconSize={150}
            style={StyleSheet.absoluteFill}
          />

          {!isImageCover && (
            <LinearGradient
              colors={overlay.softFade}
              locations={[0.35, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
          )}

          {/* Cover bottom: title + description + location */}
          <View style={styles.coverBottom} pointerEvents="none">
            <Text style={styles.title} numberOfLines={2}>
              {bucket.title}
            </Text>
            {caption ? (
              <Text style={styles.coverDescription} numberOfLines={1}>
                {caption}
              </Text>
            ) : null}
            {bucket.location_text ? (
              <Text style={styles.coverLocation} numberOfLines={1}>
                {bucket.location_text}
              </Text>
            ) : null}
          </View>
        </Pressable>

        {/* Top Badges (columna a la izquierda con estado) */}
        <View style={styles.topBadgesContainer} pointerEvents="box-none">
          <View
            style={[
              styles.galleryCompletedBadge,
              {
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: statusCfg.badgeBg,
              },
            ]}
          >
            {statusCfg.renderGalleryIcon(13)}
          </View>
        </View>

        {/* Top Right Buttons: Like, Comment, Save */}
        <View style={styles.topActions} pointerEvents="box-none">
          <View style={styles.actionBtn}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                handleLike();
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={liked ? t('feed.unlike', { defaultValue: 'Quitar me gusta' }) : t('feed.like', { defaultValue: 'Me gusta' })}
              accessibilityState={{ selected: liked }}
            >
              <Heart
                size={16}
                color={liked ? HEART_COLOR : 'rgba(255,255,255,0.85)'}
                fill={liked ? HEART_COLOR : 'transparent'}
                strokeWidth={2}
              />
            </Pressable>
            {likeCount > 0 && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  setShowLikes(true);
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={t('feed.view_likes', { defaultValue: 'Ver me gusta' })}
              >
                <Text style={styles.actionCount}>{likeCount}</Text>
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              setShowComments(true);
            }}
            hitSlop={10}
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={t('feed.comments', { defaultValue: 'Comentarios' })}
          >
            <MessageCircle
              size={16}
              color="rgba(255,255,255,0.85)"
              strokeWidth={2}
            />
            {commentCount > 0 && <Text style={styles.actionCount}>{commentCount}</Text>}
          </Pressable>

          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              handleSaveBucket();
            }}
            hitSlop={10}
            style={({ pressed }) => [
              styles.actionBtn,
              isBucketSaved && styles.savedBtnActive,
              pressed && { opacity: 0.7 },
            ]}
            accessibilityRole="button"
            accessibilityLabel={isBucketSaved ? t('feed.unsave_task', { defaultValue: 'Quitar de guardados' }) : t('feed.save_task', { defaultValue: 'Guardar tarea' })}
            disabled={isOwn}
          >
            <Bookmark
              size={16}
              color={isBucketSaved ? gold[400] : 'rgba(255,255,255,0.85)'}
              fill={isBucketSaved ? gold[400] : 'transparent'}
              strokeWidth={2}
            />
            <Text style={[styles.actionCount, isBucketSaved && { color: gold[400] }]}>{saveCount}</Text>
          </Pressable>
        </View>
      </View>

      {/* Footer: info de usuario a la izquierda y 'Yo también' a la derecha */}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.footer,
          { backgroundColor: theme.dark ? '#111' : '#FAF8F4', opacity: pressed ? 0.95 : 1 },
        ]}
        accessibilityRole="button"
      >
        <View style={styles.ownerRow}>
          {hasCollabs && participants ? (
            <Pressable
              hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}
              onPress={(e) => {
                e.stopPropagation();
                setShowParticipantsModal(true);
              }}
              accessibilityRole="button"
            >
              <ParticipantsStack
                participants={participants}
                max={2}
                size="xs"
                ringColor={theme.colors.surface}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.ownerName, { color: theme.colors.foreground }]} numberOfLines={1}>
                  {collabTitle}
                </Text>
                <Text style={[styles.timeAgo, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
                  {collabSubtitle} · {timeAgo(event.created_at ?? bucket.completed_at ?? bucket.created_at)}
                </Text>
              </View>
            </Pressable>
          ) : (
            <Pressable
              hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}
              onPress={(e) => {
                e.stopPropagation();
                openProfile();
              }}
              accessibilityRole="button"
              accessibilityLabel={`Perfil de ${displayNameOf(actor)}`}
            >
              <Avatar uri={actor.avatar_url} initials={initialsOf(actor)} size="xs" goldRing />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={[styles.ownerName, { color: theme.colors.foreground }]} numberOfLines={1}>
                    {displayNameOf(actor)}
                  </Text>
                  {isUserAdmin(actor) && <OfficialBadge size="xs" />}
                </View>
                <Text style={[styles.timeAgo, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
                  @{actor.username} · {timeAgo(event.created_at ?? bucket.completed_at ?? bucket.created_at)}
                </Text>
              </View>
            </Pressable>
          )}

          {!isOwn && (
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                handleCopy();
              }}
              disabled={alreadyCopied || copyBucket.isPending}
              style={({ pressed }) => [
                styles.copyButton,
                { borderColor: theme.colors.primary },
                alreadyCopied && [
                  styles.copyButtonDone,
                  { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSunken },
                ],
                { opacity: pressed ? 0.75 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={
                alreadyCopied
                  ? t('feed.already_in_list', { defaultValue: 'Ya está en tu lista' })
                  : t('feed.me_too', { defaultValue: 'Yo también' })
              }
            >
              {alreadyCopied ? (
                <Check size={13} color={theme.colors.foregroundSubtle} style={{ marginRight: 4 }} />
              ) : null}
              <Text
                style={[
                  styles.copyText,
                  { color: alreadyCopied ? theme.colors.foregroundSubtle : theme.colors.primary },
                ]}
              >
                {alreadyCopied
                  ? t('feed.in_your_list', { defaultValue: 'En tu lista' })
                  : t('feed.me_too', { defaultValue: 'Yo también' })}
              </Text>
            </Pressable>
          )}
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

      {showCloneDialog && (
        <CloneTaskDialog
          visible={showCloneDialog}
          onClose={() => setShowCloneDialog(false)}
          onConfirm={handleConfirmClone}
          taskTitle={bucket.title}
          isLoading={copyBucket.isPending}
        />
      )}
    </Animated.View>
  );
}

export const FeedCard = React.memo(FeedCardComponent);

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginBottom: 14,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  coverWrapper: {
    height: 195,
    position: 'relative',
  },
  coverBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    zIndex: 2,
  },
  title: {
    fontFamily: fontFamily.serifBold,
    fontSize: 20,
    color: '#FFF',
    lineHeight: 25,
    marginBottom: 2,
    ...Platform.select({
      web: { textShadow: '0 1px 3px rgba(0,0,0,0.4)' } as any,
      default: {
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
    }),
  },
  coverDescription: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 17,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
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
    fontSize: 12,
    color: 'rgba(255,255,255,0.78)',
    marginTop: 2,
  },
  topActions: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 20,
    justifyContent: 'center',
  },
  savedBtnActive: {
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  actionCount: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: '#FFF',
  },
  topBadgesContainer: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 6,
    zIndex: 2,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  completedText: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  ownerName: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
  },
  timeAgo: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    marginTop: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: gold[400],
  },
  copyButtonDone: {
    borderColor: '#2A2A2A',
    backgroundColor: '#161616',
  },
  copyText: {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    color: gold[400],
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
    alignItems: 'flex-start',
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
