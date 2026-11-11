import React from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import {
  CheckCircle2,
  ListChecks,
  RotateCw,
  Pin,
  Trash2,
  Flag,
} from 'lucide-react-native';

import { gold, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { styles } from '../styles/explore.styles';
import type { DailyTask, DailyTag, DailySortField, TimeView } from '../types';
import { getPriorityConfig } from '../constants';
import { formatTaskDateBadge, getRecurrenceLabel } from '../utils/dailyTaskDateUtils';
import type { DragHandle } from '@/components/DraggableTaskList';
import {
  useDailyTasksCustomizationStore,
  type DailyTaskCustomization,
} from '@/stores/dailyTasksCustomization.store';

export interface DailyTaskCardProps {
  item: DailyTask;
  drag?: DragHandle;
  isLast?: boolean;
  sortField: DailySortField;
  timeView: TimeView;
  tagMap: Map<string, DailyTag>;
  customization?: DailyTaskCustomization;
  onToggle: (task: DailyTask) => void;
  onOpenEdit: (task: DailyTask) => void;
  onToggleFavorite: (task: DailyTask) => void;
  onDelete: (task: DailyTask) => void;
}

export function DailyTaskCard({
  item,
  drag,
  isLast,
  tagMap,
  customization,
  onToggle,
  onOpenEdit,
  onToggleFavorite,
  onDelete,
}: DailyTaskCardProps) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const storeCustomization = useDailyTasksCustomizationStore((s) => s.customization);
  const activeCustomization = customization ?? storeCustomization;
  const isCompleted = item.is_completed;
  const itemTags = (item.tag_ids || [])
    .map((id) => tagMap.get(id))
    .filter(Boolean) as DailyTag[];

  const accentColor =
    itemTags[0]?.color ||
    (item.priority === 'urgent'
      ? '#EF4444'
      : item.priority === 'high'
      ? '#F97316'
      : item.priority === 'low'
      ? '#3B82F6'
      : gold[400]);

  return (
    <View
      key={item.id}
      style={[
        styles.compactRow,
        {
          backgroundColor: isCompleted
            ? (theme.dark ? '#101010' : theme.colors.surface)
            : theme.colors.surface,
          borderBottomColor: theme.colors.border,
          borderLeftWidth: 3.5,
          borderLeftColor: accentColor,
        },
        isCompleted && styles.compactRowCompleted,
        drag?.isActive && styles.compactRowDragging,
        isLast && { borderBottomWidth: 0 },
        Platform.OS === 'web' && ({ userSelect: 'none', WebkitUserSelect: 'none', cursor: drag?.isActive ? 'grabbing' : 'default', touchAction: drag?.isActive ? 'none' : 'pan-y' } as any),
      ]}
    >
      {/* Checkbox */}
      <Pressable
        hitSlop={8}
        onPress={() => {
          if (drag?.isActive || drag?.justDropped?.()) return;
          onToggle(item);
        }}
        style={styles.compactCheckBtn}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isCompleted }}
      >
        {isCompleted ? (
          <CheckCircle2 size={18} color="#34C759" />
        ) : (
          <View style={[styles.compactUncheckedCircle, { borderColor: theme.colors.border }]} />
        )}
      </Pressable>

      {/* Main Content */}
      <Pressable
        style={styles.rowMain}
        onPress={() => {
          if (drag?.isActive || drag?.justDropped?.()) return;
          onOpenEdit(item);
        }}
        accessibilityLabel={t('daily.edit_task_a11y', { title: item.title, defaultValue: `Editar tarea ${item.title}` })}
      >
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={[
            styles.compactTitle,
            { color: isCompleted ? theme.colors.foregroundMuted : theme.colors.foreground },
            isCompleted && styles.compactTitleCompleted,
          ]}
        >
          {item.title}
        </Text>

        {activeCustomization.showDescription && item.description ? (
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.compactDescription,
              { color: theme.colors.foregroundMuted },
              isCompleted && styles.compactDescriptionCompleted,
            ]}
          >
            {item.description}
          </Text>
        ) : null}

        <View style={styles.chipsRow}>
          {/* Tag chips */}
          {activeCustomization.showTags && itemTags.length > 0
            ? itemTags.map((tag) => (
                <View
                  key={tag.id}
                  style={[
                    styles.tagChip,
                    {
                      borderColor: tag.color ? `${tag.color}66` : theme.colors.border,
                      backgroundColor: tag.color
                        ? (theme.dark ? `${tag.color}22` : `${tag.color}15`)
                        : (theme.dark ? '#1E1E1E' : '#F3EFE6'),
                    },
                  ]}
                >
                  {tag.emoji && <Text style={styles.tagChipEmoji}>{tag.emoji}</Text>}
                  <Text
                    numberOfLines={1}
                    style={[styles.tagChipText, { color: tag.color || theme.colors.foreground }]}
                  >
                    {tag.name}
                  </Text>
                </View>
              ))
            : null}

          {/* Priority chip */}
          {activeCustomization.showPriority && item.priority && (() => {
            const pCfg = getPriorityConfig(item.priority, theme.dark, i18n.language);
            return (
              <View
                style={[
                  styles.priorityChip,
                  {
                    borderColor: pCfg.borderColor,
                    backgroundColor: pCfg.bgColor,
                  },
                ]}
              >
                <Flag size={9} color={pCfg.color} strokeWidth={2.4} />
                <Text style={[styles.priorityChipText, { color: pCfg.color }]}>{pCfg.label}</Text>
              </View>
            );
          })()}

          {/* Subtasks progress chip */}
          {activeCustomization.showSubtasksProgress && item.subtasks && item.subtasks.length > 0 && (() => {
            const allDone = item.subtasks.every((s) => s.is_completed);
            return (
              <View
                style={[
                  styles.subtasksBadgeChip,
                  {
                    backgroundColor: allDone
                      ? (theme.dark ? '#0F2916' : '#ECFDF5')
                      : (theme.dark ? '#231E10' : '#FDF4DC'),
                    borderColor: allDone
                      ? (theme.dark ? '#194D26' : '#A7F3D0')
                      : (theme.dark ? '#3D3310' : '#E8C56A'),
                  },
                ]}
              >
                <ListChecks
                  size={10}
                  color={allDone ? '#10B981' : (theme.dark ? gold[400] : '#926F12')}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.subtasksBadgeText,
                    {
                      color: allDone ? '#10B981' : (theme.dark ? gold[400] : '#926F12'),
                    },
                  ]}
                >
                  {item.subtasks.filter((s) => s.is_completed).length}/{item.subtasks.length}
                </Text>
              </View>
            );
          })()}

          {/* Recurrence badge chip */}
          {activeCustomization.showRecurrence && item.is_recurring && (
            <View style={styles.recurrenceBadgeChip}>
              <RotateCw size={10} color={gold[400]} strokeWidth={2} />
              <Text style={styles.recurrenceBadgeText}>
                {getRecurrenceLabel(item.recurrence_interval, item.recurrence_unit, i18n.language)}
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      {/* Pin quick toggle */}
      <Pressable
        hitSlop={8}
        onPress={() => {
          if (drag?.isActive || drag?.justDropped?.()) return;
          onToggleFavorite(item);
        }}
        style={styles.favQuickBtn}
        accessibilityLabel={item.is_favorite ? t('daily.unpin_task', { defaultValue: 'Desfijar tarea' }) : t('daily.pin_task', { defaultValue: 'Fijar tarea' })}
      >
        <Pin
          size={14}
          color={item.is_favorite ? gold[400] : theme.colors.foregroundMuted}
          fill={item.is_favorite ? gold[400] : 'transparent'}
          strokeWidth={1.8}
        />
      </Pressable>

      {/* Delete icon button */}
      <Pressable
        hitSlop={8}
        onPress={() => {
          if (drag?.isActive || drag?.justDropped?.()) return;
          onDelete(item);
        }}
        style={styles.deleteBtn}
        accessibilityLabel={t('daily.delete_task', { defaultValue: 'Eliminar tarea' })}
      >
        <Trash2 size={14} color={theme.colors.foregroundMuted} strokeWidth={1.8} />
      </Pressable>
    </View>
  );
}

