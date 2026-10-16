import { supabase } from '../supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DailyTask {
  id: string;
  user_id: string;
  title: string;
  is_completed: boolean;
  position: number;
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

    const tasks = data ?? [];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)).catch(() => {});
    return tasks;
  },

  async createTask(userId: string, title: string): Promise<DailyTask> {
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
        title: title.trim(),
        is_completed: false,
        position,
      })
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

  async updateTitle(id: string, title: string): Promise<DailyTask> {
    const { data, error } = await supabase
      .from('daily_tasks')
      .update({ title: title.trim() })
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
    const updates = orderedIds.map((id, index) =>
      supabase
        .from('daily_tasks')
        .update({ position: index })
        .eq('id', id)
    );
    await Promise.all(updates);
  },

  async clearCompleted(userId: string): Promise<void> {
    const { error } = await supabase
      .from('daily_tasks')
      .delete()
      .eq('user_id', userId)
      .eq('is_completed', true);

    if (error) throw error;
  },
};
