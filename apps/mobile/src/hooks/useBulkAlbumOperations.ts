import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';
import { triggerTaskCompletedHaptic } from '../stores/haptics.store';
import { ALBUMS_QUERY_KEY, AlbumWithProgress } from './useAlbums';

export function useBulkAlbumOperations() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  const invalidateAllAlbumData = () => {
    void queryClient.invalidateQueries({ queryKey: ALBUMS_QUERY_KEY });
    void queryClient.invalidateQueries({ queryKey: ['buckets'] });
    void queryClient.invalidateQueries({ queryKey: ['albums', 'items'] });
    void queryClient.invalidateQueries({ queryKey: ['album_tags'] });
    void queryClient.invalidateQueries({ queryKey: ['tagUsage'] });
    void queryClient.invalidateQueries({ queryKey: ['album_members'] });
    void queryClient.invalidateQueries({ queryKey: ['userFavorites'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    void queryClient.invalidateQueries({ queryKey: ['entity_subscribers'] });
  };

  // Helper para parchear álbumes de forma optimista en la caché de React Query
  const patchAlbumsOptimistically = (
    albumIds: string[],
    patcher: (album: AlbumWithProgress) => AlbumWithProgress
  ) => {
    const idSet = new Set(albumIds);
    queryClient.setQueriesData<AlbumWithProgress[]>({ queryKey: ALBUMS_QUERY_KEY }, (old: any) => {
      if (!Array.isArray(old)) return old;
      return old.map((album) => (idSet.has(album.id) ? patcher(album) : album));
    });
  };

  // 1. Asignar etiquetas a múltiples álbumes
  const assignTagsToAlbums = useMutation({
    mutationFn: async ({
      albumIds,
      tagIds,
    }: {
      albumIds: string[];
      tagIds: string[];
    }) => {
      if (!albumIds.length || !tagIds.length) return;

      const rows: Array<{ album_id: string; tag_id: string }> = [];
      for (const albumId of albumIds) {
        for (const tagId of tagIds) {
          rows.push({ album_id: albumId, tag_id: tagId });
        }
      }

      const { error } = await supabase.from('album_tags').upsert(rows, {
        onConflict: 'album_id,tag_id',
      });
      if (error) throw error;
    },
    onMutate: ({ albumIds, tagIds }) => {
      patchAlbumsOptimistically(albumIds, (alb) => {
        const existingTags = alb.tags || [];
        const nextTags = Array.from(new Set([...existingTags, ...tagIds]));
        return { ...alb, tags: nextTags };
      });
    },
    onSettled: invalidateAllAlbumData,
  });

  // 2. Compartir con una persona (añadir miembro a múltiples álbumes)
  const shareAlbumsWithUser = useMutation({
    mutationFn: async ({
      albumIds,
      collaboratorId,
    }: {
      albumIds: string[];
      collaboratorId: string;
    }) => {
      if (!albumIds.length || !collaboratorId) return;

      const rows = albumIds.map((albumId) => ({
        album_id: albumId,
        user_id: collaboratorId,
        role: 'member',
        status: 'accepted',
      }));

      const { error: memberErr } = await supabase.from('album_members').upsert(rows, {
        onConflict: 'album_id,user_id',
      });
      if (memberErr) throw memberErr;

      // Marcar los álbumes como compartidos
      const { error: albErr } = await supabase
        .from('albums')
        .update({ is_shared: true })
        .in('id', albumIds);
      if (albErr) throw albErr;
    },
    onMutate: ({ albumIds }) => {
      patchAlbumsOptimistically(albumIds, (alb) => ({ ...alb, is_shared: true }));
    },
    onSettled: invalidateAllAlbumData,
  });

  // 3. Completar todas las tareas de los álbumes seleccionados
  const completeAllTasksInAlbums = useMutation({
    mutationFn: async (albumIds: string[]) => {
      if (!albumIds.length) return;
      triggerTaskCompletedHaptic();

      // Obtener todos los bucket_id de los álbumes seleccionados
      const { data: items, error: itemsErr } = await supabase
        .from('album_items')
        .select('bucket_id')
        .in('album_id', albumIds);
      if (itemsErr) throw itemsErr;

      const bucketIds = (items || []).map((it) => it.bucket_id).filter(Boolean);
      if (bucketIds.length > 0) {
        const now = new Date().toISOString();
        const { error: updErr } = await supabase
          .from('buckets')
          .update({
            status: 'completed',
            completed_at: now,
          })
          .in('id', bucketIds);
        if (updErr) throw updErr;
      }
    },
    onMutate: (albumIds) => {
      patchAlbumsOptimistically(albumIds, (alb) => ({
        ...alb,
        completed_tasks: alb.total_tasks,
      }));
    },
    onSettled: invalidateAllAlbumData,
  });

  // 4. Reabrir todas las tareas de los álbumes seleccionados
  const reopenAllTasksInAlbums = useMutation({
    mutationFn: async (albumIds: string[]) => {
      if (!albumIds.length) return;

      const { data: items, error: itemsErr } = await supabase
        .from('album_items')
        .select('bucket_id')
        .in('album_id', albumIds);
      if (itemsErr) throw itemsErr;

      const bucketIds = (items || []).map((it) => it.bucket_id).filter(Boolean);
      if (bucketIds.length > 0) {
        const { error: updErr } = await supabase
          .from('buckets')
          .update({
            status: 'in_progress',
            completed_at: null,
          })
          .in('id', bucketIds);
        if (updErr) throw updErr;
      }
    },
    onMutate: (albumIds) => {
      patchAlbumsOptimistically(albumIds, (alb) => ({
        ...alb,
        completed_tasks: 0,
      }));
    },
    onSettled: invalidateAllAlbumData,
  });

  // 5. Cerrar o reabrir álbumes
  const toggleCloseAlbums = useMutation({
    mutationFn: async ({
      albumIds,
      isClosed,
    }: {
      albumIds: string[];
      isClosed: boolean;
    }) => {
      if (!albumIds.length) return;
      const now = isClosed ? new Date().toISOString() : null;
      const { error } = await supabase
        .from('albums')
        .update({
          is_closed: isClosed,
          closed_at: now,
        })
        .in('id', albumIds);
      if (error) throw error;
    },
    onMutate: ({ albumIds, isClosed }) => {
      const now = isClosed ? new Date().toISOString() : null;
      patchAlbumsOptimistically(albumIds, (alb) => ({
        ...alb,
        is_closed: isClosed,
        closed_at: now,
      }));
    },
    onSettled: invalidateAllAlbumData,
  });

  // 6. Eliminar álbumes seleccionados
  const deleteAllAlbums = useMutation({
    mutationFn: async (albumIds: string[]) => {
      if (!albumIds.length) return;
      const { error } = await supabase.from('albums').delete().in('id', albumIds);
      if (error) throw error;
    },
    onMutate: (albumIds) => {
      const idSet = new Set(albumIds);
      queryClient.setQueriesData<AlbumWithProgress[]>({ queryKey: ALBUMS_QUERY_KEY }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((alb) => !idSet.has(alb.id));
      });
    },
    onSettled: invalidateAllAlbumData,
  });

  // 7. Vaciar notificaciones y suscriptores de los álbumes seleccionados
  const clearNotificationsForAlbums = useMutation({
    mutationFn: async (albumIds: string[]) => {
      if (!albumIds.length) return;

      await supabase
        .from('entity_notification_subscribers')
        .delete()
        .in('album_id', albumIds);

      await supabase
        .from('notifications')
        .delete()
        .in('album_id', albumIds);
    },
    onSettled: invalidateAllAlbumData,
  });

  // 8. Cambiar prioridad en lote
  const changePriorityForAlbums = useMutation({
    mutationFn: async ({
      albumIds,
      priority,
    }: {
      albumIds: string[];
      priority: 'low' | 'medium' | 'high' | 'urgent';
    }) => {
      if (!albumIds.length) return;
      const { error } = await supabase
        .from('albums')
        .update({ priority })
        .in('id', albumIds);
      if (error) throw error;
    },
    onMutate: ({ albumIds, priority }) => {
      patchAlbumsOptimistically(albumIds, (alb) => ({ ...alb, priority }));
    },
    onSettled: invalidateAllAlbumData,
  });

  // 9. Cambiar visibilidad en lote
  const changeVisibilityForAlbums = useMutation({
    mutationFn: async ({
      albumIds,
      visibility,
    }: {
      albumIds: string[];
      visibility: 'public' | 'private' | 'followers';
    }) => {
      if (!albumIds.length) return;
      const { error } = await supabase
        .from('albums')
        .update({ visibility })
        .in('id', albumIds);
      if (error) throw error;
    },
    onMutate: ({ albumIds, visibility }) => {
      patchAlbumsOptimistically(albumIds, (alb) => ({ ...alb, visibility }));
    },
    onSettled: invalidateAllAlbumData,
  });

  // 10. Marcar / Desmarcar como favoritos en lote
  const setFavoritesForAlbums = useMutation({
    mutationFn: async ({
      albumIds,
      favorite,
    }: {
      albumIds: string[];
      favorite: boolean;
    }) => {
      if (!albumIds.length || !userId) return;
      if (favorite) {
        const rows = albumIds.map((albumId) => ({
          user_id: userId,
          album_id: albumId,
        }));
        await supabase.from('user_favorites').upsert(rows, {
          onConflict: 'user_id,album_id',
        });
      } else {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', userId)
          .in('album_id', albumIds);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['userFavorites'] });
    },
  });

  return {
    assignTagsToAlbums,
    shareAlbumsWithUser,
    completeAllTasksInAlbums,
    reopenAllTasksInAlbums,
    toggleCloseAlbums,
    deleteAllAlbums,
    clearNotificationsForAlbums,
    changePriorityForAlbums,
    changeVisibilityForAlbums,
    setFavoritesForAlbums,
  };
}
