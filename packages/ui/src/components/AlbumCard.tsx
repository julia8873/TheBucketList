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
import { Plus, FolderOpen, ChevronRight, Star, Lock, Check, Bookmark, CheckCircle2, MoreHorizontal, Clock, AlertCircle } from 'lucide-react-native';

import { useTheme } from '../theme/useTheme';
import { useCoverOverlay } from '../theme/coverOverlay';
import { useTranslation } from '@bucketlist/shared';
import { fontFamily, fontSize } from '../tokens/typography';
import { gold, dark, green } from '../tokens/colors';
import { radii } from '../tokens/radii';

export function getAlbumCardDimensions(windowWidth: number, columns: 2 | 3 | 4 = 2) {
  // En web el contenedor principal tiene un maxWidth de 620px
  const effectiveWidth = Platform.OS === 'web' ? Math.min(windowWidth, 620) : windowWidth;
  // Padding horizontal en listas (20 * 2 = 40) + gaps según columnas + margen contra subpíxeles
  const gap = columns === 4 ? 4 : columns === 3 ? 6 : 12;
  const totalGap = gap * (columns - 1);
  const cardWidth = Math.floor((effectiveWidth - 40 - totalGap - 2) / columns);
  const ratio = columns === 4 ? 1.15 : columns === 3 ? 1.25 : 1.45;
  const cardHeight = Math.round(cardWidth * ratio);
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
  deadline?: string | null;
  description?: string;
  /** Elemento extra (p. ej. fotos de colaboradores) sobre la barra de progreso. */
  participantsElement?: React.ReactNode;
  columns?: 2 | 3 | 4;
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
  deadline,
  description,
  participantsElement,
  columns = 2,
}: AlbumCardProps) {
  const { theme } = useTheme();
  const overlay = useCoverOverlay();
  const { t, i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const { cardWidth, cardHeight } = getAlbumCardDimensions(width, columns);
  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;
  const [g1, g2] = overlay.placeholders[colorIndex % overlay.placeholders.length] ?? overlay.placeholders[0]!;

  const is4Cols = columns === 4;
  const is3Cols = columns === 3;
  const badgeSize = is4Cols ? 18 : is3Cols ? 20 : 22;
  const statusIconSize = is4Cols ? 10 : is3Cols ? 11 : 12;
  const starIconSize = is4Cols ? 10 : is3Cols ? 12 : 14;
  const cardBorderRadius = is4Cols ? radii.md : is3Cols ? radii.lg : radii.xl;

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
  const isExpired = !isCompleted && deadline ? new Date(deadline).getTime() < Date.now() : false;
  const isInProgress = !isCompleted && !isExpired && totalTasks > 0 && completedTasks > 0;
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
              width: is4Cols ? 'calc(25% - 3px)' : is3Cols ? 'calc(33.333% - 4px)' : 'calc(50% - 7px)',
              aspectRatio: is4Cols ? 1 / 1.15 : is3Cols ? 1 / 1.25 : 1 / 1.45,
            } as any,
            default: {
              width: cardWidth,
              height: cardHeight,
            },
          }),
          borderRadius: cardBorderRadius,
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
              borderRadius: cardBorderRadius,
              borderWidth: is4Cols ? 1.5 : 2.5,
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
        <View style={[styles.topLeftBadges, is4Cols && { top: 4, left: 4 }, is3Cols && { top: 6, left: 6 }]}>
          <View
            style={{
              width: badgeSize,
              height: badgeSize,
              borderRadius: badgeSize / 2,
              backgroundColor: isSelected ? gold[400] : 'rgba(0,0,0,0.6)',
              borderWidth: isSelected ? 0 : 1.5,
              borderColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSelected && <Check size={statusIconSize} color="#0E0E0E" strokeWidth={3} />}
          </View>
        </View>
      ) : (
        <View style={[styles.topLeftBadges, is4Cols && { top: 4, left: 4 }, is3Cols && { top: 6, left: 6 }]}>
          {/* Fila: badge de estado + fotos de perfil al lado (en 2 y 3 cols) */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: is4Cols ? 3 : 4 }}>
            {showBadges && (
              <>
                {!isClosed && (
                  isCompleted ? (
                    <View style={[styles.completedBadge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, backgroundColor: 'rgba(52, 199, 89, 0.9)' }]}>
                      <CheckCircle2 size={statusIconSize} color="#FFFFFF" strokeWidth={2.4} />
                    </View>
                  ) : isExpired ? (
                    <View style={[styles.completedBadge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, backgroundColor: 'rgba(239, 68, 68, 0.9)' }]}>
                      <AlertCircle size={statusIconSize} color="#FFFFFF" strokeWidth={2.4} />
                    </View>
                  ) : isInProgress ? (
                    <View style={[styles.completedBadge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, backgroundColor: 'rgba(0, 122, 255, 0.9)' }]}>
                      <MoreHorizontal size={statusIconSize + 1} color="#FFFFFF" strokeWidth={2.4} />
                    </View>
                  ) : (
                    <View style={[styles.completedBadge, { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2, backgroundColor: 'rgba(142, 142, 147, 0.9)' }]}>
                      <Clock size={statusIconSize - 1} color="#FFFFFF" strokeWidth={2.2} />
                    </View>
                  )
                )}

                {isClosed && (
                  <View style={[styles.closedBadge, is4Cols && { paddingHorizontal: 4, paddingVertical: 1 }]}>
                    <Lock size={statusIconSize - 2} color="#D4B13A" />
                    {!is4Cols && <Text style={[styles.closedText, is3Cols && { fontSize: 9 }]}>{t('common.closed')}</Text>}
                  </View>
                )}
              </>
            )}

            {/* Fotos de perfil inline al lado del badge */}
            {participantsElement}
          </View>
        </View>
      )}

      {/* Save or Favorite badge / button */}
      {onToggleSave ? (
        <Pressable
          hitSlop={8}
          onPress={(e) => {
            e.stopPropagation();
            onToggleSave();
          }}
          style={[
            styles.favoriteBadge,
            is4Cols && { top: 4, right: 4, padding: 3 },
            is3Cols && { top: 6, right: 6, padding: 4 },
            { backgroundColor: floatingBadgeBg },
            !theme.dark && { borderWidth: 1, borderColor: gold[400] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isSaved ? t('common.unsave') : t('common.save_album')}
        >
          <Bookmark
            size={starIconSize}
            color={isSaved ? gold[500] : (theme.dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)')}
            fill={isSaved ? gold[500] : 'transparent'}
          />
        </Pressable>
      ) : isSaved ? (
        <View
          style={[
            styles.favoriteBadge,
            is4Cols && { top: 4, right: 4, padding: 3 },
            is3Cols && { top: 6, right: 6, padding: 4 },
            { backgroundColor: floatingBadgeBg },
            !theme.dark && { borderWidth: 1, borderColor: gold[400] },
          ]}
        >
          <Bookmark size={starIconSize} color={gold[500]} fill={gold[500]} />
        </View>
      ) : onToggleFavorite ? (
        <Pressable
          hitSlop={8}
          onPress={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          style={[
            styles.favoriteBadge,
            is4Cols && { top: 4, right: 4, padding: 3 },
            is3Cols && { top: 6, right: 6, padding: 4 },
            { backgroundColor: floatingBadgeBg },
            !theme.dark && { borderWidth: 1, borderColor: gold[400] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? t('common.unfavorite') : t('common.add_favorite')}
        >
          <Star
            size={starIconSize}
            color={isFavorite ? gold[500] : (theme.dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.45)')}
            fill={isFavorite ? gold[500] : 'transparent'}
          />
        </Pressable>
      ) : isFavorite ? (
        <View
          style={[
            styles.favoriteBadge,
            is4Cols && { top: 4, right: 4, padding: 3 },
            is3Cols && { top: 6, right: 6, padding: 4 },
            { backgroundColor: floatingBadgeBg },
            !theme.dark && { borderWidth: 1, borderColor: gold[400] },
          ]}
        >
          <Star size={starIconSize} color={gold[500]} fill={gold[500]} />
        </View>
      ) : null}

      {/* Bottom content */}
      <View style={[styles.bottom, is4Cols && { padding: 5 }, is3Cols && { padding: 8 }]}>
        <Text
          style={[
            styles.title,
            { color: titleColor },
            is4Cols && { fontSize: 11, lineHeight: 13, marginBottom: 1 },
            is3Cols && { fontSize: 13, lineHeight: 16, marginBottom: 2 },
          ]}
          numberOfLines={is4Cols ? 1 : showDescription && description ? 1 : 2}
        >
          {title}
        </Text>
        {!is4Cols && (
          <View style={[styles.metaRow, is3Cols && { marginBottom: 3 }]}>
            {showTaskCount && (
              <Text style={[styles.meta, { color: metaColor }, is3Cols && { fontSize: 9 }]}>
                {totalTasks} {totalTasks === 1 ? t('albums.task_single') : t('albums.task_plural')} · {completedTasks} {completedTasks === 1 ? t('albums.done_single') : t('albums.done_plural')}
              </Text>
            )}
            {showDate && createdAt && (
              <Text style={[styles.meta, { color: metaColor }, is3Cols && { fontSize: 9 }]}>
                {new Date(createdAt).toLocaleDateString(i18n.language?.startsWith('en') ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short' })}
              </Text>
            )}
            {showPriority && priority && (
              is3Cols ? (
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor:
                      priority === 'high' || priority === 'urgent'
                        ? '#EF4444'
                        : priority === 'low'
                          ? '#10B981'
                          : '#D4B13A',
                    borderWidth: 1,
                    borderColor: 'rgba(0,0,0,0.4)',
                  }}
                />
              ) : (
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
              )
            )}
          </View>
        )}

        {is4Cols && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            {showTaskCount && (
              <Text style={[styles.meta, { color: metaColor, fontSize: 8 }]} numberOfLines={1}>
                {completedTasks}/{totalTasks}
              </Text>
            )}
            {showPriority && priority && (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor:
                    priority === 'high' || priority === 'urgent'
                      ? '#EF4444'
                      : priority === 'low'
                        ? '#10B981'
                        : '#D4B13A',
                  borderWidth: 1,
                  borderColor: 'rgba(0,0,0,0.4)',
                }}
              />
            )}
          </View>
        )}

        {!is4Cols && showDescription && description ? (
          <Text
            style={[styles.meta, { color: metaColor, fontSize: is3Cols ? 9 : 11, marginTop: 1 }]}
            numberOfLines={1}
          >
            {description.trim()}
          </Text>
        ) : null}

        {/* Progress bar */}
        {showProgress && (
          <View style={[styles.progressTrack, { backgroundColor: trackBgColor }, is4Cols && { height: 2 }]}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ── NewAlbumCard ────────────────────────────────────────────────────────────

export function NewAlbumCard({ onPress, style, columns = 2 }: { onPress?: () => void; style?: ViewStyle; columns?: 2 | 3 | 4 }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { cardWidth, cardHeight } = getAlbumCardDimensions(width, columns);
  const is4Cols = columns === 4;
  const is3Cols = columns === 3;
  const cardBorderRadius = is4Cols ? radii.md : is3Cols ? radii.lg : radii.xl;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        styles.newCard,
        {
          ...Platform.select({
            web: {
              width: is4Cols ? 'calc(25% - 3px)' : is3Cols ? 'calc(33.333% - 4px)' : 'calc(50% - 7px)',
              aspectRatio: is4Cols ? 1 / 1.15 : is3Cols ? 1 / 1.25 : 1 / 1.45,
            } as any,
            default: {
              width: cardWidth,
              height: cardHeight,
            },
          }),
          borderRadius: cardBorderRadius,
          borderColor: theme.colors.primary,
          opacity: pressed ? 0.7 : 1,
          gap: is4Cols ? 4 : is3Cols ? 6 : 10,
        },
        style,
      ]}
    >
      <Plus size={is4Cols ? 18 : is3Cols ? 22 : 28} color={theme.colors.primary} strokeWidth={2} />
      {!is4Cols && (
        <Text style={[styles.newLabel, { color: theme.colors.primary }, is3Cols && { fontSize: 11 }]}>
          {t('albums.new_album')}
        </Text>
      )}
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
  columns?: 2 | 3 | 4;
}

export function NoAlbumCard({ count, onPress, style, columns = 2 }: NoAlbumCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { cardWidth, cardHeight } = getAlbumCardDimensions(width, columns);
  const is4Cols = columns === 4;
  const is3Cols = columns === 3;
  const cardBorderRadius = is4Cols ? radii.md : is3Cols ? radii.lg : radii.xl;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        styles.noAlbumCard,
        {
          ...Platform.select({
            web: {
              width: is4Cols ? 'calc(25% - 3px)' : is3Cols ? 'calc(33.333% - 4px)' : 'calc(50% - 7px)',
              aspectRatio: is4Cols ? 1 / 1.15 : is3Cols ? 1 / 1.25 : 1 / 1.45,
            } as any,
            default: {
              width: cardWidth,
              height: cardHeight,
            },
          }),
          borderRadius: cardBorderRadius,
          borderColor: theme.colors.border,
          backgroundColor: pressed ? theme.colors.secondary : theme.colors.surfaceSunken,
          opacity: pressed ? 0.75 : 1,
          padding: is4Cols ? 6 : is3Cols ? 10 : 16,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.noAlbumCardIconWrap,
          { backgroundColor: theme.colors.secondary },
          is4Cols && { width: 30, height: 30, borderRadius: 15, marginBottom: 4 },
          is3Cols && { width: 40, height: 40, borderRadius: 20, marginBottom: 8 },
        ]}
      >
        <FolderOpen color={theme.colors.foregroundMuted} size={is4Cols ? 14 : is3Cols ? 18 : 28} strokeWidth={1.8} />
      </View>
      <View style={styles.noAlbumCardTextWrap}>
        <Text
          style={[
            styles.noAlbumCardTitle,
            { color: theme.colors.foreground },
            is4Cols && { fontSize: 10 },
            is3Cols && { fontSize: 12 },
          ]}
          numberOfLines={1}
        >
          {t('albums.no_album')}
        </Text>
        <Text
          style={[
            styles.noAlbumCardMeta,
            { color: theme.colors.foregroundMuted },
            is4Cols && { fontSize: 8 },
            is3Cols && { fontSize: 10 },
          ]}
          numberOfLines={1}
        >
          {is4Cols ? `${count}` : `${count} ${count === 1 ? t('albums.unassigned_task_single') : t('albums.unassigned_task_plural')}`}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
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
