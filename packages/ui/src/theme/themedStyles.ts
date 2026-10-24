/**
 * themedStyleSheet — StyleSheet.create con conciencia de tema.
 *
 * Los estilos estáticos de la app se escribieron pensando en el modo oscuro
 * (fondos #141414, bordes #2A2A2A, texto #F3EEE3…). En modo claro esos valores
 * se veían negros. En lugar de duplicar cientos de hojas de estilo, este helper
 * traduce cada color "oscuro" a su token equivalente de `lightTheme` cuando el
 * esquema activo es claro. En modo oscuro devuelve los estilos tal cual.
 *
 * Uso: sustituir `StyleSheet.create({...})` por `themedStyleSheet({...})`.
 * Los estilos se resuelven al leer `styles.x` (getter), por lo que reaccionan al
 * cambio de tema en cuanto el componente se vuelve a renderizar.
 *
 * Los scrims (rgba(0,0,0,a)) y los blancos puros usados como texto sobre
 * imágenes/botones se respetan a propósito.
 */
import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { lightTheme } from './light';
import type { ColorScheme } from './types';

let activeScheme: ColorScheme = 'dark';

/** Lo llama ThemeProvider en cada render, antes de renderizar a los hijos. */
export function setActiveColorScheme(scheme: ColorScheme): void {
  activeScheme = scheme;
}

export function getActiveColorScheme(): ColorScheme {
  return activeScheme;
}

// ── Parsing de colores ───────────────────────────────────────────────────────

interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColor(value: string): RGBA | null {
  const v = value.trim().toLowerCase();
  if (v === 'transparent') return null;
  if (v.startsWith('#')) {
    let h = v.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  const m = v.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const p = m[1]!.split(',').map((s) => parseFloat(s.trim()));
    if (p.length >= 3 && p.every((x) => !Number.isNaN(x))) {
      return { r: p[0]!, g: p[1]!, b: p[2]!, a: p.length > 3 ? p[3]! : 1 };
    }
  }
  return null;
}

const luma = ({ r, g, b }: RGBA) => 0.299 * r + 0.587 * g + 0.114 * b;
const spread = ({ r, g, b }: RGBA) => Math.max(r, g, b) - Math.min(r, g, b);
const rgba = (r: number, g: number, b: number, a: number) =>
  `rgba(${r}, ${g}, ${b}, ${Math.round(a * 1000) / 1000})`;

const L = lightTheme.colors;
const FG_RGB = { r: 26, g: 20, b: 16 }; // lightTheme.colors.foreground (#1A1410)

type Kind = 'background' | 'border' | 'text';

function mapToLight(kind: Kind, value: string, keepWhite = false): string {
  const c = parseColor(value);
  if (!c) return value;

  // ── Translúcidos ──────────────────────────────────────────────────────────
  if (c.a < 1) {
    const isBlack = c.r < 20 && c.g < 20 && c.b < 20;
    const isWhite = c.r > 235 && c.g > 235 && c.b > 235;
    if (isBlack) return value; // scrims / sombras: se respetan
    if (isWhite) {
      // Velos blancos sobre fondo oscuro → velo oscuro sobre fondo claro
      if (kind === 'text') return rgba(FG_RGB.r, FG_RGB.g, FG_RGB.b, Math.min(1, c.a + 0.1));
      return rgba(0, 0, 0, Math.max(0.03, c.a * 0.75));
    }
    return value; // acentos (dorado, rojo, verde…) funcionan en ambos temas
  }

  const l = luma(c);
  const sat = spread(c);

  // ── Texto ─────────────────────────────────────────────────────────────────
  if (kind === 'text') {
    if (sat > 40) return value; // acento de color
    if (keepWhite) return value; // texto sobre imágenes, banners o botones de acento: se conserva
    if (l >= 245) return L.foreground; // blanco puro
    if (l >= 200) return L.foreground; // texto principal claro
    if (l >= 110) return L.foregroundMuted; // grises de texto secundario
    return value;
  }

  // ── Fondos y bordes oscuros ───────────────────────────────────────────────
  if (l > 80) return value; // ya es claro / color medio
  if (sat >= 14) {
    // Oscuros con tinte (p. ej. #201B0E dorado, #3A1A00 naranja)
    if (c.r >= c.b + 10 && c.g >= c.b) return kind === 'border' ? '#E6D79A' : '#F5EDCA';
    return value; // azules / verdes / granates profundos: acentos intencionados
  }
  if (kind === 'border') return L.border;
  if (l <= 15) return L.background;
  if (l <= 30) return L.surface;
  if (l <= 48) return L.surfaceSunken;
  return L.secondary;
}

// ── Mapeo de propiedades ─────────────────────────────────────────────────────

const BACKGROUND_PROPS = new Set(['backgroundColor']);
const BORDER_PROPS = new Set([
  'borderColor',
  'borderTopColor',
  'borderBottomColor',
  'borderLeftColor',
  'borderRightColor',
  'borderStartColor',
  'borderEndColor',
]);
const TEXT_PROPS = new Set(['color']);

/** Estilos cuyo texto blanco va sobre botones de color o imágenes (se respeta). */
const KEEP_WHITE_KEY = /(deleteuserbtn|coverchange|coverremove|gallerycardtitle|onimage|overlay|preview)/i;

function mapStyle(style: any, styleKey = ''): any {
  if (!style || typeof style !== 'object' || Array.isArray(style)) return style;
  const out: any = {};
  for (const key of Object.keys(style)) {
    const val = style[key];
    if (typeof val === 'string') {
      if (BACKGROUND_PROPS.has(key)) out[key] = mapToLight('background', val);
      else if (BORDER_PROPS.has(key)) out[key] = mapToLight('border', val);
      else if (TEXT_PROPS.has(key)) out[key] = mapToLight('text', val, KEEP_WHITE_KEY.test(styleKey));
      else out[key] = val;
    } else if (val && typeof val === 'object' && !Array.isArray(val)) {
      out[key] = mapStyle(val, styleKey); // p. ej. transform / shadowOffset
    } else {
      out[key] = val;
    }
  }
  return out;
}

/** Versión pública del mapeo, útil para colores sueltos fuera de una hoja de estilos. */
export function themedColor(
  value: string,
  kind: Kind = 'background',
  scheme: ColorScheme = activeScheme,
): string {
  return scheme === 'light' ? mapToLight(kind, value) : value;
}

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function themedStyleSheet<T extends NamedStyles<T> | NamedStyles<any>>(
  styles: T & NamedStyles<any>,
): T {
  const base = StyleSheet.create(styles as any) as unknown as Record<string, any>;
  const lightCache: Record<string, any> = {};
  const result: Record<string, any> = {};

  for (const key of Object.keys(base)) {
    Object.defineProperty(result, key, {
      enumerable: true,
      get() {
        if (activeScheme !== 'light') return base[key];
        if (!(key in lightCache)) lightCache[key] = mapStyle(styles[key as keyof T], key);
        return lightCache[key];
      },
    });
  }
  return result as T;
}
