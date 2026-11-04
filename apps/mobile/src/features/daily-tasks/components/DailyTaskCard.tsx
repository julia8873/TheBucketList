import React from 'react';
import { View, Text, Pressable, ScrollView, Platform } from 'react-native';
import {
  CheckCircle2,
  Calendar,
  Flag,
  ListChecks,
  RotateCw,
  Pin,
  Trash2,
  AlertCircle,
} from 'lucide-react-native';

import { gold, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { styles } from '../styles/explore.styles';
import type { DailyTask, DailyTag, DailySortField, TimeView } from '../types';
import { PRIORITY_CONFIG, getPriorityConfig } from '../constants';
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
  sortField,
  timeView,
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
  const dateBadge = formatTaskDateBadge(item.due_date, i18n.language);
  const itemTags = (item.tag_ids || [])
    .map((id) => tagMap.get(id))
    .filter(Boolean) as DailyTag[];

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

      {/* Main Content - tapping opens complete Edit modal */}
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
                <Text
                  style={[
                    styles.priorityChipText,
                    { color: pCfg.color },
                  ]}
                >
                  {pCfg.label}
                </Text>
              </View>
            );
          })()}

          {/* Date chip */}
          {activeCustomization.showDates && (timeView !== 'today' || dateBadge.isOverdue || !dateBadge.isToday) && (
            <View
              style={[
                styles.dateChip,
                {
                  backgroundColor: dateBadge.isOverdue && !isCompleted
                    ? (theme.dark ? '#2E1515' : '#FDE8E8')
                    : (theme.dark ? '#1E1E1E' : '#F4EFE6'),
                  borderColor: dateBadge.isOverdue && !isCompleted
                    ? (theme.dark ? '#5C1D1D' : '#FCA5A5')
                    : (theme.dark ? '#2A2A2A' : '#E8E2D2'),
                  borderWidth: 1,
                },
              ]}
            >
              <Calendar
                size={10}
                color={dateBadge.isOverdue && !isCompleted ? '#FF453A' : theme.colors.foregroundMuted}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.dateChipText,
                  {
                    color: dateBadge.isOverdue && !isCompleted ? '#FF453A' : theme.colors.foregroundMuted,
                  },
                ]}
              >
                {dateBadge.text}
              </Text>
            </View>
          )}

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

export function DailyOverdueTaskCard({
  item,
  drag,
  isLast,
  sortField,
  tagMap,
  upcomingWeekDays,
  customization,
  onToggle,
  onOpenEdit,
  onToggleFavorite,
  onDelete,
  onReschedule,
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

  return (
    <View
      key={item.id}
      style={[
        styles.compactRow,
        styles.overdueTaskRow,
        {
          backgroundColor: isCompleted
            ? (theme.dark ? '#101010' : theme.colors.surface)
            : theme.colors.surface,
          borderBottomColor: theme.colors.border,
        },
        isCompleted && styles.compactRowCompleted,
        drag?.isActive && styles.compactRowDragging,
        isLast && { borderBottomWidth: 0 },
        Platform.OS === 'web' && ({ userSelect: 'none', WebkitUserSelect: 'none', cursor: drag?.isActive ? 'grabbing' : 'default' } as any),
      ]}
    >
      {/* Top line: drag handle, checkbox, content, actions */}
      <View style={styles.overdueMainLine}>
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
            <View style={[styles.compactUncheckedCircle, { borderColor: '#F59E0B' }]} />
          )}
        </Pressable>

        {/* Content */}
        <Pressable
          style={styles.rowMain}
          onPress={() => {
            if (drag?.isActive || drag?.justDropped?.()) return;
            onOpenEdit(item);
          }}
          accessibilityLabel={t('daily.edit_task_a11y', { title: item.title, defaultValue: `Editar tarea ${item.title}` })}
        >
          <View style={styles.overdueTitleRow}>
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
          </View>

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

          {/* Chips */}
          <View style={styles.chipsRow}>
            {/* Overdue alert badge */}
            {activeCustomization.showDates && (
              <View style={styles.overdueBadgeChip}>
                <AlertCircle size={10} color="#F59E0B" strokeWidth={2.2} />
                <Text style={styles.overdueBadgeText}>{dateBadge.text}</Text>
              </View>
            )}

            {/* Tag chips */}
            {activeCustomization.showTags && itemTags.length > 0 &&
              itemTags.map((tag) => (
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
              ))}

            {/* Priority badge */}
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
                  <Text
                    style={[
                      styles.priorityChipText,
                      { color: pCfg.color },
                    ]}
                  >
                    {pCfg.label}
                  </Text>
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
          accessibilityLabel={item.is_favorite ? t('daily.unpin_task', 'Desfijar tarea') : t('daily.pin_task', 'Fijar tarea')}
        >
          <Pin
            size={14}
            color={item.is_favorite ? gold[400] : theme.colors.foregroundMuted}
            fill={item.is_favorite ? gold[400] : 'transparent'}
            strokeWidth={1.8}
          />
        </Pressable>

        {/* Delete action */}
        <Pressable
          hitSlop={8}
          onPress={() => {
            if (drag?.isActive || drag?.justDropped?.()) return;
            onDelete(item);
          }}
          style={styles.deleteBtn}
          accessibilityLabel={t('daily.delete_task', 'Eliminar tarea')}
        >
          <Trash2 size={14} color={theme.colors.foregroundMuted} strokeWidth={1.8} />
        </Pressable>
      </View>

      {/* Reschedule row: "Mover a:" with horizontal weekday pills */}
      <View style={styles.overdueMoveRow}>
        <Text style={[styles.overdueMoveLabel, { color: theme.colors.foregroundMuted }]}>{t('daily.overdue_move_to')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.overdueMoveScroll}
        >
          {upcomingWeekDays.map((d) => (
            <Pressable
              key={d.dateStr}
              style={[
                styles.overdueMovePill,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                d.isToday && styles.overdueMovePillToday,
              ]}
              onPress={() => onReschedule(item, d.dateStr)}
              hitSlop={4}
            >
              <Text
                style={[
                  styles.overdueMovePillText,
                  { color: theme.colors.foregroundMuted },
                  d.isToday && styles.overdueMovePillTextToday,
                ]}
              >
                {d.label} {d.isToday ? '' : d.dayNum}
              </Text>
            </Pressable>
          ))}

          {/* Custom calendar date picker button */}
          <Pressable
            style={[styles.overdueMovePillCal, { backgroundColor: theme.dark ? 'rgba(212,177,58,0.1)' : 'rgba(212,177,58,0.15)', borderColor: theme.colors.border }]}
            onPress={() => onOpenRescheduleDatePicker(item)}
            hitSlop={4}
            accessibilityLabel={t('daily.overdue_pick_other_date', 'Elegir otra fecha')}
          >
            <Calendar size={12} color="#D4B13A" />
            <Text style={styles.overdueMovePillCalText}>{t('daily.overdue_other_day')}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}
