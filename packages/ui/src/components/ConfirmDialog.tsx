/**
 * ConfirmDialog, ConfirmProvider y Alert
 * Diálogo de confirmación con la estética de la app (mismo estilo que cerrar sesión /
 * eliminar cuenta en Ajustes). Respeta modo claro y oscuro a través del tema.
 *
 * Uso:
 *   - `await confirm.ask({...})`            → confirmación sí/no
 *   - `confirm.show({ actions: [...] })`    → diálogo con botones personalizados
 *   - `Alert.alert(title, msg, buttons?)`   → sustituto de Alert de React Native (mismo diálogo)
 */
import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  Keyboard,
  Platform,
  ScrollView,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { Check, AlertCircle, Info, ShieldAlert } from 'lucide-react-native';
import { fontFamily } from '../tokens/typography';
import { useTheme } from '../theme/useTheme';

export type DialogTone = 'default' | 'success' | 'error' | 'warning' | 'info';

/** Botón personalizado (equivalente a los botones de Alert.alert de React Native). */
export interface ConfirmAction {
  label: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  requireText?: string;
  loading?: boolean;
  /** Si se indica, sustituye a los botones Confirmar/Cancelar por esta lista. */
  actions?: ConfirmAction[];
  /** Muestra un icono acorde al tono (misma estética que los toasts). */
  tone?: DialogTone;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface DialogProps extends ConfirmOptions {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Se invoca al pulsar un botón de `actions` que no es de cancelar. */
  onAction?: (action: ConfirmAction) => void;
  /**
   * Dibuja el diálogo como una capa a pantalla completa en la propia jerarquía de la app
   * en lugar de usar el `Modal` nativo. En Android el `Modal` recién montado podía medirse
   * con tamaño 0 (diálogo arriba a la izquierda, sin texto). Solo para diálogos globales
   * (ConfirmProvider), que se montan en la raíz de la app.
   */
  inline?: boolean;
}

export interface ConfirmContextType {
  show: (opts: ConfirmOptions) => void;
  ask: (opts: ConfirmOptions) => Promise<boolean>;
  hide: () => void;
}

// ── Compatibilidad con Alert.alert de React Native ─────────────────────────────

export interface AlertButton {
  text?: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

function inferTone(title: string): DialogTone {
  const t = title.toLowerCase();
  if (/error|no se pudo|no se pudieron|no se encontr|fall|inválid|invalid/.test(t)) return 'error';
  if (/éxito|exito|activadas|enviada|subidas|copiada|convertida|guardad|cancelada/.test(t)) return 'success';
  if (/atenci|aviso|falta|obligatori|requerid|permiso|revisa|no permitida|necesari/.test(t)) return 'warning';
  return 'info';
}

// ── Global Helper ──────────────────────────────────────────────────────────────

let globalConfirm: ConfirmContextType | null = null;

export const confirm = {
  show: (opts: ConfirmOptions) => globalConfirm?.show(opts),
  ask: (opts: ConfirmOptions): Promise<boolean> =>
    globalConfirm ? globalConfirm.ask(opts) : Promise.resolve(false),
  hide: () => globalConfirm?.hide(),
};

/**
 * Sustituto directo de `Alert` de React Native: misma firma
 * `Alert.alert(title, message?, buttons?)`, pero dibujado con el diálogo propio de la app
 * (colores del tema, tipografía y botones redondeados) en lugar del cuadro nativo del sistema.
 */
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[], _options?: unknown): void {
    const list = buttons && buttons.length > 0 ? buttons : [{ text: 'Aceptar' } as AlertButton];
    const actions: ConfirmAction[] = list.map((b) => ({
      label: b.text ?? 'Aceptar',
      style: b.style ?? 'default',
      onPress: b.onPress,
    }));
    const hasDestructive = actions.some((a) => a.style === 'destructive');
    globalConfirm?.show({
      title,
      message,
      actions,
      tone: hasDestructive ? 'warning' : actions.length > 1 ? 'default' : inferTone(title),
    });
  },
};

