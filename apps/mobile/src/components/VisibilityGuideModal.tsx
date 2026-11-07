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
import {
  ChevronLeft,
  Shield,
  Globe,
  Users,
  Lock,
  UserCheck,
  FolderOpen,
  HelpCircle,
  FolderLock,
  Camera,
} from 'lucide-react-native';
import { fontFamily, gold, useTheme } from '@bucketlist/ui';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, SectionTitle } from './SettingsParts';

interface VisibilityGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export function VisibilityGuideModal({ visible, onClose }: VisibilityGuideModalProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const dims = useWindowDimensions();
  const win = Dimensions.get('window');
  const w = dims.width > 0 ? dims.width : win.width;
  const h = dims.height > 0 ? dims.height : win.height;
  const dialogWidth = Math.max(300, Math.min(460, w - 32));

  // Holgura superior e inferior amplia para que nunca quede pegado a la parte de arriba del móvil (notch / status bar)
  const topPadding = Math.max(insets.top, 32) + 24;
  const bottomPadding = Math.max(insets.bottom, 24) + 24;
  const dialogMaxHeight = Math.max(300, h - topPadding - bottomPadding);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.backdrop,
          {
            width: w,
            height: h,
            paddingTop: topPadding,
            paddingBottom: bottomPadding,
          },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.container,
            {
              width: dialogWidth,
              maxHeight: dialogMaxHeight,
              backgroundColor: theme.dark ? '#141414' : '#F6F4EE',
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Cabecera */}
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
                {t('settings.visibility_guide_title', { defaultValue: 'Visibilidad de las tareas' })}
              </Text>
            </View>
            <View style={styles.headerIcon}>
              <Shield size={18} color={gold[400]} />
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Introducción general */}
            <Text style={[styles.introText, { color: theme.colors.foregroundMuted }]}>
              {t('settings.visibility_guide_intro', {
                defaultValue:
                  'El nivel de privacidad de tu cuenta define tu alcance general, y la visibilidad de cada tarea define quién puede verla dentro de ese alcance.',
              })}
            </Text>

            {/* Tarjeta destacada FAQ: Cuenta privada vs Tarea pública */}
            <View
              style={[
                styles.highlightCard,
                {
                  backgroundColor: theme.dark ? 'rgba(212, 177, 58, 0.08)' : 'rgba(212, 177, 58, 0.12)',
                  borderColor: gold[400],
                },
              ]}
            >
              <View style={styles.highlightHeader}>
                <HelpCircle size={18} color={gold[400]} />
                <Text style={[styles.highlightTitle, { color: gold[400] }]}>
                  {t('settings.visibility_guide_faq_q', {
                    defaultValue: '¿Qué pasa si tu cuenta es privada pero tienes una tarea en público?',
                  })}
                </Text>
              </View>
              <Text style={[styles.highlightBody, { color: theme.colors.foreground }]}>
                {t('settings.visibility_guide_faq_a', {
                  defaultValue:
                    'La privacidad de tu cuenta siempre prevalece como escudo principal: tus tareas nunca aparecerán en el feed público de la comunidad ni ante desconocidos. Una tarea «Pública» en una cuenta privada será visible para todos tus seguidores aprobados, pero para nadie más.',
                })}
              </Text>
            </View>

            {/* Niveles de visibilidad */}
            <SectionTitle
              gold={t('settings.visibility_guide_levels_title', { defaultValue: 'Niveles de visibilidad de cada tarea' })}
            />
            <Card>
              {/* Pública */}
              <View style={styles.levelRow}>
                <View style={[styles.iconBadge, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                  <Globe size={18} color="#3B82F6" />
                </View>
                <View style={styles.levelContent}>
                  <Text style={[styles.levelTitle, { color: theme.colors.foreground }]}>
                    {t('settings.visibility_guide_public_title', { defaultValue: 'Pública' })}
                  </Text>
                  <Text style={[styles.levelDesc, { color: theme.colors.foregroundMuted }]}>
                    {t('settings.visibility_guide_public_desc', {
                      defaultValue:
                        'Visible para toda la comunidad y en el feed global si tu cuenta es pública. Si tu cuenta es privada, solo la verán tus seguidores aprobados.',
                    })}
                  </Text>
                </View>
              </View>

              {/* Solo seguidores */}
              <View style={[styles.levelRow, styles.rowBorderTop, { borderTopColor: theme.colors.border }]}>
                <View style={[styles.iconBadge, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                  <Users size={18} color="#A855F7" />
                </View>
                <View style={styles.levelContent}>
                  <Text style={[styles.levelTitle, { color: theme.colors.foreground }]}>
                    {t('settings.visibility_guide_followers_title', { defaultValue: 'Solo seguidores' })}
                  </Text>
                  <Text style={[styles.levelDesc, { color: theme.colors.foregroundMuted }]}>
                    {t('settings.visibility_guide_followers_desc', {
                      defaultValue:
                        'Visible únicamente para tus seguidores aprobados, sin importar si tu cuenta es pública o privada. Nunca aparece a personas que no te sigan.',
                    })}
                  </Text>
                </View>
              </View>

              {/* Privada */}
              <View style={[styles.levelRow, styles.rowBorderTop, { borderTopColor: theme.colors.border }]}>
                <View style={[styles.iconBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Lock size={18} color="#EF4444" />
                </View>
                <View style={styles.levelContent}>
                  <Text style={[styles.levelTitle, { color: theme.colors.foreground }]}>
                    {t('settings.visibility_guide_private_title', { defaultValue: 'Privada' })}
                  </Text>
                  <Text style={[styles.levelDesc, { color: theme.colors.foregroundMuted }]}>
                    {t('settings.visibility_guide_private_desc', {
                      defaultValue:
                        'Solo tú puedes ver esta tarea. Nadie más tiene acceso a ella, ni tus seguidores ni el resto de usuarios.',
                    })}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Casos especiales */}
            <SectionTitle
              gold={t('settings.visibility_guide_special_title', { defaultValue: 'Casos especiales' })}
            />
            <Card>
              {/* Colaboradores */}
              <View style={styles.levelRow}>
                <View style={[styles.iconBadge, { backgroundColor: 'rgba(212, 177, 58, 0.15)' }]}>
                  <UserCheck size={18} color={gold[400]} />
                </View>
                <View style={styles.levelContent}>
                  <Text style={[styles.levelTitle, { color: theme.colors.foreground }]}>
                    {t('settings.visibility_guide_collabs_title', { defaultValue: 'Colaboradores invitados' })}
                  </Text>
                  <Text style={[styles.levelDesc, { color: theme.colors.foregroundMuted }]}>
                    {t('settings.visibility_guide_collabs_desc', {
                      defaultValue:
                        'Las personas que invites a una tarea siempre podrán verla y participar en ella, incluso si la tarea es privada o si tu cuenta es privada.',
                    })}
                  </Text>
                </View>
              </View>

              {/* Álbumes */}
              <View style={[styles.levelRow, styles.rowBorderTop, { borderTopColor: theme.colors.border }]}>
                <View style={[styles.iconBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <FolderOpen size={18} color="#10B981" />
                </View>
                <View style={styles.levelContent}>
                  <Text style={[styles.levelTitle, { color: theme.colors.foreground }]}>
                    {t('settings.visibility_guide_albums_title', { defaultValue: 'Tareas dentro de álbumes' })}
                  </Text>
                  <Text style={[styles.levelDesc, { color: theme.colors.foregroundMuted }]}>
                    {t('settings.visibility_guide_albums_desc', {
                      defaultValue:
                        'Cada tarea conserva su propia visibilidad dentro del álbum. Si un álbum contiene tareas privadas, solo tú (y sus colaboradores) las veréis.',
                    })}
                  </Text>
                </View>
              </View>

              {/* Álbum privado con tareas públicas o para seguidores */}
              <View style={[styles.levelRow, styles.rowBorderTop, { borderTopColor: theme.colors.border }]}>
                <View style={[styles.iconBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <FolderLock size={18} color="#EF4444" />
                </View>
                <View style={styles.levelContent}>
                  <Text style={[styles.levelTitle, { color: theme.colors.foreground }]}>
                    {t('settings.visibility_guide_private_album_title', {
                      defaultValue: 'Álbum privado con tareas públicas o para seguidores',
                    })}
                  </Text>
                  <Text style={[styles.levelDesc, { color: theme.colors.foregroundMuted }]}>
                    {t('settings.visibility_guide_private_album_desc', {
                      defaultValue:
                        'Si un álbum es privado, nadie podrá ver ni abrir el álbum (solo tú y los colaboradores que invites). Sin embargo, las tareas públicas o para seguidores que estén dentro seguirán siendo visibles de forma individual según su propia configuración, pero nadie podrá ver el álbum ni sabrá que pertenecen a él.',
                    })}
                  </Text>
                </View>
              </View>

              {/* Fotos dentro de una tarea */}
              <View style={[styles.levelRow, styles.rowBorderTop, { borderTopColor: theme.colors.border }]}>
                <View style={[styles.iconBadge, { backgroundColor: 'rgba(212, 177, 58, 0.15)' }]}>
                  <Camera size={18} color={gold[400]} />
                </View>
                <View style={styles.levelContent}>
                  <Text style={[styles.levelTitle, { color: theme.colors.foreground }]}>
                    {t('settings.visibility_guide_photos_title', { defaultValue: 'Fotos dentro de las tareas' })}
                  </Text>
                  <Text style={[styles.levelDesc, { color: theme.colors.foregroundMuted }]}>
                    {t('settings.visibility_guide_photos_desc', {
                      defaultValue:
                        'Cada foto de una tarea puede tener su propia visibilidad (Pública, Seguidores o Privada). Aunque una tarea sea pública, las fotos marcadas como privadas solo las podrás ver tú (y los colaboradores), y las fotos para seguidores solo las verán las personas que te siguen.',
                    })}
                  </Text>
                </View>
              </View>
            </Card>
          </ScrollView>
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
    padding: 16,
  },
  container: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212, 177, 58, 0.12)',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },
  introText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  highlightCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 8,
    marginBottom: 4,
  },
  highlightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  highlightTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 13.5,
    flex: 1,
    lineHeight: 18,
  },
  highlightBody: {
    fontFamily: fontFamily.regular,
    fontSize: 12.5,
    lineHeight: 18,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowBorderTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  levelContent: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  levelTitle: {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    lineHeight: 18,
  },
  levelDesc: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16.5,
  },
});

