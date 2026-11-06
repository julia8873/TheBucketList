import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Dimensions,
} from 'react-native';
import { ChevronLeft, Copy, FileText, Calendar, MapPin, ListChecks, Palette } from 'lucide-react-native';
import { fontFamily, gold, useTheme } from '@bucketlist/ui';
import { useTranslation } from 'react-i18next';
import { Card, SectionTitle, ToggleRow } from './SettingsParts';
import {
  type CloneTaskFields,
  useCloneTaskPreferencesStore,
} from '../stores/cloneTaskPreferences.store';

interface CloneTaskSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CloneTaskSettingsModal({ visible, onClose }: CloneTaskSettingsModalProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { askEveryTime, fields, setAskEveryTime, setField } = useCloneTaskPreferencesStore();

  const dims = useWindowDimensions();
  const win = Dimensions.get('window');
  const w = dims.width > 0 ? dims.width : win.width;
  const h = dims.height > 0 ? dims.height : win.height;
  const dialogWidth = Math.max(300, Math.min(440, w - 32));

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
            styles.container,
            {
              width: dialogWidth,
              maxHeight: Math.max(360, h - 48),
              backgroundColor: theme.dark ? '#141414' : '#F6F4EE',
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              style={[styles.backButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              accessibilityRole="button"
              accessibilityLabel={t('common.back', { defaultValue: 'Volver' })}
            >
              <ChevronLeft size={20} color={theme.colors.foreground} />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[styles.headerTitle, { color: theme.colors.foreground }]} numberOfLines={1}>
                {t('settings.cloning_options', { defaultValue: 'Clonación de tareas' })}
              </Text>
            </View>
            <View style={styles.headerIcon}>
              <Copy size={16} color={gold[400]} />
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.introText, { color: theme.colors.foregroundMuted }]}>
              {t('settings.cloning_intro', {
                defaultValue: 'Elige cómo se comportan las tareas cuando pulsas «Yo también» para añadirlas a tu lista personal.',
              })}
            </Text>

            {/* Comportamiento */}
            <SectionTitle
              gold={t('settings.cloning_behavior_gold', { defaultValue: 'MODO' })}
              rest={t('settings.cloning_behavior_rest', { defaultValue: 'DE CLONACIÓN' })}
            />
            <Card>
              <ToggleRow
                title={t('settings.ask_before_cloning', { defaultValue: 'Preguntar siempre al clonar' })}
                subtitle={t('settings.ask_before_cloning_desc', {
                  defaultValue: 'Muestra el diálogo para elegir qué elementos incluir cada vez que clones una tarea',
                })}
                value={askEveryTime}
                onChange={setAskEveryTime}
                last
              />
            </Card>

            {/* Elementos por defecto */}
            <SectionTitle
              gold={t('settings.cloning_elements_gold', { defaultValue: 'ELEMENTOS' })}
              rest={t('settings.cloning_elements_rest', { defaultValue: 'POR DEFECTO' })}
            />
            <Text style={[styles.sectionHint, { color: theme.colors.foregroundMuted }]}>
              {askEveryTime
                ? t('settings.elements_hint_ask', {
                    defaultValue: 'Estos elementos aparecerán activados inicialmente en el diálogo de clonación:',
                  })
                : t('settings.elements_hint_auto', {
                    defaultValue: 'Al tener desactivado «Preguntar siempre», las tareas se clonarán automáticamente con estas opciones:',
                  })}
            </Text>

            <Card>
              <ToggleRow
                title={t('clone_task.description', { defaultValue: 'Descripción' })}
                subtitle={t('clone_task.description_desc', { defaultValue: 'Notas y detalles explicativos' })}
                value={fields.description}
                onChange={(v) => setField('description', v)}
              />
              <ToggleRow
                title={t('clone_task.deadline', { defaultValue: 'Fechas' })}
                subtitle={t('clone_task.deadline_desc', { defaultValue: 'Fecha límite u objetivo' })}
                value={fields.deadline}
                onChange={(v) => setField('deadline', v)}
              />
              <ToggleRow
                title={t('clone_task.location', { defaultValue: 'Ubicación' })}
                subtitle={t('clone_task.location_desc', { defaultValue: 'Lugar y coordenadas en el mapa' })}
                value={fields.location}
                onChange={(v) => setField('location', v)}
              />
              <ToggleRow
                title={t('clone_task.subtasks', { defaultValue: 'Pasos / Subtareas' })}
                subtitle={t('clone_task.subtasks_desc', { defaultValue: 'Lista de comprobación inicial' })}
                value={fields.subtasks}
                onChange={(v) => setField('subtasks', v)}
              />
              <ToggleRow
                title={t('clone_task.cover', { defaultValue: 'Portada y color' })}
                subtitle={t('clone_task.cover_desc', { defaultValue: 'Fondo y estilo visual de la tarea' })}
                value={fields.cover}
                onChange={(v) => setField('cover', v)}
                last
              />
            </Card>
          </ScrollView>

          {/* Footer botón listo */}
          <Pressable
            onPress={onClose}
            style={[styles.doneButton, { backgroundColor: gold[400] }]}
            accessibilityRole="button"
          >
            <Text style={styles.doneButtonText}>
              {t('common.done', { defaultValue: 'Listo' })}
            </Text>
          </Pressable>
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
  container: {
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    fontFamily: fontFamily.serifBold,
    fontSize: 18,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,177,58,0.14)',
    flexShrink: 0,
  },
  scroll: {
    flexGrow: 0,
    marginBottom: 14,
  },
  scrollContent: {
    gap: 8,
    paddingBottom: 4,
  },
  introText: {
    fontFamily: fontFamily.regular,
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 6,
  },
  sectionHint: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
  doneButton: {
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: '#0D0D0D',
  },
});

