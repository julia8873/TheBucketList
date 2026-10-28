import { themedStyleSheet, Alert } from '@bucketlist/ui';
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  UserMinus,
  Lock,
  UserCheck,
  Zap,
  Users,
  Globe,
} from 'lucide-react-native';
import { useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { normalizeStorageUrl } from '@/constants/urls';
import { getInitials } from './BucketCollaboratorsRow';

export type CollaborationMode = 'invite_only' | 'request' | 'open';
export type CollaborationAudience = 'followers' | 'anyone';

export interface SettingsCollaborator {
  id: string;
  username?: string;
  display_name?: string | null;
  avatar_url?: string | null;
  status?: string;
  /** Es colaborador por un álbum compartido: se gestiona desde el álbum, no se puede quitar aquí. */
  viaAlbum?: boolean;
}

interface TaskCollaborationSettingsModalProps {
  visible: boolean;
  currentMode: CollaborationMode;
  currentAudience: CollaborationAudience;
  /** Colaboradores actuales y con invitación pendiente. */
  collaborators?: SettingsCollaborator[];
  /** Quita a un colaborador o cancela su invitación pendiente (solo el creador). */
  onRemoveCollaborator?: (userId: string) => Promise<void>;
  onClose: () => void;
  onSaveSettings: (mode: CollaborationMode, audience: CollaborationAudience) => Promise<void>;
}

export function TaskCollaborationSettingsModal({
  visible,
  currentMode,
  currentAudience,
  collaborators = [],
  onRemoveCollaborator,
  onClose,
  onSaveSettings,
}: TaskCollaborationSettingsModalProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<CollaborationMode>(currentMode);
  const [audience, setAudience] = useState<CollaborationAudience>(currentAudience);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const confirmRemove = (c: SettingsCollaborator) => {
    if (!onRemoveCollaborator) return;
    const name = c.display_name || c.username || '';
    const isPending = c.status === 'pending';
    Alert.alert(
      isPending
        ? t('collab_settings.cancel_invite_title', { defaultValue: 'Cancelar invitación' })
        : t('collab_settings.remove_title', { defaultValue: 'Quitar colaborador' }),
      isPending
        ? t('collab_settings.cancel_invite_msg', { name, defaultValue: `¿Cancelar la invitación a ${name}?` })
        : t('collab_settings.remove_msg', { name, defaultValue: `¿Quitar a ${name} como colaborador de esta tarea?` }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: isPending
            ? t('collab_settings.cancel_invite_confirm', { defaultValue: 'Cancelar invitación' })
            : t('collab_settings.remove_confirm', { defaultValue: 'Quitar' }),
          style: 'destructive',
          onPress: async () => {
            setRemovingId(c.id);
            try {
              await onRemoveCollaborator(c.id);
            } finally {
              setRemovingId(null);
            }
          },
        },
      ],
    );
  };

  React.useEffect(() => {
    if (visible) {
      setMode(currentMode);
      setAudience(currentAudience);
    }
  }, [visible, currentMode, currentAudience]);

  const handleSelectMode = async (newMode: CollaborationMode) => {
    setMode(newMode);
    setSaving(true);
    try {
      await onSaveSettings(newMode, audience);
    } finally {
      setSaving(false);
    }
  };

  const handleSelectAudience = async (newAudience: CollaborationAudience) => {
    setAudience(newAudience);
    setSaving(true);
    try {
      await onSaveSettings(mode, newAudience);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, paddingBottom: Math.max(insets.bottom, 20) + 12 }]}>
          {/* Handle */}
          <View style={[styles.dragHandle, { backgroundColor: theme.dark ? '#333333' : '#E0DCD3' }]} />

          {/* Cabecera */}
          <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
            <View>
              <Text style={[styles.title, { color: theme.colors.foreground }]}>{t('collab_settings.title')}</Text>
              <Text style={[styles.subtitle, { color: theme.colors.foregroundMuted }]}>{t('collab_settings.subtitle')}</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              style={[styles.closeBtn, { backgroundColor: theme.dark ? '#222222' : '#EAE6DD' }]}
            >
              <X size={20} color={theme.colors.foregroundMuted} />
            </Pressable>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Colaboradores actuales y pendientes */}
            <Text style={[styles.sectionHeading, { color: theme.colors.foregroundMuted }]}>
              {t('collab_settings.section_people', { defaultValue: 'COLABORADORES' })} ({collaborators.length})
            </Text>
            {collaborators.length === 0 ? (
              <Text style={[styles.emptyPeople, { color: theme.colors.foregroundMuted }]}>
                {t('collab_settings.no_collaborators', { defaultValue: 'Todavía no hay colaboradores en esta tarea.' })}
              </Text>
            ) : (
              <View style={{ marginBottom: 20 }}>
                {collaborators.map((c) => {
                  const isPending = c.status === 'pending';
                  const removing = removingId === c.id;
                  const canRemove = !!onRemoveCollaborator && !c.viaAlbum;
                  return (
                    <View
                      key={c.id}
                      style={[
                        styles.personRow,
                        {
                          backgroundColor: theme.colors.surfaceElevated ?? (theme.dark ? '#1C1C1C' : '#F7F5F0'),
                          borderColor: theme.colors.border,
                        },
                      ]}
                    >
                      {c.avatar_url ? (
                        <Image
                          source={{ uri: normalizeStorageUrl(c.avatar_url) }}
                          style={[styles.avatarImg, isPending && { opacity: 0.45 }]}
                          contentFit="cover"
                          cachePolicy="memory-disk"
                        />
                      ) : (
                        <View style={[styles.initialsCircle, { backgroundColor: theme.dark ? '#2A2A2A' : '#E5E1D8' }]}>
                          <Text style={styles.initialsText}>{getInitials(c.display_name || c.username)}</Text>
                        </View>
                      )}
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.userName, { color: theme.colors.foreground }]} numberOfLines={1}>
                          {c.display_name || c.username}
                        </Text>
                        <Text style={[styles.userHandle, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
                          @{c.username}
                          {isPending
                            ? ` · ${t('collab_settings.invite_pending', { defaultValue: 'Invitación pendiente' })}`
                            : c.viaAlbum
                              ? ` · ${t('collab_settings.via_album', { defaultValue: 'Por álbum compartido' })}`
                              : ''}
                        </Text>
                      </View>
                      {removing ? (
                        <ActivityIndicator size="small" color="#D4B13A" />
                      ) : canRemove ? (
                        <Pressable
                          onPress={() => confirmRemove(c)}
                          hitSlop={8}
                          style={[styles.removeBtn, { backgroundColor: theme.dark ? '#2B2B2B' : '#E5E1D8' }]}
                          accessibilityRole="button"
                          accessibilityLabel={
                            isPending
                              ? t('collab_settings.cancel_invite_title', { defaultValue: 'Cancelar invitación' })
                              : t('collab_settings.remove_title', { defaultValue: 'Quitar colaborador' })
                          }
                        >
                          <UserMinus size={16} color="#EF4444" strokeWidth={2} />
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Sección 1: Modo de colaboración */}
            <Text style={[styles.sectionHeading, { color: theme.colors.foregroundMuted }]}>{t('collab_settings.section_how')}</Text>

            {/* Opción A: Solo invitación */}
            <Pressable
              style={[
                styles.optionCard,
                {
                  backgroundColor: mode === 'invite_only'
                    ? (theme.dark ? 'rgba(212, 177, 58, 0.08)' : '#FDF7E7')
                    : (theme.colors.surfaceElevated ?? (theme.dark ? '#1C1C1C' : '#F7F5F0')),
                  borderColor: mode === 'invite_only' ? '#D4B13A' : theme.colors.border,
                },
              ]}
              onPress={() => handleSelectMode('invite_only')}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: theme.dark ? '#262626' : '#ECE8DF' }]}>
                <Lock size={20} color={mode === 'invite_only' ? '#D4B13A' : theme.colors.foregroundMuted} />
              </View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, { color: theme.colors.foreground }]}>
                  {t('collab_settings.mode_invite_title')}
                </Text>
                <Text style={[styles.optionDesc, { color: theme.colors.foregroundMuted }]}>
                  {t('collab_settings.mode_invite_desc')}
                </Text>
              </View>
              <View style={[styles.radio, { borderColor: theme.dark ? '#444444' : '#CCC8BD' }, mode === 'invite_only' && styles.radioActive]}>
                {mode === 'invite_only' && <View style={styles.radioDot} />}
              </View>
            </Pressable>

            {/* Opción B: Con solicitud */}
            <Pressable
              style={[
                styles.optionCard,
                {
                  backgroundColor: mode === 'request'
                    ? (theme.dark ? 'rgba(212, 177, 58, 0.08)' : '#FDF7E7')
                    : (theme.colors.surfaceElevated ?? (theme.dark ? '#1C1C1C' : '#F7F5F0')),
                  borderColor: mode === 'request' ? '#D4B13A' : theme.colors.border,
                },
              ]}
              onPress={() => handleSelectMode('request')}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: theme.dark ? '#262626' : '#ECE8DF' }]}>
                <UserCheck size={20} color={mode === 'request' ? '#D4B13A' : theme.colors.foregroundMuted} />
              </View>
              <View style={styles.optionContent}>
                <Text style={[styles.optionTitle, { color: theme.colors.foreground }]}>
                  {t('collab_settings.mode_request_title')}
                </Text>
                <Text style={[styles.optionDesc, { color: theme.colors.foregroundMuted }]}>
                  {t('collab_settings.mode_request_desc')}
                </Text>
              </View>
              <View style={[styles.radio, { borderColor: theme.dark ? '#444444' : '#CCC8BD' }, mode === 'request' && styles.radioActive]}>
                {mode === 'request' && <View style={styles.radioDot} />}
              </View>
            </Pressable>

            {/* Opción C: Colaboración abierta */}
            <Pressable
              style={[
                styles.optionCard,
                {
                  backgroundColor: mode === 'open'
                    ? (theme.dark ? 'rgba(212, 177, 58, 0.08)' : '#FDF7E7')
                    : (theme.colors.surfaceElevated ?? (theme.dark ? '#1C1C1C' : '#F7F5F0')),
                  borderColor: mode === 'open' ? '#D4B13A' : theme.colors.border,
                },
              ]}
              onPress={() => handleSelectMode('open')}
            >
              <View style={[styles.optionIconContainer, { backgroundColor: theme.dark ? '#262626' : '#ECE8DF' }]}>
                <Zap size={20} color={mode === 'open' ? '#D4B13A' : theme.colors.foregroundMuted} />
              </View>
              <View style={styles.optionContent}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.optionTitle, { color: theme.colors.foreground }]}>
                    {t('collab_settings.mode_open_title')}
                  </Text>
                  <View style={styles.openBadge}>
                    <Text style={styles.openBadgeText}>{t('collab_settings.mode_open_badge')}</Text>
                  </View>
                </View>
                <Text style={[styles.optionDesc, { color: theme.colors.foregroundMuted }]}>
                  {t('collab_settings.mode_open_desc')}
                </Text>
              </View>
              <View style={[styles.radio, { borderColor: theme.dark ? '#444444' : '#CCC8BD' }, mode === 'open' && styles.radioActive]}>
                {mode === 'open' && <View style={styles.radioDot} />}
              </View>
            </Pressable>

            {/* Sección 2: Audiencia permitida (solo visible si no es solo por invitación) */}
            {mode !== 'invite_only' && (
              <View style={{ marginTop: 20 }}>
                <Text style={[styles.sectionHeading, { color: theme.colors.foregroundMuted }]}>{t('collab_settings.section_who')}</Text>

                {/* Audiencia A: Solo seguidores */}
                <Pressable
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: audience === 'followers'
                        ? (theme.dark ? 'rgba(212, 177, 58, 0.08)' : '#FDF7E7')
                        : (theme.colors.surfaceElevated ?? (theme.dark ? '#1C1C1C' : '#F7F5F0')),
                      borderColor: audience === 'followers' ? '#D4B13A' : theme.colors.border,
                    },
                  ]}
                  onPress={() => handleSelectAudience('followers')}
                >
                  <View style={[styles.optionIconContainer, { backgroundColor: theme.dark ? '#262626' : '#ECE8DF' }]}>
                    <Users size={20} color={audience === 'followers' ? '#D4B13A' : theme.colors.foregroundMuted} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, { color: theme.colors.foreground }]}>
                      {t('collab_settings.audience_followers_title')}
                    </Text>
                    <Text style={[styles.optionDesc, { color: theme.colors.foregroundMuted }]}>
                      {mode === 'open' ? t('collab_settings.audience_followers_desc_open') : t('collab_settings.audience_followers_desc_request')}
                    </Text>
                  </View>
                  <View style={[styles.radio, { borderColor: theme.dark ? '#444444' : '#CCC8BD' }, audience === 'followers' && styles.radioActive]}>
                    {audience === 'followers' && <View style={styles.radioDot} />}
                  </View>
                </Pressable>

                {/* Audiencia B: Todos los usuarios */}
                <Pressable
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: audience === 'anyone'
                        ? (theme.dark ? 'rgba(212, 177, 58, 0.08)' : '#FDF7E7')
                        : (theme.colors.surfaceElevated ?? (theme.dark ? '#1C1C1C' : '#F7F5F0')),
                      borderColor: audience === 'anyone' ? '#D4B13A' : theme.colors.border,
                    },
                  ]}
                  onPress={() => handleSelectAudience('anyone')}
                >
                  <View style={[styles.optionIconContainer, { backgroundColor: theme.dark ? '#262626' : '#ECE8DF' }]}>
                    <Globe size={20} color={audience === 'anyone' ? '#D4B13A' : theme.colors.foregroundMuted} />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionTitle, { color: theme.colors.foreground }]}>
                      {t('collab_settings.audience_anyone_title')}
                    </Text>
                    <Text style={[styles.optionDesc, { color: theme.colors.foregroundMuted }]}>
                      {mode === 'open' ? t('collab_settings.audience_anyone_desc_open') : t('collab_settings.audience_anyone_desc_request')}
                    </Text>
                  </View>
                  <View style={[styles.radio, { borderColor: theme.dark ? '#444444' : '#CCC8BD' }, audience === 'anyone' && styles.radioActive]}>
                    {audience === 'anyone' && <View style={styles.radioDot} />}
                  </View>
                </Pressable>
              </View>
            )}

            {saving && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                <ActivityIndicator size="small" color="#D4B13A" />
                <Text style={{ color: '#D4B13A', fontSize: 13, fontFamily: 'Inter_500Medium' }}>
                  {t('collab_settings.saving')}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = themedStyleSheet({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
    ...Platform.select({
      web: {
        alignItems: 'center',
      },
    }),
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#262626',
    width: '100%',
    ...Platform.select({
      web: {
        maxWidth: 620,
        alignSelf: 'center',
        borderLeftWidth: 1,
        borderRightWidth: 1,
      },
    }),
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#242424',
  },
  title: {
    color: '#F5F5F5',
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    color: '#8E8E8E',
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: '#222222',
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 16,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  initialsCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#D4B13A',
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  userName: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  userHandle: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPeople: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginBottom: 20,
  },
  sectionHeading: {
    color: '#8E8E8E',
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1.1,
    marginBottom: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 14,
    marginBottom: 10,
  },
  optionCardActive: {
    borderColor: '#D4B13A',
    backgroundColor: 'rgba(212, 177, 58, 0.06)',
  },
  optionIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    color: '#E5E5E5',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  optionTitleActive: {
    color: '#F5F5F5',
  },
  optionDesc: {
    color: '#8A8A8A',
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
    lineHeight: 16,
  },
  openBadge: {
    backgroundColor: 'rgba(212, 177, 58, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  openBadgeText: {
    color: '#D4B13A',
    fontSize: 10,
    fontFamily: 'Inter_700Bold',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#444444',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  radioActive: {
    borderColor: '#D4B13A',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D4B13A',
  },
});
