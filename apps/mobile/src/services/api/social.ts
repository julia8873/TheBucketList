import { supabase } from '../supabase';

export const socialApi = {
  // Follows
  followUser: async (followerId: string, followingId: string) => {
    // Triggers will handle setting status to 'pending' or 'accepted' based on target visibility
    const { data, error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },
  
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
    // Check if exists
    const { data: existing } = await supabase
      .from('reactions')
      .select('id, emoji')
      .match({ bucket_id: bucketId, user_id: userId })
      .maybeSingle();

    if (existing) {
      if (existing.emoji === emoji) {
        // Remove reaction
        const { error } = await supabase.from('reactions').delete().eq('id', existing.id);
        if (error) throw error;
        return { action: 'removed' };
      } else {
        // Update reaction
        const { error } = await supabase.from('reactions').update({ emoji }).eq('id', existing.id);
        if (error) throw error;
        return { action: 'updated', emoji };
      }
    } else {
      // Insert reaction
      const { error } = await supabase
        .from('reactions')
        .insert({ bucket_id: bucketId, user_id: userId, emoji });
      if (error) throw error;
      return { action: 'added', emoji };
    }
  },

  // Search
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

  // Copy Bucket
  copyBucket: async (bucketId: string, userId: string) => {
    // 1. Fetch original bucket
    const { data: original, error: fetchErr } = await supabase
      .from('buckets')
      .select('*')
      .eq('id', bucketId)
      .single();
      
    if (fetchErr) throw fetchErr;
    
    // 2. Insert new bucket with copied_from_id
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
        visibility: 'private', // start private
        status: 'pending',
        copied_from_id: original.id
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  }
};
