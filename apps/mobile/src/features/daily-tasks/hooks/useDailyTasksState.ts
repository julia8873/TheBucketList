import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Alert, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  format,
  addDays,
  startOfDay,
  endOfWeek,
  startOfWeek,
  isBefore,
  isToday,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  useDailyTasks,
  useDailyTaskStats,
  useCreateDailyTask,
  useUpdateDailyTask,
  useCompleteDailyTask,
  useCompleteRecurringDailyTask,
  useToggleDailyTask,
  useDeleteDailyTask,
  useReorderDailyTasks,
  useConvertToBucket,
} from '@/hooks/useDailyTasks';
import {
  useDailyTags,
  useCreateDailyTag,
  useUpdateDailyTag,
  useDeleteDailyTag,
} from '@/hooks/useDailyTags';
import {
  DailyTask,
  DailyTag,
  DailySubtask,
  DailySortField,
  DailySortDirection,
  TimeView,
  StatusFilter,
  DailyTaskPriority,
  DailyTaskRecurrenceUnit,
} from '../types';
import { SORT_PREF_STORAGE_KEY } from '../constants';
import {
  toDateString,
  calculateNextRecurringDate,
} from '../utils/dailyTaskDateUtils';
import { sortDailyTasks, groupDailyTasksByTag } from '../utils/dailyTaskSorting';

