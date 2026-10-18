import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { MapPin, Calendar, Folder, Eye, Users, Lock, Check, ChevronLeft, X, HardDrive } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { gold, useTheme } from '@bucketlist/ui';
import { styles } from '../styles/task-form.styles';
import { TagsRow } from '../../../components/TagsRow';
import type { TagItem } from '../../../components/TagPickerSheet';

type Visibility = 'public' | 'followers' | 'private';

const VISIBILITY_OPTIONS = [
  { value: 'public', title: 'Pública', subtitle: 'Cualquiera puede ver este momento', icon: Eye },
  { value: 'followers', title: 'Seguidores', subtitle: 'Solo tus seguidores pueden verlo', icon: Users },
  { value: 'private', title: 'Privada', subtitle: 'Solo tú puedes verlo', icon: Lock },
] as const;

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
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const effectiveVisibility: Visibility = visibilityValue ?? (isPublic === false ? 'private' : 'public');
  const handleVisibilityChange = (val: Visibility) => {
    onChangeVisibilityValue?.(val);
    onTogglePublic?.(val === 'public');
  };
  const currentVisibilityConfig =
    VISIBILITY_OPTIONS.find((o) => o.value === effectiveVisibility) ?? VISIBILITY_OPTIONS[0];
  const CurrentVisibilityIcon = currentVisibilityConfig.icon;
  return (
    <View style={[styles.settingsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {/* Ubicación */}
      <Pressable style={[styles.settingRow, { borderBottomColor: theme.colors.border }]} onPress={onOpenLocationPicker}>
        <MapPin color="#D4B13A" size={24} />
        <Text style={[styles.settingLabel, { color: theme.colors.foreground }]}>Ubicación</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
          <Text
            style={[styles.settingValue, !locationText && { color: '#6B6B6B' }, { flexShrink: 1 }]}
            numberOfLines={1}
          >
            {locationText || 'Sin ubicación'}
          </Text>
          {locationText ? (
            <Pressable
              hitSlop={10}
              onPress={(e) => {
                e.stopPropagation();
                onClearLocation();
              }}
              accessibilityLabel="Quitar ubicación"
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
        <Text style={[styles.settingLabel, { color: theme.colors.foreground }]}>Fecha límite</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.settingValue, !deadline && { color: '#6B6B6B' }]}>
            {deadline ? new Date(deadline).toLocaleDateString('es-ES') : 'Sin fecha'}
          </Text>
          {deadline ? (
            <Pressable
              hitSlop={10}
              onPress={(e) => {
                e.stopPropagation();
                onClearDate();
              }}
              accessibilityLabel="Quitar fecha límite"
            >
              <X color="#6B6B6B" size={18} />
            </Pressable>
          ) : (
            <ChevronLeft color="#6B6B6B" size={20} style={{ transform: [{ rotate: '180deg' }] }} />
          )}
        </View>
      </Pressable>
      {showDatePicker && (
        <DateTimePicker
          value={deadline ? new Date(deadline) : new Date()}
          mode="date"
          display="default"
          onChange={(_event, date) => onDateChange(date)}
        />
      )}

      {/* Álbum */}
      <Pressable style={[styles.settingRow, { borderBottomColor: theme.colors.border }]} onPress={onOpenAlbumPicker}>
        <Folder color="#D4B13A" size={24} />
        <Text style={[styles.settingLabel, { color: theme.colors.foreground }]}>Álbum</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={[styles.settingValue, !albumTitle && { color: '#6B6B6B' }]}>
            {albumTitle || 'Sin álbum'}
          </Text>
          <ChevronLeft color="#6B6B6B" size={20} style={{ transform: [{ rotate: '180deg' }] }} />
        </View>
      </Pressable>

      {/* Google Drive */}
      {onOpenDriveModal && (
        <Pressable style={[styles.settingRow, { borderBottomColor: theme.colors.border }]} onPress={onOpenDriveModal}>
          <HardDrive color="#D4B13A" size={24} />
          <Text style={[styles.settingLabel, { color: theme.colors.foreground }]}>Google Drive</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
            <Text
              style={[styles.settingValue, !driveUrl && { color: '#6B6B6B' }, { flexShrink: 1 }]}
              numberOfLines={1}
            >
              {driveUrl ? 'Carpeta vinculada' : 'Sin enlace'}
            </Text>
            {driveUrl ? (
              <Pressable
                hitSlop={10}
                onPress={(e) => {
                  e.stopPropagation();
                  onClearDriveUrl?.();
                }}
                accessibilityLabel="Quitar enlace de Drive"
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
        <Text style={[styles.settingLabel, { color: theme.colors.foreground }]}>Visibilidad</Text>
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
              <Text style={[styles.visibilitySheetTitle, { color: theme.colors.foreground }]}>Visibilidad</Text>
            </View>
            <View style={styles.visibilitySheetOptions}>
              {VISIBILITY_OPTIONS.map((item) => {
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
