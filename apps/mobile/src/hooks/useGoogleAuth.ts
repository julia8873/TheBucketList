import { useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { supabase } from '../services/supabase';

WebBrowser.maybeCompleteAuthSession();

/**
 * Login/registro con Google. Si la cuenta es nueva, el trigger de la BD crea el
 * perfil con onboarding pendiente; el RootNavigator se encarga de redirigir.
 */
export function useGoogleAuth(onError: (message: string) => void) {
  const [loading, setLoading] = useState(false);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type === 'success') {
      const idToken = response.params?.id_token;
      if (!idToken) {
        onError('Google no devolvió un token válido');
        return;
      }
      setLoading(true);
      supabase.auth
        .signInWithIdToken({ provider: 'google', token: idToken })
        .then(({ error }) => {
          if (error) onError(error.message);
        })
        .finally(() => setLoading(false));
    } else if (response.type === 'error') {
      onError(response.error?.message ?? 'Google error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  return { start: () => void promptAsync(), ready: !!request, loading };
}