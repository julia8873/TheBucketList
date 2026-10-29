import { i18n } from '@bucketlist/shared';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { getAuthRedirectUrl } from '../constants/urls';

export type GoogleAuthMode = 'login' | 'register';

export interface GoogleAuthResult {
  type: 'success' | 'account_exists' | 'no_account' | 'error' | 'cancelled';
  /** Email del usuario de Google, presente en account_exists / no_account */
  email?: string;
  errorMessage?: string;
}

/**
 * Implementación web de useGoogleAuth.
 * En la web, redirige en la MISMA pestaña (window.location.assign) en lugar de
 * abrir una ventana o pestaña emergente con WebBrowser.openAuthSessionAsync.
 *
 * El cliente principal de Supabase gestiona el flujo PKCE y la detección de sesión
 * en la URL al regresar (detectSessionInUrl: true en web), asegurando que los
 * tokens y el verificador se almacenen correctamente en localStorage sin pérdida de estado.
 */
export function useGoogleAuth(mode: GoogleAuthMode) {
  const [loading, setLoading] = useState(false);

  // Limpiar hash o query de autenticación una vez que Supabase confirme SIGNED_IN
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash || '';
    const search = window.location.search || '';

    if (hash.includes('access_token=') || search.includes('code=')) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN') {
          if (window.history && window.history.replaceState) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<GoogleAuthResult> => {
    setLoading(true);

    try {
      const redirectUri = getAuthRedirectUrl(mode === 'register' ? 'register' : 'login');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data?.url) {
        setLoading(false);
        return {
          type: 'error',
          errorMessage: error?.message ?? 'No se obtuvo URL de autenticación',
        };
      }

      // En web, redirigir en la MISMA pestaña sin abrir ventanas emergentes
      if (typeof window !== 'undefined') {
        window.location.assign(data.url);
      }

      // Retornar una promesa pendiente mientras el navegador carga la página de Google
      return new Promise<GoogleAuthResult>(() => {});
    } catch (e: any) {
      setLoading(false);
      return { type: 'error', errorMessage: e?.message ?? i18n.t('auth.err_unknown', { defaultValue: 'Error desconocido' }) };
    }
  }, [mode]);

  return { signInWithGoogle, loading };
}
