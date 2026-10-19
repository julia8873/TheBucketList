import type { ImageSourcePropType } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import {
  UtensilsCrossed,
  Car,
  Plane,
  Waves,
  Mountain,
  Dumbbell,
  Music,
  Palette,
  PartyPopper,
  Gamepad2,
  Coffee,
  TreePine,
} from 'lucide-react-native';

/**
 * Portadas por defecto de una tarea.
 *
 * Valores posibles de `buckets.cover_image`:
 *   - `preset:<key>`  → una de las portadas de este fichero
 *   - ruta de storage → foto propia subida por el usuario
 *   - null            → portada automática (ver `autoCoverPreset`)
 */

export const COVER_PRESET_PREFIX = 'preset:';

export type CoverPresetGroup = 'themes' | 'gradients';

export interface CoverPreset {
  key: string;
  label: string;
  group: CoverPresetGroup;
  colors: [string, string, string];
  lightColors?: [string, string, string];
  icon?: LucideIcon;
  image?: ImageSourcePropType;
}

export const COVER_PRESETS: CoverPreset[] = [
  // ── Temas ─────────────────────────────────────────────────────────────────
  { key: 'restaurant', label: 'Restaurante', group: 'themes', colors: ['#3B0D04', '#B45309', '#F59E0B'], lightColors: ['#9A3412', '#C2410C', '#F59E0B'], icon: UtensilsCrossed },
  { key: 'cars',       label: 'Coches',      group: 'themes', colors: ['#0B1120', '#1E3A8A', '#DC2626'], lightColors: ['#1E40AF', '#2563EB', '#DC2626'], icon: Car },
  { key: 'travel',     label: 'Viajes',      group: 'themes', colors: ['#0C4A6E', '#0EA5E9', '#FDE68A'], lightColors: ['#0369A1', '#0EA5E9', '#F59E0B'], icon: Plane },
  { key: 'beach',      label: 'Playa',       group: 'themes', colors: ['#115E59', '#22D3EE', '#FDE68A'], lightColors: ['#0F766E', '#0D9488', '#F59E0B'], icon: Waves },
  { key: 'mountain',   label: 'Montaña',     group: 'themes', colors: ['#0F172A', '#334155', '#94A3B8'], lightColors: ['#334155', '#475569', '#94A3B8'], icon: Mountain },
  { key: 'nature',     label: 'Naturaleza',  group: 'themes', colors: ['#052E16', '#15803D', '#BEF264'], lightColors: ['#166534', '#15803D', '#65A30D'], icon: TreePine },
  { key: 'sport',      label: 'Deporte',     group: 'themes', colors: ['#022C22', '#059669', '#A7F3D0'], lightColors: ['#065F46', '#059669', '#10B981'], icon: Dumbbell },
  { key: 'music',      label: 'Música',      group: 'themes', colors: ['#2E1065', '#7E22CE', '#F472B6'], lightColors: ['#6B21A8', '#9333EA', '#EC4899'], icon: Music },
  { key: 'art',        label: 'Arte',        group: 'themes', colors: ['#312E81', '#A855F7', '#FBBF24'], lightColors: ['#3730A3', '#7C3AED', '#F59E0B'], icon: Palette },
  { key: 'party',      label: 'Fiesta',      group: 'themes', colors: ['#500724', '#DB2777', '#FCD34D'], lightColors: ['#831843', '#DB2777', '#F59E0B'], icon: PartyPopper },
  { key: 'gaming',     label: 'Videojuegos', group: 'themes', colors: ['#0B1026', '#4F46E5', '#22D3EE'], lightColors: ['#312E81', '#4F46E5', '#06B6D4'], icon: Gamepad2 },
  { key: 'coffee',     label: 'Café',        group: 'themes', colors: ['#1C0F05', '#78350F', '#D97706'], lightColors: ['#713F12', '#9A3412', '#D97706'], icon: Coffee },

  // ── Degradados ────────────────────────────────────────────────────────────
  { key: 'sunset',   label: 'Atardecer',   group: 'gradients', colors: ['#F97316', '#DB2777', '#4C1D95'], lightColors: ['#EA580C', '#E11D48', '#7C3AED'] },
  { key: 'ocean',    label: 'Océano',      group: 'gradients', colors: ['#0F172A', '#0369A1', '#22D3EE'], lightColors: ['#026AA7', '#0284C7', '#06B6D4'] },
  { key: 'forest',   label: 'Bosque',      group: 'gradients', colors: ['#052E16', '#15803D', '#BEF264'], lightColors: ['#166534', '#15803D', '#65A30D'] },
  { key: 'aurora',   label: 'Aurora',      group: 'gradients', colors: ['#0F172A', '#059669', '#7C3AED'], lightColors: ['#047857', '#059669', '#7C3AED'] },
  { key: 'gold',     label: 'Dorado',      group: 'gradients', colors: ['#1A1204', '#7A5F14', '#D4AF37'], lightColors: ['#B45309', '#D97706', '#EAB308'] },
  { key: 'midnight', label: 'Medianoche',  group: 'gradients', colors: ['#000000', '#1E1B4B', '#4338CA'], lightColors: ['#1E3A8A', '#3730A3', '#6B21A8'] },
  { key: 'rose',     label: 'Rosa',        group: 'gradients', colors: ['#4C0519', '#BE123C', '#FDA4AF'], lightColors: ['#BE123C', '#E11D48', '#FB7185'] },
];

