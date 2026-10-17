import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
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

// Configure default notification channel immediately on Android
if (Platform.OS === 'android') {
  void Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
    enableLights: true,
    enableVibrate: true,
    showBadge: true,
  });
}

const EAS_PROJECT_ID =
  Constants.expoConfig?.extra?.eas?.projectId ?? 'bcb60c8e-f88c-486d-84fa-20af0d452f8a';

export async function registerForPushNotificationsAsync(userId: string) {
  if (Platform.OS === 'web') {
    return;
  }

  let token: string | undefined;

  try {
    // Ensure Android channel exists
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permissions not granted');
      return;
    }

    // 1. Try getting the Expo Push Token with projectId
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

    // 2. Fallback to device push token if needed on physical device
    if (!token && Device.isDevice) {
      try {
        const pushTokenData = await Notifications.getDevicePushTokenAsync().catch(() => null);
        token = pushTokenData?.data;
      } catch (e) {
        console.warn('Error fetching device push token fallback:', e);
      }
    }

    if (token) {
      console.log('Push token acquired successfully:', token);

      // 1. Upsert into push_tokens table
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

      // 2. Also update profiles table with push_token for backend edge functions
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
    }
  } catch (err) {
    console.warn('Error registering for push notifications:', err);
  }
}

export async function sendPushNotification(
  tokenOrUserId: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
) {
  let targetToken = tokenOrUserId;
  if (!targetToken.startsWith('ExponentPushToken[') && targetToken.includes('-')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', targetToken)
      .single();
    if (profile?.push_token) {
      targetToken = profile.push_token;
    } else {
      const { data: pt } = await supabase
        .from('push_tokens')
        .select('token')
        .eq('user_id', targetToken)
        .limit(1)
        .maybeSingle();
      if (pt?.token) targetToken = pt.token;
      else return;
    }
  }

  if (!targetToken) return;

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: targetToken,
        title,
        body,
        sound: 'default',
        data,
      }),
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
        title: "Goal Deadline Approaching! 🎯",
        body: `You have 3 days left to complete: ${title}`,
        data: { bucketId },
      },
      trigger: { type: 'date', date: threeDaysBefore } as any,
    });
  }

  // Schedule day of
  if (deadlineDate > new Date()) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Today is the day! ⚡",
        body: `Your deadline for "${title}" is today!`,
        data: { bucketId },
      },
      trigger: { type: 'date', date: deadlineDate } as any,
    });
  }
}
