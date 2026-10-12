import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { focusManager, useQueryClient } from '@tanstack/react-query';

/** Cada cuánto se refrescan los datos "viejos" mientras la app está abierta. */
const POLL_INTERVAL_MS = 60_000;

/**
 * Recarga automática global. Se monta UNA vez (en app/_layout.tsx):
 *  1. Al volver a la app desde segundo plano (móvil) o a la pestaña (web).
 *  2. Al recuperar la conexión a internet.
 *  3. Cada 60 s mientras la app está en primer plano.
 * Solo se recargan las consultas activas que ya están "viejas" (staleTime).
 */
export function useAutoRefresh() {
  const queryClient = useQueryClient();
  const wasOffline = useRef(false);

  // 1) En móvil, React Query no sabe cuándo la app vuelve a primer plano: se lo decimos.
  useEffect(() => {
    if (Platform.OS === 'web') return; // en web ya usa el evento "visibilitychange"
    const onChange = (status: AppStateStatus) => focusManager.setFocused(status === 'active');
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  // 2) Al recuperar la conexión, recargamos todo lo activo.
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected !== false && state.isInternetReachable !== false;
      if (!online) {
        wasOffline.current = true;
        return;
      }
      if (wasOffline.current) {
        wasOffline.current = false;
        void queryClient.invalidateQueries();
      }
    });
    return () => unsubscribe();
  }, [queryClient]);

  // 3) Recarga periódica solo con la app visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (!focusManager.isFocused()) return;
      void queryClient.refetchQueries({ type: 'active', stale: true });
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [queryClient]);
}

/**
 * Para "tirar hacia abajo para recargar" (RefreshControl / FlatList / FlashList).
 * Recarga todas las consultas activas de la pantalla actual.
 *
 *   const { refreshing, onRefresh } = usePullToRefresh();
 *   <FlatList refreshing={refreshing} onRefresh={onRefresh} ... />
 */
export function usePullToRefresh() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.refetchQueries({ type: 'active' });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  return { refreshing, onRefresh };
}
