import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/auth.store';

export default function Index() {
  const { session, isInitialized } = useAuthStore();

  if (!isInitialized) return null; // Wait until Supabase session is checked

  if (session) {
    return <Redirect href="/(tabs)/feed" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
