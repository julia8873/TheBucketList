import type { DailyTaskPriority, DailyTaskRecurrenceUnit, DailySubtask } from '../../hooks/useDailyTasks';
import type { DailyTag } from '../../hooks/useDailyTags';
import type { CollaboratorItem } from '../../components/CollaboratorPickerSheet';
import type { DailyTask, DailyCompletion, DailyStats } from '../../services/api/dailyTasksService';

export type TimeView = 'today' | 'week' | 'calendar' | 'all';
export type StatusFilter = 'all' | 'pending' | 'completed';
export type PriorityFilter = 'all' | 'urgent' | 'high' | 'medium' | 'low';
export type DailySortField = 'manual' | 'priority' | 'name' | 'date';
export type DailySortDirection = 'asc' | 'desc';

export type {
  DailyTask,
  DailyCompletion,
  DailyStats,
  DailyTaskPriority,
  DailyTaskRecurrenceUnit,
  DailySubtask,
  DailyTag,
  CollaboratorItem,
};
