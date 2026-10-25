import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { GripVertical, Check, Plus, CheckCircle2 } from 'lucide-react-native';
import type { TaskItem } from '@/services/api/albumsService';
import { BucketCover } from '@/components/BucketCover';
import { hexToRgba } from '@/constants/tagPresets';
import { styles } from '../styles/album-detail.styles';

import { useTranslation } from '@bucketlist/shared';

function getBadgeText(dateStr?: string, t?: (k: any, o?: any) => string): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t ? t('common.today') : 'Hoy';
  if (diffDays === 1) return t ? t('calendar.tomorrow') : 'Mañana';
  if (diffDays > 1) return t ? t('tasks.days_count', { count: diffDays }) : `${diffDays} días`;
  return null;
}

function getSubTitle(task: TaskItem, t?: (k: any, o?: any) => string): string {
  const cat =
    task.categoryName && !task.categoryName.startsWith('Prioridad ') && task.categoryName !== 'Sin categoría'
      ? task.categoryName
      : null;
  const parts: string[] = [];
  if (cat) parts.push(cat);
  if (task.stepsTotal && task.stepsTotal > 0) {
    parts.push(t ? t('tasks.steps_count', { done: task.stepsCompleted ?? 0, total: task.stepsTotal }) : `${task.stepsCompleted ?? 0} de ${task.stepsTotal} pasos`);
  } else if (task.location) {
    parts.push(task.location);
  }
  return parts.join(' · ');
}

interface AlbumTaskCardProps {
  task: TaskItem;
  canEdit: boolean;
  copiedIds?: string[];
  drag?: { panHandlers: any; isActive: boolean };
  onToggleCompleted: (task: TaskItem, e: any) => void;
  onCopySingleTask: (task: TaskItem, e: any) => void;
  /** Modo selección múltiple (acciones en lote). */
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (task: TaskItem) => void;
  onLongPressTask?: (task: TaskItem) => void;
}

export function AlbumTaskCard({
  task,
  canEdit,
  copiedIds,
  drag,
  onToggleCompleted,
  onCopySingleTask,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  onLongPressTask,
}: AlbumTaskCardProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-ES';
  const isDone = task.isCompleted;
  const subTitle = getSubTitle(task, t);
  const badge = getBadgeText(task.dueDate, t);

  const itemPriority = task.priority || 'medium';
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
          itemPriority === 'urgent' || itemPriority === 'high'
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

  return (
    <Pressable
      style={[styles.taskCard, isSelectionMode && isSelected && { borderColor: '#D4B13A', borderWidth: 1 }]}
      onPress={() => {
        if (isSelectionMode) onToggleSelect?.(task);
        else router.push(`/bucket/${task.id}`);
      }}
      onLongPress={canEdit && !isSelectionMode && !drag ? () => onLongPressTask?.(task) : undefined}
      delayLongPress={350}
      accessibilityRole={isSelectionMode ? 'checkbox' : 'button'}
      accessibilityState={isSelectionMode ? { checked: isSelected } : undefined}
    >
      {isSelectionMode && (
        <View style={{ marginRight: 10 }}>
          {isSelected ? (
            <CheckCircle2 size={24} color="#D4B13A" fill="#D4B13A" />
          ) : (
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#555555' }} />
          )}
        </View>
      )}
      <View style={[styles.taskThumbContainer, isDone && { opacity: 0.5 }]}>
        <BucketCover
          value={task.imageValue ?? null}
          title={task.title}
          categorySlug={task.categorySlug}
          seed={task.id}
          iconSize={56}
          style={styles.taskThumb}
        />
      </View>
      <View style={styles.taskContent}>
        <Text
          style={[styles.taskTitle, isDone && { color: '#BDB7AA', textDecorationLine: 'line-through' }]}
          numberOfLines={2}
        >
          {task.title}
        </Text>
        {subTitle.length > 0 && <Text style={styles.taskSub}>{subTitle}</Text>}
        {!isDone && task.dueDate && new Date(task.dueDate).getTime() < new Date().setHours(0, 0, 0, 0) && (
          <Text style={[styles.taskSub, { color: '#EF4444', marginTop: 2 }]}>
            {t('tasks.scheduled_for', {
              date: new Date(task.dueDate).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
            })}
          </Text>
        )}
        {!isDone && task.stepsTotal !== undefined && task.stepsTotal > 0 && (
          <View style={styles.taskStepsTrack}>
            <View
              style={[
                styles.taskStepsFill,
                { width: `${Math.round(((task.stepsCompleted ?? 0) / task.stepsTotal) * 100)}%` },
              ]}
            />
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
          {priorityBadge}
          {task.tags &&
            task.tags.slice(0, 3).map((t) => (
              <View
                key={t.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3,
                  paddingHorizontal: 6,
                  paddingVertical: 1.5,
                  borderRadius: 6,
                  backgroundColor: hexToRgba(t.color || '#D4B13A', 0.16),
                  borderWidth: 0.5,
                  borderColor: t.color || '#D4B13A',
                }}
              >
                {t.emoji ? <Text style={{ fontSize: 9 }}>{t.emoji}</Text> : null}
                <Text style={{ fontSize: 10, fontWeight: '600', color: t.color || '#D4B13A' }}>
                  {t.name}
                </Text>
              </View>
            ))}
          {task.tags && task.tags.length > 3 && (
            <Text style={{ fontSize: 10, color: '#8A8A8A' }}>+{task.tags.length - 3}</Text>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {!isDone && badge && (
          <View style={styles.taskBadge}>
            <Text style={styles.taskBadgeText}>{badge}</Text>
          </View>
        )}

        {drag && !isSelectionMode && (
          <View {...drag.panHandlers} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }} accessibilityLabel={t('albums.drag_reorder')}>
            <GripVertical size={20} color="#8F8F8F" strokeWidth={1.8} />
          </View>
        )}

        {isSelectionMode ? null : canEdit ? (
          <Pressable
            hitSlop={8}
            onPress={(e) => onToggleCompleted(task, e)}
            style={[styles.checkCircleTouch, isDone ? styles.checkCircleDone : styles.checkCircleEmpty]}
          >
            {isDone && <Check size={16} color="#0D0D0D" strokeWidth={3} />}
          </Pressable>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isDone && (
              <View style={styles.readOnlyDoneBadge}>
                <Check size={14} color="#10B981" strokeWidth={2.5} />
              </View>
            )}
            {copiedIds?.includes(task.id) ? (
              <View style={styles.taskAddedBadge}>
                <Check size={12} color="#D4B13A" strokeWidth={2.5} />
                <Text style={styles.taskAddedText}>{t('common.saved')}</Text>
              </View>
            ) : (
              <Pressable hitSlop={8} onPress={(e) => onCopySingleTask(task, e)} style={styles.taskAddBtn}>
                <Plus size={14} color="#0D0D0D" strokeWidth={2.5} />
                <Text style={styles.taskAddBtnText}>{t('common.add')}</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}
