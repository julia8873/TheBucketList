import { supabase } from '../supabase';

const PAGE_SIZE = 10;

export const feedApi = {
  /**
   * "Momentos de amigos": tareas completadas por la gente a la que sigo (aceptada) y por mí.
   * La visibilidad de cada tarea la filtra RLS (privadas, solo seguidores, cuentas privadas).
   * Para incluir también tareas nuevas, añade 'new_bucket' al .in('type', [...]).
   */
  getFeed: async (userId: string, pageParam: number = 0) => {
    const { data: follows, error: followsErr } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('status', 'accepted');
    if (followsErr) throw followsErr;

    const targetIds = [...(follows ?? []).map((f: any) => f.following_id as string), userId];

    const { data, error } = await supabase
      .from('feed_events')
      .select(
        `
        *,
        actor:profiles!actor_id(id, username, display_name, avatar_url),
        bucket:buckets!inner(
          *,
          category:categories(slug),
          bucket_photos(thumb_path, storage_path),
          reactions(emoji, user_id),
          comments:comments(count)
        )
      `
      )
      .in('actor_id', targetIds)
      .in('type', ['completed'])
      .order('created_at', { ascending: false })
      .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

    if (error) throw error;

    const items = data ?? [];
    return {
      items,
      nextCursor: items.length === PAGE_SIZE ? pageParam + 1 : undefined,
    };
  },

  getExploreFeed: async (pageParam: number = 0) => {
    const limit = 15;
    const { data, error } = await supabase
      .from('buckets')
      .select(
        `
        *,
        user:profiles!buckets_user_id_fkey(id, username, display_name, avatar_url),
        category:categories(slug),
        bucket_photos(thumb_path, storage_path),
        reactions(emoji, user_id),
        comments:comments(count)
      `
      )
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .range(pageParam * limit, (pageParam + 1) * limit - 1);

    if (error) throw error;

    const items = data ?? [];
    return {
      items,
      nextCursor: items.length === limit ? pageParam + 1 : undefined,
    };
  },
};
