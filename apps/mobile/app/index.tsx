import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/auth.store';

export default function Index() {
  const { session, isInitialized, onboardingCompleted } = useAuthStore();

  if (!isInitialized) return null; // Wait until Supabase session is checked

  if (!session) return <Redirect href="/(auth)/welcome" />;
  if (onboardingCompleted === null) return null; // cargando perfil
  if (!onboardingCompleted) return <Redirect href="/(onboarding)/username" />;
  return <Redirect href="/(tabs)/feed" />;
}
