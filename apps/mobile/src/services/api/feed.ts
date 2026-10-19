import { supabase } from '../supabase';
import { blockReportApi } from './blockReport';

const PAGE_SIZE = 10;

export const feedApi = {
  /**
   * "Momentos de amigos": todas las tareas públicas y para seguidores de la gente a la que sigo.
   * Se excluyen las tareas del propio usuario y de usuarios bloqueados.
   */
  getFeed: async (userId: string, pageParam: number = 0) => {
    const [followsRes, blockedIds] = await Promise.all([
      supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .eq('status', 'accepted'),
      blockReportApi.getMutualBlockedUserIds(userId),
    ]);
    if (followsRes.error) throw followsRes.error;

    const blockedSet = new Set(blockedIds);

    // Solo amigos seguidos (excluyendo al propio usuario y a usuarios con bloqueo)
    const targetIds = (followsRes.data ?? [])
      .map((f: any) => f.following_id as string)
      .filter((id: string) => id !== userId && !blockedSet.has(id));

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
   * "Explorar": tareas públicas de personas a las que el usuario NO sigue (y que no sean del propio usuario ni usuarios bloqueados).
   */
  getExploreFeed: async (pageParam: number = 0, userId?: string) => {
    const limit = 15;
    let excludedUserIds: string[] = [];

    if (userId) {
      const [followsRes, blockedIds] = await Promise.all([
        supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId)
          .eq('status', 'accepted'),
        blockReportApi.getMutualBlockedUserIds(userId),
      ]);

      const friendIds = (followsRes.data ?? []).map((f: any) => f.following_id as string);
      // Excluir al propio usuario, a todos sus amigos Y a usuarios con bloqueo
      excludedUserIds = Array.from(new Set([userId, ...friendIds, ...blockedIds]));
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

    // Excluir al usuario, amigos y bloqueados para que solo salgan personas permitidas
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

  /**
   * Álbumes de amigos: álbumes públicos o para seguidores de la gente que sigo.
   */
  getFriendsAlbums: async (userId: string, pageParam: number = 0) => {
    const PAGE = 10;
    const [followsRes, blockedIds] = await Promise.all([
      supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
        .eq('status', 'accepted'),
      blockReportApi.getMutualBlockedUserIds(userId),
    ]);
    if (followsRes.error) throw followsRes.error;

    const blockedSet = new Set(blockedIds);
    const targetIds = (followsRes.data ?? [])
      .map((f: any) => f.following_id as string)
      .filter((id: string) => id !== userId && !blockedSet.has(id));

    if (targetIds.length === 0) return { items: [], nextCursor: undefined };

    const { data, error } = await supabase
      .from('albums')
      .select(`
        id, title, description, cover_path, visibility, is_shared, priority,
        is_closed, closed_at, created_at, owner_id,
        owner:profiles!albums_owner_id_fkey(id, username, display_name, avatar_url)
      `)
      .in('owner_id', targetIds)
      .in('visibility', ['public', 'followers'])
      .order('created_at', { ascending: false })
      .range(pageParam * PAGE, (pageParam + 1) * PAGE - 1);

    if (error) throw error;

    // Fetch task counts from album_progress
    const albumIds = (data ?? []).map((a: any) => a.id);
    let progressMap = new Map<string, { total: number; completed: number }>();
    if (albumIds.length > 0) {
      const { data: prog } = await supabase
        .from('album_progress')
        .select('album_id, total_tasks, completed_tasks')
        .in('album_id', albumIds);
      (prog ?? []).forEach((p: any) => {
        progressMap.set(p.album_id, { total: p.total_tasks || 0, completed: p.completed_tasks || 0 });
      });
    }

    const items = (data ?? []).map((a: any) => {
      const prog = progressMap.get(a.id) || { total: 0, completed: 0 };
      const ownerProfile = Array.isArray(a.owner) ? a.owner[0] : a.owner;
      return {
        _type: 'album' as const,
        id: a.id,
        title: a.title,
        description: a.description || null,
        cover_path: a.cover_path || null,
        visibility: a.visibility,
        is_shared: a.is_shared,
        priority: a.priority || 'medium',
        is_closed: Boolean(a.is_closed),
        created_at: a.created_at,
        total_tasks: prog.total,
        completed_tasks: prog.completed,
        owner: ownerProfile || null,
      };
    });

    return {
      items,
      nextCursor: (data ?? []).length === PAGE ? pageParam + 1 : undefined,
    };
  },

  /**
   * Álbumes para explorar: álbumes públicos de personas que no sigo (excluyendo bloqueados).
   */
  getExploreAlbums: async (pageParam: number = 0, userId?: string) => {
    const LIMIT = 12;
    let excludedUserIds: string[] = [];

    if (userId) {
      const [followsRes, blockedIds] = await Promise.all([
        supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId)
          .eq('status', 'accepted'),
        blockReportApi.getMutualBlockedUserIds(userId),
      ]);
      const friendIds = (followsRes.data ?? []).map((f: any) => f.following_id as string);
      excludedUserIds = Array.from(new Set([userId, ...friendIds, ...blockedIds]));
    }

    let query = supabase
      .from('albums')
      .select(`
        id, title, description, cover_path, visibility, is_shared, priority,
        is_closed, closed_at, created_at, owner_id,
        owner:profiles!albums_owner_id_fkey(id, username, display_name, avatar_url)
      `)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false });

    if (excludedUserIds.length > 0) {
      query = query.not('owner_id', 'in', `(${excludedUserIds.join(',')})`);
    }

    const { data, error } = await query.range(pageParam * LIMIT, (pageParam + 1) * LIMIT - 1);
    if (error) throw error;

    const albumIds = (data ?? []).map((a: any) => a.id);
    let progressMap = new Map<string, { total: number; completed: number }>();
    if (albumIds.length > 0) {
      const { data: prog } = await supabase
        .from('album_progress')
        .select('album_id, total_tasks, completed_tasks')
        .in('album_id', albumIds);
      (prog ?? []).forEach((p: any) => {
        progressMap.set(p.album_id, { total: p.total_tasks || 0, completed: p.completed_tasks || 0 });
      });
    }

    const excludedSet = new Set(excludedUserIds);
    const items = (data ?? [])
      .filter((a: any) => !excludedSet.has(a.owner_id))
      .map((a: any) => {
        const prog = progressMap.get(a.id) || { total: 0, completed: 0 };
        const ownerProfile = Array.isArray(a.owner) ? a.owner[0] : a.owner;
        return {
          _type: 'album' as const,
          id: a.id,
          title: a.title,
          description: a.description || null,
          cover_path: a.cover_path || null,
          visibility: a.visibility,
          is_shared: a.is_shared,
          priority: a.priority || 'medium',
          is_closed: Boolean(a.is_closed),
          created_at: a.created_at,
          total_tasks: prog.total,
          completed_tasks: prog.completed,
          owner: ownerProfile || null,
        };
      });

    return {
      items,
      nextCursor: (data ?? []).length === LIMIT ? pageParam + 1 : undefined,
    };
  },
};
