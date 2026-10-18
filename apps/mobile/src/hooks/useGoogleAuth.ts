import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';

WebBrowser.maybeCompleteAuthSession();

// Inicializar Google Sign-In nativo de forma segura si NO estamos en Expo Go
let GoogleSignin: any = null;
let statusCodes: any = {};
let isNativeGoogleAvailable = false;

const isExpoGo =
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

if (!isExpoGo) {
  try {
    // Dynamic require para evitar que TurboModuleRegistry.getEnforcing falle en tiempo de carga en Expo Go
    const googleSigninModule = require('@react-native-google-signin/google-signin');
    GoogleSignin = googleSigninModule?.GoogleSignin;
    statusCodes = googleSigninModule?.statusCodes ?? {};

    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (GoogleSignin && webClientId) {
      GoogleSignin.configure({
        webClientId,
        scopes: ['profile', 'email'],
      });
      isNativeGoogleAvailable = true;
    }
  } catch (e) {
    isNativeGoogleAvailable = false;
    console.log('[GoogleAuth] Native Google Sign-In no disponible en este binario, usando fallback web:', e);
  }
}

/**
 * Valida si la sesión OAuth entrante corresponde a una cuenta existente o nueva,
 * y aplica las reglas de negocio para login ('ya tengo cuenta') o registro ('crear cuenta').
 */
export async function validateOAuthSession(
  mode: 'login' | 'register',
  onError?: (message: string) => void
): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return false;

    const user = session.user;

    // Consultamos el perfil (reintentando brevemente si el trigger de BD aún está insertando)
    let profile: any = null;
    for (let i = 0; i < 4; i++) {
      const { data } = await supabase
        .from('profiles')
        .select('id, onboarding_completed, created_at, username')
        .eq('id', user.id)
        .maybeSingle();

      if (data) {
        profile = data;
        break;
      }
      await new Promise((res) => setTimeout(res, 250));
    }

    const isExistingAccount = !!profile && profile.onboarding_completed === true;

    if (mode === 'login') {
      if (!isExistingAccount) {
        // El usuario pulsó "Ya tengo cuenta", pero no existe ninguna cuenta creada
        // 1. Borramos de auth.users el registro recién creado para no dejar cuenta huérfana
        try {
          await supabase.rpc('cleanup_unregistered_oauth_user');
        } catch (err) {
          console.warn('[GoogleAuth] Error al limpiar usuario no registrado:', err);
        }

        // 2. Cerramos sesión completamente
        await supabase.auth.signOut();
        useAuthStore.getState().signOut();
        useAuthStore.getState().setOAuthMode(null);
        useAuthStore.getState().setOAuthError('no_account_google');

        if (onError) {
          onError('no_account_google');
        }
        return false;
      }

      // Cuenta existente válida: login exitoso
      useAuthStore.getState().setOAuthMode(null);
      useAuthStore.getState().setOnboardingCompleted(true);
      return true;
    }

    if (mode === 'register') {
      if (isExistingAccount) {
        // Ya tenía la cuenta creada anteriormente: entra directo
        useAuthStore.getState().setOAuthMode(null);
        useAuthStore.getState().setOnboardingCompleted(true);
        return true;
      }

      // Nueva cuenta: marcar onboarding pendiente para que configure @username, foto, etc.
      useAuthStore.getState().setOAuthMode(null);
      useAuthStore.getState().setOnboardingCompleted(false);
      return true;
    }

    return true;
  } catch (e: any) {
    console.error('[GoogleAuth] Error en validateOAuthSession:', e);
    return false;
  }
}

/**
 * Hook para inicio de sesión y registro con Google mediante SDK Nativo (con fallback a navegador).
 * @param onError Callback para mostrar errores traducidos en la pantalla
 * @param mode 'login' para "Ya tengo cuenta", 'register' para "Crear cuenta"
 */
export function useGoogleAuth(
  onError: (message: string) => void,
  mode: 'login' | 'register' = 'login'
) {
  const [loading, setLoading] = useState(false);

  const start = async () => {
    try {
      setLoading(true);
      useAuthStore.getState().setOAuthMode(mode);
      useAuthStore.getState().setOAuthError(null);

      // ── 1. Intentar inicio de sesión nativo (Google Play Services, sin abrir navegador) ──
      if (isNativeGoogleAvailable && GoogleSignin && process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) {
        try {
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          const signInResult = await GoogleSignin.signIn();
          const idToken = (signInResult as any)?.data?.idToken ?? (signInResult as any)?.idToken;

          if (idToken) {
            const { data: sessionData, error: signInErr } = await supabase.auth.signInWithIdToken({
              provider: 'google',
              token: idToken,
            });

            if (signInErr) {
              useAuthStore.getState().setOAuthMode(null);
              onError(signInErr.message);
              return;
            }

            if (sessionData?.session) {
              await validateOAuthSession(mode, onError);
              return;
            }
          }
        } catch (nativeErr: any) {
          // Si el usuario simplemente canceló la selección de cuenta
          if (
            nativeErr?.code === statusCodes?.SIGN_IN_CANCELLED ||
            nativeErr?.code === '12501' ||
            nativeErr?.message?.includes('cancelled')
          ) {
            useAuthStore.getState().setOAuthMode(null);
            return;
          }

          console.warn('[GoogleAuth] Intento nativo no completado, intentando fallback web:', nativeErr);
        }
      }

      // ── 2. Fallback WebBrowser (si no hay Google Play Services o se ejecuta en Expo Go) ──
      const redirectTo = makeRedirectUri({
        scheme: 'bucketlist',
        path: 'auth/callback',
        queryParams: { mode },
      });
      console.log(`[GoogleAuth] Iniciando fallback OAuth web con modo [${mode}], Redirect URI:`, redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        useAuthStore.getState().setOAuthMode(null);
        onError(error.message);
        return;
      }

      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

        if (res.type === 'success' && res.url) {
          // 1. Extraer hash fragment (#access_token=...&refresh_token=...)
          const hashIndex = res.url.indexOf('#');
          if (hashIndex !== -1) {
            const hash = res.url.substring(hashIndex + 1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
              const { error: sessionErr } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (sessionErr) {
                useAuthStore.getState().setOAuthMode(null);
                onError(sessionErr.message);
                return;
              }
              await validateOAuthSession(mode, onError);
              return;
            }
          }

          // 2. Extraer código PKCE (?code=...)
          const queryIndex = res.url.indexOf('?');
          if (queryIndex !== -1) {
            const query = res.url.substring(queryIndex + 1).split('#')[0];
            const params = new URLSearchParams(query);
            const code = params.get('code');
            const errorDesc = params.get('error_description') || params.get('error');

            if (errorDesc) {
              useAuthStore.getState().setOAuthMode(null);
              onError(errorDesc);
              return;
            }

            if (code) {
              const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
              if (exchangeErr) {
                useAuthStore.getState().setOAuthMode(null);
                onError(exchangeErr.message);
                return;
              }
              await validateOAuthSession(mode, onError);
              return;
            }
          }
        } else {
          // El usuario canceló o cerró el navegador
          useAuthStore.getState().setOAuthMode(null);
        }
      }
    } catch (e: any) {
      useAuthStore.getState().setOAuthMode(null);
      onError(e?.message ?? 'No se pudo iniciar sesión con Google');
    } finally {
      setLoading(false);
    }
  };

  return { start, ready: true, loading };
}