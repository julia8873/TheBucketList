import 'react-native-url-polyfill/auto';
import '../src/utils/navigationGuard';
import React, { useEffect, useCallback } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import { ThemeProvider, ToastProvider, ConfirmProvider, useTheme } from '@bucketlist/ui';
import { useThemeStore, hydrateThemeStore } from '../src/stores/theme.store';
import { hydrateMyListCustomization } from '../src/stores/myListCustomization.store';
import { hydrateLanguageStore } from '../src/stores/language.store';
import { hydrateHapticsStore } from '../src/stores/haptics.store';
import { useAuthStore } from '../src/stores/auth.store';
import { supabase } from '../src/services/supabase';
import { useAutoRefresh } from '../src/hooks/useAutoRefresh';
import { useRealtimeSync } from '../src/hooks/useRealtimeSync';
import { validateOAuthSession } from '../src/hooks/useGoogleAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'intl-pluralrules';
import '../../../packages/shared/src/i18n'; // initialize i18n

// Keep the splash screen visible while we fetch resources
void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3, // 3 minutos: navegación entre pestañas instantánea sin re-peticiones innecesarias
      refetchOnReconnect: true,
      refetchOnWindowFocus: false, // En móvil evita ráfagas de peticiones al abrir/cerrar modales o alertas
      gcTime: 1000 * 60 * 15,   // 15 minutos en memoria
      retry: 2,
    },
    mutations: {
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const { override, setOverride } = useThemeStore();
  const { setSession, setInitialized } = useAuthStore();
  const [fontsLoaded, setFontsLoaded] = React.useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await Promise.all([
          hydrateThemeStore(),
          hydrateLanguageStore(),
          hydrateHapticsStore(),
          hydrateMyListCustomization(),
          Font.loadAsync({
            Inter_400Regular,
            Inter_500Medium,
            Inter_600SemiBold,
            Inter_700Bold,
            PlayfairDisplay_600SemiBold,
            PlayfairDisplay_700Bold,
          }),
        ]);
      } catch (e) {
        console.warn(e);
      } finally {
        setFontsLoaded(true);
      }
    }
    void prepare();
  }, []);

  // Listen to Supabase auth changes (login, logout, token refresh)
  useEffect(() => {
    // Get the current session on startup
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitialized(true);
    });

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setInitialized(true);
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
      } else if (event === 'SIGNED_IN') {
        void queryClient.invalidateQueries();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={() => void onLayoutRootView()}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider override={override} onOverrideChange={setOverride}>
            <ToastProvider>
              <ConfirmProvider>
                <RootNavigator />
              </ConfirmProvider>
            </ToastProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function RootNavigator() {
  const { theme } = useTheme();
  const { session, isInitialized, onboardingCompleted, isRecovering, setOnboardingCompleted, setRecovering } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const userId = session?.user.id;

  // Recarga automática (volver a la app, recuperar conexión, cada 60 s)
  useAutoRefresh();

  // Cambios de otros colaboradores en tiempo real (tareas y álbumes compartidos)
  useRealtimeSync(userId);

  // Enlaces del correo y OAuth (confirmar cuenta / restablecer / login con Google):
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;

      // Si hay un flujo OAuth en curso gestionado por useGoogleAuth (openAuthSessionAsync),
      // ese hook ya maneja el redirect completo. Ignoramos aquí para evitar doble apertura.
      const isOAuthCallback =
        url.includes('auth/callback') ||
        url.includes('access_token') ||
        (url.includes('code=') && (url.includes('mode=login') || url.includes('mode=register')));
      if (isOAuthCallback && useAuthStore.getState().oauthMode !== null) return;

      try {
        const fragment = url.split('#')[1];
        if (fragment) {
          const params = new URLSearchParams(fragment);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          if (access_token && refresh_token) {
            const isRecovery = params.get('type') === 'recovery';
            if (isRecovery) setRecovering(true);
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) setRecovering(false);

            // Solo procesamos modo OAuth si NO hay un flujo activo de WebBrowser
            let activeMode = (params.get('mode') as 'login' | 'register') || useAuthStore.getState().oauthMode;
            if (!activeMode) {
              const saved = await AsyncStorage.getItem('@oauth_mode').catch(() => null);
              if (saved === 'register' || saved === 'login') activeMode = saved;
            }
            if (!activeMode) activeMode = 'register';
            if (activeMode && !isRecovery) {
              await validateOAuthSession(activeMode, router);
            }
            return;
          }
        }

        const query = url.split('?')[1]?.split('#')[0];
        if (query) {
          const params = new URLSearchParams(query);
          const code = params.get('code');
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
            let activeMode = (params.get('mode') as 'login' | 'register') || useAuthStore.getState().oauthMode;
            if (!activeMode) {
              const saved = await AsyncStorage.getItem('@oauth_mode').catch(() => null);
              if (saved === 'register' || saved === 'login') activeMode = saved;
            }
            if (!activeMode) activeMode = 'register';
            if (activeMode) {
              await validateOAuthSession(activeMode, router);
            }
          }
        }
      } catch (err) {
        console.warn('Error handling deep link URL:', err);
      }
    };

    // Solo procesamos la URL inicial si NO es un callback OAuth
    // (los callbacks OAuth son manejados por useGoogleAuth o AuthCallbackScreen)
    Linking.getInitialURL().then((url) => {
      if (!url) return;
      const isOAuthCallback =
        url.includes('auth/callback') ||
        url.includes('access_token') ||
        url.includes('code=');
      if (!isOAuthCallback) void handleUrl(url);
    });

    const sub = Linking.addEventListener('url', (e) => void handleUrl(e.url));
    return () => sub.remove();
  }, [router]);

  // ¿Ha completado el onboarding este usuario?
  useEffect(() => {
    if (!userId) { setOnboardingCompleted(null); return; }
    let cancelled = false;

    const checkOnboarding = async (attempt = 0): Promise<void> => {
      if (cancelled) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', userId)
        .maybeSingle();

      if (cancelled) return;

      if (!data && attempt < 4) {
        // El trigger de base de datos puede tardar unos ms en crear el perfil tras el signup
        setTimeout(() => {
          if (!cancelled) void checkOnboarding(attempt + 1);
        }, 300);
        return;
      }

      // Si existe el perfil, completado es estrictamente si onboarding_completed === true
      const isCompleted = data ? data.onboarding_completed === true : false;
      setOnboardingCompleted(isCompleted);
    };

    void checkOnboarding();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!isInitialized) return;
    const group = segments[0];
    if (!session) {
      if (group !== '(auth)' && group !== 'auth') router.replace('/(auth)/welcome');
      return;
    }
    if (isRecovering) return; // dejar terminar "nueva contraseña"
    if (useAuthStore.getState().oauthMode !== null) return; // validando login o register con OAuth
    if (segments[0] === 'auth' && segments[1] === 'callback') return; // en pantalla de callback OAuth
    if (onboardingCompleted === null) return; // cargando perfil
    if (!onboardingCompleted) {
      if (group !== '(onboarding)') router.replace('/(onboarding)/username');
      return;
    }
    if (group === '(auth)' || group === 'auth') router.replace('/(tabs)/my-list');
  }, [session, isInitialized, onboardingCompleted, isRecovering, segments]);

  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
        <Stack.Screen name="index" options={{ title: "TheBucketList" }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
        <Stack.Screen name="map" options={{ animation: 'fade' }} />
        <Stack.Screen name="design-system" />
      </Stack>
    </>
  );
}