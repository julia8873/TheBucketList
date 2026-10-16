import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '@bucketlist/ui';
import { Home, ShoppingBag, ListTodo, User } from 'lucide-react-native';
import { useAuthStore } from '../../src/stores/auth.store';
import { registerForPushNotificationsAsync } from '../../src/services/notifications';
import { useTranslation } from 'react-i18next';
import { Platform, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { gold, dark } from '@bucketlist/ui';

function TabBarBackground() {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#0E0E0E',
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
    if (user) {
      registerForPushNotificationsAsync(user.id).catch(console.error);
    }
  }, [user]);

  return (
    <Tabs
      initialRouteName="my-list"
      screenListeners={{
        // Al cambiar de pestaña, recarga los datos que lleven más de 30 s sin actualizarse
        focus: () => {
          void queryClient.refetchQueries({ type: 'active', stale: true });
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: gold[400],
        tabBarInactiveTintColor: '#8A8A8A',
        tabBarStyle: {
          backgroundColor: '#0E0E0E',
          borderTopColor: '#2A2A2A',
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
                  backgroundColor: gold[400],
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
                  backgroundColor: gold[400],
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
          title: 'Día a día',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              {focused && (
                <View style={{
                  width: 28, height: 3, borderRadius: 2,
                  backgroundColor: gold[400],
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
          tabBarAccessibilityLabel: 'Día a día',
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
                  backgroundColor: gold[400],
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
