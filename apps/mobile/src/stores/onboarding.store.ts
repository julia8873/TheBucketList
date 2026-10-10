import { create } from 'zustand';

interface OnboardingState {
  username: string;
  avatarUrl: string | null;
  bio: string;
  setUsername: (v: string) => void;
  setAvatarUrl: (v: string | null) => void;
  setBio: (v: string) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  username: '',
  avatarUrl: null,
  bio: '',
  setUsername: (username) => set({ username }),
  setAvatarUrl: (avatarUrl) => set({ avatarUrl }),
  setBio: (bio) => set({ bio }),
  reset: () => set({ username: '', avatarUrl: null, bio: '' }),
}));
