import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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

    const channel = supabase
      .channel(`sync-${userId}`)  // Nombre estable (sin Date.now()) → Supabase no abre canales duplicados al remontarse
      // ── Cambios en una tarea: solo recargar esa tarea y la lista ──────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'buckets' }, (p: any) => {
        if (isLocalEcho()) return;
        const id = p.new?.id ?? p.old?.id;
        if (id) schedule(`bucket:${id}`, () => invalidate('bucketDetail', id));
        schedule('buckets', () => invalidate('buckets'));
      })
      // ── Subtareas: solo la tarea afectada ────────────────────────────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_subtasks' }, (p: any) => {
        if (isLocalEcho()) return;
        const id = p.new?.bucket_id ?? p.old?.bucket_id;
        if (id) schedule(`bucket:${id}`, () => invalidate('bucketDetail', id));
      })
      // ── Fotos: solo la tarea afectada ────────────────────────────────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bucket_photos' }, (p: any) => {
        if (isLocalEcho()) return;
        const id = p.new?.bucket_id ?? p.old?.bucket_id;
        if (id) schedule(`bucket:${id}`, () => invalidate('bucketDetail', id));
      })
      // ── Colaboradores: tarea + lista de colaboradores ─────────────────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bucket_collaborators' }, (p: any) => {
        if (isLocalEcho()) return;
        const id = p.new?.bucket_id ?? p.old?.bucket_id;
        if (id) {
          schedule(`collab:${id}`, () => invalidate('bucketCollaborators', id));
          schedule(`bucket:${id}`, () => invalidate('bucketDetail', id));
        }
        schedule('buckets', () => invalidate('buckets'));
        schedule('item_participants', () => invalidate('item_participants'));
      })
      // ── Comentarios: solo los comentarios de esa tarea ────────────────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, (p: any) => {
        if (isLocalEcho()) return;
        const id = p.new?.bucket_id ?? p.old?.bucket_id;
        if (id) {
          schedule(`comments:${id}`, () => {
            invalidate('comments', id);
            invalidate('bucketComments', id);
          });
        }
      })
      // ── Reacciones: solo las reacciones de esa tarea ─────────────────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, (p: any) => {
        if (isLocalEcho()) return;
        const id = p.new?.bucket_id ?? p.old?.bucket_id;
        if (id) schedule(`reactions:${id}`, () => invalidate('bucketReactions', id));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_likes' }, () => {
        schedule('comment_likes', () => {
          invalidate('comments');
          invalidate('bucketComments');
        });
      })
      // ── Album items: solo los álbumes afectados ───────────────────────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'album_items' }, (p: any) => {
        if (isLocalEcho()) return;
        const bucketId = p.new?.bucket_id ?? p.old?.bucket_id;
        const albumId  = p.new?.album_id  ?? p.old?.album_id;
        if (bucketId) schedule(`bucket:${bucketId}`, () => invalidate('bucketDetail', bucketId));
        if (albumId)  schedule(`album:${albumId}`,   () => invalidate('album', albumId));
        // Una tarea entra/sale de un álbum compartido → cambian sus colaboradores visibles.
        schedule('item_participants', () => invalidate('item_participants'));
      })
      // ── Etiquetas: solo las etiquetas del item afectado ──────────────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'item_tags' }, (p: any) => {
        if (isLocalEcho()) return;
        const itemId = p.new?.item_id ?? p.old?.item_id;
        if (itemId) schedule(`item_tags:${itemId}`, () => invalidate('item_tags', itemId));
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
      // ── Álbumes: solo los álbumes ─────────────────────────────────────────────
      .on('postgres_changes', { event: '*', schema: 'public', table: 'albums' }, (p: any) => {
        if (isLocalEcho()) return;
        const id = p.new?.id ?? p.old?.id;
        if (id) schedule(`album:${id}`, () => invalidate('album', id));
        schedule('albums', () => invalidate('albums'));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'album_members' }, () => {
        if (isLocalEcho()) return;
        schedule('albumCollaborators', () => invalidate('albumCollaborators'));
        schedule('item_participants', () => invalidate('item_participants'));
        schedule('albums', () => invalidate('albums'));
      })
      // ── Notificaciones: solo el badge y la lista ─────────────────────────────
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

