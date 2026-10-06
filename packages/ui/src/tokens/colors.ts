/**
 * Color tokens — TheBucketList dark-first palette
 * Primary brand: deep black + rich gold
 */

// ─── Raw gold scale ────────────────────────────────────────────────────────────
export const gold = {
  100: '#F5EDCA',
  200: '#ECD98C',
  300: '#E0C55A',
  400: '#D4AF37',  // primary gold
  500: '#B8952A',
  600: '#9A7A1E',
  700: '#7A5F14',
  800: '#5A4510',
  900: '#3A2C08',
} as const;

// ─── Blacks & grays (cool-neutral) ────────────────────────────────────────────
export const dark = {
  0:    '#000000',
  50:   '#0A0A0A',
  100:  '#0E0E0E',  // bg
  150:  '#121212',  // tabbar
  200:  '#141414',  // surface
  250:  '#161616',  // surface-alt / input bg
  300:  '#1A1A1A',
  400:  '#2A2A2A',  // border
  500:  '#3A3A3A',
  600:  '#5A5A5A',
  700:  '#9A968C',  // text-muted
  800:  '#CFCABD',  // text-secondary
  900:  '#F2EFE8',  // text primary
  1000: '#FFFFFF',
} as const;

// ─── Warm lights (for light theme) ────────────────────────────────────────────
export const warm = {
  50:  '#FAF8F3',  // bg light
  100: '#F2EDE0',
  200: '#E8E0CC',
  300: '#D4C9A8',
  400: '#B8A87C',
  500: '#9A8855',
  600: '#7A6A3A',
  700: '#5A4E28',
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
export const LOGO_THE = '#CDB98A';
/** Gold ring for avatar border */
export const GOLD_RING = gold[400];
/** Gold bg tint (for icon backgrounds, selected states) */
export const GOLD_BG = '#201B0E';
/** Gold border (for chips, cards with gold accent) */
export const GOLD_BORDER = '#5A4A1C';

// ─── Category colors ──────────────────────────────────────────────────────────
export const categoryColors = {
  travel:   '#3B8EEA',
  food:     '#F59E0B',
  sport:    '#22C55E',
  creative: '#A855F7',
  social:   '#EC4899',
  other:    dark[700],
} as const;

// ─── Reactions ────────────────────────────────────────────────────────────────
export const REACTION_EMOJIS = ['🔥', '❤️', '👏', '🎉', '✈️', '🌟'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];
