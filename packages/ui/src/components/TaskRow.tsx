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
  counterCount?: number;
  counterTarget?: number;
  thumbnailElement?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  expiredAction?: boolean;
}

export function TaskRow({
  title,
  meta,
  deadline,
  thumbnailColor = dark[300],
  thumbnailUri,
  subtasksDone = 0,
  subtasksTotal = 0,
  counterCount = 0,
  counterTarget,
  thumbnailElement,
  onPress,
  style,
  expiredAction,
}: TaskRowProps) {
  const { theme } = useTheme();
  const hasSubtaskProgress = subtasksTotal > 0;
  const subtaskProgress = hasSubtaskProgress ? subtasksDone / subtasksTotal : 0;
  const hasCounterProgress = (counterTarget ?? 0) > 0;
  const counterProgress = hasCounterProgress ? Math.min(1, counterCount / counterTarget!) : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? '#202020' : '#161616' },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {/* Thumbnail */}
      <View style={[styles.thumbnail, { backgroundColor: thumbnailColor }]}>
        {thumbnailElement ? (
          thumbnailElement
        ) : thumbnailUri ? (
          // Use cover resize mode so the image fills the square nicely
          <Image source={{ uri: thumbnailUri }} style={styles.thumbnailImg} resizeMode="cover" />
        ) : null}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={[styles.title, { color: '#FFFFFF' }]} numberOfLines={2}>
          {title}
        </Text>
        {meta ? (
          <Text style={[styles.meta, { color: '#9A9A9A' }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        {hasSubtaskProgress ? (
          <ProgressBar
            value={Math.round(subtaskProgress * 100)}
            style={styles.progress}
            colorOverride={gold[400]}
          />
        ) : null}
        {hasCounterProgress ? (
          <ProgressBar
            value={Math.round(counterProgress * 100)}
            style={styles.progress}
            colorOverride={gold[400]}
          />
        ) : null}
      </View>

      {/* Urgency chip or Expired Action */}
      {expiredAction ? (
        <Text style={{ color: '#D4B13A', fontFamily: fontFamily.semibold, fontSize: 14 }}>
          Reprogramar
        </Text>
      ) : deadline ? (
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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 12,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
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
    fontSize: 16,
    lineHeight: 22,
  },
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
  },
  progress: {
    marginTop: 4,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#333333',
    width: '100%', // Takes up the full flex width
  },
  chip: {
    flexShrink: 0,
  },
});
