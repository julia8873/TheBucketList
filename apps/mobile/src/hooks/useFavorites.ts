import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store';
import { favoritesApi, UserFavoritesData } from '../services/api/favorites';

export const FAVORITES_QUERY_KEY = ['user_favorites'];

export function useUserFavorites(customUserId?: string) {
  const { user } = useAuthStore();
  const userId = customUserId || user?.id;

  const query = useQuery({
    queryKey: [...FAVORITES_QUERY_KEY, userId],
    queryFn: () => favoritesApi.getUserFavorites(userId || ''),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const bucketIdsSet = new Set(query.data?.bucketIds || []);
  const albumIdsSet = new Set(query.data?.albumIds || []);

  const isBucketFavorite = (bucketId?: string | null) => {
    if (!bucketId) return false;
    return bucketIdsSet.has(bucketId);
  };

  const isAlbumFavorite = (albumId?: string | null) => {
    if (!albumId) return false;
    return albumIdsSet.has(albumId);
  };

  return {
    ...query,
    bucketIds: query.data?.bucketIds || [],
    albumIds: query.data?.albumIds || [],
    isBucketFavorite,
    isAlbumFavorite,
  };
}

export function useToggleFavoriteBucket() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  return useMutation({
    mutationFn: async ({
      bucketId,
      currentlyFavorite,
    }: {
      bucketId: string;
      currentlyFavorite: boolean;
    }) => {
      if (!userId) throw new Error('Usuario no autenticado');
      return favoritesApi.toggleBucketFavorite(userId, bucketId, currentlyFavorite);
    },
    onMutate: async ({ bucketId, currentlyFavorite }) => {
      if (!userId) return;
      const queryKey = [...FAVORITES_QUERY_KEY, userId];
      await queryClient.cancelQueries({ queryKey });

      const previousFavorites = queryClient.getQueryData<UserFavoritesData>(queryKey);

      queryClient.setQueryData<UserFavoritesData>(queryKey, (old: UserFavoritesData | undefined) => {
        const currentBuckets = old?.bucketIds || [];
        const newBuckets = currentlyFavorite
          ? currentBuckets.filter((id: string) => id !== bucketId)
          : [...currentBuckets, bucketId];
        return {
          bucketIds: newBuckets,
          albumIds: old?.albumIds || [],
        };
      });

      return { previousFavorites };
    },
    onError: (_err, _variables, context) => {
      if (userId && context?.previousFavorites) {
        queryClient.setQueryData([...FAVORITES_QUERY_KEY, userId], context.previousFavorites);
      }
    },
    onSettled: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: [...FAVORITES_QUERY_KEY, userId] });
      }
    },
  });
}

export function useToggleFavoriteAlbum() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  return useMutation({
    mutationFn: async ({
      albumId,
      currentlyFavorite,
    }: {
      albumId: string;
      currentlyFavorite: boolean;
    }) => {
      if (!userId) throw new Error('Usuario no autenticado');
      return favoritesApi.toggleAlbumFavorite(userId, albumId, currentlyFavorite);
    },
    onMutate: async ({ albumId, currentlyFavorite }) => {
      if (!userId) return;
      const queryKey = [...FAVORITES_QUERY_KEY, userId];
      await queryClient.cancelQueries({ queryKey });

      const previousFavorites = queryClient.getQueryData<UserFavoritesData>(queryKey);

      queryClient.setQueryData<UserFavoritesData>(queryKey, (old: UserFavoritesData | undefined) => {
        const currentAlbums = old?.albumIds || [];
        const newAlbums = currentlyFavorite
          ? currentAlbums.filter((id: string) => id !== albumId)
          : [...currentAlbums, albumId];
        return {
          bucketIds: old?.bucketIds || [],
          albumIds: newAlbums,
        };
      });

      return { previousFavorites };
    },
    onError: (_err, _variables, context) => {
      if (userId && context?.previousFavorites) {
        queryClient.setQueryData([...FAVORITES_QUERY_KEY, userId], context.previousFavorites);
      }
    },
    onSettled: () => {
      if (userId) {
        void queryClient.invalidateQueries({ queryKey: [...FAVORITES_QUERY_KEY, userId] });
      }
    },
  });
}
