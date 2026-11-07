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

/** Notificaciones que se responden con botones (aceptar / rechazar) y no deben marcarse como leídas al tocarlas. */
const ACTIONABLE_TYPES = new Set(['collaboration_invite', 'collaboration_request', 'album_invite', 'notification_request']);

export function isActionableNotification(type?: string | null): boolean {
  return !!type && ACTIONABLE_TYPES.has(type);
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
  // Las invitaciones y solicitudes se aceptan / rechazan con los botones de la notificación,
  // pero tocar la notificación en sí lleva a la tarea o álbum (sin responder).

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
        ? `${actorName} liked ${target}`
        : `${actorName} le ha dado me gusta a ${target}`;
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
    case 'friend_completed':
      return isEn
        ? `${actorName} completed ${target}!`
        : `¡${actorName} ha completado ${target}!`;
    case 'deadline':
    case 'deadline_reminder':
      return isEn
        ? `The deadline for ${target} is approaching`
        : `La fecha límite para ${target} está cerca`;
    case 'collaborator_invite':
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
        ? `${actorName} accepted the notification request for ${target}`
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
    case 'user_reported':
      return isEn
        ? `${actorName} submitted a user report`
        : `${actorName} ha enviado un reporte de usuario`;
    case 'content_reported':
      return isEn
        ? `${actorName} reported content`
        : `${actorName} ha reportado un contenido`;
    default:
      return null;
  }
}

/**
 * Traduce al inglés las plantillas comunes guardadas en español en el campo `content` de notifications.
 * Devuelve null si no reconoce el formato o no hay traducción aplicable.
 */
export function translateContentToEn(content?: string | null): string | null {
  if (!content) return null;
  const rules: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [/^(.+?) ha completado la tarea: "(.*)"$/s, (m) => `${m[1]} completed the task: "${m[2]}"`],
    [/^(.+?) ha cambiado el estado de la tarea "(.*)" a: (.*)$/s, (m) => `${m[1]} changed the status of the task "${m[2]}" to: ${m[3]}`],
    [/^(.+?) ha renombrado la tarea a: "(.*)"$/s, (m) => `${m[1]} renamed the task to: "${m[2]}"`],
    [/^(.+?) ha actualizado las notas de la tarea: "(.*)"$/s, (m) => `${m[1]} updated the notes of the task: "${m[2]}"`],
    [/^(.+?) ha actualizado la fecha límite de la tarea: "(.*)"$/s, (m) => `${m[1]} updated the deadline of the task: "${m[2]}"`],
    [/^(.+?) ha actualizado la tarea "(.*)" en el [aá]lbum "(.*)"$/s, (m) => `${m[1]} updated the task "${m[2]}" in the album "${m[3]}"`],
    [/^(.+?) ha actualizado la tarea: "(.*)"$/s, (m) => `${m[1]} updated the task: "${m[2]}"`],
    [/^(.+?) ha añadido fotos a la tarea "(.*)" en el [aá]lbum "(.*)"$/s, (m) => `${m[1]} added photos to the task "${m[2]}" in the album "${m[3]}"`],
    [/^(.+?) ha añadido fotos a la tarea: "(.*)"$/s, (m) => `${m[1]} added photos to the task: "${m[2]}"`],
    [/^(.+?) ha añadido un paso a la tarea "(.*)": "(.*)"$/s, (m) => `${m[1]} added a step to the task "${m[2]}": "${m[3]}"`],
    [/^(.+?) ha completado un paso en la tarea "(.*)": "(.*)"$/s, (m) => `${m[1]} completed a step in the task "${m[2]}": "${m[3]}"`],
    [/^(.+?) ha añadido la tarea "(.*)" al [aá]lbum "(.*)"$/s, (m) => `${m[1]} added the task "${m[2]}" to the album "${m[3]}"`],
    [/^(.+?) ha eliminado la tarea "(.*)" del [aá]lbum "(.*)"$/s, (m) => `${m[1]} removed the task "${m[2]}" from the album "${m[3]}"`],
    [/^(.+?) ha cambiado el nombre del [aá]lbum a: "(.*)"$/s, (m) => `${m[1]} renamed the album to: "${m[2]}"`],
    [/^(.+?) ha cerrado el [aá]lbum: "(.*)"$/s, (m) => `${m[1]} closed the album: "${m[2]}"`],
    [/^(.+?) ha reabierto el [aá]lbum: "(.*)"$/s, (m) => `${m[1]} reopened the album: "${m[2]}"`],
    [/^(.+?) ha cambiado la portada del [aá]lbum: "(.*)"$/s, (m) => `${m[1]} changed the cover of the album: "${m[2]}"`],
    [/^(.+?) ha actualizado la descripci[oó]n del [aá]lbum: "(.*)"$/s, (m) => `${m[1]} updated the description of the album: "${m[2]}"`],
    [/^(.+?) ha actualizado el [aá]lbum: "(.*)"$/s, (m) => `${m[1]} updated the album: "${m[2]}"`],
    [/^(.+?) ha comentado: "(.*)" en la tarea "(.*)"$/s, (m) => `${m[1]} commented: "${m[2]}" on task "${m[3]}"`],
    [/^(.+?) ha comentado en tu publicación "(.*)": "(.*)"$/s, (m) => `${m[1]} commented on your post "${m[2]}": "${m[3]}"`],
    [/^(.+?) ha dejado un comentario en tu (álbum|tarea) "(.*)"$/s, (m) => `${m[1]} left a comment on your ${m[2] === 'álbum' ? 'album' : 'task'} "${m[3]}"`],
    [/^(.+?) te ha mencionado en un comentario en la publicación "(.*)"$/s, (m) => `${m[1]} mentioned you in a comment on "${m[2]}"`],
    [/^(.+?) te ha mencionado en un comentario en "(.*)"$/s, (m) => `${m[1]} mentioned you in a comment on "${m[2]}"`],
    [/^(.+?) (?:ha reaccionado|le ha dado me gusta) a tu tarea "(.*)"$/s, (m) => `${m[1]} liked your task "${m[2]}"`],
    [/^(.+?) ha empezado a seguirte$/s, (m) => `${m[1]} started following you`],
    [/^(.+?) quiere seguirte$/s, (m) => `${m[1]} wants to follow you`],
    [/^(.+?) aceptó tu solicitud$/s, (m) => `${m[1]} accepted your follow request`],
    [/^(.+?) ha solicitado activar las notificaciones para (.*)$/s, (m) => `${m[1]} requested to turn on notifications for ${m[2]}`],
    [/^(.+?) quiere que recibas notificaciones de su (.*)$/s, (m) => `${m[1]} wants you to receive notifications for their ${m[2]}`],
    [/^Te ha invitado a colaborar en la tarea "(.*)"$/s, (m) => `Invited you to collaborate on the task "${m[1]}"`],
  ];
  for (const [re, fn] of rules) {
    const m = content.match(re);
    if (m) return fn(m);
  }
  return null;
}
