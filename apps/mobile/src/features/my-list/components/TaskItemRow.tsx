import React from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { CheckCircle2, GripVertical, Star, Trash2 } from 'lucide-react-native';
import { TaskRow, TagChip } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { BucketCover } from '@/components/BucketCover';
import { resolveTaskImage } from '@/utils/taskImage';
import { styles } from '../styles/my-list.styles';
import { DragHandle } from '@/components/DraggableTaskList';
import { Tag } from '@/hooks/useTags';

interface TaskItemRowProps {
  item: any;
  drag?: DragHandle;
  isFirstHeader?: boolean;
  isItemOwner: boolean;
  isItemExpired: boolean;
  daysAgo: number;
  itemTags: Tag[];
  isFav: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onPress: () => void;
  onLongPress: () => void;
  onToggleSelect: () => void;
  swipeableRefSetter: (ref: any) => void;
  theme: any;
}

export function TaskItemRow({
  item,
  drag,
  isFirstHeader,
  isItemOwner,
  isItemExpired,
  daysAgo,
  itemTags,
  isFav,
  isSelected,
  isSelectionMode,
  onDelete,
  onComplete,
  onPress,
  onLongPress,
  onToggleSelect,
  swipeableRefSetter,
  theme,
}: TaskItemRowProps) {
  if (item.isHeader) {
    return (
      <View style={{ marginTop: isFirstHeader ? 6 : 22, marginBottom: 4 }}>
        <Text style={styles.sectionHeader}>{item.title}</Text>
      </View>
    );
  }

  const subtasksTotal = item.item_subtasks?.length || 0;
  const subtasksDone = item.item_subtasks?.filter((s: any) => s.done).length || 0;

  let meta = '';
  if (!isItemOwner) {
    meta = 'Colaboración';
  } else if (isItemExpired && item.status !== 'completed') {
    meta = `Caducó hace ${daysAgo} días`;
  } else if (subtasksTotal > 0) {
    meta = `${subtasksDone} de ${subtasksTotal} pasos`;
  } else if (item.location) {
    meta = item.location;
  }

  const itemPriority = item.priority || 'medium';
  const itemPriorityColor =
    itemPriority === 'high' ? '#EF4444' : itemPriority === 'low' ? '#10B981' : '#D4B13A';
  const itemPriorityLabel =
    itemPriority === 'high' ? 'Alta' : itemPriority === 'low' ? 'Baja' : 'Media';

  const priorityBadge = (
    <View
      key="priority-badge"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 8,
        backgroundColor:
          itemPriority === 'high'
            ? 'rgba(239, 68, 68, 0.16)'
            : itemPriority === 'low'
            ? 'rgba(16, 185, 129, 0.16)'
            : 'rgba(212, 177, 58, 0.16)',
        borderWidth: 1,
        borderColor: itemPriorityColor,
      }}
    >
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: itemPriorityColor }} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: itemPriorityColor }}>
        {itemPriorityLabel}
      </Text>
    </View>
  );

  const favoriteBadge = isFav ? (
    <View
      key="favorite-badge"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        backgroundColor: 'rgba(212, 177, 58, 0.18)',
        borderWidth: 1,
        borderColor: gold[400],
      }}
    >
      <Star size={11} color={gold[400]} fill={gold[400]} />
      <Text style={{ fontSize: 11, fontWeight: '700', color: gold[400] }}>Favorita</Text>
    </View>
  ) : null;

  const tagsElement = (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
      {favoriteBadge}
      {priorityBadge}
      {itemTags.slice(0, 2).map((t) => (
        <TagChip key={t.id} label={t.name} variant="colored" color={t.color} emoji={t.emoji} size="sm" />
      ))}
      {itemTags.length > 2 && (
        <TagChip label={`+${itemTags.length - 2}`} variant="colored" color="#8A8A8A" size="sm" />
      )}
    </View>
  );

  const renderRightActions = (progress: any) => {
    if (!isItemOwner) return null;
    const opacity = progress.interpolate({
      inputRange: [0, 0.15, 1],
      outputRange: [0, 1, 1],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View style={{ opacity, width: 90, justifyContent: 'center', alignItems: 'flex-end' }}>
        <Pressable
          style={{
            width: 90,
            height: '100%',
            backgroundColor: theme.colors.error,
            borderTopRightRadius: 14,
            borderBottomRightRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => onDelete(item.id)}
        >
          <Trash2 color={theme.colors.errorForeground} size={24} />
        </Pressable>
      </Animated.View>
    );
  };

  const renderLeftActions = (progress: any) => {
    if (item.status === 'completed') return null;
    const opacity = progress.interpolate({
      inputRange: [0, 0.15, 1],
      outputRange: [0, 1, 1],
      extrapolate: 'clamp',
    });
    return (
      <Animated.View style={{ opacity, width: 90, justifyContent: 'center', alignItems: 'flex-start' }}>
        <Pressable
          style={{
            width: 90,
            height: '100%',
            backgroundColor: '#34C759',
            borderTopLeftRadius: 14,
            borderBottomLeftRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={() => onComplete(item.id)}
        >
          <CheckCircle2 color="#FFFFFF" size={24} />
        </Pressable>
      </Animated.View>
    );
  };

  const swipeableContent = (
    <Swipeable
      ref={swipeableRefSetter}
      enabled={!drag && !isSelectionMode}
      containerStyle={{ backgroundColor: '#0E0E0E', borderRadius: 14 }}
      childrenContainerStyle={{ backgroundColor: '#0E0E0E', borderRadius: 14 }}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      overshootRight={false}
      overshootLeft={false}
      onSwipeableOpen={(direction) => {
        if (direction === 'left' && item.status !== 'completed') {
          onComplete(item.id);
        } else if (direction === 'right') {
          if (isItemOwner) {
            Alert.alert(
              'Eliminar tarea',
              '¿Estás seguro de que quieres eliminar esta tarea?',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Eliminar', style: 'destructive', onPress: () => onDelete(item.id) },
              ]
            );
          }
        }
      }}
    >
      <TaskRow
        title={item.title}
        meta={meta}
        deadline={item.deadline}
        expiredAction={isItemExpired && item.status !== 'completed'}
        thumbnailElement={
          isItemExpired && item.status !== 'completed' ? (
            <View style={{ flex: 1, backgroundColor: '#202020', borderRadius: 12 }} />
          ) : (
            <BucketCover
              value={resolveTaskImage(item, { preferThumb: true })}
              title={item.title}
              categorySlug={item.category?.slug}
              seed={item.id}
              iconSize={56}
              style={StyleSheet.absoluteFill}
            />
          )
        }
        tagsElement={tagsElement}
        subtasksDone={subtasksDone}
        subtasksTotal={subtasksTotal}
        counterCount={(item as any).counter_count}
        counterTarget={(item as any).counter_target}
        completed={item.status === 'completed'}
        onPress={onPress}
        onLongPress={onLongPress}
      />
    </Swipeable>
  );

  const contentWithSelection = isSelectionMode ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Pressable
        hitSlop={8}
        onPress={onToggleSelect}
        style={{ paddingLeft: 2, paddingRight: 2 }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isSelected }}
      >
        {isSelected ? (
          <CheckCircle2 size={24} color={gold[400]} fill={gold[400]} />
        ) : (
          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#555555' }} />
        )}
      </Pressable>
      <View style={{ flex: 1 }}>{swipeableContent}</View>
    </View>
  ) : (
    swipeableContent
  );

  if (drag) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <View
          {...drag.panHandlers}
          hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
          style={{ width: 28, height: 56, alignItems: 'center', justifyContent: 'center' }}
          accessibilityLabel="Arrastrar para reordenar"
        >
          <GripVertical size={20} color={drag.isActive ? gold[400] : '#8F8F8F'} strokeWidth={2} />
        </View>
        <View style={{ flex: 1 }}>{contentWithSelection}</View>
      </View>
    );
  }

  return contentWithSelection;
}
