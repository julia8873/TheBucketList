import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Flag, X, ShieldAlert } from 'lucide-react-native';
import { fontFamily, useTheme } from '@bucketlist/ui';

export type ReportTargetKind = 'user' | 'bucket' | 'album' | 'comment';

const REPORT_REASONS = [
  { id: 'Spam o bots', label: 'Spam, bots o publicidad abusiva' },
  { id: 'Acoso o intimidación', label: 'Acoso, insultos o intimidación' },
  { id: 'Contenido inapropiado', label: 'Contenido explícito o inadecuado' },
  { id: 'Suplantación de identidad', label: 'Suplantación de identidad o engaño' },
  { id: 'Incitación al odio', label: 'Discurso o incitación al odio' },
  { id: 'Otro', label: 'Otro motivo' },
];

const TITLES: Record<ReportTargetKind, string> = {
  user: 'Reportar usuario',
  bucket: 'Reportar tarea',
  album: 'Reportar álbum',
  comment: 'Reportar comentario',
};

const NOTICES: Record<ReportTargetKind, string> = {
  user: 'Este reporte se enviará de forma confidencial y directa al administrador para evaluar la suspensión o borrado de la cuenta.',
  bucket: 'Este reporte se enviará de forma confidencial al administrador, que podrá eliminar la tarea o bloquear la cuenta de su autor.',
  album: 'Este reporte se enviará de forma confidencial al administrador, que podrá eliminar el álbum o bloquear la cuenta de su autor.',
  comment: 'Este reporte se enviará de forma confidencial al administrador, que podrá eliminar el comentario o bloquear la cuenta de su autor.',
};

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  kind: ReportTargetKind;
  /** Texto bajo el título: "@usuario", nombre de la tarea/álbum, etc. */
  subject?: string;
  onSubmit: (reason: string, details?: string) => Promise<void>;
  isLoading?: boolean;
}

export function ReportModal({
  visible,
  onClose,
  kind,
  subject,
  onSubmit,
  isLoading = false,
}: ReportModalProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]?.id ?? 'Otro');
  const [details, setDetails] = useState('');

  useEffect(() => {
    if (!visible) {
      setDetails('');
      setSelectedReason(REPORT_REASONS[0]?.id ?? 'Otro');
    }
  }, [visible]);

  if (!visible) return null;

  const handleSubmit = async () => {
    if (!selectedReason) return;
    try {
      await onSubmit(selectedReason, details);
      onClose();
    } catch {
      // El hook que envía el reporte ya muestra el error; mantenemos el formulario abierto.
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={[
          styles.backdrop,
          { backgroundColor: theme.dark ? 'rgba(0,0,0,0.75)' : 'rgba(26,20,16,0.5)' },
        ]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <View style={[styles.card, { backgroundColor: c.surfaceElevated, borderColor: c.border }]}>
            {/* Cabecera */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={[styles.iconCircle, { backgroundColor: c.errorBackground }]}>
                  <ShieldAlert color={c.error} size={22} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: c.foreground }]}>{TITLES[kind]}</Text>
                  {subject ? (
                    <Text style={[styles.subtitle, { color: c.foregroundMuted }]} numberOfLines={1}>
                      {subject}
                    </Text>
                  ) : null}
                </View>
              </View>
              <Pressable
                style={[styles.closeBtn, { backgroundColor: c.surfaceSunken }]}
                onPress={onClose}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
              >
                <X color={c.foregroundMuted} size={20} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              <Text style={[styles.sectionLabel, { color: c.foregroundMuted }]}>
                ¿CUÁL ES EL MOTIVO DEL REPORTE?
              </Text>

              <View style={styles.reasonsList}>
                {REPORT_REASONS.map((r) => {
                  const isSelected = selectedReason === r.id;
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => setSelectedReason(r.id)}
                      style={[
                        styles.reasonOption,
                        { backgroundColor: c.surfaceSunken, borderColor: c.border },
                        isSelected && { borderColor: c.error, backgroundColor: c.errorBackground },
                      ]}
                    >
                      <View
                        style={[
                          styles.radioCircle,
                          { borderColor: c.foregroundSubtle },
                          isSelected && { borderColor: c.error },
                        ]}
                      >
                        {isSelected && <View style={[styles.radioDot, { backgroundColor: c.error }]} />}
                      </View>
                      <Text
                        style={[
                          styles.reasonText,
                          { color: c.foregroundMuted },
                          isSelected && { color: c.foreground, fontFamily: fontFamily.medium },
                        ]}
                      >
                        {r.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.sectionLabel, { color: c.foregroundMuted, marginTop: 18 }]}>
                DETALLES ADICIONALES (OPCIONAL)
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: c.surfaceSunken, borderColor: c.border, color: c.foreground },
                ]}
                placeholder="Añade información o contexto para el administrador..."
                placeholderTextColor={c.foregroundSubtle}
                value={details}
                onChangeText={setDetails}
                multiline
                numberOfLines={3}
                maxLength={300}
              />

              <View style={[styles.noticeBox, { backgroundColor: c.surfaceSunken, borderColor: c.border }]}>
                <Text style={[styles.noticeText, { color: c.foregroundMuted }]}>
                  ℹ️ {NOTICES[kind]}
                </Text>
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.cancelBtn, { borderColor: c.border }]}
                  onPress={onClose}
                  disabled={isLoading}
                >
                  <Text style={[styles.cancelBtnText, { color: c.foreground }]}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={[styles.submitBtn, { backgroundColor: c.error }, isLoading && { opacity: 0.6 }]}
                  onPress={() => void handleSubmit()}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color={c.errorForeground} />
                  ) : (
                    <>
                      <Flag size={16} color={c.errorForeground} />
                      <Text style={[styles.submitBtnText, { color: c.errorForeground }]}>Enviar reporte</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 20 },
  keyboardView: { width: '100%', justifyContent: 'center' },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  headerTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontFamily: fontFamily.serifBold },
  subtitle: { fontSize: 13, fontFamily: fontFamily.regular, marginTop: 1 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: fontFamily.semibold,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  reasonsList: { gap: 8 },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  reasonText: { flex: 1, fontSize: 14, fontFamily: fontFamily.regular },
  textInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    minHeight: 80,
    fontSize: 14,
    fontFamily: fontFamily.regular,
    textAlignVertical: 'top',
  },
  noticeBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  noticeText: { fontSize: 12, lineHeight: 17, fontFamily: fontFamily.regular },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 15, fontFamily: fontFamily.semibold },
  submitBtn: {
    flex: 1.3,
    height: 48,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: { fontSize: 15, fontFamily: fontFamily.semibold },
});
