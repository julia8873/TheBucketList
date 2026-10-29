import { supabase } from './supabase';

/**
 * Guarda el idioma de la app en el perfil del usuario para que el servidor envíe las
 * notificaciones push en ese idioma. Es "best effort": si no hay sesión o falla, se ignora.
 */
export async function syncProfileLanguage(lang?: string | null): Promise<void> {
  try {
    const language = lang && lang.startsWith('en') ? 'en' : 'es';
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return;
    await supabase.from('profiles').update({ language }).eq('id', userId);
  } catch {
    // ignorar
  }
}
