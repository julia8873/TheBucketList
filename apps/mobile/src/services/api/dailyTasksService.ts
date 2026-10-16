import { supabase } from '../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';

export type DailyTaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type DailyTaskRecurrenceUnit = 'days' | 'weeks' | 'months';

export interface DailySubtask {
  id: string;
  title: string;
  is_completed: boolean;
  position?: number;
}

export interface DailyTask {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  priority?: DailyTaskPriority;
  is_favorite?: boolean;
  is_recurring?: boolean;
  recurrence_interval?: number;
  recurrence_unit?: DailyTaskRecurrenceUnit;
  is_completed: boolean;
  position: number;
  due_date?: string | null; // 'YYYY-MM-DD'
  tag_ids?: string[];
  collaborator_ids?: string[];
  subtasks?: DailySubtask[];
  created_at: string;
  completed_at?: string | null;
}

export interface DailyCompletion {
  id: string;
  user_id: string;
  task_title: string;
  is_favorite?: boolean;
  is_recurring?: boolean;
  recurrence_interval?: number;
  recurrence_unit?: DailyTaskRecurrenceUnit;
  completed_at: string;
  completed_date: string;
  due_date?: string | null;
  tag_ids?: string[];
  collaborator_ids?: string[];
  subtasks?: DailySubtask[];
}

export interface DailyStats {
  todayCount: number;
  totalCount: number;
  completionsToday: DailyCompletion[];
}

const STORAGE_KEY = '@bucketlist_daily_tasks';

