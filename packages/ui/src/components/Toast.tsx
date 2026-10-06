/**
 * Toast — transient feedback message with optional "Deshacer" action.
 * Usage via ToastContext (wrap app with ToastProvider).
 */
import React, { createContext, useContext, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import { fontFamily, fontSize } from '../tokens/typography';
import { gold, dark } from '../tokens/colors';
import { useTheme } from '../theme/useTheme';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ToastOptions {
  message: string;
  undoLabel?: string;
  onUndo?: () => void;
  duration?: number; // ms, default 3500
}

interface ToastContextType {
  show: (opts: ToastOptions) => void;
  hide: () => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastOptions | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme } = useTheme();

  const hide = useCallback(() => {
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setToast(null));
  }, [opacity]);

  const show = useCallback((opts: ToastOptions) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(opts);
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    timerRef.current = setTimeout(hide, opts.duration ?? 3500);
  }, [hide, opacity]);

  return (
    <ToastContext.Provider value={{ show, hide }}>
      {children}
      {toast ? (
        <Animated.View
          style={[
            styles.toast,
            { backgroundColor: theme.dark ? dark[300] : '#2A2A2A', opacity },
          ]}
          pointerEvents="box-none"
        >
          <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
          {toast.onUndo ? (
            <Pressable onPress={() => { toast.onUndo?.(); hide(); }}>
              <Text style={styles.undo}>{toast.undoLabel ?? 'Deshacer'}</Text>
            </Pressable>
          ) : null}
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 104,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  message: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: fontSize.sm,
    color: '#FFFFFF',
    marginRight: 12,
  },
  undo: {
    fontFamily: fontFamily.semibold,
    fontSize: fontSize.sm,
    color: gold[400],
  },
});
