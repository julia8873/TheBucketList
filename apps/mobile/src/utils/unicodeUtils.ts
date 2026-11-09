/**
 * Utilidades para manejo seguro de caracteres Unicode y emojis en textos con límite.
 *
 * En JavaScript estándar, str.length y str.slice() operan sobre unidades de código UTF-16.
 * Muchos emojis (p. ej. 🎉, 🍔, 🌍, 🏔️) ocupan 2 o más unidades de código (pares sustitutos
 * y modificadores ZWJ).
 *
 * Si se corta un texto con str.slice(0, max), se puede partir un emoji por la mitad,
 * dejando un par sustituto huérfano que se muestra como un signo de interrogación '' o '?'.
 *
 * Estas funciones garantizan que los emojis se cuenten como 1 carácter real (grapheme cluster)
 * y que nunca se corten a la mitad.
 */

/**
 * Cuenta los caracteres visibles reales (grapheme clusters / emojis) de un texto.
 * P. ej. 'Hola 👋🏼'.length en JS es 7, pero getCharCount('Hola 👋🏼') devuelve 6.
 */
export function getCharCount(text: string | null | undefined): number {
  if (!text) return 0;
  if (typeof Intl !== 'undefined' && typeof (Intl as any).Segmenter === 'function') {
    try {
      const segmenter = new (Intl as any).Segmenter('und', { granularity: 'grapheme' });
      let count = 0;
      for (const _ of segmenter.segment(text)) {
        count++;
      }
      return count;
    } catch {
      // fallback abajo
    }
  }
  return Array.from(text).length;
}

/**
 * Trunca un texto a un máximo de caracteres/emojis reales sin partir nunca un par
 * sustituto ni un emoji compuesto.
 */
export function truncateChars(text: string | null | undefined, maxChars: number): string {
  if (!text || maxChars <= 0) return '';
  if (typeof Intl !== 'undefined' && typeof (Intl as any).Segmenter === 'function') {
    try {
      const segmenter = new (Intl as any).Segmenter('und', { granularity: 'grapheme' });
      let count = 0;
      let endIndex = 0;
      for (const segment of segmenter.segment(text)) {
        if (count >= maxChars) break;
        count++;
        endIndex = segment.index + segment.segment.length;
      }
      return text.slice(0, endIndex);
    } catch {
      // fallback abajo
    }
  }
  return Array.from(text).slice(0, maxChars).join('');
}

