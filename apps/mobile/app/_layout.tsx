import 'react-native-url-polyfill/auto';
import React, { useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
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
import { ThemeProvider, ToastProvider } from '@bucketlist/ui';
import { useThemeStore, hydrateThemeStore } from '../src/stores/theme.store';
import { useAuthStore } from '../src/stores/auth.store';
import { supabase } from '../src/services/supabase';
import 'intl-pluralrules';
import '../../../packages/shared/src/i18n'; // initialize i18n

// Keep the splash screen visible while we fetch resources
void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setInitialized(true);
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
  const { override } = useThemeStore();
  const colorScheme = override === 'system' ? undefined : override;

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ title: "TheBucketList" }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
        <Stack.Screen name="design-system" />
      </Stack>
    </>
  );
}
