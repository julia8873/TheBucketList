import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';

export function useBulkTaskOperations() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const userId = user?.id;

  const invalidateAllTaskData = () => {
    void queryClient.invalidateQueries({ queryKey: ['buckets'] });
    void queryClient.invalidateQueries({ queryKey: ['albums'] });
    void queryClient.invalidateQueries({ queryKey: ['albums', 'items'] });
    void queryClient.invalidateQueries({ queryKey: ['tagUsage'] });
    void queryClient.invalidateQueries({ queryKey: ['item_tags'] });
    void queryClient.invalidateQueries({ queryKey: ['feed'] });
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    void queryClient.invalidateQueries({ queryKey: ['entity_subscribers'] });
  };

  // 1. Mover de álbum (o poner Sin Álbum)
  const moveTasksToAlbum = useMutation({
    mutationFn: async ({
      taskIds,
      albumId,
    }: {
      taskIds: string[];
      albumId: string | null;
    }) => {
      if (!taskIds.length) return;

      // Primero borrar de cualquier álbum anterior
      const { error: delErr } = await supabase
        .from('album_items')
        .delete()
        .in('bucket_id', taskIds);
      if (delErr) throw delErr;

      // Si se especificó un álbum de destino, insertar los items
      if (albumId && albumId !== 'unassigned') {
        const rows = taskIds.map((bucketId, idx) => ({
          album_id: albumId,
          bucket_id: bucketId,
          position: idx,
        }));
        const { error: insErr } = await supabase.from('album_items').insert(rows);
        if (insErr) throw insErr;
      }
    },
    onSuccess: invalidateAllTaskData,
  });

  // 2. Asignar etiquetas a múltiples tareas
  const assignTagsToTasks = useMutation({
    mutationFn: async ({
      taskIds,
      tagIds,
    }: {
      taskIds: string[];
      tagIds: string[];
    }) => {
      if (!taskIds.length || !tagIds.length) return;

      const rows: Array<{ item_id: string; tag_id: string }> = [];
      for (const bucketId of taskIds) {
        for (const tagId of tagIds) {
          rows.push({ item_id: bucketId, tag_id: tagId });
        }
      }

      const { error } = await supabase.from('item_tags').upsert(rows, {
        onConflict: 'item_id,tag_id',
      });
      if (error) throw error;
    },
    onSuccess: invalidateAllTaskData,
  });

  // 3. Compartir con una persona (añadir colaborador a múltiples tareas)
  const shareTasksWithUser = useMutation({
    mutationFn: async ({
      taskIds,
      collaboratorId,
    }: {
      taskIds: string[];
      collaboratorId: string;
    }) => {
      if (!taskIds.length || !collaboratorId) return;

      const rows = taskIds.map((bucketId) => ({
        bucket_id: bucketId,
        user_id: collaboratorId,
        status: 'accepted',
      }));

      const { error } = await supabase.from('bucket_collaborators').upsert(rows, {
        onConflict: 'bucket_id,user_id',
      });
      if (error) throw error;
    },
    onSuccess: invalidateAllTaskData,
  });

  // 4. Completar todas las tareas seleccionadas
  const completeAllTasks = useMutation({
    mutationFn: async (taskIds: string[]) => {
      if (!taskIds.length) return;
      const { error } = await supabase
        .from('buckets')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .in('id', taskIds);
      if (error) throw error;
    },
    onSuccess: invalidateAllTaskData,
  });

  // 5. Reabrir todas las tareas seleccionadas
  const reopenAllTasks = useMutation({
    mutationFn: async (taskIds: string[]) => {
      if (!taskIds.length) return;
      const { error } = await supabase
        .from('buckets')
        .update({
          status: 'in_progress',
          completed_at: null,
        })
        .in('id', taskIds);
      if (error) throw error;
    },
    onSuccess: invalidateAllTaskData,
  });

  // 6. Borrar todas las tareas seleccionadas
  const deleteAllTasks = useMutation({
    mutationFn: async (taskIds: string[]) => {
      if (!taskIds.length) return;
      const { error } = await supabase
        .from('buckets')
        .delete()
        .in('id', taskIds);
      if (error) throw error;
    },
    onSuccess: invalidateAllTaskData,
  });

  // 7. Vaciar / limpiar notificaciones y suscriptores de las tareas seleccionadas
  const clearNotificationsForTasks = useMutation({
    mutationFn: async (taskIds: string[]) => {
      if (!taskIds.length) return;
      // Eliminar suscriptores de estas tareas
      await supabase
        .from('entity_notification_subscribers')
        .delete()
        .in('bucket_id', taskIds);

      // Eliminar notificaciones recibidas sobre estas tareas
      await supabase
        .from('notifications')
        .delete()
        .in('bucket_id', taskIds);
    },
    onSuccess: invalidateAllTaskData,
  });

  // 8. Cambiar prioridad en lote
  const changePriorityForTasks = useMutation({
    mutationFn: async ({
      taskIds,
      priority,
    }: {
      taskIds: string[];
      priority: 'low' | 'medium' | 'high';
    }) => {
      if (!taskIds.length) return;
      const { error } = await supabase
        .from('buckets')
        .update({ priority })
        .in('id', taskIds);
      if (error) throw error;
    },
    onSuccess: invalidateAllTaskData,
  });

  // 9. Cambiar visibilidad en lote
  const changeVisibilityForTasks = useMutation({
    mutationFn: async ({
      taskIds,
      visibility,
    }: {
      taskIds: string[];
      visibility: 'public' | 'private' | 'followers';
    }) => {
      if (!taskIds.length) return;
      const { error } = await supabase
        .from('buckets')
        .update({ visibility })
        .in('id', taskIds);
      if (error) throw error;
    },
    onSuccess: invalidateAllTaskData,
  });

  // 10. Marcar / Desmarcar como favoritas en lote
  const setFavoritesForTasks = useMutation({
    mutationFn: async ({
      taskIds,
      favorite,
    }: {
      taskIds: string[];
      favorite: boolean;
    }) => {
      if (!taskIds.length || !userId) return;
      if (favorite) {
        const rows = taskIds.map((bucketId) => ({
          user_id: userId,
          bucket_id: bucketId,
        }));
        await supabase.from('user_favorites').upsert(rows, {
          onConflict: 'user_id,bucket_id',
        });
      } else {
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', userId)
          .in('bucket_id', taskIds);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['userFavorites'] });
    },
  });

  return {
    moveTasksToAlbum,
    assignTagsToTasks,
    shareTasksWithUser,
    completeAllTasks,
    reopenAllTasks,
    deleteAllTasks,
    clearNotificationsForTasks,
    changePriorityForTasks,
    changeVisibilityForTasks,
    setFavoritesForTasks,
  };
}
