import { i18n } from '@bucketlist/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth.store';
import type { UserFavoritesData } from '../services/api/favorites';
import { favoritesApi } from '../services/api/favorites';

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
      if (!userId) throw new Error(i18n.t('auth.err_not_authenticated', { defaultValue: 'Usuario no autenticado' }));
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
      if (!userId) throw new Error(i18n.t('auth.err_not_authenticated', { defaultValue: 'Usuario no autenticado' }));
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
        void queryClient.invalidateQueries({ queryKey: ['saved-albums', userId] });
      }
    },
  });
}

/** Full album details for albums the user has liked/favorited. */
export function useSavedAlbums(userId: string | undefined) {
  const { supabase: _s } = { supabase: null }; // unused, just for scope
  return useQuery({
    queryKey: ['saved-albums', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { supabase: supabaseClient } = await import('../services/supabase');

      const { data: favRows, error: favErr } = await (supabaseClient as any)
        .from('user_favorites')
        .select('album_id')
        .eq('user_id', userId)
        .not('album_id', 'is', null);

      if (favErr) throw favErr;

      const albumIds = (favRows ?? [])
        .map((r: any) => r.album_id)
        .filter(Boolean) as string[];

      if (albumIds.length === 0) return [];

      const { data: albums, error: albumsErr } = await supabaseClient
        .from('albums')
        .select('id, title, description, cover_path, visibility, is_shared, priority, is_closed, closed_at, created_at, owner_id')
        .in('id', albumIds)
        .order('created_at', { ascending: false });

      if (albumsErr) throw albumsErr;

      const ownerIds = [...new Set((albums ?? []).map((a: any) => a.owner_id as string))];
      const ownerMap = new Map<string, any>();
      if (ownerIds.length > 0) {
        const { data: profiles } = await supabaseClient
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', ownerIds);
        (profiles ?? []).forEach((p: any) => ownerMap.set(p.id, p));
      }

      const { data: progressData } = await supabaseClient
        .from('album_progress')
        .select('album_id, total_tasks, completed_tasks')
        .in('album_id', albumIds);

      return (albums ?? []).map((album: any) => {
        const prog = (progressData ?? []).find((p: any) => p.album_id === album.id);
        const owner = ownerMap.get(album.owner_id);
        return {
          id: album.id,
          title: album.title,
          description: album.description ?? null,
          cover_path: album.cover_path ?? null,
          visibility: album.visibility,
          is_shared: album.is_shared,
          priority: (album.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
          is_closed: Boolean(album.is_closed),
          closed_at: album.closed_at ?? null,
          created_at: album.created_at ?? undefined,
          total_tasks: prog?.total_tasks ?? 0,
          completed_tasks: prog?.completed_tasks ?? 0,
          owner_id: album.owner_id,
          owner_username: owner?.username ?? null,
          owner_display_name: owner?.display_name ?? null,
          owner_avatar_url: owner?.avatar_url ?? null,
        };
      });
    },
    enabled: !!userId,
  });
}

