import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bucketApi } from '../services/api/bucket';
import { useOfflineStore } from '../stores/offline.store';
import type { CreateBucketForm, UpdateBucketForm } from '@bucketlist/shared';

export const BUCKETS_QUERY_KEY = ['buckets'];

export function useBuckets(userId?: string) {
  return useQuery({
    queryKey: [...BUCKETS_QUERY_KEY, userId],
    queryFn: () => bucketApi.getBuckets(userId),
  });
}

export function useCreateBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBucketForm) => {
      const isOnline = useOfflineStore.getState().isOnline;
      if (!isOnline) {
        useOfflineStore.getState().addMutation({
          type: 'CREATE_BUCKET',
          payload: data,
        });
        return { ...data, id: `temp-${Date.now()}`, status: 'pending' };
      }
      return bucketApi.createBucket(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BUCKETS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['calendar_month'] });
    },
  });
}

export function useUpdateBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBucketForm }) => {
      const isOnline = useOfflineStore.getState().isOnline;
      if (!isOnline) {
        useOfflineStore.getState().addMutation({
          type: 'UPDATE_BUCKET',
          bucketId: id,
          payload: data,
        });
        return { ...data, id };
      }
      return bucketApi.updateBucket(id, data);
    },
    onSuccess: (_updatedBucket, variables) => {
      // Refresh both the list queries and the detail screen. The detail
      // screen uses its own cache key, so invalidating only ['buckets']
      // leaves the old title/description visible after returning from edit.
      void queryClient.invalidateQueries({ queryKey: BUCKETS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['bucketDetail', variables.id] });
      void queryClient.invalidateQueries({ queryKey: ['calendar_month'] });
    },
  });
}

export function useDeleteBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const isOnline = useOfflineStore.getState().isOnline;
      if (!isOnline) {
        useOfflineStore.getState().addMutation({
          type: 'DELETE_BUCKET',
          bucketId: id,
          payload: {},
        });
        return id;
      }
      return bucketApi.deleteBucket(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: BUCKETS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['explore'] });
      void queryClient.invalidateQueries({ queryKey: ['calendar_month'] });
    },
  });
}
