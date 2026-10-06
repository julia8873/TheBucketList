import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feedApi } from '../services/api/feed';

export const FEED_QUERY_KEY = ['feed'];
export const EXPLORE_QUERY_KEY = ['explore'];

export function useFeed(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: [...FEED_QUERY_KEY, userId],
    queryFn: ({ pageParam = 0 }) => feedApi.getFeed(userId!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!userId,
  });
}

export function useExploreFeed() {
  return useInfiniteQuery({
    queryKey: EXPLORE_QUERY_KEY,
    queryFn: ({ pageParam = 0 }) => feedApi.getExploreFeed(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
