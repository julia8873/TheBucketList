import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { useAuthStore } from '../stores/auth.store';
import { getAuthRedirectUrl, getSupabaseUrl, getSupabaseAnonKey } from '../constants/urls';

export type GoogleAuthMode = 'login' | 'register';

export interface GoogleAuthResult {
  type: 'success' | 'account_exists' | 'no_account' | 'error' | 'cancelled';
  /** Email del usuario de Google, presente en account_exists / no_account */
  email?: string;
  errorMessage?: string;
}

/**
 * Cliente Supabase aislado en memoria para la verificación previa en web,
 * evitando disparar onAuthStateChange ni persistir sesión antes de validar
 * que la cuenta existe y tiene onboarding completado.
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
 * Implementación web de useGoogleAuth.
 * En la web, redirige en la MISMA pestaña (window.location.assign) en lugar de
 * abrir una ventana o pestaña emergente con WebBrowser.openAuthSessionAsync.
 *
 * Al regresar de Google en la misma pestaña, detecta los tokens en la URL,
 * valida el estado del usuario en el cliente aislado y, si todo es correcto,
 * propaga la sesión al cliente principal de Supabase.
 */
export function useGoogleAuth(mode: GoogleAuthMode) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Escuchar si la página cargó con tokens OAuth devueltos por Google en la misma pestaña
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash || '';
    const search = window.location.search || '';

    const hasAccessToken = hash.includes('access_token=');
    const hasCode = search.includes('code=');

    if (!hasAccessToken && !hasCode) return;

    let isMounted = true;

    const handleCallback = async () => {
      setLoading(true);
      useAuthStore.getState().setOauthInProgress(true);

      try {
        let accessToken: string | null = null;
        let refreshToken: string | null = null;

        if (hash) {
          const params = new URLSearchParams(hash.replace(/^#/, ''));
          accessToken = params.get('access_token');
          refreshToken = params.get('refresh_token');
        }

        const isolatedClient = createIsolatedAuthClient();

        if (!accessToken && search) {
          const params = new URLSearchParams(search.replace(/^\?/, ''));
          const code = params.get('code');
          if (code) {
            const { data: exchangeData, error: exchangeErr } =
              await isolatedClient.auth.exchangeCodeForSession(code);
            if (!exchangeErr && exchangeData?.session) {
              accessToken = exchangeData.session.access_token;
              refreshToken = exchangeData.session.refresh_token;
            }
          }
        }

        // Limpiar el hash / query de la URL para no dejar tokens en el historial del navegador
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }

        if (!accessToken || !refreshToken) {
          throw new Error('No se encontraron credenciales en la respuesta de Google');
        }

        // Establecer la sesión ÚNICAMENTE en el cliente aislado
        const { data: sessionData, error: sessionErr } = await isolatedClient.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionErr || !sessionData?.session) {
          throw new Error(sessionErr?.message ?? 'Error al establecer la sesión');
        }

        const user = sessionData.session.user;
        const email = user.email ?? '';

        // Comprobar si el perfil tiene onboarding completado
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

        const effectiveMode =
          (sessionStorage.getItem('oauth_auth_mode') as GoogleAuthMode) || mode;
        sessionStorage.removeItem('oauth_auth_mode');
        sessionStorage.removeItem('oauth_in_progress');

        if (effectiveMode === 'register' && onboardingCompleted) {
          // Ya existe cuenta: limpiar cliente aislado y avisar
          try {
            await isolatedClient.auth.signOut();
          } catch {}
          setTimeout(() => {
            alert(
              `Ya existe una cuenta con el correo ${email}. Por favor, inicia sesión con tu cuenta.`
            );
            router.replace('/(auth)/login');
          }, 100);
          return;
        }

        if (effectiveMode === 'login' && !onboardingCompleted) {
          // No existe cuenta o no completó onboarding: limpiar usuario creado por OAuth
          try {
            await (isolatedClient.rpc as any)('cleanup_unregistered_oauth_user');
            await isolatedClient.auth.signOut();
          } catch (cleanupErr) {
            console.warn('Error cleaning up unregistered oauth user:', cleanupErr);
          }
          setTimeout(() => {
            const wantsRegister = window.confirm(
              `No existe una cuenta asociada a ${email}.\n\n¿Quieres crear una cuenta nueva?`
            );
            if (wantsRegister) {
              router.replace('/(auth)/register');
            }
          }, 100);
          return;
        }

        // Todo correcto: propagar la sesión al cliente principal
        const { data: mainSessionData, error: mainSessionErr } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (mainSessionErr || !mainSessionData?.session) {
          throw new Error(
            mainSessionErr?.message ?? 'Error al sincronizar la sesión principal'
          );
        }

        // El RootNavigator detectará SIGNED_IN y redirigirá automáticamente a la app
      } catch (err: any) {
        console.error('Error handling web Google auth callback:', err);
        alert(err?.message ?? 'Error al iniciar sesión con Google');
      } finally {
        if (isMounted) {
          setLoading(false);
          useAuthStore.getState().setOauthInProgress(false);
        }
      }
    };

    void handleCallback();

    return () => {
      isMounted = false;
    };
  }, [mode, router]);

  const signInWithGoogle = useCallback(async (): Promise<GoogleAuthResult> => {
    setLoading(true);
    useAuthStore.getState().setOauthInProgress(true);

    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('oauth_auth_mode', mode);
        sessionStorage.setItem('oauth_in_progress', 'true');
      }

      const isolatedClient = createIsolatedAuthClient();
      const redirectUri = getAuthRedirectUrl(mode === 'register' ? 'register' : 'login');

      const { data, error } = await isolatedClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data?.url) {
        setLoading(false);
        useAuthStore.getState().setOauthInProgress(false);
        return {
          type: 'error',
          errorMessage: error?.message ?? 'No se obtuvo URL de autenticación',
        };
      }

      // En web, redirigir en la MISMA pestaña en lugar de abrir una nueva ventana o pestaña
      window.location.assign(data.url);

      // Devolver una promesa pendiente mientras el navegador realiza la navegación
      return new Promise<GoogleAuthResult>(() => {});
    } catch (e: any) {
      setLoading(false);
      useAuthStore.getState().setOauthInProgress(false);
      return { type: 'error', errorMessage: e?.message ?? 'Error desconocido' };
    }
  }, [mode]);

  return { signInWithGoogle, loading };
}
