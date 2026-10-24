import {
  useMutation,
  useQueryClient,
  useQuery,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import { socialApi, LIKE_EMOJI } from '../services/api/social';
import type { FollowStatus, PersonResult, ProfileStats } from '../services/api/friends';
import { FEED_QUERY_KEY, EXPLORE_QUERY_KEY } from './useFeed';
import { FRIENDS_QUERY_KEY } from './useFriends';
import { supabase } from '../services/supabase';

export const FOLLOWS_QUERY_KEY = ['follows'];
export const PROFILE_SEARCH_KEY = ['profileSearch'];
export const COPIED_QUERY_KEY = ['copiedBuckets'];

// ─── Helpers de caché ─────────────────────────────────────────────────────────

function invalidateFollowCaches(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: FRIENDS_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: FOLLOWS_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: ['profile'] });
  void queryClient.invalidateQueries({ queryKey: ['buckets', 'public'] });
}

/** Cambia al instante el estado de seguimiento en búsqueda y perfil. */
function setFollowStatusInCaches(queryClient: QueryClient, targetId: string, status: FollowStatus) {
  queryClient.setQueriesData(
    { queryKey: [...FRIENDS_QUERY_KEY, 'search'] },
    (old: PersonResult[] | undefined) =>
      old?.map((p) => (p.id === targetId ? { ...p, follow_status: status } : p))
  );
  queryClient.setQueriesData(
    { queryKey: [...FRIENDS_QUERY_KEY, 'connections'] },
    (old: Array<{ id: string; follow_status: FollowStatus }> | undefined) =>
      old?.map((p) => (p.id === targetId ? { ...p, follow_status: status } : p))
  );
  queryClient.setQueriesData(
    { queryKey: [...FRIENDS_QUERY_KEY, 'stats', targetId] },
    (old: ProfileStats | undefined) => (old ? { ...old, follow_status: status } : old)
  );
}

type AnyBucket = Record<string, any>;

/** Aplica `fn` a una tarea concreta dentro de las cachés del feed y de explorar. */
function patchBucketInCaches(queryClient: QueryClient, bucketId: string, fn: (b: AnyBucket) => AnyBucket) {
  type Pages = InfiniteData<{ items: AnyBucket[] }> | undefined;
  queryClient.setQueriesData({ queryKey: FEED_QUERY_KEY }, (old: Pages) =>
    old
      ? {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((ev) =>
              ev?.bucket?.id === bucketId ? { ...ev, bucket: fn(ev.bucket) } : ev
            ),
          })),
        }
      : old
  );
  queryClient.setQueriesData({ queryKey: EXPLORE_QUERY_KEY }, (old: Pages) =>
    old
      ? {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            items: page.items.map((b) => (b?.id === bucketId ? fn(b) : b)),
          })),
        }
      : old
  );
}

// ─── Follows ──────────────────────────────────────────────────────────────────

interface FollowVars {
  followerId: string;
  followingId: string;
  /** Si el destino es una cuenta privada, el estado inmediato será 'pending'. */
  targetIsPrivate?: boolean;
}

export function useFollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ followerId, followingId }: FollowVars) => {
      if (followerId === followingId) {
        throw new Error('No puedes seguirte a ti mismo');
      }
      return socialApi.followUser(followerId, followingId);
    },
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: FRIENDS_QUERY_KEY });
      const previous = queryClient.getQueriesData({ queryKey: FRIENDS_QUERY_KEY });
      setFollowStatusInCaches(queryClient, vars.followingId, vars.targetIsPrivate ? 'pending' : 'accepted');
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => invalidateFollowCaches(queryClient),
  });
}

/** Dejar de seguir o cancelar una solicitud enviada. */
export function useUnfollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ followerId, followingId }: FollowVars) => socialApi.unfollowUser(followerId, followingId),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: FRIENDS_QUERY_KEY });
      const previous = queryClient.getQueriesData({ queryKey: FRIENDS_QUERY_KEY });
      setFollowStatusInCaches(queryClient, vars.followingId, 'none');
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => invalidateFollowCaches(queryClient),
  });
}

// ─── Reacciones ───────────────────────────────────────────────────────────────

export function useToggleReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bucketId, userId, emoji }: { bucketId: string; userId: string; emoji: string }) =>
      socialApi.toggleReaction(bucketId, userId, emoji),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: EXPLORE_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['bucketReactions', variables.bucketId] });
    },
  });
}

