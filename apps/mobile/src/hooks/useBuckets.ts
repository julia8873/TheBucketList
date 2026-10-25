import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@bucketlist/ui';
import { bucketApi } from '../services/api/bucket';
import { useOfflineStore } from '../stores/offline.store';
import { triggerTaskCompletedHaptic } from '../stores/haptics.store';
import type { CreateBucketForm, UpdateBucketForm } from '@bucketlist/shared';
import {
  applyDeleteTasks,
  beginOptimistic,
  patchTasks,
  rollbackOptimistic,
  settleTaskCaches,
} from '../utils/optimisticCache';

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
      toast.success('Tarea creada con éxito');
      void queryClient.invalidateQueries({ queryKey: BUCKETS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['calendar_month'] });
      // Si se creó dentro de un álbum, que el álbum y la lista de «Añadir tareas» lo reflejen.
      void queryClient.invalidateQueries({ queryKey: ['album'] });
      void queryClient.invalidateQueries({ queryKey: ['albums'] });
      void queryClient.invalidateQueries({ queryKey: ['unassigned_tasks'] });
    },
  });
}

export function useUpdateBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBucketForm }) => {
      if (data.status === 'completed') {
        triggerTaskCompletedHaptic();
      }
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
    onMutate: async ({ id, data }: { id: string; data: UpdateBucketForm }) => {
      const snap = await beginOptimistic(queryClient);
      const patch: Record<string, any> = {};
      Object.entries(data as Record<string, any>).forEach(([k, v]) => {
        if (v !== undefined) patch[k] = v instanceof Date ? v.toISOString() : v;
      });
      if (data.status === 'completed' && !(data as any).completed_at) {
        patch.completed_at = new Date().toISOString();
      }
      patchTasks(queryClient, [id], {
        bucket: patch,
        task: {
          ...(data.status !== undefined ? { isCompleted: data.status === 'completed' } : {}),
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...((data as any).priority !== undefined ? { priority: (data as any).priority } : {}),
          ...((data as any).cover_image !== undefined ? { imageValue: (data as any).cover_image } : {}),
        },
      });
      return { snap };
    },
    onError: (_e, _vars, ctx) => {
      rollbackOptimistic(queryClient, ctx?.snap);
    },
    onSuccess: (_updatedBucket, variables) => {
      // Refresh both the list queries and the detail screen. The detail
      // screen uses its own cache key, so invalidating only ['buckets']
      // leaves the old title/description visible after returning from edit.
      void queryClient.invalidateQueries({ queryKey: BUCKETS_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['bucketDetail', variables.id] });
      void queryClient.invalidateQueries({ queryKey: ['calendar_month'] });
      void queryClient.invalidateQueries({ queryKey: ['album'] });
      void queryClient.invalidateQueries({ queryKey: ['albums'] });
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
    // Borrado optimista: la tarea desaparece al instante de listas y álbumes.
    onMutate: async (id: string) => {
      const snap = await beginOptimistic(queryClient);
      applyDeleteTasks(queryClient, [id]);
      return { snap };
    },
    onError: (_e, _id, ctx) => {
      rollbackOptimistic(queryClient, ctx?.snap);
    },
    onSuccess: () => {
      toast.success('Tarea eliminada');
    },
    onSettled: () => {
      settleTaskCaches(queryClient);
      void queryClient.invalidateQueries({ queryKey: ['feed'] });
      void queryClient.invalidateQueries({ queryKey: ['explore'] });
    },
  });
}
