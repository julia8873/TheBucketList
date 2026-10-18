/**
 * ConfirmDialog & ConfirmProvider
 * Dark luxury confirmation dialog matching the application's signature aesthetic
 * (identical to sign out / delete confirmation in Settings).
 * Usage via useConfirm() or global confirm helper.
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
import { fontFamily } from '../tokens/typography';
import { useTheme } from '../theme/useTheme';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  requireText?: string;
  loading?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface DialogProps extends ConfirmOptions {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface ConfirmContextType {
  show: (opts: ConfirmOptions) => void;
  ask: (opts: ConfirmOptions) => Promise<boolean>;
  hide: () => void;
}

// ── Global Helper ──────────────────────────────────────────────────────────────

let globalConfirm: ConfirmContextType | null = null;

export const confirm = {
  show: (opts: ConfirmOptions) => globalConfirm?.show(opts),
  ask: (opts: ConfirmOptions): Promise<boolean> =>
    globalConfirm ? globalConfirm.ask(opts) : Promise.resolve(false),
  hide: () => globalConfirm?.hide(),
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
  onConfirm,
  onCancel,
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
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
                <ActivityIndicator color="#fff" />
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
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<(ConfirmOptions & { visible: boolean }) | null>(null);
  const resolverRef = useRef<((val: boolean) => void) | null>(null);

  const hide = useCallback(() => {
    resolverRef.current?.(false);
    resolverRef.current = null;
    setCurrent(null);
  }, []);

  const show = useCallback((opts: ConfirmOptions) => {
    setCurrent({
      ...opts,
      visible: true,
      onConfirm: () => {
        opts.onConfirm?.();
        setCurrent(null);
      },
      onCancel: () => {
        opts.onCancel?.();
        setCurrent(null);
      },
    });
  }, []);

  const ask = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setCurrent({
        ...opts,
        visible: true,
        onConfirm: () => {
          opts.onConfirm?.();
          resolve(true);
          setCurrent(null);
        },
        onCancel: () => {
          opts.onCancel?.();
          resolve(false);
          setCurrent(null);
        },
      });
    });
  }, []);

  const ctx: ConfirmContextType = { show, ask, hide };

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
          visible={current.visible}
          title={current.title}
          message={current.message}
          confirmLabel={current.confirmLabel}
          cancelLabel={current.cancelLabel}
          destructive={current.destructive}
          requireText={current.requireText}
          loading={current.loading}
          onConfirm={current.onConfirm || hide}
          onCancel={current.onCancel || hide}
        />
      )}
    </ConfirmContext.Provider>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
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
  dialogBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: 15,
  },
});
