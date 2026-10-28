import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';

export const NOTIFICATIONS_QUERY_KEY = ['notifications'];
export const UNREAD_COUNT_KEY = ['unreadNotificationsCount'];

const NOTIFICATION_ACTOR = 'actor:profiles!actor_id(id, username, display_name, avatar_url)';

function withEntityInfo(rows: any[], bucketMap: Map<string, any>, albumMap: Map<string, any>) {
  return rows.map((n: any) => ({
    ...n,
    bucketTitle: n.bucket_id ? bucketMap.get(n.bucket_id)?.title ?? null : null,
    bucketOwnerId: n.bucket_id ? bucketMap.get(n.bucket_id)?.user_id ?? null : null,
    albumTitle: n.album_id ? albumMap.get(n.album_id)?.title ?? null : null,
    albumOwnerId: n.album_id ? albumMap.get(n.album_id)?.owner_id ?? null : null,
  }));
}

async function fetchNotifications(userId: string) {
  // Camino rápido: una sola petición con los títulos de tarea/álbum incluidos (sin segunda ronda).
  const { data, error } = await supabase
    .from('notifications')
    .select(`
      *,
      ${NOTIFICATION_ACTOR},
      bucket:buckets!notifications_bucket_id_fkey(id, title, user_id),
      album:albums!notifications_album_id_fkey(id, title, owner_id)
    `)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (!error) {
    const rows = (data ?? []);
    const bucketMap = new Map<string, any>(rows.filter((n) => n.bucket).map((n) => [n.bucket_id, n.bucket]));
    const albumMap = new Map<string, any>(rows.filter((n) => n.album).map((n) => [n.album_id, n.album]));
    return withEntityInfo(rows, bucketMap, albumMap);
  }

  // Respaldo (por si la relación embebida no está disponible): dos consultas encadenadas.
  const { data: base, error: baseError } = await supabase
    .from('notifications')
    .select(`*, ${NOTIFICATION_ACTOR}`)
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  if (baseError) throw baseError;

  const rows = base ?? [];
  const bucketIds = [...new Set(rows.map((n: any) => n.bucket_id).filter(Boolean))] as string[];
  const albumIds = [...new Set(rows.map((n: any) => n.album_id).filter(Boolean))] as string[];
  const [bucketsRes, albumsRes] = await Promise.all([
    bucketIds.length
      ? supabase.from('buckets').select('id, title, user_id').in('id', bucketIds)
      : Promise.resolve({ data: [] as any[] }),
    albumIds.length
      ? supabase.from('albums').select('id, title, owner_id').in('id', albumIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const bucketMap = new Map<string, any>((bucketsRes.data ?? []).map((b: any) => [b.id, b]));
  const albumMap = new Map<string, any>((albumsRes.data ?? []).map((a: any) => [a.id, a]));
  return withEntityInfo(rows, bucketMap, albumMap);
}

export function useNotifications(userId?: string) {
  return useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, userId],
    queryFn: () => fetchNotifications(userId as string),
    enabled: !!userId,
  });
}

export function useUnreadCount(userId?: string) {
  const query = useQuery({
    queryKey: [...UNREAD_COUNT_KEY, userId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', userId)
        .eq('is_read', false);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
  });

  // La suscripción Realtime a notifications la gestiona useRealtimeSync (montado en el
  // layout raíz), que ya invalida 'notifications' y 'unreadNotificationsCount' en cada
  // INSERT. Tener aquí un canal duplicado generaba el doble de egress en WebSocket y
  // una cascada de re-fetches innecesarios.

  return query;
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    // Optimista: la notificación se marca como leída al instante, sin esperar a la red.
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      const snapshots = queryClient.getQueriesData<any[]>({ queryKey: NOTIFICATIONS_QUERY_KEY });
      let wasUnread = false;
      snapshots.forEach(([key, old]) => {
        if (!Array.isArray(old)) return;
        if (old.some((n) => n.id === id && !n.is_read)) wasUnread = true;
        queryClient.setQueryData(key, old.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      });
      if (wasUnread) {
        queryClient.setQueriesData<number>({ queryKey: UNREAD_COUNT_KEY }, (old) =>
          typeof old === 'number' ? Math.max(0, old - 1) : old,
        );
      }
      return { snapshots };
    },
    onError: (_err, _id, context) => {
      context?.snapshots?.forEach(([key, old]) => queryClient.setQueryData(key, old));
      void queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
    onSettled: () => {
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
        .update({ is_read: true })
        .eq('recipient_id', userId)
        .eq('is_read', false);
      if (error) throw error;
    },
    onMutate: async (userId: string) => {
      await queryClient.cancelQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY, userId] });
      await queryClient.cancelQueries({ queryKey: [...UNREAD_COUNT_KEY, userId] });

      const prevNotifications = queryClient.getQueryData([...NOTIFICATIONS_QUERY_KEY, userId]);
      const prevUnreadCount = queryClient.getQueryData([...UNREAD_COUNT_KEY, userId]);

      queryClient.setQueryData([...NOTIFICATIONS_QUERY_KEY, userId], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((n) => ({ ...n, is_read: true }));
      });
      queryClient.setQueryData([...UNREAD_COUNT_KEY, userId], 0);

      return { prevNotifications, prevUnreadCount, userId };
    },
    onError: (_err, _userId, context) => {
      if (context?.userId) {
        if (context.prevNotifications) {
          queryClient.setQueryData([...NOTIFICATIONS_QUERY_KEY, context.userId], context.prevNotifications);
        }
        if (context.prevUnreadCount !== undefined) {
          queryClient.setQueryData([...UNREAD_COUNT_KEY, context.userId], context.prevUnreadCount);
        }
      }
    },
    onSettled: (_data, _error, userId) => {
      void queryClient.invalidateQueries({ queryKey: [...NOTIFICATIONS_QUERY_KEY, userId] });
      void queryClient.invalidateQueries({ queryKey: [...UNREAD_COUNT_KEY, userId] });
      void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_KEY });
    },
  });
}
