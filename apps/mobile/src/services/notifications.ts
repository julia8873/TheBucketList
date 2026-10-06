import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(userId: string) {
  if (Platform.OS === 'web') {
    // Web push logic is handled differently, usually in service worker
    // For MVP we just return
    return;
  }

  let token;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    // According to DECISIONS.md (D3), use getDevicePushTokenAsync() for direct FCM/APNs
    const pushTokenData = await Notifications.getDevicePushTokenAsync();
    token = pushTokenData.data;

    if (token) {
      // Upsert into push_tokens table
      await supabase.from('push_tokens').upsert({
        user_id: userId,
        token: token,
        platform: Platform.OS
      }, { onConflict: 'token' });
    }
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
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
