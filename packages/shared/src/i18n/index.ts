import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en';
import es from './locales/es';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: 'es',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v3',
});

console.log('I18N', i18n.language, i18n.exists('auth.create_account_link'),
  Object.keys(i18n.getResourceBundle(i18n.language, 'translation')?.auth ?? {}).length);

export default i18n;
