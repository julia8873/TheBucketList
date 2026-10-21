import { useCallback, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';
import { getAuthRedirectUrl, getSupabaseUrl, getSupabaseAnonKey } from '../constants/urls';

WebBrowser.maybeCompleteAuthSession();

export type GoogleAuthMode = 'login' | 'register';

export interface GoogleAuthResult {
  type: 'success' | 'account_exists' | 'no_account' | 'error' | 'cancelled';
  /** Email del usuario de Google, presente en account_exists / no_account */
  email?: string;
  errorMessage?: string;
}

/**
 * Crea un cliente Supabase aislado en memoria para no disparar el
 * onAuthStateChange del cliente principal ni mutar el estado global
 * antes de verificar si la cuenta existe o debe limpiarse.
 */
function createIsolatedAuthClient() {
  const memoryStore = new Map<string, string>();
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: (key: string) => Promise.resolve(memoryStore.get(key) ?? null),
        setItem: (key: string, value: string) => {
          memoryStore.set(key, value);
          return Promise.resolve();
        },
        removeItem: (key: string) => {
          memoryStore.delete(key);
          return Promise.resolve();
        },
      },
    },
  });
}

/**
 * Hook que gestiona el flujo OAuth de Google con Supabase.
 *
 * - mode='register' — si ya existe cuenta completada, devuelve { type: 'account_exists', email }
 * - mode='login'    — si no existe cuenta completada, devuelve { type: 'no_account', email }
 * - En ningún caso se propaga la sesión al cliente principal hasta haber verificado
 *   que la operación es válida, garantizando que la pantalla actual no navegue a otra
 *   ruta de forma involuntaria ni parpadee la pantalla inicial.
 */
export function useGoogleAuth(mode: GoogleAuthMode) {
  const [loading, setLoading] = useState(false);

  // Redirigir a la ruta específica ('login' o 'register') para que Expo Router
  // no intercepte el deep link como la ruta raíz ('/') de la aplicación.
  const redirectUri = getAuthRedirectUrl(mode === 'register' ? 'register' : 'login');

  const signInWithGoogle = useCallback(async (): Promise<GoogleAuthResult> => {
    setLoading(true);
    // Bloquea cualquier redirección automática del RootNavigator mientras dura el flujo
    useAuthStore.getState().setOauthInProgress(true);
    try {
      const isolatedClient = createIsolatedAuthClient();

      const { data, error } = await isolatedClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data?.url) {
        return { type: 'error', errorMessage: error?.message ?? 'No se obtuvo URL de autenticación' };
      }

      // Abre el navegador del sistema y espera el redirect
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { type: 'cancelled' };
      }

      if (result.type !== 'success' || !result.url) {
        return { type: 'error', errorMessage: 'El navegador no devolvió una URL válida' };
      }

      // Extraer tokens del fragment/query de la URL de retorno
      const url = result.url;
      let accessToken: string | null = null;
      let refreshToken: string | null = null;

      // Intentar fragment (#access_token=…)
      const fragment = url.split('#')[1];
      if (fragment) {
        const params = new URLSearchParams(fragment);
        accessToken = params.get('access_token');
        refreshToken = params.get('refresh_token');
      }

      // Intentar query (?code=… con PKCE)
      if (!accessToken) {
        const query = url.split('?')[1]?.split('#')[0];
        if (query) {
          const params = new URLSearchParams(query);
          const code = params.get('code');
          if (code) {
            const { data: exchangeData, error: exchangeErr } = await isolatedClient.auth.exchangeCodeForSession(code);
            if (exchangeErr || !exchangeData?.session) {
              return { type: 'error', errorMessage: exchangeErr?.message ?? 'Error al intercambiar código' };
            }
            accessToken = exchangeData.session.access_token;
            refreshToken = exchangeData.session.refresh_token;
          }
        }
      }

      if (!accessToken || !refreshToken) {
        return { type: 'error', errorMessage: 'No se encontraron tokens en la respuesta' };
      }

      // Establecer la sesión ÚNICAMENTE en el cliente aislado
      const { data: sessionData, error: sessionErr } = await isolatedClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionErr || !sessionData?.session) {
        return { type: 'error', errorMessage: sessionErr?.message ?? 'Error al establecer la sesión' };
      }

      const user = sessionData.session.user;
      const email = user.email ?? '';

      // Comprobar si el perfil tiene onboarding completado (reintentar brevemente si tarda el trigger)
      let onboardingCompleted = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data: profile } = await isolatedClient
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          onboardingCompleted = profile.onboarding_completed === true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (mode === 'register' && onboardingCompleted) {
        // Ya existe cuenta y está completada: avisar y NO propagar sesión
        try {
          await isolatedClient.auth.signOut();
        } catch {}
        return { type: 'account_exists', email };
      }

      if (mode === 'login' && !onboardingCompleted) {
        // No existe cuenta registrada o no ha terminado el onboarding.
        // Limpiar en BD el usuario OAuth recién creado.
        try {
          await (isolatedClient.rpc as any)('cleanup_unregistered_oauth_user');
          await isolatedClient.auth.signOut();
        } catch (cleanupErr) {
          console.warn('Error cleaning up unregistered oauth user:', cleanupErr);
        }
        // NO propagamos la sesión al cliente principal 'supabase',
        // por lo que RootNavigator NUNCA navega y la pantalla se queda 100% en Login.
        return { type: 'no_account', email };
      }

      // Todo correcto: propagar la sesión al cliente principal
      // para que el onAuthStateChange del RootNavigator redirija automáticamente.
      const { data: mainSessionData, error: mainSessionErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (mainSessionErr || !mainSessionData?.session) {
        return { type: 'error', errorMessage: mainSessionErr?.message ?? 'Error al sincronizar la sesión principal' };
      }

      return { type: 'success', email };
    } catch (e: any) {
      return { type: 'error', errorMessage: e?.message ?? 'Error desconocido' };
    } finally {
      setLoading(false);
      useAuthStore.getState().setOauthInProgress(false);
    }
  }, [mode, redirectUri]);

  return { signInWithGoogle, loading };
}
