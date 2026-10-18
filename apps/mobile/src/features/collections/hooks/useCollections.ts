import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionsService } from '../services/collectionsService';
import { CollectionItem } from '../types';
import { useAuthStore } from '../../../stores/auth.store';
import { ALBUMS_QUERY_KEY } from '../../../hooks/useAlbums';
import { useToast } from '@bucketlist/ui';

export const COLLECTIONS_QUERY_KEY = ['collections'];

export function useCollections() {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: [...COLLECTIONS_QUERY_KEY, user?.id ?? 'anon'],
    queryFn: () => collectionsService.getCollections(user?.id),
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

export function useToggleCollectionLike() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: async (collectionId: string) => {
      return collectionsService.toggleLikeCollection(collectionId, user?.id);
    },
    onMutate: async (collectionId: string) => {
      const qKey = [...COLLECTIONS_QUERY_KEY, user?.id ?? 'anon'];
      await queryClient.cancelQueries({ queryKey: qKey });
      const prev = queryClient.getQueryData<CollectionItem[]>(qKey);

      if (prev) {
        queryClient.setQueryData<CollectionItem[]>(
          qKey,
          prev.map((c) => {
            if (c.id === collectionId) {
              const currentlyLiked = !!c.isLiked;
              const newCount = Math.max(0, (c.likesCount || 0) + (currentlyLiked ? -1 : 1));
              return {
                ...c,
                isLiked: !currentlyLiked,
                likesCount: newCount,
              };
            }
            return c;
          })
        );
      }

      return { prev, qKey };
    },
    onError: (_err, _id, context) => {
      if (context?.prev && context?.qKey) {
        queryClient.setQueryData(context.qKey, context.prev);
      }
    },
    onSettled: (_data, _err, _id, context) => {
      if (context?.qKey) {
        queryClient.invalidateQueries({ queryKey: context.qKey });
      } else {
        queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
      }
    },
  });
}

export function useCloneCollection() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const toast = useToast();

  return useMutation({
    mutationFn: async (collection: CollectionItem) => {
      if (!user?.id) throw new Error('Inicia sesión para clonar colecciones');
      return collectionsService.cloneCollection(user.id, collection);
    },
    onSuccess: (data, collection) => {
      // Invalidar álbumes, tareas y colecciones para que aparezcan al instante en Mi Lista con métricas actualizadas
      queryClient.invalidateQueries({ queryKey: ALBUMS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      queryClient.invalidateQueries({ queryKey: ['my_list'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });

      toast.show({
        title: '¡Colección añadida!',
        message: `"${collection.title}" se ha clonado en tus álbumes con ${data.tasksCount} tareas.`,
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: 'Error al clonar',
        message: err.message || 'No se pudo clonar la colección. Inténtalo de nuevo.',
        type: 'error',
      });
    },
  });
}
