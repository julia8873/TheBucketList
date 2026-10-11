import { supabase } from '../supabase';

const PAGE_SIZE = 10;

export const feedApi = {
  /**
   * "Momentos de amigos": tareas completadas únicamente por la gente a la que sigo (aceptada).
   * Se excluyen explícitamente las tareas del propio usuario.
   */
  getFeed: async (userId: string, pageParam: number = 0) => {
    const { data: follows, error: followsErr } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('status', 'accepted');
    if (followsErr) throw followsErr;

    // Solo amigos seguidos (excluyendo al propio usuario)
    const targetIds = (follows ?? [])
      .map((f: any) => f.following_id as string)
      .filter((id: string) => id !== userId);

    if (targetIds.length === 0) {
      return {
        items: [],
        nextCursor: undefined,
      };
    }

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
      .neq('actor_id', userId)
      .in('type', ['completed'])
      .order('created_at', { ascending: false })
      .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

    if (error) throw error;

    // Filtrar cualquier evento o tarea que pertenezca al propio usuario
    const items = (data ?? []).filter(
      (item: any) => item.actor_id !== userId && item.bucket?.user_id !== userId
    );
    return {
      items,
      nextCursor: (data ?? []).length === PAGE_SIZE ? pageParam + 1 : undefined,
    };
  },

  getExploreFeed: async (pageParam: number = 0, userId?: string) => {
    const limit = 15;
    let query = supabase
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
      .order('created_at', { ascending: false });

    // Excluir tareas del propio usuario en explorar
    if (userId) {
      query = query.neq('user_id', userId);
    }

    const { data, error } = await query.range(
      pageParam * limit,
      (pageParam + 1) * limit - 1
    );

    if (error) throw error;

    const items = (data ?? []).filter((b: any) => !userId || b.user_id !== userId);
    return {
      items,
      nextCursor: (data ?? []).length === limit ? pageParam + 1 : undefined,
    };
  },
};
