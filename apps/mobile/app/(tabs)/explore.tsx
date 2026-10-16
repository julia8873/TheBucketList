import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { PageTitle, Typography, useTheme, FAB } from '@bucketlist/ui';
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
  ChevronLeft,
  ChevronRight,
  Users,
  AlertCircle,
  Flag,
  Sparkles,
  BookmarkPlus,
  ArrowUpDown,
  SlidersHorizontal,
  ArrowDown,
  ArrowUp,
  Layers,
  ArrowDownAZ,
  Star,
  ListChecks,
  Circle,
  RotateCw,
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
  startOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { DraggableTaskList, type DragHandle } from '../../src/components/DraggableTaskList';
import {
  useDailyTasks,
  useDailyTaskStats,
  useCreateDailyTask,
  useUpdateDailyTask,
  useToggleDailyTask,
  useCompleteDailyTask,
  useCompleteRecurringDailyTask,
  useDeleteDailyTask,
  useReorderDailyTasks,
  useClearCompletedDailyTasks,
  useConvertToBucket,
  type DailyTaskPriority,
  type DailyTaskRecurrenceUnit,
  type DailySubtask,
} from '../../src/hooks/useDailyTasks';
import {
  useDailyTags,
  useCreateDailyTag,
  useUpdateDailyTag,
  useDeleteDailyTag,
  type DailyTag,
} from '../../src/hooks/useDailyTags';
import {
  CollaboratorPickerSheet,
  type CollaboratorItem,
} from '../../src/components/CollaboratorPickerSheet';
import { TaskCompactSkeleton } from '../../src/components/TaskSkeletons';
import type { DailyTask, DailyCompletion } from '../../src/services/api/dailyTasksService';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../src/services/supabase';

type TimeView = 'today' | 'week' | 'calendar' | 'all';
type StatusFilter = 'all' | 'pending' | 'completed';

export type DailySortField = 'manual' | 'priority' | 'name' | 'date';
export type DailySortDirection = 'asc' | 'desc';

const PRIORITY_WEIGHT: Record<DailyTaskPriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

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

export const PRIORITY_CONFIG: Record<
  DailyTaskPriority,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  low: { label: 'Baja', color: '#10B981', bgColor: '#0F261B', borderColor: '#194D31' },
  medium: { label: 'Media', color: '#D4B13A', bgColor: '#262010', borderColor: '#3D3310' },
  high: { label: 'Alta', color: '#F97316', bgColor: '#2B190E', borderColor: '#5C2D13' },
  urgent: { label: 'Urgente', color: '#EF4444', bgColor: '#2A1111', borderColor: '#592020' },
};

