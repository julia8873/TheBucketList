/**
 * Color tokens — TheBucketList dark-first palette
 * Primary brand: deep black + brand blue (#0073CF)
 */

// ─── Brand blue scale ──────────────────────────────────────────────────────────
// NOTE: the export keeps the historical name `gold` so every existing
// `gold[400]` import keeps working; the values are now the brand blue.
export const gold = {
  100: '#D6E9F9',
  200: '#9CCAF0',
  300: '#3395E6',
  400: '#0073CF',  // primary brand blue
  500: '#005FAA',
  600: '#004C88',
  700: '#003A68',
  800: '#002A4B',
  900: '#001A2E',
} as const;
/** Alias with a neutral name for new code. */
export const brand = gold;

// ─── Blacks & grays (cool-neutral) ────────────────────────────────────────────
export const dark = {
  0:    '#000000',
  50:   '#060608',
  100:  '#0B0B0D',  // bg
  150:  '#0E0E12',  // tabbar
  200:  '#141418',  // surface
  250:  '#16161B',  // surface-alt / sheet bg
  300:  '#1E1E24',  // field
  400:  '#24242C',  // border
  500:  '#3A3A3A',
  600:  '#5A5A5A',
  700:  '#A1A1AA',  // text-muted
  800:  '#D4D4D8',  // text-secondary
  900:  '#F2F2F7',  // text primary
  1000: '#FFFFFF',
} as const;

// ─── Warm lights (for light theme) ────────────────────────────────────────────
export const warm = {
  50:  '#F6F8FB',  // bg light
  100: '#EBEFF5',
  200: '#DDE3EC',
  300: '#C3CCDA',
  400: '#9AA7BB',
  500: '#6F7D93',
  600: '#53607A',
  700: '#38435A',
} as const;

// ─── Semantic ─────────────────────────────────────────────────────────────────
export const green = {
  100: 'hsl(142,52%,88%)',
  400: 'hsl(142,55%,42%)',
  500: 'hsl(142,60%,34%)',
  900: 'hsl(142,60%,10%)',
} as const;

export const red = {
  100: 'hsl(4,80%,20%)',
  500: 'hsl(4,70%,48%)',
  900: 'hsl(4,74%,14%)',
} as const;

export const amber = {
  100: '#6B4A1F',   // border for warning
  500: '#E0A458',   // warning
  900: '#2A1A08',   // warning bg
} as const;

export const blue = {
  100: 'hsl(210,72%,20%)',
  500: 'hsl(210,68%,48%)',
  900: 'hsl(210,68%,12%)',
} as const;

// ─── Specific UI tokens ───────────────────────────────────────────────────────
/** Logo: "The" text color */
export const LOGO_THE = '#9CCAF0';
/** Brand ring for avatar border */
export const GOLD_RING = gold[400];
/** Brand bg tint (for icon backgrounds, selected states) */
export const GOLD_BG = '#0A1B2E';
/** Brand border (for chips, cards with gold accent) */
export const GOLD_BORDER = '#0F4A80';

// ─── Category colors ──────────────────────────────────────────────────────────
export const categoryColors = {
  travel:   '#3B8EEA',
  food:     '#F59E0B',
  sport:    '#22C55E',
  creative: '#A855F7',
  social:   '#EC4899',
  other:    dark[700],
} as const;

// ─── Hearts ───────────────────────────────────────────────────────────────────
/** Único color para TODOS los corazones (me gusta) de la app */
export const HEART_COLOR = '#0073CF';

// ─── Reactions ────────────────────────────────────────────────────────────────
export const REACTION_EMOJIS = ['🔥', '❤️', '👏', '🎉', '✈️', '🌟'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];
