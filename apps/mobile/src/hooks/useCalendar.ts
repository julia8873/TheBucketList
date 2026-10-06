import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

export const CALENDAR_QUERY_KEY = ['calendar_month'];

export interface CalendarTask {
  id: string;
  title: string;
  status: string;
  visibility: string;
  urgency: 'none' | 'expired' | 'today' | 'normal';
}

export interface CalendarDay {
  date: string;
  tasks: CalendarTask[];
}

export function useCalendar(userId: string | undefined, year: number, month: number, tz: string = 'UTC') {
  return useQuery({
    queryKey: [...CALENDAR_QUERY_KEY, userId, year, month, tz],
    queryFn: async (): Promise<CalendarDay[]> => {
      if (!userId) return [];
      
      const { data, error } = await supabase.rpc('calendar_month', {
        p_user_id: userId,
        p_year: year,
        p_month: month,
        p_tz: tz,
      });

      if (error) {
        throw error;
      }

      // The RPC returns jsonb which maps directly to CalendarDay[]
      return data as CalendarDay[];
    },
    enabled: !!userId,
  });
}
