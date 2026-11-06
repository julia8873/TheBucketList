import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Dimensions,
} from 'react-native';
import {
  Copy,
  FileText,
  Calendar,
  MapPin,
  ListChecks,
  Palette,
  Settings,
  X,
} from 'lucide-react-native';
import { fontFamily, gold, useTheme } from '@bucketlist/ui';
import { useTranslation } from 'react-i18next';
import { AppSwitch } from './AppSwitch';
import {
  type CloneTaskFields,
  useCloneTaskPreferencesStore,
} from '../stores/cloneTaskPreferences.store';

export interface CloneTaskDialogProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (options: CloneTaskFields, dontAskAgain: boolean) => void;
  taskTitle?: string;
  isLoading?: boolean;
}

export function CloneTaskDialog({
  visible,
  onClose,
  onConfirm,
  taskTitle,
  isLoading = false,
}: CloneTaskDialogProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const storeFields = useCloneTaskPreferencesStore((s) => s.fields);

  const [options, setOptions] = useState<CloneTaskFields>({ ...storeFields });
  const [dontAskAgain, setDontAskAgain] = useState(false);

  // Cada vez que se abre el modal, reiniciamos el estado con las preferencias actuales
  useEffect(() => {
    if (visible) {
      setOptions({ ...storeFields });
      setDontAskAgain(false);
    }
  }, [visible, storeFields]);

  const dims = useWindowDimensions();
  const win = Dimensions.get('window');
  const w = dims.width > 0 ? dims.width : win.width;
  const h = dims.height > 0 ? dims.height : win.height;
  const dialogWidth = Math.max(300, Math.min(420, w - 32));

  const isDark = theme.dark;
  const switchThumbColor = (checked: boolean) => {
    if (!isDark) return '#FFFFFF';
    return checked ? '#0D0D0D' : '#9A9A9A';
  };
  const switchActiveThumbColor = isDark ? '#0D0D0D' : '#FFFFFF';
  const switchTrackColor = {
    false: isDark ? theme.colors.border : '#E2DDD3',
    true: gold[400],
  };

  const toggleOption = (key: keyof CloneTaskFields) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirm = () => {
    onConfirm(options, dontAskAgain);
  };

  const items: Array<{
    key: keyof CloneTaskFields;
    title: string;
    subtitle: string;
    icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  }> = [
    {
      key: 'description',
      title: t('clone_task.description', { defaultValue: 'Descripción' }),
      subtitle: t('clone_task.description_desc', { defaultValue: 'Notas y detalles explicativos' }),
      icon: FileText,
    },
    {
      key: 'deadline',
      title: t('clone_task.deadline', { defaultValue: 'Fechas' }),
      subtitle: t('clone_task.deadline_desc', { defaultValue: 'Fecha límite u objetivo' }),
      icon: Calendar,
    },
    {
      key: 'location',
      title: t('clone_task.location', { defaultValue: 'Ubicación' }),
      subtitle: t('clone_task.location_desc', { defaultValue: 'Lugar y coordenadas en el mapa' }),
      icon: MapPin,
    },
    {
      key: 'subtasks',
      title: t('clone_task.subtasks', { defaultValue: 'Pasos / Subtareas' }),
      subtitle: t('clone_task.subtasks_desc', { defaultValue: 'Lista de comprobación inicial' }),
      icon: ListChecks,
    },
    {
      key: 'cover',
      title: t('clone_task.cover', { defaultValue: 'Portada y color' }),
      subtitle: t('clone_task.cover_desc', { defaultValue: 'Fondo y estilo visual de la tarea' }),
      icon: Palette,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.backdrop, { width: w, height: h }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.dialog,
            {
              width: dialogWidth,
              maxHeight: Math.max(320, h - 64),
              backgroundColor: theme.dark ? '#1A1A1A' : '#FFFFFF',
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Copy size={20} color="#0D0D0D" strokeWidth={2.4} />
            </View>
            <View style={styles.headerTitles}>
              <Text style={[styles.title, { color: theme.colors.foreground }]}>
                {t('clone_task.title', { defaultValue: 'Clonar tarea' })}
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.foregroundMuted }]}>
                {t('clone_task.subtitle', {
                  defaultValue: 'Elige qué detalles quieres incluir en tu lista:',
                })}
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={[styles.closeButton, { backgroundColor: theme.colors.surface }]}
              accessibilityRole="button"
              accessibilityLabel={t('common.close', { defaultValue: 'Cerrar' })}
            >
              <X size={16} color={theme.colors.foreground} />
            </Pressable>
          </View>

          {taskTitle ? (
            <View style={[styles.taskTitleBadge, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <Text
                style={[styles.taskTitleText, { color: theme.colors.foreground }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                «{taskTitle}»
              </Text>
            </View>
          ) : null}

          {/* Opciones */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.optionsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              {items.map((item, index) => {
                const IconComponent = item.icon;
                const isChecked = options[item.key];
                const isLast = index === items.length - 1;

                return (
                  <Pressable
                    key={item.key}
                    onPress={() => toggleOption(item.key)}
                    style={[
                      styles.optionRow,
                      !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
                    ]}
                  >
                    <View style={[styles.optionIconWrap, { backgroundColor: theme.dark ? '#262626' : '#F0ECE1' }]}>
                      <IconComponent size={16} color={gold[400]} strokeWidth={2} />
                    </View>
                    <View style={styles.optionInfo}>
                      <Text style={[styles.optionTitle, { color: theme.colors.foreground }]}>
                        {item.title}
                      </Text>
                      <Text style={[styles.optionSubtitle, { color: theme.colors.foregroundMuted }]}>
                        {item.subtitle}
                      </Text>
                    </View>
                    <AppSwitch
                      value={isChecked}
                      onValueChange={() => toggleOption(item.key)}
                      trackColor={switchTrackColor}
                      thumbColor={switchThumbColor(isChecked)}
                      activeThumbColor={switchActiveThumbColor}
                      accessibilityLabel={item.title}
                    />
                  </Pressable>
                );
              })}
            </View>

            {/* No volver a mostrar */}
            <View style={[styles.dontAskContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.dontAskRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <Text style={[styles.dontAskTitle, { color: theme.colors.foreground }]}>
                    {t('clone_task.dont_ask_again', { defaultValue: 'No volver a mostrar' })}
                  </Text>
                  <Text style={[styles.dontAskSubtitle, { color: theme.colors.foregroundMuted }]}>
                    {t('clone_task.remember_choice', { defaultValue: 'Recordar mi selección y clonar siempre así' })}
                  </Text>
                </View>
                <AppSwitch
                  value={dontAskAgain}
                  onValueChange={setDontAskAgain}
                  trackColor={switchTrackColor}
                  thumbColor={switchThumbColor(dontAskAgain)}
                  activeThumbColor={switchActiveThumbColor}
                  accessibilityLabel={t('clone_task.dont_ask_again', { defaultValue: 'No volver a mostrar' })}
                />
              </View>

              {/* Explicación de Ajustes */}
              <View style={[styles.settingsHint, { backgroundColor: theme.dark ? 'rgba(212,177,58,0.08)' : 'rgba(212,177,58,0.12)' }]}>
                <Settings size={14} color={gold[400]} style={{ marginTop: 2, flexShrink: 0 }} />
                <Text style={[styles.settingsHintText, { color: theme.dark ? '#E6D28C' : '#8A7019' }]}>
                  {t('clone_task.settings_hint', {
                    defaultValue: 'Puedes volver a configurar qué se clona en cada tarea en cualquier momento desde Ajustes > Preferencias.',
                  })}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Botones de acción */}
          <View style={styles.actionsRow}>
            <Pressable
              onPress={onClose}
              disabled={isLoading}
              style={[styles.btnCancel, { borderColor: theme.colors.border }]}
              accessibilityRole="button"
            >
              <Text style={[styles.btnCancelText, { color: theme.colors.foreground }]}>
                {t('common.cancel', { defaultValue: 'Cancelar' })}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleConfirm}
              disabled={isLoading}
              style={[styles.btnConfirm, { backgroundColor: gold[400] }]}
              accessibilityRole="button"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#0D0D0D" />
              ) : (
                <>
                  <Copy size={16} color="#0D0D0D" strokeWidth={2.4} />
                  <Text style={styles.btnConfirmText}>
                    {t('clone_task.confirm', { defaultValue: 'Clonar tarea' })}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  dialog: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: gold[400],
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitles: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fontFamily.serifBold,
    fontSize: 18,
    lineHeight: 22,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 17,
    marginTop: 2,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  taskTitleBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  taskTitleText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
  },
  scrollArea: {
    flexGrow: 0,
    marginBottom: 16,
  },
  scrollContent: {
    gap: 12,
  },
  optionsCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  optionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  optionInfo: {
    flex: 1,
    minWidth: 0,
  },
  optionTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
  },
  optionSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 11.5,
    marginTop: 1,
  },
  dontAskContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  dontAskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dontAskTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 13.5,
  },
  dontAskSubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    marginTop: 1,
  },
  settingsHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  settingsHintText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 15,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnCancel: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
  },
  btnConfirm: {
    flex: 1.3,
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  btnConfirmText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#0D0D0D',
  },
});

