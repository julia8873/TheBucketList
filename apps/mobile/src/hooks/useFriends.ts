import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { friendsApi, type FollowStatus } from '../services/api/friends';

export const FRIENDS_QUERY_KEY = ['friends'];

/** Búsqueda de personas (la query ya llega con debounce desde la pantalla). */
export function usePeopleSearch(query: string) {
  const term = query.trim().replace(/^@/, '');
  return useQuery({
    queryKey: [...FRIENDS_QUERY_KEY, 'search', term],
    queryFn: () => friendsApi.searchPeople(term),
    enabled: term.length >= 2,
    staleTime: 15_000,
  });
}

/** Estadísticas + estado de seguimiento de un perfil público. */
export function useProfileStats(userId?: string) {
  return useQuery({
    queryKey: [...FRIENDS_QUERY_KEY, 'stats', userId],
    queryFn: () => friendsApi.getProfileStats(userId!),
    enabled: !!userId,
  });
}

export function useIncomingRequests(userId?: string) {
  return useQuery({
    queryKey: [...FRIENDS_QUERY_KEY, 'incoming', userId],
    queryFn: () => friendsApi.getIncomingRequests(userId!),
    enabled: !!userId,
    staleTime: 0,
  });
}

export function useOutgoingRequests(userId?: string) {
  return useQuery({
    queryKey: [...FRIENDS_QUERY_KEY, 'outgoing', userId],
    queryFn: () => friendsApi.getOutgoingRequests(userId!),
    enabled: !!userId,
    staleTime: 0,
  });
}

/** Nº de solicitudes recibidas pendientes (para "2 solicitudes" del feed). */
export function useIncomingRequestCount(userId?: string) {
  return useQuery({
    queryKey: [...FRIENDS_QUERY_KEY, 'incomingCount', userId],
    queryFn: () => friendsApi.getIncomingCount(userId!),
    enabled: !!userId,
    staleTime: 0,
    refetchInterval: 60_000,
  });
}

export function useAcceptRequest(myId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (followerId: string) => {
      if (!myId) throw new Error('Sin sesión');
      return friendsApi.acceptRequest(followerId, myId);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: FRIENDS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRejectRequest(myId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (followerId: string) => {
      if (!myId) throw new Error('Sin sesión');
      return friendsApi.rejectRequest(followerId, myId);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: FRIENDS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export type { FollowStatus };
