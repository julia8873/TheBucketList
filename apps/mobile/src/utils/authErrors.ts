import type { TFunction } from 'i18next';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const USERNAME_RE = /^(?=.{3,30}$)[a-z0-9_]+(\.[a-z0-9_]+)*$/;

/** Traduce los mensajes de error de Supabase Auth a algo legible. */
export function mapAuthError(message: string | undefined, t: TFunction): string {
  const m = (message ?? '').toLowerCase();
  if (m.includes('invalid login credentials')) return t('auth.err_invalid');
  if (m.includes('email not confirmed')) return t('auth.err_unconfirmed');
  if (m.includes('already registered') || m.includes('already been registered')) return t('auth.err_exists');
  if (m.includes('password should be') || m.includes('weak password')) return t('auth.err_weak');
  if (m.includes('rate limit') || m.includes('too many') || m.includes('security purposes')) return t('auth.err_rate');
  if (m.includes('network') || m.includes('fetch')) return t('auth.err_network');
  return t('auth.err_generic');
}

/** "Lucía.C" → "luc_a.c" (válido para USERNAME_RE) */
export function sanitizeUsername(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9._]/g, '');
}

/** "lucia.c" → "LC" · "lucia" → "LU" */
export function initialsOfUsername(username: string): string {
  const parts = username.split(/[._]+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]!.charAt(0)}${parts[1]!.charAt(0)}`.toUpperCase();
  return (username || '?').slice(0, 2).toUpperCase();
}
