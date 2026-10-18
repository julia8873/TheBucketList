import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../src/services/supabase';
import { gold, useTheme } from '@bucketlist/ui';
import { useAuthStore } from '../../src/stores/auth.store';
import { validateOAuthSession } from '../../src/hooks/useGoogleAuth';

// Cierra el WebBrowser en curso si esta pantalla se carga como resultado de un redirect OAuth.
// Esto es necesario para que openAuthSessionAsync resuelva correctamente sin dejar tabs abiertas.
WebBrowser.maybeCompleteAuthSession();

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const params = useLocalSearchParams<{
    code?: string;
    mode?: 'login' | 'register';
    error?: string;
    error_description?: string;
  }>();

  const isProcessing = useRef(false);

  useEffect(() => {
    let active = true;

    async function processAuth() {
      if (isProcessing.current) return;
      isProcessing.current = true;

      try {
        if (params.error) {
          console.error('[AuthCallback] OAuth error callback:', params.error, params.error_description);
          useAuthStore.getState().setOAuthMode(null);
          router.replace('/(auth)/welcome');
          return;
        }

        let activeMode: 'login' | 'register' | null = params.mode ?? useAuthStore.getState().oauthMode;

        // 1. Si viene el código PKCE (?code=...)
        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) {
            console.error('[AuthCallback] Error exchanging code for session:', error);
          }
        }

        // 2. Si viene en el hash fragment (#access_token=...&refresh_token=...)
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          if (!activeMode) {
            if (initialUrl.includes('mode=register')) activeMode = 'register';
            else if (initialUrl.includes('mode=login')) activeMode = 'login';
          }
          if (initialUrl.includes('#')) {
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
        }

        // 3. Comprobar si ya tenemos sesión activa
        const { data: { session } } = await supabase.auth.getSession();
        if (!active) return;

        if (!session?.user) {
          // Si no hay sesión, volver a la pantalla de bienvenida
          useAuthStore.getState().setOAuthMode(null);
          router.replace('/(auth)/welcome');
          return;
        }

        // 4. Validar reglas de negocio para login vs register
        const modeToUse = activeMode || 'login';
        await validateOAuthSession(modeToUse, router);
      } catch (err) {
        console.error('[AuthCallback] Auth callback failed:', err);
        useAuthStore.getState().setOAuthMode(null);
        router.replace('/(auth)/welcome');
      }
    }

    void processAuth();

    return () => {
      active = false;
    };
  }, [params.code, params.error, params.mode]);

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
