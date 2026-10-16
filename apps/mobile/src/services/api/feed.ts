import { supabase } from '../supabase';

const PAGE_SIZE = 10;

export const feedApi = {
  /**
   * "Momentos de amigos": todas las tareas públicas y para seguidores de la gente a la que sigo.
   * Se excluyen las tareas del propio usuario.
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

    // Obtenemos todas las tareas públicas y visibles para seguidores de nuestros amigos
    const { data, error } = await supabase
      .from('buckets')
      .select(
        `
        *,
        actor:profiles!buckets_user_id_fkey(id, username, display_name, avatar_url),
        category:categories(slug),
        bucket_photos(id, thumb_path, storage_path, created_at),
        reactions(emoji, user_id),
        comments:comments(count)
      `
      )
      .in('user_id', targetIds)
      .in('visibility', ['public', 'followers'])
      .order('created_at', { ascending: false })
      .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1);

    if (error) throw error;

    // Mapear al formato que espera FeedCard y la lista de amigos
    const items = (data ?? [])
      .filter((b: any) => b.user_id !== userId && targetIds.includes(b.user_id))
      .map((b: any) => ({
        id: b.id,
        actor_id: b.user_id,
        bucket_id: b.id,
        actor: b.actor,
        bucket: b,
        type: b.status === 'completed' ? 'completed' : 'new_bucket',
        created_at: b.completed_at || b.created_at,
      }));

    return {
      items,
      nextCursor: (data ?? []).length === PAGE_SIZE ? pageParam + 1 : undefined,
    };
  },

  /**
   * "Explorar": tareas públicas de personas a las que el usuario NO sigue (y que no sean del propio usuario).
   */
  getExploreFeed: async (pageParam: number = 0, userId?: string) => {
    const limit = 15;
    let excludedUserIds: string[] = [];

    if (userId) {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .eq('status', 'accepted');

      const friendIds = (follows ?? []).map((f: any) => f.following_id as string);
      // Excluir al propio usuario Y a todos sus amigos (gente a la que sigue)
      excludedUserIds = [userId, ...friendIds];
    }

    let query = supabase
      .from('buckets')
      .select(
        `
        *,
        user:profiles!buckets_user_id_fkey(id, username, display_name, avatar_url),
        category:categories(slug),
        bucket_photos(id, thumb_path, storage_path, created_at),
        reactions(emoji, user_id),
        comments:comments(count)
      `
      )
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    // Excluir al usuario y a sus amigos para que solo salgan personas no seguidas
    if (excludedUserIds.length > 0) {
      query = query.not('user_id', 'in', `(${excludedUserIds.join(',')})`);
    }

    const { data, error } = await query.range(
      pageParam * limit,
      (pageParam + 1) * limit - 1
    );

    if (error) throw error;

    const excludedSet = new Set(excludedUserIds);
    const items = (data ?? []).filter((b: any) => !excludedSet.has(b.user_id));

    return {
      items,
      nextCursor: (data ?? []).length === limit ? pageParam + 1 : undefined,
    };
  },
};
