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
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, FolderOpen, ChevronRight, Star, Lock, Check } from 'lucide-react-native';

import { useTheme } from '../theme/useTheme';
import { fontFamily, fontSize } from '../tokens/typography';
import { gold, dark, green } from '../tokens/colors';
import { radii } from '../tokens/radii';

export function getAlbumCardDimensions(windowWidth: number) {
  // Padding horizontal en listas (20 * 2 = 40) + gap (12) + 2px de margen contra subpíxeles
  const cardWidth = Math.floor((windowWidth - 40 - 12 - 2) / 2);
  const cardHeight = Math.round(cardWidth * 1.45);
  return { cardWidth, cardHeight };
}

const DEFAULT_DIMS = getAlbumCardDimensions(Dimensions.get('window').width);
const CARD_WIDTH = DEFAULT_DIMS.cardWidth;
const CARD_HEIGHT = DEFAULT_DIMS.cardHeight;

// ── Gradient cover colours used when no image ──────────────────────────────
const COVER_GRADIENTS: Array<[string, string]> = [
  ['#1B4D3E', '#0A2E25'],   // teal (Viaje a Noruega)
  ['#C87A2B', '#7A3D00'],   // orange (Antes de los 30)
  ['#2B5BA8', '#0D2F6E'],   // blue (Con Marta)
  ['#6B2FA0', '#3A0070'],   // purple
];

interface AlbumCardProps {
  title: string;
  totalTasks: number;
  completedTasks: number;
  coverUri?: string | null;
  isShared?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  isClosed?: boolean;
  colorIndex?: number;  // to pick a gradient when no cover
  onPress?: () => void;
  style?: ViewStyle;
}

export function AlbumCard({
  title,
  totalTasks,
  completedTasks,
  coverUri,
  isShared = false,
  isFavorite = false,
  onToggleFavorite,
  priority,
  isClosed = false,
  colorIndex = 0,
  onPress,
  style,
}: AlbumCardProps) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const { cardWidth, cardHeight } = getAlbumCardDimensions(width);
  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;
  const [g1, g2] = COVER_GRADIENTS[colorIndex % COVER_GRADIENTS.length] || ['#1B4D3E', '#0A2E25'];

  let parsedCover: any = null;
  if (coverUri && coverUri.startsWith('{')) {
    try {
      parsedCover = JSON.parse(coverUri);
    } catch (e) {
      // Not JSON
    }
  }

  let backgroundContent;
  if (parsedCover) {
    if (parsedCover.type === 'image' && parsedCover.uri) {
      backgroundContent = <Image source={{ uri: parsedCover.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />;
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
  } else if (coverUri) {
    backgroundContent = <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} contentFit="cover" />;
  } else {
    backgroundContent = (
      <LinearGradient colors={[g1, g2]} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={StyleSheet.absoluteFill} />
    );
  }

  const isCompleted = totalTasks > 0 && completedTasks === totalTasks;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          width: cardWidth,
          height: cardHeight,
          backgroundColor: theme.colors.surface,
          opacity: pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {/* Background: photo or gradient */}
      {backgroundContent}

      {/* Bottom gradient so text is readable */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.78)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { top: '38%' }]}
      />

      {/* Top left badges */}
      <View style={styles.topLeftBadges}>
        {isCompleted && !isClosed && (
          <View style={styles.completedBadge}>
            <Check size={10} color="#FFF" strokeWidth={2.5} />
            <Text style={styles.completedText}>Completado</Text>
          </View>
        )}

        {isShared && (
          <View style={styles.sharedBadge}>
            <Text style={styles.sharedText}>Compartido</Text>
          </View>
        )}

        {isClosed && (
          <View style={styles.closedBadge}>
            <Lock size={10} color="#D4B13A" />
            <Text style={styles.closedText}>Cerrado</Text>
          </View>
        )}
      </View>

      {/* Favorite badge / button */}
      {onToggleFavorite ? (
        <Pressable
          hitSlop={10}
          onPress={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          style={styles.favoriteBadge}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        >
          <Star
            size={14}
            color={isFavorite ? gold[400] : 'rgba(255,255,255,0.7)'}
            fill={isFavorite ? gold[400] : 'transparent'}
          />
        </Pressable>
      ) : isFavorite ? (
        <View style={styles.favoriteBadge}>
          <Star size={14} color={gold[400]} fill={gold[400]} />
        </View>
      ) : null}

      {/* Bottom content */}
      <View style={styles.bottom}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>
            {totalTasks} {totalTasks === 1 ? 'tarea' : 'tareas'} · {completedTasks} {completedTasks === 1 ? 'hecha' : 'hechas'}
          </Text>
          {priority && (
            <View style={styles.priorityIndicator}>
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
                {priority === 'high' || priority === 'urgent' ? 'Alta' : priority === 'low' ? 'Baja' : 'Media'}
              </Text>
            </View>
          )}
        </View>
        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
        </View>
      </View>
    </Pressable>
  );
}

// ── NewAlbumCard ────────────────────────────────────────────────────────────

export function NewAlbumCard({ onPress, style }: { onPress?: () => void; style?: ViewStyle }) {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const { cardWidth, cardHeight } = getAlbumCardDimensions(width);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        styles.newCard,
        {
          width: cardWidth,
          height: cardHeight,
          borderColor: theme.colors.primary,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Plus size={28} color={theme.colors.primary} strokeWidth={2} />
      <Text style={[styles.newLabel, { color: theme.colors.primary }]}>Nuevo álbum</Text>
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
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.noAlbumRow,
        {
          borderColor: theme.colors.border,
          backgroundColor: pressed ? (theme.dark ? '#1A1A1A' : '#EDE8DE') : 'transparent',
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <FolderOpen color={theme.colors.foregroundMuted} size={22} strokeWidth={1.8} style={{ marginRight: 14 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.noAlbumTitle, { color: theme.colors.foreground }]}>Sin álbum</Text>
        <Text style={[styles.noAlbumMeta, { color: theme.colors.foregroundMuted }]}>{count} tareas sueltas</Text>
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
  const { width } = useWindowDimensions();
  const { cardWidth, cardHeight } = getAlbumCardDimensions(width);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        styles.noAlbumCard,
        {
          width: cardWidth,
          height: cardHeight,
          borderColor: theme.colors.border,
          backgroundColor: pressed
            ? (theme.dark ? '#1A1A1A' : '#E8E3D8')
            : (theme.dark ? '#121212' : '#F5F0E6'),
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.noAlbumCardIconWrap,
          { backgroundColor: theme.dark ? '#1E1E1E' : '#E5DFD3' },
        ]}
      >
        <FolderOpen color={theme.colors.foregroundMuted} size={28} strokeWidth={1.8} />
      </View>
      <View style={styles.noAlbumCardTextWrap}>
        <Text style={[styles.noAlbumCardTitle, { color: theme.colors.foreground }]}>Sin álbum</Text>
        <Text style={[styles.noAlbumCardMeta, { color: theme.colors.foregroundMuted }]}>
          {count} {count === 1 ? 'tarea suelta' : 'tareas sueltas'}
        </Text>
      </View>
    </Pressable>
  );
}

// ── NewAlbumRow ─────────────────────────────────────────────────────────────

export function NewAlbumRow({ onPress, style }: { onPress?: () => void; style?: ViewStyle }) {
  const { theme } = useTheme();
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
        <Text style={[styles.noAlbumTitle, { color: theme.colors.primary }]}>Nuevo álbum</Text>
        <Text style={[styles.noAlbumMeta, { color: theme.colors.foregroundMuted }]}>Crear un álbum para tus tareas</Text>
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
    backgroundColor: dark[300],
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
