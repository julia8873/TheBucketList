import { supabase } from '../supabase';
import { sendPushNotification } from '../notifications';

export const LIKE_EMOJI = '❤️';

export const socialApi = {
  // Follows
  followUser: async (followerId: string, followingId: string) => {
    // El trigger de BD decide 'pending' (cuenta privada) o 'accepted'.
    const { data, error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId })
      .select()
      .single();

    if (error) throw error;

    // Notificar por push al usuario seguido
    try {
      const { data: follower } = await supabase.from('profiles').select('display_name, username').eq('id', followerId).maybeSingle();
      const followerName = follower?.display_name || follower?.username || 'Alguien';
      void sendPushNotification(
        followingId,
        'Nuevo seguidor 👋',
        `${followerName} ha empezado a seguirte`,
        { type: 'follow', followerId }
      );
    } catch {}

    return data;
  },

  /** Sirve para dejar de seguir y también para cancelar una solicitud enviada. */
  unfollowUser: async (followerId: string, followingId: string) => {
    const { error } = await supabase
      .from('follows')
      .delete()
      .match({ follower_id: followerId, following_id: followingId });

    if (error) throw error;
    return true;
  },

  // Reactions
  toggleReaction: async (bucketId: string, userId: string, emoji: string) => {
    const { data: existing } = await supabase
      .from('reactions')
      .select('id, emoji')
      .match({ bucket_id: bucketId, user_id: userId })
      .maybeSingle();

    if (existing) {
      if (existing.emoji === emoji) {
        const { error } = await supabase.from('reactions').delete().eq('id', existing.id);
        if (error) throw error;
        return { action: 'removed' };
      } else {
        const { error } = await supabase.from('reactions').update({ emoji }).eq('id', existing.id);
        if (error) throw error;
        return { action: 'updated', emoji };
      }
    } else {
      const { error } = await supabase
        .from('reactions')
        .insert({ bucket_id: bucketId, user_id: userId, emoji });
      if (error) throw error;
      return { action: 'added', emoji };
    }
  },

  /** "Me gusta" del feed: si ya hay cualquier reacción mía la quita; si no, pone ❤️. */
  toggleLike: async (bucketId: string, userId: string) => {
    const { data: existing, error: fetchErr } = await supabase
      .from('reactions')
      .select('id')
      .match({ bucket_id: bucketId, user_id: userId })
      .maybeSingle();
    if (fetchErr) throw fetchErr;

    if (existing) {
      const { error } = await supabase.from('reactions').delete().eq('id', existing.id);
      if (error) throw error;
      return { liked: false };
    }

    const { error } = await supabase
      .from('reactions')
      .insert({ bucket_id: bucketId, user_id: userId, emoji: LIKE_EMOJI });
    if (error) throw error;

    // Notificar al dueño de la tarea
    try {
      const { data: bucket } = await supabase.from('buckets').select('user_id, title').eq('id', bucketId).single();
      if (bucket?.user_id && bucket.user_id !== userId) {
        const { data: actor } = await supabase.from('profiles').select('display_name, username').eq('id', userId).single();
        const actorName = actor?.display_name || actor?.username || 'Alguien';
        void sendPushNotification(
          bucket.user_id,
          'Nueva reacción ❤️',
          `${actorName} le ha dado me gusta a tu tarea "${bucket.title || 'tarea'}"`,
          { bucketId, type: 'reaction' }
        );
      }
    } catch {}

    return { liked: true };
  },

  // Search (explorar)
  searchUsers: async (query: string) => {
    if (!query || query.length < 2) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${query}%`)
      .limit(10);

    if (error) throw error;
    return data;
  },

  // Comments
  getComments: async (bucketId: string) => {
    const { data, error } = await supabase
      .from('comments')
      .select('*, user:profiles!comments_user_id_fkey(*), likes:comment_likes(id, user_id)')
      .eq('bucket_id', bucketId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  addComment: async (bucketId: string, userId: string, body: string, parentId?: string | null) => {
    const payload: any = { bucket_id: bucketId, user_id: userId, body };
    if (parentId) {
      payload.parent_id = parentId;
    }

    const { data, error } = await supabase
      .from('comments')
      .insert(payload)
      .select('*, user:profiles!comments_user_id_fkey(*), likes:comment_likes(id, user_id)')
      .single();

    if (error) throw error;

    // Enviar push al dueño de la publicación y a usuarios mencionados
    try {
      const { data: bucketData } = await supabase
        .from('buckets')
        .select('user_id, title')
        .eq('id', bucketId)
        .single();

      const authorName = data?.user?.display_name || data?.user?.username || 'Alguien';
      const taskTitle = bucketData?.title || 'tu tarea';

      // 1. Al dueño de la tarea
      if (bucketData?.user_id && bucketData.user_id !== userId) {
        void sendPushNotification(
          bucketData.user_id,
          'Nuevo comentario 💬',
          `${authorName} comentó en tu publicación "${taskTitle}": "${body.slice(0, 50)}"`,
          { bucketId, commentId: data.id, type: 'comment' }
        );
      }

      // 2. A usuarios mencionados (@username)
      const matches = body.match(/@([a-zA-Z0-9_.-]+)/g);
      if (matches) {
        const usernames = [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
        for (const un of usernames) {
          const { data: mentionedUser } = await supabase
            .from('profiles')
            .select('id')
            .ilike('username', un)
            .maybeSingle();

          if (mentionedUser?.id && mentionedUser.id !== userId && mentionedUser.id !== bucketData?.user_id) {
            void sendPushNotification(
              mentionedUser.id,
              'Nueva mención 🏷️',
              `${authorName} te ha mencionado en un comentario en "${taskTitle}"`,
              { bucketId, commentId: data.id, type: 'mention' }
            );
          }
        }
      }
    } catch (err) {
      console.warn('Error sending remote push for comment:', err);
    }

    return data;
  },

  updateComment: async (commentId: string, body: string) => {
    const trimmed = body.trim();
    if (!trimmed) throw new Error('El comentario no puede estar vacío');

    const { data, error } = await supabase
      .from('comments')
      .update({ body: trimmed, updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .select('*, user:profiles!comments_user_id_fkey(*), likes:comment_likes(id, user_id)')
      .single();

    if (error) throw error;
    return data;
  },

  deleteComment: async (commentId: string) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
    return true;
  },

  toggleCommentLike: async (commentId: string, userId: string) => {
    const { data: existing, error: fetchErr } = await supabase
      .from('comment_likes')
      .select('id')
      .match({ comment_id: commentId, user_id: userId })
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (existing) {
      const { error } = await supabase.from('comment_likes').delete().eq('id', existing.id);
      if (error) throw error;
      return { liked: false };
    }

    const { error } = await supabase
      .from('comment_likes')
      .insert({ comment_id: commentId, user_id: userId });

    if (error) throw error;
    return { liked: true };
  },

  /** IDs de las tareas ajenas que ya he copiado a mi lista. */
  getCopiedBucketIds: async (userId: string): Promise<string[]> => {
    const { data, error } = await supabase
      .from('buckets')
      .select('copied_from_id')
      .eq('user_id', userId)
      .not('copied_from_id', 'is', null);
    if (error) throw error;
    return (data ?? []).map((row: any) => row.copied_from_id as string);
  },

  // "Yo también": copia una tarea (con sus pasos) a mi lista
  copyBucket: async (bucketId: string, userId: string) => {
    const { data: original, error: fetchErr } = await supabase
      .from('buckets')
      .select('*, item_subtasks(title, position)')
      .eq('id', bucketId)
      .single();

    if (fetchErr) throw fetchErr;
    if (original.user_id === userId) throw new Error('Esta tarea ya es tuya');

    const { data: already } = await supabase
      .from('buckets')
      .select('id')
      .match({ user_id: userId, copied_from_id: bucketId })
      .limit(1);
    if (already && already.length > 0) throw new Error('Ya tienes esta tarea en tu lista');

    const { data, error } = await supabase
      .from('buckets')
      .insert({
        user_id: userId,
        category_id: original.category_id,
        title: original.title,
        description: original.description,
        location_text: original.location_text,
        location_lat: original.location_lat,
        location_lng: original.location_lng,
        // Solo se reutilizan las portadas por defecto; la foto de otra persona no se copia.
        cover_image:
          typeof original.cover_image === 'string' && original.cover_image.startsWith('preset:')
            ? original.cover_image
            : null,
        tags: original.tags ?? null,
        visibility: 'private', // empieza privada
        status: 'pending',
        copied_from_id: original.id,
        copied_from_user_id: original.user_id,
      })
      .select()
      .single();

    if (error) throw error;

    const subtasks = ((original as any).item_subtasks ?? []) as Array<{ title: string; position: number | null }>;
    if (subtasks.length > 0) {
      const { error: subErr } = await supabase.from('item_subtasks').insert(
        subtasks.map((s, i) => ({
          bucket_id: data.id,
          title: s.title,
          done: false,
          position: s.position ?? i,
        }))
      );
      if (subErr) throw subErr;
    }

    return data;
  },

  getBucketSaveCount: async (bucketId: string): Promise<number> => {
    const { count, error } = await supabase
      .from('user_saved_buckets')
      .select('bucket_id', { count: 'exact', head: true })
      .eq('bucket_id', bucketId);
    if (error) return 0;
    return count ?? 0;
  },

  getBatchBucketSaveCounts: async (bucketIds: string[]): Promise<Record<string, number>> => {
    if (!bucketIds.length) return {};
    const { data, error } = await supabase
      .from('user_saved_buckets')
      .select('bucket_id')
      .in('bucket_id', bucketIds);
    if (error || !data) return {};
    const counts: Record<string, number> = {};
    for (const row of data as any[]) {
      if (row.bucket_id) {
        counts[row.bucket_id] = (counts[row.bucket_id] || 0) + 1;
      }
    }
    return counts;
  },

  // ─── Tareas guardadas (Bookmarking de tareas ajenas) ──────────────────────
  getSavedBucketIds: async (userId: string): Promise<string[]> => {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('user_saved_buckets')
      .select('bucket_id')
      .eq('user_id', userId);
    if (error) { console.warn('getSavedBucketIds error:', error); return []; }
    return (data || []).map((r: any) => r.bucket_id as string);
  },

  toggleSaveBucket: async (userId: string, bucketId: string, currentlySaved: boolean) => {
    if (!userId || !bucketId) throw new Error('Usuario o tarea no identificada');
    if (currentlySaved) {
      const { error } = await supabase
        .from('user_saved_buckets')
        .delete()
        .match({ user_id: userId, bucket_id: bucketId });
      if (error) throw error;
      return { saved: false };
    } else {
      const { error } = await supabase
        .from('user_saved_buckets')
        .upsert({ user_id: userId, bucket_id: bucketId }, { onConflict: 'user_id,bucket_id' });
      if (error) { console.error('Error inserting user_saved_buckets:', error); throw error; }
      return { saved: true };
    }
  },

  getSavedBucketsFull: async (userId: string) => {
    if (!userId) return [];
    const { data: savedRows, error: sErr } = await supabase
      .from('user_saved_buckets')
      .select('bucket_id')
      .eq('user_id', userId);
    if (sErr) { console.warn('getSavedBucketsFull error:', sErr); return []; }
    const bucketIds = (savedRows || []).map((r: any) => r.bucket_id as string);
    if (bucketIds.length === 0) return [];

    const { data: buckets, error: bErr } = await supabase
      .from('buckets')
      .select(`
        *,
        actor:profiles!buckets_user_id_fkey(id, username, display_name, avatar_url),
        category:categories(slug),
        bucket_photos(id, thumb_path, storage_path, created_at),
        reactions(emoji, user_id),
        comments:comments(count)
      `)
      .in('id', bucketIds)
      .neq('user_id', userId)
      .order('created_at', { ascending: false });
    if (bErr) return [];

    return (buckets || []).map((b: any) => ({
      id: b.id,
      actor_id: b.user_id,
      bucket_id: b.id,
      actor: b.actor,
      bucket: b,
      type: b.status === 'completed' ? 'completed' : 'new_bucket',
      created_at: b.completed_at || b.created_at,
    }));
  },

  getBatchAlbumSaveCounts: async (albumIds: string[]): Promise<Record<string, number>> => {
    if (!albumIds.length) return {};
    const counts: Record<string, number> = {};
    const { data: savedData } = await supabase
      .from('user_saved_albums')
      .select('album_id')
      .in('album_id', albumIds);
    (savedData || []).forEach((r: any) => {
      if (r.album_id) counts[r.album_id] = (counts[r.album_id] || 0) + 1;
    });
    const { data: copiedData } = await supabase
      .from('albums')
      .select('copied_from_id')
      .in('copied_from_id', albumIds);
    (copiedData || []).forEach((r: any) => {
      if (r.copied_from_id) counts[r.copied_from_id] = (counts[r.copied_from_id] || 0) + 1;
    });
    return counts;
  },

  // ─── Likes en Álbumes ────────────────────────────────────────────────────────
  toggleAlbumLike: async (albumId: string, userId: string) => {
    const { data: existing, error: fetchErr } = await supabase
      .from('album_reactions')
      .select('id')
      .match({ album_id: albumId, user_id: userId })
      .maybeSingle();

    if (fetchErr) throw fetchErr;

    if (existing) {
      const { error } = await supabase.from('album_reactions').delete().eq('id', existing.id);
      if (error) throw error;
      return { liked: false };
    }

    const { error } = await supabase
      .from('album_reactions')
      .insert({ album_id: albumId, user_id: userId, emoji: LIKE_EMOJI });

    if (error) throw error;
    return { liked: true };
  },

  getAlbumReactions: async (albumIds: string[]) => {
    if (!albumIds.length) return [];
    const { data, error } = await supabase
      .from('album_reactions')
      .select('album_id, user_id, emoji')
      .in('album_id', albumIds);
    if (error) return [];
    return data || [];
  },

  getBatchAlbumLikeCounts: async (albumIds: string[]): Promise<Record<string, number>> => {
    if (!albumIds.length) return {};
    const { data, error } = await supabase
      .from('album_reactions')
      .select('album_id')
      .in('album_id', albumIds);
    if (error || !data) return {};
    const counts: Record<string, number> = {};
    for (const row of data as any[]) {
      if (row.album_id) counts[row.album_id] = (counts[row.album_id] || 0) + 1;
    }
    return counts;
  },

  getUserLikedAlbumIds: async (userId: string): Promise<string[]> => {
    if (!userId) return [];
    const { data, error } = await supabase
      .from('album_reactions')
      .select('album_id')
      .eq('user_id', userId);
    if (error) return [];
    return (data || []).map((r: any) => r.album_id as string);
  },

  // ─── Álbumes guardados (Bookmarking de álbumes ajenos) ────────────────────────
  getSavedAlbumIds: async (userId: string): Promise<string[]> => {
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      effectiveUserId = authUser?.id || '';
    }
    if (!effectiveUserId) return [];

    const { data: savedData, error: sErr } = await supabase
      .from('user_saved_albums')
      .select('album_id')
      .eq('user_id', effectiveUserId);

    if (sErr) console.warn('getSavedAlbumIds user_saved_albums error:', sErr);

    const { data: favData } = await supabase
      .from('user_favorites')
      .select('album_id')
      .eq('user_id', effectiveUserId)
      .not('album_id', 'is', null);

    const set = new Set<string>();
    (savedData || []).forEach((r: any) => { if (r.album_id) set.add(r.album_id); });
    (favData || []).forEach((r: any) => { if (r.album_id) set.add(r.album_id); });
    return Array.from(set);
  },

  toggleSaveAlbum: async (userId: string, albumId: string, currentlySaved: boolean) => {
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      effectiveUserId = authUser?.id || '';
    }
    if (!effectiveUserId || !albumId) {
      throw new Error('Usuario o álbum no identificado');
    }

    if (currentlySaved) {
      await supabase
        .from('user_saved_albums')
        .delete()
        .match({ user_id: effectiveUserId, album_id: albumId });
      await supabase
        .from('user_favorites')
        .delete()
        .match({ user_id: effectiveUserId, album_id: albumId });
      return { saved: false };
    } else {
      const { error } = await supabase
        .from('user_saved_albums')
        .upsert({ user_id: effectiveUserId, album_id: albumId }, { onConflict: 'user_id,album_id' });
      if (error) {
        console.error('Error inserting user_saved_albums:', error);
        throw error;
      }
      return { saved: true };
    }
  },

  getSavedAlbumsFull: async (userId: string) => {
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      effectiveUserId = authUser?.id || '';
    }
    if (!effectiveUserId) return [];

    const { data: savedRows, error: sErr } = await supabase
      .from('user_saved_albums')
      .select('album_id')
      .eq('user_id', effectiveUserId);

    if (sErr) console.warn('getSavedAlbumsFull user_saved_albums error:', sErr);

    const { data: favRows } = await supabase
      .from('user_favorites')
      .select('album_id')
      .eq('user_id', effectiveUserId)
      .not('album_id', 'is', null);

    const idSet = new Set<string>();
    (savedRows || []).forEach((r: any) => { if (r.album_id) idSet.add(r.album_id); });
    (favRows || []).forEach((r: any) => { if (r.album_id) idSet.add(r.album_id); });

    const albumIds = Array.from(idSet);
    if (albumIds.length === 0) return [];

    const { data: albums, error: aErr } = await supabase
      .from('albums')
      .select(`
        id, title, description, cover_path, visibility, is_shared, priority,
        is_closed, closed_at, created_at, owner_id,
        owner:profiles!albums_owner_id_fkey(id, username, display_name, avatar_url)
      `)
      .in('id', albumIds)
      .order('created_at', { ascending: false });

    if (aErr) {
      console.error('getSavedAlbumsFull aErr:', aErr);
      return [];
    }

    // Only albums from other people (not own albums)
    const otherAlbums = (albums || []).filter((a: any) => a.owner_id !== effectiveUserId);
    const validIds = otherAlbums.map((a: any) => a.id);
    if (validIds.length === 0) return [];

    const { data: prog } = await supabase
      .from('album_progress')
      .select('album_id, total_tasks, completed_tasks')
      .in('album_id', validIds);
    const progMap = new Map<string, { total: number; completed: number }>();
    (prog || []).forEach((p: any) => progMap.set(p.album_id, { total: p.total_tasks || 0, completed: p.completed_tasks || 0 }));

    return otherAlbums.map((a: any) => {
      const p = progMap.get(a.id) || { total: 0, completed: 0 };
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
        total_tasks: p.total,
        completed_tasks: p.completed,
        owner: ownerProfile || null,
      };
    });
  },

  // ─── Contenido al que se ha dado me gusta ──────────────────────────────────
  getLikedContent: async (userId: string) => {
    if (!userId) return { tasks: [], albums: [] };

    // 1. Tareas con me gusta
    const { data: reactionsData } = await supabase
      .from('reactions')
      .select('bucket_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const bucketIds = (reactionsData || []).map((r: any) => r.bucket_id).filter(Boolean);
    let likedBuckets: any[] = [];
    if (bucketIds.length > 0) {
      const { data: buckets } = await supabase
        .from('buckets')
        .select(`
          *,
          actor:profiles!buckets_user_id_fkey(id, username, display_name, avatar_url),
          category:categories(slug),
          bucket_photos(id, thumb_path, storage_path, created_at),
          reactions(emoji, user_id),
          comments:comments(count)
        `)
        .in('id', bucketIds);

      // Conservar orden de más reciente a más antiguo
      const bucketMap = new Map((buckets || []).map((b: any) => [b.id, b]));
      likedBuckets = bucketIds
        .map((id: string) => bucketMap.get(id))
        .filter(Boolean)
        .map((b: any) => ({
          id: b.id,
          actor_id: b.user_id,
          bucket_id: b.id,
          actor: b.actor,
          bucket: b,
          type: b.status === 'completed' ? 'completed' : 'new_bucket',
          created_at: b.completed_at || b.created_at,
        }));
    }

    // 2. Álbumes con me gusta
    const { data: albumReactions } = await supabase
      .from('album_reactions')
      .select('album_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    const albumIds = (albumReactions || []).map((r: any) => r.album_id).filter(Boolean);
    let likedAlbums: any[] = [];
    if (albumIds.length > 0) {
      const { data: albums } = await supabase
        .from('albums')
        .select(`
          id, title, description, cover_path, visibility, is_shared, priority,
          is_closed, closed_at, created_at, owner_id,
          owner:profiles!albums_owner_id_fkey(id, username, display_name, avatar_url)
        `)
        .in('id', albumIds);

      const { data: prog } = await supabase
        .from('album_progress')
        .select('album_id, total_tasks, completed_tasks')
        .in('album_id', albumIds);
      const progMap = new Map<string, { total: number; completed: number }>();
      (prog || []).forEach((p: any) => progMap.set(p.album_id, { total: p.total_tasks || 0, completed: p.completed_tasks || 0 }));

      const albumMap = new Map((albums || []).map((a: any) => [a.id, a]));
      likedAlbums = albumIds
        .map((id: string) => albumMap.get(id))
        .filter(Boolean)
        .map((a: any) => {
          const p = progMap.get(a.id) || { total: 0, completed: 0 };
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
            total_tasks: p.total,
            completed_tasks: p.completed,
            owner: ownerProfile || null,
          };
        });
    }

    return {
      tasks: likedBuckets,
      albums: likedAlbums,
    };
  },
};
