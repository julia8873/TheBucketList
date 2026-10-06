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
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, FolderOpen, ChevronRight } from 'lucide-react-native';

import { useTheme } from '../theme/useTheme';
import { fontFamily, fontSize } from '../tokens/typography';
import { gold, dark, green } from '../tokens/colors';
import { radii } from '../tokens/radii';

const CARD_WIDTH = (Dimensions.get('window').width - 20 * 2 - 12) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.18;

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
  colorIndex = 0,
  onPress,
  style,
}: AlbumCardProps) {
  const progress = totalTasks > 0 ? completedTasks / totalTasks : 0;
  const [g1, g2] = COVER_GRADIENTS[colorIndex % COVER_GRADIENTS.length] || ['#1B4D3E', '#0A2E25'];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { opacity: pressed ? 0.85 : 1 },
        style,
      ]}
    >
      {/* Background: photo or gradient */}
      {coverUri ? (
        <Image source={{ uri: coverUri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <LinearGradient
          colors={[g1, g2]}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {/* Bottom gradient so text is readable */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.72)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFill, { top: '40%' }]}
      />

      {/* Shared badge */}
      {isShared && (
        <View style={styles.sharedBadge}>
          <Text style={styles.sharedText}>Compartido</Text>
        </View>
      )}

      {/* Bottom content */}
      <View style={styles.bottom}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.meta}>
          {totalTasks} tareas · {completedTasks} hechas
        </Text>
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
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, styles.newCard, { opacity: pressed ? 0.7 : 1 }, style]}
    >
      <Plus size={28} color={gold[400]} strokeWidth={2} />
      <Text style={styles.newLabel}>Nuevo álbum</Text>
    </Pressable>
  );
}

// ── NoAlbumRow ──────────────────────────────────────────────────────────────

interface NoAlbumRowProps {
  count: number;
  onPress?: () => void;
}

export function NoAlbumRow({ count, onPress }: NoAlbumRowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.noAlbumRow, { opacity: pressed ? 0.7 : 1 }]}
    >
      <FolderOpen color={dark[600]} size={22} strokeWidth={1.8} style={{ marginRight: 14 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.noAlbumTitle}>Sin álbum</Text>
        <Text style={styles.noAlbumMeta}>{count} tareas sueltas</Text>
      </View>
      <ChevronRight color={dark[600]} size={20} strokeWidth={1.8} />
    </Pressable>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // AlbumCard
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: radii.xl,
    overflow: 'hidden',
    backgroundColor: dark[300],
  },
  sharedBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(34,197,94,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sharedText: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.xs,
    color: '#FFF',
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
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 8,
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
});
