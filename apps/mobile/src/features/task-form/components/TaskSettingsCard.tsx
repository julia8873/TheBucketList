import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { MapPin, Calendar, Folder, Eye, Users, Lock, Check, ChevronLeft, X, HardDrive } from 'lucide-react-native';
import { UniversalDatePicker } from '../../../components/UniversalDatePicker';
import { format } from 'date-fns';
import { gold, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { getDateFnsLocale } from '@/utils/dateLocale';
import { styles } from '../styles/task-form.styles';
import { TagsRow } from '../../../components/TagsRow';
import type { TagItem } from '../../../components/TagPickerSheet';

type Visibility = 'public' | 'followers' | 'private';

interface TaskSettingsCardProps {
  locationText: string;
  onOpenLocationPicker: () => void;
  onClearLocation: () => void;
  deadline: Date | null;
  showDatePicker: boolean;
  onOpenDatePicker: () => void;
  onDateChange: (date?: Date | null) => void;
  onClearDate: () => void;
  albumTitle: string | null;
  onOpenAlbumPicker: () => void;
  selectedTags: TagItem[];
  onChangeTags: (tags: TagItem[]) => void;
  driveUrl?: string | null;
  onOpenDriveModal?: () => void;
  onClearDriveUrl?: () => void;
  // Mode: switch (legacy compatibility)
  isPublic?: boolean;
  onTogglePublic?: (isPublic: boolean) => void;
  // Mode: chips / selector
  visibilityMode?: 'switch' | 'chips';
  visibilityValue?: Visibility;
  onChangeVisibilityValue?: (val: Visibility) => void;
}

export function TaskSettingsCard({
  locationText,
  onOpenLocationPicker,
  onClearLocation,
  deadline,
  showDatePicker,
  onOpenDatePicker,
  onDateChange,
  onClearDate,
  albumTitle,
  onOpenAlbumPicker,
  selectedTags,
  onChangeTags,
  driveUrl,
  onOpenDriveModal,
  onClearDriveUrl,
  isPublic = true,
  onTogglePublic,
  visibilityMode,
  visibilityValue,
  onChangeVisibilityValue,
}: TaskSettingsCardProps) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);

  const visibilityOptions = [
    {
      value: 'public' as const,
      title: t('task_form.vis_public_title', { defaultValue: 'Pública' }),
      subtitle: t('task_form.vis_public_sub', { defaultValue: 'Cualquiera puede ver este momento' }),
      icon: Eye,
    },
    {
      value: 'followers' as const,
      title: t('task_form.vis_followers_title', { defaultValue: 'Seguidores' }),
      subtitle: t('task_form.vis_followers_sub', { defaultValue: 'Solo tus seguidores pueden verlo' }),
      icon: Users,
    },
    {
      value: 'private' as const,
      title: t('task_form.vis_private_title', { defaultValue: 'Privada' }),
      subtitle: t('task_form.vis_private_sub', { defaultValue: 'Solo tú puedes verlo' }),
      icon: Lock,
    },
  ];

  const effectiveVisibility: Visibility = visibilityValue ?? (isPublic === false ? 'private' : 'public');
  const handleVisibilityChange = (val: Visibility) => {
    onChangeVisibilityValue?.(val);
    onTogglePublic?.(val === 'public');
  };
  const currentVisibilityConfig =
    visibilityOptions.find((o) => o.value === effectiveVisibility) ?? visibilityOptions[0]!;
  const CurrentVisibilityIcon = currentVisibilityConfig.icon;

  const formattedDeadline = deadline
    ? format(new Date(deadline), 'd MMMM yyyy', { locale: getDateFnsLocale(i18n.language) })
    : t('task_form.no_deadline', { defaultValue: 'Sin fecha' });

  return (
    <View style={[styles.settingsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {/* Ubicación */}
      <Pressable style={[styles.settingRow, { borderBottomColor: theme.colors.border }]} onPress={onOpenLocationPicker}>
        <MapPin color="#D4B13A" size={24} />
        <Text style={[styles.settingLabel, { color: theme.colors.foreground }]}>{t('task_form.location', { defaultValue: 'Ubicación' })}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
          <Text
            style={[styles.settingValue, !locationText && { color: '#6B6B6B' }, { flexShrink: 1 }]}
            numberOfLines={1}
          >
            {locationText || t('task_form.no_location', { defaultValue: 'Sin ubicación' })}
          </Text>
          {locationText ? (
            <Pressable
              hitSlop={10}
              onPress={(e) => {
                e.stopPropagation();
                onClearLocation();
              }}
              accessibilityLabel={t('task_form.remove_location', { defaultValue: 'Quitar ubicación' })}
            >
              <X color="#6B6B6B" size={18} />
            </Pressable>
          ) : (
            <ChevronLeft color="#6B6B6B" size={20} style={{ transform: [{ rotate: '180deg' }] }} />
          )}
        </View>
      </Pressable>

      {/* Fecha Límite */}
      <Pressable style={[styles.settingRow, { borderBottomColor: theme.colors.border }]} onPress={onOpenDatePicker}>
        <Calendar color="#D4B13A" size={24} />
        <Text style={[styles.settingLabel, { color: theme.colors.foreground }]}>{t('task_form.deadline', { defaultValue: 'Fecha límite' })}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.settingValue, !deadline && { color: '#6B6B6B' }]}>
            {formattedDeadline}
          </Text>
          {deadline ? (
            <Pressable
              hitSlop={10}
              onPress={(e) => {
                e.stopPropagation();
                onClearDate();
              }}
              accessibilityLabel={t('task_form.remove_deadline', { defaultValue: 'Quitar fecha límite' })}
            >
              <X color="#6B6B6B" size={18} />
            </Pressable>
          ) : (
            <ChevronLeft color="#6B6B6B" size={20} style={{ transform: [{ rotate: '180deg' }] }} />
          )}
        </View>
      </Pressable>
      {showDatePicker && (
        <UniversalDatePicker
          value={deadline ? new Date(deadline) : new Date()}
          onChange={(date) => onDateChange(date)}
          onClose={() => onDateChange(undefined)}
        />
      )}

      {/* Álbum */}
      <Pressable style={[styles.settingRow, { borderBottomColor: theme.colors.border }]} onPress={onOpenAlbumPicker}>
        <Folder color="#D4B13A" size={24} />
        <Text style={[styles.settingLabel, { color: theme.colors.foreground }]}>{t('task_form.album', { defaultValue: 'Álbum' })}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={[styles.settingValue, !albumTitle && { color: '#6B6B6B' }]}>
            {albumTitle || t('task_form.no_album', { defaultValue: 'Sin álbum' })}
          </Text>
          <ChevronLeft color="#6B6B6B" size={20} style={{ transform: [{ rotate: '180deg' }] }} />
        </View>
      </Pressable>

      {/* Google Drive */}
      {onOpenDriveModal && (
        <Pressable style={[styles.settingRow, { borderBottomColor: theme.colors.border }]} onPress={onOpenDriveModal}>
          <HardDrive color="#D4B13A" size={24} />
          <Text style={[styles.settingLabel, { color: theme.colors.foreground }]}>{t('task_form.drive', { defaultValue: 'Google Drive' })}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
            <Text
              style={[styles.settingValue, !driveUrl && { color: '#6B6B6B' }, { flexShrink: 1 }]}
              numberOfLines={1}
            >
              {driveUrl ? t('task_form.drive_linked', { defaultValue: 'Carpeta vinculada' }) : t('task_form.drive_no_link', { defaultValue: 'Sin enlace' })}
            </Text>
            {driveUrl ? (
              <Pressable
                hitSlop={10}
                onPress={(e) => {
                  e.stopPropagation();
                  onClearDriveUrl?.();
                }}
                accessibilityLabel={t('task_form.remove_drive', { defaultValue: 'Quitar enlace de Drive' })}
              >
                <X color="#6B6B6B" size={18} />
              </Pressable>
            ) : (
              <ChevronLeft color="#6B6B6B" size={20} style={{ transform: [{ rotate: '180deg' }] }} />
            )}
          </View>
        </Pressable>
      )}

      {/* Etiquetas */}
      <TagsRow selectedTags={selectedTags} onChange={onChangeTags} />

      {/* Visibilidad */}
      <Pressable
        style={[styles.settingRow, { borderBottomColor: theme.colors.border, borderBottomWidth: 0 }]}
        onPress={() => setShowVisibilityModal(true)}
      >
        <CurrentVisibilityIcon color="#D4B13A" size={24} />
        <Text style={[styles.settingLabel, { color: theme.colors.foreground }]}>{t('task_form.visibility', { defaultValue: 'Visibilidad' })}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.settingValue}>{currentVisibilityConfig.title}</Text>
          <ChevronLeft color="#6B6B6B" size={20} style={{ transform: [{ rotate: '180deg' }] }} />
        </View>
      </Pressable>

      {/* Modal selector de visibilidad (idéntico a BucketBottomSheet) */}
      <Modal
        visible={showVisibilityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVisibilityModal(false)}
      >
        <View style={styles.visibilityModalOverlay}>
          <Pressable style={styles.visibilityModalBackdrop} onPress={() => setShowVisibilityModal(false)} />
          <View
            style={[
              styles.visibilitySheetCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <View style={[styles.visibilitySheetHandle, { backgroundColor: theme.dark ? '#333333' : '#E0DCD3' }]} />
            <View style={styles.visibilitySheetHeader}>
              <Text style={[styles.visibilitySheetTitle, { color: theme.colors.foreground }]}>{t('task_form.visibility', { defaultValue: 'Visibilidad' })}</Text>
            </View>
            <View style={styles.visibilitySheetOptions}>
              {visibilityOptions.map((item) => {
                const IconComponent = item.icon;
                const isSelected = effectiveVisibility === item.value;
                return (
                  <Pressable
                    key={item.value}
                    style={[
                      styles.visibilitySheetOption,
                      {
                        backgroundColor: isSelected
                          ? (theme.dark ? '#262010' : '#FDF4DC')
                          : (theme.dark ? '#1A1A1A' : '#F7F5F0'),
                        borderColor: isSelected ? gold[400] : theme.colors.border,
                      },
                    ]}
                    onPress={() => {
                      handleVisibilityChange(item.value);
                      setShowVisibilityModal(false);
                    }}
                  >
                    <View
                      style={[
                        styles.visibilitySheetIcon,
                        {
                          backgroundColor: isSelected
                            ? 'rgba(212, 177, 58, 0.15)'
                            : (theme.dark ? '#262626' : '#ECE8DF'),
                        },
                      ]}
                    >
                      <IconComponent color={gold[400]} size={21} />
                    </View>
                    <View style={styles.visibilitySheetOptionText}>
                      <Text style={[styles.visibilitySheetOptionTitle, { color: theme.colors.foreground }]}>
                        {item.title}
                      </Text>
                      <Text style={[styles.visibilitySheetOptionSubtitle, { color: theme.colors.foregroundMuted }]}>
                        {item.subtitle}
                      </Text>
                    </View>
                    {isSelected && <Check color={gold[400]} size={21} />}
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
