import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { supabase } from '../services/supabase';
import { displayInAppNotification } from '../services/notifications';
import { isLocalEcho } from '../utils/optimisticCache';

/**
 * Espera tras el último cambio antes de recargar. Evita una avalancha de recargas
 * y que una recarga antigua pise cambios rápidos del propio usuario (p. ej. el contador).
 */
const DEBOUNCE_MS = 1500;

/**
 * Sincronización en tiempo real: cuando OTRA persona edita una tarea o un álbum
 * compartido, los datos se recargan solos en tu dispositivo.
 * Supabase solo envía los cambios de filas que tu usuario puede ver (RLS).
 * Se monta UNA vez (en app/_layout.tsx).
 */
export function useRealtimeSync(userId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const schedule = (key: string, fn: () => void) => {
      const prev = timers.get(key);
      if (prev) clearTimeout(prev);
      timers.set(
        key,
        setTimeout(() => {
          timers.delete(key);
          fn();
        }, DEBOUNCE_MS),
      );
    };
    const invalidate = (...queryKey: unknown[]) => {
      void queryClient.invalidateQueries({ queryKey });
    };

    const refreshBucket = (bucketId?: string) => {
      // Eco de un cambio nuestro: la caché ya está al día (actualización optimista + revalidación).
      if (isLocalEcho()) return;
      if (bucketId) schedule(`bucket:${bucketId}`, () => invalidate('bucketDetail', bucketId));
      schedule('buckets', () => {
        invalidate('buckets');
        invalidate('albums');
        invalidate('album');
        invalidate('calendar_month');
        invalidate('bucketParticipants');
        invalidate('bucketAlbum');
      });
    };
    const refreshAlbums = () => {
      if (isLocalEcho()) return;
      schedule('albums', () => {
        invalidate('albums');
        invalidate('album');
        invalidate('albumCollaborators');
        invalidate('buckets');
        invalidate('bucketParticipants');
        invalidate('bucketAlbum');
        invalidate('item_tags');
      });
    };

    const channel = supabase
      .channel(`sync-${userId}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buckets' }, (p: any) =>
        refreshBucket(p.new?.id ?? p.old?.id),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_subtasks' }, (p: any) =>
        refreshBucket(p.new?.bucket_id ?? p.old?.bucket_id),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bucket_photos' }, (p: any) =>
        refreshBucket(p.new?.bucket_id ?? p.old?.bucket_id),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bucket_collaborators' }, (p: any) => {
        const bucketId = p.new?.bucket_id ?? p.old?.bucket_id;
        if (bucketId) schedule(`collab:${bucketId}`, () => invalidate('bucketCollaborators', bucketId));
        refreshBucket(bucketId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (p: any) => {
        const bucketId = p.new?.bucket_id ?? p.old?.bucket_id;
        if (bucketId) {
          invalidate('comments', bucketId);
          invalidate('bucketComments', bucketId);
        }
        refreshBucket(bucketId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, (p: any) => {
        const bucketId = p.new?.bucket_id ?? p.old?.bucket_id;
        if (bucketId) invalidate('bucketReactions', bucketId);
        refreshBucket(bucketId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_likes' }, () => {
        invalidate('comments');
        invalidate('bucketComments');
      })
      // Añadir/quitar una tarea de un álbum: es lo que hace que le aparezca (o desaparezca)
      // a los demás miembros. La fila de `buckets` no les llega al crearse porque aún no
      // está en el álbum y RLS la oculta; este evento es el que lo dispara.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'album_items' }, (p: any) =>
        refreshBucket(p.new?.bucket_id ?? p.old?.bucket_id),
      )
      // Etiquetas de la tarea (las copias para cada participante las crea la base de datos).
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_tags' }, (p: any) => {
        const itemId = p.new?.item_id ?? p.old?.item_id;
        if (itemId) schedule(`item_tags:${itemId}`, () => invalidate('item_tags', itemId));
        schedule('item_tags', () => {
          invalidate('buckets', 'tag-usage');
          invalidate('tags');
        });
      })
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tags', filter: `user_id=eq.${userId}` },
        () =>
          schedule('tags', () => {
            invalidate('tags');
            invalidate('item_tags');
          }),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'albums' }, refreshAlbums)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'album_members' }, refreshAlbums)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        async (payload: any) => {
          invalidate('notifications');
          invalidate('unreadNotificationsCount');

          const record = payload.new;
          if (record && record.actor_id !== userId) {
            void displayInAppNotification(record, userId);
          }
        }
      )
      .subscribe();

    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
