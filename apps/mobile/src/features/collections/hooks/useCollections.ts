import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionsService } from '../services/collectionsService';
import { CollectionItem } from '../types';
import { useAuthStore } from '../../../stores/auth.store';
import { ALBUMS_QUERY_KEY } from '../../../hooks/useAlbums';
import { useToast } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';

export const COLLECTIONS_QUERY_KEY = ['collections'];

export function useCollections() {
  const { user } = useAuthStore();
  const { i18n } = useTranslation();
  const lang = i18n.language?.toLowerCase().startsWith('en') ? 'en' : 'es';

  return useQuery({
    queryKey: [...COLLECTIONS_QUERY_KEY, user?.id ?? 'anon', lang],
    queryFn: () => collectionsService.getCollections(user?.id, lang),
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

export function useToggleCollectionLike() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { i18n } = useTranslation();
  const lang = i18n.language?.toLowerCase().startsWith('en') ? 'en' : 'es';

  return useMutation({
    mutationFn: async (collectionId: string) => {
      return collectionsService.toggleLikeCollection(collectionId, user?.id);
    },
    onMutate: async (collectionId: string) => {
      const qKey = [...COLLECTIONS_QUERY_KEY, user?.id ?? 'anon', lang];
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
  const { t } = useTranslation();
  const toast = useToast();

  return useMutation({
    mutationFn: async (collection: CollectionItem) => {
      if (!user?.id) {
        throw new Error(
          t('collections.login_to_clone', {
            defaultValue: 'Inicia sesión para clonar colecciones',
          })
        );
      }
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
        title: t('collections.cloned_success_go', { defaultValue: '¡Colección añadida!' }),
        message: t('collections.cloned_toast', {
          title: collection.title,
          count: data.tasksCount,
          defaultValue: `"${collection.title}" se ha clonado en tus álbumes con ${data.tasksCount} tareas.`,
        }),
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: t('collections.clone_error_title', { defaultValue: 'Error al clonar' }),
        message:
          err.message ||
          t('collections.clone_error_msg', {
            defaultValue: 'No se pudo clonar la colección. Inténtalo de nuevo.',
          }),
        type: 'error',
      });
    },
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (params: Parameters<typeof collectionsService.createCollection>[0]) => {
      return collectionsService.createCollection(params);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.show({
        title: '¡Colección creada!',
        message: `"${data.title}" ya está visible para toda la comunidad.`,
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: 'Error al crear colección',
        message: err.message || 'No se pudo crear la colección.',
        type: 'error',
      });
    },
  });
}

export function usePromoteAlbumToCollection() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (params: Parameters<typeof collectionsService.promoteAlbumToCollection>[0]) => {
      return collectionsService.promoteAlbumToCollection(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.show({
        title: '¡Álbum promocionado!',
        message: 'El álbum ahora figura como colección comunitaria destacada.',
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: 'Error al promocionar',
        message: err.message || 'No se pudo promocionar a colección.',
        type: 'error',
      });
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (params: Parameters<typeof collectionsService.updateCollection>[0]) => {
      return collectionsService.updateCollection(params);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.show({
        title: '¡Colección actualizada!',
        message: `Los cambios en "${data.title}" se han guardado correctamente.`,
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: 'Error al actualizar',
        message: err.message || 'No se pudo actualizar la colección.',
        type: 'error',
      });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: async (collectionId: string) => {
      return collectionsService.deleteCollection(collectionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.show({
        title: 'Colección eliminada',
        message: 'La colección ha sido retirada correctamente.',
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: 'Error al eliminar',
        message: err.message || 'No se pudo eliminar la colección.',
        type: 'error',
      });
    },
  });
}
