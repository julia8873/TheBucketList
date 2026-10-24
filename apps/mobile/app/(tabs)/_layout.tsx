import { Alert } from '@bucketlist/ui';
import React, { useEffect } from 'react';
import { InteractionManager } from 'react-native';
import { Tabs } from 'expo-router';
import { useTheme } from '@bucketlist/ui';
import { Home, ShoppingBag, ListTodo, User } from 'lucide-react-native';
import { useAuthStore } from '../../src/stores/auth.store';
import { checkNotificationPermissionsAsync, registerForPushNotificationsAsync } from '../../src/services/notifications';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
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

    // Esperamos a que termine la transición login → pestañas (y el cierre del teclado de la
    // pantalla anterior) antes de mostrar el diálogo. Si se muestra mientras la pantalla aún se
    // está montando, Android lo dibuja arriba y con los botones fuera de la zona visible.
    const task = InteractionManager.runAfterInteractions(() => {
      timer = setTimeout(() => {
        if (cancelled) return;
        checkNotificationPermissionsAsync()
          .then((perm) => {
            if (cancelled) return;
            if (!perm.granted && perm.canAskAgain) {
              Alert.alert(
                '¿Activar notificaciones?',
                'Recibe avisos al instante en tu móvil cuando tus amigos reaccionen, comenten tus publicaciones o te inviten a colaborar.',
                [
                  { text: 'Ahora no', style: 'cancel' },
                  { text: 'Activar', onPress: () => void syncPushToken() },
                ],
              );
            } else if (perm.granted) {
              void syncPushToken();
            }
          })
          .catch(console.error);
      }, 700);
    });

    return () => {
      cancelled = true;
      task.cancel();
      if (timer) clearTimeout(timer);
    };
  }, [user?.id, queryClient]);

  return (
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
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.foregroundSubtle,
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 60,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
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
  );
}