/** Corazón del feed, con actualización optimista. */
export function useToggleLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bucketId, userId }: { bucketId: string; userId: string }) =>
      socialApi.toggleLike(bucketId, userId),
    onMutate: async ({ bucketId, userId }) => {
      await queryClient.cancelQueries({ queryKey: FEED_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: EXPLORE_QUERY_KEY });
      const previousFeed = queryClient.getQueriesData({ queryKey: FEED_QUERY_KEY });
      const previousExplore = queryClient.getQueriesData({ queryKey: EXPLORE_QUERY_KEY });

      patchBucketInCaches(queryClient, bucketId, (bucket) => {
        const reactions: AnyBucket[] = bucket.reactions ?? [];
        const mine = reactions.some((r) => r.user_id === userId);
        return {
          ...bucket,
          reactions: mine
            ? reactions.filter((r) => r.user_id !== userId)
            : [...reactions, { emoji: LIKE_EMOJI, user_id: userId }],
        };
      });

      return { previousFeed, previousExplore };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.previousFeed.forEach(([key, data]) => queryClient.setQueryData(key, data));
      ctx?.previousExplore.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['bucketReactions', variables.bucketId] });
    },
  });
}

// ─── Búsqueda (explorar) ──────────────────────────────────────────────────────

export function useSearchUsers(query: string, currentUserId?: string) {
  return useQuery({
    queryKey: [...PROFILE_SEARCH_KEY, query, currentUserId],
    queryFn: () => socialApi.searchUsers(query, currentUserId),
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

// ─── Comentarios ──────────────────────────────────────────────────────────────

export const COMMENTS_QUERY_KEY = ['comments'];

export function useComments(targetId?: string, targetType: 'bucket' | 'album' = 'bucket') {
  return useQuery({
    queryKey: [...COMMENTS_QUERY_KEY, targetType, targetId],
    queryFn: () => (targetId ? socialApi.getComments(targetId, targetType) : Promise.resolve([])),
    enabled: !!targetId,
  });
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bucketId,
      albumId,
      targetType = albumId ? 'album' : 'bucket',
      userId,
      body,
      parentId,
    }: {
      bucketId?: string;
      albumId?: string;
      targetType?: 'bucket' | 'album';
      userId: string;
      body: string;
      parentId?: string | null;
    }) => {
      const id = targetType === 'album' ? (albumId || bucketId!) : (bucketId || albumId!);
      return socialApi.addComment(id, userId, body, parentId, targetType);
    },
    onSuccess: (_data, variables) => {
      const targetType = variables.targetType ?? (variables.albumId ? 'album' : 'bucket');
      const id = targetType === 'album' ? (variables.albumId || variables.bucketId!) : (variables.bucketId || variables.albumId!);
      void queryClient.invalidateQueries({ queryKey: [...COMMENTS_QUERY_KEY, targetType, id] });
      void queryClient.invalidateQueries({ queryKey: [...COMMENTS_QUERY_KEY, id] });
      if (targetType === 'bucket') {
        void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
        void queryClient.invalidateQueries({ queryKey: ['bucketComments', id] });
      } else {
        void queryClient.invalidateQueries({ queryKey: ['albumDetail', id] });
        void queryClient.invalidateQueries({ queryKey: ['albumComments', id] });
      }
      void queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
    },
  });
}

