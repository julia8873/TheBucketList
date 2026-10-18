import React, { useState } from 'react';
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
import {
  Flag,
  X,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react-native';
import { fontFamily, gold } from '@bucketlist/ui';

interface ReportUserModalProps {
  visible: boolean;
  onClose: () => void;
  username: string;
  onSubmit: (reason: string, details?: string) => Promise<void>;
  isLoading?: boolean;
}

const REPORT_REASONS = [
  { id: 'Spam o bots', label: 'Spam, bots o publicidad abusiva' },
  { id: 'Acoso o intimidación', label: 'Acoso, insultos o intimidación' },
  { id: 'Contenido inapropiado', label: 'Contenido explícito o inadecuado' },
  { id: 'Suplantación de identidad', label: 'Suplantación de identidad o engaño' },
  { id: 'Incitación al odio', label: 'Discurso o incitación al odio' },
  { id: 'Otro', label: 'Otro motivo' },
];

export function ReportUserModal({
  visible,
  onClose,
  username,
  onSubmit,
  isLoading = false,
}: ReportUserModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>(REPORT_REASONS[0]?.id ?? 'Otro');
  const [details, setDetails] = useState('');

  if (!visible) return null;

  const handleSubmit = async () => {
    if (!selectedReason) return;
    await onSubmit(selectedReason, details);
    setDetails('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <View style={styles.card}>
            {/* Cabecera */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <View style={styles.iconCircle}>
                  <ShieldAlert color="#EF4444" size={22} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Reportar usuario</Text>
                  <Text style={styles.subtitle}>@{username}</Text>
                </View>
              </View>
              <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
                <X color="#8F8F8F" size={20} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 10 }}
            >
              <Text style={styles.sectionLabel}>¿CUÁL ES EL MOTIVO DEL REPORTE?</Text>

              {/* Lista de motivos */}
              <View style={styles.reasonsList}>
                {REPORT_REASONS.map((r) => {
                  const isSelected = selectedReason === r.id;
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => setSelectedReason(r.id)}
                      style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                    >
                      <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                        {isSelected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={[styles.reasonText, isSelected && styles.reasonTextSelected]}>
                        {r.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Detalles adicionales */}
              <Text style={[styles.sectionLabel, { marginTop: 18 }]}>
                DETALLES ADICIONALES (OPCIONAL)
              </Text>
              <TextInput
                style={styles.textInput}
                placeholder="Añade información o contexto para el administrador..."
                placeholderTextColor="#666"
                value={details}
                onChangeText={setDetails}
                multiline
                numberOfLines={3}
                maxLength={300}
              />

              <View style={styles.noticeBox}>
                <Text style={styles.noticeText}>
                  ℹ️ Este reporte se enviará de forma confidencial y directa al administrador para evaluar la suspensión o borrado de la cuenta.
                </Text>
              </View>

              {/* Botones de acción */}
              <View style={styles.actionsRow}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={onClose}
                  disabled={isLoading}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </Pressable>

                <Pressable
                  style={[styles.submitBtn, isLoading && { opacity: 0.6 }]}
                  onPress={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Flag size={16} color="#FFF" />
                      <Text style={styles.submitBtnText}>Enviar reporte</Text>
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardView: {
    width: '100%',
    maxWidth: 480,
  },
  card: {
    backgroundColor: '#161616',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#F3EEE3',
    fontSize: 18,
    fontFamily: fontFamily.semibold,
  },
  subtitle: {
    color: '#D4AF37',
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionLabel: {
    color: '#8F8F8F',
    fontSize: 11,
    fontFamily: fontFamily.semibold,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  reasonsList: {
    gap: 8,
  },
  reasonOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  reasonOptionSelected: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioCircleSelected: {
    borderColor: '#EF4444',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#EF4444',
  },
  reasonText: {
    color: '#CCC',
    fontSize: 14,
    flex: 1,
  },
  reasonTextSelected: {
    color: '#F3EEE3',
    fontFamily: fontFamily.medium,
  },
  textInput: {
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 12,
    padding: 12,
    color: '#F3EEE3',
    fontSize: 14,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  noticeBox: {
    backgroundColor: 'rgba(212, 175, 55, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    padding: 10,
    marginTop: 14,
  },
  noticeText: {
    color: '#B5A57A',
    fontSize: 12,
    lineHeight: 17,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#222',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#BBB',
    fontSize: 15,
    fontFamily: fontFamily.medium,
  },
  submitBtn: {
    flex: 1.5,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: fontFamily.semibold,
  },
});
