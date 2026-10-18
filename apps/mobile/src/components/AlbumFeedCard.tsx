/**
 * AlbumFeedCard — wide card for albums shown in the friends/explore feed.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Images, Lock, Users, Heart } from 'lucide-react-native';
import { Avatar, useTheme, gold, fontFamily, fontSize, radii } from '@bucketlist/ui';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

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
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onPress?: () => void;
}

export function AlbumFeedCard({ album, colorIndex = 0, isFavorite = false, onToggleFavorite, onPress }: AlbumFeedCardProps) {
  const { theme } = useTheme();
  const [g1, g2] = COVER_GRADIENTS[colorIndex % COVER_GRADIENTS.length] ?? ['#1B4D3E', '#0A2E25'];
  const progress = album.total_tasks > 0 ? album.completed_tasks / album.total_tasks : 0;

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

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { opacity: pressed ? 0.9 : 1, borderColor: theme.dark ? '#2A2A2A' : '#E0D9CE' },
      ]}
    >
      {/* Cover */}
      <View style={styles.coverWrapper}>
        {backgroundContent}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.72)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[StyleSheet.absoluteFill, { top: '35%' }]}
        />

        {/* Top badge: album type */}
        <View style={styles.topBadge}>
          <Images size={12} color="rgba(255,255,255,0.9)" strokeWidth={2} />
          <Text style={styles.topBadgeText}>Álbum</Text>
        </View>

        {/* Closed badge */}
        {album.is_closed && (
          <View style={styles.closedBadge}>
            <Lock size={10} color={gold[400]} />
            <Text style={styles.closedText}>Cerrado</Text>
          </View>
        )}

        {/* Shared badge */}
        {album.is_shared && (
          <View style={styles.sharedBadge}>
            <Users size={10} color="#FFF" strokeWidth={2} />
            <Text style={styles.sharedText}>Compartido</Text>
          </View>
        )}

        {/* Like/favorite button */}
        {onToggleFavorite && (
          <Pressable
            onPress={(e) => { e.stopPropagation(); onToggleFavorite(); }}
            hitSlop={10}
            style={styles.heartBtn}
            accessibilityRole="button"
            accessibilityLabel={isFavorite ? 'Quitar de guardados' : 'Guardar álbum'}
          >
            <Heart
              size={16}
              color={isFavorite ? '#EF4444' : 'rgba(255,255,255,0.85)'}
              fill={isFavorite ? '#EF4444' : 'transparent'}
              strokeWidth={2}
            />
          </Pressable>
        )}

        {/* Cover bottom: title + progress */}
        <View style={styles.coverBottom}>
          <Text style={styles.title} numberOfLines={2}>{album.title}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
          </View>
        </View>
      </View>

      {/* Footer: owner info + meta */}
      <View style={[styles.footer, { backgroundColor: theme.dark ? '#111' : '#FAF8F4' }]}>
        <View style={styles.ownerRow}>
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
          <Text style={[styles.taskCount, { color: theme.colors.foregroundMuted }]}>
            {album.completed_tasks}/{album.total_tasks} tareas
          </Text>
        </View>
      </View>
    </Pressable>
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
  heartBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 7,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  topBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  topBadgeText: {
    fontFamily: fontFamily.semibold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
  },
  closedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: gold[400],
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  closedText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: gold[400],
  },
  sharedBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(59,130,246,0.85)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  sharedText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: '#FFF',
  },
  coverBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  title: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base + 1,
    color: '#FFF',
    marginBottom: 8,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: gold[400],
    borderRadius: 2,
  },
  footer: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ownerName: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
  },
  timeAgo: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  taskCount: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
  },
});
