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
}: DialogProps) {
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const ok = !requireText || text.trim().toUpperCase() === requireText.toUpperCase();

  useEffect(() => {
    if (!visible) {
      setText('');
      return;
    }
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
  const stacked = !!actions && actions.length > 2;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        style={[
          styles.backdrop,
          { backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(26,20,16,0.45)' },
        ]}
        onPress={onCancel}
      >
        <Pressable
          style={[
            styles.dialog,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
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
            <Text style={[styles.dialogMsg, { color: theme.colors.foregroundMuted }]}>
              {message}
            </Text>
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
              {actions.map((action, idx) => {
                const isCancel = action.style === 'cancel';
                const isDestructive = action.style === 'destructive';
                return (
                  <Pressable
                    key={`${action.label}-${idx}`}
                    onPress={() => (isCancel ? onCancel() : onAction?.(action))}
                    style={[
                      styles.dialogBtn,
                      stacked ? styles.dialogBtnStacked : null,
                      isCancel
                        ? { borderColor: theme.colors.border }
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
                    >
                      {action.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.dialogActions}>
              <Pressable
                onPress={() => {
                  setText('');
                  onCancel();
                }}
                style={[styles.dialogBtn, { borderColor: theme.colors.border }]}
                accessibilityRole="button"
                accessibilityLabel={cancelLabel}
              >
                <Text style={[styles.dialogBtnText, { color: theme.colors.foreground }]}>
                  {cancelLabel}
                </Text>
              </Pressable>

              <Pressable
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
                  >
                    {confirmLabel}
                  </Text>
                )}
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

interface QueuedDialog {
  opts: ConfirmOptions;
  resolve?: (val: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<QueuedDialog | null>(null);
  const queueRef = useRef<QueuedDialog[]>([]);
  const currentRef = useRef<QueuedDialog | null>(null);

  const present = useCallback((item: QueuedDialog | null) => {
    currentRef.current = item;
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

  return (
    <ConfirmContext.Provider value={ctx}>
      {children}
      {current && (
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
        />
      )}
    </ConfirmContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
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
  },
  dialogActionsStacked: {
    flexDirection: 'column',
  },
  dialogBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dialogBtnStacked: {
    flex: 0,
    width: '100%',
  },
  dialogBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
    textAlign: 'center',
  },
});
