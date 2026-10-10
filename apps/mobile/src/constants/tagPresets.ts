/**
 * Presets de etiquetas: paleta de colores del diseño + emojis por defecto.
 * Cada emoji lleva un color de fondo por defecto; el usuario puede cambiarlo
 * por cualquiera de la paleta o por un color propio (hex), y escribir su propio emoji.
 */

export const TAG_COLORS = [
  { name: 'Dorado', value: '#D4B13B' },
  { name: 'Naranja', value: '#E17B3B' },
  { name: 'Rojo', value: '#E1553C' },
  { name: 'Rosa', value: '#DA69A7' },
  { name: 'Morado', value: '#8D5BD6' },
  { name: 'Azul', value: '#4B8FE0' },
  { name: 'Turquesa', value: '#31B19A' },
  { name: 'Verde', value: '#4CB06A' },
  { name: 'Gris', value: '#8A8A8A' },
] as const;

export const DEFAULT_TAG_COLOR = TAG_COLORS[0].value;
export const TAG_NAME_MAX = 20;

export interface TagEmojiPreset {
  emoji: string;
  /** Color de fondo por defecto del emoji. */
  color: string;
}

export const TAG_EMOJIS: TagEmojiPreset[] = [
  { emoji: '✈️', color: '#31B19A' },
  { emoji: '🏔️', color: '#E17B3B' },
  { emoji: '🍕', color: '#E1553C' },
  { emoji: '⚽', color: '#4B8FE0' },
  { emoji: '👯', color: '#8D5BD6' },
  { emoji: '👨‍👩‍👧', color: '#DA69A7' },
  { emoji: '🌿', color: '#4CB06A' },
  { emoji: '☀️', color: '#D4B13B' },
  { emoji: '🎵', color: '#8D5BD6' },
  { emoji: '📸', color: '#8A8A8A' },
  { emoji: '🎨', color: '#DA69A7' },
  { emoji: '📚', color: '#4B8FE0' },
  { emoji: '🏖️', color: '#31B19A' },
  { emoji: '🎉', color: '#D4B13B' },
  { emoji: '❤️', color: '#E1553C' },
  { emoji: '🚀', color: '#4B8FE0' },
  { emoji: '🍷', color: '#E1553C' },
  { emoji: '🏃', color: '#E17B3B' },
  { emoji: '🎬', color: '#8A8A8A' },
  { emoji: '💼', color: '#8A8A8A' },
  { emoji: '🐾', color: '#4CB06A' },
  { emoji: '⭐', color: '#D4B13B' },
];

/** Emoji por defecto según el nombre de la etiqueta (si no hay coincidencia → null). */
const KEYWORDS: Array<[RegExp, string]> = [
  [/viaj|travel|trip/i, '✈️'],
  [/aventur|advent/i, '🏔️'],
  [/comid|food|cocin|restaur/i, '🍕'],
  [/deport|sport|gym/i, '⚽'],
  [/amig|friend/i, '👯'],
  [/famil/i, '👨‍👩‍👧'],
  [/natur/i, '🌿'],
  [/verano|summer|playa|beach/i, '☀️'],
  [/music|concier|festival/i, '🎵'],
  [/foto|photo/i, '📸'],
  [/arte|art\b/i, '🎨'],
  [/libro|book|leer/i, '📚'],
  [/solit|solo/i, '🚶'],
  [/anivers|cumple|birthday/i, '🎉'],
];

export function defaultEmojiFor(name: string): string | null {
  const n = name.trim();
  if (!n) return null;
  for (const [re, emoji] of KEYWORDS) if (re.test(n)) return emoji;
  return null;
}

export function defaultColorForEmoji(emoji: string): string | null {
  return TAG_EMOJIS.find((e) => e.emoji === emoji)?.color ?? null;
}

// ─── Utilidades de color ──────────────────────────────────────────────────────

export function normalizeHex(input: string): string | null {
  let h = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(h)) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return `#${h.toUpperCase()}`;
}

export function hexToRgba(hex: string, alpha: number): string {
  const n = normalizeHex(hex);
  if (!n) return `rgba(138,138,138,${alpha})`;
  const r = parseInt(n.slice(1, 3), 16);
  const g = parseInt(n.slice(3, 5), 16);
  const b = parseInt(n.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

/** Color de texto legible (oscuro/claro) sobre un fondo hex. */
export function readableOn(hex: string): string {
  const n = normalizeHex(hex);
  if (!n) return '#111111';
  const r = parseInt(n.slice(1, 3), 16);
  const g = parseInt(n.slice(3, 5), 16);
  const b = parseInt(n.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#111111' : '#FFFFFF';
}

// ─── Utilidades de emoji ──────────────────────────────────────────────────────

/** Secuencia de emoji (bandera, keycap, ZWJ, tono de piel, selector de variación). */
const EMOJI_SEQUENCE =
  '(?:[\\u{1F1E6}-\\u{1F1FF}]{2}|[#*0-9]\\uFE0F?\\u20E3|\\p{Extended_Pictographic}(?:\\uFE0F|[\\u{1F3FB}-\\u{1F3FF}])*(?:\\u200D\\p{Extended_Pictographic}(?:\\uFE0F|[\\u{1F3FB}-\\u{1F3FF}])*)*)';

/** Devuelve el primer emoji del texto (como secuencia completa), o null si no empieza por uno. */
export function firstEmoji(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  try {
    const m = s.match(new RegExp('^' + EMOJI_SEQUENCE, 'u'));
    return m ? m[0] : null;
  } catch {
    // Motor sin soporte de \p{…}: aceptamos el primer carácter no alfanumérico.
    const first = Array.from(s)[0] ?? null;
    return first && !/[\p{L}\p{N}]/u.test(first) ? first : null;
  }
}

export const looksLikeEmoji = (input: string): boolean => firstEmoji(input) !== null;

export interface TagLike {
  id: string;
  name: string;
  color: string;
  emoji?: string | null;
}
