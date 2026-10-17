import 'react-native-url-polyfill/auto';
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
import { ThemeProvider, ToastProvider, useTheme } from '@bucketlist/ui';
import { useThemeStore, hydrateThemeStore } from '../src/stores/theme.store';
import { hydrateLanguageStore } from '../src/stores/language.store';
import { hydrateHapticsStore } from '../src/stores/haptics.store';
import { useAuthStore } from '../src/stores/auth.store';
import { supabase } from '../src/services/supabase';
import { useAutoRefresh } from '../src/hooks/useAutoRefresh';
import { useRealtimeSync } from '../src/hooks/useRealtimeSync';
import 'intl-pluralrules';
import '../../../packages/shared/src/i18n'; // initialize i18n

// Keep the splash screen visible while we fetch resources
void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3, // 3 minutos: navegación entre pestañas instantánea sin re-peticiones innecesarias
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
      gcTime: 1000 * 60 * 10,   // 10 minutes
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
        await hydrateThemeStore();
        await hydrateLanguageStore();
        await hydrateHapticsStore();
        await Font.loadAsync({
          Inter_400Regular,
          Inter_500Medium,
          Inter_600SemiBold,
          Inter_700Bold,
          PlayfairDisplay_600SemiBold,
          PlayfairDisplay_700Bold,
        });
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
              <RootNavigator />
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
            return;
          }
        }

        const query = url.split('?')[1]?.split('#')[0];
        if (query) {
          const params = new URLSearchParams(query);
          const code = params.get('code');
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
          }
        }
      } catch (err) {
        console.warn('Error handling deep link URL:', err);
      }
    };
    void Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', (e) => void handleUrl(e.url));
    return () => sub.remove();
  }, []);

  // ¿Ha completado el onboarding este usuario?
  useEffect(() => {
    if (!userId) { setOnboardingCompleted(null); return; }
    let cancelled = false;
    void supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        console.log('ONBOARDING', JSON.stringify({ data, error }));
        // Ante un error no bloqueamos al usuario fuera de la app
        setOnboardingCompleted(error || !data ? true : data.onboarding_completed !== false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!isInitialized) return;
    const group = segments[0];
    if (!session) {
      if (group !== '(auth)') router.replace('/(auth)/welcome');
      return;
    }
    if (isRecovering) return; // dejar terminar "nueva contraseña"
    if (onboardingCompleted === null) return; // cargando perfil
    if (!onboardingCompleted) {
      if (group !== '(onboarding)') router.replace('/(onboarding)/username');
      return;
    }
    if (group === '(auth)') router.replace('/(tabs)/my-list');
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