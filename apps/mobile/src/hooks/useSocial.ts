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
    mutationFn: ({ followerId, followingId }: FollowVars) => socialApi.followUser(followerId, followingId),
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

// ─── Comentarios ──────────────────────────────────────────────────────────────

export const COMMENTS_QUERY_KEY = ['comments'];

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ bucketId, userId, body }: { bucketId: string; userId: string; body: string }) =>
      socialApi.addComment(bucketId, userId, body),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: [...COMMENTS_QUERY_KEY, variables.bucketId] });
      void queryClient.invalidateQueries({ queryKey: ['bucketDetail', variables.bucketId] });
      void queryClient.invalidateQueries({ queryKey: ['bucketComments', variables.bucketId] });
      void queryClient.invalidateQueries({ queryKey: FEED_QUERY_KEY });
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
    },
  });
}
