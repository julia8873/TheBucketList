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
import { CheckCircle2, ChevronRight } from 'lucide-react-native';

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
  /** Colaboradores de la tarea (se pintan justo debajo del título, encima de las etiquetas). */
  participantsElement?: React.ReactNode;
  description?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
  expiredAction?: boolean;
  /** Si se indica, «Reprogramar» es un botón propio (no abre la tarea). */
  onReschedule?: () => void;
  /** Si la tarea está completada: atenúa la fila y muestra un tick dorado. */
  completed?: boolean;
  /**
   * Diseño de «Mi lista» (Mi_lista.html): miniatura 44, título en sans negrita 13,
   * etiquetas + progreso + colaboradores en una sola línea y chevron a la derecha.
   */
  dense?: boolean;
  /** Elemento a la derecha (p. ej. la estrella de favorita) — solo en `dense`. */
  trailingElement?: React.ReactNode;
  /** Oculta la miniatura (opción «Miniaturas de imagen» de Personalizar vista). */
  hideThumbnail?: boolean;
}

function TaskRowComponent({
  title,
  meta,
  deadline,
  thumbnailColor,
  thumbnailUri,
  subtasksDone = 0,
  subtasksTotal = 0,
  counterCount = 0,
  counterTarget,
  thumbnailElement,
  tagsElement,
  participantsElement,
  description,
  onPress,
  onLongPress,
  style,
  expiredAction,
  onReschedule,
  completed = false,
  dense = false,
  trailingElement,
  hideThumbnail = false,
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
      {hideThumbnail ? null : (
      <View
        style={[
          styles.thumbnail,
          dense && styles.thumbnailDense,
          { backgroundColor: thumbnailColor ?? theme.colors.surface },
          completed && styles.thumbnailCompleted,
        ]}
      >
        {thumbnailElement ? (
          thumbnailElement
        ) : thumbnailUri ? (
          // Use cover resize mode so the image fills the square nicely
          <Image source={{ uri: thumbnailUri }} style={styles.thumbnailImg} resizeMode="cover" />
        ) : null}
      </View>
      )}

      {/* Content */}
      <View style={[styles.content, completed && styles.contentCompleted]}>
        <Text
          style={[
            styles.title,
            dense && styles.titleDense,
            { color: completed ? theme.colors.foregroundSubtle : theme.colors.foreground },
          ]}
          numberOfLines={dense ? 1 : 2}
        >
          {title}
        </Text>
        {dense ? (
          (tagsElement || meta || participantsElement) ? (
            <View style={styles.denseMetaRow}>
              {tagsElement}
              {meta ? (
                <Text style={[styles.metaDense, { color: theme.colors.foregroundSubtle }]} numberOfLines={1}>
                  {meta}
                </Text>
              ) : null}
              {participantsElement}
            </View>
          ) : null
        ) : null}
        {!dense && participantsElement ? <View style={styles.participants}>{participantsElement}</View> : null}
        {!dense && tagsElement ? <View style={styles.tags}>{tagsElement}</View> : null}
        {!dense && meta ? (
          <Text style={[styles.meta, { color: completed ? theme.colors.foregroundSubtle : theme.colors.foregroundMuted }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        {description ? (
          <Text style={[styles.meta, { color: theme.colors.foregroundSubtle, fontSize: 12, marginTop: 2 }]} numberOfLines={1}>
            {description}
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
      {dense && trailingElement ? trailingElement : null}
      {completed ? (
        <CheckCircle2 size={22} color={theme.colors.primary} strokeWidth={1.8} />
      ) : expiredAction ? (
        onReschedule ? (
          <Pressable onPress={onReschedule} hitSlop={10} accessibilityRole="button" accessibilityLabel="Reprogramar">
            <Text style={{ color: theme.colors.primary, fontFamily: fontFamily.semibold, fontSize: 13 }}>
              Reprogramar
            </Text>
          </Pressable>
        ) : (
          <Text style={{ color: theme.colors.primary, fontFamily: fontFamily.semibold, fontSize: 14 }}>
            Reprogramar
          </Text>
        )
      ) : deadline ? (
        <UrgencyChip deadline={deadline} style={styles.chip} />
      ) : null}
      {dense && !expiredAction ? <ChevronRight size={16} color={theme.dark ? '#71717A' : theme.colors.foregroundSubtle} /> : null}
    </Pressable>
  );
}

export const TaskRow = React.memo(TaskRowComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  rowCompleted: {
    opacity: 0.8,
  },
  thumbnailDense: {
    width: 44,
    height: 44,
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
    fontSize: 16,
    lineHeight: 22,
  },
  titleDense: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    lineHeight: 18,
  },
  denseMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 1,
  },
  metaDense: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
  },
  participants: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
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
