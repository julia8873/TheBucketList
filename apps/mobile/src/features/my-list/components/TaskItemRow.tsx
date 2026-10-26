import React from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { CheckCircle2, GripVertical, Star, Trash2 } from 'lucide-react-native';
import { TaskRow, TagChip, confirm } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { BucketCover } from '@/components/BucketCover';
import { resolveTaskImage } from '@/utils/taskImage';
import { styles } from '../styles/my-list.styles';
import type { DragHandle } from '@/components/DraggableTaskList';
import type { Tag } from '@/hooks/useTags';
import type { TaskViewCustomization } from '@/stores/myListCustomization.store';

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
  customization?: TaskViewCustomization;
  onDelete: (id: string) => void;
  onComplete: (id: string) => void;
  onPress: () => void;
  onLongPress: () => void;
  onToggleSelect: () => void;
  swipeableRefSetter: (ref: any) => void;
  theme: any;
}

function TaskItemRowComponent({
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
  customization,
  onDelete,
  onComplete,
  onPress,
  onLongPress,
  onToggleSelect,
  swipeableRefSetter,
  theme,
}: TaskItemRowProps) {
  const localSwipeableRef = React.useRef<Swipeable | null>(null);
  const { t, i18n } = useTranslation();

  if (item.isHeader) {
    return (
      <View style={{ marginTop: isFirstHeader ? 0 : 20, marginBottom: 0 }}>
        <Text style={[styles.sectionHeader, { marginTop: 8, marginBottom: 4 }]}>{item.title}</Text>
      </View>
    );
  }

  const showPriority = customization?.showPriority ?? true;
  const showTags = customization?.showTags ?? true;
  const showDates = customization?.showDates ?? true;
  const showCategoryLoc = customization?.showCategoryLocation ?? true;
  const showSubtasks = customization?.showSubtasksProgress ?? true;
  const showDesc = customization?.showDescription ?? false;

  const subtasksTotal = item.item_subtasks?.length || 0;
  const subtasksDone = item.item_subtasks?.filter((s: any) => s.done).length || 0;

  let meta = '';
  if (!isItemOwner) {
    meta = t('tasks.collaboration', { defaultValue: 'Colaboración' });
  } else if (showDates && isItemExpired && item.status !== 'completed') {
    meta = t('tasks.expired_days_ago', { days: daysAgo, defaultValue: `Caducó hace ${daysAgo} días` });
  } else if (showSubtasks && subtasksTotal > 0) {
    meta = t('tasks.steps_count', { done: subtasksDone, total: subtasksTotal, defaultValue: `${subtasksDone} de ${subtasksTotal} pasos` });
  } else if (showCategoryLoc) {
    const isEn = i18n.language?.startsWith('en');
    const categoryName = isEn
      ? item.category?.name_en || item.category?.name_es
      : item.category?.name_es || item.category?.name_en;
    if (categoryName || item.category?.name || item.location) {
      meta = [categoryName || item.category?.name, item.location].filter(Boolean).join(' · ');
    }
  }

  const itemPriority = item.priority || 'medium';
  const itemPriorityColor =
    itemPriority === 'urgent'
      ? '#DC2626'
      : itemPriority === 'high'
      ? '#EF4444'
      : itemPriority === 'low'
      ? '#10B981'
      : '#D4B13A';
  const itemPriorityLabel =
    itemPriority === 'urgent'
      ? t('common.urgent')
      : itemPriority === 'high'
      ? t('common.high')
      : itemPriority === 'low'
      ? t('common.low')
      : t('common.medium');

  const priorityBadge = showPriority ? (
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
          itemPriority === 'high' || itemPriority === 'urgent'
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
  ) : null;

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
      <Text style={{ fontSize: 11, fontWeight: '700', color: gold[400] }}>{t('common.favorite', { defaultValue: 'Favorita' })}</Text>
    </View>
  ) : null;

  const visibleTags = showTags ? itemTags : [];
  const hasTagsOrBadges = favoriteBadge || priorityBadge || visibleTags.length > 0;

  const tagsElement = hasTagsOrBadges ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
      {favoriteBadge}
      {priorityBadge}
      {visibleTags.slice(0, 2).map((t) => (
        <TagChip key={t.id} label={t.name} variant="colored" color={t.color} emoji={t.emoji} size="sm" />
      ))}
      {visibleTags.length > 2 && (
        <TagChip label={`+${visibleTags.length - 2}`} variant="colored" color="#8A8A8A" size="sm" />
      )}
    </View>
  ) : null;

  /** Pregunta antes de marcar como completada (swipe a la derecha o toque en el botón verde). */
  const askComplete = () => {
    confirm.show({
      title: t('bucket.complete_confirm_title', { defaultValue: '¿Marcar como completada?' }),
      message: t('bucket.complete_confirm_message', { title: item.title, defaultValue: `¿Quieres marcar «${item.title}» como completada?` }),
      confirmLabel: t('common.complete', { defaultValue: 'Completar' }),
      cancelLabel: t('common.cancel', { defaultValue: 'Cancelar' }),
      tone: 'success',
      onConfirm: () => {
        onComplete(item.id);
        localSwipeableRef.current?.close();
      },
      onCancel: () => localSwipeableRef.current?.close(),
    });
  };

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
          onPress={askComplete}
        >
          <CheckCircle2 color="#FFFFFF" size={24} />
        </Pressable>
      </Animated.View>
    );
  };

  const swipeableContent = (
    <Swipeable
      ref={(r) => {
        localSwipeableRef.current = r;
        swipeableRefSetter(r);
      }}
      enabled={!drag && !isSelectionMode}
      containerStyle={{ backgroundColor: theme.colors.surface, borderRadius: 14 }}
      childrenContainerStyle={{ backgroundColor: theme.colors.surface, borderRadius: 14 }}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      overshootRight={false}
      overshootLeft={false}
      onSwipeableOpen={(direction) => {
        if (direction === 'left' && item.status !== 'completed') {
          askComplete();
        } else if (direction === 'right') {
          if (isItemOwner) {
            confirm.show({
              title: t('bucket.delete_task_title'),
              message: t('bucket.delete_task_confirm', { title: item.title }),
              confirmLabel: t('common.delete'),
              cancelLabel: t('common.cancel'),
              destructive: true,
              onConfirm: () => onDelete(item.id),
              onCancel: () => localSwipeableRef.current?.close(),
            });
          }
        }
      }}
    >
      <TaskRow
        title={item.title}
        meta={meta}
        deadline={showDates ? item.deadline : undefined}
        expiredAction={showDates && isItemExpired && item.status !== 'completed'}
        thumbnailElement={
          isItemExpired && item.status !== 'completed' ? (
            <View style={{ flex: 1, backgroundColor: theme.colors.surfaceSunken, borderRadius: 12 }} />
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
        description={showDesc && item.description ? item.description.trim() : undefined}
        subtasksDone={showSubtasks ? subtasksDone : 0}
        subtasksTotal={showSubtasks ? subtasksTotal : 0}
        counterCount={showSubtasks ? (item).counter_count : 0}
        counterTarget={showSubtasks ? (item).counter_target : undefined}
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

export const TaskItemRow = React.memo(TaskItemRowComponent);
