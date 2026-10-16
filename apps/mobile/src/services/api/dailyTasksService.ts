import { supabase } from '../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format } from 'date-fns';

export interface DailyTask {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  is_completed: boolean;
  position: number;
  due_date?: string | null; // 'YYYY-MM-DD'
  tag_ids?: string[];
  created_at: string;
  completed_at?: string | null;
}

const STORAGE_KEY = '@bucketlist_daily_tasks';

export const dailyTasksService = {
  async getTasks(userId?: string): Promise<DailyTask[]> {
    if (!userId) {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : [];
    }

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

    const tasks = (data ?? []).map((t) => ({
      ...t,
      description: t.description ?? null,
      due_date: t.due_date || format(new Date(), 'yyyy-MM-dd'),
      tag_ids: t.tag_ids || [],
    }));
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)).catch(() => {});
    return tasks;
  },

  async createTask(
    userId: string,
    payload: string | { title: string; description?: string | null; due_date?: string | null; tag_ids?: string[] }
  ): Promise<DailyTask> {
    const title = typeof payload === 'string' ? payload.trim() : payload.title.trim();
    const description = typeof payload === 'string' ? null : (payload.description?.trim() || null);
    const due_date = typeof payload === 'string'
      ? format(new Date(), 'yyyy-MM-dd')
      : payload.due_date || format(new Date(), 'yyyy-MM-dd');
    const tag_ids = typeof payload === 'string' ? [] : payload.tag_ids || [];

    const { data: first } = await supabase
      .from('daily_tasks')
      .select('position')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .limit(1);

    const position = first && first[0]?.position !== undefined ? first[0].position - 1 : 0;

    const { data, error } = await supabase
      .from('daily_tasks')
      .insert({
        user_id: userId,
        title,
        description,
        is_completed: false,
        position,
        due_date,
        tag_ids,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTask(id: string, updates: Partial<DailyTask>): Promise<DailyTask> {
    const { data, error } = await supabase
      .from('daily_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async toggleTask(id: string, isCompleted: boolean): Promise<DailyTask> {
    const { data, error } = await supabase
      .from('daily_tasks')
      .update({
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTask(id: string): Promise<void> {
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

  async clearCompleted(userId: string, due_date?: string): Promise<void> {
    let query = supabase
      .from('daily_tasks')
      .delete()
      .eq('user_id', userId)
      .eq('is_completed', true);

    if (due_date) {
      query = query.eq('due_date', due_date);
    }

    const { error } = await query;
    if (error) throw error;
  },
};
