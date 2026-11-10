import { Share, Platform } from 'react-native';

interface ShareLinkOptions {
  title?: string;
  url: string;
}

/**
 * Comparte un enlace de forma limpia evitando enlaces duplicados en WhatsApp, Telegram y Windows/macOS Share.
 */
export async function shareLink({ title, url }: ShareLinkOptions): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        // En Web NO pasar 'text' con la misma URL porque Windows/WebShare concatena text + url duplicando el enlace
        await navigator.share({
          title,
          url,
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        console.warn('Web Share API error:', err);
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(url);
        return;
      } catch (_) {}
    }
  }

  if (Platform.OS === 'ios') {
    await Share.share({
      title,
      url,
    });
  } else {
    await Share.share({
      title,
      message: url,
    });
  }
}

