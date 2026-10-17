import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import {
  CheckCircle2,
  Calendar,
  Flag,
  ListChecks,
  RotateCw,
  Star,
  Trash2,
  AlertCircle,
} from 'lucide-react-native';

import { gold, useTheme } from '@bucketlist/ui';
import { styles } from '../styles/explore.styles';
import { DailyTask, DailyTag, DailySortField, TimeView } from '../types';
import { PRIORITY_CONFIG } from '../constants';
import { formatTaskDateBadge, getRecurrenceLabel } from '../utils/dailyTaskDateUtils';
import { DragHandle } from '@/components/DraggableTaskList';

export interface DailyTaskCardProps {
  item: DailyTask;
  drag?: DragHandle;
  isLast?: boolean;
  sortField: DailySortField;
  timeView: TimeView;
  tagMap: Map<string, DailyTag>;
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
  onToggle,
  onOpenEdit,
  onToggleFavorite,
  onDelete,
}: DailyTaskCardProps) {
  const { theme } = useTheme();
  const isCompleted = item.is_completed;
  const dateBadge = formatTaskDateBadge(item.due_date);
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
            ? (theme.dark ? '#101010' : '#EDE8DE')
            : theme.colors.surface,
          borderBottomColor: theme.colors.border,
        },
        isCompleted && styles.compactRowCompleted,
        drag?.isActive && styles.compactRowDragging,
        isLast && { borderBottomWidth: 0 },
      ]}
    >

      {/* Checkbox */}
      <Pressable
        hitSlop={8}
        onPress={() => onToggle(item)}
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
          if (drag?.isActive) return;
          onOpenEdit(item);
        }}
        accessibilityLabel={`Editar tarea ${item.title}`}
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

        {item.description ? (
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
          {itemTags.length > 0
            ? itemTags.map((tag) => (
                <View
                  key={tag.id}
                  style={[
                    styles.tagChip,
                    {
                      borderColor: tag.color ? `${tag.color}66` : '#333',
                      backgroundColor: tag.color ? `${tag.color}1F` : '#1E1E1E',
                    },
                  ]}
                >
                  {tag.emoji && <Text style={styles.tagChipEmoji}>{tag.emoji}</Text>}
                  <Text
                    numberOfLines={1}
                    style={[styles.tagChipText, { color: tag.color || '#DDD' }]}
                  >
                    {tag.name}
                  </Text>
                </View>
              ))
            : null}

          {/* Priority chip */}
          {item.priority && (
            <View
              style={[
                styles.priorityChip,
                {
                  borderColor: PRIORITY_CONFIG[item.priority]?.borderColor,
                  backgroundColor: PRIORITY_CONFIG[item.priority]?.bgColor,
                },
              ]}
            >
              <Flag size={9} color={PRIORITY_CONFIG[item.priority]?.color} strokeWidth={2.4} />
              <Text
                style={[
                  styles.priorityChipText,
                  { color: PRIORITY_CONFIG[item.priority]?.color },
                ]}
              >
                {PRIORITY_CONFIG[item.priority]?.label}
              </Text>
            </View>
          )}

          {/* Date chip */}
          {(timeView !== 'today' || dateBadge.isOverdue || dateBadge.text !== 'Hoy') && (
            <View
              style={[
                styles.dateChip,
                dateBadge.isOverdue && !isCompleted && styles.dateChipOverdue,
              ]}
            >
              <Calendar
                size={10}
                color={dateBadge.isOverdue && !isCompleted ? '#FF453A' : '#888'}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.dateChipText,
                  dateBadge.isOverdue && !isCompleted && styles.dateChipTextOverdue,
                ]}
              >
                {dateBadge.text}
              </Text>
            </View>
          )}

          {/* Subtasks progress chip */}
          {item.subtasks && item.subtasks.length > 0 && (
            <View
              style={[
                styles.subtasksBadgeChip,
                item.subtasks.every((s) => s.is_completed) && styles.subtasksBadgeChipDone,
              ]}
            >
              <ListChecks
                size={10}
                color={item.subtasks.every((s) => s.is_completed) ? '#34C759' : gold[400]}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.subtasksBadgeText,
                  item.subtasks.every((s) => s.is_completed) && styles.subtasksBadgeTextDone,
                ]}
              >
                {item.subtasks.filter((s) => s.is_completed).length}/{item.subtasks.length}
              </Text>
            </View>
          )}

          {/* Recurrence badge chip */}
          {item.is_recurring && (
            <View style={styles.recurrenceBadgeChip}>
              <RotateCw size={10} color={gold[400]} strokeWidth={2} />
              <Text style={styles.recurrenceBadgeText}>
                {getRecurrenceLabel(item.recurrence_interval, item.recurrence_unit)}
              </Text>
            </View>
          )}
        </View>
      </Pressable>

      {/* Favorite quick toggle */}
      <Pressable
        hitSlop={8}
        onPress={() => onToggleFavorite(item)}
        style={styles.favQuickBtn}
        accessibilityLabel={item.is_favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
      >
        <Star
          size={14}
          color={item.is_favorite ? gold[400] : theme.colors.foregroundMuted}
          fill={item.is_favorite ? gold[400] : 'transparent'}
          strokeWidth={1.8}
        />
      </Pressable>

      {/* Delete icon button */}
      <Pressable
        hitSlop={8}
        onPress={() => onDelete(item)}
        style={styles.deleteBtn}
        accessibilityLabel="Eliminar tarea"
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
  onToggle,
  onOpenEdit,
  onToggleFavorite,
  onDelete,
  onReschedule,
  onOpenRescheduleDatePicker,
}: DailyOverdueTaskCardProps) {
  const { theme } = useTheme();
  const isCompleted = item.is_completed;
  const dateBadge = formatTaskDateBadge(item.due_date);
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
            ? (theme.dark ? '#101010' : '#EDE8DE')
            : theme.colors.surface,
          borderBottomColor: theme.colors.border,
        },
        isCompleted && styles.compactRowCompleted,
        drag?.isActive && styles.compactRowDragging,
        isLast && { borderBottomWidth: 0 },
      ]}
    >
      {/* Top line: drag handle, checkbox, content, actions */}
      <View style={styles.overdueMainLine}>

        {/* Checkbox */}
        <Pressable
          hitSlop={8}
          onPress={() => onToggle(item)}
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
            if (drag?.isActive) return;
            onOpenEdit(item);
          }}
          accessibilityLabel={`Editar tarea ${item.title}`}
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

          {item.description ? (
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
            <View style={styles.overdueBadgeChip}>
              <AlertCircle size={10} color="#F59E0B" strokeWidth={2.2} />
              <Text style={styles.overdueBadgeText}>{dateBadge.text}</Text>
            </View>

            {/* Tag chips */}
            {itemTags.length > 0 &&
              itemTags.map((tag) => (
                <View
                  key={tag.id}
                  style={[
                    styles.tagChip,
                    {
                      borderColor: tag.color ? `${tag.color}66` : theme.colors.border,
                      backgroundColor: tag.color ? `${tag.color}1F` : theme.colors.surface,
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
            {item.priority && (
              <View
                style={[
                  styles.priorityChip,
                  {
                    borderColor: PRIORITY_CONFIG[item.priority]?.borderColor,
                    backgroundColor: PRIORITY_CONFIG[item.priority]?.bgColor,
                  },
                ]}
              >
                <Flag size={9} color={PRIORITY_CONFIG[item.priority]?.color} strokeWidth={2.4} />
                <Text
                  style={[
                    styles.priorityChipText,
                    { color: PRIORITY_CONFIG[item.priority]?.color },
                  ]}
                >
                  {PRIORITY_CONFIG[item.priority]?.label}
                </Text>
              </View>
            )}

            {/* Subtasks progress chip */}
            {item.subtasks && item.subtasks.length > 0 && (
              <View
                style={[
                  styles.subtasksBadgeChip,
                  item.subtasks.every((s) => s.is_completed) && styles.subtasksBadgeChipDone,
                ]}
              >
                <ListChecks
                  size={10}
                  color={item.subtasks.every((s) => s.is_completed) ? '#34C759' : gold[400]}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.subtasksBadgeText,
                    item.subtasks.every((s) => s.is_completed) && styles.subtasksBadgeTextDone,
                  ]}
                >
                  {item.subtasks.filter((s) => s.is_completed).length}/{item.subtasks.length}
                </Text>
              </View>
            )}
          </View>
        </Pressable>

        {/* Favorite quick toggle */}
        <Pressable
          hitSlop={8}
          onPress={() => onToggleFavorite(item)}
          style={styles.favQuickBtn}
          accessibilityLabel={item.is_favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}
        >
          <Star
            size={14}
            color={item.is_favorite ? gold[400] : theme.colors.foregroundMuted}
            fill={item.is_favorite ? gold[400] : 'transparent'}
            strokeWidth={1.8}
          />
        </Pressable>

        {/* Delete action */}
        <Pressable
          hitSlop={8}
          onPress={() => onDelete(item)}
          style={styles.deleteBtn}
          accessibilityLabel="Eliminar tarea"
        >
          <Trash2 size={14} color={theme.colors.foregroundMuted} strokeWidth={1.8} />
        </Pressable>
      </View>

      {/* Reschedule row: "Mover a:" with horizontal weekday pills */}
      <View style={styles.overdueMoveRow}>
        <Text style={[styles.overdueMoveLabel, { color: theme.colors.foregroundMuted }]}>Mover a:</Text>
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
            accessibilityLabel="Elegir otra fecha"
          >
            <Calendar size={12} color="#D4B13A" />
            <Text style={styles.overdueMovePillCalText}>Otro día</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}
