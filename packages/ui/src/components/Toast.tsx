/**
 * Toast — transient feedback message with optional "Deshacer" action.
 * Styled to match the application's signature dark luxury aesthetic (ConfirmDialog).
 * Usage via useToast() or global toast helper.
 */
import React, { createContext, useContext, useRef, useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  Platform,
  Keyboard,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { Check, AlertCircle, Info, X } from 'lucide-react-native';
import { fontFamily, fontSize } from '../tokens/typography';
import { gold, dark } from '../tokens/colors';
import { useTheme } from '../theme/useTheme';

// En iOS las pantallas con `presentation: 'modal'` son controladores nativos que tapan todo
// lo dibujado en la raíz de la app (el toast quedaba oculto detrás). FullWindowOverlay lo
// dibuja por encima de ellos. Se carga de forma opcional para no romper en web/Android.
let FullWindowOverlay: React.ComponentType<any> | null = null;
if (Platform.OS === 'ios') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    FullWindowOverlay = require('react-native-screens').FullWindowOverlay ?? null;
  } catch {
    FullWindowOverlay = null;
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ToastOptions {
  message: string;
  title?: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  undoLabel?: string;
  onUndo?: () => void;
  duration?: number; // ms, default 3500
  position?: 'bottom' | 'top';
}

export interface ToastContextType {
  show: (opts: ToastOptions) => void;
  hide: () => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

// ── Global Helper ──────────────────────────────────────────────────────────────

let globalToast: ToastContextType | null = null;

export const toast = {
  show: (opts: ToastOptions) => globalToast?.show(opts),
  success: (message: string, title?: string) => globalToast?.success(message, title),
  error: (message: string, title?: string) => globalToast?.error(message, title),
  info: (message: string, title?: string) => globalToast?.info(message, title),
  hide: () => globalToast?.hide(),
};

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [currentToast, setCurrentToast] = useState<ToastOptions | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { theme } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Con el teclado abierto un toast abajo quedaría tapado: lo subimos arriba.
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const a = Keyboard.addListener(showEvt, () => setKeyboardVisible(true));
    const b = Keyboard.addListener(hideEvt, () => setKeyboardVisible(false));
    return () => {
      a.remove();
      b.remove();
    };
  }, []);

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 12,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => setCurrentToast(null));
  }, [opacity, translateY]);

  const show = useCallback((opts: ToastOptions) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setCurrentToast(opts);
    opacity.setValue(0);
    translateY.setValue(20);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }),
    ]).start();

    timerRef.current = setTimeout(hide, opts.duration ?? 3500);
  }, [hide, opacity, translateY]);

  const success = useCallback((message: string, title?: string) => {
    show({ message, title, type: 'success' });
  }, [show]);

  const error = useCallback((message: string, title?: string) => {
    show({ message, title, type: 'error' });
  }, [show]);

  const info = useCallback((message: string, title?: string) => {
    show({ message, title, type: 'info' });
  }, [show]);

  useEffect(() => {
    globalToast = { show, hide, success, error, info };
    return () => {
      if (globalToast?.show === show) globalToast = null;
    };
  }, [show, hide, success, error, info]);

  const type = currentToast?.type ?? 'success';
  const atTop = currentToast?.position === 'top' || keyboardVisible;
  const topOffset = Platform.OS === 'ios' ? 64 : (StatusBar.currentHeight ?? 24) + 16;
  // Ancho explícito (nunca colapsa a 0 aunque el contenedor padre no tenga tamaño).
  // En web limitamos a 420 px para que no ocupe toda la pantalla del navegador.
  const maxToastWidth = Platform.OS === 'web' ? 420 : windowWidth - 32;
  const toastWidth = Math.min(maxToastWidth, Math.max(240, windowWidth - 32));

  // En web centramos el toast horizontalmente.
  const webLeftOffset = Platform.OS === 'web' ? Math.max(16, (windowWidth - toastWidth) / 2) : 16;

  const toastView = currentToast ? (
        <Animated.View
          style={[
            styles.toast,
            atTop ? { top: topOffset, bottom: undefined } : null,
            {
              width: toastWidth,
              left: webLeftOffset,
              right: undefined,
              backgroundColor: theme.colors.surfaceElevated,
              shadowOpacity: theme.dark ? 0.45 : 0.16,
              borderColor:
                type === 'error'
                  ? 'rgba(239, 68, 68, 0.45)'
                  : type === 'warning'
                  ? 'rgba(245, 158, 11, 0.45)'
                  : 'rgba(212, 177, 58, 0.4)',
              opacity,
              transform: [{ translateY }],
            },
          ]}
          pointerEvents="box-none"
        >
          {/* Badge de icono temático */}
          <View
            style={[
              styles.iconBadge,
              type === 'error'
                ? styles.iconBadgeError
                : type === 'warning'
                ? styles.iconBadgeWarning
                : styles.iconBadgeSuccess,
            ]}
          >
            {type === 'error' ? (
              <AlertCircle size={17} color="#EF4444" strokeWidth={2.4} />
            ) : type === 'warning' ? (
              <AlertCircle size={17} color="#F59E0B" strokeWidth={2.4} />
            ) : type === 'info' ? (
              <Info size={17} color={gold[400]} strokeWidth={2.4} />
            ) : (
              <Check size={17} color={gold[400]} strokeWidth={2.8} />
            )}
          </View>

          {/* Contenido de texto */}
          <View style={styles.textContainer}>
            {currentToast.title ? (
              <Text style={[styles.title, { color: theme.colors.foreground }]} numberOfLines={1}>
                {currentToast.title}
              </Text>
            ) : null}
            <Text
              style={[
                styles.message,
                { color: theme.colors.foreground },
                currentToast.title ? { marginTop: 2 } : null,
              ]}
              numberOfLines={3}
            >
              {currentToast.message}
            </Text>
          </View>

          {/* Botón de acción / Deshacer */}
          {currentToast.onUndo ? (
            <Pressable
              onPress={() => {
                currentToast.onUndo?.();
                hide();
              }}
              style={styles.undoBtn}
              accessibilityRole="button"
              accessibilityLabel={currentToast.undoLabel ?? 'Deshacer'}
            >
              <Text style={styles.undoText}>{currentToast.undoLabel ?? 'Deshacer'}</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={hide}
              hitSlop={10}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Cerrar notificación"
            >
              <X size={16} color={theme.colors.foregroundMuted} strokeWidth={2.2} />
            </Pressable>
          )}
        </Animated.View>
  ) : null;

  const overlay = toastView ? (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {toastView}
    </View>
  ) : null;

  return (
    <ToastContext.Provider value={{ show, hide, success, error, info }}>
      {children}
      {overlay && FullWindowOverlay ? (
        <FullWindowOverlay style={StyleSheet.absoluteFill}>{overlay}</FullWindowOverlay>
      ) : (
        overlay
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 96,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1.5,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 14,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconBadgeSuccess: {
    backgroundColor: 'rgba(212, 177, 58, 0.15)',
    borderColor: '#D4B13A',
  },
  iconBadgeError: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
  },
  iconBadgeWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontFamily: fontFamily.serifBold,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  message: {
    fontFamily: fontFamily.medium,
    fontSize: 13.5,
    lineHeight: 18,
  },
  undoBtn: {
    backgroundColor: gold[400],
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoText: {
    fontFamily: fontFamily.bold,
    fontSize: 12.5,
    color: '#0E0E0E',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
