import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  dailyTasksService,
  type DailyTask,
  type DailyCompletion,
  type DailyStats,
  type DailyTaskPriority,
  type DailyTaskRecurrenceUnit,
  type DailySubtask,
} from '../services/api/dailyTasksService';
export type { DailyTaskPriority, DailyTaskRecurrenceUnit, DailySubtask };
import { useAuthStore } from '../stores/auth.store';
import { triggerTaskCompletedHaptic } from '../stores/haptics.store';
import { format } from 'date-fns';
import { toast } from '@bucketlist/ui';
import { i18n } from '@bucketlist/shared';

export const DAILY_TASKS_QUERY_KEY = ['daily_tasks'];
export const DAILY_STATS_QUERY_KEY = ['daily_task_stats'];

export function useDailyTaskStats() {
  const { user } = useAuthStore();
  const userId = user?.id;

  return useQuery({
    queryKey: [...DAILY_STATS_QUERY_KEY, userId],
    queryFn: () => dailyTasksService.getDailyStats(userId),
    enabled: !!userId,
  });
}

export function useDailyTasks() {
  const { user } = useAuthStore();
  const userId = user?.id;

  return useQuery({
    queryKey: [...DAILY_TASKS_QUERY_KEY, userId],
    queryFn: () => dailyTasksService.getTasks(userId),
    enabled: !!userId,
  });
}

export function useCreateDailyTask() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (
      payload:
        | string
        | {
            title: string;
            description?: string | null;
            due_date?: string | null;
            tag_ids?: string[];
            collaborator_ids?: string[];
            priority?: DailyTaskPriority;
            is_favorite?: boolean;
            is_recurring?: boolean;
            recurrence_interval?: number;
            recurrence_unit?: DailyTaskRecurrenceUnit;
            subtasks?: DailySubtask[];
          }
    ) => {
      if (!userId) throw new Error('Usuario no autenticado');
      return dailyTasksService.createTask(userId, payload);
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
      const previous = queryClient.getQueryData<DailyTask[]>([...DAILY_TASKS_QUERY_KEY, userId]) || [];

      const title = typeof payload === 'string' ? payload.trim() : payload.title.trim();
      const description = typeof payload === 'string' ? null : payload.description?.trim() || null;
      const due_date = typeof payload === 'string'
        ? format(new Date(), 'yyyy-MM-dd')
        : payload.due_date || format(new Date(), 'yyyy-MM-dd');
      const tag_ids = typeof payload === 'string' ? [] : payload.tag_ids || [];
      const collaborator_ids = typeof payload === 'string' ? [] : payload.collaborator_ids || [];
      const priority = typeof payload === 'string' ? 'medium' : payload.priority || 'medium';
      const is_favorite = typeof payload === 'string' ? false : Boolean(payload.is_favorite);
      const is_recurring = typeof payload === 'string' ? false : Boolean(payload.is_recurring);
      const recurrence_interval = typeof payload === 'string' ? 1 : Math.max(1, payload.recurrence_interval || 1);
      const recurrence_unit = typeof payload === 'string' ? 'days' : payload.recurrence_unit || 'days';
      const subtasks = typeof payload === 'string' ? [] : payload.subtasks || [];

      const optimisticTask: DailyTask = {
        id: `temp-${Date.now()}`,
        user_id: userId || '',
        title,
        description,
        is_completed: false,
        position: (previous[0]?.position ?? 0) - 1,
        due_date,
        tag_ids,
        collaborator_ids,
        priority,
        is_favorite,
        is_recurring,
        recurrence_interval,
        recurrence_unit,
        subtasks,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<DailyTask[]>([...DAILY_TASKS_QUERY_KEY, userId], [
        optimisticTask,
        ...previous,
      ]);

      return { previous };
    },
    onSuccess: (savedTask) => {
      toast.success(i18n.t('daily.task_created_toast'));
      queryClient.setQueryData<DailyTask[]>([...DAILY_TASKS_QUERY_KEY, userId], (old: DailyTask[] | undefined) => {
        const list = old || [];
        const filtered = list.filter((t: DailyTask) => !t.id.startsWith('temp-'));
        if (!filtered.some((t: DailyTask) => t.id === savedTask.id)) {
          return [savedTask, ...filtered];
        }
        return filtered;
      });
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData([...DAILY_TASKS_QUERY_KEY, userId], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
    },
  });
}

