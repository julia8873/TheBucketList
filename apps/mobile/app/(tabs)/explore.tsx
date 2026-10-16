import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PageTitle, Typography, useTheme } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import {
  Plus,
  GripVertical,
  CheckCircle2,
  Trash2,
  ListTodo,
  Calendar,
  Tag as TagIcon,
  X,
  Check,
  Pencil,
  AlignLeft,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  endOfWeek,
  differenceInCalendarDays,
  addDays,
  startOfDay,
  isBefore,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { DraggableTaskList, type DragHandle } from '../../src/components/DraggableTaskList';
import {
  useDailyTasks,
  useCreateDailyTask,
  useUpdateDailyTask,
  useToggleDailyTask,
  useDeleteDailyTask,
  useReorderDailyTasks,
  useClearCompletedDailyTasks,
} from '../../src/hooks/useDailyTasks';
import { useTags, type Tag } from '../../src/hooks/useTags';
import type { DailyTask } from '../../src/services/api/dailyTasksService';

type TimeView = 'today' | 'week' | 'all';
type StatusFilter = 'all' | 'pending' | 'completed';

function parseLocalDate(str?: string | null): Date {
  if (!str) return new Date();
  const [year, month, day] = str.split('-').map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
}

function toDateString(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function formatTaskDateBadge(dateStr?: string | null): { text: string; isOverdue: boolean } {
  if (!dateStr) return { text: 'Sin fecha', isOverdue: false };
  const d = parseLocalDate(dateStr);
  const now = startOfDay(new Date());
  const taskDay = startOfDay(d);

  if (isToday(d)) return { text: 'Hoy', isOverdue: false };
  if (isTomorrow(d)) return { text: 'Mañana', isOverdue: false };
  if (isYesterday(d)) return { text: 'Ayer', isOverdue: true };
  if (isBefore(taskDay, now)) {
    return { text: format(d, 'd MMM', { locale: es }), isOverdue: true };
  }
  return { text: format(d, 'd MMM', { locale: es }), isOverdue: false };
}

export default function DailyTasksScreen() {
  const { theme } = useTheme();
  const [timeView, setTimeView] = useState<TimeView>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  // Quick Add bar state
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState<string>(toDateString(new Date()));
  const [newTagId, setNewTagId] = useState<string | null>(null);
  const [showAddDatePicker, setShowAddDatePicker] = useState(false);
  const [showAddTagPicker, setShowAddTagPicker] = useState(false);

  // Dedicated "Añadir tarea" modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createDueDate, setCreateDueDate] = useState<string>(toDateString(new Date()));
  const [createTagIds, setCreateTagIds] = useState<string[]>([]);
  const [showCreateDatePicker, setShowCreateDatePicker] = useState(false);

  // Full Edit Task modal state
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState<string>(toDateString(new Date()));
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);

  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const { data: tasks = [], isLoading, refetch } = useDailyTasks();
  const { data: userTags = [] } = useTags();

  const [manualRefreshing, setManualRefreshing] = useState(false);
  const handleRefresh = async () => {
    setManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setManualRefreshing(false);
    }
  };

  const createMutation = useCreateDailyTask();
  const updateMutation = useUpdateDailyTask();
  const toggleMutation = useToggleDailyTask();
  const deleteMutation = useDeleteDailyTask();
  const reorderMutation = useReorderDailyTasks();
  const clearMutation = useClearCompletedDailyTasks();

  const todayStr = useMemo(() => toDateString(new Date()), []);

  // Map of tags by id for quick lookup
  const tagMap = useMemo(() => {
    const map = new Map<string, Tag>();
    userTags.forEach((t) => map.set(t.id, t));
    return map;
  }, [userTags]);

  // Base filtered by tag and status
  const filteredByTagAndStatus = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter === 'pending' && t.is_completed) return false;
      if (statusFilter === 'completed' && !t.is_completed) return false;
      if (selectedTagFilter) {
        if (!t.tag_ids || !t.tag_ids.includes(selectedTagFilter)) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, selectedTagFilter]);

  // Tasks specifically for Today view (today or overdue pending)
  const todayTasks = useMemo(() => {
    return filteredByTagAndStatus.filter((t) => {
      const taskDate = t.due_date || todayStr;
      if (taskDate === todayStr) return true;
      // Also show overdue pending tasks in Today view so they are not forgotten
      if (!t.is_completed && taskDate < todayStr) return true;
      return false;
    });
  }, [filteredByTagAndStatus, todayStr]);

  // Week days from today until the end of the week (Sunday), avoiding days before today
  const weekDays = useMemo(() => {
    const now = startOfDay(new Date());
    const sunday = endOfWeek(now, { weekStartsOn: 1 });
    const count = Math.max(1, differenceInCalendarDays(sunday, now) + 1);
    return Array.from({ length: count }, (_, i) => {
      const day = addDays(now, i);
      const dayStr = toDateString(day);
      return {
        date: day,
        dateStr: dayStr,
        dayName: format(day, 'EEEE', { locale: es }),
        formatted: format(day, 'd MMM', { locale: es }),
        isCurrentDay: isToday(day),
      };
    });
  }, []);

  const totalPending = useMemo(() => tasks.filter((t) => !t.is_completed).length, [tasks]);
  const totalCompleted = useMemo(() => tasks.filter((t) => t.is_completed).length, [tasks]);

  const handleQuickAddTask = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    createMutation.mutate({
      title: trimmed,
      due_date: newDueDate,
      tag_ids: newTagId ? [newTagId] : [],
    });

    setNewTitle('');
    setNewTagId(null);
  };

  const handleCreateFromModal = () => {
    const trimmed = createTitle.trim();
    if (!trimmed) return;

    createMutation.mutate({
      title: trimmed,
      description: createDescription.trim() || null,
      due_date: createDueDate,
      tag_ids: createTagIds,
    });

    setCreateTitle('');
    setCreateDescription('');
    setCreateDueDate(todayStr);
    setCreateTagIds([]);
    setShowCreateModal(false);
  };

  const openEditTask = (task: DailyTask) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditDueDate(task.due_date || todayStr);
    setEditTagIds(task.tag_ids || []);
  };

  const handleSaveEditTask = () => {
    if (!editingTask || !editTitle.trim()) return;

    updateMutation.mutate({
      id: editingTask.id,
      updates: {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        due_date: editDueDate,
        tag_ids: editTagIds,
      },
    });

    setEditingTask(null);
  };

  const handleToggle = (task: DailyTask) => {
    toggleMutation.mutate({
      id: task.id,
      isCompleted: !task.is_completed,
    });
  };

  const handleDelete = (task: DailyTask) => {
    Alert.alert(
      'Eliminar tarea',
      `¿Deseas eliminar «${task.title}»?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(task.id),
        },
      ]
    );
  };

  const handleReorder = (orderedIds: string[]) => {
    const activeIdsSet = new Set(orderedIds);
    let orderIdx = 0;
    const nextOrder: string[] = tasks.map((t) => {
      if (activeIdsSet.has(t.id) && orderIdx < orderedIds.length) {
        return orderedIds[orderIdx++]!;
      }
      return t.id;
    });
    reorderMutation.mutate(nextOrder);
  };

  // Render a single task row with drag handle and edit trigger
  const renderTaskRow = (item: DailyTask, drag?: DragHandle, isLast?: boolean) => {
    const isCompleted = item.is_completed;
    const dateBadge = formatTaskDateBadge(item.due_date);
    const itemTags = (item.tag_ids || [])
      .map((id) => tagMap.get(id))
      .filter(Boolean) as Tag[];

    return (
      <View
        style={[
          styles.compactRow,
          isCompleted && styles.compactRowCompleted,
          drag?.isActive && styles.compactRowDragging,
          isLast && { borderBottomWidth: 0 },
        ]}
      >
        {/* Drag handle */}
        {drag && (
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
          onPress={() => handleToggle(item)}
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
          onPress={() => openEditTask(item)}
          accessibilityLabel={`Editar tarea ${item.title}`}
        >
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
            {itemTags.length > 0 ? (
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
                    style={[
                      styles.tagChipText,
                      { color: tag.color || '#DDD' },
                    ]}
                  >
                    {tag.name}
                  </Text>
                </View>
              ))
            ) : null}

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
          </View>
        </Pressable>

        {/* Edit icon button */}
        <Pressable
          hitSlop={8}
          onPress={() => openEditTask(item)}
          style={styles.actionBtn}
          accessibilityLabel="Editar tarea"
        >
          <Pencil size={14} color="#666" strokeWidth={1.8} />
        </Pressable>

        {/* Delete icon button */}
        <Pressable
          hitSlop={8}
          onPress={() => handleDelete(item)}
          style={styles.deleteBtn}
          accessibilityLabel="Eliminar tarea"
        >
          <Trash2 size={14} color="#555" strokeWidth={1.8} />
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <PageTitle gold="Día" rest="a día" />
            <View style={styles.headerRight}>
              {tasks.length > 0 && (
                <View style={styles.counterBadge}>
                  <Text style={styles.counterText}>
                    {totalCompleted}/{tasks.length}
                  </Text>
                </View>
              )}
              {/* Button to open Add Task Modal */}
              <Pressable
                style={styles.headerAddBtn}
                onPress={() => {
                  setCreateDueDate(todayStr);
                  setShowCreateModal(true);
                }}
              >
                <Plus size={15} color="#0E0E0E" strokeWidth={2.4} />
                <Text style={styles.headerAddBtnText}>Añadir tarea</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.subtitle}>
            Tus tareas personales. Organiza tu día a día con etiquetas, fechas y notas.
          </Text>

          {/* Time View Switcher: Hoy | Semana | Todas */}
          <View style={styles.segmentedContainer}>
            <Pressable
              style={[styles.segmentedTab, timeView === 'today' && styles.segmentedTabActive]}
              onPress={() => setTimeView('today')}
            >
              <Text style={[styles.segmentedTabText, timeView === 'today' && styles.segmentedTabTextActive]}>
                Hoy
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segmentedTab, timeView === 'week' && styles.segmentedTabActive]}
              onPress={() => setTimeView('week')}
            >
              <Text style={[styles.segmentedTabText, timeView === 'week' && styles.segmentedTabTextActive]}>
                Semana
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segmentedTab, timeView === 'all' && styles.segmentedTabActive]}
              onPress={() => setTimeView('all')}
            >
              <Text style={[styles.segmentedTabText, timeView === 'all' && styles.segmentedTabTextActive]}>
                Todas
              </Text>
            </Pressable>
          </View>

          {/* Quick Add Bar */}
          <View style={styles.inputCard}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={
                timeView === 'today'
                  ? 'Añadir tarea rápida para hoy...'
                  : timeView === 'week'
                  ? 'Añadir tarea rápida...'
                  : 'Añadir tarea rápida...'
              }
              placeholderTextColor="#777"
              value={newTitle}
              onChangeText={setNewTitle}
              onSubmitEditing={handleQuickAddTask}
              returnKeyType="done"
            />

            {/* Quick date selector button */}
            <Pressable
              style={styles.quickOptionBtn}
              onPress={() => setShowAddDatePicker(true)}
              hitSlop={6}
            >
              <Calendar size={14} color={newDueDate === todayStr ? gold[400] : '#A0A0A0'} />
              <Text
                style={[
                  styles.quickOptionText,
                  newDueDate === todayStr && { color: gold[400] },
                ]}
              >
                {newDueDate === todayStr
                  ? 'Hoy'
                  : newDueDate === toDateString(addDays(new Date(), 1))
                  ? 'Mañana'
                  : format(parseLocalDate(newDueDate), 'd MMM', { locale: es })}
              </Text>
            </Pressable>

            {/* Quick tag selector button */}
            <Pressable
              style={[
                styles.quickOptionBtn,
                newTagId && {
                  borderColor: tagMap.get(newTagId)?.color || gold[400],
                  backgroundColor: '#1E1B10',
                },
              ]}
              onPress={() => setShowAddTagPicker(true)}
              hitSlop={6}
            >
              {newTagId && tagMap.get(newTagId)?.emoji ? (
                <Text style={{ fontSize: 12 }}>{tagMap.get(newTagId)?.emoji}</Text>
              ) : (
                <TagIcon
                  size={13}
                  color={newTagId ? (tagMap.get(newTagId)?.color || gold[400]) : '#A0A0A0'}
                />
              )}
              <Text
                style={[
                  styles.quickOptionText,
                  newTagId && { color: tagMap.get(newTagId)?.color || gold[400] },
                ]}
                numberOfLines={1}
              >
                {newTagId ? tagMap.get(newTagId)?.name : 'Etiqueta'}
              </Text>
            </Pressable>

            {/* Quick add button */}
            <Pressable
              style={[styles.addBtn, !newTitle.trim() && styles.addBtnDisabled]}
              onPress={handleQuickAddTask}
              disabled={!newTitle.trim()}
              accessibilityLabel="Añadir tarea"
            >
              <Plus size={18} color="#0E0E0E" strokeWidth={2.4} />
            </Pressable>
          </View>

          {/* Tags Filter Bar (Horizontal scroll) */}
          {userTags.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tagsFilterScroll}
            >
              <Pressable
                style={[
                  styles.tagFilterPill,
                  selectedTagFilter === null && styles.tagFilterPillActive,
                ]}
                onPress={() => setSelectedTagFilter(null)}
              >
                <Text
                  style={[
                    styles.tagFilterText,
                    selectedTagFilter === null && styles.tagFilterTextActive,
                  ]}
                >
                  Todas las etiquetas
                </Text>
              </Pressable>
              {userTags.map((tag) => {
                const isSelected = selectedTagFilter === tag.id;
                return (
                  <Pressable
                    key={tag.id}
                    style={[
                      styles.tagFilterPill,
                      isSelected && {
                        borderColor: tag.color || gold[400],
                        backgroundColor: `${tag.color || gold[400]}26`,
                      },
                    ]}
                    onPress={() => setSelectedTagFilter(isSelected ? null : tag.id)}
                  >
                    {tag.emoji && <Text style={{ fontSize: 12, marginRight: 4 }}>{tag.emoji}</Text>}
                    <Text
                      style={[
                        styles.tagFilterText,
                        isSelected && { color: tag.color || gold[400], fontFamily: 'Inter_600SemiBold' },
                      ]}
                    >
                      {tag.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* Status sub-filter: Todas | Pendientes | Completadas */}
          <View style={styles.statusRow}>
            {(['all', 'pending', 'completed'] as StatusFilter[]).map((mode) => {
              const label =
                mode === 'all'
                  ? `Todas (${tasks.length})`
                  : mode === 'pending'
                  ? `Pendientes (${totalPending})`
                  : `Completadas (${totalCompleted})`;
              const isActive = statusFilter === mode;
              return (
                <Pressable
                  key={mode}
                  style={[styles.statusChip, isActive && styles.statusChipActive]}
                  onPress={() => setStatusFilter(mode)}
                >
                  <Text style={[styles.statusChipText, isActive && styles.statusChipTextActive]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Content list */}
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          scrollEnabled={!dragging}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              enabled={!dragging}
              refreshing={manualRefreshing}
              onRefresh={handleRefresh}
              tintColor={gold[400]}
            />
          }
        >
          {isLoading ? (
            <ActivityIndicator color={gold[400]} style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* 1. TODAY VIEW */}
              {timeView === 'today' && (
                <>
                  {todayTasks.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <View style={styles.emptyIconCircle}>
                        <ListTodo size={32} color={gold[400]} strokeWidth={1.8} />
                      </View>
                      <Typography variant="bodySemibold" style={styles.emptyTitle}>
                        {statusFilter === 'completed'
                          ? 'No hay tareas completadas para hoy'
                          : statusFilter === 'pending'
                          ? '¡Todo listo por hoy!'
                          : 'Sin tareas para hoy'}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" style={styles.emptySubtitle}>
                        Añade una tarea arriba para organizar tu día.
                      </Typography>
                    </View>
                  ) : (
                    <View style={styles.compactListCard}>
                      <DraggableTaskList
                        items={todayTasks}
                        gap={0}
                        renderItem={(item, drag) =>
                          renderTaskRow(item, drag, todayTasks.indexOf(item) === todayTasks.length - 1)
                        }
                        onReorder={handleReorder}
                        onDraggingChange={setDragging}
                      />
                    </View>
                  )}
                </>
              )}

              {/* 2. WEEK VIEW (From today until end of week, with draggable tasks in each day) */}
              {timeView === 'week' && (
                <View style={styles.weekContainer}>
                  {weekDays.map((day) => {
                    const dayTasks = filteredByTagAndStatus.filter(
                      (t) => (t.due_date || todayStr) === day.dateStr
                    );

                    return (
                      <View key={day.dateStr} style={styles.weekDaySection}>
                        <View style={styles.weekDayHeader}>
                          <View style={styles.weekDayHeaderLeft}>
                            <Text
                              style={[
                                styles.weekDayName,
                                day.isCurrentDay && styles.weekDayNameToday,
                              ]}
                            >
                              {day.isCurrentDay ? 'HOY · ' : ''}
                              {day.dayName.toUpperCase()}
                            </Text>
                            <Text style={styles.weekDayDate}>{day.formatted}</Text>
                          </View>
                          <Pressable
                            hitSlop={6}
                            onPress={() => {
                              setCreateDueDate(day.dateStr);
                              setShowCreateModal(true);
                            }}
                            style={styles.weekAddQuickBtn}
                          >
                            <Plus size={14} color={gold[400]} />
                            <Text style={styles.weekAddQuickText}>Añadir</Text>
                          </Pressable>
                        </View>

                        {dayTasks.length === 0 ? (
                          <View style={styles.weekDayEmpty}>
                            <Text style={styles.weekDayEmptyText}>Sin tareas programadas</Text>
                          </View>
                        ) : (
                          <View style={styles.compactListCard}>
                            <DraggableTaskList
                              items={dayTasks}
                              gap={0}
                              renderItem={(item, drag) =>
                                renderTaskRow(item, drag, dayTasks.indexOf(item) === dayTasks.length - 1)
                              }
                              onReorder={handleReorder}
                              onDraggingChange={setDragging}
                            />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}

              {/* 3. ALL VIEW */}
              {timeView === 'all' && (
                <>
                  {filteredByTagAndStatus.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <View style={styles.emptyIconCircle}>
                        <ListTodo size={32} color={gold[400]} strokeWidth={1.8} />
                      </View>
                      <Typography variant="bodySemibold" style={styles.emptyTitle}>
                        No hay tareas
                      </Typography>
                      <Typography variant="caption" color="textSecondary" style={styles.emptySubtitle}>
                        Crea una tarea arriba para comenzar.
                      </Typography>
                    </View>
                  ) : (
                    <View style={styles.compactListCard}>
                      <DraggableTaskList
                        items={filteredByTagAndStatus}
                        gap={0}
                        renderItem={(item, drag) =>
                          renderTaskRow(
                            item,
                            drag,
                            filteredByTagAndStatus.indexOf(item) === filteredByTagAndStatus.length - 1
                          )
                        }
                        onReorder={handleReorder}
                        onDraggingChange={setDragging}
                      />
                    </View>
                  )}
                </>
              )}

              {/* Clear completed button */}
              {totalCompleted > 0 && statusFilter !== 'pending' && (
                <Pressable
                  style={styles.clearBtn}
                  onPress={() => {
                    Alert.alert(
                      'Limpiar completadas',
                      '¿Deseas eliminar todas las tareas completadas?',
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Limpiar',
                          style: 'destructive',
                          onPress: () => clearMutation.mutate(),
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.clearBtnText}>Limpiar completadas</Text>
                </Pressable>
              )}
            </>
          )}
        </ScrollView>

        {/* ========================================================================= */}
        {/* MODAL 1: NUEVA TAREA COMPLETA (Fecha, descripción, etiquetas, etc.)        */}
        {/* ========================================================================= */}
        {showCreateModal && (
          <Modal
            transparent
            animationType="slide"
            visible={showCreateModal}
            onRequestClose={() => setShowCreateModal(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalOverlay}
            >
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setShowCreateModal(false)}
              />
              <View style={styles.fullModalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Nueva tarea</Text>
                  <Pressable onPress={() => setShowCreateModal(false)} hitSlop={10}>
                    <X size={20} color="#888" />
                  </Pressable>
                </View>

                <ScrollView
                  style={{ maxHeight: 420 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Field: Title */}
                  <Text style={styles.fieldLabel}>Nombre de la tarea *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ej. Comprar ingredientes para la cena"
                    placeholderTextColor="#666"
                    value={createTitle}
                    onChangeText={setCreateTitle}
                    autoFocus
                  />

                  {/* Field: Description */}
                  <Text style={styles.fieldLabel}>Descripción (opcional)</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    placeholder="Detalles, enlaces, notas..."
                    placeholderTextColor="#666"
                    value={createDescription}
                    onChangeText={setCreateDescription}
                    multiline
                    numberOfLines={3}
                  />

                  {/* Field: Due Date */}
                  <Text style={styles.fieldLabel}>Fecha programada</Text>
                  <View style={styles.modalPresetsRow}>
                    <Pressable
                      style={[
                        styles.modalPresetBtn,
                        createDueDate === todayStr && styles.modalPresetBtnActive,
                      ]}
                      onPress={() => setCreateDueDate(todayStr)}
                    >
                      <Text
                        style={[
                          styles.modalPresetText,
                          createDueDate === todayStr && styles.modalPresetTextActive,
                        ]}
                      >
                        Hoy
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.modalPresetBtn,
                        createDueDate === toDateString(addDays(new Date(), 1)) && styles.modalPresetBtnActive,
                      ]}
                      onPress={() => setCreateDueDate(toDateString(addDays(new Date(), 1)))}
                    >
                      <Text
                        style={[
                          styles.modalPresetText,
                          createDueDate === toDateString(addDays(new Date(), 1)) && styles.modalPresetTextActive,
                        ]}
                      >
                        Mañana
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.modalPresetBtn,
                        createDueDate === toDateString(addDays(new Date(), 7)) && styles.modalPresetBtnActive,
                      ]}
                      onPress={() => setCreateDueDate(toDateString(addDays(new Date(), 7)))}
                    >
                      <Text
                        style={[
                          styles.modalPresetText,
                          createDueDate === toDateString(addDays(new Date(), 7)) && styles.modalPresetTextActive,
                        ]}
                      >
                        +1 Semana
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={styles.datePickerTrigger}
                    onPress={() => setShowCreateDatePicker(true)}
                  >
                    <Calendar size={15} color={gold[400]} />
                    <Text style={styles.datePickerTriggerText}>
                      {format(parseLocalDate(createDueDate), "EEEE, d 'de' MMMM", { locale: es })}
                    </Text>
                  </Pressable>

                  {/* Field: Tags */}
                  <Text style={styles.fieldLabel}>Etiquetas</Text>
                  {userTags.length === 0 ? (
                    <Text style={styles.fieldHelper}>No tienes etiquetas aún.</Text>
                  ) : (
                    <View style={styles.tagsToggleContainer}>
                      {userTags.map((tag) => {
                        const isSelected = createTagIds.includes(tag.id);
                        return (
                          <Pressable
                            key={tag.id}
                            style={[
                              styles.tagTogglePill,
                              isSelected && {
                                borderColor: tag.color || gold[400],
                                backgroundColor: `${tag.color || gold[400]}33`,
                              },
                            ]}
                            onPress={() => {
                              setCreateTagIds((prev) =>
                                prev.includes(tag.id)
                                  ? prev.filter((id) => id !== tag.id)
                                  : [...prev, tag.id]
                              );
                            }}
                          >
                            {tag.emoji && <Text style={{ fontSize: 13, marginRight: 4 }}>{tag.emoji}</Text>}
                            <Text
                              style={[
                                styles.tagToggleText,
                                isSelected && { color: tag.color || gold[400], fontFamily: 'Inter_600SemiBold' },
                              ]}
                            >
                              {tag.name}
                            </Text>
                            {isSelected && <Check size={12} color={tag.color || gold[400]} style={{ marginLeft: 4 }} />}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </ScrollView>

                {/* Modal Footer actions */}
                <View style={styles.modalFooterRow}>
                  <Pressable
                    style={styles.modalCancelBtn}
                    onPress={() => setShowCreateModal(false)}
                  >
                    <Text style={styles.modalCancelBtnText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.modalSubmitBtn,
                      !createTitle.trim() && styles.modalSubmitBtnDisabled,
                    ]}
                    disabled={!createTitle.trim()}
                    onPress={handleCreateFromModal}
                  >
                    <Text style={styles.modalSubmitBtnText}>Añadir tarea</Text>
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        )}

        {/* DatePicker for Create Modal */}
        {showCreateDatePicker && (
          <Modal
            transparent
            animationType="fade"
            visible={showCreateDatePicker}
            onRequestClose={() => setShowCreateDatePicker(false)}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setShowCreateDatePicker(false)}
            >
              <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Elegir fecha</Text>
                  <Pressable onPress={() => setShowCreateDatePicker(false)} hitSlop={10}>
                    <X size={18} color="#888" />
                  </Pressable>
                </View>
                <DateTimePicker
                  value={parseLocalDate(createDueDate)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  themeVariant="dark"
                  onChange={(_event, date) => {
                    if (date) {
                      setCreateDueDate(toDateString(date));
                      if (Platform.OS === 'android') {
                        setShowCreateDatePicker(false);
                      }
                    }
                  }}
                />
                {Platform.OS === 'ios' && (
                  <Pressable
                    style={styles.modalConfirmBtn}
                    onPress={() => setShowCreateDatePicker(false)}
                  >
                    <Text style={styles.modalConfirmText}>Listo</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          </Modal>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: MODIFICAR TAREA (Nombre, descripción, fecha, etiquetas)         */}
        {/* ========================================================================= */}
        {editingTask && (
          <Modal
            transparent
            animationType="slide"
            visible={!!editingTask}
            onRequestClose={() => setEditingTask(null)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalOverlay}
            >
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => setEditingTask(null)}
              />
              <View style={styles.fullModalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Modificar tarea</Text>
                  <Pressable onPress={() => setEditingTask(null)} hitSlop={10}>
                    <X size={20} color="#888" />
                  </Pressable>
                </View>

                <ScrollView
                  style={{ maxHeight: 420 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  {/* Field: Title */}
                  <Text style={styles.fieldLabel}>Nombre de la tarea *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Nombre de la tarea"
                    placeholderTextColor="#666"
                    value={editTitle}
                    onChangeText={setEditTitle}
                  />

                  {/* Field: Description */}
                  <Text style={styles.fieldLabel}>Descripción</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    placeholder="Detalles, notas, recordatorios..."
                    placeholderTextColor="#666"
                    value={editDescription}
                    onChangeText={setEditDescription}
                    multiline
                    numberOfLines={3}
                  />

                  {/* Field: Due Date */}
                  <Text style={styles.fieldLabel}>Fecha programada</Text>
                  <View style={styles.modalPresetsRow}>
                    <Pressable
                      style={[
                        styles.modalPresetBtn,
                        editDueDate === todayStr && styles.modalPresetBtnActive,
                      ]}
                      onPress={() => setEditDueDate(todayStr)}
                    >
                      <Text
                        style={[
                          styles.modalPresetText,
                          editDueDate === todayStr && styles.modalPresetTextActive,
                        ]}
                      >
                        Hoy
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.modalPresetBtn,
                        editDueDate === toDateString(addDays(new Date(), 1)) && styles.modalPresetBtnActive,
                      ]}
                      onPress={() => setEditDueDate(toDateString(addDays(new Date(), 1)))}
                    >
                      <Text
                        style={[
                          styles.modalPresetText,
                          editDueDate === toDateString(addDays(new Date(), 1)) && styles.modalPresetBtnActive,
                        ]}
                      >
                        Mañana
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.modalPresetBtn,
                        editDueDate === toDateString(addDays(new Date(), 7)) && styles.modalPresetBtnActive,
                      ]}
                      onPress={() => setEditDueDate(toDateString(addDays(new Date(), 7)))}
                    >
                      <Text
                        style={[
                          styles.modalPresetText,
                          editDueDate === toDateString(addDays(new Date(), 7)) && styles.modalPresetTextActive,
                        ]}
                      >
                        +1 Semana
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={styles.datePickerTrigger}
                    onPress={() => setShowEditDatePicker(true)}
                  >
                    <Calendar size={15} color={gold[400]} />
                    <Text style={styles.datePickerTriggerText}>
                      {format(parseLocalDate(editDueDate), "EEEE, d 'de' MMMM", { locale: es })}
                    </Text>
                  </Pressable>

                  {/* Field: Tags */}
                  <Text style={styles.fieldLabel}>Etiquetas</Text>
                  {userTags.length === 0 ? (
                    <Text style={styles.fieldHelper}>No tienes etiquetas aún.</Text>
                  ) : (
                    <View style={styles.tagsToggleContainer}>
                      {userTags.map((tag) => {
                        const isSelected = editTagIds.includes(tag.id);
                        return (
                          <Pressable
                            key={tag.id}
                            style={[
                              styles.tagTogglePill,
                              isSelected && {
                                borderColor: tag.color || gold[400],
                                backgroundColor: `${tag.color || gold[400]}33`,
                              },
                            ]}
                            onPress={() => {
                              setEditTagIds((prev) =>
                                prev.includes(tag.id)
                                  ? prev.filter((id) => id !== tag.id)
                                  : [...prev, tag.id]
                              );
                            }}
                          >
                            {tag.emoji && <Text style={{ fontSize: 13, marginRight: 4 }}>{tag.emoji}</Text>}
                            <Text
                              style={[
                                styles.tagToggleText,
                                isSelected && { color: tag.color || gold[400], fontFamily: 'Inter_600SemiBold' },
                              ]}
                            >
                              {tag.name}
                            </Text>
                            {isSelected && <Check size={12} color={tag.color || gold[400]} style={{ marginLeft: 4 }} />}
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </ScrollView>

                {/* Modal Footer actions */}
                <View style={styles.modalFooterRow}>
                  <Pressable
                    style={styles.modalCancelBtn}
                    onPress={() => setEditingTask(null)}
                  >
                    <Text style={styles.modalCancelBtnText}>Cancelar</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.modalSubmitBtn,
                      !editTitle.trim() && styles.modalSubmitBtnDisabled,
                    ]}
                    disabled={!editTitle.trim()}
                    onPress={handleSaveEditTask}
                  >
                    <Text style={styles.modalSubmitBtnText}>Guardar cambios</Text>
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        )}

        {/* DatePicker for Edit Modal */}
        {showEditDatePicker && (
          <Modal
            transparent
            animationType="fade"
            visible={showEditDatePicker}
            onRequestClose={() => setShowEditDatePicker(false)}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setShowEditDatePicker(false)}
            >
              <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Elegir fecha</Text>
                  <Pressable onPress={() => setShowEditDatePicker(false)} hitSlop={10}>
                    <X size={18} color="#888" />
                  </Pressable>
                </View>
                <DateTimePicker
                  value={parseLocalDate(editDueDate)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  themeVariant="dark"
                  onChange={(_event, date) => {
                    if (date) {
                      setEditDueDate(toDateString(date));
                      if (Platform.OS === 'android') {
                        setShowEditDatePicker(false);
                      }
                    }
                  }}
                />
                {Platform.OS === 'ios' && (
                  <Pressable
                    style={styles.modalConfirmBtn}
                    onPress={() => setShowEditDatePicker(false)}
                  >
                    <Text style={styles.modalConfirmText}>Listo</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          </Modal>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: DatePicker for Quick Add bar                                    */}
        {/* ========================================================================= */}
        {showAddDatePicker && (
          <Modal
            transparent
            animationType="fade"
            visible={showAddDatePicker}
            onRequestClose={() => setShowAddDatePicker(false)}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setShowAddDatePicker(false)}
            >
              <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Fecha de la tarea</Text>
                  <Pressable onPress={() => setShowAddDatePicker(false)} hitSlop={10}>
                    <X size={18} color="#888" />
                  </Pressable>
                </View>

                {/* Quick Date Presets */}
                <View style={styles.modalPresetsRow}>
                  <Pressable
                    style={[
                      styles.modalPresetBtn,
                      newDueDate === todayStr && styles.modalPresetBtnActive,
                    ]}
                    onPress={() => {
                      setNewDueDate(todayStr);
                      setShowAddDatePicker(false);
                    }}
                  >
                    <Text style={[styles.modalPresetText, newDueDate === todayStr && styles.modalPresetTextActive]}>
                      Hoy
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.modalPresetBtn,
                      newDueDate === toDateString(addDays(new Date(), 1)) && styles.modalPresetBtnActive,
                    ]}
                    onPress={() => {
                      setNewDueDate(toDateString(addDays(new Date(), 1)));
                      setShowAddDatePicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalPresetText,
                        newDueDate === toDateString(addDays(new Date(), 1)) && styles.modalPresetTextActive,
                      ]}
                    >
                      Mañana
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.modalPresetBtn,
                      newDueDate === toDateString(addDays(new Date(), 7)) && styles.modalPresetBtnActive,
                    ]}
                    onPress={() => {
                      setNewDueDate(toDateString(addDays(new Date(), 7)));
                      setShowAddDatePicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.modalPresetText,
                        newDueDate === toDateString(addDays(new Date(), 7)) && styles.modalPresetTextActive,
                      ]}
                    >
                      +1 Semana
                    </Text>
                  </Pressable>
                </View>

                {/* Native Picker */}
                <View style={styles.pickerWrapper}>
                  <DateTimePicker
                    value={parseLocalDate(newDueDate)}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    themeVariant="dark"
                    onChange={(_event, date) => {
                      if (date) {
                        setNewDueDate(toDateString(date));
                        if (Platform.OS === 'android') {
                          setShowAddDatePicker(false);
                        }
                      }
                    }}
                  />
                </View>

                {Platform.OS === 'ios' && (
                  <Pressable
                    style={styles.modalConfirmBtn}
                    onPress={() => setShowAddDatePicker(false)}
                  >
                    <Text style={styles.modalConfirmText}>Listo</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          </Modal>
        )}

        {/* ========================================================================= */}
        {/* MODAL 4: TagPicker for Quick Add bar                                     */}
        {/* ========================================================================= */}
        {showAddTagPicker && (
          <Modal
            transparent
            animationType="fade"
            visible={showAddTagPicker}
            onRequestClose={() => setShowAddTagPicker(false)}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setShowAddTagPicker(false)}
            >
              <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Seleccionar etiqueta</Text>
                  <Pressable onPress={() => setShowAddTagPicker(false)} hitSlop={10}>
                    <X size={18} color="#888" />
                  </Pressable>
                </View>

                <ScrollView style={{ maxHeight: 280 }}>
                  <Pressable
                    style={[
                      styles.tagModalItem,
                      newTagId === null && styles.tagModalItemActive,
                    ]}
                    onPress={() => {
                      setNewTagId(null);
                      setShowAddTagPicker(false);
                    }}
                  >
                    <Text style={styles.tagModalItemText}>Sin etiqueta</Text>
                    {newTagId === null && <Check size={16} color={gold[400]} />}
                  </Pressable>

                  {userTags.map((tag) => {
                    const isSelected = newTagId === tag.id;
                    return (
                      <Pressable
                        key={tag.id}
                        style={[
                          styles.tagModalItem,
                          isSelected && styles.tagModalItemActive,
                        ]}
                        onPress={() => {
                          setNewTagId(tag.id);
                          setShowAddTagPicker(false);
                        }}
                      >
                        <View style={styles.tagModalItemLeft}>
                          {tag.emoji && <Text style={{ fontSize: 16, marginRight: 8 }}>{tag.emoji}</Text>}
                          <View
                            style={[
                              styles.tagColorDot,
                              { backgroundColor: tag.color || gold[400] },
                            ]}
                          />
                          <Text style={[styles.tagModalItemText, { color: tag.color || '#EEE' }]}>
                            {tag.name}
                          </Text>
                        </View>
                        {isSelected && <Check size={16} color={gold[400]} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </Pressable>
          </Modal>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: gold[400],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  headerAddBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#0E0E0E',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#8A8A8A',
    marginTop: 2,
    marginBottom: 10,
  },
  counterBadge: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  counterText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: gold[400],
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#151515',
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  segmentedTabActive: {
    backgroundColor: '#242424',
    borderWidth: 1,
    borderColor: '#333',
  },
  segmentedTabText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#888',
  },
  segmentedTabTextActive: {
    color: '#FFF',
    fontFamily: 'Inter_600SemiBold',
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242424',
    paddingLeft: 12,
    paddingRight: 6,
    paddingVertical: 4,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: '#F5F5F5',
    paddingVertical: 6,
  },
  quickOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    marginLeft: 6,
    gap: 4,
  },
  quickOptionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#A0A0A0',
    maxWidth: 70,
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: gold[400],
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  addBtnDisabled: {
    opacity: 0.35,
  },
  tagsFilterScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    gap: 6,
  },
  tagFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#242424',
  },
  tagFilterPillActive: {
    backgroundColor: '#262012',
    borderColor: gold[400],
  },
  tagFilterText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#888',
  },
  tagFilterTextActive: {
    color: gold[400],
    fontFamily: 'Inter_600SemiBold',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 4,
  },
  statusChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#1E1E1E',
  },
  statusChipActive: {
    backgroundColor: '#202020',
    borderColor: '#3A3A3A',
  },
  statusChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#777',
  },
  statusChipTextActive: {
    color: '#EEE',
    fontFamily: 'Inter_600SemiBold',
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 110,
  },
  compactListCard: {
    backgroundColor: '#131313',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#202020',
    overflow: 'hidden',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#131313',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#1E1E1E',
  },
  compactRowCompleted: {
    backgroundColor: '#101010',
    opacity: 0.65,
  },
  compactRowDragging: {
    backgroundColor: '#1C1910',
    borderColor: gold[400],
  },
  dragHandle: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  compactCheckBtn: {
    marginRight: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactUncheckedCircle: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 1.6,
    borderColor: '#4A4A4A',
  },
  rowMain: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  compactTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13.5,
    color: '#EDEDED',
    lineHeight: 18,
  },
  compactTitleCompleted: {
    color: '#6E6E6E',
    textDecorationLine: 'line-through',
  },
  compactDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: '#8A8A8A',
    lineHeight: 15,
    marginTop: 2,
  },
  compactDescriptionCompleted: {
    color: '#555',
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
    gap: 3,
  },
  tagChipEmoji: {
    fontSize: 9.5,
  },
  tagChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9.5,
    maxWidth: 80,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    backgroundColor: '#1C1C1E',
    gap: 3,
  },
  dateChipOverdue: {
    backgroundColor: '#2E1515',
  },
  dateChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9.5,
    color: '#8E8E93',
  },
  dateChipTextOverdue: {
    color: '#FF453A',
  },
  actionBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  deleteBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  weekContainer: {
    gap: 14,
  },
  weekDaySection: {
    marginBottom: 4,
  },
  weekDayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 6,
  },
  weekDayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekDayName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#8A8A8A',
    letterSpacing: 0.5,
  },
  weekDayNameToday: {
    color: gold[400],
  },
  weekDayDate: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#555',
  },
  weekAddQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  weekAddQuickText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: gold[400],
  },
  weekDayEmpty: {
    backgroundColor: '#111111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1A1A1A',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  weekDayEmptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: '#444',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1C1910',
    borderWidth: 1,
    borderColor: '#302814',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 15,
    color: '#F3EEE3',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    maxWidth: 240,
  },
  clearBtn: {
    alignSelf: 'center',
    marginTop: 18,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  clearBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#777',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  fullModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#181818',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#181818',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFF',
  },
  fieldLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#CCC',
    marginTop: 10,
    marginBottom: 6,
  },
  fieldHelper: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#777',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#121212',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    color: '#FFF',
  },
  modalTextArea: {
    minHeight: 70,
    textAlignVertical: 'top',
    paddingTop: 8,
  },
  modalPresetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  modalPresetBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  modalPresetBtnActive: {
    backgroundColor: '#2A2210',
    borderColor: gold[400],
  },
  modalPresetText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: '#AAA',
  },
  modalPresetTextActive: {
    color: gold[400],
    fontFamily: 'Inter_600SemiBold',
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2C2C2C',
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 4,
  },
  datePickerTriggerText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: '#EEE',
    textTransform: 'capitalize',
  },
  tagsToggleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tagTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#262626',
  },
  tagToggleText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: '#888',
  },
  modalFooterRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#262626',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#222',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#AAA',
  },
  modalSubmitBtn: {
    flex: 1.4,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: gold[400],
    alignItems: 'center',
  },
  modalSubmitBtnDisabled: {
    opacity: 0.4,
  },
  modalSubmitBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#0E0E0E',
  },
  pickerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  modalConfirmBtn: {
    marginTop: 12,
    backgroundColor: gold[400],
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#0E0E0E',
  },
  tagModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#242424',
  },
  tagModalItemActive: {
    backgroundColor: '#221F14',
  },
  tagModalItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  tagModalItemText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#DDD',
  },
});
