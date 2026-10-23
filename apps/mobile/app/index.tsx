import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/auth.store';

// El enrutamiento global (sesión, onboarding, splash) lo gestiona RootNavigator en app/_layout.tsx.
// Devolver null aquí evita que Index intente un Redirect en paralelo con router.replace de RootNavigator.
export default function Index() {
  return null;
}
