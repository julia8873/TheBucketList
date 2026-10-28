/**
 * AlbumCard — image fills the card, title overlaid with gradient, progress bar at bottom.
 * NewAlbumCard — dashed gold border, + icon, "Nuevo álbum" label.
 * NoAlbumRow — full-width row for unorganised tasks.
 */
import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
  Dimensions,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, FolderOpen, ChevronRight, Star, Lock, Check, Bookmark } from 'lucide-react-native';

import { useTheme } from '../theme/useTheme';
import { useCoverOverlay } from '../theme/coverOverlay';
import { useTranslation } from '@bucketlist/shared';
import { fontFamily, fontSize } from '../tokens/typography';
import { gold, dark, green } from '../tokens/colors';
import { radii } from '../tokens/radii';

export function getAlbumCardDimensions(windowWidth: number) {
  // En web el contenedor principal tiene un maxWidth de 620px
  const effectiveWidth = Platform.OS === 'web' ? Math.min(windowWidth, 620) : windowWidth;
  // Padding horizontal en listas (20 * 2 = 40) + gap (12) + 2px de margen contra subpíxeles
  const cardWidth = Math.floor((effectiveWidth - 40 - 12 - 2) / 2);
  const cardHeight = Math.round(cardWidth * 1.45);
  return { cardWidth, cardHeight };
}

const DEFAULT_DIMS = getAlbumCardDimensions(Dimensions.get('window').width);
const CARD_WIDTH = DEFAULT_DIMS.cardWidth;
const CARD_HEIGHT = DEFAULT_DIMS.cardHeight;

interface AlbumCardProps {
  title: string;
  totalTasks: number;
  completedTasks: number;
  coverUri?: string | null;
  isShared?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  isSaved?: boolean;
  onToggleSave?: () => void;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  isClosed?: boolean;
  colorIndex?: number;  // to pick a gradient when no cover
  onPress?: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onLongPress?: () => void;
  style?: ViewStyle;
  showPriority?: boolean;
  showTaskCount?: boolean;
  showProgress?: boolean;
  showBadges?: boolean;
  showDate?: boolean;
  showDescription?: boolean;
  createdAt?: string;
  description?: string;
  /** Elemento extra (p. ej. fotos de colaboradores) sobre la barra de progreso. */
  participantsElement?: React.ReactNode;
}

const PRESET_COVERS: Record<string, { type: 'gradient' | 'solid'; colors: [string, string, ...string[]]; diagonal?: boolean }> = {
  aurora: { type: 'gradient', colors: ['#0E4B43', '#1F8560'] },
  atardecer: { type: 'gradient', colors: ['#F4A460', '#C8602F'] },
  cielo: { type: 'gradient', colors: ['#3A78C4', '#8CC8F4'] },
  violeta: { type: 'gradient', colors: ['#5B2F98', '#2E1A5E'] },
  dorado: { type: 'gradient', colors: ['#3A2F18', '#5E4E1F'], diagonal: true },
  rojo: { type: 'solid', colors: ['#E53935', '#E53935'] },
  azul: { type: 'solid', colors: ['#1E88E5', '#1E88E5'] },
  verde: { type: 'solid', colors: ['#43A047', '#43A047'] },
  amarillo: { type: 'solid', colors: ['#FDD835', '#FDD835'] },
  morado: { type: 'solid', colors: ['#8E24AA', '#8E24AA'] },
};

function parseAlbumCover(coverUri?: string | null) {
  if (!coverUri) return null;
  const trimmed = coverUri.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed?.id && PRESET_COVERS[parsed.id] && (!parsed.colors || !parsed.colors.length)) {
        return { ...PRESET_COVERS[parsed.id], ...parsed };
      }
      return parsed;
    } catch {}
  }

  if (trimmed.startsWith('preset:')) {
    const key = trimmed.replace('preset:', '').trim();
    if (PRESET_COVERS[key]) return PRESET_COVERS[key];
  }

  if (PRESET_COVERS[trimmed]) {
    return PRESET_COVERS[trimmed];
  }

  if (trimmed.startsWith('#')) {
    return { type: 'solid', colors: [trimmed, trimmed] as [string, string] };
  }

  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('file://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/')
  ) {
    return { type: 'image', uri: trimmed };
  }

  return { type: 'image', uri: trimmed };
}

