import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  entityNotificationsService,
  type EntitySubscriber,
} from '../services/api/entityNotificationsService';

export const ENTITY_SUBSCRIPTION_KEY = ['entity_subscription'];
export const ENTITY_SUBSCRIBERS_KEY = ['entity_subscribers'];

export function useEntitySubscription(
  targetType: 'bucket' | 'album',
  targetId?: string,
  subscriberId?: string
) {
  return useQuery({
    queryKey: [...ENTITY_SUBSCRIPTION_KEY, targetType, targetId, subscriberId],
    queryFn: () => entityNotificationsService.getSubscription(targetType, targetId!, subscriberId),
    enabled: !!targetId && !!subscriberId,
  });
}

export function useEntitySubscribers(
  targetType: 'bucket' | 'album',
  targetId?: string
) {
  return useQuery({
    queryKey: [...ENTITY_SUBSCRIBERS_KEY, targetType, targetId],
    queryFn: () => entityNotificationsService.getSubscribers(targetType, targetId!),
    enabled: !!targetId,
  });
}

export function useRequestEntityNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      targetType: 'bucket' | 'album';
      targetId: string;
      ownerId?: string;
      subscriberId: string;
      requesterId: string;
    }) => entityNotificationsService.requestSubscription(params),
    onSuccess: (data, vars) => {
      if (data) {
        queryClient.setQueryData(
          [...ENTITY_SUBSCRIPTION_KEY, vars.targetType, vars.targetId, vars.subscriberId],
          data
        );
      }
      void queryClient.invalidateQueries({
        queryKey: [...ENTITY_SUBSCRIPTION_KEY, vars.targetType, vars.targetId],
      });
      void queryClient.invalidateQueries({
        queryKey: [...ENTITY_SUBSCRIBERS_KEY, vars.targetType, vars.targetId],
      });
    },
  });
}

export function useRespondEntityNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ subscriptionId, accept }: { subscriptionId: string; accept: boolean }) =>
      entityNotificationsService.respondRequest(subscriptionId, accept),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ENTITY_SUBSCRIPTION_KEY });
      void queryClient.invalidateQueries({ queryKey: ENTITY_SUBSCRIBERS_KEY });
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRemoveEntitySubscriber() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      targetType: 'bucket' | 'album';
      targetId: string;
      subscriberId: string;
    }) => entityNotificationsService.removeSubscriber(params.targetType, params.targetId, params.subscriberId),
    onSuccess: (_, vars) => {
      queryClient.setQueryData(
        [...ENTITY_SUBSCRIPTION_KEY, vars.targetType, vars.targetId, vars.subscriberId],
        null
      );
      void queryClient.invalidateQueries({
        queryKey: [...ENTITY_SUBSCRIPTION_KEY, vars.targetType, vars.targetId],
      });
      void queryClient.invalidateQueries({
        queryKey: [...ENTITY_SUBSCRIBERS_KEY, vars.targetType, vars.targetId],
      });
    },
  });
}
