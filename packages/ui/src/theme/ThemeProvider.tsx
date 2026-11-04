import React, { createContext, useContext, useCallback } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

import { lightTheme } from './light';
import { darkTheme } from './dark';
import type { Theme, ColorScheme } from './types';
import { setActiveColorScheme } from './themedStyles';

// ─── Context ──────────────────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: Theme;
  colorScheme: ColorScheme;
  /** Manually override the theme (persisted by caller via Zustand/AsyncStorage) */
  setColorScheme: (scheme: ColorScheme | 'system') => void;
}

const defaultThemeValue: ThemeContextValue = {
  theme: darkTheme,
  colorScheme: 'dark',
  setColorScheme: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(defaultThemeValue);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Pass the persisted override from Zustand (undefined = follow system) */
  override?: ColorScheme | 'system';
  onOverrideChange?: (scheme: ColorScheme | 'system') => void;
}

export function ThemeProvider({
  children,
  override = 'system',
  onOverrideChange,
}: ThemeProviderProps) {
  const systemScheme = useSystemColorScheme() ?? 'light';
  const resolved: ColorScheme =
    override === 'system' ? systemScheme : override;
  const theme = resolved === 'dark' ? darkTheme : lightTheme;
  // Sincroniza el esquema para themedStyleSheet antes de renderizar a los hijos.
  setActiveColorScheme(resolved);

  const setColorScheme = useCallback(
    (scheme: ColorScheme | 'system') => {
      onOverrideChange?.(scheme);
    },
    [onOverrideChange],
  );

  return (
    <ThemeContext.Provider value={{ theme, colorScheme: resolved, setColorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return defaultThemeValue;
  }
  return ctx;
}
