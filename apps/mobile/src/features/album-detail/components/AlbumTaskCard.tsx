import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { GripVertical, Check, Plus } from 'lucide-react-native';
import type { TaskItem } from '@/services/api/albumsService';
import { BucketCover } from '@/components/BucketCover';
import { hexToRgba } from '@/constants/tagPresets';
import { styles } from '../styles/album-detail.styles';

function getBadgeText(dateStr?: string): string | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const diffDays = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Mañana';
  if (diffDays > 1) return `${diffDays} días`;
  return null;
}

function getSubTitle(task: TaskItem): string {
  const cat =
    task.categoryName && !task.categoryName.startsWith('Prioridad ') && task.categoryName !== 'Sin categoría'
      ? task.categoryName
      : null;
  const parts: string[] = [];
  if (cat) parts.push(cat);
  if (task.stepsTotal && task.stepsTotal > 0) {
    parts.push(`${task.stepsCompleted ?? 0} de ${task.stepsTotal} pasos`);
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
}

export function AlbumTaskCard({
  task,
  canEdit,
  copiedIds,
  drag,
  onToggleCompleted,
  onCopySingleTask,
}: AlbumTaskCardProps) {
  const router = useRouter();
  const isDone = task.isCompleted;
  const subTitle = getSubTitle(task);
  const badge = getBadgeText(task.dueDate);

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
      ? 'Urgente'
      : itemPriority === 'high'
        ? 'Alta'
        : itemPriority === 'low'
          ? 'Baja'
          : 'Media';

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
      style={styles.taskCard}
      onPress={() => router.push(`/bucket/${task.id}`)}
      accessibilityRole="button"
    >
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
            Programada para:{' '}
            {new Date(task.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
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

        {drag && (
          <View {...drag.panHandlers} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }} accessibilityLabel="Arrastrar para reordenar">
            <GripVertical size={20} color="#8F8F8F" strokeWidth={1.8} />
          </View>
        )}

        {canEdit ? (
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
                <Text style={styles.taskAddedText}>Guardada</Text>
              </View>
            ) : (
              <Pressable hitSlop={8} onPress={(e) => onCopySingleTask(task, e)} style={styles.taskAddBtn}>
                <Plus size={14} color="#0D0D0D" strokeWidth={2.5} />
                <Text style={styles.taskAddBtnText}>Añadir</Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}
