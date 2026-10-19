import { themedStyleSheet } from '@bucketlist/ui';
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { CheckCircle2, GripVertical, Star, Users } from 'lucide-react-native';
import { useTheme } from '@bucketlist/ui';
import { styles } from '../styles/my-list.styles';
import { DragHandle } from '@/components/DraggableTaskList';
import { BucketCover } from '@/components/BucketCover';
import { resolveTaskImage } from '@/utils/taskImage';

interface TaskCompactItemRowProps {
  item: any;
  drag?: DragHandle;
  isSelected: boolean;
  isSelectionMode: boolean;
  isFav: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onToggleSelect: () => void;
  onToggleComplete: () => void;
}

function TaskCompactItemRowComponent({
  item,
  drag,
  isSelected,
  isSelectionMode,
  isFav,
  onPress,
  onLongPress,
  onToggleSelect,
  onToggleComplete,
}: TaskCompactItemRowProps) {
  const { theme } = useTheme();

  if (item.isHeader) {
    return (
      <View style={{ marginTop: 12, marginBottom: 4 }}>
        <Text style={[styles.sectionHeader, { color: theme.colors.foregroundMuted }]}>{item.title}</Text>
      </View>
    );
  }

  const isCompleted = item.status === 'completed';
  const imageValue = resolveTaskImage(item, { preferThumb: true });

  const subtasksTotal = item.item_subtasks?.length || 0;
  const subtasksDone = item.item_subtasks?.filter((s: any) => s.done).length || 0;
  const counterTarget = (item as any).counter_target ?? 0;
  const counterCount = (item as any).counter_count ?? 0;

  const progressText =
    subtasksTotal > 0
      ? `${subtasksDone}/${subtasksTotal}`
      : counterTarget > 0
      ? `${counterCount}/${counterTarget}`
      : null;

  const isHighPriority = item.priority === 'urgent' || item.priority === 'high';

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        localStyles.row,
        {
          backgroundColor: isCompleted
            ? (theme.dark ? '#121212' : '#EDE8DE')
            : theme.colors.surface,
          borderColor: theme.colors.border,
        },
        isSelected && {
          borderColor: theme.colors.primary,
          backgroundColor: 'rgba(212, 177, 58, 0.08)',
        },
        drag?.isActive && { borderColor: theme.colors.primary },
        { marginBottom: drag ? 8 : 0 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      {drag && (
        <View
          {...drag.panHandlers}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          style={localStyles.dragContainer}
          accessibilityLabel="Arrastrar para reordenar"
        >
          <GripVertical
            size={18}
            color={drag.isActive ? theme.colors.primary : theme.colors.foregroundMuted}
            strokeWidth={2}
          />
        </View>
      )}

      {isSelectionMode ? (
        <Pressable
          hitSlop={8}
          onPress={onToggleSelect}
          style={localStyles.checkBtn}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isSelected }}
        >
          {isSelected ? (
            <CheckCircle2 size={20} color={theme.colors.primary} fill={theme.colors.primary} />
          ) : (
            <View style={[localStyles.uncheckedCircle, { borderColor: theme.colors.border }]} />
          )}
        </Pressable>
      ) : (
        <Pressable
          hitSlop={10}
          onPress={onToggleComplete}
          style={localStyles.checkBtn}
          accessibilityRole="button"
          accessibilityLabel={isCompleted ? 'Desmarcar tarea' : 'Completar tarea'}
        >
          {isCompleted ? (
            <CheckCircle2 size={20} color="#34C759" fill="rgba(52, 199, 89, 0.15)" strokeWidth={2.2} />
          ) : (
            <View
              style={[
                localStyles.uncheckedCircle,
                { borderColor: theme.dark ? '#4E4E4E' : '#C4BDB0' },
              ]}
            />
          )}
        </Pressable>
      )}

      <View
        style={[
          localStyles.thumbContainer,
          {
            borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            backgroundColor: isCompleted
              ? (theme.dark ? '#121212' : '#EDE8DE')
              : theme.colors.surface,
          },
          isCompleted && { opacity: 0.55 },
        ]}
      >
        <BucketCover
          value={imageValue}
          title={item.title}
          categorySlug={item.category?.slug}
          seed={item.id}
          iconSize={22}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <Text
        numberOfLines={1}
        style={[
          localStyles.title,
          { color: isCompleted ? theme.colors.foregroundMuted : theme.colors.foreground },
          isCompleted && localStyles.titleCompleted,
        ]}
      >
        {item.title}
      </Text>

      <View style={localStyles.rightContainer}>
        {item.is_shared && <Users size={12} color={theme.colors.primary} />}
        {isHighPriority && <View style={localStyles.priorityDot} />}
        {progressText && (
          <View
            style={[
              localStyles.progressBadge,
              {
                backgroundColor: isCompleted
                  ? 'rgba(52, 199, 89, 0.14)'
                  : (theme.dark ? '#222222' : '#E8E3D8'),
              },
            ]}
          >
            <Text
              style={[
                localStyles.progressText,
                { color: isCompleted ? '#34C759' : theme.colors.foregroundMuted },
              ]}
            >
              {progressText}
            </Text>
          </View>
        )}
        {isFav && (
          <Star
            size={13}
            color={theme.colors.primary}
            fill={theme.colors.primary}
          />
        )}
      </View>
    </Pressable>
  );
}

export const TaskCompactItemRow = React.memo(TaskCompactItemRowComponent);

const localStyles = themedStyleSheet({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1,
  },
  dragContainer: {
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkBtn: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uncheckedCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.6,
  },
  thumbContainer: {
    width: 34,
    height: 34,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 11,
  },
  title: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    letterSpacing: -0.2,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.75,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginLeft: 8,
  },
  progressBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  progressText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
});
