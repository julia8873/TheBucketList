import { getSpecificNotificationText, translateContentToEn } from '../utils/notificationRouting';
import { syncProfileLanguage } from './profileLanguage';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { i18n } from '@bucketlist/shared';
import { supabase } from './supabase';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export const EAS_PROJECT_ID =
  Constants.expoConfig?.extra?.eas?.projectId ??
  (Constants as any).easConfig?.projectId ??
  '602d3623-83d5-44e4-ada1-06414cb05f69';

export async function setupNotificationChannelAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Notificaciones',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D4AF37',
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
      sound: 'default',
    });
  }
}

// Configure immediately on module import
if (Platform.OS === 'android') {
  void setupNotificationChannelAsync();
}

export interface NotificationPermissionStatus {
  status: Notifications.PermissionStatus;
  granted: boolean;
  canAskAgain: boolean;
}

/** Comprueba el estado actual de los permisos del sistema en el dispositivo */
export async function checkNotificationPermissionsAsync(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === 'web') {
    return { status: Notifications.PermissionStatus.GRANTED, granted: true, canAskAgain: true };
  }
  const settings = await Notifications.getPermissionsAsync();
  return {
    status: settings.status,
    granted: settings.granted || settings.status === 'granted',
    canAskAgain: settings.canAskAgain,
  };
}

/** Solicita permisos al usuario mostrando el diálogo del sistema operativo */
export async function requestNotificationPermissionsAsync(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === 'web') {
    return { status: Notifications.PermissionStatus.GRANTED, granted: true, canAskAgain: true };
  }
  await setupNotificationChannelAsync();
  const settings = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: true,
      allowSound: true,
    },
  });

  // En Android, requestPermissionsAsync a veces devuelve el estado anterior en lugar del nuevo
  // (race condition con el SO). Hacemos una segunda lectura para obtener el estado real.
  if (Platform.OS === 'android') {
    const refreshed = await Notifications.getPermissionsAsync();
    return {
      status: refreshed.status,
      granted: refreshed.granted || refreshed.status === 'granted',
      canAskAgain: refreshed.canAskAgain,
    };
  }

  return {
    status: settings.status,
    granted: settings.granted || settings.status === 'granted',
    canAskAgain: settings.canAskAgain,
  };
}

/** Abre la pantalla de ajustes de la aplicación en el sistema (Android / iOS) si los permisos están bloqueados */
export function openAppNotificationSettings() {
  if (Platform.OS !== 'web') {
    Linking.openSettings().catch((err) => console.warn('Could not open system settings:', err));
  }
}