export function useUpdateDailyTask() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DailyTask> }) => {
      return dailyTasksService.updateTask(id, updates);
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
      const previous = queryClient.getQueryData<DailyTask[]>([...DAILY_TASKS_QUERY_KEY, userId]) || [];

      queryClient.setQueryData<DailyTask[]>(
        [...DAILY_TASKS_QUERY_KEY, userId],
        previous.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([...DAILY_TASKS_QUERY_KEY, userId], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
    },
  });
}

export function useToggleDailyTask() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  return useMutation({
    mutationFn: async ({ id, isCompleted }: { id: string; isCompleted: boolean }) => {
      return dailyTasksService.toggleTask(id, isCompleted);
    },
    onMutate: async ({ id, isCompleted }) => {
      if (isCompleted) {
        triggerTaskCompletedHaptic();
      }
      await queryClient.cancelQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
      const previous = queryClient.getQueryData<DailyTask[]>([...DAILY_TASKS_QUERY_KEY, userId]) || [];

      queryClient.setQueryData<DailyTask[]>(
        [...DAILY_TASKS_QUERY_KEY, userId],
        previous.map((t) =>
          t.id === id
            ? { ...t, is_completed: isCompleted, completed_at: isCompleted ? new Date().toISOString() : null }
            : t
        )
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([...DAILY_TASKS_QUERY_KEY, userId], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
    },
  });
}

export function useCompleteDailyTask() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (task: DailyTask) => {
      return dailyTasksService.completeTask(task);
    },
    onMutate: async (task) => {
      triggerTaskCompletedHaptic();
      await queryClient.cancelQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });

      const previousTasks = queryClient.getQueryData<DailyTask[]>([...DAILY_TASKS_QUERY_KEY, userId]) || [];
      const nowIso = new Date().toISOString();

      // Optimistic update en daily_tasks (se marca como completada, NO se borra)
      queryClient.setQueryData<DailyTask[]>(
        [...DAILY_TASKS_QUERY_KEY, userId],
        previousTasks.map((t) =>
          t.id === task.id
            ? { ...t, is_completed: true, completed_at: nowIso }
            : t
        )
      );

      return { previousTasks };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData([...DAILY_TASKS_QUERY_KEY, userId], context.previousTasks);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
      void queryClient.invalidateQueries({ queryKey: [...DAILY_STATS_QUERY_KEY, userId] });
    },
  });
}

export function useCompleteRecurringDailyTask() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  return useMutation({
    mutationFn: async ({
      task,
      nextDueDate,
      resetSubtasks,
    }: {
      task: DailyTask;
      nextDueDate: string;
      resetSubtasks?: DailySubtask[];
    }) => {
      return dailyTasksService.completeRecurringTask({ task, nextDueDate, resetSubtasks });
    },
    onMutate: async ({ task, nextDueDate, resetSubtasks = [] }) => {
      triggerTaskCompletedHaptic();
      await queryClient.cancelQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });

      const previousTasks = queryClient.getQueryData<DailyTask[]>([...DAILY_TASKS_QUERY_KEY, userId]) || [];

      // Optimistic update: advance task to nextDueDate and keep is_completed false
      queryClient.setQueryData<DailyTask[]>(
        [...DAILY_TASKS_QUERY_KEY, userId],
        previousTasks.map((t) =>
          t.id === task.id
            ? {
                ...t,
                due_date: nextDueDate,
                is_completed: false,
                completed_at: null,
                subtasks: resetSubtasks,
              }
            : t
        )
      );

      return { previousTasks };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData([...DAILY_TASKS_QUERY_KEY, userId], context.previousTasks);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
      void queryClient.invalidateQueries({ queryKey: [...DAILY_STATS_QUERY_KEY, userId] });
    },
  });
}

export function useDeleteDailyTask() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (id: string) => {
      return dailyTasksService.deleteTask(id);
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
      const previous = queryClient.getQueryData<DailyTask[]>([...DAILY_TASKS_QUERY_KEY, userId]) || [];

      queryClient.setQueryData<DailyTask[]>(
        [...DAILY_TASKS_QUERY_KEY, userId],
        previous.filter((t) => t.id !== id)
      );

      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData([...DAILY_TASKS_QUERY_KEY, userId], context.previous);
      }
    },
    onSuccess: () => {
      toast.success(i18n.t('daily.task_deleted_toast'));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
    },
  });
}

