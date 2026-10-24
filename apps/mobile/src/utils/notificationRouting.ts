/**
 * Utilidades compartidas para las notificaciones:
 *  - a qué pantalla lleva cada notificación (lista de la app y notificaciones del sistema)
 *  - el texto específico de reacciones / comentarios / menciones
 */

export interface NotificationLike {
  type?: string | null;
  bucket_id?: string | null;
  album_id?: string | null;
  actor_id?: string | null;
  // Variantes camelCase que llegan en el `data` de las notificaciones push
  bucketId?: string | null;
  albumId?: string | null;
  actorId?: string | null;
}

/** Tipos que deben abrir directamente la hoja de comentarios. */
const COMMENT_TYPES = new Set(['comment', 'mention', 'comment_like', 'comment_reply']);

export function isCommentNotification(type?: string | null): boolean {
  return !!type && COMMENT_TYPES.has(type);
}

/** Devuelve la ruta a la que debe llevar una notificación, o null si no hay destino. */
export function getNotificationRoute(n: NotificationLike): string | null {
  const type = n.type ?? '';
  const bucketId = n.bucket_id ?? n.bucketId ?? null;
  const albumId = n.album_id ?? n.albumId ?? null;
  const actorId = n.actor_id ?? n.actorId ?? null;

  if (type === 'user_reported' || type === 'content_reported') return '/(modals)/admin-reports';
  if (type === 'follow' || type === 'follow_accepted') return actorId ? `/profile/${actorId}` : null;
  if (type === 'follow_request') return '/friends?tab=requests';
  // Estas se responden desde la lista de notificaciones (botones aceptar / rechazar)
  if (type === 'notification_request' || type === 'collaboration_invite') return null;

  const query = isCommentNotification(type) ? '?openComments=1' : '';
  if (bucketId) return `/bucket/${bucketId}${query}`;
  if (albumId) return `/album/${albumId}${query}`;
  return null;
}

export interface NotificationEntityInfo {
  bucketTitle?: string | null;
  bucketOwnerId?: string | null;
  albumTitle?: string | null;
  albumOwnerId?: string | null;
}

/**
 * Texto específico para reacciones, comentarios y menciones.
 * Devuelve null para el resto de tipos (que siguen usando su propio texto).
 */
export function getSpecificNotificationText(
  n: NotificationLike & { content?: string | null },
  actorName: string,
  info: NotificationEntityInfo = {},
  currentUserId?: string | null,
): string | null {
  const type = n.type ?? '';
  const isAlbum = !(n.bucket_id ?? n.bucketId) && !!(n.album_id ?? n.albumId);
  const title = isAlbum ? info.albumTitle : info.bucketTitle;
  const ownerId = isAlbum ? info.albumOwnerId : info.bucketOwnerId;
  const noun = isAlbum ? 'álbum' : 'tarea';
  const isMine = !currentUserId || !ownerId || ownerId === currentUserId;
  const article = isAlbum ? (isMine ? 'tu' : 'el') : (isMine ? 'tu' : 'la');
  const target = `${article} ${noun}${title ? ` "${title}"` : ''}`;

  switch (type) {
    case 'reaction':
      return `${actorName} ha reaccionado a ${target}`;
    case 'comment':
      return `${actorName} ha dejado un comentario en ${target}`;
    case 'mention':
      return `${actorName} te ha mencionado en un comentario en ${target}`;
    case 'comment_like':
      return `A ${actorName} le ha gustado tu comentario en ${target}`;
    default:
      return null;
  }
}
