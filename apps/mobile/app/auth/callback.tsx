import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../src/services/supabase';
import { useTheme } from '@bucketlist/ui';
import { useAuthStore } from '../../src/stores/auth.store';
import { validateOAuthSession } from '../../src/hooks/useGoogleAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AuthScreen,
  AuthInput,
  PillButton,
  GoogleButton,
  OrDivider,
  SwitchLink,
} from '../../src/components/auth/AuthParts';

// Cierra el WebBrowser en curso si esta pantalla se carga como resultado de un redirect OAuth.
// Esto es necesario para que openAuthSessionAsync resuelva correctamente sin dejar tabs abiertas.
WebBrowser.maybeCompleteAuthSession();

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{
    code?: string;
    mode?: 'login' | 'register';
    error?: string;
    error_description?: string;
  }>();

  const [currentMode, setCurrentMode] = useState<'login' | 'register'>(
    params.mode ?? (useAuthStore.getState().oauthMode || 'register')
  );

  const isProcessing = useRef(false);

  useEffect(() => {
    if (params.mode === 'login' || params.mode === 'register') {
      setCurrentMode(params.mode);
    } else {
      AsyncStorage.getItem('@oauth_mode').then((saved) => {
        if (saved === 'login' || saved === 'register') {
          setCurrentMode(saved);
        }
      }).catch(() => undefined);
    }
  }, [params.mode]);

  useEffect(() => {
    let active = true;

    async function processAuth() {
      if (isProcessing.current) return;
      isProcessing.current = true;

      try {
        if (params.error) {
          console.error('[AuthCallback] OAuth error callback:', params.error, params.error_description);
          useAuthStore.getState().setOAuthMode(null);
          await AsyncStorage.removeItem('@oauth_mode').catch(() => undefined);
          router.replace('/(auth)/welcome');
          return;
        }

        let activeMode: 'login' | 'register' | null = params.mode ?? useAuthStore.getState().oauthMode;
        if (!activeMode) {
          const savedMode = await AsyncStorage.getItem('@oauth_mode').catch(() => null);
          if (savedMode === 'login' || savedMode === 'register') {
            activeMode = savedMode;
            setCurrentMode(savedMode);
          }
        }

        // 1. Si viene el código PKCE (?code=...)
        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) {
            console.error('[AuthCallback] Error exchanging code for session:', error);
          }
        }

        // 2. Si viene en el hash fragment (#access_token=...&refresh_token=...)
        const rawUrl =
          (typeof window !== 'undefined' && window.location?.href)
            ? window.location.href
            : await Linking.getInitialURL();

        if (rawUrl) {
          if (!activeMode) {
            if (rawUrl.includes('mode=register')) {
              activeMode = 'register';
              setCurrentMode('register');
            } else if (rawUrl.includes('mode=login')) {
              activeMode = 'login';
              setCurrentMode('login');
            }
          }
          if (rawUrl.includes('#')) {
            const hash = rawUrl.split('#')[1];
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
          useAuthStore.getState().setOAuthMode(null);
          await AsyncStorage.removeItem('@oauth_mode').catch(() => undefined);
          router.replace('/(auth)/welcome');
          return;
        }

        // 4. Validar reglas de negocio para login vs register
        const modeToUse = activeMode || 'register';
        await validateOAuthSession(modeToUse, router);
      } catch (err) {
        console.error('[AuthCallback] Auth callback failed:', err);
        useAuthStore.getState().setOAuthMode(null);
        await AsyncStorage.removeItem('@oauth_mode').catch(() => undefined);
        router.replace('/(auth)/welcome');
      }
    }

    void processAuth();

    return () => {
      active = false;
    };
  }, [params.code, params.error, params.mode]);

  const isRegister = currentMode === 'register';

  return (
    <AuthScreen
      title={isRegister ? t('auth.register_title') : t('auth.login_title')}
      subtitle={isRegister ? t('auth.register_subtitle') : t('auth.login_subtitle')}
      footer={
        <>
          <PillButton
            title={isRegister ? t('auth.continue') : t('auth.enter')}
            onPress={() => {}}
            disabled={true}
          />
          <OrDivider />
          <GoogleButton
            title={isRegister ? t('auth.google_signup') : t('auth.google')}
            onPress={() => {}}
            loading={true}
          />
          <SwitchLink
            prompt={isRegister ? t('auth.already_have') : t('auth.no_account')}
            action={isRegister ? t('auth.enter') : t('auth.create_one')}
            onPress={() => {}}
          />
        </>
      }
    >
      {isRegister ? (
        <>
          <AuthInput
            label={t('onboarding.username_label')}
            prefix="@"
            placeholder="tu_usuario"
            value=""
            editable={false}
          />
          <AuthInput
            label={t('auth.email_label')}
            placeholder="tu@email.com"
            value=""
            editable={false}
          />
          <AuthInput
            label={t('auth.password_label')}
            placeholder="••••••••"
            value=""
            secureTextEntry
            editable={false}
          />
        </>
      ) : (
        <>
          <AuthInput
            label={t('auth.identifier_label')}
            placeholder="usuario o email"
            value=""
            editable={false}
          />
          <AuthInput
            label={t('auth.password_label')}
            placeholder="••••••••"
            value=""
            secureTextEntry
            editable={false}
          />
        </>
      )}
    </AuthScreen>
  );
}