export const dailyTasksService = {
  async getTasks(userId?: string): Promise<DailyTask[]> {
    if (!userId) {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
    }

    // Limpiar en segundo plano las tareas completadas de hace más de un día
    void this.cleanupOldCompletedTasks(userId);

    const { data, error } = await supabase
      .from('daily_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error fetching daily tasks, reading from storage:', error.message);
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
    }

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const tasks = (data ?? [])
      .map((t) => ({
        ...t,
        description: t.description ?? null,
        due_date: t.due_date || format(new Date(), 'yyyy-MM-dd'),
        tag_ids: t.tag_ids || [],
        collaborator_ids: t.collaborator_ids || [],
        subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
        priority: (t.priority || 'medium') as DailyTaskPriority,
      }))
      // Filtrar por si acaso alguna completada de hace más de un día aún no se borró (las favoritas nunca se borran)
      .filter((t) => {
        if (!t.is_completed) return true;
        if (t.is_favorite) return true;
        if (!t.completed_at) return true;
        const compDate = format(new Date(t.completed_at), 'yyyy-MM-dd');
        return compDate >= todayStr;
      });

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)).catch(() => {});
    return tasks;
  },

  /**
   * Limpia únicamente las tareas completadas hace más de un día.
   * Guarda estadísticas en daily_task_completions antes de borrarlas.
   */
  async cleanupOldCompletedTasks(userId: string): Promise<void> {
    try {
      const todayStr = format(new Date(), 'yyyy-MM-dd');

      const { data: completedTasks } = await supabase
        .from('daily_tasks')
        .select('*')
        .eq('user_id', userId)
        .eq('is_completed', true);

      if (!completedTasks || completedTasks.length === 0) return;

      const oldCompleted = completedTasks.filter((t) => {
        if (t.is_favorite) return false;
        if (!t.completed_at) return false;
        const compDate = format(new Date(t.completed_at), 'yyyy-MM-dd');
        return compDate < todayStr;
      });

      if (oldCompleted.length === 0) return;

      // Borrar de daily_tasks únicamente las tareas completadas de días anteriores
      const idsToDelete = oldCompleted.map((t) => t.id);
      await supabase.from('daily_tasks').delete().in('id', idsToDelete);
    } catch (e) {
      console.warn('Error in cleanupOldCompletedTasks:', e);
    }
  },

  async getDailyStats(userId?: string): Promise<DailyStats> {
    if (!userId) return { todayCount: 0, totalCount: 0, completionsToday: [] };
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const { data: todayData } = await supabase
      .from('daily_task_completions')
      .select('*')
      .eq('user_id', userId)
      .eq('completed_date', todayStr)
      .order('completed_at', { ascending: false });

    const { count } = await supabase
      .from('daily_task_completions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    return {
      todayCount: todayData?.length ?? 0,
      totalCount: count ?? (todayData?.length ?? 0),
      completionsToday: (todayData ?? []) as DailyCompletion[],
    };
  },

  async createTask(
    userId: string,
    payload: string | {
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
  ): Promise<DailyTask> {
    const title = typeof payload === 'string' ? payload.trim() : payload.title.trim();
    const description = typeof payload === 'string' ? null : (payload.description?.trim() || null);
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

    const { data: first } = await supabase
      .from('daily_tasks')
      .select('position')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .limit(1);

    const position = first && first[0]?.position !== undefined ? first[0].position - 1 : 0;

    let res = await supabase
      .from('daily_tasks')
      .insert({
        user_id: userId,
        title,
        description,
        is_completed: false,
        position,
        due_date,
        tag_ids,
        collaborator_ids,
        priority,
        is_favorite,
        is_recurring,
        recurrence_interval,
        recurrence_unit,
        subtasks,
      })
      .select()
      .single();

    // Si falló por columnas nuevas aún no presentes en caché de PostgREST
    if (res.error && (res.error.code === 'PGRST204' || /column.*does not exist/i.test(res.error.message || ''))) {
      res = await supabase
        .from('daily_tasks')
        .insert({
          user_id: userId,
          title,
          is_completed: false,
          position,
          due_date,
        })
        .select()
        .single();
    }

    if (res.error) {
      console.warn('Error inserting daily task to Supabase, saving locally:', res.error);
      const localTask: DailyTask = {
        id: 'daily_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        user_id: userId,
        title,
        description,
        is_completed: false,
        position,
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

      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        const list: DailyTask[] = cached ? JSON.parse(cached) : [];
        list.unshift(localTask);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      } catch {}

      return localTask;
    }

    // Actualizar cache local
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      const list: DailyTask[] = cached ? JSON.parse(cached) : [];
      list.unshift(res.data);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}

    return res.data;
  },

  async updateTask(id: string, updates: Partial<DailyTask>): Promise<DailyTask> {
    const { data, error } = await supabase
      .from('daily_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // Fallback local
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        if (cached) {
          const list: DailyTask[] = JSON.parse(cached);
          const updated = list.map((t) => (t.id === id ? { ...t, ...updates } : t));
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          const found = updated.find((t) => t.id === id);
          if (found) return found;
        }
      } catch {}
      throw error;
    }
    return data;
  },

  async toggleTask(id: string, isCompleted: boolean): Promise<DailyTask> {
    return this.updateTask(id, {
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
    });
  },

  async completeTask(task: DailyTask): Promise<void> {
    await this.updateTask(task.id, {
      is_completed: true,
      completed_at: new Date().toISOString(),
    });
  },

  async completeRecurringTask(payload: {
    task: DailyTask;
    nextDueDate: string;
    resetSubtasks?: DailySubtask[];
  }): Promise<DailyTask> {
    const { task, nextDueDate, resetSubtasks = [] } = payload;
    const nowIso = new Date().toISOString();
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // 1. Guardar registro en daily_task_completions para historial y estadísticas
    try {
      await supabase.from('daily_task_completions').insert({
        user_id: task.user_id,
        task_title: task.title,
        is_favorite: task.is_favorite,
        is_recurring: true,
        recurrence_interval: task.recurrence_interval || 1,
        recurrence_unit: task.recurrence_unit || 'days',
        completed_at: nowIso,
        completed_date: todayStr,
        due_date: task.due_date,
        tag_ids: task.tag_ids || [],
        collaborator_ids: task.collaborator_ids || [],
        subtasks: task.subtasks || [],
      });
    } catch (e) {
      console.warn('Error saving recurring task completion:', e);
    }

    // 2. Avanzar la tarea a la siguiente fecha, reseteando is_completed a false y subtasks
    return this.updateTask(task.id, {
      due_date: nextDueDate,
      is_completed: false,
      completed_at: null,
      subtasks: resetSubtasks,
    });
  },

  async deleteTask(id: string): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const list: DailyTask[] = JSON.parse(cached);
        const filtered = list.filter((t) => t.id !== id);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch {}

    const { error } = await supabase
      .from('daily_tasks')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async reorderTasks(orderedIds: string[]): Promise<void> {
    if (!orderedIds.length) return;
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const tasks: DailyTask[] = JSON.parse(cached);
        const map = new Map(tasks.map((t) => [t.id, t]));
        const reordered: DailyTask[] = [];
        orderedIds.forEach((id, idx) => {
          const item = map.get(id);
          if (item) reordered.push({ ...item, position: idx });
        });
        tasks.forEach((t) => {
          if (!orderedIds.includes(t.id)) reordered.push(t);
        });
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reordered));
      }
    } catch {}

    const updates = orderedIds.map((id, index) =>
      supabase
        .from('daily_tasks')
        .update({ position: index })
        .eq('id', id)
    );
    await Promise.all(updates);
  },

  async moveTasksToDate(ids: string[], date: string): Promise<void> {
    if (!ids.length) return;
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const list: DailyTask[] = JSON.parse(cached);
        const updated = list.map((t) => (ids.includes(t.id) ? { ...t, due_date: date } : t));
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {}

    const { error } = await supabase
      .from('daily_tasks')
      .update({ due_date: date })
      .in('id', ids);

    if (error) throw error;
  },

  async completeTasks(tasks: DailyTask[]): Promise<void> {
    if (!tasks.length) return;
    const nowIso = new Date().toISOString();
    const ids = tasks.map((t) => t.id);

    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const list: DailyTask[] = JSON.parse(cached);
        const updated = list.map((t) =>
          ids.includes(t.id) ? { ...t, is_completed: true, completed_at: nowIso } : t
        );
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {}

    const { error } = await supabase
      .from('daily_tasks')
      .update({ is_completed: true, completed_at: nowIso })
      .in('id', ids);

    if (error) throw error;
  },

  async deleteTasks(ids: string[]): Promise<void> {
    if (!ids.length) return;
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) {
        const list: DailyTask[] = JSON.parse(cached);
        const filtered = list.filter((t) => !ids.includes(t.id));
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch {}

    const { error } = await supabase
      .from('daily_tasks')
      .delete()
      .in('id', ids);

    if (error) throw error;
  },

  async clearCompleted(userId: string, due_date?: string): Promise<void> {
    let query = supabase
      .from('daily_tasks')
      .delete()
      .eq('user_id', userId)
      .eq('is_completed', true)
      .neq('is_favorite', true);

    if (due_date) {
      query = query.eq('due_date', due_date);
    }

    const { error } = await query;
    if (error) throw error;
  },

  async convertToBucket(task: DailyTask, deleteDaily: boolean = true): Promise<any> {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');

    const deadline = task.due_date ? new Date(`${task.due_date}T12:00:00Z`).toISOString() : null;

    const { data: bucket, error: bucketError } = await supabase
      .from('buckets')
      .insert({
        user_id: userData.user.id,
        title: task.title,
        description: task.description || null,
        priority: task.priority || 'medium',
        status: task.is_completed ? 'completed' : 'pending',
        completed_at: task.completed_at || null,
        deadline,
        visibility: 'private',
      })
      .select()
      .single();

    if (bucketError) throw bucketError;

    // Colaboradores vinculados si los hubiera
    if (task.collaborator_ids && task.collaborator_ids.length > 0) {
      try {
        const collabRows = task.collaborator_ids.map((collabId) => ({
          bucket_id: bucket.id,
          user_id: collabId,
          role: 'collaborator',
          status: 'accepted',
        }));
        await supabase.from('bucket_collaborators').insert(collabRows);
      } catch (collabErr) {
        console.warn('Error copying collaborators to bucket:', collabErr);
      }
    }

    // Subtareas vinculadas si las hubiera
    if (task.subtasks && task.subtasks.length > 0) {
      try {
        const subtaskRows = task.subtasks.map((st, idx) => ({
          bucket_id: bucket.id,
          title: st.title,
          done: Boolean(st.is_completed),
          position: idx,
        }));
        await supabase.from('item_subtasks').insert(subtaskRows);
      } catch (subErr) {
        console.warn('Error copying subtasks to item_subtasks:', subErr);
      }
    }

    if (deleteDaily) {
      await supabase.from('daily_tasks').delete().eq('id', task.id);
    }

    return bucket;
  },
};
