import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import {
  GripVertical,
  CheckCircle2,
  Calendar,
  Flag,
  ListChecks,
  RotateCw,
  Star,
  Sparkles,
  Pencil,
  Trash2,
  Users,
  AlertCircle,
} from 'lucide-react-native';

import { gold } from '@bucketlist/ui/src/tokens/colors';
import { styles } from '../styles/explore.styles';
import { DailyTask, DailyTag, CollaboratorItem, DailySortField, TimeView } from '../types';
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
  collaboratorMap: Map<string, CollaboratorItem>;
  onToggle: (task: DailyTask) => void;
  onOpenEdit: (task: DailyTask) => void;
  onToggleFavorite: (task: DailyTask) => void;
  onConvertToBucket: (task: DailyTask) => void;
  onDelete: (task: DailyTask) => void;
}

export function DailyTaskCard({
  item,
  drag,
  isLast,
  sortField,
  timeView,
  tagMap,
  collaboratorMap,
  onToggle,
  onOpenEdit,
  onToggleFavorite,
  onConvertToBucket,
  onDelete,
}: DailyTaskCardProps) {
  const isCompleted = item.is_completed;
  const dateBadge = formatTaskDateBadge(item.due_date);
  const itemTags = (item.tag_ids || [])
    .map((id) => tagMap.get(id))
    .filter(Boolean) as DailyTag[];
  const itemCollaborators = (item.collaborator_ids || [])
    .map((id) => collaboratorMap.get(id))
    .filter(Boolean) as CollaboratorItem[];

  return (
    <View
      key={item.id}
      style={[
        styles.compactRow,
        isCompleted && styles.compactRowCompleted,
        drag?.isActive && styles.compactRowDragging,
        isLast && { borderBottomWidth: 0 },
      ]}
    >
      {/* Drag handle (shown in manual mode; dragging also works anywhere on the row by holding down) */}
      {sortField === 'manual' && drag && (
        <View
          {...drag.panHandlers}
          hitSlop={{ top: 16, bottom: 16, left: 14, right: 14 }}
          style={styles.dragHandle}
          accessibilityLabel="Arrastrar para mover tarea"
        >
          <GripVertical
            size={18}
            color={drag.isActive ? gold[400] : '#6E6E6E'}
            strokeWidth={2}
          />
        </View>
      )}

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
          <View style={styles.compactUncheckedCircle} />
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
          style={[styles.compactTitle, isCompleted && styles.compactTitleCompleted]}
        >
          {item.title}
        </Text>

        {item.description ? (
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[
              styles.compactDescription,
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

          {/* Collaborator chip */}
          {itemCollaborators.length > 0 && (
            <View style={styles.collabBadgeChip}>
              <Users size={10} color="#D4B13A" />
              <Text style={styles.collabBadgeText} numberOfLines={1}>
                {itemCollaborators.map((c) => c.display_name || `@${c.username}`).join(', ')}
              </Text>
            </View>
          )}

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
          color={item.is_favorite ? gold[400] : '#666'}
          fill={item.is_favorite ? gold[400] : 'transparent'}
          strokeWidth={1.8}
        />
      </Pressable>

      {/* Convert to Bucket List quick button */}
      <Pressable
        hitSlop={8}
        onPress={() => onConvertToBucket(item)}
        style={styles.convertQuickBtn}
        accessibilityLabel="Convertir en Bucket List"
      >
        <Sparkles size={13} color={gold[400]} strokeWidth={1.8} />
      </Pressable>

      {/* Edit icon button */}
      <Pressable
        hitSlop={8}
        onPress={() => onOpenEdit(item)}
        style={styles.actionBtn}
        accessibilityLabel="Editar tarea"
      >
        <Pencil size={14} color="#666" strokeWidth={1.8} />
      </Pressable>

      {/* Delete icon button */}
      <Pressable
        hitSlop={8}
        onPress={() => onDelete(item)}
        style={styles.deleteBtn}
        accessibilityLabel="Eliminar tarea"
      >
        <Trash2 size={14} color="#555" strokeWidth={1.8} />
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
  collaboratorMap: Map<string, CollaboratorItem>;
  upcomingWeekDays: { date: Date; dateStr: string; label: string; dayNum: string; isToday: boolean }[];
  onToggle: (task: DailyTask) => void;
  onOpenEdit: (task: DailyTask) => void;
  onToggleFavorite: (task: DailyTask) => void;
  onConvertToBucket: (task: DailyTask) => void;
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
  collaboratorMap,
  upcomingWeekDays,
  onToggle,
  onOpenEdit,
  onToggleFavorite,
  onConvertToBucket,
  onDelete,
  onReschedule,
  onOpenRescheduleDatePicker,
}: DailyOverdueTaskCardProps) {
  const isCompleted = item.is_completed;
  const dateBadge = formatTaskDateBadge(item.due_date);
  const itemTags = (item.tag_ids || [])
    .map((id) => tagMap.get(id))
    .filter(Boolean) as DailyTag[];
  const itemCollaborators = (item.collaborator_ids || [])
    .map((id) => collaboratorMap.get(id))
    .filter(Boolean) as CollaboratorItem[];

  return (
    <View
      key={item.id}
      style={[
        styles.compactRow,
        styles.overdueTaskRow,
        isCompleted && styles.compactRowCompleted,
        drag?.isActive && styles.compactRowDragging,
        isLast && { borderBottomWidth: 0 },
      ]}
    >
      {/* Top line: drag handle, checkbox, content, actions */}
      <View style={styles.overdueMainLine}>
        {sortField === 'manual' && drag && (
          <View
            {...drag.panHandlers}
            hitSlop={{ top: 16, bottom: 16, left: 14, right: 14 }}
            style={styles.dragHandle}
            accessibilityLabel="Arrastrar para reordenar tarea atrasada"
          >
            <GripVertical
              size={18}
              color={drag.isActive ? '#F59E0B' : '#777'}
              strokeWidth={2}
            />
          </View>
        )}

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
              ))}

            {/* Collaborators */}
            {itemCollaborators.length > 0 && (
              <View style={styles.collabBadgeChip}>
                <Users size={10} color="#D4B13A" />
                <Text style={styles.collabBadgeText} numberOfLines={1}>
                  {itemCollaborators.map((c) => c.display_name || `@${c.username}`).join(', ')}
                </Text>
              </View>
            )}

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
            color={item.is_favorite ? gold[400] : '#666'}
            fill={item.is_favorite ? gold[400] : 'transparent'}
            strokeWidth={1.8}
          />
        </Pressable>

        {/* Convert to Bucket quick button */}
        <Pressable
          hitSlop={8}
          onPress={() => onConvertToBucket(item)}
          style={styles.convertQuickBtn}
          accessibilityLabel="Convertir en Bucket List"
        >
          <Sparkles size={13} color={gold[400]} strokeWidth={1.8} />
        </Pressable>

        {/* Edit & Delete actions */}
        <Pressable
          hitSlop={8}
          onPress={() => onOpenEdit(item)}
          style={styles.actionBtn}
          accessibilityLabel="Editar tarea"
        >
          <Pencil size={14} color="#666" strokeWidth={1.8} />
        </Pressable>
        <Pressable
          hitSlop={8}
          onPress={() => onDelete(item)}
          style={styles.deleteBtn}
          accessibilityLabel="Eliminar tarea"
        >
          <Trash2 size={14} color="#555" strokeWidth={1.8} />
        </Pressable>
      </View>

      {/* Reschedule row: "Mover a:" with horizontal weekday pills */}
      <View style={styles.overdueMoveRow}>
        <Text style={styles.overdueMoveLabel}>Mover a:</Text>
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
                d.isToday && styles.overdueMovePillToday,
              ]}
              onPress={() => onReschedule(item, d.dateStr)}
              hitSlop={4}
            >
              <Text
                style={[
                  styles.overdueMovePillText,
                  d.isToday && styles.overdueMovePillTextToday,
                ]}
              >
                {d.label} {d.isToday ? '' : d.dayNum}
              </Text>
            </Pressable>
          ))}

          {/* Custom calendar date picker button */}
          <Pressable
            style={styles.overdueMovePillCal}
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
