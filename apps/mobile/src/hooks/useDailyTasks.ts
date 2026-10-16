import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dailyTasksService, type DailyTask } from '../services/api/dailyTasksService';
import { useAuthStore } from '../stores/auth.store';

export const DAILY_TASKS_QUERY_KEY = ['daily_tasks'];

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
    mutationFn: async (title: string) => {
      if (!userId) throw new Error('Usuario no autenticado');
      return dailyTasksService.createTask(userId, title);
    },
    onMutate: async (newTitle) => {
      await queryClient.cancelQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
      const previous = queryClient.getQueryData<DailyTask[]>([...DAILY_TASKS_QUERY_KEY, userId]) || [];

      const optimisticTask: DailyTask = {
        id: `temp-${Date.now()}`,
        user_id: userId || '',
        title: newTitle.trim(),
        is_completed: false,
        position: (previous[0]?.position ?? 0) - 1,
        created_at: new Date().toISOString(),
      };

      queryClient.setQueryData<DailyTask[]>([...DAILY_TASKS_QUERY_KEY, userId], [
        optimisticTask,
        ...previous,
      ]);

      return { previous };
    },
    onError: (_err, _newTitle, context) => {
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
      // Append any items that were not in orderedIds (e.g. completed if reordering pending)
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
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
    },
  });
}

export function useClearCompletedDailyTasks() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  return useMutation({
    mutationFn: async () => {
      if (!userId) return;
      return dailyTasksService.clearCompleted(userId);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [...DAILY_TASKS_QUERY_KEY, userId] });
      const previous = queryClient.getQueryData<DailyTask[]>([...DAILY_TASKS_QUERY_KEY, userId]) || [];

      queryClient.setQueryData<DailyTask[]>(
        [...DAILY_TASKS_QUERY_KEY, userId],
        previous.filter((t) => !t.is_completed)
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
