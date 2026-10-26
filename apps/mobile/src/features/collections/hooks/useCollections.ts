import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collectionsService } from '../services/collectionsService';
import { resolveCollectionsLang } from '../data/defaultCollections';
import { CollectionItem } from '../types';
import { useAuthStore } from '../../../stores/auth.store';
import { ALBUMS_QUERY_KEY } from '../../../hooks/useAlbums';
import { useToast } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';

export const COLLECTIONS_QUERY_KEY = ['collections'];

export function useCollections() {
  const { user } = useAuthStore();
  const { i18n } = useTranslation();
  const lang = resolveCollectionsLang(i18n.language);

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
  const lang = resolveCollectionsLang(i18n.language);

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
        title: t('collections.cloned_title'),
        message: t('collections.cloned_toast', {
          title: collection.title,
          count: data.tasksCount,
        }),
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: t('collections.clone_error_title'),
        message:
          err.message ||
          t('collections.clone_error_msg'),
        type: 'error',
      });
    },
  });
}

export function useCreateCollection() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const toast = useToast();

  return useMutation({
    mutationFn: async (params: Parameters<typeof collectionsService.createCollection>[0]) => {
      return collectionsService.createCollection(params);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.show({
        title: t('collections.toast_created_title'),
        message: t('collections.toast_created_msg', { title: data.title }),
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: t('collections.toast_create_error_title'),
        message: err.message || t('collections.err_create'),
        type: 'error',
      });
    },
  });
}

export function usePromoteAlbumToCollection() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const toast = useToast();

  return useMutation({
    mutationFn: async (params: Parameters<typeof collectionsService.promoteAlbumToCollection>[0]) => {
      return collectionsService.promoteAlbumToCollection(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.show({
        title: t('collections.toast_promoted_title'),
        message: t('collections.toast_promoted_msg'),
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: t('collections.toast_promote_error_title'),
        message: err.message || t('collections.err_promote'),
        type: 'error',
      });
    },
  });
}

export function useUpdateCollection() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const toast = useToast();

  return useMutation({
    mutationFn: async (params: Parameters<typeof collectionsService.updateCollection>[0]) => {
      return collectionsService.updateCollection(params);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.show({
        title: t('collections.toast_updated_title'),
        message: t('collections.toast_updated_msg', { title: data.title }),
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: t('collections.toast_update_error_title'),
        message: err.message || t('collections.err_update'),
        type: 'error',
      });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const toast = useToast();

  return useMutation({
    mutationFn: async (collectionId: string) => {
      return collectionsService.deleteCollection(collectionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast.show({
        title: t('collections.toast_deleted_title'),
        message: t('collections.toast_deleted_msg'),
        type: 'success',
      });
    },
    onError: (err: any) => {
      toast.show({
        title: t('collections.toast_delete_error_title'),
        message: err.message || t('collections.err_delete'),
        type: 'error',
      });
    },
  });
}
