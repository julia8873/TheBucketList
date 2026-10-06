import { supabase } from '../supabase';

export const feedApi = {
  getFeed: async (userId: string, pageParam: number = 0) => {
    const limit = 10;
    
    // In a real app with large data, it's better to use an RPC function for the feed
    // to filter by followed users and apply cursor pagination securely.
    // For this MVP, we query feed_events and join data.
    
    // We only want feed events from people the user follows (and the user themselves)
    // First, get following IDs
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .eq('status', 'accepted');
      
    const followingIds = follows?.map(f => f.following_id) || [];
    const targetIds = [...followingIds, userId];

    const { data, error } = await supabase
      .from('feed_events')
      .select(`
        *,
        actor:profiles(*),
        bucket:buckets!inner(
          *,
          bucket_photos(thumb_path, storage_path),
          reactions(emoji, user_id),
          comments:comments(count)
        )
      `)
      .in('actor_id', targetIds)
      // Only show if bucket is not private OR if the actor is the current user
      .or(`visibility.neq.private,user_id.eq.${userId}`, { referencedTable: 'bucket' })
      .order('created_at', { ascending: false })
      .range(pageParam * limit, (pageParam + 1) * limit - 1);

    if (error) throw error;
    
    return {
      items: data,
      nextCursor: data.length === limit ? pageParam + 1 : undefined,
    };
  },
  
  getExploreFeed: async (pageParam: number = 0) => {
    const limit = 15;
    const { data, error } = await supabase
      .from('buckets')
      .select(`
        *,
        user:profiles(*),
        bucket_photos(thumb_path, storage_path),
        reactions(emoji, user_id)
      `)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .range(pageParam * limit, (pageParam + 1) * limit - 1);
      
    if (error) throw error;
    
    return {
      items: data,
      nextCursor: data.length === limit ? pageParam + 1 : undefined,
    };
  }
};
