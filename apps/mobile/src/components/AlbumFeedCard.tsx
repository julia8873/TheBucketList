/**
 * AlbumFeedCard — wide card for albums shown in the friends/explore feed.
 */
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Images, Lock, Users, Heart, Bookmark, MessageCircle } from 'lucide-react-native';
import { Avatar, useTheme, gold, fontFamily, fontSize, radii } from '@bucketlist/ui';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { TaskViewMode } from './ViewModeSelector';
import { useComments } from '../hooks/useSocial';
import { TaskCommentsModal } from './TaskCommentsModal';

// Gradient fallbacks when no cover
const COVER_GRADIENTS: Array<[string, string]> = [
  ['#1B4D3E', '#0A2E25'],
  ['#C87A2B', '#7A3D00'],
  ['#2B5BA8', '#0D2F6E'],
  ['#6B2FA0', '#3A0070'],
  ['#8B3A3A', '#4A0E0E'],
  ['#2D6A4F', '#1B4332'],
];

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
}: AlbumFeedCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const [showComments, setShowComments] = useState(false);
  const { data: albumComments = [] } = useComments(album.id, 'album');
  const commentCount = propCommentCount !== undefined ? propCommentCount : albumComments.length;

  const [g1, g2] = COVER_GRADIENTS[colorIndex % COVER_GRADIENTS.length] ?? ['#1B4D3E', '#0A2E25'];
  const progress = album.total_tasks > 0 ? album.completed_tasks / album.total_tasks : 0;

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
        <Image source={{ uri: parsedCover.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
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
      <Image source={{ uri: coverPath }} style={StyleSheet.absoluteFill} contentFit="cover" />
    );
  } else {
    backgroundContent = (
      <LinearGradient colors={[g1, g2]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={StyleSheet.absoluteFill} />
    );
  }

  const ownerName = album.owner?.display_name || album.owner?.username || '';
  const timeAgo = album.created_at
    ? formatDistanceToNow(new Date(album.created_at), { addSuffix: true, locale: es })
    : '';

  if (mode === 'gallery') {
    const isLeftColumn = index % 2 === 0;
    return (
      <View
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
          accessibilityLabel={album.title}
        >
          <View style={styles.galleryCover}>
            {backgroundContent}
            <LinearGradient
              colors={['rgba(0,0,0,0.65)', 'transparent', 'rgba(0,0,0,0.88)']}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* Header flotante: autor y badge de álbum */}
            <View style={styles.galleryHeaderRow}>
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  if (album.owner?.id) router.push(`/profile/${album.owner.id}` as any);
                }}
                style={styles.galleryHeader}
                hitSlop={6}
                accessibilityRole="button"
              >
                <Avatar
                  source={album.owner?.avatar_url ? { uri: album.owner.avatar_url } : undefined}
                  fallback={ownerName.charAt(0).toUpperCase() || '?'}
                  size="xs"
                />
                <Text style={styles.galleryUsername} numberOfLines={1}>
                  @{album.owner?.username || ownerName}
                </Text>
              </Pressable>

              <View style={styles.galleryAlbumBadge}>
                <Images size={10} color="rgba(255,255,255,0.95)" />
                <Text style={styles.galleryAlbumBadgeText}>Álbum</Text>
              </View>
            </View>

            {/* Pie: título, progreso y acciones */}
            <View style={styles.galleryBottom} pointerEvents="box-none">
              <Text style={styles.galleryTitle} numberOfLines={2}>
                {album.title}
              </Text>
              <Text style={styles.gallerySubtext} numberOfLines={1}>
                {album.completed_tasks}/{album.total_tasks} tareas
              </Text>

              <View style={styles.galleryActions}>
                {onToggleLike && (
                  <Pressable onPress={onToggleLike} hitSlop={6} style={styles.galleryActionItem}>
                    <Heart
                      size={14}
                      color={isLiked ? '#EF4444' : '#F2EFE8'}
                      fill={isLiked ? '#EF4444' : 'transparent'}
                      strokeWidth={1.8}
                    />
                    {likeCount > 0 && <Text style={styles.galleryActionText}>{likeCount}</Text>}
                  </Pressable>
                )}

                <Pressable onPress={() => setShowComments(true)} hitSlop={6} style={styles.galleryActionItem}>
                  <MessageCircle size={14} color="#F2EFE8" strokeWidth={1.8} />
                  <Text style={styles.galleryActionText}>{commentCount}</Text>
                </Pressable>

                {!isOwn && handleSave && (
                  <Pressable onPress={handleSave} hitSlop={6} style={styles.galleryActionItem}>
                    <Bookmark
                      size={13}
                      color={actualSaved ? gold[400] : '#F2EFE8'}
                      fill={actualSaved ? gold[400] : 'transparent'}
                      strokeWidth={1.8}
                    />
                    {saveCount > 0 && <Text style={styles.galleryActionText}>{saveCount}</Text>}
                  </Pressable>
                )}
              </View>
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

          <View style={styles.compactActions}>
            <Pressable
              onPress={onToggleLike}
              hitSlop={6}
              style={styles.compactActionBtn}
              accessibilityRole="button"
              accessibilityLabel={isLiked ? 'Quitar me gusta' : 'Me gusta'}
            >
              <Heart
                size={16}
                color={isLiked ? theme.colors.primary : theme.colors.foregroundSubtle}
                fill={isLiked ? theme.colors.primary : 'transparent'}
                strokeWidth={1.8}
              />
              <Text style={[styles.compactActionCount, { color: isLiked ? theme.colors.primary : theme.colors.foregroundSubtle }]}>
                {likeCount}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setShowComments(true)}
              hitSlop={6}
              style={styles.compactActionBtn}
              accessibilityRole="button"
              accessibilityLabel="Comentarios"
            >
              <MessageCircle size={16} color={theme.colors.foregroundSubtle} strokeWidth={1.8} />
              <Text style={[styles.compactActionCount, { color: theme.colors.foregroundSubtle }]}>{commentCount}</Text>
            </Pressable>
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
            colors={['transparent', 'rgba(0,0,0,0.72)']}
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

        {/* Top badge: album type */}
        <View style={styles.topBadge} pointerEvents="none">
          <Images size={12} color="rgba(255,255,255,0.9)" strokeWidth={2} />
          <Text style={styles.topBadgeText}>Álbum</Text>
        </View>

        {/* Closed badge */}
        {album.is_closed && (
          <View style={styles.closedBadge} pointerEvents="none">
            <Lock size={10} color={gold[400]} />
            <Text style={styles.closedText}>Cerrado</Text>
          </View>
        )}

        {/* Shared badge */}
        {album.is_shared && (
          <View style={styles.sharedBadge} pointerEvents="none">
            <Users size={10} color="#FFF" strokeWidth={2} />
            <Text style={styles.sharedText}>Compartido</Text>
          </View>
        )}

        {/* Top Right Buttons: Like and/or Save */}
        <View style={styles.topActions} pointerEvents="box-none">
          {onToggleLike && (
            <Pressable
              onPress={onToggleLike}
              hitSlop={10}
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={isLiked ? 'Quitar me gusta' : 'Dar me gusta'}
            >
              <Heart
                size={16}
                color={isLiked ? '#EF4444' : 'rgba(255,255,255,0.85)'}
                fill={isLiked ? '#EF4444' : 'transparent'}
                strokeWidth={2}
              />
              {likeCount > 0 && <Text style={styles.actionCount}>{likeCount}</Text>}
            </Pressable>
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

          {(!isOwn && handleSave) ? (
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
            >
              <Bookmark
                size={16}
                color={actualSaved ? gold[400] : 'rgba(255,255,255,0.85)'}
                fill={actualSaved ? gold[400] : 'transparent'}
                strokeWidth={2}
              />
              {saveCount > 0 && <Text style={styles.actionCount}>{saveCount}</Text>}
            </Pressable>
          ) : saveCount > 0 ? (
            <View style={styles.actionBtn}>
              <Bookmark
                size={16}
                color="rgba(255,255,255,0.85)"
                strokeWidth={2}
              />
              <Text style={styles.actionCount}>{saveCount}</Text>
            </View>
          ) : null}
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
            {album.completed_tasks}/{album.total_tasks} tareas
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
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
  topBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },
  topBadgeText: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  closedBadge: {
    position: 'absolute',
    top: 10,
    left: 85,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
  },
  closedText: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: gold[400],
  },
  sharedBadge: {
    position: 'absolute',
    top: 10,
    left: 85,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 2,
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
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    paddingHorizontal: 16,
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
    position: 'relative',
  },
  galleryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    zIndex: 2,
  },
  galleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 6,
  },
  galleryUsername: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
  galleryAlbumBadgeText: {
    fontFamily: fontFamily.semibold,
    fontSize: 9,
    color: 'rgba(255,255,255,0.95)',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  galleryBottom: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    zIndex: 2,
  },
  galleryTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: 14,
    lineHeight: 18,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  gallerySubtext: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  galleryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
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
  // Compact mode styles
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
