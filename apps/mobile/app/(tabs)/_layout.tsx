import React, { useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme, toast } from '@bucketlist/ui';
import { Home, ShoppingBag, ListTodo, User } from 'lucide-react-native';
import { useAuthStore } from '../../src/stores/auth.store';
import {
  checkNotificationPermissionsAsync,
  registerForPushNotificationsAsync,
  openAppNotificationSettings,
  shouldShowNotificationReminder,
  markNotificationReminderHandled,
} from '../../src/services/notifications';
import { NotificationReminderModal } from '../../src/components/NotificationReminderModal';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { gold, dark } from '@bucketlist/ui';

function TabBarBackground() {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
      }}
    />
  );
}

export default function TabsLayout() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const isIos = Platform.OS === 'ios';
  const bottomInset = insets.bottom;

  // En dispositivos con barra de navegación por botones (Atrás, Inicio, Recientes en Android) o Home bar en iOS,
  // insets.bottom contiene la altura exacta de la barra del sistema (p. ej. ~48px en Android con botones, ~34px en iPhone).
  // En dispositivos con gestos / pantalla completa sin barra o en Web, insets.bottom es 0.
  const paddingBottom = bottomInset > 0 ? bottomInset : (isIos ? 28 : 8);
  const tabHeight = isIos
    ? (bottomInset > 0 ? 54 + bottomInset : 84)
    : (bottomInset > 0 ? 56 + bottomInset : 60);

  const [reminderVisible, setReminderVisible] = useState(false);
  const [canAskAgain, setCanAskAgain] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    const userId = user.id;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const syncPushToken = () =>
      registerForPushNotificationsAsync(userId)
        .then(() => {
          void queryClient.invalidateQueries({ queryKey: ['notification_prefs', userId] });
        })
        .catch(console.error);

    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(async () => {
        if (cancelled) return;
        try {
          const { shouldShow, canAskAgain: canAsk } = await shouldShowNotificationReminder();
          if (cancelled) return;
          if (shouldShow) {
            setCanAskAgain(canAsk);
            setReminderVisible(true);
          } else {
            const perm = await checkNotificationPermissionsAsync();
            if (perm.granted) {
              void syncPushToken();
            }
          }
        } catch (e) {
          console.warn('Error checking notification prompt:', e);
        }
      }, 1000);
    });

    return () => {
      cancelled = true;
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [user?.id, queryClient]);

  const handleCloseReminder = async (dontAskAgain: boolean) => {
    setReminderVisible(false);
    await markNotificationReminderHandled(dontAskAgain);
  };

  const handleEnableReminder = async (dontAskAgain: boolean) => {
    setReminderVisible(false);
    await markNotificationReminderHandled(dontAskAgain);

    if (canAskAgain && user?.id) {
      try {
        const res = await registerForPushNotificationsAsync(user.id);
        if (res.granted) {
          void queryClient.invalidateQueries({ queryKey: ['notification_prefs', user.id] });
          toast.success(t('notifications.push_activated_toast'));
        }
      } catch (e) {
        console.warn('Error registering push notifications:', e);
      }
    } else {
      openAppNotificationSettings();
    }
  };

  return (
    <>
      <Tabs
        backBehavior="history"
        initialRouteName="my-list"
      screenListeners={{
        // Al cambiar de pestaña, recarga los datos que lleven más de 30 s sin actualizarse
        focus: () => {
          void queryClient.refetchQueries({ type: 'active', stale: true });
        },
      }}
      screenOptions={{
        headerShown: false,
        // OJO: no activar `freezeOnBlur`. Con pestañas que se montan al visitarlas por primera
        // vez (lazy), congelar/descongelar dejaba la pantalla en negro (p. ej. «Momentos» de
        // Inicio) hasta cambiar de pestaña y volver.
        freezeOnBlur: false,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.foregroundSubtle,
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: paddingBottom,
        },
        tabBarItemStyle: {
          borderTopWidth: 0,
        },
      }}
    >
      {/* ── Visible tabs ─────────────────────────────────────── */}
      <Tabs.Screen
        name="feed"
        options={{
          title: t('nav.feed'),
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              {focused && (
                <View style={{
                  width: 28, height: 3, borderRadius: 2,
                  backgroundColor: theme.colors.primary,
                  position: 'absolute',
                  top: Platform.OS === 'ios' ? -10 : -10,
                }} />
              )}
              <Home
                color={color}
                size={24}
                strokeWidth={1.8}
              />
            </View>
          ),
          tabBarAccessibilityLabel: t('nav.feed'),
        }}
      />
      <Tabs.Screen
        name="my-list"
        options={{
          title: t('nav.my_list'),
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              {focused && (
                <View style={{
                  width: 28, height: 3, borderRadius: 2,
                  backgroundColor: theme.colors.primary,
                  position: 'absolute',
                  top: Platform.OS === 'ios' ? -10 : -10,
                }} />
              )}
              <ShoppingBag
                color={color}
                size={24}
                strokeWidth={1.8}
              />
            </View>
          ),
          tabBarAccessibilityLabel: t('nav.my_list'),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t('nav.daily', { defaultValue: 'Día a día' }),
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              {focused && (
                <View style={{
                  width: 28, height: 3, borderRadius: 2,
                  backgroundColor: theme.colors.primary,
                  position: 'absolute',
                  top: Platform.OS === 'ios' ? -10 : -10,
                }} />
              )}
              <ListTodo
                color={color}
                size={24}
                strokeWidth={1.8}
              />
            </View>
          ),
          tabBarAccessibilityLabel: t('nav.daily', { defaultValue: 'Día a día' }),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              {focused && (
                <View style={{
                  width: 28, height: 3, borderRadius: 2,
                  backgroundColor: theme.colors.primary,
                  position: 'absolute',
                  top: Platform.OS === 'ios' ? -10 : -10,
                }} />
              )}
              <User
                color={color}
                size={24}
                strokeWidth={1.8}
              />
            </View>
          ),
          tabBarAccessibilityLabel: t('nav.profile'),
        }}
      />

      {/* ── Hidden tabs ─────────────────────────────────────── */}
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>

    <NotificationReminderModal
      visible={reminderVisible}
      canAskAgain={canAskAgain}
      onClose={handleCloseReminder}
      onEnable={handleEnableReminder}
    />
  </>
  );
}
