import { Stack } from 'expo-router';
import { useTheme } from '@bucketlist/ui';

/**
 * Pantalla "ancla" de la pila de modales. Expo Router coloca debajo de la pantalla que abres la
 * primera pantalla declarada de la pila; antes era `create-album`, y al salir de Ajustes (o de
 * cualquier otro modal) aparecía "New album". Ahora esa pantalla es `back`, que al mostrarse
 * cierra los modales y vuelve a donde estabas.
 */
export const unstable_settings = {
  anchor: 'back',
  initialRouteName: 'back',
};

export default function ModalsLayout() {
  const { theme } = useTheme();

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.colors.background } }}>
      <Stack.Screen name="back" options={{ animation: 'none' }} />
      <Stack.Screen name="create-album" options={{ presentation: 'modal' }} />
      <Stack.Screen name="create-bucket" options={{ presentation: 'modal' }} />
      <Stack.Screen name="complete-[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit-bucket" options={{ presentation: 'modal' }} />
      <Stack.Screen name="notification-prefs" options={{ presentation: 'modal' }} />
      <Stack.Screen name="change-credential" options={{ presentation: 'modal' }} />
      <Stack.Screen name="liked-content" options={{ presentation: 'modal' }} />
      <Stack.Screen name="saved-albums" options={{ presentation: 'modal' }} />
      <Stack.Screen name="create-collection" options={{ presentation: 'modal' }} />
      <Stack.Screen name="blocked-users" options={{ presentation: 'modal' }} />
      <Stack.Screen name="admin-reports" options={{ presentation: 'modal' }} />
      <Stack.Screen name="manage-admins" options={{ presentation: 'modal' }} />
      <Stack.Screen name="manage-collections" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