export function useDailyTasksState() {
  const [timeView, setTimeView] = useState<TimeView>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [showTagFilterSheet, setShowTagFilterSheet] = useState(false);

  // Quick filters: Favoritas, Prioridad
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

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
    async (field: DailySortField, direction: DailySortDirection, group: boolean) => {
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
      if (field !== 'manual') {
        nextDir = sortDirection === 'asc' ? 'desc' : 'asc';
      }
    } else {
      nextField = field;
      if (field === 'priority') nextDir = 'desc';
      else if (field === 'name') nextDir = 'asc';
      else if (field === 'date') nextDir = 'asc';
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
  const [weekOffset, setWeekOffset] = useState(0);
  const [weeksToShow, setWeeksToShow] = useState<number>(1);

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
  const [createSubtasks, setCreateSubtasks] = useState<DailySubtask[]>([]);
  const [createSubtaskTitle, setCreateSubtaskTitle] = useState('');

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
  const [editSubtasks, setEditSubtasks] = useState<DailySubtask[]>([]);
  const [editSubtaskTitle, setEditSubtaskTitle] = useState('');

  // Tag Form Modal state
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
  const { refetch: refetchStats } = useDailyTaskStats();
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
  const convertToBucketMutation = useConvertToBucket();

  const todayStr = useMemo(() => toDateString(new Date()), []);

  const tagMap = useMemo(() => {
    const map = new Map<string, DailyTag>();
    userTags.forEach((t) => map.set(t.id, t));
    return map;
  }, [userTags]);

  const filteredByTagAndStatus = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter === 'pending' && t.is_completed) return false;
      if (statusFilter === 'completed' && !t.is_completed) return false;
      if (selectedTagFilters.length > 0) {
        if (!t.tag_ids || !t.tag_ids.some((id) => selectedTagFilters.includes(id))) return false;
      }
      if (onlyFavorites && !t.is_favorite) return false;
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, selectedTagFilters, onlyFavorites, priorityFilter]);

  const favoritesCount = useMemo(() => tasks.filter((t) => t.is_favorite).length, [tasks]);

  const overdueTasks = useMemo(() => {
    return filteredByTagAndStatus.filter((t) => {
      if (t.is_completed) return false;
      const taskDate = t.due_date || todayStr;
      return taskDate < todayStr;
    });
  }, [filteredByTagAndStatus, todayStr]);

  const todayTasks = useMemo(() => {
    return filteredByTagAndStatus.filter((t) => {
      if (t.is_completed) return false;
      const taskDate = t.due_date || todayStr;
      return taskDate === todayStr;
    });
  }, [filteredByTagAndStatus, todayStr]);

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

  const completedList = useMemo(() => {
    return filteredByTagAndStatus.filter((t) => {
      if (!t.is_completed) return false;
      const taskDate = t.due_date || todayStr;
      const completedToday = t.completed_at ? t.completed_at.startsWith(todayStr) : false;
      return taskDate === todayStr || completedToday;
    });
  }, [filteredByTagAndStatus, todayStr]);

  const sortTasks = useCallback(
    (items: DailyTask[]) => sortDailyTasks(items, sortField, sortDirection),
    [sortField, sortDirection]
  );

  const groupTasksByTag = useCallback(
    (items: DailyTask[]) => groupDailyTasksByTag(items, userTags),
    [userTags]
  );

  const sortedOverdueTasks = useMemo(() => sortTasks(overdueTasks), [overdueTasks, sortTasks]);
  const sortedTodayTasks = useMemo(() => sortTasks(todayTasks), [todayTasks, sortTasks]);
  const sortedAllTasks = useMemo(() => sortTasks(filteredByTagAndStatus), [filteredByTagAndStatus, sortTasks]);

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

  const saveTitleTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveDescTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editingTaskIdRef = useRef<string | null>(null);
  const editTitleRef = useRef(editTitle);
  const editDescriptionRef = useRef(editDescription);

  useEffect(() => {
    editingTaskIdRef.current = editingTask?.id || null;
  }, [editingTask]);

  useEffect(() => {
    editTitleRef.current = editTitle;
  }, [editTitle]);

  useEffect(() => {
    editDescriptionRef.current = editDescription;
  }, [editDescription]);

  const autoSaveTask = useCallback(
    (updates: Partial<DailyTask>) => {
      const currentId = editingTaskIdRef.current;
      if (!currentId || currentId.startsWith('temp-')) return;
      updateMutation.mutate({
        id: currentId,
        updates,
      });
      setEditingTask((prev) => (prev ? { ...prev, ...updates } : prev));
    },
    [updateMutation]
  );

  const handleCloseEditModal = useCallback(() => {
    if (saveTitleTimeoutRef.current) {
      clearTimeout(saveTitleTimeoutRef.current);
      saveTitleTimeoutRef.current = null;
    }
    if (saveDescTimeoutRef.current) {
      clearTimeout(saveDescTimeoutRef.current);
      saveDescTimeoutRef.current = null;
    }

    const currentId = editingTaskIdRef.current;
    if (currentId && !currentId.startsWith('temp-')) {
      const finalTitle = editTitleRef.current.trim();
      const finalDesc = editDescriptionRef.current.trim();
      const updates: Partial<DailyTask> = {};
      if (finalTitle) updates.title = finalTitle;
      updates.description = finalDesc || null;
      updateMutation.mutate({ id: currentId, updates });
    }

    setEditingTask(null);
  }, [updateMutation]);

  const handleEditTitleChange = (val: string) => {
    setEditTitle(val);
    editTitleRef.current = val;
    if (saveTitleTimeoutRef.current) clearTimeout(saveTitleTimeoutRef.current);
    const currentId = editingTaskIdRef.current;
    if (!currentId || currentId.startsWith('temp-')) return;
    const trimmed = val.trim();
    if (!trimmed) return;

    saveTitleTimeoutRef.current = setTimeout(() => {
      autoSaveTask({ title: trimmed });
    }, 400);
  };

  const handleEditTitleBlur = () => {
    if (saveTitleTimeoutRef.current) {
      clearTimeout(saveTitleTimeoutRef.current);
      saveTitleTimeoutRef.current = null;
    }
    const trimmed = editTitleRef.current.trim();
    if (trimmed) autoSaveTask({ title: trimmed });
  };

  const handleEditDescriptionChange = (val: string) => {
    setEditDescription(val);
    editDescriptionRef.current = val;
    if (saveDescTimeoutRef.current) clearTimeout(saveDescTimeoutRef.current);
    const currentId = editingTaskIdRef.current;
    if (!currentId || currentId.startsWith('temp-')) return;

    saveDescTimeoutRef.current = setTimeout(() => {
      autoSaveTask({ description: val.trim() || null });
    }, 400);
  };

  const handleEditDescriptionBlur = () => {
    if (saveDescTimeoutRef.current) {
      clearTimeout(saveDescTimeoutRef.current);
      saveDescTimeoutRef.current = null;
    }
    autoSaveTask({ description: editDescriptionRef.current.trim() || null });
  };

  const handleToggleEditFavorite = () => {
    const nextFav = !editIsFavorite;
    setEditIsFavorite(nextFav);
    autoSaveTask({ is_favorite: nextFav });
  };

  const handleToggleEditStatus = () => {
    if (!editingTask) return;
    const nextCompleted = !editIsCompleted;
    setEditIsCompleted(nextCompleted);

    if (nextCompleted) {
      if (editIsRecurring) {
        const nextDueDate = calculateNextRecurringDate(
          editDueDate,
          editRecurrenceInterval,
          editRecurrenceUnit
        );
        const resetSubtasks = editSubtasks.map((s) => ({ ...s, is_completed: false }));
        setEditDueDate(nextDueDate);
        setEditSubtasks(resetSubtasks);
        setEditIsCompleted(false);

        completeRecurringMutation.mutate({
          task: {
            ...editingTask,
            title: editTitle.trim() || editingTask.title,
            description: editDescription.trim() || null,
            priority: editPriority,
            is_favorite: editIsFavorite,
            is_recurring: editIsRecurring,
            recurrence_interval: editRecurrenceInterval,
            recurrence_unit: editRecurrenceUnit,
            due_date: editDueDate,
            tag_ids: editTagIds,
            subtasks: editSubtasks,
          },
          nextDueDate,
          resetSubtasks,
        });
      } else {
        completeMutation.mutate({
          ...editingTask,
          title: editTitle.trim() || editingTask.title,
          description: editDescription.trim() || null,
          priority: editPriority,
          is_favorite: editIsFavorite,
          is_recurring: editIsRecurring,
          recurrence_interval: editRecurrenceInterval,
          recurrence_unit: editRecurrenceUnit,
          due_date: editDueDate,
          tag_ids: editTagIds,
          subtasks: editSubtasks,
        });
      }
    } else {
      toggleMutation.mutate({ id: editingTask.id, isCompleted: false });
    }
  };

  const openEditTask = (task: DailyTask) => {
    if (saveTitleTimeoutRef.current) clearTimeout(saveTitleTimeoutRef.current);
    if (saveDescTimeoutRef.current) clearTimeout(saveDescTimeoutRef.current);
    editingTaskIdRef.current = task.id;
    editTitleRef.current = task.title;
    editDescriptionRef.current = task.description || '';
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
    setEditShowCustomRecurrence(false);
    setEditTagIds(task.tag_ids || []);
    setEditSubtasks(task.subtasks || []);
    setEditSubtaskTitle('');
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
    autoSaveTask({ subtasks: nextSubtasks });
  };

  const handleToggleEditSubtask = (subtaskId: string) => {
    const nextSubtasks = editSubtasks.map((st) =>
      st.id === subtaskId ? { ...st, is_completed: !st.is_completed } : st
    );
    setEditSubtasks(nextSubtasks);
    autoSaveTask({ subtasks: nextSubtasks });
  };

  const handleDeleteEditSubtask = (subtaskId: string) => {
    const nextSubtasks = editSubtasks.filter((st) => st.id !== subtaskId);
    setEditSubtasks(nextSubtasks);
    autoSaveTask({ subtasks: nextSubtasks });
  };

  // Tag Form handlers
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
          const nextTagIds = [...editTagIds, created.id];
          setEditTagIds(nextTagIds);
          autoSaveTask({ tag_ids: nextTagIds });
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

  const handleRescheduleTask = (task: DailyTask, targetDateStr: string) => {
    updateMutation.mutate({
      id: task.id,
      updates: { due_date: targetDateStr },
    });
  };

  return {
    timeView,
    setTimeView,
    statusFilter,
    setStatusFilter,
    selectedTagFilters,
    setSelectedTagFilters,
    showTagFilterSheet,
    setShowTagFilterSheet,
    onlyFavorites,
    setOnlyFavorites,
    priorityFilter,
    setPriorityFilter,
    sortField,
    sortDirection,
    groupByTag,
    showSortModal,
    setShowSortModal,
    handleSelectSort,
    handleToggleGroupByTag,
    handleResetSort,
    weekOffset,
    setWeekOffset,
    weeksToShow,
    setWeeksToShow,
    calendarMonth,
    setCalendarMonth,
    selectedCalendarDate,
    setSelectedCalendarDate,
    newTitle,
    setNewTitle,
    inputRef,
    handleQuickAddTask,
    // Create Task Modal
    showCreateModal,
    setShowCreateModal,
    createTitle,
    setCreateTitle,
    createDescription,
    setCreateDescription,
    createDueDate,
    setCreateDueDate,
    createPriority,
    setCreatePriority,
    createIsFavorite,
    setCreateIsFavorite,
    createIsRecurring,
    setCreateIsRecurring,
    createRecurrenceInterval,
    setCreateRecurrenceInterval,
    createRecurrenceUnit,
    setCreateRecurrenceUnit,
    createShowCustomRecurrence,
    setCreateShowCustomRecurrence,
    createTagIds,
    setCreateTagIds,
    createSubtasks,
    createSubtaskTitle,
    setCreateSubtaskTitle,
    handleOpenCreateTask,
    handleCreateFromModal,
    handleAddCreateSubtask,
    handleToggleCreateSubtask,
    handleDeleteCreateSubtask,
    // Edit Task Modal
    editingTask,
    setEditingTask,
    editTitle,
    editDescription,
    editDueDate,
    setEditDueDate,
    editPriority,
    setEditPriority,
    editIsFavorite,
    editIsCompleted,
    editIsRecurring,
    setEditIsRecurring,
    editRecurrenceInterval,
    setEditRecurrenceInterval,
    editRecurrenceUnit,
    setEditRecurrenceUnit,
    editShowCustomRecurrence,
    setEditShowCustomRecurrence,
    editTagIds,
    setEditTagIds,
    editSubtasks,
    editSubtaskTitle,
    setEditSubtaskTitle,
    openEditTask,
    handleCloseEditModal,
    handleEditTitleChange,
    handleEditTitleBlur,
    handleEditDescriptionChange,
    handleEditDescriptionBlur,
    handleToggleEditFavorite,
    handleToggleEditStatus,
    handleAddEditSubtask,
    handleToggleEditSubtask,
    handleDeleteEditSubtask,
    autoSaveTask,
    // Tag Form Modal
    showTagModal,
    setShowTagModal,
    editingDailyTag,
    tagFormName,
    setTagFormName,
    tagFormColor,
    setTagFormColor,
    tagFormEmoji,
    setTagFormEmoji,
    isSavingTag,
    openCreateTag,
    openEditTag,
    handleSaveTag,
    handleDeleteTag,
    // Reschedule
    rescheduleTask,
    setRescheduleTask,
    showRescheduleDatePicker,
    setShowRescheduleDatePicker,
    handleRescheduleTask,
    // Data & state
    tasks,
    isLoading,
    manualRefreshing,
    handleRefresh,
    userTags,
    tagMap,
    todayStr,
    favoritesCount,
    upcomingWeekDays,
    displayedWeeks,
    filteredByTagAndStatus,
    sortedOverdueTasks,
    todayTasks,
    sortedTodayTasks,
    sortedAllTasks,
    todayTagGroups,
    allTagGroups,
    completedList,
    sortTasks,
    handleToggle,
    handleToggleFavorite,
    handleConvertToBucket,
    handleDelete,
    handleReorder,
    dragging,
    handleDraggingChange,
  };
}
