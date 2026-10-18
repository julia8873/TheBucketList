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
  /** Modo activo de OAuth ('login' para "ya tengo cuenta", 'register' para "crear cuenta") */
  oauthMode: 'login' | 'register' | null;
  oauthError: string | null;
  setSession: (session: Session | null) => void;
  setInitialized: (initialized: boolean) => void;
  setOnboardingCompleted: (completed: boolean | null) => void;
  setRecovering: (recovering: boolean) => void;
  setOAuthMode: (mode: 'login' | 'register' | null) => void;
  setOAuthError: (error: string | null) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  isInitialized: false,
  onboardingCompleted: null,
  isRecovering: false,
  oauthMode: null,
  oauthError: null,
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setInitialized: (initialized) => set({ isInitialized: initialized }),
  setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
  setRecovering: (recovering) => set({ isRecovering: recovering }),
  setOAuthMode: (oauthMode) => set({ oauthMode }),
  setOAuthError: (oauthError) => set({ oauthError }),
  signOut: () => set({ session: null, user: null, onboardingCompleted: null, oauthMode: null, oauthError: null }),
}));
