import { useInfiniteQuery } from '@tanstack/react-query';
import { feedApi } from '../services/api/feed';
import { useAuthStore } from '../stores/auth.store';

export const FEED_QUERY_KEY = ['feed'];
export const EXPLORE_QUERY_KEY = ['explore'];
export const FRIENDS_ALBUMS_QUERY_KEY = ['friends-albums'];
export const EXPLORE_ALBUMS_QUERY_KEY = ['explore-albums'];

export function useFeed(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: [...FEED_QUERY_KEY, userId],
    queryFn: ({ pageParam = 0 }) => feedApi.getFeed(userId!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!userId,
  });
}

export function useExploreFeed(explicitUserId?: string) {
  const { user } = useAuthStore();
  const userId = explicitUserId ?? user?.id;

  return useInfiniteQuery({
    queryKey: [...EXPLORE_QUERY_KEY, userId],
    queryFn: ({ pageParam = 0 }) => feedApi.getExploreFeed(pageParam, userId),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useFriendsAlbums(userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: [...FRIENDS_ALBUMS_QUERY_KEY, userId],
    queryFn: ({ pageParam = 0 }) => feedApi.getFriendsAlbums(userId!, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!userId,
  });
}

export function useExploreAlbums(explicitUserId?: string) {
  const { user } = useAuthStore();
  const userId = explicitUserId ?? user?.id;

  return useInfiniteQuery({
    queryKey: [...EXPLORE_ALBUMS_QUERY_KEY, userId],
    queryFn: ({ pageParam = 0 }) => feedApi.getExploreAlbums(pageParam, userId),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
