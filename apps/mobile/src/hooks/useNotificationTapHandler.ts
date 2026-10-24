import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { resetNavigationGuard } from '../utils/navigationGuard';
import { getNotificationRoute } from '../utils/notificationRouting';
import { supabase } from '../services/supabase';

/**
 * Lleva al usuario a la tarea / álbum / comentario correspondiente cuando pulsa una
 * notificación del sistema (Android / iOS), tanto con la app cerrada como en segundo plano.
 *
 * `ready` debe ser true cuando ya hay sesión y el onboarding está completado; si la
 * notificación se pulsa antes, se espera para no perder la navegación.
 */
export function useNotificationTapHandler(ready: boolean) {
  const router = useRouter();
  const response = Notifications.useLastNotificationResponse();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || !response) return;
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

    const id = response.notification.request.identifier;
    if (handledRef.current === id) return;
    handledRef.current = id;

    const data = (response.notification.request.content.data ?? {}) as Record<string, any>;

    // Marcar como leída en la base de datos si conocemos el id
    if (typeof data.notificationId === 'string') {
      void supabase.from('notifications').update({ is_read: true }).eq('id', data.notificationId);
    }

    const route = getNotificationRoute({
      type: data.type,
      bucketId: data.bucketId,
      albumId: data.albumId,
      actorId: data.actorId,
    }) ?? '/(tabs)/notifications';

    // Pequeño margen para que las pestañas estén montadas (arranque en frío)
    const timer = setTimeout(() => {
      resetNavigationGuard();
      router.push(route as any);
    }, 400);
    return () => clearTimeout(timer);
  }, [ready, response, router]);
}
