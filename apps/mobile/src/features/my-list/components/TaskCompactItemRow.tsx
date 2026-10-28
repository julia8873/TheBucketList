import { themedStyleSheet } from '@bucketlist/ui';
import React from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { CheckCircle2, GripVertical, Star, Trash2, Users } from 'lucide-react-native';
import { useTheme, confirm } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { styles } from '../styles/my-list.styles';
import type { DragHandle } from '@/components/DraggableTaskList';
import { BucketCover } from '@/components/BucketCover';
import { resolveTaskImage } from '@/utils/taskImage';
import type { TaskViewCustomization } from '@/stores/myListCustomization.store';
import type { Tag } from '@/hooks/useTags';
import { ParticipantsStack, useParticipantsOf } from '@/components/ItemParticipants';

interface TaskCompactItemRowProps {
  item: any;
  drag?: DragHandle;
  isSelected: boolean;
  isSelectionMode: boolean;
  isFav: boolean;
  itemTags?: Tag[];
  customization?: TaskViewCustomization;
  onPress: () => void;
  onLongPress: () => void;
  onToggleSelect: () => void;
  onToggleComplete: () => void;
  /** Si es false (colaboración) no se puede borrar deslizando. */
  isItemOwner?: boolean;
  onDelete?: () => void;
  swipeableRefSetter?: (ref: any) => void;
}

