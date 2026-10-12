import { supabase } from '../supabase';
import type { Database } from '@bucketlist/shared';
import type { CreateBucketForm, UpdateBucketForm } from '@bucketlist/shared';

type Bucket = Database['public']['Tables']['buckets']['Row'];
type BucketInsert = Database['public']['Tables']['buckets']['Insert'];
type BucketUpdate = Database['public']['Tables']['buckets']['Update'];
type SubtaskInsert = Database['public']['Tables']['item_subtasks']['Insert'];

export const bucketApi = {
  getBuckets: async (userId?: string) => {
    const baseSelect = '*, category:categories(*), item_subtasks(*), album_items(album_id), bucket_photos(thumb_path, storage_path)';

    if (!userId) {
      const { data, error } = await supabase
        .from('buckets')
        .select(baseSelect)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((b: any) => ({
        ...b,
        album_id: b.album_items?.length > 0 ? b.album_items[0].album_id : null,
      }));
    }

    // 1. Own buckets
    const { data: ownData, error: ownError } = await supabase
      .from('buckets')
      .select(baseSelect)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (ownError) throw ownError;

    // 2. Collaborative buckets (accepted or pending invitation)
    let collabBuckets: any[] = [];
    try {
      const { data: collabData } = await supabase
        .from('bucket_collaborators')
        .select('bucket_id')
        .eq('user_id', userId)
        .in('status', ['accepted', 'pending']);

      const collabIds = (collabData ?? []).map((c: any) => c.bucket_id);

      if (collabIds.length > 0) {
        const { data: sharedData } = await supabase
          .from('buckets')
          .select(baseSelect)
          .in('id', collabIds)
          .order('created_at', { ascending: false });
        collabBuckets = sharedData ?? [];
      }
    } catch {
      // Si falla la query de colaboradores, simplemente no los incluimos
    }

    // 3. Tasks from shared albums where user is an accepted member
    let albumTasks: any[] = [];
    try {
      const { data: memberAlbums } = await supabase
        .from('album_members')
        .select('album_id')
        .eq('user_id', userId)
        .eq('status', 'accepted');

      // También los álbumes de los que el usuario es DUEÑO: el dueño no figura
      // en album_members, y las tareas que añaden los demás miembros deben salirle.
      const { data: ownedAlbums } = await supabase
        .from('albums')
        .select('id')
        .eq('owner_id', userId);

      const memberAlbumIds = Array.from(
        new Set([
          ...(memberAlbums ?? []).map((m: any) => m.album_id),
          ...(ownedAlbums ?? []).map((a: any) => a.id),
        ]),
      );
      if (memberAlbumIds.length > 0) {
        const { data: albumItemData } = await supabase
          .from('album_items')
          .select('bucket_id')
          .in('album_id', memberAlbumIds);

        const albumBucketIds = (albumItemData ?? []).map((ai: any) => ai.bucket_id);
        if (albumBucketIds.length > 0) {
          const { data: sharedAlbumBuckets } = await supabase
            .from('buckets')
            .select(baseSelect)
            .in('id', albumBucketIds)
            .order('created_at', { ascending: false });
          albumTasks = sharedAlbumBuckets ?? [];
        }
      }
    } catch {
      // Ignored
    }

    // Merge, dedup by id (own takes precedence, then direct collab, then album collab)
    const existingIds = new Set((ownData ?? []).map((b: any) => b.id));
    const merged = [...(ownData ?? [])];

    for (const b of collabBuckets) {
      if (!existingIds.has(b.id)) {
        existingIds.add(b.id);
        merged.push(b);
      }
    }

    for (const b of albumTasks) {
      if (!existingIds.has(b.id)) {
        existingIds.add(b.id);
        merged.push(b);
      }
    }

    return merged.map((b: any) => ({
      ...b,
      album_id: b.album_items?.length > 0 ? b.album_items[0].album_id : null,
    }));
  },

  createBucket: async (payload: CreateBucketForm & { cover_image?: string | null, album_id?: string | null, tag_ids?: string[], collaborator_ids?: string[] }) => {
    // 1. Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');

    // 2. Insert bucket
    const bucketInsert: BucketInsert = {
      user_id: userData.user.id,
      title: payload.title,
      description: payload.description || null,
      category_id: payload.category_id || null,
      priority: payload.priority || 'medium',
      visibility: payload.visibility as 'public' | 'followers' | 'private',
      deadline: payload.deadline ? payload.deadline.toISOString() : null,
      location_text: payload.location_text || null,
      location_lat: payload.location_lat || null,
      location_lng: payload.location_lng || null,
      status: 'pending',
      cover_image: payload.cover_image || null,
    };

    const { data: bucket, error: bucketError } = await supabase
      .from('buckets')
      .insert(bucketInsert)
      .select()
      .single();

    if (bucketError) throw bucketError;

    // 3. Insert subtasks if any
    if (payload.subtasks && payload.subtasks.length > 0) {
      const subtasksInsert: SubtaskInsert[] = payload.subtasks.map((st, i) => ({
        bucket_id: (bucket as Bucket).id,
        title: st.title,
        done: st.done,
        position: st.position || i,
      }));

      const { error: subtasksError } = await supabase
        .from('item_subtasks')
        .insert(subtasksInsert);

      if (subtasksError) {
        console.error('Failed to insert subtasks', subtasksError);
      }
    }

    // 5. Insert tags relation if any
    if (payload.tag_ids && payload.tag_ids.length > 0) {
      const tagsInsert = payload.tag_ids.map(id => ({
        item_id: (bucket as Bucket).id,
        tag_id: id
      }));
      const { error: tagsError } = await supabase.from('item_tags').insert(tagsInsert);
      if (tagsError) console.error('Failed to insert item_tags', tagsError);
    }
    
    // 6. Insert collaborators if any
    if (payload.collaborator_ids && payload.collaborator_ids.length > 0) {
      const collaboratorsInsert = payload.collaborator_ids.map(id => ({
        bucket_id: (bucket as Bucket).id,
        user_id: id,
        status: 'pending'
      }));
      const { error: collabError } = await supabase.from('bucket_collaborators').insert(collaboratorsInsert);
      if (collabError) console.error('Failed to insert collaborators', collabError);
    }
    
    // 4. Insert album relation if any
    if (payload.album_id) {
      const { error: albumError } = await supabase
        .from('album_items')
        .insert({
          album_id: payload.album_id,
          bucket_id: (bucket as Bucket).id
        });
        
      if (albumError) {
        console.error('Failed to insert album relation', albumError);
      }
    }

    return bucket;
  },

  updateBucket: async (id: string, payload: UpdateBucketForm) => {
    const bucketUpdate: BucketUpdate = {
      title: payload.title,
      description: payload.description,
      category_id: payload.category_id,
      priority: payload.priority,
      visibility: payload.visibility as 'public' | 'followers' | 'private' | undefined,
      deadline: payload.deadline ? payload.deadline.toISOString() : null,
      location_text: payload.location_text,
      location_lat: payload.location_lat,
      location_lng: payload.location_lng,
      status: payload.status as 'pending' | 'in_progress' | 'completed' | 'expired' | 'archived' | undefined,
      completed_at: payload.completed_at ? payload.completed_at.toISOString() : undefined,
    };

    // Remove undefined fields
    Object.keys(bucketUpdate).forEach(key => {
      if (bucketUpdate[key as keyof BucketUpdate] === undefined) {
        delete bucketUpdate[key as keyof BucketUpdate];
      }
    });

    const { data, error } = await supabase
      .from('buckets')
      .update(bucketUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data;
  },

  deleteBucket: async (id: string) => {
    const { error } = await supabase
      .from('buckets')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return id;
  }
};
