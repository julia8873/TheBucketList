import { i18n } from '@bucketlist/shared';

/** Formatea tiempo relativo ("ahora"/"just now", "hace 5 min"/"5m ago", "hace 1 d"/"1d ago" o fecha). */
export function timeAgo(input?: string | Date | null, explicitLang?: string): string {
  if (!input) return '';
  const date = typeof input === 'string' ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return '';

  const lang = explicitLang || i18n.language || 'es';
  const isEn = lang.toLowerCase().startsWith('en');

  const minutes = Math.floor(Math.max(0, Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return isEn ? 'just now' : 'ahora';
  if (minutes < 60) return isEn ? `${minutes}m ago` : `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return isEn ? `${hours}h ago` : `hace ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return isEn ? `${days}d ago` : `hace ${days} d`;

  return date.toLocaleDateString(isEn ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short' });
}

/** Días naturales entre dos fechas (mínimo 0). */
export function daysBetween(from?: string | Date | null, to?: string | Date | null): number | null {
  if (!from || !to) return null;
  const a = new Date(from);
  const b = new Date(to);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const startA = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const startB = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.max(0, Math.round((startB - startA) / 86400000));
}