function TaskCompactItemRowComponent({
  item,
  drag,
  isSelected,
  isSelectionMode,
  isFav,
  itemTags,
  customization,
  onPress,
  onLongPress,
  onToggleSelect,
  onToggleComplete,
  isItemOwner = true,
  onDelete,
  swipeableRefSetter,
}: TaskCompactItemRowProps) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const swipeRef = React.useRef<Swipeable | null>(null);
  const participants = useParticipantsOf('task', item.id);

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
  const counterTarget = (item).counter_target ?? 0;
  const counterCount = (item).counter_count ?? 0;

  const progressText =
    subtasksTotal > 0
      ? `${subtasksDone}/${subtasksTotal}`
      : counterTarget > 0
      ? `${counterCount}/${counterTarget}`
      : null;

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

  const subParts: string[] = [];
  if (customization?.showCategoryLocation) {
    const isEn = i18n.language?.startsWith('en');
    const categoryName = isEn
      ? item.category?.name_en || item.category?.name_es
      : item.category?.name_es || item.category?.name_en;
    const catOrLoc = categoryName || item.category?.name || item.location;
    if (catOrLoc) subParts.push(catOrLoc);
  }
  if (customization?.showDescription && item.description) {
    subParts.push(item.description.trim());
  }
  const extraSubtitle = subParts.join(' · ');

  // Decide which meta badges to render below the title
  const showPriority = customization?.showPriority ?? true;
  const showTags = customization?.showTags ?? false;
  const showProgress = customization?.showSubtasksProgress ?? true;
  const showDates = customization?.showDates ?? false;
  const visibleParticipants =
    (customization?.showCollaborators ?? false) && participants && participants.length > 0 ? participants : undefined;

  const hasMetaBadges =
    !!visibleParticipants ||
    showPriority ||
    (showTags && itemTags && itemTags.length > 0) ||
    (showProgress && !!progressText) ||
    (showDates && !!(item.deadline || item.completed_at)) ||
    isFav;

  const row = (
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
        { marginBottom: drag ? 6 : 0 },
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

      {isSelectionMode && (
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

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text
          numberOfLines={2}
          style={[
            localStyles.title,
            { color: isCompleted ? theme.colors.foregroundMuted : theme.colors.foreground },
            isCompleted && localStyles.titleCompleted,
          ]}
        >
          {item.title}
        </Text>
        {extraSubtitle ? (
          <Text numberOfLines={1} style={{ fontSize: 11, color: theme.colors.foregroundMuted, marginTop: 1 }}>
            {extraSubtitle}
          </Text>
        ) : null}
        {hasMetaBadges && (
          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {item.is_shared && <Users size={12} color={theme.colors.primary} />}
            {showPriority && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3,
                  paddingHorizontal: 6,
                  paddingVertical: 1.5,
                  borderRadius: 6,
                  backgroundColor:
                    itemPriority === 'urgent' || itemPriority === 'high'
                      ? 'rgba(239, 68, 68, 0.14)'
                      : itemPriority === 'low'
                      ? 'rgba(16, 185, 129, 0.14)'
                      : 'rgba(212, 177, 58, 0.14)',
                  borderWidth: 1,
                  borderColor: itemPriorityColor,
                }}
              >
                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: itemPriorityColor }} />
                <Text style={{ fontSize: 10, fontWeight: '700', color: itemPriorityColor }}>
                  {itemPriorityLabel}
                </Text>
              </View>
            )}
            {showTags && itemTags && itemTags.length > 0 && (
              <>
                {itemTags.slice(0, 2).map((t) => (
                  <View
                    key={t.id}
                    style={{
                      paddingHorizontal: 6,
                      paddingVertical: 1.5,
                      borderRadius: 6,
                      backgroundColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                      borderWidth: 1,
                      borderColor: t.color || theme.colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 10, color: t.color || theme.colors.foreground, fontWeight: '600' }}>
                      {t.emoji ? `${t.emoji} ` : ''}{t.name}
                    </Text>
                  </View>
                ))}
                {itemTags.length > 2 && (
                  <Text style={{ fontSize: 10, color: theme.colors.foregroundMuted, fontWeight: '600' }}>
                    +{itemTags.length - 2}
                  </Text>
                )}
              </>
            )}
            {showProgress && progressText && (
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
            {showDates && (item.deadline || item.completed_at) && (
              <Text style={{ fontSize: 10, color: theme.colors.foregroundMuted }}>
                {new Date(item.status === 'completed' && item.completed_at ? item.completed_at : item.deadline).toLocaleDateString(i18n.language?.startsWith('en') ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short' })}
              </Text>
            )}
            {isFav && (
              <Star
                size={12}
                color={theme.colors.primary}
                fill={theme.colors.primary}
              />
            )}
            {visibleParticipants && (
              <View style={{ marginLeft: 'auto' }}>
                <ParticipantsStack
                  participants={visibleParticipants}
                  max={3}
                  ringColor={isCompleted ? (theme.dark ? '#121212' : '#EDE8DE') : theme.colors.surface}
                  disabled={isSelectionMode || !!drag}
                />
              </View>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );

  // Deslizar a la derecha = completar/desmarcar, a la izquierda = borrar (solo propietario)
  const canSwipe = !drag && !isSelectionMode;
  if (!canSwipe) return row;

  const askComplete = () => {
    if (isCompleted) {
      onToggleComplete();
      swipeRef.current?.close();
      return;
    }
    confirm.show({
      title: t('bucket.complete_confirm_title', { defaultValue: '¿Marcar como completada?' }),
      message: t('bucket.complete_confirm_message', { title: item.title, defaultValue: `¿Quieres marcar «${item.title}» como completada?` }),
      confirmLabel: t('common.complete', { defaultValue: 'Completar' }),
      cancelLabel: t('common.cancel', { defaultValue: 'Cancelar' }),
      tone: 'success',
      onConfirm: () => {
        onToggleComplete();
        swipeRef.current?.close();
      },
      onCancel: () => swipeRef.current?.close(),
    });
  };

  const askDelete = () => {
    confirm.show({
      title: t('bucket.delete_task_title'),
      message: t('bucket.delete_task_confirm', { title: item.title }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      destructive: true,
      onConfirm: () => onDelete?.(),
      onCancel: () => swipeRef.current?.close(),
    });
  };

  const fade = (progress: any) =>
    progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' });

  const renderLeftActions = (progress: any) => (
    <Animated.View style={{ opacity: fade(progress), width: 80, justifyContent: 'center' }}>
      <View style={[localStyles.swipeAction, { backgroundColor: '#34C759', borderTopLeftRadius: 13, borderBottomLeftRadius: 13 }]}>
        <CheckCircle2 color="#FFFFFF" size={22} />
      </View>
    </Animated.View>
  );

  const renderRightActions = (progress: any) => {
    if (!isItemOwner || !onDelete) return null;
    return (
      <Animated.View style={{ opacity: fade(progress), width: 80, justifyContent: 'center' }}>
        <View style={[localStyles.swipeAction, { backgroundColor: theme.colors.error, borderTopRightRadius: 13, borderBottomRightRadius: 13 }]}>
          <Trash2 color={theme.colors.errorForeground} size={22} />
        </View>
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={(r) => {
        swipeRef.current = r;
        swipeableRefSetter?.(r);
      }}
      renderLeftActions={renderLeftActions}
      renderRightActions={isItemOwner && onDelete ? renderRightActions : undefined}
      overshootLeft={false}
      overshootRight={false}
      onSwipeableOpen={(direction) => {
        if (direction === 'left') askComplete();
        else if (direction === 'right' && isItemOwner && onDelete) askDelete();
      }}
    >
      {row}
    </Swipeable>
  );
}

export const TaskCompactItemRow = React.memo(TaskCompactItemRowComponent);

const localStyles = themedStyleSheet({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1,
  },
  dragContainer: {
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeAction: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  // kept for backward compat but now unused in main flow
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
