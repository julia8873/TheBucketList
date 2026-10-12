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

  const rawWeb = process.env['EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'];
  const rawAndroid = process.env['EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'];
  const rawIos = process.env['EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'];

  const isConfigured = Boolean(
    rawWeb &&
    !rawWeb.includes('your-web-client-id') &&
    rawAndroid &&
    !rawAndroid.includes('your-android-client-id')
  );

  // expo-auth-session lanza invariantClientId si androidClientId es undefined en Android.
  // Proporcionamos un fallback no-undefined seguro para evitar pantallas blancas.
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: rawWeb || 'disabled-web-client-id',
    androidClientId: rawAndroid || 'disabled-android-client-id',
    iosClientId: rawIos || 'disabled-ios-client-id',
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

  const start = () => {
    if (!isConfigured) {
      onError('El inicio de sesión con Google no está configurado en este entorno.');
      return;
    }
    void promptAsync();
  };

  return { start, ready: isConfigured && !!request, loading };
}