export function useReorderDailyTasks() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      return dailyTasksService.reorderTasks(orderedIds);
    },
    onMutate: async (orderedIds) => {
      await queryClient.cancelQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
      const previous = queryClient.getQueryData<DailyTask[]>([...DAILY_TASKS_QUERY_KEY, userId]) || [];

      const map = new Map(previous.map((t) => [t.id, t]));
      const next: DailyTask[] = [];
      orderedIds.forEach((id, idx) => {
        const item = map.get(id);
        if (item) next.push({ ...item, position: idx });
      });
      previous.forEach((t) => {
        if (!orderedIds.includes(t.id)) next.push(t);
      });

      queryClient.setQueryData<DailyTask[]>([...DAILY_TASKS_QUERY_KEY, userId], next);

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([...DAILY_TASKS_QUERY_KEY, userId], context.previous);
      }
    },
  });
}

export function useClearCompletedDailyTasks() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (due_date?: string) => {
      if (!userId) return;
      return dailyTasksService.clearCompleted(userId, due_date);
    },
    onMutate: async (due_date) => {
      await queryClient.cancelQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
      const previous = queryClient.getQueryData<DailyTask[]>([...DAILY_TASKS_QUERY_KEY, userId]) || [];

      queryClient.setQueryData<DailyTask[]>(
        [...DAILY_TASKS_QUERY_KEY, userId],
        previous.filter((t) => {
          if (!t.is_completed) return true;
          if (due_date && t.due_date !== due_date) return true;
          return false;
        })
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([...DAILY_TASKS_QUERY_KEY, userId], context.previous);
      }
    },
    onSuccess: () => {
      toast.success(i18n.t('daily.completed_cleared_toast'));
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
    },
  });
}

export function useConvertToBucket() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  return useMutation({
    mutationFn: async ({ task, deleteDaily = true }: { task: DailyTask; deleteDaily?: boolean }) => {
      return dailyTasksService.convertToBucket(task, deleteDaily);
    },
    onSuccess: () => {
      toast.success(i18n.t('daily.converted_to_bucket_toast'));
      void queryClient.invalidateQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
      void queryClient.invalidateQueries({ queryKey: DAILY_TASKS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['buckets'] });
      void queryClient.invalidateQueries({ queryKey: ['unassigned_tasks'] });
    },
  });
}

export function useMoveTasksToDate() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  return useMutation({
    mutationFn: async ({ ids, date }: { ids: string[]; date: string }) => {
      return dailyTasksService.moveTasksToDate(ids, date);
    },
    onMutate: async ({ ids, date }) => {
      await queryClient.cancelQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
      const previous = queryClient.getQueryData<DailyTask[]>([...DAILY_TASKS_QUERY_KEY, userId]) || [];
      queryClient.setQueryData<DailyTask[]>(
        [...DAILY_TASKS_QUERY_KEY, userId],
        previous.map((t) => (ids.includes(t.id) ? { ...t, due_date: date } : t))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([...DAILY_TASKS_QUERY_KEY, userId], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
    },
  });
}

export function useCompleteMultipleDailyTasks() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (tasks: DailyTask[]) => {
      return dailyTasksService.completeTasks(tasks);
    },
    onMutate: async (tasks) => {
      if (tasks.length > 0) {
        triggerTaskCompletedHaptic();
      }
      await queryClient.cancelQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
      const previous = queryClient.getQueryData<DailyTask[]>([...DAILY_TASKS_QUERY_KEY, userId]) || [];
      const ids = tasks.map((t) => t.id);
      const nowIso = new Date().toISOString();
      queryClient.setQueryData<DailyTask[]>(
        [...DAILY_TASKS_QUERY_KEY, userId],
        previous.map((t) => (ids.includes(t.id) ? { ...t, is_completed: true, completed_at: nowIso } : t))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([...DAILY_TASKS_QUERY_KEY, userId], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
    },
  });
}

export function useDeleteMultipleDailyTasks() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (ids: string[]) => {
      return dailyTasksService.deleteTasks(ids);
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
      const previous = queryClient.getQueryData<DailyTask[]>([...DAILY_TASKS_QUERY_KEY, userId]) || [];
      queryClient.setQueryData<DailyTask[]>(
        [...DAILY_TASKS_QUERY_KEY, userId],
        previous.filter((t) => !ids.includes(t.id))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData([...DAILY_TASKS_QUERY_KEY, userId], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
    },
  });
}
