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
/** Alias with a neutral name for new code. */
export const brand = gold;

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

// ─── Hearts ───────────────────────────────────────────────────────────────────
/** Único color para TODOS los corazones (me gusta) de la app */
export const HEART_COLOR = '#FACC15';

// ─── Visibility (Public / Followers / Private) ─────────────────────────────────
export const VISIBILITY_COLORS = {
  public: '#3B82F6',    // Azul
  followers: '#A855F7', // Morado
  private: '#EF4444',   // Rojo
} as const;

export interface VisibilityColorConfig {
  color: string;
  bg: string;
  border: string;
}

export const getVisibilityColor = (visibility?: string | null, isDark: boolean = true): string => {
  if (visibility === 'private') return isDark ? '#F87171' : '#DC2626';
  if (visibility === 'followers') return isDark ? '#C084FC' : '#9333EA';
  return isDark ? '#60A5FA' : '#2563EB';
};

export const getVisibilityPrimaryColor = (visibility?: string | null): string => {
  if (visibility === 'private') return VISIBILITY_COLORS.private;
  if (visibility === 'followers') return VISIBILITY_COLORS.followers;
  return VISIBILITY_COLORS.public;
};

export const getVisibilityStyle = (visibility?: string | null, isDark: boolean = true): VisibilityColorConfig => {
  const vis = visibility || 'public';
  if (vis === 'private') {
    return {
      color: isDark ? '#F87171' : '#DC2626',
      bg: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(220, 38, 38, 0.10)',
      border: isDark ? 'rgba(239, 68, 68, 0.35)' : 'rgba(220, 38, 38, 0.28)',
    };
  }
  if (vis === 'followers') {
    return {
      color: isDark ? '#C084FC' : '#9333EA',
      bg: isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(147, 51, 234, 0.10)',
      border: isDark ? 'rgba(168, 85, 247, 0.35)' : 'rgba(147, 51, 234, 0.28)',
    };
  }
  return {
    color: isDark ? '#60A5FA' : '#2563EB',
    bg: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(37, 99, 235, 0.10)',
    border: isDark ? 'rgba(59, 130, 246, 0.35)' : 'rgba(37, 99, 235, 0.28)',
  };
};

// ─── Reactions ────────────────────────────────────────────────────────────────
export const REACTION_EMOJIS = ['🔥', '💛', '👏', '🎉', '✈️', '🌟'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];
