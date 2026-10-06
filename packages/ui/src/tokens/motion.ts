/** Animation duration tokens (ms) */
export const duration = {
  instant: 0,
  fast:    150,
  base:    250,
  slow:    400,
  slower:  600,
} as const;

/**
 * Easing functions for Reanimated / CSS transitions.
 * Use with Easing from react-native or 'css-string' variants for web.
 */
export const easing = {
  /** Standard: gentle acceleration then deceleration */
  ease: 'ease',
  /** Enter: starts fast, decelerates */
  easeOut: 'ease-out',
  /** Exit: starts slow, accelerates */
  easeIn: 'ease-in',
  /** Emphasized: cubic-bezier for material-style emphasis */
  emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
  /** Spring-like: slight overshoot */
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

/**
 * Reanimated-compatible easing values (numeric Bezier arrays).
 * Import these when using withTiming() in Reanimated.
 */
export const easingBezier = {
  ease:      [0.25, 0.1, 0.25, 1.0] as [number, number, number, number],
  easeOut:   [0.0,  0.0, 0.2, 1.0]  as [number, number, number, number],
  easeIn:    [0.4,  0.0, 1.0, 1.0]  as [number, number, number, number],
  emphasized:[0.2,  0.0, 0.0, 1.0]  as [number, number, number, number],
  spring:    [0.34, 1.56, 0.64, 1.0] as [number, number, number, number],
} as const;

/** Celebrate animation — subtle scale + glow (NOT confetti) */
export const celebrate = {
  scalePeak: 1.04,
  duration:  300,
  easing: easingBezier.spring,
} as const;
