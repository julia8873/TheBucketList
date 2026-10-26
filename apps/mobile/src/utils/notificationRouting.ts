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
 * Texto específico para reacciones, comentarios, menciones y acciones sobre tareas/álbumes.
 * Devuelve null para el resto de tipos (que siguen usando su propio texto).
 */
export function getSpecificNotificationText(
  n: NotificationLike & { content?: string | null },
  actorName: string,
  info: NotificationEntityInfo = {},
  currentUserId?: string | null,
  lang: string = 'es',
): string | null {
  const isEn = lang === 'en';
  const type = n.type ?? '';
  const isAlbum = !(n.bucket_id ?? n.bucketId) && !!(n.album_id ?? n.albumId);
  const title = isAlbum ? (info.albumTitle ?? (n as any).albumTitle) : (info.bucketTitle ?? (n as any).bucketTitle);
  const ownerId = isAlbum ? (info.albumOwnerId ?? (n as any).albumOwnerId) : (info.bucketOwnerId ?? (n as any).bucketOwnerId);
  const isMine = !currentUserId || !ownerId || ownerId === currentUserId;

  let target = '';
  if (isEn) {
    const noun = isAlbum ? 'album' : 'task';
    const article = isMine ? 'your' : 'the';
    target = `${article} ${noun}${title ? ` "${title}"` : ''}`;
  } else {
    const noun = isAlbum ? 'álbum' : 'tarea';
    const article = isAlbum ? (isMine ? 'tu' : 'el') : (isMine ? 'tu' : 'la');
    target = `${article} ${noun}${title ? ` "${title}"` : ''}`;
  }

  switch (type) {
    case 'reaction':
      return isEn
        ? `${actorName} reacted to ${target}`
        : `${actorName} ha reaccionado a ${target}`;
    case 'comment':
      return isEn
        ? `${actorName} commented on ${target}`
        : `${actorName} ha dejado un comentario en ${target}`;
    case 'mention':
      return isEn
        ? `${actorName} mentioned you in a comment on ${target}`
        : `${actorName} te ha mencionado en un comentario en ${target}`;
    case 'comment_like':
      return isEn
        ? `${actorName} liked your comment on ${target}`
        : `A ${actorName} le ha gustado tu comentario en ${target}`;
    case 'collaboration_invite':
      return isEn
        ? `${actorName} invited you to collaborate on ${target}`
        : `${actorName} te ha invitado a colaborar en ${target}`;
    case 'collaboration_request':
      return isEn
        ? `${actorName} requested to collaborate on ${target}`
        : `${actorName} ha solicitado colaborar en ${target}`;
    case 'collaborator_joined':
      return isEn
        ? `${actorName} joined as a collaborator on ${target}`
        : `${actorName} se ha unido como colaborador a ${target}`;
    case 'collaboration_accepted':
      return isEn
        ? `${actorName} accepted your collaboration request on ${target}`
        : `${actorName} ha aceptado tu solicitud de colaboración en ${target}`;
    case 'album_invite':
      return isEn
        ? `${actorName} invited you to collaborate on ${target}`
        : `${actorName} te ha invitado a colaborar en ${target}`;
    case 'notification_request':
      return isEn
        ? `${actorName} requested to enable notifications for ${target}`
        : `${actorName} ha solicitado activar notificaciones para ${target}`;
    case 'notification_accepted':
      return isEn
        ? `${actorName} accepted notification request for ${target}`
        : `${actorName} ha aceptado la solicitud de notificaciones para ${target}`;
    case 'bucket_update':
      return isEn
        ? `${actorName} updated ${target}`
        : `${actorName} ha actualizado ${target}`;
    case 'album_update':
      return isEn
        ? `${actorName} updated ${target}`
        : `${actorName} ha actualizado ${target}`;
    case 'drive_access':
      return isEn
        ? `${actorName} accessed the Google Drive link on ${target}`
        : `${actorName} ha accedido al enlace de Google Drive de ${target}`;
    default:
      return null;
  }
}
