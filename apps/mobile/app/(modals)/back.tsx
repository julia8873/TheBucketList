import { useCallback } from 'react';
import { View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

/**
 * Ancla vacía de la pila de modales (ver `_layout.tsx`). Si alguna vez queda visible, se cierra
 * sola y vuelve a la pantalla anterior a los modales.
 */
export default function ModalsAnchor() {
  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/my-list' as any);
    }, [router]),
  );

  return <View />;
}
