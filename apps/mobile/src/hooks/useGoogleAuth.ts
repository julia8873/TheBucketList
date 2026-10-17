import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../services/supabase';

WebBrowser.maybeCompleteAuthSession();

/**
 * Hook para inicio de sesión y registro con Google mediante Supabase OAuth.
 * Abre una ventana segura de navegador para que el usuario elija su cuenta de Google
 * y redirige de vuelta a la app con la sesión establecida.
 */
export function useGoogleAuth(onError: (message: string) => void) {
  const [loading, setLoading] = useState(false);

  const start = async () => {
    try {
      setLoading(true);

      const redirectTo = makeRedirectUri({
        scheme: 'bucketlist',
        path: 'auth/callback',
      });
      console.log('[GoogleAuth] Redirect URI configurado:', redirectTo);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
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
              if (sessionErr) onError(sessionErr.message);
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
              onError(errorDesc);
              return;
            }

            if (code) {
              const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
              if (exchangeErr) onError(exchangeErr.message);
              return;
            }
          }
        }
      }
    } catch (e: any) {
      onError(e?.message ?? 'No se pudo iniciar sesión con Google');
    } finally {
      setLoading(false);
    }
  };

  return { start, ready: true, loading };
}