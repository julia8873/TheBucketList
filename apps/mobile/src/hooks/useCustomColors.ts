import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_SAVED_COLORS = '@bucketlist_saved_custom_colors';

// In-memory cache + listeners for instant synchronization across all components
let memorySavedColors: string[] = [];
let hasLoadedFromStorage = false;
const listeners = new Set<(colors: string[]) => void>();

function notifyListeners() {
  listeners.forEach((listener) => listener(memorySavedColors));
}

/**
 * Normaliza un código de color a formato #RRGGBB en mayúsculas.
 */
export function normalizeHexColor(input: string): string | null {
  if (!input) return null;
  let clean = input.replace('#', '').trim().toUpperCase();
  if (clean.length === 3) {
    clean = clean.split('').map((char) => char + char).join('');
  }
  if (!/^[0-9A-F]{6}$/.test(clean)) return null;
  return `#${clean}`;
}

/**
 * Hook para gestionar y persistir los colores personalizados del usuario en local.
 */
export function useCustomColors() {
  const [savedColors, setSavedColors] = useState<string[]>(memorySavedColors);

  useEffect(() => {
    const listener = (newColors: string[]) => setSavedColors(newColors);
    listeners.add(listener);

    if (!hasLoadedFromStorage) {
      hasLoadedFromStorage = true;
      AsyncStorage.getItem(STORAGE_SAVED_COLORS)
        .then((raw) => {
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed) && parsed.length > 0) {
                memorySavedColors = parsed;
                notifyListeners();
              }
            } catch {}
          }
        })
        .catch(() => undefined);
    } else {
      setSavedColors(memorySavedColors);
    }

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const addCustomColor = useCallback(async (newColor: string): Promise<string[]> => {
    const normalized = normalizeHexColor(newColor);
    if (!normalized) return memorySavedColors;

    const next = [normalized, ...memorySavedColors.filter((c) => c.toUpperCase() !== normalized)].slice(0, 24);
    memorySavedColors = next;
    notifyListeners();
    try {
      await AsyncStorage.setItem(STORAGE_SAVED_COLORS, JSON.stringify(next));
    } catch {}
    return next;
  }, []);

  const removeCustomColor = useCallback(async (colorToRemove: string): Promise<string[]> => {
    const normalized = normalizeHexColor(colorToRemove);
    if (!normalized) return memorySavedColors;

    const next = memorySavedColors.filter((c) => c.toUpperCase() !== normalized);
    memorySavedColors = next;
    notifyListeners();
    try {
      await AsyncStorage.setItem(STORAGE_SAVED_COLORS, JSON.stringify(next));
    } catch {}
    return next;
  }, []);

  return { savedColors, addCustomColor, removeCustomColor };
}
