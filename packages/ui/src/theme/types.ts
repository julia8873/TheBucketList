/**
 * Theme type definitions.
 * Every screen and component MUST consume colors from Theme,
 * never from the raw token palette directly.
 */

export interface ThemeColors {
  // ── Backgrounds ─────────────────────────────────────────────────
  background:       string; // main screen background
  surface:          string; // card / sheet surface
  surfaceElevated:  string; // modals, popovers (slightly higher)
  surfaceSunken:    string; // input backgrounds

  // ── Primary brand ────────────────────────────────────────────────
  primary:            string;
  primaryHover:       string; // pressed/hovered state
  primaryForeground:  string; // text/icon on primary

  // ── Secondary ────────────────────────────────────────────────────
  secondary:           string;
  secondaryForeground: string;

  // ── Text ─────────────────────────────────────────────────────────
  foreground:        string; // primary text
  foregroundMuted:   string; // secondary text, placeholders
  foregroundSubtle:  string; // tertiary text, disabled

  // ── Borders & dividers ───────────────────────────────────────────
  border:        string;
  borderFocus:   string; // input focus ring

  // ── Semantic ─────────────────────────────────────────────────────
  success:            string;
  successForeground:  string;
  successBackground:  string;
  error:              string;
  errorForeground:    string;
  errorBackground:    string;
  warning:            string;
  warningForeground:  string;
  warningBackground:  string;
  info:               string;
  infoForeground:     string;
  infoBackground:     string;
}

export interface Theme {
  colors: ThemeColors;
  /** Resolved color scheme for React Navigation / status bar */
  dark: boolean;
}

export type ColorScheme = 'light' | 'dark';