export interface DailyOverdueTaskCardProps {
  item: DailyTask;
  drag?: DragHandle;
  isLast?: boolean;
  sortField: DailySortField;
  tagMap: Map<string, DailyTag>;
  upcomingWeekDays: { date: Date; dateStr: string; label: string; dayNum: string; isToday: boolean }[];
  customization?: DailyTaskCustomization;
  onToggle: (task: DailyTask) => void;
  onOpenEdit: (task: DailyTask) => void;
  onToggleFavorite: (task: DailyTask) => void;
  onDelete: (task: DailyTask) => void;
  onReschedule: (task: DailyTask, targetDateStr: string) => void;
  onOpenRescheduleDatePicker: (task: DailyTask) => void;
}

/**
 * Tarjeta de tarea atrasada con el diseño exacto del mockup:
 * [ (accent line)  Título           [ Etiqueta ]  [ 8 nov ]  📌  🗑 ]
 */
export function DailyOverdueTaskCard({
  item,
  drag,
  tagMap,
  customization,
  onToggle,
  onOpenEdit,
  onToggleFavorite,
  onDelete,
  onOpenRescheduleDatePicker,
}: DailyOverdueTaskCardProps) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const storeCustomization = useDailyTasksCustomizationStore((s) => s.customization);
  const activeCustomization = customization ?? storeCustomization;
  const isCompleted = item.is_completed;
  const dateBadge = formatTaskDateBadge(item.due_date, i18n.language);
  const itemTags = (item.tag_ids || [])
    .map((id) => tagMap.get(id))
    .filter(Boolean) as DailyTag[];

  const accentColor =
    itemTags[0]?.color ||
    (item.priority === 'urgent'
      ? '#EF4444'
      : item.priority === 'high'
      ? '#F97316'
      : item.priority === 'low'
      ? '#3B82F6'
      : gold[400]);

  return (
    <View
      key={item.id}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: theme.dark ? '#1A1813' : '#FAF6EE',
        borderWidth: 1,
        borderColor: theme.dark ? '#2B2313' : '#E8E0D2',
        borderLeftWidth: 3.5,
        borderLeftColor: accentColor,
        opacity: isCompleted ? 0.6 : 1,
      }}
    >
      {/* Título de la tarea */}
      <Pressable
        style={{ flex: 1, marginRight: 8 }}
        onPress={() => {
          if (drag?.isActive || drag?.justDropped?.()) return;
          onOpenEdit(item);
        }}
        accessibilityLabel={t('daily.edit_task_a11y', { title: item.title, defaultValue: `Editar tarea ${item.title}` })}
      >
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{
            fontSize: 13,
            fontFamily: 'Inter_600SemiBold',
            color: isCompleted ? theme.colors.foregroundMuted : theme.colors.foreground,
            textDecorationLine: isCompleted ? 'line-through' : 'none',
          }}
        >
          {item.title}
        </Text>
      </Pressable>

      {/* Acciones e insignias a la derecha */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {/* Chip de etiqueta */}
        {activeCustomization.showTags && itemTags.length > 0 && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 6,
              backgroundColor: itemTags[0]?.color
                ? (theme.dark ? `${itemTags[0]?.color}26` : `${itemTags[0]?.color}18`)
                : (theme.dark ? '#242424' : '#E8E8E8'),
              borderWidth: 1,
              borderColor: itemTags[0]?.color ? `${itemTags[0]?.color}66` : theme.colors.border,
            }}
          >
            {itemTags[0]?.emoji ? (
              <Text style={{ fontSize: 11 }}>{itemTags[0]?.emoji}</Text>
            ) : null}
            <Text
              style={{
                fontSize: 11,
                fontFamily: 'Inter_600SemiBold',
                color: itemTags[0]?.color || theme.colors.foreground,
                maxWidth: 70,
              }}
              numberOfLines={1}
            >
              {itemTags[0]?.name}
            </Text>
          </View>
        )}

        {/* Insignia de fecha vencida (pulsa para reprogramar fecha) */}
        {activeCustomization.showDates && (
          <Pressable
            onPress={() => onOpenRescheduleDatePicker(item)}
            hitSlop={4}
            accessibilityLabel={t('daily.overdue_pick_other_date', { defaultValue: 'Elegir otra fecha' })}
            style={{
              paddingHorizontal: 7,
              paddingVertical: 3,
              borderRadius: 6,
              backgroundColor: theme.dark ? '#262010' : '#FDF4DC',
              borderWidth: 1,
              borderColor: theme.dark ? '#4A3B10' : '#E8C56A',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontFamily: 'Inter_600SemiBold',
                color: gold[400],
              }}
            >
              {dateBadge.text}
            </Text>
          </Pressable>
        )}

        {/* Pin fijar/desfijar */}
        <Pressable
          hitSlop={8}
          onPress={() => {
            if (drag?.isActive || drag?.justDropped?.()) return;
            onToggleFavorite(item);
          }}
          style={{ padding: 4 }}
          accessibilityLabel={item.is_favorite ? t('daily.unpin_task', { defaultValue: 'Desfijar tarea' }) : t('daily.pin_task', { defaultValue: 'Fijar tarea' })}
        >
          <Pin
            size={14}
            color={item.is_favorite ? gold[400] : theme.colors.foregroundMuted}
            fill={item.is_favorite ? gold[400] : 'transparent'}
            strokeWidth={1.8}
          />
        </Pressable>

        {/* Papelera / Borrar */}
        <Pressable
          hitSlop={8}
          onPress={() => {
            if (drag?.isActive || drag?.justDropped?.()) return;
            onDelete(item);
          }}
          style={{ padding: 4 }}
          accessibilityLabel={t('daily.delete_task', { defaultValue: 'Eliminar tarea' })}
        >
          <Trash2 size={14} color={theme.colors.foregroundMuted} strokeWidth={1.8} />
        </Pressable>
      </View>
    </View>
  );
}
