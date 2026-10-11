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
  style?: ViewStyle;
  expiredAction?: boolean;
  /** Si la tarea está completada: atenúa la fila y muestra un tick dorado. */
  completed?: boolean;
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
  tagsElement,
  onPress,
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
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? '#202020' : '#161616' },
        completed && styles.rowCompleted,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {/* Thumbnail */}
      <View style={[styles.thumbnail, { backgroundColor: thumbnailColor }, completed && styles.thumbnailCompleted]}>
        {thumbnailElement ? (
          thumbnailElement
        ) : thumbnailUri ? (
          // Use cover resize mode so the image fills the square nicely
          <Image source={{ uri: thumbnailUri }} style={styles.thumbnailImg} resizeMode="cover" />
        ) : null}
      </View>

      {/* Content */}
      <View style={[styles.content, completed && styles.contentCompleted]}>
        <Text style={[styles.title, { color: completed ? '#7A7A7A' : '#FFFFFF' }]} numberOfLines={2}>
          {title}
        </Text>
        {tagsElement ? <View style={styles.tags}>{tagsElement}</View> : null}
        {meta ? (
          <Text style={[styles.meta, { color: completed ? '#5C5C5C' : '#9A9A9A' }]} numberOfLines={1}>
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

      {/* Urgency chip, completed tick, or Expired Action */}
      {completed ? (
        <CheckCircle2 size={22} color={gold[400]} strokeWidth={1.8} />
      ) : expiredAction ? (
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
    backgroundColor: '#161616',
  },
  rowCompleted: {
    borderColor: '#202020',
    backgroundColor: '#141414',
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