export function useUpdateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, body }: { commentId: string; bucketId?: string; albumId?: string; body: string }) =>
      socialApi.updateComment(commentId, body),
    onSuccess: (data, variables) => {
      const patchComments = (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((c) =>
          c.id === variables.commentId
            ? { ...c, ...data, body: variables.body, updated_at: data?.updated_at || new Date().toISOString() }
            : c
        );
      };

      if (variables.bucketId) {
        queryClient.setQueriesData({ queryKey: [...COMMENTS_QUERY_KEY, 'bucket', variables.bucketId] }, patchComments);
        queryClient.setQueriesData({ queryKey: [...COMMENTS_QUERY_KEY, variables.bucketId] }, patchComments);
        void queryClient.invalidateQueries({ queryKey: [...COMMENTS_QUERY_KEY, 'bucket', variables.bucketId] });
        void queryClient.invalidateQueries({ queryKey: [...COMMENTS_QUERY_KEY, variables.bucketId] });
        void queryClient.invalidateQueries({ queryKey: ['bucketComments', variables.bucketId] });
      }
      if (variables.albumId) {
        queryClient.setQueriesData({ queryKey: [...COMMENTS_QUERY_KEY, 'album', variables.albumId] }, patchComments);
        queryClient.setQueriesData({ queryKey: [...COMMENTS_QUERY_KEY, variables.albumId] }, patchComments);
        void queryClient.invalidateQueries({ queryKey: [...COMMENTS_QUERY_KEY, 'album', variables.albumId] });
        void queryClient.invalidateQueries({ queryKey: [...COMMENTS_QUERY_KEY, variables.albumId] });
        void queryClient.invalidateQueries({ queryKey: ['albumComments', variables.albumId] });
      }
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, bucketId, albumId }: { commentId: string; bucketId?: string; albumId?: string }) =>
      socialApi.deleteComment(commentId),
    onSuccess: (_data, variables) => {
      if (variables.bucketId) {
        void queryClient.invalidateQueries({ queryKey: [...COMMENTS_QUERY_KEY, 'bucket', variables.bucketId] });
        void queryClient.invalidateQueries({ queryKey: [...COMMENTS_QUERY_KEY, variables.bucketId] });
        void queryClient.invalidateQueries({ queryKey: ['bucketDetail', variables.bucketId] });
        void queryClient.invalidateQueries({ queryKey: ['bucketComments', variables.bucketId] });
      }
      if (variables.albumId) {
        void queryClient.invalidateQueries({ queryKey: [...COMMENTS_QUERY_KEY, 'album', variables.albumId] });
        void queryClient.invalidateQueries({ queryKey: [...COMMENTS_QUERY_KEY, variables.albumId] });
        void queryClient.invalidateQueries({ queryKey: ['albumDetail', variables.albumId] });
        void queryClient.invalidateQueries({ queryKey: ['albumComments', variables.albumId] });
      }
      void queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
    },
  });
}

type ToggleLikeVars = {
  commentId: string;
  userId: string;
  /** Id de la tarea o del álbum al que pertenece el comentario. */
  targetId?: string;
  targetType?: 'bucket' | 'album';
  /** @deprecated usar targetId (se mantiene por compatibilidad). */
  bucketId?: string;
};

function likeQueryKey(v: Pick<ToggleLikeVars, 'targetId' | 'targetType' | 'bucketId'>) {
  // La clave debe coincidir con la de `useComments`: ['comments', tipo, id]. Antes faltaba el tipo,
  // así que el "me gusta" optimista no se aplicaba y la lista no se refrescaba al instante.
  return [...COMMENTS_QUERY_KEY, v.targetType ?? 'bucket', v.targetId ?? v.bucketId] as const;
}

export function useToggleCommentLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ commentId, userId }: ToggleLikeVars) =>
      socialApi.toggleCommentLike(commentId, userId),
    onMutate: async (vars) => {
      const key = likeQueryKey(vars);
      await queryClient.cancelQueries({ queryKey: key });
      const previousComments = queryClient.getQueryData(key);

      queryClient.setQueryData(key, (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((c) => {
          if (c.id !== vars.commentId) return c;
          const currentLikes: Array<{ id?: string; user_id: string }> = c.likes ?? [];
          const alreadyLiked = currentLikes.some((l) => l.user_id === vars.userId);
          const newLikes = alreadyLiked
            ? currentLikes.filter((l) => l.user_id !== vars.userId)
            : [...currentLikes, { id: 'temp-' + Date.now(), user_id: vars.userId }];
          return {
            ...c,
            likes: newLikes,
          };
        });
      });

      return { previousComments };
    },
    onError: (_err, variables, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(likeQueryKey(variables), context.previousComments);
      }
    },
    onSettled: (_data, _err, variables) => {
      void queryClient.invalidateQueries({ queryKey: likeQueryKey(variables) });
    },
  });
}

// ─── "Yo también" ─────────────────────────────────────────────────────────────

export function useCopiedBucketIds(userId?: string) {
  return useQuery({
    queryKey: [...COPIED_QUERY_KEY, userId],
    queryFn: () => socialApi.getCopiedBucketIds(userId!),
    enabled: !!userId,
  });
}