/** Envía una notificación local de prueba para verificar sonido, banner y canal */
export async function sendLocalTestNotification() {
  await setupNotificationChannelAsync();
  const isEn = i18n.language === 'en';
  return await Notifications.scheduleNotificationAsync({
    content: {
      title: 'The Bucket List 🎯',
      body: isEn
        ? 'Notifications are working properly on your phone!'
        : '¡Las notificaciones están funcionando correctamente en tu teléfono!',
      data: { type: 'test' },
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: Platform.OS === 'android' ? { channelId: 'default' } : null,
  });
}

/** Registra el token push para el usuario actual en la base de datos */
export async function registerForPushNotificationsAsync(userId: string): Promise<{ granted: boolean; token?: string }> {
  if (Platform.OS === 'web') {
    return { granted: false };
  }

  try {
    await setupNotificationChannelAsync();

    const perm = await checkNotificationPermissionsAsync();
    let granted = perm.granted;

    if (!granted && perm.canAskAgain) {
      const requested = await requestNotificationPermissionsAsync();
      granted = requested.granted;
    }

    if (!granted) {
      console.log('[notifications] Push notification permissions not granted');
      return { granted: false };
    }

    let token: string | undefined;

    // 1. Obtener Expo Push Token
    try {
      const expoTokenObj = await Notifications.getExpoPushTokenAsync({
        projectId: EAS_PROJECT_ID,
      }).catch((e) => {
        console.warn('Could not get Expo Push Token with projectId:', e);
        return null;
      });

      if (expoTokenObj?.data) {
        token = expoTokenObj.data;
      }
    } catch (e) {
      console.warn('Error fetching expo push token:', e);
    }

    // 2. Fallback a device push token si estamos en dispositivo físico
    if (!token && Device.isDevice) {
      try {
        const pushTokenData = await Notifications.getDevicePushTokenAsync().catch(() => null);
        token = pushTokenData?.data;
      } catch (e) {
        console.warn('Error fetching device push token fallback:', e);
      }
    }

    // 3. Activar automáticamente las preferencias de notificación en la BD si el usuario dio permisos
    try {
      await supabase.from('notification_prefs').upsert(
        {
          user_id: userId,
          reaction_push: true,
          comment_push: true,
          follow_push: true,
          deadline_push: true,
          friend_completed_push: true,
        },
        { onConflict: 'user_id' }
      );
    } catch (err) {
      console.warn('Error activating notification_prefs:', err);
    }

    if (token) {
      console.log('[notifications] Push token acquired successfully:', token);

      // Guardar en tabla push_tokens
      try {
        const safePlatform = Platform.OS === 'android' ? 'android' : 'web';
        await supabase.from('push_tokens').upsert(
          {
            user_id: userId,
            token: token,
            platform: safePlatform,
          },
          { onConflict: 'user_id,token' }
        );
      } catch (err) {
        console.warn('Error saving to push_tokens table:', err);
      }

      // Guardar en tabla profiles
      try {
        await supabase
          .from('profiles')
          .update({
            push_token: token,
          })
          .eq('id', userId);
      } catch (err) {
        console.warn('Error updating profile push_token:', err);
      }

      // Idioma del usuario: el servidor lo usa para enviar las push en su idioma
      void syncProfileLanguage(i18n.language);

      return { granted: true, token };
    }

    return { granted: true };
  } catch (err) {
    console.warn('Error registering for push notifications:', err);
    return { granted: false };
  }
}

/**
 * Muestra una notificación del sistema (banner, sonido y vibración) cuando se
 * inserta una nueva notificación en la base de datos para el usuario actual.
 */
export async function displayInAppNotification(record: any, currentUserId: string): Promise<void> {
  if (!record || record.actor_id === currentUserId) return;

  try {
    await setupNotificationChannelAsync();

    // 1. Comprobar si el usuario tiene desactivado este tipo de notificación en sus preferencias
    const { data: prefs } = await supabase
      .from('notification_prefs')
      .select('reaction_push, comment_push, follow_push, deadline_push, friend_completed_push, quiet_start, quiet_end')
      .eq('user_id', currentUserId)
      .maybeSingle();

    if (prefs) {
      if (record.type === 'reaction' && prefs.reaction_push === false) return;
      if ((record.type === 'comment' || record.type === 'mention') && prefs.comment_push === false) return;
      if ((record.type === 'follow' || record.type === 'follow_request') && prefs.follow_push === false) return;
      if (record.type === 'deadline' && prefs.deadline_push === false) return;
      if (record.type === 'friend_completed' && prefs.friend_completed_push === false) return;

      // Horas de silencio (hora local del dispositivo)
      if (prefs.quiet_start && prefs.quiet_end) {
        const toMinutes = (t: string) => {
          const [h = '0', m = '0'] = t.split(':');
          return parseInt(h, 10) * 60 + parseInt(m, 10);
        };
        const now = new Date();
        const current = now.getHours() * 60 + now.getMinutes();
        const start = toMinutes(prefs.quiet_start);
        const end = toMinutes(prefs.quiet_end);
        const inQuiet = start <= end ? current >= start && current < end : current >= start || current < end;
        if (inQuiet) return;
      }
    }

    // 2. Obtener nombre del actor
    let actorName = record.actor?.display_name || record.actor?.username;
    if (!actorName && record.actor_id) {
      const { data: actorProfile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', record.actor_id)
        .maybeSingle();
      actorName = actorProfile?.display_name || actorProfile?.username;
    }
    const isEn = i18n.language === 'en';
    const who = actorName || (isEn ? 'Someone' : 'Alguien');

    // 3. Obtener título (y dueño) de la tarea o del álbum si aplica
    let entityTitle = '';
    const entityInfo: { bucketTitle?: string | null; bucketOwnerId?: string | null; albumTitle?: string | null; albumOwnerId?: string | null } = {};
    if (record.bucket_id) {
      const { data: b } = await supabase
        .from('buckets')
        .select('title, user_id')
        .eq('id', record.bucket_id)
        .maybeSingle();
      if (b?.title) entityTitle = b.title;
      entityInfo.bucketTitle = b?.title ?? null;
      entityInfo.bucketOwnerId = b?.user_id ?? null;
    } else if (record.album_id) {
      const { data: a } = await supabase
        .from('albums')
        .select('title, owner_id')
        .eq('id', record.album_id)
        .maybeSingle();
      if (a?.title) entityTitle = a.title;
      entityInfo.albumTitle = a?.title ?? null;
      entityInfo.albumOwnerId = a?.owner_id ?? null;
    }

    // 4. Formatear título y mensaje descriptivo
    let title = 'The Bucket List 🎯';
    const translatedContent = isEn && record.content ? translateContentToEn(record.content) : null;
    let body = translatedContent || (isEn ? '' : (record.content || ''));

    const specific = getSpecificNotificationText(record, who, entityInfo, currentUserId, i18n.language);

    switch (record.type) {
      case 'reaction':
        title = isEn ? 'New like 💛' : 'Nuevo me gusta 💛';
        body = specific ?? (isEn ? `${who} liked your task.` : `${who} le ha dado me gusta a tu tarea.`);
        break;
      case 'comment':
        title = isEn ? 'New comment 💬' : 'Nuevo comentario 💬';
        body = specific ?? (isEn ? `${who} left a comment.` : `${who} ha dejado un comentario.`);
        break;
      case 'mention':
        title = isEn ? 'New mention 🏷️' : 'Nueva mención 🏷️';
        body = specific ?? (isEn ? `${who} mentioned you in a comment.` : `${who} te ha mencionado en un comentario.`);
        break;
      case 'comment_like':
        title = isEn ? 'Liked comment 👍' : 'Le gustó tu comentario 👍';
        body = specific ?? (isEn ? `${who} liked your comment.` : `A ${who} le ha gustado tu comentario.`);
        break;
      case 'follow':
        title = isEn ? 'New follower 👋' : 'Nuevo seguidor 👋';
        body = isEn ? `${who} started following you.` : `${who} ha empezado a seguirte.`;
        break;
      case 'follow_request':
        title = isEn ? 'Follow request 👥' : 'Solicitud de seguimiento 👥';
        body = isEn ? `${who} wants to follow you.` : `${who} quiere seguirte.`;
        break;
      case 'follow_accepted':
        title = isEn ? 'Request accepted ✨' : 'Solicitud aceptada ✨';
        body = isEn ? `${who} accepted your follow request.` : `${who} aceptó tu solicitud de seguimiento.`;
        break;
      case 'friend_completed':
        title = isEn ? 'Goal achieved! 🎉' : '¡Objetivo cumplido! 🎉';
        body = specific ?? (entityTitle
          ? (isEn ? `${who} completed "${entityTitle}"!` : `¡${who} ha completado "${entityTitle}"!`)
          : (isEn ? `${who} completed a task from their bucket list!` : `¡${who} ha completado una tarea de su bucket list!`));
        break;
      case 'deadline':
      case 'deadline_reminder':
        title = isEn ? 'Deadline approaching ⏳' : 'Fecha límite próxima ⏳';
        body = specific ?? (entityTitle
          ? (isEn ? `The deadline for "${entityTitle}" is approaching.` : `La fecha límite de "${entityTitle}" está cerca.`)
          : (isEn ? 'A task deadline is approaching.' : (record.content || 'Tienes una tarea cuya fecha límite está cerca.')));
        break;
      case 'collaborator_invite':
      case 'collaboration_invite':
        title = isEn ? 'Collaboration invite 🤝' : 'Invitación a colaborar 🤝';
        body = specific ?? (entityTitle
          ? (isEn ? `${who} invited you to collaborate on "${entityTitle}".` : `${who} te ha invitado a colaborar en "${entityTitle}".`)
          : (isEn ? `${who} invited you to collaborate.` : (record.content || `${who} te ha invitado a colaborar en una tarea.`)));
        break;
      case 'collaboration_request':
        title = isEn ? 'Collaboration request 🤝' : 'Solicitud de colaboración 🤝';
        body = specific ?? (entityTitle
          ? (isEn ? `${who} requested to collaborate on "${entityTitle}".` : `${who} ha solicitado colaborar en "${entityTitle}".`)
          : (isEn ? `${who} requested to collaborate on your task.` : (record.content || `${who} ha solicitado colaborar en tu tarea.`)));
        break;
      case 'collaborator_joined':
        title = isEn ? 'New collaborator 🎉' : 'Nuevo colaborador 🎉';
        body = specific ?? (entityTitle
          ? (isEn ? `${who} joined as a collaborator on "${entityTitle}".` : `${who} se ha unido como colaborador a "${entityTitle}".`)
          : (isEn ? `${who} joined as a collaborator on your task.` : (record.content || `${who} se ha unido como colaborador a tu tarea.`)));
        break;
      case 'collaboration_accepted':
        title = isEn ? 'Collaboration accepted ✨' : 'Colaboración aceptada ✨';
        body = specific ?? (entityTitle
          ? (isEn ? `${who} accepted your collaboration request on "${entityTitle}".` : `${who} ha aceptado tu solicitud de colaboración en "${entityTitle}".`)
          : (isEn ? `${who} accepted your collaboration request.` : (record.content || `${who} ha aceptado tu solicitud de colaboración.`)));
        break;
      case 'album_invite':
        title = isEn ? 'Album invite 📁' : 'Invitación a álbum 📁';
        body = specific ?? (entityTitle
          ? (isEn ? `${who} invited you to album "${entityTitle}".` : `${who} te ha invitado al álbum "${entityTitle}".`)
          : (isEn ? `${who} invited you to an album.` : (record.content || (entityTitle ? `${who} te ha invitado al álbum "${entityTitle}"` : `${who} te ha invitado a un álbum.`))));
        break;
      case 'notification_request':
        title = isEn ? 'Notification request 🔔' : 'Solicitud de notificaciones 🔔';
        body = specific ?? (entityTitle
          ? (isEn ? `${who} requested notifications for "${entityTitle}".` : `${who} ha solicitado activar notificaciones para "${entityTitle}".`)
          : (isEn ? `${who} requested to enable notifications.` : (record.content || `${who} ha solicitado activar notificaciones.`)));
        break;
      case 'notification_accepted':
        title = isEn ? 'Notifications enabled 🔔' : 'Notificaciones activadas 🔔';
        body = specific ?? (entityTitle
          ? (isEn ? `${who} enabled notifications for "${entityTitle}".` : `${who} aceptó la solicitud de notificaciones para "${entityTitle}".`)
          : (isEn ? `${who} accepted your notification request.` : (record.content || `${who} aceptó la solicitud de notificaciones.`)));
        break;
      case 'bucket_update':
        title = isEn ? 'Task update 🎯' : 'Actualización de tarea 🎯';
        body = specific ?? translatedContent ?? (isEn ? null : record.content) ?? (entityTitle
          ? (isEn ? `${who} updated "${entityTitle}".` : `${who} ha actualizado "${entityTitle}".`)
          : (isEn ? `${who} updated a task you follow.` : `${who} ha actualizado una tarea que sigues.`));
        break;
      case 'album_update':
        title = isEn ? 'Album update 📁' : 'Actualización de álbum 📁';
        body = specific ?? translatedContent ?? (isEn ? null : record.content) ?? (entityTitle
          ? (isEn ? `${who} updated "${entityTitle}".` : `${who} ha actualizado "${entityTitle}".`)
          : (isEn ? `${who} updated an album you follow.` : `${who} ha actualizado un álbum que sigues.`));
        break;
      case 'drive_access':
        title = isEn ? 'Google Drive access 📂' : 'Acceso a Google Drive 📂';
        body = specific ?? (entityTitle
          ? (isEn ? `${who} accessed Google Drive on "${entityTitle}".` : `${who} ha accedido a Google Drive en "${entityTitle}".`)
          : (isEn ? `${who} accessed your Google Drive link.` : (record.content || `${who} ha accedido a tu enlace de Google Drive.`)));
        break;
      case 'user_reported':
        title = isEn ? 'User report ⚠️' : 'Reporte de usuario ⚠️';
        body = specific ?? (isEn ? `${who} submitted a user report.` : `${who} ha enviado un reporte de usuario.`);
        break;
      case 'content_reported':
        title = isEn ? 'Content report ⚠️' : 'Reporte de contenido ⚠️';
        body = specific ?? (isEn ? `${who} reported content.` : `${who} ha reportado un contenido.`);
        break;
      default:
        if (specific) {
          body = specific;
        } else if (translatedContent) {
          body = translatedContent;
        } else if (!isEn && record.content) {
          body = record.content;
        } else if (who && who !== 'Someone' && who !== 'Alguien') {
          body = isEn ? `${who} interacted with your account.` : `${who} ha interactuado con tu cuenta.`;
        } else {
          body = isEn ? 'New activity in The Bucket List.' : 'Tienes una nueva actividad en The Bucket List.';
        }
        break;
    }

    // 5. Mostrar la notificación nativa en el dispositivo
    await Notifications.scheduleNotificationAsync({
      content: {
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
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: Platform.OS === 'android' ? { channelId: 'default' } : null,
    });
  } catch (err) {
    console.warn('[notifications] Error displaying in-app notification:', err);
  }
}

/** Envía una notificación push remota mediante la API de Expo a un usuario o token */
export async function sendPushNotification(
  tokenOrUserId: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
) {
  let targetTokens: string[] = [];

  if (tokenOrUserId.startsWith('ExponentPushToken[')) {
    targetTokens.push(tokenOrUserId);
  } else if (tokenOrUserId.includes('-')) {
    // Es un user_id: buscar en get_user_push_tokens (RPC con security definer) y en profiles
    const [rpcRes, ptRes, profRes] = await Promise.all([
      Promise.resolve(supabase.rpc('get_user_push_tokens', { p_user_id: tokenOrUserId })).catch(() => ({ data: null })),
      Promise.resolve(supabase.from('push_tokens').select('token').eq('user_id', tokenOrUserId)).catch(() => ({ data: null })),
      Promise.resolve(supabase.from('profiles').select('push_token, language').eq('id', tokenOrUserId).maybeSingle()).catch(() => ({ data: null })),
    ]);

    const set = new Set<string>();
    if (rpcRes.data && Array.isArray(rpcRes.data)) {
      rpcRes.data.forEach((r: any) => {
        const t = typeof r === 'string' ? r : r?.token;
        if (t) set.add(t);
      });
    }
    if (profRes.data?.push_token) set.add(profRes.data.push_token);
    (ptRes.data as any[])?.forEach((r) => {
      if (r?.token) set.add(r.token);
    });
    targetTokens = Array.from(set);

    const userLang = profRes.data?.language || 'es';
    if (userLang === 'en') {
      const titleMap: Record<string, string> = {
        'Nuevo seguidor 👋': 'New follower 👋',
        'Nueva reacción 💛': 'New reaction 💛',
        'Nuevo comentario 💬': 'New comment 💬',
        'Nueva mención 🏷️': 'New mention 🏷️',
        'Solicitud de seguimiento 👥': 'Follow request 👥',
        'Solicitud aceptada ✨': 'Request accepted ✨',
        '¡Objetivo cumplido! 🎉': 'Goal achieved! 🎉',
        'Fecha límite próxima ⏳': 'Deadline approaching ⏳',
        'Invitación a colaborar 🤝': 'Collaboration invite 🤝',
        'Actualización de tarea 🎯': 'Task update 🎯',
        'Actualización de álbum 📁': 'Album update 📁',
      };
      const mappedTitle = titleMap[title];
      if (mappedTitle) title = mappedTitle;
      const translated = translateContentToEn(body);
      if (translated) body = translated;
    }
  }

  if (targetTokens.length === 0) return;

  const messages = targetTokens.map((to) => ({
    to,
    title,
    body,
    sound: 'default',
    channelId: 'default',
    priority: 'high',
    data,
  }));

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.warn('Error sending expo push notification:', err);
  }
}

export async function scheduleDeadlineReminder(bucketId: string, title: string, deadline: string) {
  const isEn = i18n.language === 'en';
  const deadlineDate = new Date(deadline);

  // Schedule 3 days before
  const threeDaysBefore = new Date(deadlineDate);
  threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);

  if (threeDaysBefore > new Date()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: isEn ? "Deadline approaching! 🎯" : "¡Fecha límite acercándose! 🎯",
        body: isEn ? `You have 3 days left to complete: ${title}` : `Te quedan 3 días para completar: ${title}`,
        data: { bucketId },
        sound: 'default',
      },
      trigger: { type: 'date', date: threeDaysBefore, channelId: Platform.OS === 'android' ? 'default' : undefined } as any,
    });
  }

  // Schedule day of
  if (deadlineDate > new Date()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: isEn ? "Today is the big day! ⚡" : "¡Hoy es el gran día! ⚡",
        body: isEn ? `Your deadline for "${title}" is today!` : `¡Tu fecha límite para "${title}" es hoy!`,
        data: { bucketId },
        sound: 'default',
      },
      trigger: { type: 'date', date: deadlineDate, channelId: Platform.OS === 'android' ? 'default' : undefined } as any,
    });
  }
}