export const PRIORITY_ORDER: DailyTaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export default function DailyTasksScreen() {
  const { theme } = useTheme();
  const [timeView, setTimeView] = useState<TimeView>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [showTagFilterSheet, setShowTagFilterSheet] = useState(false);

  // Quick filters: Favoritas, Prioridad, Colaboradores
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'urgent' | 'high' | 'medium' | 'low'>('all');
  const [onlyCollaborators, setOnlyCollaborators] = useState(false);

  const SORT_PREF_STORAGE_KEY = '@bucketlist_daily_sort_pref';

  // Sorting & Grouping state
  const [sortField, setSortField] = useState<DailySortField>('manual');
  const [sortDirection, setSortDirection] = useState<DailySortDirection>('desc');
  const [groupByTag, setGroupByTag] = useState(false);
  const [showSortModal, setShowSortModal] = useState(false);

  // Cargar preferencia de ordenación guardada al iniciar la app
  useEffect(() => {
    const loadSavedSortPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem(SORT_PREF_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.sortField) setSortField(parsed.sortField);
          if (parsed.sortDirection) setSortDirection(parsed.sortDirection);
          if (typeof parsed.groupByTag === 'boolean') setGroupByTag(parsed.groupByTag);
        }
      } catch (err) {
        console.warn('Error loading daily tasks sort preference:', err);
      }
    };
    void loadSavedSortPreference();
  }, []);

  const saveSortPreference = useCallback(
    async (
      field: DailySortField,
      direction: DailySortDirection,
      group: boolean
    ) => {
      try {
        await AsyncStorage.setItem(
          SORT_PREF_STORAGE_KEY,
          JSON.stringify({ sortField: field, sortDirection: direction, groupByTag: group })
        );
      } catch (err) {
        console.warn('Error saving daily tasks sort preference:', err);
      }
    },
    []
  );

  const handleSelectSort = (field: DailySortField) => {
    let nextField = field;
    let nextDir: DailySortDirection = sortDirection;

    if (field === sortField) {
      // Si se pulsa la ya seleccionada, invertir el orden
      if (field !== 'manual') {
        nextDir = sortDirection === 'asc' ? 'desc' : 'asc';
      }
    } else {
      nextField = field;
      if (field === 'priority') nextDir = 'desc'; // Urgente primero
      else if (field === 'name') nextDir = 'asc'; // A -> Z
      else if (field === 'date') nextDir = 'asc'; // Próximas primero
      else nextDir = 'desc';
    }

    setSortField(nextField);
    setSortDirection(nextDir);
    void saveSortPreference(nextField, nextDir, groupByTag);
  };

  const handleToggleGroupByTag = () => {
    const nextGroup = !groupByTag;
    setGroupByTag(nextGroup);
    void saveSortPreference(sortField, sortDirection, nextGroup);
  };

  const handleResetSort = () => {
    setSortField('manual');
    setSortDirection('desc');
    setGroupByTag(false);
    void saveSortPreference('manual', 'desc', false);
  };

  // Multi-week navigation state
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, +1 = next, -1 = prev
  const [weeksToShow, setWeeksToShow] = useState<number>(1); // 1, 2, 3, 4 weeks

  // Calendar view state
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(new Date());

  // Quick Add bar state
  const [newTitle, setNewTitle] = useState('');

  // Dedicated "Añadir tarea" modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createDueDate, setCreateDueDate] = useState<string>(toDateString(new Date()));
  const [createPriority, setCreatePriority] = useState<DailyTaskPriority>('medium');
  const [createIsFavorite, setCreateIsFavorite] = useState(false);
  const [createIsRecurring, setCreateIsRecurring] = useState(false);
  const [createRecurrenceInterval, setCreateRecurrenceInterval] = useState<number>(1);
  const [createRecurrenceUnit, setCreateRecurrenceUnit] = useState<DailyTaskRecurrenceUnit>('days');
  const [createShowCustomRecurrence, setCreateShowCustomRecurrence] = useState(false);
  const [createTagIds, setCreateTagIds] = useState<string[]>([]);
  const [createCollaborators, setCreateCollaborators] = useState<CollaboratorItem[]>([]);
  const [createSubtasks, setCreateSubtasks] = useState<DailySubtask[]>([]);
  const [createSubtaskTitle, setCreateSubtaskTitle] = useState('');
  const [showCreateDatePicker, setShowCreateDatePicker] = useState(false);

  // Full Edit Task modal state
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDueDate, setEditDueDate] = useState<string>(toDateString(new Date()));
  const [editPriority, setEditPriority] = useState<DailyTaskPriority>('medium');
  const [editIsFavorite, setEditIsFavorite] = useState(false);
  const [editIsCompleted, setEditIsCompleted] = useState(false);
  const [editIsRecurring, setEditIsRecurring] = useState(false);
  const [editRecurrenceInterval, setEditRecurrenceInterval] = useState<number>(1);
  const [editRecurrenceUnit, setEditRecurrenceUnit] = useState<DailyTaskRecurrenceUnit>('days');
  const [editShowCustomRecurrence, setEditShowCustomRecurrence] = useState(false);
  const [editTagIds, setEditTagIds] = useState<string[]>([]);
  const [editCollaborators, setEditCollaborators] = useState<CollaboratorItem[]>([]);
  const [editSubtasks, setEditSubtasks] = useState<DailySubtask[]>([]);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);

  // Collaborator picker state
  const [showCollaboratorPicker, setShowCollaboratorPicker] = useState(false);
  const [collaboratorPickerTarget, setCollaboratorPickerTarget] = useState<'create' | 'edit'>('create');

  // Tag Form Modal state (Create & Edit)
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingDailyTag, setEditingDailyTag] = useState<DailyTag | null>(null);
  const [tagFormName, setTagFormName] = useState('');
  const [tagFormColor, setTagFormColor] = useState('#D4B13A');
  const [tagFormEmoji, setTagFormEmoji] = useState('📌');
  const [tagCreatedTarget, setTagCreatedTarget] = useState<'create' | 'edit' | 'quick' | 'sheet'>('create');

  // Overdue reschedule custom date picker state
  const [rescheduleTask, setRescheduleTask] = useState<DailyTask | null>(null);
  const [showRescheduleDatePicker, setShowRescheduleDatePicker] = useState(false);

  const [dragging, setDragging] = useState(false);

  const handleDraggingChange = useCallback((isDragging: boolean) => {
    setDragging(isDragging);
  }, []);

  const inputRef = useRef<TextInput>(null);

  const { data: tasks = [], isLoading, refetch } = useDailyTasks();
  const { data: stats, refetch: refetchStats } = useDailyTaskStats();
  const { data: userTags = [] } = useDailyTags();
  const createDailyTagMutation = useCreateDailyTag();
  const updateDailyTagMutation = useUpdateDailyTag();
  const deleteDailyTagMutation = useDeleteDailyTag();

  const [manualRefreshing, setManualRefreshing] = useState(false);
  const handleRefresh = async () => {
    setManualRefreshing(true);
    try {
      await Promise.all([refetch(), refetchStats()]);
    } finally {
      setManualRefreshing(false);
    }
  };

  const createMutation = useCreateDailyTask();
  const updateMutation = useUpdateDailyTask();
  const completeMutation = useCompleteDailyTask();
  const completeRecurringMutation = useCompleteRecurringDailyTask();
  const toggleMutation = useToggleDailyTask();
  const deleteMutation = useDeleteDailyTask();
  const reorderMutation = useReorderDailyTasks();
  const clearMutation = useClearCompletedDailyTasks();
  const convertToBucketMutation = useConvertToBucket();

  const todayStr = useMemo(() => toDateString(new Date()), []);

  // Map of tags by id for quick lookup
  const tagMap = useMemo(() => {
    const map = new Map<string, DailyTag>();
    userTags.forEach((t) => map.set(t.id, t));
    return map;
  }, [userTags]);

  // Fetch collaborator profiles for all tasks
  const allCollaboratorIds = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => (t.collaborator_ids || []).forEach((id) => set.add(id)));
    if (editingTask?.collaborator_ids) {
      editingTask.collaborator_ids.forEach((id) => set.add(id));
    }
    return Array.from(set);
  }, [tasks, editingTask]);

  const { data: collaboratorProfiles = [] } = useQuery({
    queryKey: ['profiles_batch', allCollaboratorIds],
    queryFn: async () => {
      if (allCollaboratorIds.length === 0) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .in('id', allCollaboratorIds);
      if (error) {
        console.warn('Error fetching collaborator profiles:', error);
        return [];
      }
      return data || [];
    },
    enabled: allCollaboratorIds.length > 0,
  });

  const collaboratorMap = useMemo(() => {
    const map = new Map<string, CollaboratorItem>();
    collaboratorProfiles.forEach((p: any) =>
      map.set(p.id, {
        id: p.id,
        username: p.username,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
      })
    );
    return map;
  }, [collaboratorProfiles]);

  // Base filtered by tag, status, favorite, priority and collaborators
  const filteredByTagAndStatus = useMemo(() => {
    return tasks.filter((t) => {
      // Filtrado por estado (pendientes / completadas)
      if (statusFilter === 'pending' && t.is_completed) return false;
      if (statusFilter === 'completed' && !t.is_completed) return false;
      // Filtrado por múltiples etiquetas
      if (selectedTagFilters.length > 0) {
        if (!t.tag_ids || !t.tag_ids.some((id) => selectedTagFilters.includes(id))) return false;
      }
      // Filtro de favoritas
      if (onlyFavorites && !t.is_favorite) return false;
      // Filtro de prioridad
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      // Filtro de colaboradores
      if (onlyCollaborators && (!t.collaborator_ids || t.collaborator_ids.length === 0)) return false;

      return true;
    });
  }, [tasks, timeView, statusFilter, selectedTagFilters, onlyFavorites, priorityFilter, onlyCollaborators]);

  const favoritesCount = useMemo(() => tasks.filter((t) => t.is_favorite).length, [tasks]);

  // Overdue pending tasks (due date before today)
  const overdueTasks = useMemo(() => {
    return filteredByTagAndStatus.filter((t) => {
      if (t.is_completed) return false;
      const taskDate = t.due_date || todayStr;
      return taskDate < todayStr;
    });
  }, [filteredByTagAndStatus, todayStr]);

  // Tasks specifically for Today view (strictly due today and uncompleted)
  const todayTasks = useMemo(() => {
    return filteredByTagAndStatus.filter((t) => {
      if (t.is_completed) return false;
      const taskDate = t.due_date || todayStr;
      return taskDate === todayStr;
    });
  }, [filteredByTagAndStatus, todayStr]);

  // Upcoming 7 days starting from today for quick weekday rescheduling
  const upcomingWeekDays = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(today, i);
      const dateStr = toDateString(d);
      let label = format(d, 'EEE', { locale: es });
      label = label.charAt(0).toUpperCase() + label.slice(1).replace('.', '');
      const isDayToday = i === 0;
      const isDayTomorrow = i === 1;
      if (isDayToday) label = 'Hoy';
      else if (isDayTomorrow) label = 'Mañana';
      return {
        date: d,
        dateStr,
        label,
        dayNum: format(d, 'd'),
        isToday: isDayToday,
      };
    });
  }, []);

  // Multi-week days generator: groups days by week (empieza por hoy, no muestra días pasados)
  const displayedWeeks = useMemo(() => {
    const today = startOfDay(new Date());
    const baseMonday = startOfWeek(addDays(today, weekOffset * 7), { weekStartsOn: 1 });

    return Array.from({ length: weeksToShow }, (_, weekIdx) => {
      const monday = addDays(baseMonday, weekIdx * 7);
      const sunday = endOfWeek(monday, { weekStartsOn: 1 });

      const allDays = Array.from({ length: 7 }, (_, dayIdx) => {
        const day = addDays(monday, dayIdx);
        const dayStr = toDateString(day);
        return {
          date: day,
          dateStr: dayStr,
          dayName: format(day, 'EEEE', { locale: es }),
          formatted: format(day, 'd MMM', { locale: es }),
          isCurrentDay: isToday(day),
        };
      });

      // No mostrar días anteriores a hoy (empieza por el día actual)
      const days = allDays.filter((d) => !isBefore(d.date, today));
      const firstDay = days[0]?.date || monday;
      const lastDay = days[days.length - 1]?.date || sunday;
      const weekLabel = `Semana del ${format(firstDay, 'd MMM', { locale: es })} al ${format(lastDay, 'd MMM yyyy', { locale: es })}`;

      return {
        weekIndex: weekIdx,
        weekLabel,
        monday: firstDay,
        sunday: lastDay,
        days,
      };
    }).filter((wk) => wk.days.length > 0);
  }, [weekOffset, weeksToShow]);

  // Calendar Grid calculation
  const calendarGrid = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    // Group tasks by date for the calendar
    const tasksMap = new Map<string, { pending: DailyTask[]; completed: DailyTask[] }>();
    filteredByTagAndStatus.forEach((t) => {
      const dStr = t.due_date || todayStr;
      const current = tasksMap.get(dStr) || { pending: [], completed: [] };
      if (t.is_completed) {
        current.completed.push(t);
      } else {
        current.pending.push(t);
      }
      tasksMap.set(dStr, current);
    });

    return {
      monthLabel: format(calendarMonth, 'MMMM yyyy', { locale: es }),
      days: days.map((d) => {
        const dStr = toDateString(d);
        const taskInfo = tasksMap.get(dStr);
        return {
          date: d,
          dateStr: dStr,
          dayNumber: format(d, 'd'),
          isCurrentMonth: isSameMonth(d, calendarMonth),
          isToday: isToday(d),
          isSelected: isSameDay(d, selectedCalendarDate),
          pendingCount: taskInfo?.pending.length || 0,
          completedCount: taskInfo?.completed.length || 0,
          totalCount: (taskInfo?.pending.length || 0) + (taskInfo?.completed.length || 0),
        };
      }),
    };
  }, [calendarMonth, selectedCalendarDate, filteredByTagAndStatus, todayStr]);

  // Selected date tasks for calendar view
  const selectedDateTasks = useMemo(() => {
    const dStr = toDateString(selectedCalendarDate);
    return filteredByTagAndStatus.filter((t) => (t.due_date || todayStr) === dStr);
  }, [selectedCalendarDate, filteredByTagAndStatus, todayStr]);

  const selectedDateCompleted = useMemo(() => {
    const dStr = toDateString(selectedCalendarDate);
    return filteredByTagAndStatus.filter((t) => t.is_completed && (t.due_date || todayStr) === dStr);
  }, [selectedCalendarDate, filteredByTagAndStatus, todayStr]);

  const completedList = useMemo(() => {
    return filteredByTagAndStatus.filter((t) => {
      if (!t.is_completed) return false;
      const taskDate = t.due_date || todayStr;
      const completedToday = t.completed_at ? t.completed_at.startsWith(todayStr) : false;
      return taskDate === todayStr || completedToday;
    });
  }, [filteredByTagAndStatus, todayStr]);

  // Sorting helper
  const sortTasks = useCallback(
    (items: DailyTask[]): DailyTask[] => {
      if (sortField === 'manual') return items;

      return [...items].sort((a, b) => {
        if (sortField === 'priority') {
          const weightA = a.priority ? PRIORITY_WEIGHT[a.priority] : 2;
          const weightB = b.priority ? PRIORITY_WEIGHT[b.priority] : 2;
          const diff = sortDirection === 'desc' ? weightB - weightA : weightA - weightB;
          if (diff !== 0) return diff;
          return a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
        }

        if (sortField === 'name') {
          const comp = a.title.localeCompare(b.title, 'es', { sensitivity: 'base' });
          return sortDirection === 'asc' ? comp : -comp;
        }

        if (sortField === 'date') {
          const dateA = a.due_date || '9999-12-31';
          const dateB = b.due_date || '9999-12-31';
          const comp = dateA.localeCompare(dateB);
          return sortDirection === 'asc' ? comp : -comp;
        }

        return 0;
      });
    },
    [sortField, sortDirection]
  );

  // Grouping by Tag helper
  const groupTasksByTag = useCallback(
    (items: DailyTask[]): { id: string; tag: DailyTag | null; tasks: DailyTask[] }[] => {
      const groups: { id: string; tag: DailyTag | null; tasks: DailyTask[] }[] = [];
      const tagGroupsMap = new Map<string, DailyTask[]>();
      const untagged: DailyTask[] = [];

      userTags.forEach((tag) => {
        tagGroupsMap.set(tag.id, []);
      });

      items.forEach((task) => {
        const firstTagId = task.tag_ids && task.tag_ids.length > 0 ? task.tag_ids[0] : null;
        if (firstTagId && tagGroupsMap.has(firstTagId)) {
          tagGroupsMap.get(firstTagId)!.push(task);
        } else {
          untagged.push(task);
        }
      });

      userTags.forEach((tag) => {
        const groupTasks = tagGroupsMap.get(tag.id) || [];
        if (groupTasks.length > 0) {
          groups.push({ id: tag.id, tag, tasks: groupTasks });
        }
      });

      if (untagged.length > 0) {
        groups.push({ id: 'untagged', tag: null, tasks: untagged });
      }

      return groups;
    },
    [userTags]
  );

  const sortedOverdueTasks = useMemo(() => sortTasks(overdueTasks), [overdueTasks, sortTasks]);
  const sortedTodayTasks = useMemo(() => sortTasks(todayTasks), [todayTasks, sortTasks]);
  const sortedAllTasks = useMemo(() => sortTasks(filteredByTagAndStatus), [filteredByTagAndStatus, sortTasks]);
  const sortedSelectedDateTasks = useMemo(() => sortTasks(selectedDateTasks), [selectedDateTasks, sortTasks]);

  const todayTagGroups = useMemo(() => groupTasksByTag(sortedTodayTasks), [sortedTodayTasks, groupTasksByTag]);
  const allTagGroups = useMemo(() => groupTasksByTag(sortedAllTasks), [sortedAllTasks, groupTasksByTag]);

  const handleConvertToBucket = (task: DailyTask) => {
    Alert.alert(
      'Convertir en Bucket List',
      `¿Deseas convertir "${task.title}" en un objetivo de tu Bucket List?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Convertir y mover',
          style: 'default',
          onPress: async () => {
            try {
              await convertToBucketMutation.mutateAsync({ task, deleteDaily: true });
              if (editingTask?.id === task.id) {
                setEditingTask(null);
              }
              Alert.alert('¡Convertida con éxito!', 'La tarea se ha añadido a tu Bucket List.');
            } catch (err: any) {
              Alert.alert('Error al convertir', err?.message || 'No se pudo convertir la tarea.');
            }
          },
        },
        {
          text: 'Mantener también aquí',
          style: 'default',
          onPress: async () => {
            try {
              await convertToBucketMutation.mutateAsync({ task, deleteDaily: false });
              if (editingTask?.id === task.id) {
                setEditingTask(null);
              }
              Alert.alert('¡Copiada con éxito!', 'La tarea se ha duplicado en tu Bucket List.');
            } catch (err: any) {
              Alert.alert('Error al copiar', err?.message || 'No se pudo copiar la tarea.');
            }
          },
        },
      ]
    );
  };

  const handleQuickAddTask = () => {
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    createMutation.mutate({
      title: trimmed,
      due_date: todayStr,
      priority: 'medium',
      tag_ids: [],
      collaborator_ids: [],
    });

    setNewTitle('');
  };

  const handleOpenCreateTask = (defaultDate?: string) => {
    setCreateTitle('');
    setCreateDescription('');
    setCreateDueDate(defaultDate || (timeView === 'calendar' ? toDateString(selectedCalendarDate) : todayStr));
    setCreatePriority('medium');
    setCreateIsFavorite(false);
    setCreateIsRecurring(false);
    setCreateRecurrenceInterval(1);
    setCreateRecurrenceUnit('days');
    setCreateShowCustomRecurrence(false);
    setCreateTagIds(selectedTagFilters.length > 0 ? [...selectedTagFilters] : []);
    setCreateCollaborators([]);
    setCreateSubtasks([]);
    setCreateSubtaskTitle('');
    setShowCreateModal(true);
  };

  const handleCreateFromModal = () => {
    const trimmed = createTitle.trim();
    if (!trimmed) return;

    createMutation.mutate({
      title: trimmed,
      description: createDescription.trim() || null,
      due_date: createDueDate,
      priority: createPriority,
      is_favorite: createIsFavorite,
      is_recurring: createIsRecurring,
      recurrence_interval: createRecurrenceInterval,
      recurrence_unit: createRecurrenceUnit,
      tag_ids: createTagIds,
      collaborator_ids: createCollaborators.map((c) => c.id),
      subtasks: createSubtasks,
    });

    setCreateTitle('');
    setCreateDescription('');
    setCreateDueDate(todayStr);
    setCreatePriority('medium');
    setCreateIsFavorite(false);
    setCreateIsRecurring(false);
    setCreateRecurrenceInterval(1);
    setCreateRecurrenceUnit('days');
    setCreateShowCustomRecurrence(false);
    setCreateTagIds([]);
    setCreateCollaborators([]);
    setCreateSubtasks([]);
    setCreateSubtaskTitle('');
    setShowCreateModal(false);
  };

  const handleAddCreateSubtask = () => {
    const trimmed = createSubtaskTitle.trim();
    if (!trimmed) return;
    const newSt: DailySubtask = {
      id: 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      title: trimmed,
      is_completed: false,
    };
    setCreateSubtasks((prev) => [...prev, newSt]);
    setCreateSubtaskTitle('');
  };

  const handleToggleCreateSubtask = (subtaskId: string) => {
    setCreateSubtasks((prev) =>
      prev.map((st) => (st.id === subtaskId ? { ...st, is_completed: !st.is_completed } : st))
    );
  };

  const handleDeleteCreateSubtask = (subtaskId: string) => {
    setCreateSubtasks((prev) => prev.filter((st) => st.id !== subtaskId));
  };

  const handleToggleFavorite = (task: DailyTask) => {
    updateMutation.mutate({
      id: task.id,
      updates: { is_favorite: !task.is_favorite },
    });
  };

  const isStandardRecurrencePreset = (interval?: number, unit?: DailyTaskRecurrenceUnit) => {
    const i = interval || 1;
    const u = unit || 'days';
    if (u === 'days' && (i === 1 || i === 2)) return true;
    if (u === 'weeks' && (i === 1 || i === 2)) return true;
    if (u === 'months' && i === 1) return true;
    return false;
  };

  const calculateNextRecurringDate = (
    currentDueDateStr: string | null | undefined,
    interval: number = 1,
    unit: DailyTaskRecurrenceUnit = 'days'
  ): string => {
    const today = startOfDay(new Date());
    let baseDate = currentDueDateStr ? startOfDay(parseISO(currentDueDateStr)) : today;

    // Si la fecha límite estaba en el pasado (vencida), calculamos a partir de hoy
    if (isBefore(baseDate, today)) {
      baseDate = today;
    }

    const safeInterval = Math.max(1, interval || 1);
    let nextDate: Date;

    if (unit === 'weeks') {
      nextDate = addDays(baseDate, safeInterval * 7);
    } else if (unit === 'months') {
      nextDate = addMonths(baseDate, safeInterval);
    } else {
      nextDate = addDays(baseDate, safeInterval);
    }

    return format(nextDate, 'yyyy-MM-dd');
  };

  const getRecurrenceLabel = (
    interval: number = 1,
    unit: DailyTaskRecurrenceUnit = 'days'
  ): string => {
    const safeInterval = Math.max(1, interval || 1);
    if (unit === 'days') {
      if (safeInterval === 1) return 'Cada día';
      return `Cada ${safeInterval} días`;
    }
    if (unit === 'weeks') {
      if (safeInterval === 1) return 'Cada semana';
      return `Cada ${safeInterval} semanas`;
    }
    if (unit === 'months') {
      if (safeInterval === 1) return 'Cada mes';
      return `Cada ${safeInterval} meses`;
    }
    return `Cada ${safeInterval} días`;
  };

  const renderRecurrenceSelector = (isCreate: boolean) => {
    const isRecurring = isCreate ? createIsRecurring : editIsRecurring;
    const setIsRecurring = isCreate ? setCreateIsRecurring : setEditIsRecurring;
    const interval = isCreate ? createRecurrenceInterval : editRecurrenceInterval;
    const setInterval = isCreate ? setCreateRecurrenceInterval : setEditRecurrenceInterval;
    const unit = isCreate ? createRecurrenceUnit : editRecurrenceUnit;
    const setUnit = isCreate ? setCreateRecurrenceUnit : setEditRecurrenceUnit;
    const showCustom = isCreate ? createShowCustomRecurrence : editShowCustomRecurrence;
    const setShowCustom = isCreate ? setCreateShowCustomRecurrence : setEditShowCustomRecurrence;

    return (
      <View style={{ marginBottom: 12 }}>
        <Text style={styles.fieldLabel}>Repetir / Recurrencia</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recurrencePresetsScroll}
        >
          {/* No se repite */}
          <Pressable
            style={[
              styles.recurrencePresetPill,
              !isRecurring && styles.recurrencePresetPillActive,
            ]}
            onPress={() => {
              setIsRecurring(false);
              setShowCustom(false);
            }}
          >
            <Text
              style={[
                styles.recurrencePresetText,
                !isRecurring && styles.recurrencePresetTextActive,
              ]}
            >
              No se repite
            </Text>
          </Pressable>

          {/* Cada día */}
          <Pressable
            style={[
              styles.recurrencePresetPill,
              isRecurring && interval === 1 && unit === 'days' && !showCustom && styles.recurrencePresetPillActive,
            ]}
            onPress={() => {
              setIsRecurring(true);
              setInterval(1);
              setUnit('days');
              setShowCustom(false);
            }}
          >
            <RotateCw
              size={12}
              color={isRecurring && interval === 1 && unit === 'days' && !showCustom ? gold[400] : '#888'}
            />
            <Text
              style={[
                styles.recurrencePresetText,
                isRecurring && interval === 1 && unit === 'days' && !showCustom && styles.recurrencePresetTextActive,
              ]}
            >
              Cada día
            </Text>
          </Pressable>

          {/* Cada 2 días */}
          <Pressable
            style={[
              styles.recurrencePresetPill,
              isRecurring && interval === 2 && unit === 'days' && !showCustom && styles.recurrencePresetPillActive,
            ]}
            onPress={() => {
              setIsRecurring(true);
              setInterval(2);
              setUnit('days');
              setShowCustom(false);
            }}
          >
            <RotateCw
              size={12}
              color={isRecurring && interval === 2 && unit === 'days' && !showCustom ? gold[400] : '#888'}
            />
            <Text
              style={[
                styles.recurrencePresetText,
                isRecurring && interval === 2 && unit === 'days' && !showCustom && styles.recurrencePresetTextActive,
              ]}
            >
              Cada 2 días
            </Text>
          </Pressable>

          {/* Cada semana */}
          <Pressable
            style={[
              styles.recurrencePresetPill,
              isRecurring && interval === 1 && unit === 'weeks' && !showCustom && styles.recurrencePresetPillActive,
            ]}
            onPress={() => {
              setIsRecurring(true);
              setInterval(1);
              setUnit('weeks');
              setShowCustom(false);
            }}
          >
            <RotateCw
              size={12}
              color={isRecurring && interval === 1 && unit === 'weeks' && !showCustom ? gold[400] : '#888'}
            />
            <Text
              style={[
                styles.recurrencePresetText,
                isRecurring && interval === 1 && unit === 'weeks' && !showCustom && styles.recurrencePresetTextActive,
              ]}
            >
              Cada semana
            </Text>
          </Pressable>

          {/* Cada 2 semanas */}
          <Pressable
            style={[
              styles.recurrencePresetPill,
              isRecurring && interval === 2 && unit === 'weeks' && !showCustom && styles.recurrencePresetPillActive,
            ]}
            onPress={() => {
              setIsRecurring(true);
              setInterval(2);
              setUnit('weeks');
              setShowCustom(false);
            }}
          >
            <RotateCw
              size={12}
              color={isRecurring && interval === 2 && unit === 'weeks' && !showCustom ? gold[400] : '#888'}
            />
            <Text
              style={[
                styles.recurrencePresetText,
                isRecurring && interval === 2 && unit === 'weeks' && !showCustom && styles.recurrencePresetTextActive,
              ]}
            >
              Cada 2 semanas
            </Text>
          </Pressable>

          {/* Cada mes */}
          <Pressable
            style={[
              styles.recurrencePresetPill,
              isRecurring && interval === 1 && unit === 'months' && !showCustom && styles.recurrencePresetPillActive,
            ]}
            onPress={() => {
              setIsRecurring(true);
              setInterval(1);
              setUnit('months');
              setShowCustom(false);
            }}
          >
            <RotateCw
              size={12}
              color={isRecurring && interval === 1 && unit === 'months' && !showCustom ? gold[400] : '#888'}
            />
            <Text
              style={[
                styles.recurrencePresetText,
                isRecurring && interval === 1 && unit === 'months' && !showCustom && styles.recurrencePresetTextActive,
              ]}
            >
              Cada mes
            </Text>
          </Pressable>

          {/* Personalizado... */}
          <Pressable
            style={[
              styles.recurrencePresetPill,
              isRecurring && showCustom && styles.recurrencePresetPillActive,
            ]}
            onPress={() => {
              setIsRecurring(true);
              setShowCustom(true);
            }}
          >
            <Text
              style={[
                styles.recurrencePresetText,
                isRecurring && showCustom && styles.recurrencePresetTextActive,
              ]}
            >
              Personalizado...
            </Text>
          </Pressable>
        </ScrollView>

        {/* Stepper y selector de unidades para personalizado */}
        {isRecurring && showCustom && (
          <View style={styles.recurrenceCustomBox}>
            <View style={styles.recurrenceStepperRow}>
              <Text style={styles.recurrenceStepperLabel}>Repetir cada:</Text>
              <View style={styles.recurrenceStepperControls}>
                <Pressable
                  style={styles.recurrenceStepBtn}
                  onPress={() => setInterval((prev) => Math.max(1, prev - 1))}
                  hitSlop={6}
                >
                  <Text style={styles.recurrenceStepBtnText}>-</Text>
                </Pressable>
                <Text style={styles.recurrenceStepValueText}>{interval}</Text>
                <Pressable
                  style={styles.recurrenceStepBtn}
                  onPress={() => setInterval((prev) => Math.min(99, prev + 1))}
                  hitSlop={6}
                >
                  <Text style={styles.recurrenceStepBtnText}>+</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.recurrenceUnitsRow}>
              {(['days', 'weeks', 'months'] as const).map((u) => {
                const isSelected = unit === u;
                const label =
                  u === 'days'
                    ? interval === 1 ? 'Día' : 'Días'
                    : u === 'weeks'
                    ? interval === 1 ? 'Semana' : 'Semanas'
                    : interval === 1 ? 'Mes' : 'Meses';
                return (
                  <Pressable
                    key={u}
                    style={[
                      styles.recurrenceUnitPill,
                      isSelected && styles.recurrenceUnitPillActive,
                    ]}
                    onPress={() => setUnit(u)}
                  >
                    <Text
                      style={[
                        styles.recurrenceUnitText,
                        isSelected && styles.recurrenceUnitTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {isRecurring && (
          <Text style={styles.recurrenceHelperNote}>
            🔄 Se repetirá {getRecurrenceLabel(interval, unit)}. Al completarla, pasará automáticamente a la siguiente fecha.
          </Text>
        )}
      </View>
    );
  };

  const openEditTask = (task: DailyTask) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditDueDate(task.due_date || todayStr);
    setEditPriority(task.priority || 'medium');
    setEditIsFavorite(Boolean(task.is_favorite));
    setEditIsCompleted(Boolean(task.is_completed));
    setEditIsRecurring(Boolean(task.is_recurring));
    setEditRecurrenceInterval(task.recurrence_interval || 1);
    setEditRecurrenceUnit(task.recurrence_unit || 'days');
    setEditShowCustomRecurrence(
      Boolean(task.is_recurring) &&
      !isStandardRecurrencePreset(task.recurrence_interval, task.recurrence_unit)
    );
    setEditTagIds(task.tag_ids || []);
    setEditSubtasks(task.subtasks || []);
    setEditSubtaskTitle('');
    const existingCols = (task.collaborator_ids || [])
      .map((id) => collaboratorMap.get(id))
      .filter(Boolean) as CollaboratorItem[];
    setEditCollaborators(existingCols);
  };

  const handleAddEditSubtask = () => {
    const trimmed = editSubtaskTitle.trim();
    if (!trimmed) return;
    const newSt: DailySubtask = {
      id: 'sub_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      title: trimmed,
      is_completed: false,
    };
    const nextSubtasks = [...editSubtasks, newSt];
    setEditSubtasks(nextSubtasks);
    setEditSubtaskTitle('');
    if (editingTask && !editingTask.id.startsWith('temp-')) {
      updateMutation.mutate({
        id: editingTask.id,
        updates: { subtasks: nextSubtasks },
      });
    }
  };

  const handleToggleEditSubtask = (subtaskId: string) => {
    const nextSubtasks = editSubtasks.map((st) =>
      st.id === subtaskId ? { ...st, is_completed: !st.is_completed } : st
    );
    setEditSubtasks(nextSubtasks);
    if (editingTask && !editingTask.id.startsWith('temp-')) {
      updateMutation.mutate({
        id: editingTask.id,
        updates: { subtasks: nextSubtasks },
      });
    }
  };

  const handleDeleteEditSubtask = (subtaskId: string) => {
    const nextSubtasks = editSubtasks.filter((st) => st.id !== subtaskId);
    setEditSubtasks(nextSubtasks);
    if (editingTask && !editingTask.id.startsWith('temp-')) {
      updateMutation.mutate({
        id: editingTask.id,
        updates: { subtasks: nextSubtasks },
      });
    }
  };

  const handleSaveEditModal = () => {
    if (!editingTask) return;
    const trimmed = editTitle.trim();
    if (!trimmed) return;

    // Si se marca como completada desde el modal y es recurrente: avanzar a la siguiente fecha
    if (!editingTask.is_completed && editIsCompleted && editIsRecurring) {
      const nextDueDate = calculateNextRecurringDate(
        editDueDate,
        editRecurrenceInterval,
        editRecurrenceUnit
      );
      const resetSubtasks = editSubtasks.map((s) => ({ ...s, is_completed: false }));

      completeRecurringMutation.mutate({
        task: {
          ...editingTask,
          title: trimmed,
          description: editDescription.trim() || null,
          priority: editPriority,
          is_favorite: editIsFavorite,
          is_recurring: editIsRecurring,
          recurrence_interval: editRecurrenceInterval,
          recurrence_unit: editRecurrenceUnit,
          due_date: editDueDate,
          tag_ids: editTagIds,
          collaborator_ids: editCollaborators.map((c) => c.id),
          subtasks: editSubtasks,
        },
        nextDueDate,
        resetSubtasks,
      });

      setEditingTask(null);
      return;
    }

    updateMutation.mutate({
      id: editingTask.id,
      updates: {
        title: trimmed,
        description: editDescription.trim() || null,
        due_date: editDueDate,
        priority: editPriority,
        is_favorite: editIsFavorite,
        is_completed: editIsCompleted,
        is_recurring: editIsRecurring,
        recurrence_interval: editRecurrenceInterval,
        recurrence_unit: editRecurrenceUnit,
        completed_at: editIsCompleted
          ? (editingTask.completed_at || new Date().toISOString())
          : null,
        tag_ids: editTagIds,
        collaborator_ids: editCollaborators.map((c) => c.id),
        subtasks: editSubtasks,
      },
    });

    setEditingTask(null);
  };

  // Tag Form (Create & Edit)
  const openCreateTag = (target: 'create' | 'edit' | 'sheet' = 'create') => {
    setTagCreatedTarget(target);
    setEditingDailyTag(null);
    setTagFormName('');
    setTagFormColor('#D4B13A');
    setTagFormEmoji('📌');
    setShowTagModal(true);
  };

  const openEditTag = (tag: DailyTag) => {
    setEditingDailyTag(tag);
    setTagFormName(tag.name);
    setTagFormColor(tag.color || '#D4B13A');
    setTagFormEmoji(tag.emoji || '📌');
    setShowTagModal(true);
  };

  const isSavingTag = createDailyTagMutation.isPending || updateDailyTagMutation.isPending;

  const handleSaveTag = async () => {
    const trimmed = tagFormName.trim();
    if (!trimmed) return;

    try {
      if (editingDailyTag) {
        await updateDailyTagMutation.mutateAsync({
          id: editingDailyTag.id,
          name: trimmed,
          color: tagFormColor,
          emoji: tagFormEmoji,
        });
      } else {
        const created = await createDailyTagMutation.mutateAsync({
          name: trimmed,
          color: tagFormColor,
          emoji: tagFormEmoji,
        });
        if (tagCreatedTarget === 'create') {
          setCreateTagIds((prev) => [...prev, created.id]);
        } else if (tagCreatedTarget === 'edit') {
          setEditTagIds((prev) => [...prev, created.id]);
        } else if (tagCreatedTarget === 'sheet') {
          setSelectedTagFilters((prev) => [...prev, created.id]);
        }
      }

      setEditingDailyTag(null);
      setTagFormName('');
      setTagFormEmoji('📌');
      setShowTagModal(false);
    } catch (err: any) {
      console.warn('Error saving tag:', err);
      Alert.alert('Error al guardar etiqueta', err?.message || 'No se pudo guardar la etiqueta');
    }
  };

  const handleDeleteTag = (tag: DailyTag) => {
    Alert.alert(
      'Eliminar etiqueta',
      `¿Seguro que deseas eliminar la etiqueta "${tag.name}"? Se quitará de tus tareas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await deleteDailyTagMutation.mutateAsync(tag.id);
            setSelectedTagFilters((prev) => prev.filter((id) => id !== tag.id));
            setCreateTagIds((prev) => prev.filter((id) => id !== tag.id));
            setEditTagIds((prev) => prev.filter((id) => id !== tag.id));
            setEditingDailyTag(null);
            setShowTagModal(false);
          },
        },
      ]
    );
  };

  const renderTagFormModal = (isNestedOverlay = false) => {
    if (!showTagModal) return null;

    const content = (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            setShowTagModal(false);
            setEditingDailyTag(null);
          }}
        />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingDailyTag ? 'Editar etiqueta' : 'Nueva etiqueta'}
            </Text>
            <Pressable
              onPress={() => {
                setShowTagModal(false);
                setEditingDailyTag(null);
              }}
              hitSlop={10}
            >
              <X size={18} color="#888" />
            </Pressable>
          </View>

          {/* Input Name */}
          <Text style={styles.fieldLabel}>Nombre</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Ej. Prioritario, Gimnasio..."
            placeholderTextColor="#666"
            value={tagFormName}
            onChangeText={setTagFormName}
            autoFocus
          />

          {/* Color Selector */}
          <Text style={styles.fieldLabel}>Color</Text>
          <View style={styles.paletteRow}>
            {['#D4B13A', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6', '#F97316', '#06B6D4', '#EF4444'].map((c) => (
              <Pressable
                key={c}
                style={[
                  styles.paletteCircle,
                  { backgroundColor: c },
                  tagFormColor === c && styles.paletteCircleSelected,
                ]}
                onPress={() => setTagFormColor(c)}
              >
                {tagFormColor === c && <Check size={13} color="#FFF" />}
              </Pressable>
            ))}
          </View>

          {/* Custom Emoji Input & Presets */}
          <Text style={styles.fieldLabel}>Icono / Emoji</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <TextInput
              style={{
                width: 48,
                height: 48,
                backgroundColor: '#1E1E1E',
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: tagFormColor || '#D4B13A',
                textAlign: 'center',
                fontSize: 22,
                color: '#FFF',
              }}
              value={tagFormEmoji}
              onChangeText={(text) => setTagFormEmoji(text.trim())}
              placeholder="📌"
              placeholderTextColor="#666"
              maxLength={6}
            />
            <Text style={{ fontSize: 12, color: '#888', flex: 1, lineHeight: 16 }}>
              Escribe cualquier emoji desde tu teclado, o toca una sugerencia rápida:
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
          >
            {['📌', '💼', '🏠', '🏃', '🛒', '📚', '⭐', '💡', '🎯', '🔥', '🚀', '💻', '🎉', '🍕', '✈️', '🎨', '🎵', '❤️'].map((em) => (
              <Pressable
                key={em}
                style={[
                  styles.emojiCircle,
                  tagFormEmoji === em && styles.emojiCircleSelected,
                ]}
                onPress={() => setTagFormEmoji(em)}
              >
                <Text style={{ fontSize: 16 }}>{em}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* If editing, show delete button */}
          {editingDailyTag && (
            <Pressable
              style={styles.deleteTagRow}
              onPress={() => handleDeleteTag(editingDailyTag)}
            >
              <Trash2 size={15} color="#FF453A" />
              <Text style={styles.deleteTagRowText}>Eliminar esta etiqueta</Text>
            </Pressable>
          )}

          {/* Buttons */}
          <View style={styles.modalFooterRow}>
            <Pressable
              style={styles.modalCancelBtn}
              onPress={() => {
                setShowTagModal(false);
                setEditingDailyTag(null);
              }}
            >
              <Text style={styles.modalCancelBtnText}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[
                styles.modalSubmitBtn,
                (!tagFormName.trim() || isSavingTag) && styles.modalSubmitBtnDisabled,
              ]}
              disabled={!tagFormName.trim() || isSavingTag}
              onPress={handleSaveTag}
            >
              {isSavingTag ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>
                  {editingDailyTag ? 'Guardar' : 'Crear etiqueta'}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    );

    if (isNestedOverlay) {
      return (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
          {content}
        </View>
      );
    }

    return (
      <Modal
        transparent
        animationType="fade"
        visible={showTagModal}
        onRequestClose={() => {
          setShowTagModal(false);
          setEditingDailyTag(null);
        }}
      >
        {content}
      </Modal>
    );
  };

  const handleToggle = (task: DailyTask) => {
    if (!task.is_completed) {
      if (task.is_recurring) {
        const nextDueDate = calculateNextRecurringDate(
          task.due_date,
          task.recurrence_interval,
          task.recurrence_unit
        );
        const resetSubtasks = (task.subtasks || []).map((s) => ({ ...s, is_completed: false }));
        completeRecurringMutation.mutate({
          task,
          nextDueDate,
          resetSubtasks,
        });
      } else {
        completeMutation.mutate(task);
      }
    } else {
      toggleMutation.mutate({ id: task.id, isCompleted: false });
    }
  };

  const handleDelete = (task: DailyTask) => {
    Alert.alert('Eliminar tarea', `¿Eliminar "${task.title}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(task.id),
      },
    ]);
  };

  const handleReorder = (orderedIds: string[]) => {
    if (sortField !== 'manual') {
      setSortField('manual');
      void saveSortPreference('manual', sortDirection, groupByTag);
    }
    reorderMutation.mutate(orderedIds);
  };

  // Render a single task row with drag handle, collaborator chips and edit trigger
  const renderTaskRow = (item: DailyTask, drag?: DragHandle, isLast?: boolean) => {
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
          onPress={() => {
            if (drag?.isActive) return;
            openEditTask(item);
          }}
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
          onPress={() => handleToggleFavorite(item)}
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
          onPress={() => handleConvertToBucket(item)}
          style={styles.convertQuickBtn}
          accessibilityLabel="Convertir en Bucket List"
        >
          <Sparkles size={13} color={gold[400]} strokeWidth={1.8} />
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

  // Render a completed task row from daily_tasks (fully editable as a quick task)
  const renderCompletedRow = (item: DailyTask, isLast?: boolean) => {
    return renderTaskRow(item, undefined, isLast);
  };

  const handleRescheduleTask = (task: DailyTask, targetDateStr: string) => {
    updateMutation.mutate({
      id: task.id,
      updates: { due_date: targetDateStr },
    });
  };

  // Render an overdue task row with drag handle and quick week day reschedule buttons
  const renderOverdueTaskRow = (item: DailyTask, drag?: DragHandle, isLast?: boolean) => {
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
          {/* Drag handle (shown in manual mode; dragging also works anywhere on the row by holding down) */}
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
            onPress={() => handleToggle(item)}
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
              openEditTask(item);
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
                <Text style={styles.overdueBadgeText}>
                  {dateBadge.text}
                </Text>
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
                      style={[
                        styles.tagChipText,
                        { color: tag.color || '#DDD' },
                      ]}
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

          {/* Convert to Bucket List quick button */}
          {/* Favorite quick toggle */}
          <Pressable
            hitSlop={8}
            onPress={() => handleToggleFavorite(item)}
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
            onPress={() => handleConvertToBucket(item)}
            style={styles.convertQuickBtn}
            accessibilityLabel="Convertir en Bucket List"
          >
            <Sparkles size={13} color={gold[400]} strokeWidth={1.8} />
          </Pressable>

          {/* Edit & Delete actions */}
          <Pressable
            hitSlop={8}
            onPress={() => openEditTask(item)}
            style={styles.actionBtn}
            accessibilityLabel="Editar tarea"
          >
            <Pencil size={14} color="#666" strokeWidth={1.8} />
          </Pressable>
          <Pressable
            hitSlop={8}
            onPress={() => handleDelete(item)}
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
                onPress={() => handleRescheduleTask(item, d.dateStr)}
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
              onPress={() => {
                setRescheduleTask(item);
                setShowRescheduleDatePicker(true);
              }}
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
  };

  const renderGroupedTasks = (groups: { id: string; tag: DailyTag | null; tasks: DailyTask[] }[]) => {
    return (
      <View style={styles.tagGroupsContainer}>
        {groups.map((grp) => (
          <View key={grp.id} style={styles.tagGroupBlock}>
            <View style={styles.tagGroupHeader}>
              <View
                style={[
                  styles.tagGroupDot,
                  { backgroundColor: grp.tag?.color || '#888' },
                ]}
              />
              <Text style={styles.tagGroupTitle}>
                {grp.tag ? `${grp.tag.emoji ? grp.tag.emoji + ' ' : ''}${grp.tag.name}` : 'Sin etiqueta'}
              </Text>
              <View style={styles.tagGroupBadge}>
                <Text style={styles.tagGroupBadgeText}>{grp.tasks.length}</Text>
              </View>
            </View>
            <View style={styles.compactListCard}>
              <DraggableTaskList
                items={grp.tasks}
                gap={0}
                renderItem={(task, drag) =>
                  renderTaskRow(task, drag, grp.tasks.indexOf(task) === grp.tasks.length - 1)
                }
                onReorder={handleReorder}
                onDraggingChange={handleDraggingChange}
              />
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderOverdueSection = () => {
    if (sortedOverdueTasks.length === 0) return null;

    return (
      <View style={styles.overdueSectionWrapper}>
        <View style={styles.overdueSectionHeader}>
          <View style={styles.overdueSectionHeaderLeft}>
            <View style={styles.overdueIconCircle}>
              <AlertCircle size={15} color="#F59E0B" strokeWidth={2.4} />
            </View>
            <Text style={styles.overdueSectionTitle}>
              Atrasadas ({sortedOverdueTasks.length})
            </Text>
          </View>
          <Text style={styles.overdueSectionHint}>
            Pasa a hoy o reprograma
          </Text>
        </View>

        <View style={styles.overdueListCard}>
          <DraggableTaskList
            items={sortedOverdueTasks}
            gap={0}
            renderItem={(item, drag) =>
              renderOverdueTaskRow(
                item,
                drag,
                sortedOverdueTasks.indexOf(item) === sortedOverdueTasks.length - 1
              )
            }
            onReorder={handleReorder}
            onDraggingChange={handleDraggingChange}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <PageTitle gold="Día" rest="a día" />
          </View>
          <Text style={styles.subtitle}>
            Tus tareas personales. Organiza tu día a día con etiquetas, fechas y colaboradores.
          </Text>

          {/* Time View Switcher: Hoy | Semana | Calendario | Todas */}
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
              style={[styles.segmentedTab, timeView === 'calendar' && styles.segmentedTabActive]}
              onPress={() => setTimeView('calendar')}
            >
              <Text style={[styles.segmentedTabText, timeView === 'calendar' && styles.segmentedTabTextActive]}>
                Calendario
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
              placeholder="Añadir tarea rápida para hoy..."
              placeholderTextColor="#777"
              value={newTitle}
              onChangeText={setNewTitle}
              onSubmitEditing={handleQuickAddTask}
              returnKeyType="done"
            />

            {/* Quick add button */}
            <Pressable
              style={[styles.addBtn, !newTitle.trim() && styles.addBtnDisabled]}
              onPress={handleQuickAddTask}
              disabled={!newTitle.trim()}
              accessibilityLabel="Añadir tarea rápida"
            >
              <Plus size={18} color="#0E0E0E" strokeWidth={2.4} />
            </Pressable>
          </View>

          {/* Quick Filters Bar (Etiquetas, Pendientes, Completadas, Favoritas, Colaboradores) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsFilterScroll}
          >
            {/* Botón principal "Etiquetas" que abre el panel inferior de filtrado múltiple y edición */}
            <Pressable
              style={[
                styles.tagFilterPill,
                styles.tagFilterMainBtn,
                selectedTagFilters.length > 0 && styles.tagFilterMainBtnActive,
              ]}
              onPress={() => setShowTagFilterSheet(true)}
              accessibilityLabel="Gestionar y filtrar etiquetas"
            >
              <TagIcon
                size={13}
                color={selectedTagFilters.length > 0 ? '#0E0E0E' : gold[400]}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.tagFilterText,
                  styles.tagFilterMainBtnText,
                  selectedTagFilters.length > 0 && styles.tagFilterMainBtnTextActive,
                ]}
              >
                {selectedTagFilters.length > 0
                  ? `Etiquetas (${selectedTagFilters.length})`
                  : 'Etiquetas'}
              </Text>
            </Pressable>

            {/* Etiquetas activas individuales seleccionadas con icono/emoji y nombre */}
            {selectedTagFilters.map((id) => {
              const tag = tagMap.get(id);
              if (!tag) return null;
              return (
                <Pressable
                  key={tag.id}
                  style={[
                    styles.tagFilterPill,
                    {
                      borderColor: tag.color ? `${tag.color}88` : '#D4B13A',
                      backgroundColor: tag.color ? `${tag.color}22` : '#2C2512',
                    },
                  ]}
                  onPress={() => {
                    setSelectedTagFilters((prev) => prev.filter((tid) => tid !== tag.id));
                  }}
                  accessibilityLabel={`Quitar filtro ${tag.name}`}
                >
                  {tag.emoji ? (
                    <Text style={{ fontSize: 11 }}>{tag.emoji}</Text>
                  ) : (
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: tag.color || '#D4B13A',
                      }}
                    />
                  )}
                  <Text style={[styles.tagFilterText, { color: tag.color || gold[400], fontWeight: '600' }]}>
                    {tag.name}
                  </Text>
                  <X size={10} color="#AAA" />
                </Pressable>
              );
            })}

            {/* Filtro rápido: Pendientes */}
            <Pressable
              style={[
                styles.tagFilterPill,
                statusFilter === 'pending' && styles.filterPillActive,
              ]}
              onPress={() => {
                setStatusFilter((prev) => (prev === 'pending' ? 'all' : 'pending'));
              }}
              accessibilityLabel="Filtrar por tareas pendientes"
            >
              <ListTodo
                size={12}
                color={statusFilter === 'pending' ? gold[400] : '#888'}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.tagFilterText,
                  statusFilter === 'pending' && styles.filterPillTextActive,
                ]}
              >
                Pendientes
              </Text>
            </Pressable>

            {/* Filtro rápido: Completadas */}
            <Pressable
              style={[
                styles.tagFilterPill,
                statusFilter === 'completed' && styles.filterPillActive,
              ]}
              onPress={() => {
                setStatusFilter((prev) => (prev === 'completed' ? 'all' : 'completed'));
              }}
              accessibilityLabel="Filtrar por tareas completadas"
            >
              <CheckCircle2
                size={12}
                color={statusFilter === 'completed' ? '#34C759' : '#888'}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.tagFilterText,
                  statusFilter === 'completed' && styles.filterPillTextActive,
                ]}
              >
                Completadas
              </Text>
            </Pressable>

            {/* Filtro rápido: Favoritas */}
            <Pressable
              style={[
                styles.tagFilterPill,
                onlyFavorites && styles.filterPillActive,
              ]}
              onPress={() => setOnlyFavorites((prev) => !prev)}
              accessibilityLabel="Filtrar por favoritas"
            >
              <Star
                size={12}
                color={onlyFavorites ? gold[400] : '#888'}
                fill={onlyFavorites ? gold[400] : 'transparent'}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.tagFilterText,
                  onlyFavorites && styles.filterPillTextActive,
                ]}
              >
                Favoritas{favoritesCount > 0 ? ` (${favoritesCount})` : ''}
              </Text>
            </Pressable>

            {/* Filtro rápido: Con colaboradores */}
            <Pressable
              style={[
                styles.tagFilterPill,
                onlyCollaborators && styles.filterPillActive,
              ]}
              onPress={() => setOnlyCollaborators((prev) => !prev)}
              accessibilityLabel="Filtrar tareas compartidas con colaboradores"
            >
              <Users
                size={12}
                color={onlyCollaborators ? gold[400] : '#888'}
                strokeWidth={2}
              />
              <Text
                style={[
                  styles.tagFilterText,
                  onlyCollaborators && styles.filterPillTextActive,
                ]}
              >
                Colaboradores
              </Text>
            </Pressable>

            {/* Botón rápido para limpiar filtros activos */}
            {(statusFilter !== 'all' || onlyFavorites || priorityFilter !== 'all' || onlyCollaborators || selectedTagFilters.length > 0) && (
              <Pressable
                style={styles.clearFiltersPill}
                onPress={() => {
                  setStatusFilter('all');
                  setOnlyFavorites(false);
                  setPriorityFilter('all');
                  setOnlyCollaborators(false);
                  setSelectedTagFilters([]);
                }}
                accessibilityLabel="Restablecer filtros"
              >
                <X size={11} color="#AAA" />
                <Text style={styles.clearFiltersPillText}>Limpiar</Text>
              </Pressable>
            )}
          </ScrollView>

          {/* Sub-toolbar: 'Todas' a la izquierda y 'Prioridad' a la derecha */}
          <View style={styles.toolbarRow}>
            {/* Izquierda: Botón Todas */}
            <Pressable
              style={[
                styles.statusChip,
                statusFilter === 'all' && styles.statusChipActive,
              ]}
              onPress={() => setStatusFilter('all')}
              accessibilityLabel="Ver todas las tareas"
            >
              <Text
                style={[
                  styles.statusChipText,
                  statusFilter === 'all' && styles.statusChipTextActive,
                ]}
              >
                Todas
              </Text>
            </Pressable>

            {/* Derecha: Botón Prioridad (abre opciones de ordenación y clasificación) */}
            <Pressable
              style={[
                styles.sortTriggerBtn,
                (sortField !== 'manual' || groupByTag) && styles.sortTriggerBtnActive,
              ]}
              onPress={() => setShowSortModal(true)}
              accessibilityLabel="Ordenar por prioridad y opciones"
            >
              <ArrowUpDown
                size={12}
                color={sortField !== 'manual' || groupByTag ? gold[400] : '#9E9E9E'}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  styles.sortTriggerText,
                  (sortField !== 'manual' || groupByTag) && styles.sortTriggerTextActive,
                ]}
              >
                {sortField === 'manual'
                  ? (groupByTag ? 'Etiquetas' : 'Prioridad')
                  : sortField === 'priority'
                  ? `Prioridad ${sortDirection === 'desc' ? '↓' : '↑'}`
                  : sortField === 'name'
                  ? `Nombre ${sortDirection === 'asc' ? 'A-Z' : 'Z-A'}`
                  : `Fecha ${sortDirection === 'asc' ? '↑' : '↓'}`}
              </Text>
              {(sortField !== 'manual' || groupByTag) && <View style={styles.sortActiveDot} />}
            </Pressable>
          </View>
        </View>

        {/* Content Area */}
        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          scrollEnabled={!dragging}
          refreshControl={
            <RefreshControl
              refreshing={manualRefreshing}
              onRefresh={handleRefresh}
              tintColor={gold[400]}
              colors={[gold[400]]}
            />
          }
          keyboardShouldPersistTaps="handled"
        >
          {isLoading && !tasks.length ? (
            <View style={{ gap: 8, paddingVertical: 12 }}>
              <TaskCompactSkeleton />
              <TaskCompactSkeleton />
              <TaskCompactSkeleton />
            </View>
          ) : timeView === 'today' && statusFilter === 'completed' ? (
            <>
              {completedList.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <View style={styles.emptyIconCircle}>
                    <CheckCircle2 size={32} color="#34C759" strokeWidth={1.8} />
                  </View>
                  <Typography variant="bodySemibold" style={styles.emptyTitle}>
                    No hay tareas completadas
                  </Typography>
                  <Typography variant="caption" color="textSecondary" style={styles.emptySubtitle}>
                    Las tareas que completes hoy aparecerán aquí.
                  </Typography>
                </View>
              ) : (
                <View style={styles.compactListCard}>
                  {completedList.map((item, idx) =>
                    renderCompletedRow(item, idx === completedList.length - 1)
                  )}
                </View>
              )}
            </>
          ) : (
            <>
              {/* 1. TODAY VIEW */}
              {timeView === 'today' && (
                <>
                  {/* Overdue tasks section above Today */}
                  {renderOverdueSection()}

                  {todayTasks.length === 0 ? (
                    completedList.length === 0 && sortedOverdueTasks.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconCircle}>
                          <ListTodo size={32} color={gold[400]} strokeWidth={1.8} />
                        </View>
                        <Typography variant="bodySemibold" style={styles.emptyTitle}>
                          ¡Todo listo por hoy!
                        </Typography>
                        <Typography variant="caption" color="textSecondary" style={styles.emptySubtitle}>
                          Añade una tarea con el botón + abajo o arriba para organizar tu día.
                        </Typography>
                      </View>
                    ) : null
                  ) : groupByTag ? (
                    renderGroupedTasks(todayTagGroups)
                  ) : (
                    <View style={styles.compactListCard}>
                      <DraggableTaskList
                        items={sortedTodayTasks}
                        gap={0}
                        renderItem={(item, drag) =>
                          renderTaskRow(item, drag, sortedTodayTasks.indexOf(item) === sortedTodayTasks.length - 1)
                        }
                        onReorder={handleReorder}
                        onDraggingChange={handleDraggingChange}
                      />
                    </View>
                  )}

                  {/* Completed today section underneath Today's list */}
                  {statusFilter === 'all' && completedList.length > 0 && (
                    <View style={styles.completedSectionWrapper}>
                      <View style={styles.completedSectionHeader}>
                        <CheckCircle2 size={14} color="#34C759" />
                        <Text style={styles.completedSectionTitle}>
                          Completadas hoy ({completedList.length})
                        </Text>
                      </View>
                      <View style={styles.compactListCard}>
                        {completedList.map((item, idx) =>
                          renderCompletedRow(item, idx === completedList.length - 1)
                        )}
                      </View>
                    </View>
                  )}
                </>
              )}

              {/* 2. WEEK VIEW (Multi-week support + week navigation) */}
              {timeView === 'week' && (
                <View style={styles.weekContainer}>
                  {/* Overdue tasks section at top of week view */}
                  {renderOverdueSection()}

                  {/* Week Navigation Controls */}
                  <View style={styles.weekNavigationCard}>
                    <View style={styles.weekNavRow}>
                      <Pressable
                        style={[styles.weekNavBtn, weekOffset <= 0 && { opacity: 0.25 }]}
                        onPress={() => setWeekOffset((prev) => Math.max(0, prev - 1))}
                        disabled={weekOffset <= 0}
                        hitSlop={8}
                        accessibilityLabel="Semana anterior"
                      >
                        <ChevronLeft size={18} color={weekOffset <= 0 ? '#555' : '#AAA'} />
                      </Pressable>

                      <View style={styles.weekNavCenter}>
                        <Text style={styles.weekNavTitle}>
                          {weeksToShow === 1
                            ? displayedWeeks[0]?.weekLabel
                            : `${weeksToShow} semanas (${format(displayedWeeks[0]?.monday || new Date(), 'd MMM', { locale: es })} – ${format(displayedWeeks[displayedWeeks.length - 1]?.sunday || new Date(), 'd MMM', { locale: es })})`}
                        </Text>
                        {weekOffset > 0 && (
                          <Pressable
                            style={styles.weekNavTodayBadge}
                            onPress={() => setWeekOffset(0)}
                          >
                            <Text style={styles.weekNavTodayText}>Volver a hoy</Text>
                          </Pressable>
                        )}
                      </View>

                      <Pressable
                        style={styles.weekNavBtn}
                        onPress={() => setWeekOffset((prev) => prev + 1)}
                        hitSlop={8}
                        accessibilityLabel="Semana siguiente"
                      >
                        <ChevronRight size={18} color="#AAA" />
                      </Pressable>
                    </View>

                    {/* Week Count Selector (1 sem | 2 sem | 3 sem | 4 sem) */}
                    <View style={styles.weekSpanSelector}>
                      <Text style={styles.weekSpanLabel}>Mostrar:</Text>
                      {[1, 2, 3, 4].map((n) => (
                        <Pressable
                          key={n}
                          style={[
                            styles.weekSpanPill,
                            weeksToShow === n && styles.weekSpanPillActive,
                          ]}
                          onPress={() => setWeeksToShow(n)}
                        >
                          <Text
                            style={[
                              styles.weekSpanPillText,
                              weeksToShow === n && styles.weekSpanPillTextActive,
                            ]}
                          >
                            {n} {n === 1 ? 'sem' : 'sems'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Render Weeks and their days */}
                  {displayedWeeks.map((wk) => (
                    <View key={`week-${wk.weekIndex}-${wk.days[0]?.dateStr || wk.weekIndex}`} style={styles.weekBlock}>
                      {weeksToShow > 1 && (
                        <View style={styles.multiWeekDivider}>
                          <Text style={styles.multiWeekTitle}>{wk.weekLabel.toUpperCase()}</Text>
                        </View>
                      )}

                      {wk.days.map((day) => {
                        const rawDayTasks = filteredByTagAndStatus.filter((t) => {
                          const taskDate = t.due_date || todayStr;
                          return taskDate === day.dateStr;
                        });
                        const dayTasks = sortTasks(rawDayTasks);

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
                                onPress={() => handleOpenCreateTask(day.dateStr)}
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
                                  onDraggingChange={handleDraggingChange}
                                />
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              )}

              {/* 3. CALENDAR VIEW */}
              {timeView === 'calendar' && (
                <View style={styles.calendarContainer}>
                  {/* Calendar Navigation Card */}
                  <View style={styles.calendarCard}>
                    <View style={styles.calendarHeaderRow}>
                      <Pressable
                        style={styles.calendarNavBtn}
                        onPress={() => setCalendarMonth((prev) => subMonths(prev, 1))}
                        hitSlop={8}
                      >
                        <ChevronLeft size={20} color="#AAA" />
                      </Pressable>

                      <View style={{ alignItems: 'center' }}>
                        <Text style={styles.calendarMonthTitle}>
                          {calendarGrid.monthLabel.toUpperCase()}
                        </Text>
                        {!isSameMonth(calendarMonth, new Date()) && (
                          <Pressable
                            style={styles.calendarTodayBadge}
                            onPress={() => {
                              const now = new Date();
                              setCalendarMonth(now);
                              setSelectedCalendarDate(now);
                            }}
                          >
                            <Text style={styles.calendarTodayText}>Este mes</Text>
                          </Pressable>
                        )}
                      </View>

                      <Pressable
                        style={styles.calendarNavBtn}
                        onPress={() => setCalendarMonth((prev) => addMonths(prev, 1))}
                        hitSlop={8}
                      >
                        <ChevronRight size={20} color="#AAA" />
                      </Pressable>
                    </View>

                    {/* Day of Week Headers */}
                    <View style={styles.calendarDaysOfWeekRow}>
                      {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, idx) => (
                        <Text key={idx} style={styles.calendarDayOfWeekText}>
                          {d}
                        </Text>
                      ))}
                    </View>

                    {/* Calendar Grid */}
                    <View style={styles.calendarGrid}>
                      {calendarGrid.days.map((cell) => {
                        return (
                          <Pressable
                            key={cell.dateStr}
                            style={[
                              styles.calendarDayCell,
                              cell.isSelected && styles.calendarDayCellSelected,
                              cell.isToday && styles.calendarDayCellToday,
                            ]}
                            onPress={() => {
                              setSelectedCalendarDate(cell.date);
                              if (!cell.isCurrentMonth) {
                                setCalendarMonth(cell.date);
                              }
                            }}
                          >
                            <Text
                              style={[
                                styles.calendarDayNumber,
                                !cell.isCurrentMonth && styles.calendarDayNumberOutside,
                                cell.isToday && styles.calendarDayNumberToday,
                                cell.isSelected && styles.calendarDayNumberSelected,
                              ]}
                            >
                              {cell.dayNumber}
                            </Text>

                            {/* Task Dots */}
                            <View style={styles.calendarDotsRow}>
                              {cell.pendingCount > 0 && (
                                <View style={styles.calendarPendingDot} />
                              )}
                              {cell.completedCount > 0 && (
                                <View style={styles.calendarCompletedDot} />
                              )}
                            </View>

                            {/* Count Badge for multiple tasks */}
                            {cell.totalCount > 1 && (
                              <View style={styles.calendarCellCountBadge}>
                                <Text style={styles.calendarCellCountText}>{cell.totalCount}</Text>
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  {/* Selected Day Task List Details */}
                  <View style={styles.calendarDayDetailSection}>
                    <View style={styles.calendarDayDetailHeader}>
                      <View>
                        <Text style={styles.calendarDayDetailDate}>
                          {isToday(selectedCalendarDate) ? 'HOY · ' : ''}
                          {format(selectedCalendarDate, "EEEE, d 'de' MMMM", { locale: es }).toUpperCase()}
                        </Text>
                        <Text style={styles.calendarDayDetailSub}>
                          {selectedDateTasks.length}{' '}
                          {selectedDateTasks.length === 1 ? 'tarea programada' : 'tareas programadas'}
                        </Text>
                      </View>
                      <Pressable
                        style={styles.calendarDayAddBtn}
                        onPress={() => handleOpenCreateTask(toDateString(selectedCalendarDate))}
                      >
                        <Plus size={14} color="#0E0E0E" strokeWidth={2.5} />
                        <Text style={styles.calendarDayAddBtnText}>Añadir</Text>
                      </Pressable>
                    </View>

                    {sortedSelectedDateTasks.length === 0 ? (
                      <View style={styles.weekDayEmpty}>
                        <Text style={styles.weekDayEmptyText}>
                          Sin tareas para este día. ¡Pulsa + Añadir para crear una!
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.compactListCard}>
                        <DraggableTaskList
                          items={sortedSelectedDateTasks}
                          gap={0}
                          renderItem={(item, drag) =>
                            renderTaskRow(
                              item,
                              drag,
                              sortedSelectedDateTasks.indexOf(item) === sortedSelectedDateTasks.length - 1
                            )
                          }
                          onReorder={handleReorder}
                          onDraggingChange={handleDraggingChange}
                        />
                      </View>
                    )}

                    {/* Completed tasks for selected date */}
                    {selectedDateCompleted.length > 0 && (
                      <View style={styles.completedSectionWrapper}>
                        <View style={styles.completedSectionHeader}>
                          <CheckCircle2 size={14} color="#34C759" />
                          <Text style={styles.completedSectionTitle}>
                            Completadas ({selectedDateCompleted.length})
                          </Text>
                        </View>
                        <View style={styles.compactListCard}>
                          {selectedDateCompleted.map((item, idx) =>
                            renderCompletedRow(item, idx === selectedDateCompleted.length - 1)
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* 4. ALL VIEW */}
              {timeView === 'all' && (
                <>
                  {sortedAllTasks.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <View style={styles.emptyIconCircle}>
                        <ListTodo size={32} color={gold[400]} strokeWidth={1.8} />
                      </View>
                      <Typography variant="bodySemibold" style={styles.emptyTitle}>
                        No hay tareas
                      </Typography>
                      <Typography variant="caption" color="textSecondary" style={styles.emptySubtitle}>
                        Crea una tarea con el botón + abajo o arriba para comenzar.
                      </Typography>
                    </View>
                  ) : groupByTag ? (
                    renderGroupedTasks(allTagGroups)
                  ) : (
                    <View style={styles.compactListCard}>
                      <DraggableTaskList
                        items={sortedAllTasks}
                        gap={0}
                        renderItem={(item, drag) =>
                          renderTaskRow(
                            item,
                            drag,
                            sortedAllTasks.indexOf(item) === sortedAllTasks.length - 1
                          )
                        }
                        onReorder={handleReorder}
                        onDraggingChange={handleDraggingChange}
                      />
                    </View>
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>

        {/* ── FLOATING ACTION BUTTON (FAB) — Igual que en el Bucket List ── */}
        <FAB
          onPress={() => handleOpenCreateTask()}
          bottomOffset={Platform.OS === 'ios' ? 24 : 20}
          accessibilityLabel="Añadir nueva tarea diaria"
        />

        {/* ========================================================================= */}
        {/* MODAL 1: Create Task Modal                                               */}
        {/* ========================================================================= */}
        {showCreateModal && (
          <Modal
            transparent
            animationType="fade"
            visible={showCreateModal}
            onRequestClose={() => setShowCreateModal(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalOverlay}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowCreateModal(false)} />
              <View style={styles.fullModalCard}>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.modalTitle}>Nueva tarea</Text>
                    <Pressable
                      onPress={() => setCreateIsFavorite((prev) => !prev)}
                      hitSlop={8}
                      style={{ padding: 4 }}
                      accessibilityLabel="Marcar como favorita"
                    >
                      <Star
                        size={18}
                        color={createIsFavorite ? gold[400] : '#666'}
                        fill={createIsFavorite ? gold[400] : 'transparent'}
                      />
                    </Pressable>
                  </View>
                  <Pressable onPress={() => setShowCreateModal(false)} hitSlop={10}>
                    <X size={20} color="#888" />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
                  {/* Título */}
                  <Text style={styles.fieldLabel}>Título *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="¿Qué necesitas hacer?"
                    placeholderTextColor="#666"
                    value={createTitle}
                    onChangeText={setCreateTitle}
                    autoFocus
                  />

                  {/* Fecha */}
                  <Text style={styles.fieldLabel}>Fecha</Text>
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
                        createDueDate === toDateString(addDays(new Date(), 1)) &&
                          styles.modalPresetBtnActive,
                      ]}
                      onPress={() => setCreateDueDate(toDateString(addDays(new Date(), 1)))}
                    >
                      <Text
                        style={[
                          styles.modalPresetText,
                          createDueDate === toDateString(addDays(new Date(), 1)) &&
                            styles.modalPresetTextActive,
                        ]}
                      >
                        Mañana
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.modalPresetBtn,
                        createDueDate === toDateString(addDays(new Date(), 7)) &&
                          styles.modalPresetBtnActive,
                      ]}
                      onPress={() => setCreateDueDate(toDateString(addDays(new Date(), 7)))}
                    >
                      <Text
                        style={[
                          styles.modalPresetText,
                          createDueDate === toDateString(addDays(new Date(), 7)) &&
                            styles.modalPresetTextActive,
                        ]}
                      >
                        +7 días
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={styles.datePickerTrigger}
                    onPress={() => setShowCreateDatePicker(true)}
                  >
                    <Calendar size={16} color={gold[400]} />
                    <Text style={styles.datePickerTriggerText}>
                      {format(parseLocalDate(createDueDate), "EEEE, d 'de' MMMM", { locale: es })}
                    </Text>
                  </Pressable>

                  {/* Recurrencia */}
                  {renderRecurrenceSelector(true)}

                  {/* Prioridad */}
                  <Text style={styles.fieldLabel}>Prioridad</Text>
                  <View style={styles.prioritySelectorRow}>
                    {PRIORITY_ORDER.map((p) => {
                      const cfg = PRIORITY_CONFIG[p];
                      const isSelected = createPriority === p;
                      return (
                        <Pressable
                          key={p}
                          style={[
                            styles.prioritySelectorPill,
                            isSelected && {
                              backgroundColor: cfg.bgColor,
                              borderColor: cfg.borderColor,
                            },
                          ]}
                          onPress={() => setCreatePriority(p)}
                        >
                          <Flag
                            size={12}
                            color={isSelected ? cfg.color : '#777'}
                            strokeWidth={isSelected ? 2.5 : 1.8}
                          />
                          <Text
                            style={[
                              styles.prioritySelectorPillText,
                              isSelected && { color: cfg.color, fontFamily: 'Inter_600SemiBold' },
                            ]}
                          >
                            {cfg.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Etiquetas */}
                  <Text style={styles.fieldLabel}>Etiquetas</Text>
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
                              backgroundColor: tag.color ? `${tag.color}2A` : '#262012',
                            },
                          ]}
                          onPress={() => {
                            setCreateTagIds((prev) =>
                              isSelected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                            );
                          }}
                        >
                          {tag.emoji && <Text style={{ fontSize: 11, marginRight: 4 }}>{tag.emoji}</Text>}
                          <Text
                            style={[
                              styles.tagToggleText,
                              isSelected && { color: tag.color || gold[400], fontFamily: 'Inter_600SemiBold' },
                            ]}
                          >
                            {tag.name}
                          </Text>
                        </Pressable>
                      );
                    })}

                    <Pressable
                      style={styles.addTagPill}
                      onPress={() => openCreateTag('create')}
                    >
                      <Plus size={12} color={gold[400]} />
                      <Text style={styles.addTagPillText}>Crear</Text>
                    </Pressable>
                  </View>

                  {/* SUBTAREAS */}
                  <View style={styles.subtasksHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <ListChecks size={15} color={gold[400]} />
                      <Text style={styles.fieldLabelNoMargin}>Subtareas</Text>
                    </View>
                    {createSubtasks.length > 0 && (
                      <View style={styles.subtasksCounterBadge}>
                        <Text style={styles.subtasksCounterBadgeText}>
                          {createSubtasks.filter((s) => s.is_completed).length}/{createSubtasks.length}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Lista de subtareas en creación */}
                  {createSubtasks.length > 0 && (
                    <View style={styles.subtasksContainer}>
                      {createSubtasks.map((st) => (
                        <View key={st.id} style={styles.subtaskItemRow}>
                          <Pressable
                            hitSlop={6}
                            onPress={() => handleToggleCreateSubtask(st.id)}
                            style={styles.subtaskCheckBtn}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: st.is_completed }}
                          >
                            {st.is_completed ? (
                              <CheckCircle2 size={17} color="#34C759" />
                            ) : (
                              <View style={styles.subtaskUncheckedCircle} />
                            )}
                          </Pressable>
                          <Text
                            style={[
                              styles.subtaskItemTitle,
                              st.is_completed && styles.subtaskItemTitleCompleted,
                            ]}
                            numberOfLines={2}
                          >
                            {st.title}
                          </Text>
                          <Pressable
                            hitSlop={8}
                            onPress={() => handleDeleteCreateSubtask(st.id)}
                            style={styles.subtaskDeleteBtn}
                            accessibilityLabel="Eliminar subtarea"
                          >
                            <X size={14} color="#666" />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Input para añadir subtarea */}
                  <View style={styles.addSubtaskInputWrapper}>
                    <TextInput
                      style={styles.addSubtaskInput}
                      placeholder="Añadir una subtarea..."
                      placeholderTextColor="#666"
                      value={createSubtaskTitle}
                      onChangeText={setCreateSubtaskTitle}
                      onSubmitEditing={handleAddCreateSubtask}
                      returnKeyType="done"
                    />
                    <Pressable
                      style={[
                        styles.addSubtaskActionBtn,
                        !createSubtaskTitle.trim() && styles.addSubtaskActionBtnDisabled,
                      ]}
                      onPress={handleAddCreateSubtask}
                      disabled={!createSubtaskTitle.trim()}
                      accessibilityLabel="Crear subtarea"
                    >
                      <Plus size={16} color={createSubtaskTitle.trim() ? '#0E0E0E' : '#555'} strokeWidth={2.5} />
                    </Pressable>
                  </View>

                  {/* Notas */}
                  <Text style={styles.fieldLabel}>Notas (opcional)</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    placeholder="Detalles, enlaces, apuntes..."
                    placeholderTextColor="#666"
                    value={createDescription}
                    onChangeText={setCreateDescription}
                    multiline
                    numberOfLines={3}
                  />

                  {/* COLABORADORES */}
                  <View style={styles.collabSectionHeader}>
                    <Text style={styles.fieldLabel}>Colaboradores</Text>
                    {createCollaborators.length > 0 && (
                      <Text style={styles.collabCountText}>({createCollaborators.length})</Text>
                    )}
                  </View>

                  <Pressable
                    style={styles.collaboratorRow}
                    onPress={() => {
                      setCollaboratorPickerTarget('create');
                      setShowCollaboratorPicker(true);
                    }}
                  >
                    <Users color="#D4B13A" size={18} />
                    <Text style={styles.collaboratorPlaceholder} numberOfLines={1}>
                      {createCollaborators.length === 0
                        ? 'Mencionar a personas colaboradoras...'
                        : `${createCollaborators.length} colaborador${createCollaborators.length > 1 ? 'es' : ''} añadido${createCollaborators.length > 1 ? 's' : ''}`}
                    </Text>
                    <Plus color="#D4B13A" size={18} />
                  </Pressable>

                  {createCollaborators.length > 0 && (
                    <View style={styles.collaboratorChips}>
                      {createCollaborators.map((c) => (
                        <Pressable
                          key={c.id}
                          style={styles.collaboratorChip}
                          onPress={() =>
                            setCreateCollaborators((prev) => prev.filter((x) => x.id !== c.id))
                          }
                        >
                          <Text style={styles.collaboratorChipText}>
                            {c.display_name || `@${c.username}`}
                          </Text>
                          <X color="#D4B13A" size={13} />
                        </Pressable>
                      ))}
                    </View>
                  )}
                </ScrollView>

                {/* Footer Buttons */}
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
                    <Text style={styles.modalSubmitBtnText}>Crear tarea</Text>
                  </Pressable>
                </View>
              </View>
              {showTagModal && renderTagFormModal(true)}
            </KeyboardAvoidingView>
          </Modal>
        )}

        {/* DateTimePicker for Create Modal */}
        {showCreateDatePicker && (
          <DateTimePicker
            value={parseLocalDate(createDueDate)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowCreateDatePicker(false);
              if (selectedDate) {
                setCreateDueDate(toDateString(selectedDate));
              }
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: Full Edit Task Modal                                             */}
        {/* ========================================================================= */}
        {editingTask && (
          <Modal
            transparent
            animationType="fade"
            visible={!!editingTask}
            onRequestClose={() => setEditingTask(null)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.modalOverlay}
            >
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditingTask(null)} />
              <View style={styles.fullModalCard}>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.modalTitle}>Editar tarea</Text>
                    <Pressable
                      onPress={() => setEditIsFavorite((prev) => !prev)}
                      hitSlop={8}
                      style={{ padding: 4 }}
                      accessibilityLabel="Marcar como favorita"
                    >
                      <Star
                        size={18}
                        color={editIsFavorite ? gold[400] : '#666'}
                        fill={editIsFavorite ? gold[400] : 'transparent'}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => setEditIsCompleted((prev) => !prev)}
                      hitSlop={6}
                      style={[
                        styles.editStatusPill,
                        editIsCompleted && styles.editStatusPillCompleted,
                      ]}
                      accessibilityLabel="Cambiar estado completada o pendiente"
                    >
                      {editIsCompleted ? (
                        <>
                          <CheckCircle2 size={13} color="#34C759" />
                          <Text style={styles.editStatusPillTextCompleted}>Completada</Text>
                        </>
                      ) : (
                        <>
                          <Circle size={13} color="#888" />
                          <Text style={styles.editStatusPillText}>Pendiente</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                  <Pressable onPress={() => setEditingTask(null)} hitSlop={10}>
                    <X size={20} color="#888" />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
                  {/* Título */}
                  <Text style={styles.fieldLabel}>Título *</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Título de la tarea"
                    placeholderTextColor="#666"
                    value={editTitle}
                    onChangeText={setEditTitle}
                  />

                  {/* Fecha */}
                  <Text style={styles.fieldLabel}>Fecha</Text>
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
                        editDueDate === toDateString(addDays(new Date(), 1)) &&
                          styles.modalPresetBtnActive,
                      ]}
                      onPress={() => setEditDueDate(toDateString(addDays(new Date(), 1)))}
                    >
                      <Text
                        style={[
                          styles.modalPresetText,
                          editDueDate === toDateString(addDays(new Date(), 1)) &&
                            styles.modalPresetTextActive,
                        ]}
                      >
                        Mañana
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[
                        styles.modalPresetBtn,
                        editDueDate === toDateString(addDays(new Date(), 7)) &&
                          styles.modalPresetBtnActive,
                      ]}
                      onPress={() => setEditDueDate(toDateString(addDays(new Date(), 7)))}
                    >
                      <Text
                        style={[
                          styles.modalPresetText,
                          editDueDate === toDateString(addDays(new Date(), 7)) &&
                            styles.modalPresetTextActive,
                        ]}
                      >
                        +7 días
                      </Text>
                    </Pressable>
                  </View>

                  <Pressable
                    style={styles.datePickerTrigger}
                    onPress={() => setShowEditDatePicker(true)}
                  >
                    <Calendar size={16} color={gold[400]} />
                    <Text style={styles.datePickerTriggerText}>
                      {format(parseLocalDate(editDueDate), "EEEE, d 'de' MMMM", { locale: es })}
                    </Text>
                  </Pressable>

                  {/* Recurrencia */}
                  {renderRecurrenceSelector(false)}

                  {/* Prioridad */}
                  <Text style={styles.fieldLabel}>Prioridad</Text>
                  <View style={styles.prioritySelectorRow}>
                    {PRIORITY_ORDER.map((p) => {
                      const cfg = PRIORITY_CONFIG[p];
                      const isSelected = editPriority === p;
                      return (
                        <Pressable
                          key={p}
                          style={[
                            styles.prioritySelectorPill,
                            isSelected && {
                              backgroundColor: cfg.bgColor,
                              borderColor: cfg.borderColor,
                            },
                          ]}
                          onPress={() => setEditPriority(p)}
                        >
                          <Flag
                            size={12}
                            color={isSelected ? cfg.color : '#777'}
                            strokeWidth={isSelected ? 2.5 : 1.8}
                          />
                          <Text
                            style={[
                              styles.prioritySelectorPillText,
                              isSelected && { color: cfg.color, fontFamily: 'Inter_600SemiBold' },
                            ]}
                          >
                            {cfg.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* Etiquetas */}
                  <Text style={styles.fieldLabel}>Etiquetas</Text>
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
                              backgroundColor: tag.color ? `${tag.color}2A` : '#262012',
                            },
                          ]}
                          onPress={() => {
                            setEditTagIds((prev) =>
                              isSelected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                            );
                          }}
                        >
                          {tag.emoji && <Text style={{ fontSize: 11, marginRight: 4 }}>{tag.emoji}</Text>}
                          <Text
                            style={[
                              styles.tagToggleText,
                              isSelected && { color: tag.color || gold[400], fontFamily: 'Inter_600SemiBold' },
                            ]}
                          >
                            {tag.name}
                          </Text>
                        </Pressable>
                      );
                    })}

                    <Pressable
                      style={styles.addTagPill}
                      onPress={() => openCreateTag('edit')}
                    >
                      <Plus size={12} color={gold[400]} />
                      <Text style={styles.addTagPillText}>Crear</Text>
                    </Pressable>
                  </View>

                  {/* SUBTAREAS */}
                  <View style={styles.subtasksHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <ListChecks size={15} color={gold[400]} />
                      <Text style={styles.fieldLabelNoMargin}>Subtareas</Text>
                    </View>
                    {editSubtasks.length > 0 && (
                      <View style={styles.subtasksCounterBadge}>
                        <Text style={styles.subtasksCounterBadgeText}>
                          {editSubtasks.filter((s) => s.is_completed).length}/{editSubtasks.length}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Lista de subtareas en edición */}
                  {editSubtasks.length > 0 && (
                    <View style={styles.subtasksContainer}>
                      {editSubtasks.map((st) => (
                        <View key={st.id} style={styles.subtaskItemRow}>
                          <Pressable
                            hitSlop={6}
                            onPress={() => handleToggleEditSubtask(st.id)}
                            style={styles.subtaskCheckBtn}
                            accessibilityRole="checkbox"
                            accessibilityState={{ checked: st.is_completed }}
                          >
                            {st.is_completed ? (
                              <CheckCircle2 size={17} color="#34C759" />
                            ) : (
                              <View style={styles.subtaskUncheckedCircle} />
                            )}
                          </Pressable>
                          <Text
                            style={[
                              styles.subtaskItemTitle,
                              st.is_completed && styles.subtaskItemTitleCompleted,
                            ]}
                            numberOfLines={2}
                          >
                            {st.title}
                          </Text>
                          <Pressable
                            hitSlop={8}
                            onPress={() => handleDeleteEditSubtask(st.id)}
                            style={styles.subtaskDeleteBtn}
                            accessibilityLabel="Eliminar subtarea"
                          >
                            <X size={14} color="#666" />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Input para añadir subtarea */}
                  <View style={styles.addSubtaskInputWrapper}>
                    <TextInput
                      style={styles.addSubtaskInput}
                      placeholder="Añadir una subtarea..."
                      placeholderTextColor="#666"
                      value={editSubtaskTitle}
                      onChangeText={setEditSubtaskTitle}
                      onSubmitEditing={handleAddEditSubtask}
                      returnKeyType="done"
                    />
                    <Pressable
                      style={[
                        styles.addSubtaskActionBtn,
                        !editSubtaskTitle.trim() && styles.addSubtaskActionBtnDisabled,
                      ]}
                      onPress={handleAddEditSubtask}
                      disabled={!editSubtaskTitle.trim()}
                      accessibilityLabel="Crear subtarea"
                    >
                      <Plus size={16} color={editSubtaskTitle.trim() ? '#0E0E0E' : '#555'} strokeWidth={2.5} />
                    </Pressable>
                  </View>

                  {/* Notas */}
                  <Text style={styles.fieldLabel}>Notas (opcional)</Text>
                  <TextInput
                    style={[styles.modalInput, styles.modalTextArea]}
                    placeholder="Detalles, notas, apuntes..."
                    placeholderTextColor="#666"
                    value={editDescription}
                    onChangeText={setEditDescription}
                    multiline
                    numberOfLines={3}
                  />

                  {/* COLABORADORES */}
                  <View style={styles.collabSectionHeader}>
                    <Text style={styles.fieldLabel}>Colaboradores</Text>
                    {editCollaborators.length > 0 && (
                      <Text style={styles.collabCountText}>({editCollaborators.length})</Text>
                    )}
                  </View>

                  <Pressable
                    style={styles.collaboratorRow}
                    onPress={() => {
                      setCollaboratorPickerTarget('edit');
                      setShowCollaboratorPicker(true);
                    }}
                  >
                    <Users color="#D4B13A" size={18} />
                    <Text style={styles.collaboratorPlaceholder} numberOfLines={1}>
                      {editCollaborators.length === 0
                        ? 'Mencionar a personas colaboradoras...'
                        : `${editCollaborators.length} colaborador${editCollaborators.length > 1 ? 'es' : ''} añadido${editCollaborators.length > 1 ? 's' : ''}`}
                    </Text>
                    <Plus color="#D4B13A" size={18} />
                  </Pressable>

                  {editCollaborators.length > 0 && (
                    <View style={styles.collaboratorChips}>
                      {editCollaborators.map((c) => (
                        <Pressable
                          key={c.id}
                          style={styles.collaboratorChip}
                          onPress={() =>
                            setEditCollaborators((prev) => prev.filter((x) => x.id !== c.id))
                          }
                        >
                          <Text style={styles.collaboratorChipText}>
                            {c.display_name || `@${c.username}`}
                          </Text>
                          <X color="#D4B13A" size={13} />
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {/* Convertir en Bucket List Option */}
                  <Pressable
                    style={styles.convertBucketCard}
                    onPress={() => handleConvertToBucket(editingTask)}
                  >
                    <View style={styles.convertBucketLeft}>
                      <View style={styles.convertBucketIconCircle}>
                        <Sparkles size={16} color={gold[400]} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.convertBucketTitle}>Convertir en Bucket List</Text>
                        <Text style={styles.convertBucketSubtitle}>
                          Pasa esta tarea rápida a tu lista de metas y objetivos
                        </Text>
                      </View>
                    </View>
                    <BookmarkPlus size={18} color={gold[400]} />
                  </Pressable>
                </ScrollView>

                {/* Footer Buttons */}
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
                    onPress={handleSaveEditModal}
                  >
                    <Text style={styles.modalSubmitBtnText}>Guardar</Text>
                  </Pressable>
                </View>
              </View>
              {showTagModal && renderTagFormModal(true)}
            </KeyboardAvoidingView>
          </Modal>
        )}

        {/* DateTimePicker for Edit Modal */}
        {showEditDatePicker && (
          <DateTimePicker
            value={parseLocalDate(editDueDate)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowEditDatePicker(false);
              if (selectedDate) {
                setEditDueDate(toDateString(selectedDate));
              }
            }}
          />
        )}

        {/* DateTimePicker for Overdue Reschedule */}
        {showRescheduleDatePicker && rescheduleTask && (
          <DateTimePicker
            value={parseLocalDate(rescheduleTask.due_date || todayStr)}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, selectedDate) => {
              setShowRescheduleDatePicker(false);
              if (selectedDate && rescheduleTask) {
                handleRescheduleTask(rescheduleTask, toDateString(selectedDate));
              }
              setRescheduleTask(null);
            }}
          />
        )}



        {/* ========================================================================= */}
        {/* MODAL 5: Tag Form Modal (Crear y Editar Etiqueta)                         */}
        {/* ========================================================================= */}
        {!showCreateModal && !editingTask && !showTagFilterSheet && showTagModal && renderTagFormModal(false)}

        {/* ========================================================================= */}
        {/* MODAL 6: TagFilterSheet (Bottom panel para filtrar y gestionar etiquetas) */}
        {/* ========================================================================= */}
        <Modal
          visible={showTagFilterSheet}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTagFilterSheet(false)}
        >
          <View style={styles.sheetOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowTagFilterSheet(false)} />
            <View style={styles.sheetCard}>
              {/* Handle bar */}
              <View style={styles.sheetHandle} />

              {/* Header */}
              <View style={styles.sheetHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TagIcon size={18} color={gold[400]} />
                  <Text style={styles.sheetTitle}>Filtrar por etiquetas</Text>
                  {selectedTagFilters.length > 0 && (
                    <View style={styles.sheetCountBadge}>
                      <Text style={styles.sheetCountBadgeText}>{selectedTagFilters.length}</Text>
                    </View>
                  )}
                </View>
                <Pressable onPress={() => setShowTagFilterSheet(false)} hitSlop={10}>
                  <X size={20} color="#888" />
                </Pressable>
              </View>

              {/* Quick actions: Todas (sin filtrar) | Crear etiqueta */}
              <View style={styles.sheetQuickActions}>
                <Pressable
                  style={[
                    styles.sheetActionPill,
                    selectedTagFilters.length === 0 && styles.sheetActionPillActive,
                  ]}
                  onPress={() => setSelectedTagFilters([])}
                >
                  <Text
                    style={[
                      styles.sheetActionPillText,
                      selectedTagFilters.length === 0 && styles.sheetActionPillTextActive,
                    ]}
                  >
                    Todas (sin filtrar)
                  </Text>
                </Pressable>

                <Pressable
                  style={styles.sheetCreatePill}
                  onPress={() => openCreateTag('sheet')}
                >
                  <Plus size={13} color={gold[400]} strokeWidth={2.4} />
                  <Text style={styles.sheetCreatePillText}>Crear etiqueta</Text>
                </Pressable>
              </View>

              {/* Tags list */}
              <ScrollView style={styles.sheetTagsList} showsVerticalScrollIndicator={false}>
                {userTags.length === 0 ? (
                  <View style={styles.sheetEmptyTags}>
                    <Text style={styles.sheetEmptyTagsText}>No tienes etiquetas creadas todavía.</Text>
                    <Pressable
                      style={styles.sheetCreateFirstBtn}
                      onPress={() => openCreateTag('sheet')}
                    >
                      <Plus size={14} color="#0E0E0E" strokeWidth={2.4} />
                      <Text style={styles.sheetCreateFirstBtnText}>Crear mi primera etiqueta</Text>
                    </Pressable>
                  </View>
                ) : (
                  userTags.map((tag) => {
                    const isSelected = selectedTagFilters.includes(tag.id);
                    const taskCount = tasks.filter((t) => t.tag_ids?.includes(tag.id)).length;

                    return (
                      <View key={tag.id} style={styles.sheetTagRow}>
                        {/* Checkable selection box */}
                        <Pressable
                          style={styles.sheetTagCheckArea}
                          onPress={() => {
                            setSelectedTagFilters((prev) =>
                              isSelected ? prev.filter((id) => id !== tag.id) : [...prev, tag.id]
                            );
                          }}
                        >
                          <View
                            style={[
                              styles.sheetCheckbox,
                              isSelected && {
                                backgroundColor: tag.color || gold[400],
                                borderColor: tag.color || gold[400],
                              },
                            ]}
                          >
                            {isSelected && <Check size={13} color="#0E0E0E" strokeWidth={3} />}
                          </View>

                          <View
                            style={[
                              styles.sheetTagBadge,
                              {
                                backgroundColor: tag.color ? `${tag.color}1F` : '#1E1E1E',
                                borderColor: tag.color ? `${tag.color}55` : '#333',
                              },
                            ]}
                          >
                            {tag.emoji && <Text style={{ fontSize: 13, marginRight: 4 }}>{tag.emoji}</Text>}
                            <Text
                              style={[
                                styles.sheetTagBadgeText,
                                { color: tag.color || '#DDD' },
                              ]}
                            >
                              {tag.name}
                            </Text>
                          </View>

                          <Text style={styles.sheetTaskCountText}>
                            {taskCount} {taskCount === 1 ? 'tarea' : 'tareas'}
                          </Text>
                        </Pressable>

                        {/* Edit Button */}
                        <Pressable
                          style={styles.sheetTagEditBtn}
                          onPress={() => openEditTag(tag)}
                          hitSlop={8}
                          accessibilityLabel={`Editar etiqueta ${tag.name}`}
                        >
                          <Pencil size={15} color="#888" />
                        </Pressable>
                      </View>
                    );
                  })
                )}
              </ScrollView>

              {/* Bottom Apply Button */}
              <View style={styles.sheetFooter}>
                <Pressable
                  style={styles.sheetApplyBtn}
                  onPress={() => setShowTagFilterSheet(false)}
                >
                  <Text style={styles.sheetApplyBtnText}>
                    {selectedTagFilters.length === 0
                      ? 'Mostrar todas las tareas'
                      : `Aplicar filtro (${selectedTagFilters.length} etiqueta${selectedTagFilters.length > 1 ? 's' : ''})`}
                  </Text>
                </Pressable>
              </View>

              {/* Nested Tag Form Modal when editing/creating from sheet */}
              {showTagModal && renderTagFormModal(true)}
            </View>
          </View>
        </Modal>

        {/* ========================================================================= */}
        {/* MODAL 7: CollaboratorPickerSheet                                          */}
        {/* ========================================================================= */}
        <CollaboratorPickerSheet
          visible={showCollaboratorPicker}
          selected={collaboratorPickerTarget === 'create' ? createCollaborators : editCollaborators}
          onChange={(cols) => {
            if (collaboratorPickerTarget === 'create') {
              setCreateCollaborators(cols);
            } else {
              setEditCollaborators(cols);
            }
          }}
          onClose={() => setShowCollaboratorPicker(false)}
        />

        {/* ========================================================================= */}
        {/* MODAL 8: Sort & Classify Sheet                                            */}
        {/* ========================================================================= */}
        {showSortModal && (
          <Modal
            transparent
            animationType="slide"
            visible={showSortModal}
            onRequestClose={() => setShowSortModal(false)}
          >
            <View style={styles.sheetOverlay}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowSortModal(false)} />
              <View style={styles.sortSheetCard}>
                <View style={styles.sheetHandle} />

                {/* Header */}
                <View style={styles.sheetHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <SlidersHorizontal size={18} color={gold[400]} />
                    <Text style={styles.sheetTitle}>Ordenar y clasificar</Text>
                  </View>
                  <Pressable onPress={() => setShowSortModal(false)} hitSlop={10}>
                    <X size={20} color="#888" />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
                  {/* Section 1: Agrupar por etiquetas */}
                  <View style={styles.sortSection}>
                    <Text style={styles.sortSectionTitle}>CLASIFICAR</Text>
                    <Pressable
                      style={[
                        styles.sortOptionCard,
                        groupByTag && styles.sortOptionCardActive,
                      ]}
                      onPress={handleToggleGroupByTag}
                    >
                      <View style={styles.sortOptionLeft}>
                        <View style={[styles.sortOptionIconBox, groupByTag && styles.sortOptionIconBoxActive]}>
                          <Layers size={18} color={groupByTag ? '#0E0E0E' : gold[400]} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.sortOptionTitle, groupByTag && styles.sortOptionTitleActive]}>
                            Clasificar por etiquetas
                          </Text>
                          <Text style={styles.sortOptionSubtitle}>
                            Agrupa las tareas en bloques por cada etiqueta
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.sortTogglePill,
                          groupByTag && styles.sortTogglePillActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.sortTogglePillText,
                            groupByTag && styles.sortTogglePillTextActive,
                          ]}
                        >
                          {groupByTag ? 'Activado' : 'Desactivado'}
                        </Text>
                      </View>
                    </Pressable>
                  </View>

                  {/* Section 2: Criterio de ordenación */}
                  <View style={styles.sortSection}>
                    <Text style={styles.sortSectionTitle}>ORDENAR POR</Text>

                    {/* Manual / Arrastrar */}
                    <Pressable
                      style={[
                        styles.sortOptionCard,
                        sortField === 'manual' && styles.sortOptionCardActive,
                      ]}
                      onPress={() => handleSelectSort('manual')}
                    >
                      <View style={styles.sortOptionLeft}>
                        <View style={[styles.sortOptionIconBox, sortField === 'manual' && styles.sortOptionIconBoxActive]}>
                          <GripVertical size={18} color={sortField === 'manual' ? '#0E0E0E' : '#AAA'} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.sortOptionTitle, sortField === 'manual' && styles.sortOptionTitleActive]}>
                            Manual (Por defecto)
                          </Text>
                          <Text style={styles.sortOptionSubtitle}>
                            Arrastra y reordena las tareas en el orden que prefieras
                          </Text>
                        </View>
                      </View>
                      {sortField === 'manual' && (
                        <View style={styles.sortCheckCircle}>
                          <Check size={14} color="#0E0E0E" strokeWidth={3} />
                        </View>
                      )}
                    </Pressable>

                    {/* Prioridad */}
                    <Pressable
                      style={[
                        styles.sortOptionCard,
                        sortField === 'priority' && styles.sortOptionCardActive,
                      ]}
                      onPress={() => handleSelectSort('priority')}
                    >
                      <View style={styles.sortOptionLeft}>
                        <View style={[styles.sortOptionIconBox, sortField === 'priority' && styles.sortOptionIconBoxActive]}>
                          <Flag size={18} color={sortField === 'priority' ? '#0E0E0E' : '#FF453A'} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.sortOptionTitle, sortField === 'priority' && styles.sortOptionTitleActive]}>
                            Prioridad
                          </Text>
                          <Text style={styles.sortOptionSubtitle}>
                            {sortField === 'priority'
                              ? sortDirection === 'desc'
                                ? 'Urgente 🔴 → Baja 🟢 (Toca para invertir)'
                                : 'Baja 🟢 → Urgente 🔴 (Toca para invertir)'
                              : 'Urgente 🔴 > Alta 🟠 > Media 🟡 > Baja 🟢'}
                          </Text>
                        </View>
                      </View>
                      {sortField === 'priority' && (
                        <View style={styles.sortCheckCircle}>
                          {sortDirection === 'desc' ? (
                            <ArrowDown size={14} color="#0E0E0E" strokeWidth={2.8} />
                          ) : (
                            <ArrowUp size={14} color="#0E0E0E" strokeWidth={2.8} />
                          )}
                        </View>
                      )}
                    </Pressable>

                    {/* Nombre */}
                    <Pressable
                      style={[
                        styles.sortOptionCard,
                        sortField === 'name' && styles.sortOptionCardActive,
                      ]}
                      onPress={() => handleSelectSort('name')}
                    >
                      <View style={styles.sortOptionLeft}>
                        <View style={[styles.sortOptionIconBox, sortField === 'name' && styles.sortOptionIconBoxActive]}>
                          <ArrowDownAZ size={18} color={sortField === 'name' ? '#0E0E0E' : '#3B82F6'} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.sortOptionTitle, sortField === 'name' && styles.sortOptionTitleActive]}>
                            Nombre / Título
                          </Text>
                          <Text style={styles.sortOptionSubtitle}>
                            {sortField === 'name'
                              ? sortDirection === 'asc'
                                ? 'A → Z (Toca para invertir)'
                                : 'Z → A (Toca para invertir)'
                              : 'Orden alfabético de la A a la Z'}
                          </Text>
                        </View>
                      </View>
                      {sortField === 'name' && (
                        <View style={styles.sortCheckCircle}>
                          {sortDirection === 'asc' ? (
                            <ArrowUp size={14} color="#0E0E0E" strokeWidth={2.8} />
                          ) : (
                            <ArrowDown size={14} color="#0E0E0E" strokeWidth={2.8} />
                          )}
                        </View>
                      )}
                    </Pressable>

                    {/* Fecha */}
                    <Pressable
                      style={[
                        styles.sortOptionCard,
                        sortField === 'date' && styles.sortOptionCardActive,
                      ]}
                      onPress={() => handleSelectSort('date')}
                    >
                      <View style={styles.sortOptionLeft}>
                        <View style={[styles.sortOptionIconBox, sortField === 'date' && styles.sortOptionIconBoxActive]}>
                          <Calendar size={18} color={sortField === 'date' ? '#0E0E0E' : gold[400]} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.sortOptionTitle, sortField === 'date' && styles.sortOptionTitleActive]}>
                            Fecha de vencimiento
                          </Text>
                          <Text style={styles.sortOptionSubtitle}>
                            {sortField === 'date'
                              ? sortDirection === 'asc'
                                ? 'Más próximas primero (Toca para invertir)'
                                : 'Más lejanas primero (Toca para invertir)'
                              : 'Tareas más próximas o programadas primero'}
                          </Text>
                        </View>
                      </View>
                      {sortField === 'date' && (
                        <View style={styles.sortCheckCircle}>
                          {sortDirection === 'asc' ? (
                            <ArrowUp size={14} color="#0E0E0E" strokeWidth={2.8} />
                          ) : (
                            <ArrowDown size={14} color="#0E0E0E" strokeWidth={2.8} />
                          )}
                        </View>
                      )}
                    </Pressable>
                  </View>
                </ScrollView>

                {/* Footer: Restablecer + Aplicar */}
                <View style={styles.sortSheetFooter}>
                  <Pressable
                    style={styles.sortResetBtn}
                    onPress={handleResetSort}
                  >
                    <Text style={styles.sortResetBtnText}>Restablecer</Text>
                  </Pressable>
                  <Pressable
                    style={styles.sortApplyBtn}
                    onPress={() => setShowSortModal(false)}
                  >
                    <Text style={styles.sortApplyBtnText}>Aplicar</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
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
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#8A8A8A',
    marginTop: 2,
    marginBottom: 10,
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
    fontSize: 12,
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
    gap: 6,
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
  filterPillActive: {
    backgroundColor: '#262012',
    borderColor: gold[400],
  },
  filterPillTextActive: {
    color: gold[400],
    fontFamily: 'Inter_600SemiBold',
  },
  clearFiltersPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
  },
  clearFiltersPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#8E8E93',
  },
  favQuickBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  tagEditTrigger: {
    marginLeft: 5,
    padding: 2,
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
    backgroundColor: '#1E1B10',
    borderColor: gold[400],
    borderWidth: 1,
    borderRadius: 8,
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
    flexWrap: 'wrap',
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
  collabBadgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#242010',
    borderColor: '#423610',
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    gap: 3,
  },
  collabBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9.5,
    color: gold[400],
    maxWidth: 110,
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
  weekNavigationCard: {
    backgroundColor: '#141414',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#242424',
    padding: 10,
    marginBottom: 4,
  },
  weekNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  weekNavCenter: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 8,
  },
  weekNavTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    color: '#EEE',
    textAlign: 'center',
  },
  weekNavTodayBadge: {
    backgroundColor: '#262010',
    borderColor: '#4A3B10',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  weekNavTodayText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: gold[400],
  },
  weekSpanSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#222',
  },
  weekSpanLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#777',
    marginRight: 4,
  },
  weekSpanPill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  weekSpanPillActive: {
    backgroundColor: '#2A2210',
    borderColor: gold[400],
  },
  weekSpanPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#888',
  },
  weekSpanPillTextActive: {
    color: gold[400],
    fontFamily: 'Inter_600SemiBold',
  },
  weekBlock: {
    marginBottom: 12,
  },
  multiWeekDivider: {
    backgroundColor: '#181818',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#242424',
  },
  multiWeekTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: gold[400],
    letterSpacing: 0.5,
  },
  weekDaySection: {
    marginBottom: 10,
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
    color: '#555',
  },
  calendarContainer: {
    gap: 12,
  },
  calendarCard: {
    backgroundColor: '#141414',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#242424',
    padding: 12,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  calendarMonthTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#EEE',
    letterSpacing: 0.5,
  },
  calendarTodayBadge: {
    marginTop: 2,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: '#262010',
    borderColor: '#4A3B10',
    borderWidth: 1,
  },
  calendarTodayText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9.5,
    color: gold[400],
  },
  calendarDaysOfWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#242424',
    marginBottom: 6,
  },
  calendarDayOfWeekText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#666',
    width: 38,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  calendarDayCell: {
    width: '14.28%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginVertical: 2,
    position: 'relative',
  },
  calendarDayCellToday: {
    borderWidth: 1,
    borderColor: gold[400],
  },
  calendarDayCellSelected: {
    backgroundColor: '#262010',
    borderWidth: 1.5,
    borderColor: gold[400],
  },
  calendarDayNumber: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#EEE',
  },
  calendarDayNumberOutside: {
    color: '#444',
  },
  calendarDayNumberToday: {
    color: gold[400],
    fontFamily: 'Inter_700Bold',
  },
  calendarDayNumberSelected: {
    color: gold[400],
    fontFamily: 'Inter_700Bold',
  },
  calendarDotsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 2,
    height: 4,
    alignItems: 'center',
  },
  calendarPendingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: gold[400],
  },
  calendarCompletedDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#34C759',
  },
  calendarCellCountBadge: {
    position: 'absolute',
    top: 2,
    right: 4,
  },
  calendarCellCountText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 8.5,
    color: '#888',
  },
  calendarDayDetailSection: {
    gap: 8,
  },
  calendarDayDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginVertical: 4,
  },
  calendarDayDetailDate: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    color: gold[400],
    letterSpacing: 0.5,
  },
  calendarDayDetailSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#777',
    marginTop: 1,
  },
  calendarDayAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: gold[400],
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  calendarDayAddBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    color: '#0E0E0E',
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
  editStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#333',
  },
  editStatusPillCompleted: {
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
    borderColor: 'rgba(52, 199, 89, 0.4)',
  },
  editStatusPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#888',
  },
  editStatusPillTextCompleted: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#34C759',
  },
  fieldLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#CCC',
    marginTop: 10,
    marginBottom: 6,
  },
  collabSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  collabCountText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: gold[400],
    marginTop: 10,
  },
  collaboratorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  collaboratorPlaceholder: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#777',
  },
  collaboratorChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  collaboratorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#201C10',
    borderWidth: 1,
    borderColor: '#423610',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
  },
  collaboratorChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: gold[400],
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
  tagModalAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 10,
    backgroundColor: '#1E1908',
    borderRadius: 8,
    marginBottom: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#3D3310',
  },
  tagModalAddBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: gold[400],
  },
  deleteTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 6,
  },
  deleteTagRowText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: '#FF453A',
  },
  addTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#1E1908',
    borderWidth: 1,
    borderColor: '#3D3310',
  },
  addTagPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    color: gold[400],
  },
  completedSectionWrapper: {
    marginTop: 22,
  },
  completedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  completedSectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  completedTimeChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#0F2916',
    borderWidth: 1,
    borderColor: '#194D26',
    marginRight: 4,
  },
  completedTimeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10.5,
    color: '#34C759',
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 6,
  },
  paletteCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteCircleSelected: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  emojiCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  emojiCircleSelected: {
    borderColor: gold[400],
    backgroundColor: '#262112',
  },
  overdueSectionWrapper: {
    marginBottom: 20,
  },
  overdueSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  overdueSectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  overdueIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#342105',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#603B08',
  },
  overdueSectionTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12.5,
    color: '#F59E0B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  overdueSectionHint: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#8E8E93',
  },
  overdueListCard: {
    backgroundColor: '#15110A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#38250A',
    overflow: 'hidden',
  },
  overdueTaskRow: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#15110A',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#281A08',
  },
  overdueMainLine: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  overdueTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overdueBadgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    backgroundColor: '#2E1D06',
    borderWidth: 1,
    borderColor: '#5B3908',
  },
  overdueBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10.5,
    color: '#F59E0B',
  },
  overdueMoveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#281A08',
    gap: 8,
  },
  overdueMoveLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#9C7A2E',
  },
  overdueMoveScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 6,
  },
  overdueMovePill: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    backgroundColor: '#22190B',
    borderWidth: 1,
    borderColor: '#3D2A10',
  },
  overdueMovePillToday: {
    backgroundColor: '#D4B13A',
    borderColor: '#D4B13A',
  },
  overdueMovePillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#D4B13A',
  },
  overdueMovePillTextToday: {
    color: '#0E0E0E',
    fontFamily: 'Inter_700Bold',
  },
  overdueMovePillCal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    backgroundColor: '#22190B',
    borderWidth: 1,
    borderColor: '#4A3414',
  },
  overdueMovePillCalText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#D4B13A',
  },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    borderWidth: 1,
  },
  priorityChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9.5,
  },
  convertQuickBtn: {
    padding: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prioritySelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  prioritySelectorPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  prioritySelectorPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#8E8E93',
  },
  convertBucketCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#262010',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3D3310',
    padding: 12,
    marginTop: 14,
    marginBottom: 8,
  },
  convertBucketLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  convertBucketIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#382E12',
    justifyContent: 'center',
    alignItems: 'center',
  },
  convertBucketTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#D4B13A',
    marginBottom: 2,
  },
  convertBucketSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#A0926C',
  },
  tagFilterMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1E1B12',
    borderColor: '#443812',
    borderWidth: 1,
  },
  tagFilterMainBtnActive: {
    backgroundColor: gold[400],
    borderColor: gold[400],
  },
  tagFilterMainBtnText: {
    color: gold[400],
    fontFamily: 'Inter_600SemiBold',
  },
  tagFilterMainBtnTextActive: {
    color: '#0E0E0E',
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '82%',
  },
  sheetHandle: {
    width: 38,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: '#3E3E3E',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 17,
    color: '#FFF',
  },
  sheetCountBadge: {
    backgroundColor: gold[400],
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  sheetCountBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    color: '#0E0E0E',
  },
  sheetQuickActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  sheetActionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#202020',
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  sheetActionPillActive: {
    backgroundColor: '#2A2210',
    borderColor: gold[400],
  },
  sheetActionPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#888',
  },
  sheetActionPillTextActive: {
    color: gold[400],
    fontFamily: 'Inter_600SemiBold',
  },
  sheetCreatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#231E10',
    borderWidth: 1,
    borderColor: '#423712',
  },
  sheetCreatePillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: gold[400],
  },
  sheetTagsList: {
    maxHeight: 320,
  },
  sheetTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#242424',
  },
  sheetTagCheckArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sheetCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  sheetTagBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  sheetTaskCountText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    color: '#777',
  },
  sheetTagEditBtn: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#202020',
  },
  sheetEmptyTags: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  sheetEmptyTagsText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#777',
  },
  sheetCreateFirstBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: gold[400],
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  sheetCreateFirstBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#0E0E0E',
  },
  sheetFooter: {
    marginTop: 16,
  },
  sheetApplyBtn: {
    backgroundColor: gold[400],
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetApplyBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#0E0E0E',
  },
  toolbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
    gap: 8,
  },
  toolbarViewContext: {
    paddingVertical: 4,
  },
  toolbarViewContextText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sortTriggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 8,
  },
  sortTriggerBtnActive: {
    backgroundColor: '#262010',
    borderColor: gold[400],
  },
  sortTriggerText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#9E9E9E',
  },
  sortTriggerTextActive: {
    color: gold[400],
    fontFamily: 'Inter_600SemiBold',
  },
  sortActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: gold[400],
    marginLeft: 1,
  },
  tagGroupsContainer: {
    gap: 14,
  },
  tagGroupBlock: {
    gap: 6,
  },
  tagGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  tagGroupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tagGroupTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#E0E0E0',
    flex: 1,
  },
  tagGroupBadge: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1.5,
  },
  tagGroupBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#A0A0A0',
  },
  recurrencePresetsScroll: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
  },
  recurrencePresetPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: '#2C2C2C',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  recurrencePresetPillActive: {
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    borderColor: gold[400],
  },
  recurrencePresetText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#AAA',
  },
  recurrencePresetTextActive: {
    color: gold[400],
    fontFamily: 'Inter_600SemiBold',
  },
  recurrenceCustomBox: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#181818',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 10,
  },
  recurrenceStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recurrenceStepperLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#CCC',
  },
  recurrenceStepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recurrenceStepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#383838',
  },
  recurrenceStepBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    lineHeight: 18,
  },
  recurrenceStepValueText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: gold[400],
    minWidth: 24,
    textAlign: 'center',
  },
  recurrenceUnitsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  recurrenceUnitPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  recurrenceUnitPillActive: {
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    borderColor: gold[400],
  },
  recurrenceUnitText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#888',
  },
  recurrenceUnitTextActive: {
    color: gold[400],
    fontFamily: 'Inter_600SemiBold',
  },
  recurrenceHelperNote: {
    marginTop: 6,
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#9E9E9E',
    lineHeight: 15,
  },
  recurrenceBadgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(197, 160, 89, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 89, 0.35)',
  },
  recurrenceBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: gold[400],
  },
  sortSheetCard: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopWidth: 1,
    borderTopColor: '#282828',
  },
  sortSection: {
    marginBottom: 16,
    gap: 8,
  },
  sortSectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#777',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  sortOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1C',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 12,
    gap: 12,
  },
  sortOptionCardActive: {
    backgroundColor: '#262010',
    borderColor: gold[400],
  },
  sortOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sortOptionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortOptionIconBoxActive: {
    backgroundColor: gold[400],
  },
  sortOptionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    color: '#EEE',
    marginBottom: 2,
  },
  sortOptionTitleActive: {
    color: gold[400],
  },
  sortOptionSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#888',
    lineHeight: 14,
  },
  sortCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: gold[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortTogglePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#262626',
  },
  sortTogglePillActive: {
    backgroundColor: gold[400],
  },
  sortTogglePillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#888',
  },
  sortTogglePillTextActive: {
    color: '#0E0E0E',
    fontFamily: 'Inter_600SemiBold',
  },
  sortDirectionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sortDirectionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  sortDirectionBtnActive: {
    backgroundColor: '#262010',
    borderColor: gold[400],
  },
  sortDirectionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    color: '#888',
  },
  sortDirectionTextActive: {
    color: gold[400],
    fontFamily: 'Inter_600SemiBold',
  },
  sortSheetFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#242424',
  },
  sortResetBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#1F1F1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortResetBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#AAA',
  },
  sortApplyBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: gold[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sortApplyBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    color: '#0E0E0E',
  },
  subtasksHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
  },
  fieldLabelNoMargin: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#AAA',
  },
  subtasksCounterBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 999,
    backgroundColor: '#262010',
    borderWidth: 1,
    borderColor: '#3D3310',
  },
  subtasksCounterBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: gold[400],
  },
  subtasksContainer: {
    backgroundColor: '#161616',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#242424',
    overflow: 'hidden',
    marginBottom: 8,
  },
  subtaskItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#202020',
    gap: 8,
  },
  subtaskCheckBtn: {
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtaskUncheckedCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.6,
    borderColor: '#555',
  },
  subtaskItemTitle: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
    color: '#DDD',
  },
  subtaskItemTitleCompleted: {
    color: '#666',
    textDecorationLine: 'line-through',
  },
  subtaskDeleteBtn: {
    padding: 4,
    borderRadius: 4,
  },
  addSubtaskInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  addSubtaskInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: '#2C2C2E',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    color: '#FFF',
  },
  addSubtaskActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: gold[400],
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSubtaskActionBtnDisabled: {
    backgroundColor: '#262626',
  },
  subtasksBadgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 5,
    backgroundColor: '#231E10',
    borderWidth: 1,
    borderColor: '#3D3310',
  },
  subtasksBadgeChipDone: {
    backgroundColor: '#0F2916',
    borderColor: '#194D26',
  },
  subtasksBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9.5,
    color: gold[400],
  },
  subtasksBadgeTextDone: {
    color: '#34C759',
  },
});
