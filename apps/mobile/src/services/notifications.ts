import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const EAS_PROJECT_ID =
  Constants.expoConfig?.extra?.eas?.projectId ?? 'bcb60c8e-f88c-486d-84fa-20af0d452f8a';

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
  return await Notifications.scheduleNotificationAsync({
    content: {
      title: 'The Bucket List 🎯',
      body: '¡Las notificaciones están funcionando correctamente en tu teléfono!',
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

    if (token) {
      console.log('[notifications] Push token acquired successfully:', token);

      // Guardar en tabla push_tokens
      try {
        await supabase.from('push_tokens').upsert(
          {
            user_id: userId,
            token: token,
            platform: Platform.OS,
          },
          { onConflict: 'token' }
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

      return { granted: true, token };
    }

    return { granted: true };
  } catch (err) {
    console.warn('Error registering for push notifications:', err);
    return { granted: false };
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
    // Es un user_id: buscar en push_tokens y profiles
    const [ptRes, profRes] = await Promise.all([
      supabase.from('push_tokens').select('token').eq('user_id', tokenOrUserId),
      supabase.from('profiles').select('push_token').eq('id', tokenOrUserId).maybeSingle(),
    ]);

    const set = new Set<string>();
    if (profRes.data?.push_token) set.add(profRes.data.push_token);
    ptRes.data?.forEach((r) => {
      if (r.token) set.add(r.token);
    });
    targetTokens = Array.from(set);
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
  const deadlineDate = new Date(deadline);
  
  // Schedule 3 days before
  const threeDaysBefore = new Date(deadlineDate);
  threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
  
  if (threeDaysBefore > new Date()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "¡Fecha límite acercándose! 🎯",
        body: `Te quedan 3 días para completar: ${title}`,
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
        title: "¡Hoy es el gran día! ⚡",
        body: `¡Tu fecha límite para "${title}" es hoy!`,
        data: { bucketId },
        sound: 'default',
      },
      trigger: { type: 'date', date: deadlineDate, channelId: Platform.OS === 'android' ? 'default' : undefined } as any,
    });
  }
}
