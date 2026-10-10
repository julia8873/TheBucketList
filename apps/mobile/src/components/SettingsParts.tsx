import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { fontFamily, useTheme } from '@bucketlist/ui';

/** Etiqueta de sección: "APARIENCIA" con la primera palabra en dorado. */
export function SectionTitle({ gold, rest }: { gold: string; rest?: string }) {
  const { theme } = useTheme();
  return (
    <Text style={[styles.sectionTitle, { color: theme.colors.foreground }]}>
      <Text style={{ color: theme.colors.primary }}>{gold}</Text>
      {rest ? ` ${rest}` : ''}
    </Text>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {children}
    </View>
  );
}

interface RowProps {
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
  last?: boolean;
  loading?: boolean;
}

export function Row({ title, subtitle, value, onPress, right, danger, last, loading }: RowProps) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [
        styles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, { color: danger ? theme.colors.error : theme.colors.foreground }]}>{title}</Text>
        {subtitle ? <Text style={[styles.rowSub, { color: theme.colors.foregroundMuted }]}>{subtitle}</Text> : null}
      </View>
      {loading ? <ActivityIndicator color={theme.colors.primary} /> : null}
      {value ? <Text style={[styles.rowValue, { color: theme.colors.foregroundMuted }]}>{value}</Text> : null}
      {right}
      {onPress && !right && !danger && !loading ? <ChevronRight size={18} color={theme.colors.foregroundMuted} /> : null}
    </Pressable>
  );
}

export function ToggleRow({
  title, subtitle, value, onChange, last, disabled,
}: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void; last?: boolean; disabled?: boolean }) {
  const { theme } = useTheme();
  return (
    <Row
      title={title}
      subtitle={subtitle}
      last={last}
      right={
        <Switch
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          thumbColor={value ? theme.colors.primaryForeground : '#9A9A9A'}
          accessibilityLabel={title}
        />
      }
    />
  );
}

/** Selector de 2+ opciones en píldora (Oscuro / Claro). */
export function PillToggle<T extends string>({
  options, selected, onChange,
}: { options: { key: T; label: string }[]; selected: T; onChange: (k: T) => void }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.pillWrap, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
      {options.map((o) => {
        const on = o.key === selected;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.pill, on && { backgroundColor: theme.colors.primary }]}
          >
            <Text style={[styles.pillText, { color: on ? theme.colors.primaryForeground : theme.colors.foreground }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

interface DialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  /** Si se indica, hay que escribir esta palabra para habilitar el botón. */
  requireText?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Diálogo de confirmación propio (Alert.prompt no existe en Android ni en web). */
export function ConfirmDialog({
  visible, title, message, confirmLabel, cancelLabel, destructive, requireText, loading, onConfirm, onCancel,
}: DialogProps) {
  const { theme } = useTheme();
  const [text, setText] = useState('');
  const ok = !requireText || text.trim().toUpperCase() === requireText.toUpperCase();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.dialog, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
          <Text style={[styles.dialogTitle, { color: theme.colors.foreground }]}>{title}</Text>
          {message ? <Text style={[styles.dialogMsg, { color: theme.colors.foregroundMuted }]}>{message}</Text> : null}
          {requireText ? (
            <TextInput
              value={text}
              onChangeText={setText}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder={requireText}
              placeholderTextColor={theme.colors.foregroundSubtle}
              style={[styles.dialogInput, { color: theme.colors.foreground, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceSunken }]}
            />
          ) : null}
          <View style={styles.dialogActions}>
            <Pressable onPress={() => { setText(''); onCancel(); }} style={[styles.dialogBtn, { borderColor: theme.colors.border }]}>
              <Text style={[styles.dialogBtnText, { color: theme.colors.foreground }]}>{cancelLabel}</Text>
            </Pressable>
            <Pressable
              onPress={() => { if (ok && !loading) onConfirm(); }}
              disabled={!ok || loading}
              style={[styles.dialogBtn, { backgroundColor: destructive ? theme.colors.error : theme.colors.primary, borderColor: 'transparent', opacity: ok ? 1 : 0.4 }]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.dialogBtnText, { color: destructive ? theme.colors.errorForeground : theme.colors.primaryForeground }]}>
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface OptionDialogProps<T extends string> {
  visible: boolean;
  title: string;
  options: { key: T; label: string; danger?: boolean }[];
  selected?: T;
  onSelect: (k: T) => void;
  onClose: () => void;
}

export function OptionDialog<T extends string>({ visible, title, options, selected, onSelect, onClose }: OptionDialogProps<T>) {
  const { theme } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.dialog, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
          <Text style={[styles.dialogTitle, { color: theme.colors.foreground }]}>{title}</Text>
          {options.map((o) => {
            const on = o.key === selected;
            return (
              <Pressable
                key={o.key}
                onPress={() => { onSelect(o.key); onClose(); }}
                accessibilityRole="button"
                style={[styles.option, { borderColor: on ? theme.colors.primary : theme.colors.border }]}
              >
                <Text style={[styles.rowTitle, { color: o.danger ? theme.colors.error : on ? theme.colors.primary : theme.colors.foreground }]}>{o.label}</Text>
              </Pressable>
            );
          })}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontFamily: fontFamily.serifBold, fontSize: 14, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 24, marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, minHeight: 52 },
  rowTitle: { fontFamily: fontFamily.medium, fontSize: 15 },
  rowSub: { fontFamily: fontFamily.regular, fontSize: 13, marginTop: 2 },
  rowValue: { fontFamily: fontFamily.regular, fontSize: 15 },
  pillWrap: { flexDirection: 'row', padding: 3, borderWidth: 1, borderRadius: 22 },
  pill: { height: 34, paddingHorizontal: 16, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontFamily: fontFamily.semibold, fontSize: 14 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  dialog: { width: '100%', maxWidth: 380, borderRadius: 24, borderWidth: 1, padding: 20, gap: 12 },
  dialogTitle: { fontFamily: fontFamily.serifBold, fontSize: 20 },
  dialogMsg: { fontFamily: fontFamily.regular, fontSize: 14, lineHeight: 20 },
  dialogInput: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 48, fontFamily: fontFamily.medium, fontSize: 16 },
  dialogActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  dialogBtn: { flex: 1, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dialogBtnText: { fontFamily: fontFamily.semibold, fontSize: 15 },
  option: { height: 52, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, justifyContent: 'center' },
});
