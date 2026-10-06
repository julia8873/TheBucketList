import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'];
export const UNREAD_COUNT_KEY = ['unreadNotificationsCount'];

export function useNotifications(userId?: string) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          actor:profiles!actor_id(*)
        `)
        .eq('recipient_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useUnreadCount(userId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...UNREAD_COUNT_KEY, userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('read', false);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;

    // Realtime subscription
    const channel = supabase.channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: [...UNREAD_COUNT_KEY, userId] });
          void queryClient.invalidateQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY, userId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: [...UNREAD_COUNT_KEY, userId] });
          void queryClient.invalidateQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY, userId] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return query;
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      // Opting for invalidation to let Realtime or next fetch sync it, or update manually
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_id', userId)
        .eq('read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}