export function AlbumCard({
  title,
  totalTasks,
  completedTasks,
  coverUri,
  isShared = false,
  isFavorite = false,
  onToggleFavorite,
  isSaved = false,
  onToggleSave,
  priority,
  isClosed = false,
  colorIndex = 0,
  onPress,
  onLongPress,
  isSelectionMode = false,
  isSelected = false,
  style,
  showPriority = true,
  showTaskCount = true,
  showProgress = true,
  showBadges = true,
  showDate = false,
  showDescription = false,
  createdAt,
  description,
  participantsElement,
}: AlbumCardProps) {
  const { theme } = useTheme();
  const overlay = useCoverOverlay();
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const { cardWidth, cardHeight } = getAlbumCardDimensions(width);
  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;
  const [g1, g2] = overlay.placeholders[colorIndex % overlay.placeholders.length] ?? overlay.placeholders[0]!;

  const parsedCover = parseAlbumCover(coverUri);

  let backgroundContent;
  if (parsedCover) {
    if ((parsedCover.type === 'image' || parsedCover.uri) && parsedCover.uri) {
      backgroundContent = (
        <Image
          source={{ uri: parsedCover.uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
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
  } else {
    backgroundContent = (
      <LinearGradient colors={[g1, g2]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={StyleSheet.absoluteFill} />
    );
  }

  const isCompleted = totalTasks > 0 && completedTasks === totalTasks;
  const isImageCover = !!(parsedCover && (parsedCover.type === 'image' || parsedCover.uri) && parsedCover.uri);

  const gradientColors: [string, string] = isImageCover
    ? ['transparent', 'rgba(0,0,0,0.72)']
    : theme.dark
      ? ['transparent', 'rgba(0,0,0,0.65)']
      : ['transparent', 'rgba(0,0,0,0.42)'];

  const titleColor = '#FFFFFF';
  const metaColor = 'rgba(255,255,255,0.78)';
  const trackBgColor = 'rgba(255,255,255,0.28)';
  const floatingBadgeBg = theme.dark ? 'rgba(0,0,0,0.52)' : 'rgba(255,255,255,0.92)';
  const chipBg = 'rgba(0,0,0,0.45)';

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        {
          ...Platform.select({
            web: {
              width: 'calc(50% - 7px)',
              aspectRatio: 1 / 1.45,
            } as any,
            default: {
              width: cardWidth,
              height: cardHeight,
            },
          }),
          backgroundColor: theme.dark ? dark[900] : dark[800],
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {/* Background: photo or gradient */}
      {backgroundContent}

      {/* Selection Border Overlay - avoids Yoga layout recalculation and native clipping bugs */}
      {isSelected && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radii.xl,
              borderWidth: 2.5,
              borderColor: gold[400],
              zIndex: 10,
            },
          ]}
        />
      )}

      {/* Bottom gradient so text is readable without washing out the cover */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { top: isImageCover ? '46%' : '44%' }]}
      />

      {/* Top left badges */}
      {isSelectionMode ? (
        <View style={styles.topLeftBadges}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              backgroundColor: isSelected ? gold[400] : 'rgba(0,0,0,0.6)',
              borderWidth: isSelected ? 0 : 1.5,
              borderColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSelected && <Check size={14} color="#0E0E0E" strokeWidth={3} />}
          </View>
        </View>
      ) : showBadges && (
        <View style={styles.topLeftBadges}>
          {isCompleted && !isClosed && (
            <View style={styles.completedBadge}>
              <Check size={10} color="#FFF" strokeWidth={2.5} />
              <Text style={styles.completedText}>{t('common.completed_m')}</Text>
            </View>
          )}

          {isShared && (
            <View style={styles.sharedBadge}>
              <Text style={styles.sharedText}>{t('albums.shared')}</Text>
            </View>
          )}

          {isClosed && (
            <View style={styles.closedBadge}>
              <Lock size={10} color="#D4B13A" />
              <Text style={styles.closedText}>{t('common.closed')}</Text>
            </View>
          )}
        </View>
      )}

      {/* Save or Favorite badge / button */}
      {onToggleSave ? (
        <Pressable
          hitSlop={10}
          onPress={(e) => {
            e.stopPropagation();
            onToggleSave();
          }}
          style={[
            styles.favoriteBadge,
            { backgroundColor: floatingBadgeBg },
            !theme.dark && { borderWidth: 1, borderColor: gold[400] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? t('common.unsave') : t('common.save_album')}
        >
          <Bookmark
            size={14}
            color={isSaved ? gold[500] : (theme.dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)')}
            fill={isSaved ? gold[500] : 'transparent'}
          />
        </Pressable>
      ) : isSaved ? (
        <View
          style={[
            styles.favoriteBadge,
            { backgroundColor: floatingBadgeBg },
            !theme.dark && { borderWidth: 1, borderColor: gold[400] },
          ]}
        >
          <Bookmark size={14} color={gold[500]} fill={gold[500]} />
        </View>
      ) : onToggleFavorite ? (
        <Pressable
          hitSlop={10}
          onPress={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          style={[
            styles.favoriteBadge,
            { backgroundColor: floatingBadgeBg },
            !theme.dark && { borderWidth: 1, borderColor: gold[400] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? t('common.unfavorite') : t('common.add_favorite')}
        >
          <Star
            size={14}
            color={isFavorite ? gold[500] : (theme.dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)')}
            fill={isFavorite ? gold[500] : 'transparent'}
          />
        </Pressable>
      ) : isFavorite ? (
        <View
          style={[
            styles.favoriteBadge,
            { backgroundColor: floatingBadgeBg },
            !theme.dark && { borderWidth: 1, borderColor: gold[400] },
          ]}
        >
          <Star size={14} color={gold[500]} fill={gold[500]} />
        </View>
      ) : null}

      {/* Bottom content */}
      <View style={styles.bottom}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={showDescription && description ? 1 : 2}>{title}</Text>
        <View style={styles.metaRow}>
          {showTaskCount && (
            <Text style={[styles.meta, { color: metaColor }]}>
              {totalTasks} {totalTasks === 1 ? t('albums.task_single') : t('albums.task_plural')} · {completedTasks} {completedTasks === 1 ? t('albums.done_single') : t('albums.done_plural')}
            </Text>
          )}
          {showDate && createdAt && (
            <Text style={[styles.meta, { color: metaColor }]}>
              {new Date(createdAt).toLocaleDateString(i18n.language?.startsWith('en') ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short' })}
            </Text>
          )}
          {showPriority && priority && (
            <View style={[styles.priorityIndicator, { backgroundColor: chipBg }]}>
              <View
                style={[
                  styles.priorityDot,
                  {
                    backgroundColor:
                      priority === 'high' || priority === 'urgent'
                        ? '#EF4444'
                        : priority === 'low'
                          ? '#10B981'
                          : '#D4B13A',
                  },
                ]}
              />
              <Text
                style={[
                  styles.priorityText,
                  {
                    color:
                      priority === 'high' || priority === 'urgent'
                        ? '#EF4444'
                        : priority === 'low'
                          ? '#10B981'
                          : '#D4B13A',
                  },
                ]}
              >
                {priority === 'high' || priority === 'urgent'
                  ? t('common.high')
                  : priority === 'low'
                  ? t('common.low')
                  : t('common.medium')}
              </Text>
            </View>
          )}
        </View>

        {showDescription && description ? (
          <Text
            style={[styles.meta, { color: metaColor, fontSize: 11, marginTop: 2 }]}
            numberOfLines={1}
          >
            {description.trim()}
          </Text>
        ) : null}

        {participantsElement ? (
          <View style={{ alignItems: 'flex-start', marginBottom: 6 }}>{participantsElement}</View>
        ) : null}

        {/* Progress bar */}
        {showProgress && (
          <View style={[styles.progressTrack, { backgroundColor: trackBgColor }]}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ── NewAlbumCard ────────────────────────────────────────────────────────────

export function NewAlbumCard({ onPress, style }: { onPress?: () => void; style?: ViewStyle }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { cardWidth, cardHeight } = getAlbumCardDimensions(width);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        styles.newCard,
        {
          ...Platform.select({
            web: {
              width: 'calc(50% - 7px)',
              aspectRatio: 1 / 1.45,
            } as any,
            default: {
              width: cardWidth,
              height: cardHeight,
            },
          }),
          borderColor: theme.colors.primary,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Plus size={28} color={theme.colors.primary} strokeWidth={2} />
      <Text style={[styles.newLabel, { color: theme.colors.primary }]}>{t('albums.new_album')}</Text>
    </Pressable>
  );
}

// ── NoAlbumRow ──────────────────────────────────────────────────────────────

interface NoAlbumRowProps {
  count: number;
  onPress?: () => void;
}

export function NoAlbumRow({ count, onPress }: NoAlbumRowProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.noAlbumRow,
        {
          borderColor: theme.colors.border,
          backgroundColor: pressed ? theme.colors.secondary : 'transparent',
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <FolderOpen color={theme.colors.foregroundMuted} size={22} strokeWidth={1.8} style={{ marginRight: 14 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.noAlbumTitle, { color: theme.colors.foreground }]}>{t('albums.no_album')}</Text>
        <Text style={[styles.noAlbumMeta, { color: theme.colors.foregroundMuted }]}>
          {count} {count === 1 ? t('albums.unassigned_task_single') : t('albums.unassigned_task_plural')}
        </Text>
      </View>
      <ChevronRight color={theme.colors.foregroundMuted} size={20} strokeWidth={1.8} />
    </Pressable>
  );
}

// ── NoAlbumCard ─────────────────────────────────────────────────────────────

interface NoAlbumCardProps {
  count: number;
  onPress?: () => void;
  style?: ViewStyle;
}

export function NoAlbumCard({ count, onPress, style }: NoAlbumCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { cardWidth, cardHeight } = getAlbumCardDimensions(width);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        styles.noAlbumCard,
        {
          ...Platform.select({
            web: {
              width: 'calc(50% - 7px)',
              aspectRatio: 1 / 1.45,
            } as any,
            default: {
              width: cardWidth,
              height: cardHeight,
            },
          }),
          borderColor: theme.colors.border,
          backgroundColor: pressed ? theme.colors.secondary : theme.colors.surfaceSunken,
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.noAlbumCardIconWrap,
          { backgroundColor: theme.colors.secondary },
        ]}
      >
        <FolderOpen color={theme.colors.foregroundMuted} size={28} strokeWidth={1.8} />
      </View>
      <View style={styles.noAlbumCardTextWrap}>
        <Text style={[styles.noAlbumCardTitle, { color: theme.colors.foreground }]}>{t('albums.no_album')}</Text>
        <Text style={[styles.noAlbumCardMeta, { color: theme.colors.foregroundMuted }]}>
          {count} {count === 1 ? t('albums.unassigned_task_single') : t('albums.unassigned_task_plural')}
        </Text>
      </View>
    </Pressable>
  );
}

// ── NewAlbumRow ─────────────────────────────────────────────────────────────

export function NewAlbumRow({ onPress, style }: { onPress?: () => void; style?: ViewStyle }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.noAlbumRow,
        styles.newAlbumRow,
        {
          borderColor: theme.colors.primary,
          backgroundColor: pressed
            ? (theme.dark ? 'rgba(212, 177, 58, 0.14)' : 'rgba(212, 177, 58, 0.18)')
            : (theme.dark ? 'rgba(212, 177, 58, 0.05)' : 'rgba(212, 177, 58, 0.08)'),
          opacity: pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <View style={styles.newAlbumRowIconWrap}>
        <Plus color={theme.colors.primary} size={22} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.noAlbumTitle, { color: theme.colors.primary }]}>{t('albums.new_album')}</Text>
        <Text style={[styles.noAlbumMeta, { color: theme.colors.foregroundMuted }]}>{t('albums.new_album_desc')}</Text>
      </View>
      <ChevronRight color={theme.colors.primary} size={20} strokeWidth={2} />
    </Pressable>
  );
}


// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // AlbumCard
  card: {
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  topLeftBadges: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 5,
    zIndex: 2,
  },
  sharedBadge: {
    backgroundColor: 'rgba(59,130,246,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  sharedText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: '#FFF',
  },
  closedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(212, 177, 58, 0.25)',
    borderWidth: 1,
    borderColor: '#D4B13A',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  closedText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: '#D4B13A',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(34,197,94,0.9)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
  },
  completedText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
    color: '#FFF',
  },
  favoriteBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  title: {
    fontFamily: fontFamily.serifBold ?? fontFamily.serif,
    fontSize: fontSize.base,
    color: '#FFF',
    marginBottom: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.65)',
    flexShrink: 1,
  },
  priorityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  priorityText: {
    fontFamily: fontFamily.semibold,
    fontSize: 10,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: gold[400],
    borderRadius: 2,
  },

  // NewAlbumCard
  newCard: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: gold[400],
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  newLabel: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: gold[400],
  },

  // NoAlbumRow
  noAlbumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: dark[400],
    backgroundColor: 'transparent',
    marginTop: 4,
  },
  noAlbumTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    color: '#FFF',
  },
  noAlbumMeta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: dark[600],
    marginTop: 2,
  },
  noAlbumCard: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  noAlbumCardIconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noAlbumCardTextWrap: {
    alignItems: 'center',
    gap: 4,
  },
  noAlbumCardTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  noAlbumCardMeta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  newAlbumRow: {
    borderStyle: 'dashed',
    marginBottom: 10,
  },
  newAlbumRowIconWrap: {
    marginRight: 14,
  },
});
