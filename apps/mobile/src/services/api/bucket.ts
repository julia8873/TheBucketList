import { supabase } from '../supabase';
import type { Database } from '@bucketlist/shared';
import type { CreateBucketForm, UpdateBucketForm } from '@bucketlist/shared';
import { applyAlbumTagsToTasks } from '../../hooks/useAlbumTags';

type Bucket = Database['public']['Tables']['buckets']['Row'];
type BucketInsert = Database['public']['Tables']['buckets']['Insert'];
type BucketUpdate = Database['public']['Tables']['buckets']['Update'];
type SubtaskInsert = Database['public']['Tables']['item_subtasks']['Insert'];

export const bucketApi = {
  getBuckets: async (userId?: string) => {
    // Seleccionamos los campos imprescindibles para la lista (portada, subtareas, álbum).
    // bucket_photos no tiene límite aquí porque Supabase no soporta .limit() en relaciones
    // embebidas; el volumen se controla desde la pantalla de detalle que usa su propia query.
    const baseSelect = '*, category:categories(*), item_subtasks(*), album_items(album_id), bucket_photos(id, thumb_path, storage_path, created_at, completed_at, title)';

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

    // 1. Round-trip 1: propias + IDs de colaboraciones + IDs de álbumes en paralelo
    const [ownRes, collabRes, memberAlbumsRes, ownedAlbumsRes] = await Promise.all([
      supabase
        .from('buckets')
        .select(baseSelect)
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('bucket_collaborators')
        .select('bucket_id')
        .eq('user_id', userId)
        .in('status', ['accepted', 'pending']),
      supabase
        .from('album_members')
        .select('album_id')
        .eq('user_id', userId)
        .eq('status', 'accepted'),
      supabase
        .from('albums')
        .select('id')
        .eq('owner_id', userId),
    ]);

    if (ownRes.error) throw ownRes.error;
    const ownData = ownRes.data ?? [];
    const ownIds = new Set(ownData.map((b: any) => b.id));

    const collabIds = (collabRes.data ?? []).map((c: any) => c.bucket_id).filter((id: string) => !ownIds.has(id));
    const memberAlbumIds = Array.from(
      new Set([
        ...(memberAlbumsRes.data ?? []).map((m: any) => m.album_id),
        ...(ownedAlbumsRes.data ?? []).map((a: any) => a.id),
      ])
    );

    // 2. Round-trip 2: tareas de colaboraciones + IDs de tareas de álbumes compartidos, en paralelo.
    //    Antes había un 3.er round-trip secuencial; ahora todo cabe en 2 idas a la red.
    const [sharedRes, albumItemRes] = await Promise.all([
      collabIds.length > 0
        ? supabase
            .from('buckets')
            .select(baseSelect)
            .in('id', collabIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as any[] }),
      memberAlbumIds.length > 0
        ? supabase
            .from('album_items')
            .select('bucket_id')
            .in('album_id', memberAlbumIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);

    const collabBuckets = (sharedRes as any).data ?? [];
    const albumBucketIds = ((albumItemRes as any).data ?? []).map((ai: any) => ai.bucket_id as string)
      .filter((id: string) => !ownIds.has(id) && !new Set(collabIds).has(id));

    // 3. Round-trip 3 (solo si hay IDs nuevos de álbumes compartidos)
    let albumTasks: any[] = [];
    if (albumBucketIds.length > 0) {
      const { data: sharedAlbumBuckets } = await supabase
        .from('buckets')
        .select(baseSelect)
        .in('id', albumBucketIds)
        .order('created_at', { ascending: false });
      albumTasks = sharedAlbumBuckets ?? [];
    }

    // Merge con dedup (propias > colaboración directa > álbum compartido)
    const existingIds = new Set(ownIds);
    const merged = [...ownData];

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

  createBucket: async (payload: CreateBucketForm & {
    cover_image?: string | null;
    album_id?: string | null;
    tag_ids?: string[];
    collaborator_ids?: string[];
    collaboration_mode?: string;
    collaboration_audience?: string;
  }) => {
    // 1. Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');

    // 2. Insert bucket
    const bucketInsert: any = {
      user_id: userData.user.id,
      title: payload.title,
      description: payload.description || null,
      category_id: payload.category_id || null,
      priority: payload.priority || 'medium',
      visibility: payload.visibility,
      deadline: payload.deadline ? payload.deadline.toISOString() : null,
      location_text: payload.location_text || null,
      location_lat: payload.location_lat || null,
      location_lng: payload.location_lng || null,
      status: 'pending',
      // Defensa: jamás guardar imágenes en base64 ni cadenas que superen 2048 caracteres (ver migración 20261027073500).
      cover_image:
        payload.cover_image &&
        !String(payload.cover_image).startsWith('data:') &&
        String(payload.cover_image).length <= 2048
          ? payload.cover_image
          : null,
      drive_url: payload.drive_url || null,
      collaboration_mode: payload.collaboration_mode || 'invite_only',
      collaboration_audience: payload.collaboration_audience || 'followers',
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
      // Va al final del orden manual del álbum.
      const { data: last } = await supabase
        .from('album_items')
        .select('position')
        .eq('album_id', payload.album_id)
        .order('position', { ascending: false })
        .limit(1);
      const nextPosition = ((last?.[0] as any)?.position ?? -1) + 1;

      const { error: albumError } = await supabase
        .from('album_items')
        .insert({
          album_id: payload.album_id,
          bucket_id: (bucket as Bucket).id,
          position: nextPosition,
        });
        
      if (albumError) {
        console.error('Failed to insert album relation', albumError);
      } else {
        await applyAlbumTagsToTasks(payload.album_id, [(bucket as Bucket).id]);
      }
    }

    return bucket;
  },

  updateBucket: async (id: string, payload: UpdateBucketForm & { collaboration_mode?: string; collaboration_audience?: string }) => {
    const bucketUpdate: any = {
      title: payload.title,
      description: payload.description,
      category_id: payload.category_id,
      priority: payload.priority,
      visibility: payload.visibility,
      deadline: payload.deadline ? payload.deadline.toISOString() : null,
      location_text: payload.location_text,
      location_lat: payload.location_lat,
      location_lng: payload.location_lng,
      status: payload.status,
      completed_at: payload.completed_at ? payload.completed_at.toISOString() : undefined,
      drive_url: payload.drive_url !== undefined ? payload.drive_url : undefined,
    };

    if (payload.collaboration_mode !== undefined) {
      bucketUpdate.collaboration_mode = payload.collaboration_mode;
    }
    if (payload.collaboration_audience !== undefined) {
      bucketUpdate.collaboration_audience = payload.collaboration_audience;
    }

    // Remove undefined fields
    Object.keys(bucketUpdate).forEach(key => {
      if (bucketUpdate[key] === undefined) {
        delete bucketUpdate[key];
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
  },

  /** Solicitar o unirse como colaborador a una tarea (respetando modo abierto o solicitud) */
  requestOrJoinCollaboration: async (bucketId: string, requestOnly = false) => {
    const { data: userAuth } = await supabase.auth.getUser();
    if (!userAuth?.user) throw new Error('Debes iniciar sesión para colaborar');
    const uid = userAuth.user.id;

    // 1. Intentar vía RPC
    try {
      const { data, error } = await (supabase as any).rpc('request_or_join_bucket_collaboration', {
        p_bucket_id: bucketId,
        p_request_only: requestOnly,
      });
      if (!error && data) {
        return data as { success: boolean; status: 'accepted' | 'pending'; message: string };
      }
      if (error && error.message && !error.message.includes('function') && !error.message.includes('not find')) {
        throw error;
      }
    } catch (e: any) {
      if (e?.message && !e.message.includes('function') && !e.message.includes('not find')) {
        throw e;
      }
    }

    // 2. Fallback directo en cliente
    const { data: bucket, error: bErr } = await supabase
      .from('buckets')
      .select('user_id, collaboration_mode, collaboration_audience, title')
      .eq('id', bucketId)
      .single();

    if (bErr || !bucket) throw new Error('No se pudo encontrar la tarea');
    if (bucket.user_id === uid) throw new Error('Ya eres el creador de esta tarea');

    const mode = (bucket as any).collaboration_mode || 'invite_only';
    const audience = (bucket as any).collaboration_audience || 'followers';

    if (mode === 'invite_only') {
      throw new Error('Esta tarea no permite unirse libremente ni solicitar colaborar');
    }

    if (audience === 'followers') {
      const { data: f } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', uid)
        .eq('following_id', bucket.user_id)
        .eq('status', 'accepted')
        .maybeSingle();
      if (!f) throw new Error('Solo los seguidores del creador pueden colaborar en esta tarea');
    }

    const targetStatus = mode === 'open' && !requestOnly ? 'accepted' : 'pending';

    const { error: insErr } = await supabase
      .from('bucket_collaborators')
      .insert({
        bucket_id: bucketId,
        user_id: uid,
        status: targetStatus,
      });

    if (insErr) throw insErr;

    // Notificación
    try {
      await supabase.from('notifications').insert({
        recipient_id: bucket.user_id,
        type: targetStatus === 'accepted' ? 'collaborator_joined' : 'collaboration_request',
        actor_id: uid,
        bucket_id: bucketId,
        is_read: false,
      });
    } catch {}

    return {
      success: true,
      status: targetStatus,
      message: targetStatus === 'accepted' ? '¡Te has unido como colaborador!' : 'Solicitud enviada al creador',
    };
  },

  /** Responder a solicitud de colaboración (aceptar o rechazar) */
  respondToCollaborationRequest: async (bucketId: string, userId: string, accept: boolean) => {
    try {
      const { data, error } = await (supabase as any).rpc('respond_to_collaboration_request', {
        p_bucket_id: bucketId,
        p_user_id: userId,
        p_accept: accept,
      });
      if (!error && data) return data;
      if (error && error.message && !error.message.includes('function') && !error.message.includes('not find')) {
        throw error;
      }
    } catch (e: any) {
      if (e?.message && !e.message.includes('function') && !e.message.includes('not find')) {
        throw e;
      }
    }

    // Fallback directo
    if (accept) {
      const { error } = await supabase
        .from('bucket_collaborators')
        .update({ status: 'accepted' })
        .eq('bucket_id', bucketId)
        .eq('user_id', userId);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('bucket_collaborators')
        .delete()
        .eq('bucket_id', bucketId)
        .eq('user_id', userId);
      if (error) throw error;
    }
    return { success: true };
  },
};
