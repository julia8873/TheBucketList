import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '../../src/services/supabase';
import { gold, useTheme } from '@bucketlist/ui';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const params = useLocalSearchParams<{
    code?: string;
    error?: string;
    error_description?: string;
  }>();

  useEffect(() => {
    let active = true;

    async function processAuth() {
      try {
        if (params.error) {
          console.error('OAuth error callback:', params.error, params.error_description);
          router.replace('/(auth)/welcome');
          return;
        }

        // 1. Si viene el código PKCE (?code=...)
        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) {
            console.error('Error exchanging code for session:', error);
          }
        }

        // 2. Si viene en el hash fragment (#access_token=...&refresh_token=...)
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl && initialUrl.includes('#')) {
          const hash = initialUrl.split('#')[1];
          if (hash) {
            const hashParams = new URLSearchParams(hash);
            const access_token = hashParams.get('access_token');
            const refresh_token = hashParams.get('refresh_token');
            if (access_token && refresh_token) {
              await supabase.auth.setSession({ access_token, refresh_token });
            }
          }
        }

        // 3. Comprobar si ya tenemos sesión activa
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;

        if (!session?.user) {
          // Si no hay sesión, volver a la pantalla de bienvenida
          router.replace('/(auth)/welcome');
        }
      } catch (err) {
        console.error('Auth callback failed:', err);
        router.replace('/(auth)/welcome');
      }
    }

    void processAuth();

    return () => {
      active = false;
    };
  }, [params.code, params.error]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" color={gold[400]} />
      <Text style={[styles.text, { color: theme.colors.foregroundMuted }]}>
        Iniciando sesión...
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  text: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
});
