/**
 * TaskRow — one bucket list item in the list view.
 * thumbnail 56×56 | title (Playfair) + meta | urgency chip
 * optional progress bar for subtasks
 */
import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  type ViewStyle,
} from 'react-native';
import { fontFamily, fontSize } from '../tokens/typography';
import { gold, dark } from '../tokens/colors';
import { useTheme } from '../theme/useTheme';
import { UrgencyChip } from './Pill';
import { ProgressBar } from './ProgressBar';

interface TaskRowProps {
  title: string;
  meta?: string;               // e.g. "Viajes · Noruega" or "Aventura · 2 de 4 pasos"
  deadline?: Date | string | null;
  thumbnailColor?: string;     // gradient/color fallback when no photo
  thumbnailUri?: string;
  subtasksDone?: number;
  subtasksTotal?: number;
  onPress?: () => void;
  style?: ViewStyle;
}

export function TaskRow({
  title,
  meta,
  deadline,
  thumbnailColor = dark[300],
  thumbnailUri,
  subtasksDone = 0,
  subtasksTotal = 0,
  onPress,
  style,
}: TaskRowProps) {
  const { theme } = useTheme();
  const hasProgress = subtasksTotal > 0;
  const progress = hasProgress ? subtasksDone / subtasksTotal : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.colors.surface, opacity: pressed ? 0.85 : 1 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {/* Thumbnail */}
      <View style={[styles.thumbnail, { backgroundColor: thumbnailColor }]}>
        {thumbnailUri ? (
          <Image source={{ uri: thumbnailUri }} style={styles.thumbnailImg} />
        ) : null}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.foreground }]} numberOfLines={2}>
          {title}
        </Text>
        {meta ? (
          <Text style={[styles.meta, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        {hasProgress ? (
          <ProgressBar
            value={Math.round(progress * 100)}
            style={styles.progress}
            colorOverride={gold[400]}
          />
        ) : null}
      </View>

      {/* Urgency chip */}
      {deadline ? (
        <UrgencyChip deadline={deadline} style={styles.chip} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    gap: 12,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    flexShrink: 0,
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.lg,
    lineHeight: 22,
  },
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
  },
  progress: {
    marginTop: 4,
    height: 3,
    borderRadius: 2,
  },
  chip: {
    flexShrink: 0,
  },
});
