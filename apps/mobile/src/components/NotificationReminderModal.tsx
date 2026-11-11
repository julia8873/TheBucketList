import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Bell, Check, X } from 'lucide-react-native';
import { fontFamily, gold, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';

interface NotificationReminderModalProps {
  visible: boolean;
  canAskAgain?: boolean;
  onClose: (dontAskAgain: boolean) => void;
  onEnable: (dontAskAgain: boolean) => void;
}

export function NotificationReminderModal({
  visible,
  canAskAgain = true,
  onClose,
  onEnable,
}: NotificationReminderModalProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const [dontAskAgain, setDontAskAgain] = useState(false);

  const cardWidth = Math.min(380, windowWidth - 40);

  const handleClose = () => {
    onClose(dontAskAgain);
  };

  const handleEnable = () => {
    onEnable(dontAskAgain);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View
          style={[
            styles.card,
            {
              width: cardWidth,
              backgroundColor: theme.dark ? '#1A1A1C' : '#FFFFFF',
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Botón cerrar X superior */}
          <Pressable
            style={styles.closeBtn}
            onPress={handleClose}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('common.close', { defaultValue: 'Cerrar' })}
          >
            <X size={18} color={theme.colors.foregroundMuted} strokeWidth={2.2} />
          </Pressable>

          {/* Icono de campana */}
          <View style={styles.iconCircle}>
            <Bell size={28} color={gold[400]} strokeWidth={2.2} />
          </View>

          {/* Título */}
          <Text style={[styles.title, { color: theme.colors.foreground }]}>
            {t('notifications.push_prompt_title', { defaultValue: '¿Activar notificaciones?' })}
          </Text>

          {/* Mensaje descriptivo */}
          <Text style={[styles.message, { color: theme.colors.foregroundMuted }]}>
            {t('notifications.push_prompt_msg', {
              defaultValue:
                'Recibe avisos al instante en tu móvil cuando tus amigos reaccionen, comenten tus publicaciones o te inviten a colaborar.',
            })}
          </Text>

          {/* Casilla de "No volver a decir / recordar" */}
          <Pressable
            style={[
              styles.checkboxRow,
              {
                backgroundColor: theme.dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                borderColor: theme.colors.border,
              },
            ]}
            onPress={() => setDontAskAgain((prev) => !prev)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: dontAskAgain }}
            hitSlop={6}
          >
            <View
              style={[
                styles.checkboxBox,
                { borderColor: dontAskAgain ? gold[400] : theme.colors.border },
                dontAskAgain && { backgroundColor: gold[400] },
              ]}
            >
              {dontAskAgain && <Check size={13} color="#111111" strokeWidth={3} />}
            </View>
            <Text style={[styles.checkboxLabel, { color: theme.colors.foreground }]}>
              {t('notifications.reminder_dont_ask_again', { defaultValue: 'No volver a recordar' })}
            </Text>
          </Pressable>

          {/* Botones de acción */}
          <View style={styles.actions}>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: gold[400] }]}
              onPress={handleEnable}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>
                {canAskAgain
                  ? t('common.activate', { defaultValue: 'Activar' })
                  : t('common.open_settings', { defaultValue: 'Abrir Ajustes' })}
              </Text>
            </Pressable>

            <Pressable
              style={styles.secondaryBtn}
              onPress={handleClose}
              accessibilityRole="button"
            >
              <Text style={[styles.secondaryBtnText, { color: theme.colors.foregroundMuted }]}>
                {t('common.not_now', { defaultValue: 'Ahora no' })}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 14,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(212, 175, 55, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 19,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  message: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    flex: 1,
  },
  actions: {
    width: '100%',
    gap: 8,
  },
  primaryBtn: {
    width: '100%',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: '#000000',
  },
  secondaryBtn: {
    width: '100%',
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
  },
});

