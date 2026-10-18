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
  type ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { fontFamily, fontSize } from '../tokens/typography';
import { gold, dark } from '../tokens/colors';
import { useTheme } from '../theme/useTheme';
import { UrgencyChip } from './Pill';
import { ProgressBar } from './ProgressBar';
import { CheckCircle2 } from 'lucide-react-native';

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
  /** Etiquetas de la tarea (se pintan entre el título y la meta). */
  tagsElement?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
  expiredAction?: boolean;
  /** Si la tarea está completada: atenúa la fila y muestra un tick dorado. */
  completed?: boolean;
}

function TaskRowComponent({
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
  tagsElement,
  onPress,
  onLongPress,
  style,
  expiredAction,
  completed = false,
}: TaskRowProps) {
  const { theme } = useTheme();
  const hasSubtaskProgress = subtasksTotal > 0;
  const subtaskProgress = hasSubtaskProgress ? subtasksDone / subtasksTotal : 0;
  const hasCounterProgress = (counterTarget ?? 0) > 0;
  const counterProgress = hasCounterProgress ? Math.min(1, counterCount / counterTarget!) : 0;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed
            ? theme.colors.surfaceSunken
            : completed
            ? (theme.dark ? theme.colors.surfaceSunken : theme.colors.surface)
            : theme.colors.surface,
          borderColor: theme.colors.border,
        },
        completed && styles.rowCompleted,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {/* Thumbnail */}
      <View style={[styles.thumbnail, { backgroundColor: thumbnailColor || theme.colors.surfaceSunken }, completed && styles.thumbnailCompleted]}>
        {thumbnailElement ? (
          thumbnailElement
        ) : thumbnailUri ? (
          // Use cover resize mode so the image fills the square nicely
          <Image source={{ uri: thumbnailUri }} style={styles.thumbnailImg} resizeMode="cover" />
        ) : null}
      </View>

      {/* Content */}
      <View style={[styles.content, completed && styles.contentCompleted]}>
        <Text style={[styles.title, { color: completed ? theme.colors.foregroundSubtle : theme.colors.foreground }]} numberOfLines={2}>
          {title}
        </Text>
        {tagsElement ? <View style={styles.tags}>{tagsElement}</View> : null}
        {meta ? (
          <Text style={[styles.meta, { color: completed ? theme.colors.foregroundSubtle : theme.colors.foregroundMuted }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        {hasSubtaskProgress ? (
          <ProgressBar
            value={Math.round(subtaskProgress * 100)}
            style={styles.progress}
            colorOverride={theme.colors.primary}
          />
        ) : null}
        {hasCounterProgress ? (
          <ProgressBar
            value={Math.round(counterProgress * 100)}
            style={styles.progress}
            colorOverride={theme.colors.primary}
          />
        ) : null}
      </View>

      {/* Urgency chip, completed tick, or Expired Action */}
      {completed ? (
        <CheckCircle2 size={22} color={theme.colors.primary} strokeWidth={1.8} />
      ) : expiredAction ? (
        <Text style={{ color: theme.colors.primary, fontFamily: fontFamily.semibold, fontSize: 14 }}>
          Reprogramar
        </Text>
      ) : deadline ? (
        <UrgencyChip deadline={deadline} style={styles.chip} />
      ) : null}
    </Pressable>
  );
}

export const TaskRow = React.memo(TaskRowComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  rowCompleted: {
    opacity: 0.8,
  },
  thumbnailCompleted: {
    opacity: 0.45,
  },
  contentCompleted: {
    opacity: 0.65,
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
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 2,
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
