import { supabase } from '../supabase';
import type { Database } from '@bucketlist/shared';
import type { CreateBucketForm, UpdateBucketForm } from '@bucketlist/shared';

type Bucket = Database['public']['Tables']['buckets']['Row'];
type BucketInsert = Database['public']['Tables']['buckets']['Insert'];
type BucketUpdate = Database['public']['Tables']['buckets']['Update'];
type SubtaskInsert = Database['public']['Tables']['item_subtasks']['Insert'];

export const bucketApi = {
  getBuckets: async (userId?: string) => {
    let query = supabase
      .from('buckets')
      .select('*, item_subtasks(*)');

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    // We can cast the result to an array of Buckets with item_subtasks joined
    return data as any[]; 
  },

  createBucket: async (payload: CreateBucketForm) => {
    // 1. Get current user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('Not authenticated');

    // 2. Insert bucket
    const bucketInsert: BucketInsert = {
      user_id: userData.user.id,
      title: payload.title,
      description: payload.description || null,
      category_id: payload.category_id,
      visibility: payload.visibility as 'public' | 'followers' | 'private',
      deadline: payload.deadline ? payload.deadline.toISOString() : null,
      location_text: payload.location_text || null,
      location_lat: payload.location_lat || null,
      location_lng: payload.location_lng || null,
      status: 'pending',
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

    return bucket;
  },

  updateBucket: async (id: string, payload: UpdateBucketForm) => {
    const bucketUpdate: BucketUpdate = {
      title: payload.title,
      description: payload.description,
      category_id: payload.category_id,
      visibility: payload.visibility as 'public' | 'followers' | 'private' | undefined,
      deadline: payload.deadline ? payload.deadline.toISOString() : null,
      location_text: payload.location_text,
      location_lat: payload.location_lat,
      location_lng: payload.location_lng,
      status: payload.status as 'pending' | 'in_progress' | 'completed' | 'expired' | 'archived' | undefined,
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
