import { gold, dark, green, red, amber, blue } from '../tokens/colors';
import type { Theme } from './types';

export const darkTheme: Theme = {
  dark: true,
  colors: {
    // ── Backgrounds ──────────────────────────────────────────────────────
    background:      dark[100],          // #0E0E0E
    surface:         dark[200],          // #141414
    surfaceElevated: dark[250],          // #161616  (modals / input bg)
    surfaceSunken:   dark[50],           // #0A0A0A

    // ── Brand ────────────────────────────────────────────────────────────
    primary:           gold[400],        // #D4AF37
    primaryHover:      gold[300],
    primaryForeground: dark[100],        // black text on gold bg

    secondary:           dark[300],      // #1A1A1A
    secondaryForeground: dark[900],      // #F2EFE8

    // ── Text ─────────────────────────────────────────────────────────────
    foreground:       dark[900],         // #F2EFE8
    foregroundMuted:  dark[800],         // #CFCABD
    foregroundSubtle: dark[700],         // #9A968C

    // ── Borders ──────────────────────────────────────────────────────────
    border:      dark[400],              // #2A2A2A
    borderFocus: gold[400],

    // ── Semantic ─────────────────────────────────────────────────────────
    success:           green[400],
    successForeground: dark[100],
    successBackground: green[900],

    error:           red[500],
    errorForeground: dark[100],
    errorBackground: red[100],

    warning:           amber[500],
    warningForeground: dark[100],
    warningBackground: amber[900],

    info:           blue[500],
    infoForeground: dark[100],
    infoBackground: blue[100],
  },
};
