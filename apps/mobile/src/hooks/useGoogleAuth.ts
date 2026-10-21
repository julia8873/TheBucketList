import { useCallback, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../services/supabase';

WebBrowser.maybeCompleteAuthSession();

export type GoogleAuthMode = 'login' | 'register';

export interface GoogleAuthResult {
  type: 'success' | 'account_exists' | 'no_account' | 'error' | 'cancelled';
  /** Email del usuario de Google, presente en account_exists / no_account */
  email?: string;
  errorMessage?: string;
}

/**
 * Hook que gestiona el flujo OAuth de Google con Supabase.
 *
 * - mode='register' → si ya existe cuenta, devuelve { type: 'account_exists', email }
 * - mode='login'    → si no existe cuenta, devuelve { type: 'no_account', email }
 * - En ambos casos, si el flujo va bien, Supabase actualiza la sesión automáticamente
 *   y el RootNavigator redirige al destino correcto.
 */
export function useGoogleAuth(mode: GoogleAuthMode) {
  const [loading, setLoading] = useState(false);

  // URI de redirect: en desarrollo Expo usa el proxy de auth.expo.io
  const redirectUri = makeRedirectUri({ scheme: 'bucketlist' });

  const signInWithGoogle = useCallback(async (): Promise<GoogleAuthResult> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
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

      // Intentar query (?code=… con PKCE) — Supabase puede usar ambos
      if (!accessToken) {
        const query = url.split('?')[1]?.split('#')[0];
        if (query) {
          const params = new URLSearchParams(query);
          const code = params.get('code');
          if (code) {
            const { data: exchangeData, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
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

      // Establecer la sesión en el cliente
      const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionErr || !sessionData?.session) {
        return { type: 'error', errorMessage: sessionErr?.message ?? 'Error al establecer la sesión' };
      }

      const user = sessionData.session.user;
      const email = user.email ?? '';

      // Comprobar si el perfil tiene onboarding completado
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', user.id)
        .maybeSingle();

      const onboardingCompleted = profile?.onboarding_completed === true;

      if (mode === 'register' && onboardingCompleted) {
        // Ya existe cuenta y está completada: limpiar sesión y avisar
        await supabase.auth.signOut();
        return { type: 'account_exists', email };
      }

      if (mode === 'login' && !onboardingCompleted) {
        // No existe cuenta registrada o no ha terminado el onboarding
        // Limpiar la sesión recién creada para que no avance
        const { data: isOAuth } = await supabase.rpc('cleanup_unregistered_oauth_user');
        return { type: 'no_account', email };
      }

      // Todo correcto: el onAuthStateChange del RootNavigator redirigirá automáticamente
      return { type: 'success', email };
    } catch (e: any) {
      return { type: 'error', errorMessage: e?.message ?? 'Error desconocido' };
    } finally {
      setLoading(false);
    }
  }, [mode, redirectUri]);

  return { signInWithGoogle, loading };
}