export const THEME_PRESETS = COVER_PRESETS.filter((p) => p.group === 'themes');
export const GRADIENT_PRESETS = COVER_PRESETS.filter((p) => p.group === 'gradients');

export function getPresetByKey(key: string | null | undefined): CoverPreset | undefined {
  if (!key) return undefined;
  return COVER_PRESETS.find((p) => p.key === key);
}

/** Devuelve la clave del preset si el valor es `preset:<key>`, o null. */
export function presetKeyFromValue(value: string | null | undefined): string | null {
  if (!value || !value.startsWith(COVER_PRESET_PREFIX)) return null;
  return value.slice(COVER_PRESET_PREFIX.length);
}

export function presetValue(key: string): string {
  return `${COVER_PRESET_PREFIX}${key}`;
}

// ── Portada automática ───────────────────────────────────────────────────────

const normalize = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const KEYWORDS: Array<[RegExp, string]> = [
  [/restaurante|cenar|cena |comer|sushi|cocin|tapas|michelin|pizza|paella|gastro/, 'restaurant'],
  [/coche|conducir|carrera|formula|circuito|moto |motos|automovil|ferrari|porsche/, 'cars'],
  [/playa|surf|bucear|buceo|snorkel|isla|caribe|crucero/, 'beach'],
  [/viaj|avion|vuelo|visitar|recorrer|ruta|tokyo|japon|paris|roma|nueva york/, 'travel'],
  [/montan|escalar|senderismo|everest|cumbre|trekking|camino de/, 'mountain'],
  [/bosque|acampar|camping|naturaleza|parque nacional|safari/, 'nature'],
  [/maraton|correr|gimnasio|futbol|baloncesto|tenis|ironman|nadar|triatlon|ciclismo/, 'sport'],
  [/concierto|festival|musica|cantar|guitarra|piano|banda/, 'music'],
  [/pintar|dibujar|museo|exposicion|escribir|novela|fotograf|teatro/, 'art'],
  [/fiesta|cumple|boda|celebrar|baile|bailar/, 'party'],
  [/videojuego|gaming|consola|torneo|playstation|nintendo/, 'gaming'],
  [/cafe|cafeteria|barista/, 'coffee'],
];

const CATEGORY_PRESET: Record<string, string> = {
  food: 'restaurant',
  travel: 'travel',
  sport: 'sport',
  creative: 'art',
  social: 'party',
};

function hash(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Elige una portada por defecto cuando la tarea no tiene ninguna:
 * 1) palabras clave del título, 2) categoría, 3) un degradado estable por tarea.
 */
export function autoCoverPreset(opts: {
  title?: string | null;
  categorySlug?: string | null;
  seed?: string | null;
}): CoverPreset {
  if (opts.title) {
    const t = normalize(opts.title);
    for (const [regex, key] of KEYWORDS) {
      if (regex.test(t)) {
        const preset = getPresetByKey(key);
        if (preset) return preset;
      }
    }
  }

  const byCategory = opts.categorySlug ? getPresetByKey(CATEGORY_PRESET[opts.categorySlug]) : undefined;
  if (byCategory) return byCategory;

  const fallback = GRADIENT_PRESETS[hash(opts.seed || opts.title || 'bucket') % GRADIENT_PRESETS.length];
  return fallback ?? GRADIENT_PRESETS[0]!;
}