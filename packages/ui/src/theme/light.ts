import { gold, warm, dark, green, red, amber, blue } from '../tokens/colors';
import type { Theme } from './types';

export const lightTheme: Theme = {
  dark: false,
  colors: {
    // ── Backgrounds ──────────────────────────────────────────────────────
    background:      warm[50],           // #FAF8F3
    surface:         dark[1000],         // #FFFFFF
    surfaceElevated: dark[1000],
    surfaceSunken:   warm[100],

    // ── Brand ────────────────────────────────────────────────────────────
    primary:           gold[500],        // darkened gold for AA contrast on light bg
    primaryHover:      gold[600],
    primaryForeground: dark[1000],

    secondary:           warm[200],
    secondaryForeground: warm[700],

    // ── Text ─────────────────────────────────────────────────────────────
    foreground:       '#1A1410',         // very dark warm
    foregroundMuted:  warm[600],
    foregroundSubtle: warm[500],

    // ── Borders ──────────────────────────────────────────────────────────
    border:      warm[200],
    borderFocus: gold[500],

    // ── Semantic ─────────────────────────────────────────────────────────
    success:           green[500],
    successForeground: dark[1000],
    successBackground: green[100],

    error:           red[500],
    errorForeground: dark[1000],
    errorBackground: 'hsl(4,80%,93%)',

    warning:           amber[500],
    warningForeground: dark[50],
    warningBackground: 'hsl(35,96%,90%)',

    info:           blue[500],
    infoForeground: dark[1000],
    infoBackground: 'hsl(210,72%,90%)',
  },
};
