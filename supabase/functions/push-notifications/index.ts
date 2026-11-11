import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type Lang = 'es' | 'en';

// ── Textos de las notificaciones push (es / en) ────────────────────────────────────────────
const TITLES: Record<string, { es: string; en: string }> = {
  reaction: { es: 'Nuevo me gusta 💛', en: 'New like 💛' },
  comment: { es: 'Nuevo comentario 💬', en: 'New comment 💬' },
  mention: { es: 'Nueva mención 🏷️', en: 'New mention 🏷️' },
  comment_like: { es: 'Le gustó tu comentario 👍', en: 'Liked comment 👍' },
  follow: { es: 'Nuevo seguidor 👋', en: 'New follower 👋' },
  follow_request: { es: 'Solicitud de seguimiento 👥', en: 'Follow request 👥' },
  follow_accepted: { es: 'Solicitud aceptada ✨', en: 'Request accepted ✨' },
  friend_completed: { es: '¡Objetivo cumplido! 🎉', en: 'Goal achieved! 🎉' },
  deadline: { es: 'Fecha límite próxima ⏳', en: 'Deadline approaching ⏳' },
  deadline_reminder: { es: 'Fecha límite próxima ⏳', en: 'Deadline approaching ⏳' },
  collaborator_invite: { es: 'Invitación a colaborar 🤝', en: 'Collaboration invite 🤝' },
  collaboration_invite: { es: 'Invitación a colaborar 🤝', en: 'Collaboration invite 🤝' },
  collaboration_request: { es: 'Solicitud de colaboración 🤝', en: 'Collaboration request 🤝' },
  collaborator_joined: { es: 'Nuevo colaborador 🤝', en: 'New collaborator 🤝' },
  collaboration_accepted: { es: 'Colaboración aceptada ✨', en: 'Collaboration accepted ✨' },
  album_invite: { es: 'Invitación a álbum 📸', en: 'Album invite 📸' },
  notification_request: { es: 'Solicitud de notificaciones 🔔', en: 'Notification request 🔔' },
  notification_accepted: { es: 'Notificaciones activadas 🔔', en: 'Notifications enabled 🔔' },
  bucket_update: { es: 'Actualización de tarea 📝', en: 'Task update 📝' },
  album_update: { es: 'Actualización de álbum 📸', en: 'Album update 📸' },
  drive_access: { es: 'Acceso a Google Drive 📁', en: 'Google Drive access 📁' },
  user_reported: { es: 'Reporte de usuario ⚠️', en: 'User report ⚠️' },
  content_reported: { es: 'Reporte de contenido ⚠️', en: 'Content report ⚠️' },
};

/**
 * El campo `content` de la tabla notifications lo escriben los triggers de la base de datos
 * siempre en español. Para destinatarios en inglés se traducen aquí las plantillas conocidas
 * (actualizaciones de tareas / álbumes); devuelve null si no reconoce el texto.
 */
