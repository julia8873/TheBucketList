/**
 * Typography tokens
 * Headings: Playfair Display 600/700 (serif, editorial)
 * Body/UI:  Inter 400/500/600 (sans-serif, clean)
 */

export const fontFamily = {
  // Sans-serif (Inter)
  regular:  'Inter_400Regular',
  medium:   'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold:     'Inter_700Bold',
  // Serif (Playfair Display)
  serif:         'PlayfairDisplay_600SemiBold',
  serifBold:     'PlayfairDisplay_700Bold',
} as const;

/** Font size scale */
export const fontSize = {
  xs:    11,
  sm:    13,
  base:  15,
  lg:    17,
  xl:    20,
  '2xl': 24,
  '3xl': 28,   // screen titles (Playfair)
  '4xl': 34,
} as const;

/** Line height scale */
export const lineHeight = {
  xs:    16,
  sm:    20,
  base:  24,
  lg:    28,
  xl:    32,
  '2xl': 36,
  '3xl': 40,
  '4xl': 48,
} as const;

/** Letter spacing */
export const letterSpacing = {
  tight:   -0.3,
  normal:   0,
  wide:     0.3,
  wider:    0.5,
  widest:   1.5,   // section labels uppercase
} as const;

/** Predefined text styles */
export const textStyles = {
  /** Screen titles — Playfair 700, 28px */
  h1: {
    fontFamily: fontFamily.serifBold,
    fontSize: fontSize['3xl'],
    lineHeight: lineHeight['3xl'],
    letterSpacing: letterSpacing.tight,
  },
  /** Card/section titles — Playfair 600, 24px */
  h2: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize['2xl'],
    lineHeight: lineHeight['2xl'],
    letterSpacing: letterSpacing.tight,
  },
  /** Sub-titles — Playfair 600, 20px */
  h3: {
    fontFamily: fontFamily.serif,
    fontSize: fontSize.xl,
    lineHeight: lineHeight.xl,
    letterSpacing: letterSpacing.tight,
  },
  /** Small headings — Inter 600, 17px */
  h4: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.lg,
    lineHeight: lineHeight.lg,
    letterSpacing: letterSpacing.normal,
  },
  /** Body text — Inter 400, 15px */
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    letterSpacing: letterSpacing.normal,
  },
  bodyMedium: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    letterSpacing: letterSpacing.normal,
  },
  bodySemibold: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.base,
    lineHeight: lineHeight.base,
    letterSpacing: letterSpacing.normal,
  },
  /** Small body — Inter 400, 13px */
  sm: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    letterSpacing: letterSpacing.normal,
  },
  smMedium: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    letterSpacing: letterSpacing.normal,
  },
  /** Caption / metadata — Inter 400, 11px */
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.xs,
    lineHeight: lineHeight.xs,
    letterSpacing: letterSpacing.wide,
  },
  /** Section label key — Playfair 700, 13px UPPERCASE */
  label: {
    fontFamily: fontFamily.serifBold,
    fontSize: fontSize.sm,
    lineHeight: lineHeight.sm,
    letterSpacing: letterSpacing.widest,
    textTransform: 'uppercase' as const,
  },
} as const;
