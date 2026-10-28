import { supabase } from '@/services/supabase';
import type { QueryClient } from '@tanstack/react-query';

/**
 * Consultas de la pantalla de una tarea, compartidas entre `useBucketDetailState` y el
 * precargado (`prefetchBucketDetail`). Al pulsar una notificación se lanzan antes de navegar,
 * así la tarea (y la tarjeta de invitación) ya está en caché cuando se abre la pantalla.
 */

export async function fetchBucketDetail(id: string) {
  const { data, error } = await supabase
    .from('buckets')
    .select(`
      *,
      user:profiles!buckets_user_id_fkey(*),
      category:categories(*),
      item_subtasks(*),
      bucket_photos(*),
      album_items(album_id)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function fetchBucketCollaborators(id: string) {
  const { data, error } = await supabase
    .from('bucket_collaborators')
    .select('user_id, status, origin, profiles:user_id(id, username, display_name, avatar_url)')
    .eq('bucket_id', id);
  if (error) {
    console.warn('Error fetching collaborators:', error);
    return [];
  }
  return (data || []).map((row: any) => {
    const p = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    return {
      id: row.user_id,
      username: p?.username || '',
      display_name: p?.display_name || null,
      avatar_url: p?.avatar_url || null,
      status: row.status,
      origin: (row.origin as 'invite' | 'request' | undefined) ?? undefined,
    };
  });
}

export async function fetchBucketParticipants(id: string) {
  const { data, error } = await supabase.rpc('get_bucket_participants', { p_bucket_id: id });
  if (error) {
    console.warn('Error fetching participants:', error);
    return [];
  }
  return (data || []).map((r: any) => ({
    id: r.id as string,
    username: r.username || '',
    display_name: r.display_name || null,
    avatar_url: r.avatar_url || null,
    status: ((r.status as string) || 'accepted') as 'accepted' | 'pending',
    isOwner: !!r.is_owner,
  }));
}

/** Lanza en paralelo las consultas principales de la tarea para que estén en caché al abrirla. */
export function prefetchBucketDetail(queryClient: QueryClient, id?: string | null) {
  if (!id) return;
  void queryClient.prefetchQuery({ queryKey: ['bucketDetail', id], queryFn: () => fetchBucketDetail(id) });
  void queryClient.prefetchQuery({ queryKey: ['bucketCollaborators', id], queryFn: () => fetchBucketCollaborators(id) });
  void queryClient.prefetchQuery({ queryKey: ['bucketParticipants', id], queryFn: () => fetchBucketParticipants(id) });
}
