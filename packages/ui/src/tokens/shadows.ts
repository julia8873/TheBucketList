import { Platform } from 'react-native';

/**
 * Shadow tokens — platform-aware.
 * On Android: elevation.
 * On iOS/Web: shadow* properties.
 */
export const shadows = {
  none: Platform.select({
    android: { elevation: 0 },
    default: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
    },
  }),
  sm: Platform.select({
    android: { elevation: 2 },
    default: {
      shadowColor: 'hsl(22, 40%, 15%)',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 3,
    },
  }),
  md: Platform.select({
    android: { elevation: 4 },
    default: {
      shadowColor: 'hsl(22, 40%, 15%)',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.10,
      shadowRadius: 8,
    },
  }),
  lg: Platform.select({
    android: { elevation: 8 },
    default: {
      shadowColor: 'hsl(22, 40%, 15%)',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
    },
  }),
} as const;