export function useCopyBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bucketId, userId }: { bucketId: string; userId: string }) =>
      socialApi.copyBucket(bucketId, userId),
    onSuccess: (_data, variables) => {
      queryClient.setQueryData([...COPIED_QUERY_KEY, variables.userId], (old: string[] | undefined) =>
        old && !old.includes(variables.bucketId) ? [...old, variables.bucketId] : old ?? [variables.bucketId]
      );
      void queryClient.invalidateQueries({ queryKey: ['buckets'] });
      void queryClient.invalidateQueries({ queryKey: ['bucket-save-counts'] });
    },
  });
}

// ─── Tareas guardadas (bookmark de tareas ajenas) ─────────────────────

export function useSavedBucketIds(userId?: string) {
  return useQuery({
    queryKey: ['saved-bucket-ids', userId],
    queryFn: () => socialApi.getSavedBucketIds(userId!),
    enabled: !!userId,
  });
}

export function useSavedBucketsList(userId?: string) {
  return useQuery({
    queryKey: ['saved-buckets-full', userId],
    queryFn: () => socialApi.getSavedBucketsFull(userId!),
    enabled: !!userId,
  });
}

export function useToggleSaveBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      bucketId,
      currentlySaved,
    }: {
      userId: string;
      bucketId: string;
      currentlySaved: boolean;
    }) => socialApi.toggleSaveBucket(userId, bucketId, currentlySaved),
    onMutate: async ({ userId, bucketId, currentlySaved }) => {
      const queryKey = ['saved-bucket-ids', userId];
      await queryClient.cancelQueries({ queryKey });
      const prev = queryClient.getQueryData<string[]>(queryKey);
      queryClient.setQueryData<string[]>(queryKey, (old: string[] | undefined) => {
        const current = old ?? [];
        return currentlySaved ? current.filter((id) => id !== bucketId) : [...current, bucketId];
      });

      // Optimistic update for bucket-save-counts
      queryClient.setQueriesData<Record<string, number>>({ queryKey: ['bucket-save-counts'] }, (old: Record<string, number> | undefined) => {
        if (!old) return old;
        const currentCount = old[bucketId] ?? 0;
        return {
          ...old,
          [bucketId]: Math.max(0, currentCount + (currentlySaved ? -1 : 1)),
        };
      });

      return { prev };
    },
    onError: (_err, variables, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['saved-bucket-ids', variables.userId], context.prev);
      }
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['saved-bucket-ids', variables.userId] });
      void queryClient.invalidateQueries({ queryKey: ['saved-buckets-full', variables.userId] });
      void queryClient.invalidateQueries({ queryKey: ['bucket-save-counts'] });
    },
  });
}

// ─── Conteo de guardados / copias ──────────────────────────────────────────

export function useBatchBucketSaveCounts(bucketIds: string[]) {
  return useQuery({
    queryKey: ['bucket-save-counts', bucketIds.sort().join(',')],
    queryFn: () => socialApi.getBatchBucketSaveCounts(bucketIds),
    enabled: bucketIds.length > 0,
    staleTime: 1000 * 60,
  });
}

export function useBatchAlbumSaveCounts(albumIds: string[]) {
  return useQuery({
    queryKey: ['album-save-counts', albumIds.sort().join(',')],
    queryFn: () => socialApi.getBatchAlbumSaveCounts(albumIds),
    enabled: albumIds.length > 0,
    staleTime: 1000 * 60,
  });
}

export function useBatchAlbumLikeCounts(albumIds: string[]) {
  return useQuery({
    queryKey: ['album-like-counts', albumIds.sort().join(',')],
    queryFn: () => socialApi.getBatchAlbumLikeCounts(albumIds),
    enabled: albumIds.length > 0,
    staleTime: 1000 * 60,
  });
}

// ─── Likes en Álbumes ────────────────────────────────────────────────────────

export function useUserLikedAlbumIds(userId?: string) {
  return useQuery({
    queryKey: ['liked-album-ids', userId],
    queryFn: () => socialApi.getUserLikedAlbumIds(userId!),
    enabled: !!userId,
  });
}