function translateContentToEn(content: string): string | null {
  const rules: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
    [/^(.+?) ha completado la tarea: "(.*)"$/s, (m) => `${m[1]} completed the task: "${m[2]}"`],
    [/^(.+?) ha cambiado el estado de la tarea "(.*)" a: (.*)$/s, (m) => `${m[1]} changed the status of the task "${m[2]}" to: ${m[3]}`],
    [/^(.+?) ha renombrado la tarea a: "(.*)"$/s, (m) => `${m[1]} renamed the task to: "${m[2]}"`],
    [/^(.+?) ha actualizado las notas de la tarea: "(.*)"$/s, (m) => `${m[1]} updated the notes of the task: "${m[2]}"`],
    [/^(.+?) ha actualizado la fecha límite de la tarea: "(.*)"$/s, (m) => `${m[1]} updated the deadline of the task: "${m[2]}"`],
    [/^(.+?) ha actualizado la tarea "(.*)" en el álbum "(.*)"$/s, (m) => `${m[1]} updated the task "${m[2]}" in the album "${m[3]}"`],
    [/^(.+?) ha actualizado la tarea: "(.*)"$/s, (m) => `${m[1]} updated the task: "${m[2]}"`],
    [/^(.+?) ha añadido fotos a la tarea "(.*)" en el álbum "(.*)"$/s, (m) => `${m[1]} added photos to the task "${m[2]}" in the album "${m[3]}"`],
    [/^(.+?) ha añadido fotos a la tarea: "(.*)"$/s, (m) => `${m[1]} added photos to the task: "${m[2]}"`],
    [/^(.+?) ha añadido un paso a la tarea "(.*)": "(.*)"$/s, (m) => `${m[1]} added a step to the task "${m[2]}": "${m[3]}"`],
    [/^(.+?) ha completado un paso en la tarea "(.*)": "(.*)"$/s, (m) => `${m[1]} completed a step in the task "${m[2]}": "${m[3]}"`],
    [/^(.+?) ha añadido la tarea "(.*)" al álbum "(.*)"$/s, (m) => `${m[1]} added the task "${m[2]}" to the album "${m[3]}"`],
    [/^(.+?) ha eliminado la tarea "(.*)" del álbum "(.*)"$/s, (m) => `${m[1]} removed the task "${m[2]}" from the album "${m[3]}"`],
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

function buildPushText(
  lang: Lang,
  record: any,
  who: string,
  entityTitle: string,
  isAlbum: boolean,
  isMine: boolean,
): { title: string; body: string } {
  const type: string = record.type ?? '';
  const en = lang === 'en';
  const title = TITLES[type]?.[lang] ?? 'The Bucket List';

  const quoted = entityTitle ? ` "${entityTitle}"` : '';
  const target = en
    ? `${isMine ? 'your' : 'the'} ${isAlbum ? 'album' : 'task'}${quoted}`
    : `${isAlbum ? (isMine ? 'tu' : 'el') : (isMine ? 'tu' : 'la')} ${isAlbum ? 'álbum' : 'tarea'}${quoted}`;

  const specific: Record<string, { es: string; en: string }> = {
    reaction: { es: `${who} le ha dado me gusta a ${target}`, en: `${who} liked ${target}` },
    comment: { es: `${who} ha dejado un comentario en ${target}`, en: `${who} commented on ${target}` },
    mention: { es: `${who} te ha mencionado en un comentario en ${target}`, en: `${who} mentioned you in a comment on ${target}` },
    comment_like: { es: `A ${who} le ha gustado tu comentario en ${target}`, en: `${who} liked your comment on ${target}` },
    follow: { es: `${who} ha empezado a seguirte.`, en: `${who} started following you.` },
    follow_request: { es: `${who} quiere seguirte.`, en: `${who} wants to follow you.` },
    follow_accepted: { es: `${who} aceptó tu solicitud de seguimiento.`, en: `${who} accepted your follow request.` },
    friend_completed: { es: `¡${who} ha completado ${target}!`, en: `${who} completed ${target}!` },
    deadline: { es: `La fecha límite para ${target} está cerca.`, en: `The deadline for ${target} is approaching.` },
    deadline_reminder: { es: `La fecha límite para ${target} está cerca.`, en: `The deadline for ${target} is approaching.` },
    collaborator_invite: { es: `${who} te ha invitado a colaborar en ${target}`, en: `${who} invited you to collaborate on ${target}` },
    collaboration_invite: { es: `${who} te ha invitado a colaborar en ${target}`, en: `${who} invited you to collaborate on ${target}` },
    collaboration_request: { es: `${who} ha solicitado colaborar en ${target}`, en: `${who} requested to collaborate on ${target}` },
    collaborator_joined: { es: `${who} se ha unido como colaborador a ${target}`, en: `${who} joined as a collaborator on ${target}` },
    collaboration_accepted: { es: `${who} ha aceptado tu solicitud de colaboración en ${target}`, en: `${who} accepted your collaboration request on ${target}` },
    album_invite: { es: `${who} te ha invitado a colaborar en ${target}`, en: `${who} invited you to collaborate on ${target}` },
    notification_request: { es: `${who} ha solicitado activar notificaciones para ${target}`, en: `${who} requested to enable notifications for ${target}` },
    notification_accepted: { es: `${who} ha aceptado la solicitud de notificaciones para ${target}`, en: `${who} accepted the notification request for ${target}` },
    bucket_update: { es: `${who} ha actualizado ${target}`, en: `${who} updated ${target}` },
    album_update: { es: `${who} ha actualizado ${target}`, en: `${who} updated ${target}` },
    drive_access: { es: `${who} ha accedido al enlace de Google Drive de ${target}`, en: `${who} accessed the Google Drive link on ${target}` },
    user_reported: { es: `${who} ha enviado un reporte de usuario.`, en: `${who} submitted a user report.` },
    content_reported: { es: `${who} ha reportado un contenido.`, en: `${who} reported content.` },
  };

  const fallback = en
    ? (who && who !== 'Someone' ? `${who} interacted with your account.` : 'New activity in The Bucket List.')
    : (who && who !== 'Alguien' ? `${who} ha interactuado con tu cuenta.` : 'Nueva actividad en The Bucket List.');
  const content: string | null = record.content || null;

  if (!en) {
    return { title, body: content || specific[type]?.es || fallback };
  }
  const translated = content ? translateContentToEn(content) : null;
  return { title, body: translated || specific[type]?.en || fallback };
}

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await req.json();

    if (payload.type === 'INSERT' && payload.table === 'notifications') {
      const record = payload.record;
      if (!record || !record.recipient_id) {
        return new Response(JSON.stringify({ message: 'Invalid payload' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // No enviar notificación al propio usuario que realiza la acción
      if (record.actor_id && record.actor_id === record.recipient_id) {
        return new Response(JSON.stringify({ message: 'Self action ignored' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 1. Obtener token push e idioma del destinatario en una sola consulta ligera (ahorra egress)
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('push_token, language')
        .eq('id', record.recipient_id)
        .maybeSingle();

      let pushToken = profile?.push_token;

      if (!pushToken) {
        const { data: pt } = await supabaseAdmin
          .from('push_tokens')
          .select('token')
          .eq('user_id', record.recipient_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (pt?.token) {
          pushToken = pt.token;
        }
      }

      if (!pushToken) {
        return new Response(JSON.stringify({ message: 'No push token' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // 2. Comprobar preferencias del destinatario (solo las columnas booleanas necesarias)
      const { data: prefs } = await supabaseAdmin
        .from('notification_prefs')
        .select('reaction_push, comment_push, follow_push, deadline_push, friend_completed_push')
        .eq('user_id', record.recipient_id)
        .maybeSingle();

      if (prefs) {
        const t = record.type;
        if (
          (t === 'reaction' && prefs.reaction_push === false) ||
          ((t === 'comment' || t === 'mention') && prefs.comment_push === false) ||
          ((t === 'follow' || t === 'follow_request') && prefs.follow_push === false) ||
          (t === 'deadline' && prefs.deadline_push === false) ||
          (t === 'friend_completed' && prefs.friend_completed_push === false)
        ) {
          return new Response(JSON.stringify({ message: 'Disabled by user prefs' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      const lang: Lang = profile?.language === 'en' ? 'en' : 'es';

      // 3. Obtener nombre del actor (solo display_name y username)
      let actorName = lang === 'en' ? 'Someone' : 'Alguien';
      if (record.actor_id) {
        const { data: actor } = await supabaseAdmin
          .from('profiles')
          .select('display_name, username')
          .eq('id', record.actor_id)
          .maybeSingle();
        actorName = actor?.display_name || actor?.username || actorName;
      }

      // 4. Título del elemento para notificación descriptiva
      let entityTitle = '';
      let isAlbum = false;
      let ownerId: string | null = null;
      if (record.bucket_id) {
        const { data: b } = await supabaseAdmin
          .from('buckets')
          .select('title, user_id')
          .eq('id', record.bucket_id)
          .maybeSingle();
        entityTitle = b?.title ?? '';
        ownerId = b?.user_id ?? null;
      } else if (record.album_id) {
        const { data: a } = await supabaseAdmin
          .from('albums')
          .select('title, owner_id')
          .eq('id', record.album_id)
          .maybeSingle();
        entityTitle = a?.title ?? '';
        ownerId = a?.owner_id ?? null;
        isAlbum = true;
      }
      const isMine = !ownerId || ownerId === record.recipient_id;

      const { title, body } = buildPushText(lang, record, actorName, entityTitle, isAlbum, isMine);

      // 5. Enviar a Expo Push API
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: pushToken,
          sound: 'default',
          channelId: 'default',
          priority: 'high',
          title,
          body,
          data: {
            notificationId: record.id,
            bucketId: record.bucket_id,
            albumId: record.album_id,
            commentId: record.comment_id,
            actorId: record.actor_id,
            type: record.type,
          },
        }),
      });

      if (response.ok) {
        const expoResult = await response.json().catch(() => null);
        const ticket = expoResult?.data;
        // Si el token es inválido o la app se desinstaló, se limpia el token para ahorrar egress y evitar intentos inútiles
        if (ticket?.status === 'error' && ticket?.details?.error === 'DeviceNotRegistered') {
          await supabaseAdmin.from('profiles').update({ push_token: null }).eq('id', record.recipient_id);
          await supabaseAdmin.from('push_tokens').delete().eq('token', pushToken);
        }
      }

      // Respuesta mínima para no consumir egress en net._http_response
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'OK' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in push notification:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