// ── Context ───────────────────────────────────────────────────────────────────

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx;
}

// ── Standalone Component ───────────────────────────────────────────────────────

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  requireText,
  loading = false,
  actions,
  tone = 'default',
  onConfirm,
  onCancel,
  onAction,
  inline = false,
}: DialogProps) {
  const { theme } = useTheme();
  const dims = useWindowDimensions();
  // En Android un Modal recién montado puede medirse con 0 px; en ese caso usamos las
  // dimensiones reales de la pantalla para que el diálogo nunca colapse arriba a la izquierda.
  const screen = Dimensions.get('window');
  const windowWidth = dims.width > 0 ? dims.width : screen.width;
  const windowHeight = dims.height > 0 ? dims.height : screen.height;
  // Ancho explícito en píxeles: con `width: '100%'` dentro de un Modal el cuadro podía
  // colapsar a ~0 px y solo se veían sus dos bordes laterales ("dos rayas verticales").
  // En pantallas muy pequeñas usamos el máximo espacio disponible menos un margen mínimo de 16px.
  const hPadding = Math.max(16, Math.min(24, (windowWidth - 260) / 2));
  const dialogWidth = Math.max(260, Math.min(380, windowWidth - hPadding * 2));
  // Los botones siempre se apilan en vertical (uno encima de otro) y ocupan todo el ancho del diálogo:
  // así caben y se ven bien en cualquier tamaño de pantalla, con cualquier longitud de texto.
  const shouldStackButtons = true;
  // Altura del teclado (si lo hay). Con el teclado abierto la ventana del Modal es MÁS PEQUEÑA que
  // la pantalla, así que centramos el diálogo en el área libre y no en la pantalla completa.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    if (!visible) return;
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates?.height ?? 0));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);
  // Área sobre la que se centra el diálogo. Se usa SIEMPRE como tamaño mínimo de la capa de fondo:
  // si Android mide el Modal recién montado con 0 px, la capa conserva igualmente el tamaño de la
  // pantalla y el diálogo queda centrado (antes se quedaba arriba a la izquierda y con los botones
  // fuera de su caja).
  const availableWidth = windowWidth;
  const availableHeight = Math.max(160, windowHeight - keyboardHeight);
  const [text, setText] = useState('');
  const ok = !requireText || text.trim().toUpperCase() === requireText.toUpperCase();

  useEffect(() => {
    if (!visible) {
      setText('');
      return;
    }
    // Si había un teclado abierto (p. ej. un campo de texto de la pantalla de atrás),
    // lo cerramos para que no tape ni desplace el diálogo.
    Keyboard.dismiss();
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onCancel();
      return true;
    });
    return () => sub.remove();
  }, [visible, onCancel]);

  const toneColor =
    tone === 'error'
      ? theme.colors.error
      : tone === 'warning'
        ? theme.colors.warning
        : tone === 'info' || tone === 'success'
          ? theme.colors.primary
          : null;
  const ToneIcon =
    tone === 'error' ? AlertCircle : tone === 'warning' ? ShieldAlert : tone === 'info' ? Info : Check;
  const stacked = !!actions && actions.length > 0 && shouldStackButtons;
  // Los botones confirmar/cancelar también se apilan en pantallas pequeñas
  const stackDefaultButtons = !actions && shouldStackButtons;

  const body = (
    <View
      collapsable={false}
      style={[
        styles.backdrop,
        inline ? styles.inlineBackdrop : null,
        // Tamaño mínimo garantizado: el diálogo siempre se centra en el área visible.
        { minWidth: availableWidth, minHeight: availableHeight },
        { paddingHorizontal: hPadding },
      ]}
    >
      {/* Fondo semitransparente como hermano independiente: captura toques fuera sin interferir con los botones interiores */}
      <Pressable
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(26,20,16,0.45)' },
        ]}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel={cancelLabel}
      />
      <View
        collapsable={false}
        style={[
          styles.dialog,
          {
            width: dialogWidth,
            maxHeight: Math.max(160, availableHeight - 48),
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {toneColor ? (
          <View
            style={[
              styles.toneBadge,
              { borderColor: toneColor, backgroundColor: theme.colors.surfaceSunken },
            ]}
          >
            <ToneIcon size={20} color={toneColor} strokeWidth={2.4} />
          </View>
        ) : null}

          <Text style={[styles.dialogTitle, { color: theme.colors.foreground }]}>{title}</Text>
          {message ? (
            <ScrollView
              style={{ flexGrow: 0, flexShrink: 1 }}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <Text style={[styles.dialogMsg, { color: theme.colors.foregroundMuted }]}>
                {message}
              </Text>
            </ScrollView>
          ) : null}

          {requireText ? (
            <TextInput
              value={text}
              onChangeText={setText}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={requireText}
              placeholderTextColor={theme.colors.foregroundSubtle}
              style={[
                styles.dialogInput,
                {
                  color: theme.colors.foreground,
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surfaceSunken,
                },
              ]}
            />
          ) : null}

          {actions && actions.length > 0 ? (
            <View style={[styles.dialogActions, stacked && styles.dialogActionsStacked]}>
              {/* En vertical: primero las acciones principales y al final «Cancelar» */}
              {[...actions.filter((a) => a.style !== 'cancel'), ...actions.filter((a) => a.style === 'cancel')].map((action, idx) => {
                const isCancel = action.style === 'cancel';
                const isDestructive = action.style === 'destructive';
                return (
                  <Pressable
                    key={`${action.label}-${idx}`}
                    unstable_pressDelay={0}
                    hitSlop={8}
                    onPress={() => (isCancel ? onCancel() : onAction?.(action))}
                    style={[
                      styles.dialogBtn,
                      stacked ? styles.dialogBtnStacked : null,
                      isCancel
                        ? {
                            borderColor: theme.colors.border,
                            backgroundColor: theme.colors.surfaceSunken,
                          }
                        : {
                            backgroundColor: isDestructive ? theme.colors.error : theme.colors.primary,
                            borderColor: 'transparent',
                          },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={action.label}
                  >
                    <Text
                      style={[
                        styles.dialogBtnText,
                        {
                          color: isCancel
                            ? theme.colors.foreground
                            : isDestructive
                              ? theme.colors.errorForeground
                              : theme.colors.primaryForeground,
                        },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={[styles.dialogActions, stackDefaultButtons && styles.dialogActionsStacked]}>
              {/* En modo apilado el botón de confirmar va primero (más prominente) */}
              {stackDefaultButtons ? (
                <>
                  <Pressable
                    unstable_pressDelay={0}
                    hitSlop={8}
                    onPress={() => {
                      if (ok && !loading) onConfirm();
                    }}
                    disabled={!ok || loading}
                    style={[
                      styles.dialogBtn,
                      styles.dialogBtnStacked,
                      {
                        backgroundColor: destructive ? theme.colors.error : theme.colors.primary,
                        borderColor: 'transparent',
                        opacity: ok ? 1 : 0.4,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={confirmLabel}
                  >
                    {loading ? (
                      <ActivityIndicator
                        color={destructive ? theme.colors.errorForeground : theme.colors.primaryForeground}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.dialogBtnText,
                          {
                            color: destructive
                              ? theme.colors.errorForeground
                              : theme.colors.primaryForeground,
                          },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                      >
                        {confirmLabel}
                      </Text>
                    )}
                  </Pressable>
                  <Pressable
                    unstable_pressDelay={0}
                    hitSlop={8}
                    onPress={() => {
                      setText('');
                      onCancel();
                    }}
                    style={[styles.dialogBtn, styles.dialogBtnStacked, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSunken }]}
                    accessibilityRole="button"
                    accessibilityLabel={cancelLabel}
                  >
                    <Text style={[styles.dialogBtnText, { color: theme.colors.foreground }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                      {cancelLabel}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    unstable_pressDelay={0}
                    hitSlop={8}
                    onPress={() => {
                      setText('');
                      onCancel();
                    }}
                    style={[styles.dialogBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSunken }]}
                    accessibilityRole="button"
                    accessibilityLabel={cancelLabel}
                  >
                    <Text style={[styles.dialogBtnText, { color: theme.colors.foreground }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                      {cancelLabel}
                    </Text>
                  </Pressable>

                  <Pressable
                    unstable_pressDelay={0}
                    hitSlop={8}
                    onPress={() => {
                      if (ok && !loading) onConfirm();
                    }}
                    disabled={!ok || loading}
                    style={[
                      styles.dialogBtn,
                      {
                        backgroundColor: destructive ? theme.colors.error : theme.colors.primary,
                        borderColor: 'transparent',
                        opacity: ok ? 1 : 0.4,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={confirmLabel}
                  >
                    {loading ? (
                      <ActivityIndicator
                        color={destructive ? theme.colors.errorForeground : theme.colors.primaryForeground}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.dialogBtnText,
                          {
                            color: destructive
                              ? theme.colors.errorForeground
                              : theme.colors.primaryForeground,
                          },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                      >
                        {confirmLabel}
                      </Text>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          )}
        </View>
      </View>
  );

  if (inline) return visible ? body : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      {body}
    </Modal>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

interface QueuedDialog {
  opts: ConfirmOptions;
  resolve?: (val: boolean) => void;
}

/**
 * En Android se usaba una capa "inline" dentro de la jerarquía de la app, pero al ser una vista
 * semitransparente más, se mezclaba con los elementos de la pantalla de debajo (manchas grises
 * sobre botones con sombra). El `Modal` nativo vive en su propia ventana y no interfiere. El fallo
 * original del Modal (tamaño 0 al volver del navegador de Google) se evita ahora esperando a que
 * la app esté activa antes de mostrar el diálogo (`afterBrowserReturn` en las pantallas de auth).
 */
const USE_INLINE_LAYER = false;

/**
 * Si hay un teclado abierto, lo cierra y espera a que termine de ocultarse (máx. 600 ms).
 * Un diálogo creado mientras el teclado redimensiona la ventana (p. ej. justo tras escribir la
 * contraseña y entrar, o al volver del navegador de Google) se dibujaba arriba y con los botones
 * fuera de la zona visible.
 */
function waitForKeyboardHidden(): Promise<void> {
  return new Promise((resolve) => {
    if (Platform.OS === 'web' || !Keyboard.isVisible()) {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (sub?.remove) sub.remove();
      clearTimeout(timer);
      // Pequeño margen para que Android termine de re-maquetar la ventana
      setTimeout(resolve, 80);
    };
    const timer = setTimeout(finish, 600);
    const sub = Keyboard.addListener('keyboardDidHide', finish);
    Keyboard.dismiss();
  });
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<QueuedDialog | null>(null);
  const queueRef = useRef<QueuedDialog[]>([]);
  const currentRef = useRef<QueuedDialog | null>(null);

  const present = useCallback((item: QueuedDialog | null) => {
    // Se "reserva" de inmediato para que otras llamadas a show()/ask() se encolen mientras esperamos.
    currentRef.current = item;
    if (!item) {
      setCurrent(null);
      return;
    }
    if (Platform.OS !== 'web' && Keyboard.isVisible()) {
      Keyboard.dismiss();
    }
    setCurrent(item);
  }, []);

  /** Cierra el diálogo actual y abre el siguiente de la cola (si lo hay). */
  const advance = useCallback(() => {
    const next = queueRef.current.shift() ?? null;
    present(next);
  }, [present]);

  const enqueue = useCallback(
    (item: QueuedDialog) => {
      if (currentRef.current) queueRef.current.push(item);
      else present(item);
    },
    [present],
  );

  const hide = useCallback(() => {
    currentRef.current?.resolve?.(false);
    advance();
  }, [advance]);

  const show = useCallback(
    (opts: ConfirmOptions) => {
      enqueue({ opts });
    },
    [enqueue],
  );

  const ask = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        enqueue({ opts, resolve });
      }),
    [enqueue],
  );

  const handleConfirm = useCallback(() => {
    const item = currentRef.current;
    if (!item) return;
    item.opts.onConfirm?.();
    item.resolve?.(true);
    advance();
  }, [advance]);

  const handleCancel = useCallback(() => {
    const item = currentRef.current;
    if (!item) return;
    // En un diálogo de botones personalizados, "cancelar" ejecuta el botón de tipo cancel (si existe).
    item.opts.actions?.find((a) => a.style === 'cancel')?.onPress?.();
    item.opts.onCancel?.();
    item.resolve?.(false);
    advance();
  }, [advance]);

  const handleAction = useCallback(
    (action: ConfirmAction) => {
      const item = currentRef.current;
      if (!item) return;
      advance(); // primero cerramos para que un onPress que abra otro diálogo no choque
      action.onPress?.();
      item.resolve?.(true);
    },
    [advance],
  );

  const ctx = React.useMemo<ConfirmContextType>(() => ({ show, ask, hide }), [show, ask, hide]);

  useEffect(() => {
    globalConfirm = ctx;
    return () => {
      if (globalConfirm === ctx) globalConfirm = null;
    };
  }, [ctx]);

  const dialogNode = current ? (
    <ConfirmDialog
      visible
      title={current.opts.title}
      message={current.opts.message}
      confirmLabel={current.opts.confirmLabel}
      cancelLabel={current.opts.cancelLabel}
      destructive={current.opts.destructive}
      requireText={current.opts.requireText}
      loading={current.opts.loading}
      actions={current.opts.actions}
      tone={current.opts.tone}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      onAction={handleAction}
      inline={USE_INLINE_LAYER && Platform.OS === 'android'}
    />
  ) : null;

  return (
    <ConfirmContext.Provider value={ctx}>
      {children}
      {USE_INLINE_LAYER && Platform.OS === 'android' ? (
        // Contenedor siempre montado y a pantalla completa: el diálogo se inserta en un
        // contenedor ya maquetado, en vez de crear una capa raíz nueva que Android mide a 0.
        <View
          collapsable={false}
          pointerEvents={current ? 'auto' : 'none'}
          style={styles.inlineHost}
        >
          {dialogNode}
        </View>
      ) : (
        dialogNode
      )}
    </ConfirmContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    // paddingHorizontal se sobrescribe dinámicamente según el ancho de pantalla
    paddingHorizontal: 24,
    ...Platform.select({
      web: {
        position: 'fixed' as any,
        zIndex: 99999,
      },
    }),
  },
  inlineHost: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10001,
  },
  // Capa a pantalla completa por encima de todo (incluidas las pantallas modales de navegación)
  // Sin `elevation`: en Android una capa semitransparente con elevación proyecta su sombra
  // a través del fondo y deja manchas grises sobre los elementos de debajo.
  inlineBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10001,
  },
  dialog: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  toneBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  dialogMsg: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  dialogInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontFamily: fontFamily.medium,
    fontSize: 16,
  },
  dialogActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
    flexShrink: 0,
  },
  dialogActionsStacked: {
    flexDirection: 'column',
    alignItems: 'stretch', // los botones ocupan todo el ancho del diálogo, uno encima de otro
    alignSelf: 'stretch',
    width: '100%',
    gap: 10,
  },
  dialogBtn: {
    flex: 1,
    minWidth: 80,
    height: 48,
    minHeight: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    ...Platform.select({
      web: {
        cursor: 'pointer' as any,
      },
    }),
  },
  dialogBtnStacked: {
    alignSelf: 'stretch',
    width: '100%',
    minWidth: 0,
    height: 48,
    minHeight: 48,
    ...Platform.select({
      web: {
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: 'auto',
      },
      default: {
        flex: 0,
      },
    }),
  },
  dialogBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    textAlign: 'center',
    ...Platform.select({
      web: {
        userSelect: 'none' as any,
      },
    }),
  },
});
