import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user: User | null;
  isInitialized: boolean;
  /** null = aún no sabemos (cargando el perfil) */
  onboardingCompleted: boolean | null;
  /** true mientras el usuario restablece su contraseña desde el enlace del correo */
  isRecovering: boolean;
  setSession: (session: Session | null) => void;
  setInitialized: (initialized: boolean) => void;
  setOnboardingCompleted: (completed: boolean | null) => void;
  setRecovering: (recovering: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isInitialized: false,
  onboardingCompleted: null,
  isRecovering: false,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),
  setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
  setRecovering: (recovering) => set({ isRecovering: recovering }),
  signOut: () => set({ session: null, user: null, onboardingCompleted: null }),
}));
