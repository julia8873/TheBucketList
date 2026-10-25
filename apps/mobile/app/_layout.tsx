import 'react-native-url-polyfill/auto';
import { resetNavigationGuard } from '../src/utils/navigationGuard';
import React, { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
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
import { hydrateDailyTasksCustomization } from '../src/stores/dailyTasksCustomization.store';
import { hydrateLanguageStore } from '../src/stores/language.store';
import { hydrateHapticsStore } from '../src/stores/haptics.store';
import { useAuthStore } from '../src/stores/auth.store';
import { supabase } from '../src/services/supabase';
import { useAutoRefresh } from '../src/hooks/useAutoRefresh';
import { bucketApi } from '../src/services/api/bucket';
import { BUCKETS_QUERY_KEY } from '../src/hooks/useBuckets';
import { ALBUMS_QUERY_KEY, fetchAlbums } from '../src/hooks/useAlbums';
import { useRealtimeSync } from '../src/hooks/useRealtimeSync';
import { useNotificationTapHandler } from '../src/hooks/useNotificationTapHandler';
import 'intl-pluralrules';
import '../../../packages/shared/src/i18n'; // initialize i18n
import { LogBox, Platform, View, StyleSheet } from 'react-native';

LogBox.ignoreLogs([
  'findDOMNode is deprecated',
  'validateDOMNesting',
]);

if (Platform.OS === 'web' && typeof window !== 'undefined') {
  const origError = console.error;
  console.error = (...args: any[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (msg.includes('findDOMNode is deprecated') || msg.includes('validateDOMNesting')) {
      return;
    }
    origError(...args);
  };

  if (typeof document !== 'undefined') {
    const styleId = 'hide-web-scrollbar';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        *::-webkit-scrollbar {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        * {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
        html, body {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
          overflow-x: hidden;
        }
      `;
      document.head.appendChild(style);
    }
  }
}

// Muestra el error en pantalla en lugar de una pantalla negra si falla un render
export { ErrorBoundary } from 'expo-router';

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
          hydrateDailyTasksCustomization(),
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

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
  const {
    session,
    isInitialized,
    onboardingCompleted,
    isRecovering,
    oauthInProgress,
    authRedirectTarget,
    setAuthRedirectTarget,
    setOnboardingCompleted,
    setRecovering,
  } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();
  const lastRoutedRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  // Redirecciones de autenticación: limpian modales/stack (si no, un `replace` solo sustituye la
  // pantalla superior y queda una pantalla (tabs) huérfana → pantalla negra al volver a entrar) y
  // evitan que el navigationGuard descarte la navegación en silencio.
  const goTo = (target: string) => {
    resetNavigationGuard();
    try {
      if (router.canDismiss()) router.dismissAll();
    } catch {
      // sin nada que cerrar
    }
    router.replace(target as any);
  };

  // Precarga de "Mi lista" (tareas y álbumes) EN PARALELO a la comprobación del onboarding:
  // así cuando la app navega a la pestaña, los datos ya están (o casi) y no se ve la pantalla vacía.
  useEffect(() => {
    if (!userId) return;
    void queryClient.prefetchQuery({
      queryKey: [...BUCKETS_QUERY_KEY, userId],
      queryFn: () => bucketApi.getBuckets(userId),
    });
    void queryClient.prefetchQuery({
      queryKey: [...ALBUMS_QUERY_KEY, userId],
      queryFn: () => fetchAlbums(userId),
    });
  }, [userId, queryClient]);

  // El splash se mantiene hasta saber a qué pantalla ir (antes se quitaba al cargar las
  // fuentes y quedaba una pantalla en blanco mientras se leía la sesión y el perfil).
  const appReady = isInitialized && (!session || isRecovering || onboardingCompleted !== null);
  useEffect(() => {
    if (appReady) void SplashScreen.hideAsync();
  }, [appReady]);
  // Seguro: nunca dejar el splash más de 8 s (p. ej. sin conexión).
  useEffect(() => {
    const id = setTimeout(() => void SplashScreen.hideAsync(), 8000);
    return () => clearTimeout(id);
  }, []);

  // Recarga automática (volver a la app, recuperar conexión, cada 60 s)
  useAutoRefresh();

  // Cambios de otros colaboradores en tiempo real (tareas y álbumes compartidos)
  useRealtimeSync(userId);

  // Pulsar una notificación del sistema (p. ej. de un comentario) abre la tarea / álbum / comentario
  useNotificationTapHandler(appReady && !!session && onboardingCompleted === true);

  // Enlaces del correo (confirmar cuenta / restablecer contraseña):
  useEffect(() => {
    const handleUrl = async (url: string | null) => {
      if (!url) return;

      try {
        const fragment = url.split('#')[1];
        if (fragment) {
          const params = new URLSearchParams(fragment);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');
          const isRecovery = params.get('type') === 'recovery';
          if (access_token && refresh_token && isRecovery) {
            setRecovering(true);
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) setRecovering(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Error handling deep link URL:', err);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) void handleUrl(url);
    });

    const sub = Linking.addEventListener('url', (e) => {
      void handleUrl(e.url);
    });
    return () => sub.remove();
  }, [router, setRecovering]);

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
    // Mientras el flujo de Google OAuth esté en progreso, no interferir con el routing
    if (oauthInProgress) return;

    const group = segments[0];

    if (!session) {
      if (group !== '(auth)') {
        const target = authRedirectTarget || '/(auth)/welcome';
        if (authRedirectTarget) setAuthRedirectTarget(null);
        if (lastRoutedRef.current !== target) {
          lastRoutedRef.current = target;
          goTo(target);
        }
      } else {
        lastRoutedRef.current = null;
      }
      return;
    }

    if (isRecovering) return; // dejar terminar "nueva contraseña"
    if (onboardingCompleted === null) return; // cargando perfil

    if (!onboardingCompleted) {
      if (group !== '(onboarding)') {
        if (lastRoutedRef.current !== '/(onboarding)/username') {
          lastRoutedRef.current = '/(onboarding)/username';
          goTo('/(onboarding)/username');
        }
      } else {
        lastRoutedRef.current = '/(onboarding)/username';
      }
      return;
    }

    // `!group` = ruta `index` (arranque en frío con sesión guardada): index devuelve null, así que
    // sin esta redirección se quedaba la pantalla negra.
    if (!group || group === '(auth)' || group === '(onboarding)') {
      if (lastRoutedRef.current !== '/(tabs)/my-list') {
        lastRoutedRef.current = '/(tabs)/my-list';
        goTo('/(tabs)/my-list');
      }
    } else if (group === '(tabs)') {
      lastRoutedRef.current = null;
    }
  }, [
    session,
    isInitialized,
    onboardingCompleted,
    isRecovering,
    oauthInProgress,
    authRedirectTarget,
    setAuthRedirectTarget,
    segments,
    router,
  ]);

  return (
    <View style={[webLayoutStyles.outerContainer, { backgroundColor: theme.dark ? '#0B0D12' : '#F1F3F5' }]}>
      <View style={[webLayoutStyles.innerContainer, { backgroundColor: theme.colors.background }]}>
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
      </View>
    </View>
  );
}

const webLayoutStyles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    ...Platform.select({
      web: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
        justifyContent: 'center',
      },
      default: {
        flex: 1,
      },
    }),
  },
  innerContainer: {
    flex: 1,
    width: '100%',
    ...Platform.select({
      web: {
        maxWidth: 620,
        height: '100%',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.07)',
        boxShadow: '0 0 40px rgba(0, 0, 0, 0.35)',
        position: 'relative',
      } as any,
      default: {
        flex: 1,
      },
    }),
  },
});