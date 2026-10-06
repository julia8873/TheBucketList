import { Stack } from 'expo-router';

export default function ModalsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="create-bucket" options={{ presentation: 'modal' }} />
      <Stack.Screen name="complete-[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit-profile" options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit-bucket" options={{ presentation: 'modal' }} />
      <Stack.Screen name="notification-prefs" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
