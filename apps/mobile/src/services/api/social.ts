import { supabase } from '../supabase';

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
  addComment: async (bucketId: string, userId: string, body: string) => {
    const { data, error } = await supabase
      .from('comments')
      .insert({ bucket_id: bucketId, user_id: userId, body })
      .select('*, user:profiles(*)')
      .single();

    if (error) throw error;
    return data;
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
};
