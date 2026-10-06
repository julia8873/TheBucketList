import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { socialApi } from '../services/api/social';
import { FEED_QUERY_KEY, EXPLORE_QUERY_KEY } from './useFeed';
import { supabase } from '../services/supabase';

export const FOLLOWS_QUERY_KEY = ['follows'];
export const PROFILE_SEARCH_KEY = ['profileSearch'];

export function useFollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ followerId, followingId }: { followerId: string; followingId: string }) =>
      socialApi.followUser(followerId, followingId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: [...FOLLOWS_QUERY_KEY, variables.followerId] });
      void queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
    },
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ followerId, followingId }: { followerId: string; followingId: string }) =>
      socialApi.unfollowUser(followerId, followingId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: [...FOLLOWS_QUERY_KEY, variables.followerId] });
      void queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
    },
  });
}

export function useToggleReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bucketId, userId, emoji }: { bucketId: string; userId: string; emoji: string }) =>
      socialApi.toggleReaction(bucketId, userId, emoji),
    onSuccess: () => {
      // Invalidate both feed and explore so reactions update
      void queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: EXPLORE_QUERY_KEY });
    },
  });
}

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: [...PROFILE_SEARCH_KEY, query],
    queryFn: () => socialApi.searchUsers(query),
    enabled: query.length >= 2,
  });
}

export function useUserFollows(userId?: string) {
  return useQuery({
    queryKey: [...FOLLOWS_QUERY_KEY, userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('follows')
        .select('following_id, status')
        .eq('follower_id', userId);
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export const COMMENTS_QUERY_KEY = ['comments'];

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bucketId, userId, body }: { bucketId: string; userId: string; body: string }) =>
      socialApi.addComment(bucketId, userId, body),
    onSuccess: (data, variables) => {
      void queryClient.invalidateQueries({ queryKey: [...COMMENTS_QUERY_KEY, variables.bucketId] });
      void queryClient.invalidateQueries({ queryKey: ['bucketDetail', variables.bucketId] });
    },
  });
}

export function useCopyBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bucketId, userId }: { bucketId: string; userId: string }) =>
      socialApi.copyBucket(bucketId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['buckets'] });
    },
  });
}
