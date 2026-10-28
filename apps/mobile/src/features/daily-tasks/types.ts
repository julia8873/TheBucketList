import type { DailyTaskPriority, DailyTaskRecurrenceUnit, DailySubtask } from '../../hooks/useDailyTasks';
import type { DailyTag } from '../../hooks/useDailyTags';
import type { DailyTask, DailyCompletion, DailyStats } from '../../services/api/dailyTasksService';

export type TimeView = 'today' | 'week' | 'calendar' | 'all';
export type StatusFilter = 'all' | 'pending' | 'completed';
export type PriorityFilter = 'all' | 'urgent' | 'high' | 'medium' | 'low';
export type DailySortField = 'manual' | 'priority' | 'name' | 'date' | 'created_at';
export type DailySortDirection = 'asc' | 'desc';

export type {
  DailyTask,
  DailyCompletion,
  DailyStats,
  DailyTaskPriority,
  DailyTaskRecurrenceUnit,
  DailySubtask,
  DailyTag,
};
