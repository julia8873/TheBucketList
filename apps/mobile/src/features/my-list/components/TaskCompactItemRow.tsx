import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { CheckCircle2, GripVertical, Star } from 'lucide-react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
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
  if (item.isHeader) {
    return (
      <View style={{ marginTop: 12, marginBottom: 4 }}>
        <Text style={styles.sectionHeader}>{item.title}</Text>
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
        isCompleted && styles.compactRowCompleted,
        isSelected && { borderColor: gold[400], backgroundColor: 'rgba(212, 177, 58, 0.08)' },
        drag?.isActive && { borderColor: gold[400] },
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
          <GripVertical size={18} color={drag.isActive ? gold[400] : '#8F8F8F'} strokeWidth={2} />
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
            <CheckCircle2 size={19} color={gold[400]} fill={gold[400]} />
          ) : (
            <View style={[styles.compactUncheckedCircle, { borderColor: '#555555' }]} />
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
            <View style={styles.compactUncheckedCircle} />
          )}
        </Pressable>
      )}

      <Text
        numberOfLines={1}
        style={[styles.compactTitle, isCompleted && styles.compactTitleCompleted]}
      >
        {item.title}
      </Text>

      {isFav && (
        <Star size={13} color={gold[400]} fill={gold[400]} style={{ marginLeft: 8 }} />
      )}
    </Pressable>
  );
}
