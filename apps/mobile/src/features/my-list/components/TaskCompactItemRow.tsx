import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { CheckCircle2, GripVertical, Star } from 'lucide-react-native';
import { useTheme } from '@bucketlist/ui';
import { styles } from '../styles/my-list.styles';
import { DragHandle } from '@/components/DraggableTaskList';

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

export function TaskCompactItemRow({
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

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.compactRow,
        {
          backgroundColor: isCompleted
            ? (theme.dark ? '#121212' : '#EDE8DE')
            : theme.colors.surface,
          borderColor: theme.colors.border,
        },
        isSelected && { borderColor: theme.colors.primary, backgroundColor: 'rgba(212, 177, 58, 0.08)' },
        drag?.isActive && { borderColor: theme.colors.primary },
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      {drag && (
        <View
          {...drag.panHandlers}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          style={{ marginRight: 8, justifyContent: 'center', alignItems: 'center' }}
          accessibilityLabel="Arrastrar para reordenar"
        >
          <GripVertical size={18} color={drag.isActive ? theme.colors.primary : theme.colors.foregroundMuted} strokeWidth={2} />
        </View>
      )}

      {isSelectionMode ? (
        <Pressable
          hitSlop={8}
          onPress={onToggleSelect}
          style={styles.compactCheckBtn}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isSelected }}
        >
          {isSelected ? (
            <CheckCircle2 size={19} color={theme.colors.primary} fill={theme.colors.primary} />
          ) : (
            <View style={[styles.compactUncheckedCircle, { borderColor: theme.colors.border }]} />
          )}
        </Pressable>
      ) : (
        <Pressable
          hitSlop={10}
          onPress={onToggleComplete}
          style={styles.compactCheckBtn}
          accessibilityRole="button"
          accessibilityLabel={isCompleted ? 'Desmarcar tarea' : 'Completar tarea'}
        >
          {isCompleted ? (
            <CheckCircle2 size={19} color="#34C759" />
          ) : (
            <View style={[styles.compactUncheckedCircle, { borderColor: theme.colors.border }]} />
          )}
        </Pressable>
      )}

      <Text
        numberOfLines={1}
        style={[
          styles.compactTitle,
          { color: isCompleted ? theme.colors.foregroundMuted : theme.colors.foreground },
          isCompleted && styles.compactTitleCompleted,
        ]}
      >
        {item.title}
      </Text>

      {isFav && (
        <Star size={13} color={theme.colors.primary} fill={theme.colors.primary} style={{ marginLeft: 8 }} />
      )}
    </Pressable>
  );
}
