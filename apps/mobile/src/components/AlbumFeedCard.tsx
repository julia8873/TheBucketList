import { useCoverOverlay, HEART_COLOR } from '@bucketlist/ui';
/**
 * AlbumFeedCard — wide card for albums shown in the friends/explore feed.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, useWindowDimensions, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Images, Lock, Users, Heart, Bookmark, MessageCircle, CheckCircle2 } from 'lucide-react-native';
import { Avatar, useTheme, gold, fontFamily, fontSize, radii } from '@bucketlist/ui';
import { useRouter } from 'expo-router';
import { useTranslation } from '@bucketlist/shared';
import { getAlbumStatusType, getStatusConfig } from '../utils/statusBadge';
import type { TaskViewMode } from './ViewModeSelector';
import { useComments } from '../hooks/useSocial';
import { timeAgo as getTimeAgo } from '../utils/timeAgo';
import { TaskCommentsModal } from './TaskCommentsModal';
import { ItemLikesModal } from './ItemLikesModal';
import { ParticipantsStack, useParticipantsOf } from './ItemParticipants';

export interface AlbumFeedItem {
  _type: 'album';
  id: string;
  title: string;
  description?: string | null;
  cover_path?: string | null;
  visibility: string;
  is_shared: boolean;
  priority?: string;
  is_closed?: boolean;
  created_at?: string;
  total_tasks: number;
  completed_tasks: number;
  owner?: {
    id: string;
    username: string;
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
}

interface AlbumFeedCardProps {
  album: AlbumFeedItem;
  colorIndex?: number;
  isLiked?: boolean;
  onToggleLike?: () => void;
  likeCount?: number;
  isSaved?: boolean;
  onToggleSave?: () => void;
  saveCount?: number;
  commentCount?: number;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onPress?: () => void;
  isOwn?: boolean;
  mode?: TaskViewMode;
  index?: number;
  columns?: 2 | 3 | 4;
}

export function AlbumFeedCard({
  album,
  colorIndex = 0,
  isLiked = false,
  onToggleLike,
  likeCount = 0,
  isSaved = false,
  onToggleSave,
  saveCount = 0,
  commentCount: propCommentCount,
  isFavorite = false,
  onToggleFavorite,
  onPress,
  isOwn = false,
  mode = 'list',
  index = 0,
  columns = 2,
}: AlbumFeedCardProps) {
  const { width: windowWidth } = useWindowDimensions();
  const router = useRouter();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const overlay = useCoverOverlay();
  const [showComments, setShowComments] = useState(false);
  const [showLikes, setShowLikes] = useState(false);
  const participants = useParticipantsOf('album', album?.id);
  const hasCollabs = !!participants && participants.length > 1;
  const { data: albumComments = [] } = useComments(album.id, 'album');
  const commentCount = propCommentCount !== undefined ? propCommentCount : albumComments.length;

  const [g1, g2] = overlay.placeholders[colorIndex % overlay.placeholders.length] ?? overlay.placeholders[0]!;
  const progress = album.total_tasks > 0 ? album.completed_tasks / album.total_tasks : 0;
  const albumStatus = getAlbumStatusType(album);
  const statusCfg = getStatusConfig(albumStatus, t, true);

  // Backwards compatibility for onToggleFavorite / isFavorite
  const actualSaved = isSaved || isFavorite;
  const handleSave = onToggleSave || onToggleFavorite;

  // Parse cover_path JSON
  let backgroundContent: React.ReactElement;
  const coverPath = album.cover_path;
  let parsedCover: any = null;
  if (coverPath?.startsWith('{')) {
    try { parsedCover = JSON.parse(coverPath); } catch { /* ignored */ }
  }

  if (parsedCover) {
    if (parsedCover.type === 'image' && parsedCover.uri) {
      backgroundContent = (
        <Image
          source={{ uri: parsedCover.uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      );
    } else if ((parsedCover.type === 'gradient' || parsedCover.type === 'solid') && parsedCover.colors) {
      backgroundContent = (
        <LinearGradient
          colors={parsedCover.colors}
          start={parsedCover.diagonal ? { x: 0, y: 0 } : { x: 0.3, y: 0 }}
          end={parsedCover.diagonal ? { x: 1, y: 1 } : { x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      );
    } else {
      backgroundContent = (
        <LinearGradient colors={[g1, g2]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={StyleSheet.absoluteFill} />
      );
    }
  } else if (coverPath) {
    backgroundContent = (
      <Image
        source={{ uri: coverPath }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
      />
    );
  } else {
    backgroundContent = (
      <LinearGradient colors={[g1, g2]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={StyleSheet.absoluteFill} />
    );
  }

  const ownerName = album.owner?.display_name || album.owner?.username || '';
  const timeAgo = album.created_at ? getTimeAgo(album.created_at) : '';

  if (mode === 'gallery') {
    const is4Cols = columns === 4;
    const is3Cols = columns === 3;
    const cols = columns || 2;
    const colIndex = index % cols;
    const titleBoxHeight = is4Cols ? 24 : is3Cols ? 28 : 34;

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

    return (
      <View
        style={[
          styles.galleryCardWrapper,
          {
            paddingVertical: is4Cols ? 2 : is3Cols ? 3 : 5,
            paddingLeft,
            paddingRight,
          },
        ]}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.galleryCard,
            {
              width: '100%',
              aspectRatio: is4Cols ? 1 / 1.15 : is3Cols ? 1 / 1.25 : 1 / 1.3,
              borderRadius: is4Cols ? 8 : is3Cols ? 10 : 14,
              backgroundColor: theme.dark ? '#1E1E1E' : '#F0EDE6',
              borderColor: theme.colors.border,
              overflow: 'hidden',
              opacity: pressed ? 0.92 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={album.title}
        >
          <View
            style={[
              styles.galleryCover,
              { width: '100%', height: '100%', aspectRatio: undefined, maxHeight: undefined },
            ]}
          >
            {backgroundContent}
            <LinearGradient
              colors={overlay.softBoth}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Badges superiores: autor/colaboradores y badge de álbum */}
            <View
              style={[
                styles.galleryHeaderRow,
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
                    if (album.owner?.id) router.push(`/profile/${album.owner.id}` as any);
                  }}
                  style={styles.galleryHeader}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={album.owner?.username || ownerName}
                >
                  <Avatar
                    source={album.owner?.avatar_url ? { uri: album.owner.avatar_url } : undefined}
                    fallback={ownerName.charAt(0).toUpperCase() || '?'}
                    size="xs"
                    customSize={is4Cols ? 16 : is3Cols ? 20 : undefined}
                    goldRing
                  />
                </Pressable>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: is4Cols ? 3 : is3Cols ? 4 : 6 }}>
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
                {!is4Cols && (
                  <View style={[styles.galleryAlbumBadge, is3Cols && { paddingHorizontal: 4, paddingVertical: 1.5 }]}>
                    <Images size={is3Cols ? 9 : 10} color="rgba(255,255,255,0.95)" />
                    <Text style={[styles.galleryAlbumBadgeText, is3Cols && { fontSize: 8.5 }]}>{t('common.album', { defaultValue: 'Álbum' })}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Overlay inferior estilo mis tareas: título, meta, acciones y colaboradores */}
            <View
              style={[
                styles.galleryBottom,
                is3Cols && { paddingHorizontal: 6, paddingVertical: 4, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
                is4Cols && { paddingHorizontal: 4, paddingVertical: 3, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
              ]}
              pointerEvents="box-none"
            >
              <View style={{ height: titleBoxHeight, justifyContent: 'center' }}>
                <Text
                  style={[
                    styles.galleryTitle,
                    is3Cols && { fontSize: 11, lineHeight: 14 },
                    is4Cols && { fontSize: 9.5, lineHeight: 12 },
                  ]}
                  numberOfLines={2}
                >
                  {album.title}
                </Text>
              </View>
              {!is4Cols && (
                <Text
                  style={[
                    styles.gallerySubtext,
                    is3Cols && { fontSize: 9, lineHeight: 12, marginTop: 1 },
                  ]}
                  numberOfLines={1}
                >
                  {album.completed_tasks}/{album.total_tasks} {t('albums.tasks', { defaultValue: 'tareas' })}
                </Text>
              )}

              {!is4Cols && (
                <View
                  style={[
                    styles.galleryActionRow,
                    is3Cols && { marginTop: 3, paddingTop: 3 },
                  ]}
                  pointerEvents="box-none"
                >
                  <View
                    style={[
                      styles.galleryActionsGroup,
                      is3Cols && { gap: 4 },
                    ]}
                  >
                    {onToggleLike && (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          onToggleLike();
                        }}
                        hitSlop={6}
                        style={[styles.galleryActionItem, is3Cols && { gap: 2.5 }]}
                      >
                        <Heart
                          size={is3Cols ? 11 : 13}
                          color={isLiked ? HEART_COLOR : '#F2EFE8'}
                          fill={isLiked ? HEART_COLOR : 'transparent'}
                          strokeWidth={1.8}
                        />
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            setShowLikes(true);
                          }}
                          hitSlop={4}
                        >
                          <Text style={[styles.galleryActionText, is3Cols && { fontSize: 9.5 }]}>{likeCount}</Text>
                        </Pressable>
                      </Pressable>
                    )}

                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setShowComments(true);
                      }}
                      hitSlop={6}
                      style={[styles.galleryActionItem, is3Cols && { gap: 2.5 }]}
                    >
                      <MessageCircle size={is3Cols ? 11 : 13} color="#F2EFE8" strokeWidth={1.8} />
                      <Text style={[styles.galleryActionText, is3Cols && { fontSize: 9.5 }]}>{commentCount}</Text>
                    </Pressable>

                    {handleSave ? (
                      <Pressable
                        onPress={(e) => {
                          e.stopPropagation();
                          handleSave();
                        }}
                        hitSlop={6}
                        style={[styles.galleryActionItem, is3Cols && { gap: 2.5 }]}
                        disabled={isOwn}
                      >
                        <Bookmark
                          size={is3Cols ? 10.5 : 12}
                          color={actualSaved ? gold[400] : '#F2EFE8'}
                          fill={actualSaved ? gold[400] : 'transparent'}
                          strokeWidth={1.8}
                        />
                        <Text style={[styles.galleryActionText, is3Cols && { fontSize: 9.5 }]}>{saveCount}</Text>
                      </Pressable>
                    ) : (
                      <View style={[styles.galleryActionItem, is3Cols && { gap: 2.5 }]}>
                        <Bookmark
                          size={is3Cols ? 10.5 : 12}
                          color="#F2EFE8"
                          strokeWidth={1.8}
                        />
                        <Text style={[styles.galleryActionText, is3Cols && { fontSize: 9.5 }]}>{saveCount}</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>
          </View>
        </Pressable>

        {showComments && (
          <TaskCommentsModal
            visible={showComments}
            onClose={() => setShowComments(false)}
            albumId={album.id}
            targetType="album"
            albumTitle={album.title}
            albumOwnerId={album.owner?.id}
          />
        )}

        {showLikes && (
          <ItemLikesModal
            visible={showLikes}
            onClose={() => setShowLikes(false)}
            targetId={album.id}
            targetType="album"
            title={album.title}
          />
        )}
      </View>
    );
  }

  if (mode === 'compact') {
    return (
      <View style={styles.compactCardWrapper}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.compactCard,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, opacity: pressed ? 0.85 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={album.title}
        >
          <View style={styles.compactThumbWrapper}>
            {backgroundContent}
          </View>

          <View style={styles.compactInfo}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                if (album.owner?.id) router.push(`/profile/${album.owner.id}` as any);
              }}
              style={styles.compactUserHeader}
              hitSlop={4}
            >
              <Avatar
                source={album.owner?.avatar_url ? { uri: album.owner.avatar_url } : undefined}
                fallback={ownerName.charAt(0).toUpperCase() || '?'}
                size="xs"
              />
              <Text style={[styles.compactUsername, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
                @{album.owner?.username || ownerName}
              </Text>
              <Text style={[styles.compactDot, { color: theme.colors.foregroundSubtle }]}>·</Text>
              <Text style={[styles.compactTime, { color: theme.colors.foregroundSubtle }]} numberOfLines={1}>
                {album.completed_tasks}/{album.total_tasks}
              </Text>
            </Pressable>
            <Text style={[styles.compactTitle, { color: theme.colors.foreground }]} numberOfLines={1}>
              {album.title}
            </Text>
          </View>
        </Pressable>

        {showComments && (
          <TaskCommentsModal
            visible={showComments}
            onClose={() => setShowComments(false)}
            albumId={album.id}
            targetType="album"
            albumTitle={album.title}
            albumOwnerId={album.owner?.id}
          />
        )}

        {showLikes && (
          <ItemLikesModal
            visible={showLikes}
            onClose={() => setShowLikes(false)}
            targetId={album.id}
            targetType="album"
            title={album.title}
          />
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.card,
        { borderColor: theme.dark ? '#2A2A2A' : '#E0D9CE' },
      ]}
    >
      {/* Cover */}
      <View style={styles.coverWrapper}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [StyleSheet.absoluteFill, { opacity: pressed ? 0.92 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel={album.title}
        >
          {backgroundContent}
          <LinearGradient
            colors={overlay.softFade}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[StyleSheet.absoluteFill, { top: '35%' }]}
          />

          {/* Cover bottom: title + progress */}
          <View style={styles.coverBottom}>
            <Text style={styles.title} numberOfLines={2}>{album.title}</Text>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
            </View>
          </View>
        </Pressable>

        {/* Top Badges (columna a la izquierda con estado y Álbum) */}
        <View style={styles.topBadgesContainer} pointerEvents="none">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
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

            <View style={styles.topBadge}>
              <Images size={12} color="rgba(255,255,255,0.9)" strokeWidth={2} />
              <Text style={styles.topBadgeText}>Álbum</Text>
            </View>
          </View>

          {album.is_closed && (
            <View style={styles.closedBadge}>
              <Lock size={10} color={gold[400]} />
              <Text style={styles.closedText}>Cerrado</Text>
            </View>
          )}
        </View>

        {/* Top Right Buttons: Like and/or Save */}
        <View style={styles.topActions} pointerEvents="box-none">
          {onToggleLike && (
            <View style={styles.actionBtn}>
              <Pressable
                onPress={onToggleLike}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={isLiked ? 'Quitar me gusta' : 'Dar me gusta'}
              >
                <Heart
                  size={16}
                  color={isLiked ? HEART_COLOR : 'rgba(255,255,255,0.85)'}
                  fill={isLiked ? HEART_COLOR : 'transparent'}
                  strokeWidth={2}
                />
              </Pressable>
              {likeCount > 0 && (
                <Pressable onPress={() => setShowLikes(true)} hitSlop={8}>
                  <Text style={styles.actionCount}>{likeCount}</Text>
                </Pressable>
              )}
            </View>
          )}

          <Pressable
            onPress={() => setShowComments(true)}
            hitSlop={10}
            style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Comentarios"
          >
            <MessageCircle
              size={16}
              color="rgba(255,255,255,0.85)"
              strokeWidth={2}
            />
            {commentCount > 0 && <Text style={styles.actionCount}>{commentCount}</Text>}
          </Pressable>

          {handleSave ? (
            <Pressable
              onPress={handleSave}
              hitSlop={10}
              style={({ pressed }) => [
                styles.actionBtn,
                actualSaved && styles.savedBtnActive,
                pressed && { opacity: 0.7 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={actualSaved ? 'Quitar de guardados' : 'Guardar álbum'}
              disabled={isOwn}
            >
              <Bookmark
                size={16}
                color={actualSaved ? gold[400] : 'rgba(255,255,255,0.85)'}
                fill={actualSaved ? gold[400] : 'transparent'}
                strokeWidth={2}
              />
              <Text style={styles.actionCount}>{saveCount}</Text>
            </Pressable>
          ) : (
            <View style={styles.actionBtn}>
              <Bookmark
                size={16}
                color="rgba(255,255,255,0.85)"
                strokeWidth={2}
              />
              <Text style={styles.actionCount}>{saveCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Footer: owner info + meta */}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.footer,
          { backgroundColor: theme.dark ? '#111' : '#FAF8F4', opacity: pressed ? 0.85 : 1 },
        ]}
        accessibilityRole="button"
      >
        <View style={styles.ownerRow}>
          <Pressable
            hitSlop={8}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}
            onPress={(e) => {
              e.stopPropagation();
              if (album.owner?.id) {
                router.push(`/profile/${album.owner.id}` as any);
              }
            }}
            accessibilityRole="button"
            accessibilityLabel={`Perfil de ${ownerName}`}
          >
            <Avatar
              source={album.owner?.avatar_url ? { uri: album.owner.avatar_url } : undefined}
              fallback={ownerName.charAt(0).toUpperCase() || '?'}
              size="xs"
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.ownerName, { color: theme.colors.foreground }]} numberOfLines={1}>
                {ownerName}
              </Text>
              {timeAgo ? (
                <Text style={[styles.timeAgo, { color: theme.colors.foregroundMuted }]}>
                  {timeAgo}
                </Text>
              ) : null}
            </View>
          </Pressable>

          <Text style={[styles.taskCount, { color: theme.colors.foregroundMuted }]}>
            {album.completed_tasks}/{album.total_tasks} {t('feed.filter_tasks', { defaultValue: 'tareas' }).toLowerCase()}
          </Text>
        </View>
      </Pressable>

      {showComments && (
        <TaskCommentsModal
          visible={showComments}
          onClose={() => setShowComments(false)}
          albumId={album.id}
          targetType="album"
          albumTitle={album.title}
          albumOwnerId={album.owner?.id}
        />
      )}

      {showLikes && (
        <ItemLikesModal
          visible={showLikes}
          onClose={() => setShowLikes(false)}
          targetId={album.id}
          targetType="album"
          title={album.title}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginBottom: 14,
    borderRadius: radii.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  coverWrapper: {
    height: 190,
    position: 'relative',
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
  topBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  topBadgeText: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  closedText: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: gold[400],
  },
  sharedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sharedText: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: '#FFF',
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
    marginBottom: 8,
    ...Platform.select({
      web: { textShadow: '0 1px 3px rgba(0,0,0,0.4)' } as any,
      default: {
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
      },
    }),
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: gold[400],
    borderRadius: 2,
  },
  footer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
  saveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 177, 58, 0.12)',
  },
  saveBadgeText: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
  },
  taskCount: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
  },
  // Gallery mode styles
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
    height: '100%',
    position: 'relative',
  },
  galleryHeaderRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  galleryHeader: {
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
  galleryAlbumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  galleryCompletedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryAlbumBadgeText: {
    fontFamily: fontFamily.semibold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.95)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  galleryBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.58)',
    zIndex: 2,
  },
  galleryTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 13,
    lineHeight: 17,
    color: '#FFFFFF',
    includeFontPadding: false,
    ...Platform.select({
      web: { textShadow: '0 1px 4px rgba(0,0,0,0.9)' } as any,
      default: {
        textShadowColor: 'rgba(0,0,0,0.9)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      },
    }),
  },
  gallerySubtext: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 14,
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
    gap: 10,
  },
  galleryActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  galleryActionText: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: '#F2EFE8',
  },
  // Compact mode styles
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
    minWidth: 0,
  },
  compactUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactUsername: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    flexShrink: 1,
  },
  compactDot: {
    fontSize: 12,
  },
  compactTime: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    flexShrink: 0,
  },
  compactTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: 14,
    lineHeight: 18,
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
  },
});
