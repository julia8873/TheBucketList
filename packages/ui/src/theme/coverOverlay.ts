/**
 * Paleta para tarjetas con imagen/degradado de fondo y texto superpuesto
 * (álbumes, tareas en galería…). En oscuro el texto es blanco sobre un velo negro;
 * en claro el velo es crema (color de superficie) y el texto oscuro, para que
 * la tarjeta no se vea "negra" en modo claro.
 */
import { useTheme } from './useTheme';

export interface CoverOverlay {
  /** Degradado inferior sobre la imagen (de transparente a opaco). */
  fade: [string, string];
  /** Degradado de 3 paradas (cabecera + pie) para tarjetas con texto arriba y abajo. */
  fadeBoth: [string, string, string];
  /** Velos más suaves para tarjetas que mantienen texto BLANCO sobre la imagen (feed). */
  softFade: [string, string];
  softBoth: [string, string, string];
  /** Panel inferior translúcido de las tarjetas de galería. */
  panel: string;
  title: string;
  meta: string;
  /** Pista de barras de progreso. */
  track: string;
  /** Fondo de insignias circulares flotantes (favorito, etc.). */
  floatingBadgeBg: string;
  /** Icono de estrella cuando no es favorito. */
  starIdle: string;
  /** Fondo de pastillas de prioridad. */
  chipBg: string;
  /** Degradados de relleno cuando no hay portada. */
  placeholders: Array<[string, string]>;
}

const DARK: CoverOverlay = {
  fade: ['transparent', 'rgba(0,0,0,0.78)'],
  fadeBoth: ['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.85)'],
  softFade: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.78)'],
  softBoth: ['rgba(0,0,0,0.65)', 'transparent', 'rgba(0,0,0,0.88)'],
  panel: 'rgba(0,0,0,0.72)',
  title: '#FFFFFF',
  meta: 'rgba(255,255,255,0.65)',
  track: 'rgba(255,255,255,0.2)',
  floatingBadgeBg: 'rgba(0,0,0,0.55)',
  starIdle: 'rgba(255,255,255,0.7)',
  chipBg: 'rgba(0,0,0,0.45)',
  placeholders: [
    ['#1B4D3E', '#0A2E25'],
    ['#C87A2B', '#7A3D00'],
    ['#2B5BA8', '#0D2F6E'],
    ['#6B2FA0', '#3A0070'],
  ],
};

const LIGHT: CoverOverlay = {
  fade: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.62)'],
  fadeBoth: ['rgba(0,0,0,0.22)', 'transparent', 'rgba(0,0,0,0.68)'],
  softFade: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)'],
  softBoth: ['rgba(0,0,0,0.18)', 'transparent', 'rgba(0,0,0,0.55)'],
  panel: 'rgba(0,0,0,0.62)',
  title: '#FFFFFF',
  meta: 'rgba(255,255,255,0.80)',
  track: 'rgba(255,255,255,0.25)',
  floatingBadgeBg: 'rgba(255,255,255,0.92)',
  starIdle: 'rgba(255,255,255,0.7)',
  chipBg: 'rgba(255,255,255,0.9)',
  placeholders: [
    ['#7CC4AC', '#3E9A80'],
    ['#F3BE7A', '#DE8B2E'],
    ['#85B1EE', '#4A7FD4'],
    ['#C29BE6', '#9560CB'],
  ],
};

export function getCoverOverlay(isDark: boolean): CoverOverlay {
  return isDark ? DARK : LIGHT;
}

export function useCoverOverlay(): CoverOverlay {
  const { theme } = useTheme();
  return theme.dark ? DARK : LIGHT;
}
