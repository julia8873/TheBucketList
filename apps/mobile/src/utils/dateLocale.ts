import { es, enUS } from 'date-fns/locale';

export function getDateFnsLocale(language?: string) {
  return language === 'en' ? enUS : es;
}