export function useToggleAlbumLike() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ albumId, userId }: { albumId: string; userId: string }) =>
      socialApi.toggleAlbumLike(albumId, userId),
    onMutate: async ({ albumId, userId }) => {
      // 1. Update liked-ids list (existing)
      const idsKey = ['liked-album-ids', userId];
      await queryClient.cancelQueries({ queryKey: idsKey });
      const prevIds = queryClient.getQueryData<string[]>(idsKey);
      const alreadyLiked = (prevIds ?? []).includes(albumId);
      queryClient.setQueryData<string[]>(idsKey, (old: string[] | undefined) => {
        const current = old ?? [];
        return alreadyLiked ? current.filter((id: string) => id !== albumId) : [...current, albumId];
      });

      // 2. Update like count caches optimistically
      queryClient.setQueriesData(
        { queryKey: ['album-like-counts'], exact: false },
        (old: Record<string, number> | undefined) => {
          if (!old || !(albumId in old)) return old;
          return { ...old, [albumId]: Math.max(0, (old[albumId] ?? 0) + (alreadyLiked ? -1 : 1)) };
        }
      );

      return { prevIds, alreadyLiked };
    },
    onError: (_err, variables, context) => {
      if (context?.prevIds) {
        queryClient.setQueryData(['liked-album-ids', variables.userId], context.prevIds);
      }
      // Revert count change
      queryClient.setQueriesData(
        { queryKey: ['album-like-counts'], exact: false },
        (old: Record<string, number> | undefined) => {
          if (!old || !(variables.albumId in old)) return old;
          const wasLiked = context?.alreadyLiked ?? false;
          return { ...old, [variables.albumId]: Math.max(0, (old[variables.albumId] ?? 0) + (wasLiked ? 1 : -1)) };
        }
      );
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['liked-album-ids', variables.userId] });
      void queryClient.invalidateQueries({ queryKey: ['album-like-counts'] });
      void queryClient.invalidateQueries({ queryKey: ['liked-content', variables.userId] });
      void queryClient.invalidateQueries({ queryKey: ['friends-albums'] });
      void queryClient.invalidateQueries({ queryKey: ['explore-albums'] });
    },
  });
}

// ─── Álbumes Guardados (Bookmarking) ──────────────────────────────────────────

export function useSavedAlbumIds(userId?: string) {
  return useQuery({
    queryKey: ['saved-album-ids', userId],
    queryFn: () => socialApi.getSavedAlbumIds(userId!),
    enabled: !!userId,
  });
}

export function useSavedAlbumsList(userId?: string) {
  return useQuery({
    queryKey: ['saved-albums-full', userId],
    queryFn: () => socialApi.getSavedAlbumsFull(userId!),
    enabled: !!userId,
  });
}

export function useToggleSaveAlbum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      albumId,
      currentlySaved,
    }: {
      userId: string;
      albumId: string;
      currentlySaved: boolean;
    }) => socialApi.toggleSaveAlbum(userId, albumId, currentlySaved),
    onMutate: async ({ userId, albumId, currentlySaved }) => {
      // 1. Update saved-ids list
      const idsKey = ['saved-album-ids', userId];
      await queryClient.cancelQueries({ queryKey: idsKey });
      const prevIds = queryClient.getQueryData<string[]>(idsKey);
      queryClient.setQueryData<string[]>(idsKey, (old: string[] | undefined) => {
        const current = old ?? [];
        return currentlySaved ? current.filter((id: string) => id !== albumId) : [...current, albumId];
      });

      // 2. Update save count caches optimistically
      queryClient.setQueriesData(
        { queryKey: ['album-save-counts'], exact: false },
        (old: Record<string, number> | undefined) => {
          if (!old) return old;
          const currentCount = old[albumId] ?? 0;
          return { ...old, [albumId]: Math.max(0, currentCount + (currentlySaved ? -1 : 1)) };
        }
      );

      return { prevIds };
    },
    onError: (_err, variables, context) => {
      if (context?.prevIds) {
        queryClient.setQueryData(['saved-album-ids', variables.userId], context.prevIds);
      }
      // Revert count change
      queryClient.setQueriesData(
        { queryKey: ['album-save-counts'], exact: false },
        (old: Record<string, number> | undefined) => {
          if (!old || !(variables.albumId in old)) return old;
          return { ...old, [variables.albumId]: Math.max(0, (old[variables.albumId] ?? 0) + (variables.currentlySaved ? 1 : -1)) };
        }
      );
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['saved-album-ids', variables.userId] });
      void queryClient.invalidateQueries({ queryKey: ['saved-albums-full', variables.userId] });
      void queryClient.invalidateQueries({ queryKey: ['album-save-counts'] });
    },
  });
}

// ─── Contenido con Me gusta (Tareas y Álbumes) ──────────────────────────────

export function useLikedContent(userId?: string) {
  return useQuery({
    queryKey: ['liked-content', userId],
    queryFn: () => socialApi.getLikedContent(userId!),
    enabled: !!userId,
  });
}

