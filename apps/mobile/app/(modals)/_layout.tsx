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
