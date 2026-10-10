import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';

export type AppLanguage = 'es' | 'en';

interface LanguageStore {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  language: 'es',
  setLanguage: (lang) => {
    set({ language: lang });
    void i18n.changeLanguage(lang);
    void AsyncStorage.setItem('@language', lang).catch(() => undefined);
  },
}));

/** Llamar al arrancar la app para restaurar el idioma elegido. */
export async function hydrateLanguageStore(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem('@language');
    if (stored === 'es' || stored === 'en') {
      useLanguageStore.setState({ language: stored });
      await i18n.changeLanguage(stored);
    }
  } catch {
    // ignorar
  }
}
