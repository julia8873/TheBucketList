/**
 * Implementación Web de useNotificationTapHandler.
 * En la web no aplican las notificaciones push nativas de Expo del sistema operativo
 * ni Notifications.useLastNotificationResponse (evita el error 'getLastNotificationResponseAsync is not available on web').
 */
export function useNotificationTapHandler(_ready: boolean) {
  // No-op en web
}
