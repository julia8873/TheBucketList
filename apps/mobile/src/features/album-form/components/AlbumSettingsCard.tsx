import React, { useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Eye, Users, Lock, Check, ChevronLeft } from 'lucide-react-native';
import { gold, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { styles as formStyles } from '../../task-form/styles/task-form.styles';
import { styles } from '../styles/album-form.styles';
import { TagsRow } from '../../../components/TagsRow';
import type { TagItem } from '../../../components/TagAssignSheet';
import type { AlbumVisibility } from '../types';

interface AlbumSettingsCardProps {
  selectedTags: TagItem[];
  onChangeTags: (tags: TagItem[]) => void;
  visibility: AlbumVisibility;
  onChangeVisibility: (visibility: AlbumVisibility) => void;
  isShared: boolean;
  isOwner: boolean;
  onToggleShared: () => void;
}

const ROW_HEIGHT = 58;

/** Tarjeta de ajustes del álbum (etiquetas, visibilidad, compartido): mismo diseño que la de tarea. */
export function AlbumSettingsCard({
  selectedTags,
  onChangeTags,
  visibility,
  onChangeVisibility,
  isShared,
  isOwner,
  onToggleShared,
}: AlbumSettingsCardProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);

  const options = [
    { value: 'public' as const, title: t('albums.visibility_public'), subtitle: t('albums.visibility_public_desc'), icon: Eye },
    { value: 'followers' as const, title: t('albums.visibility_followers'), subtitle: t('albums.visibility_followers_desc'), icon: Users },
    { value: 'private' as const, title: t('albums.visibility_private'), subtitle: t('albums.visibility_private_desc'), icon: Lock },
  ];
  const current = options.find((o) => o.value === visibility) ?? options[2]!;
  const CurrentIcon = current.icon;

  return (
    <View style={[formStyles.settingsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginTop: 0 }]}>
      {/* Etiquetas */}
      <TagsRow selectedTags={selectedTags} onChange={onChangeTags} compact />

      {/* Visibilidad */}
      <Pressable
        style={[formStyles.settingRow, { height: ROW_HEIGHT, borderBottomColor: theme.colors.border }]}
        onPress={() => setShowVisibilityModal(true)}
        accessibilityRole="button"
      >
        <CurrentIcon color="#D4B13A" size={24} />
        <Text style={[formStyles.settingLabel, { fontSize: 17, color: theme.colors.foreground }]}>
          {t('task_form.visibility')}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[formStyles.settingValue, { fontSize: 16 }]}>{current.title}</Text>
          <ChevronLeft color="#6B6B6B" size={20} style={{ transform: [{ rotate: '180deg' }] }} />
        </View>
      </Pressable>

      {/* Álbum compartido */}
      <View style={[formStyles.settingRow, { height: ROW_HEIGHT, borderBottomWidth: 0 }]}>
        <Users color="#D4B13A" size={24} />
        <Text style={[formStyles.settingLabel, { fontSize: 17, color: theme.colors.foreground }]} numberOfLines={1}>
          {t('albums.shared_album')}
        </Text>
        <Pressable
          style={[
            styles.switchTrack,
            { backgroundColor: isShared ? '#D4B13A' : theme.dark ? '#262626' : '#E5E5E5' },
            !isOwner && { opacity: 0.6 },
          ]}
          onPress={() => {
            if (isOwner) onToggleShared();
          }}
          accessibilityRole="switch"
          accessibilityState={{ checked: isShared }}
          accessibilityLabel={t('albums.shared_album')}
        >
          <View
            style={[
              styles.switchKnob,
              { backgroundColor: isShared ? (theme.dark ? '#0D0D0D' : '#FFFFFF') : theme.dark ? '#8F8F8F' : '#BBBBBB' },
              isShared && { transform: [{ translateX: 20 }] },
            ]}
          />
        </Pressable>
      </View>

      {/* Selector de visibilidad */}
      <Modal
        visible={showVisibilityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVisibilityModal(false)}
      >
        <View style={formStyles.visibilityModalOverlay}>
          <Pressable style={formStyles.visibilityModalBackdrop} onPress={() => setShowVisibilityModal(false)} />
          <View
            style={[
              formStyles.visibilitySheetCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <View style={[formStyles.visibilitySheetHandle, { backgroundColor: theme.dark ? '#333333' : '#E0DCD3' }]} />
            <View style={formStyles.visibilitySheetHeader}>
              <Text style={[formStyles.visibilitySheetTitle, { color: theme.colors.foreground }]}>
                {t('task_form.visibility')}
              </Text>
            </View>
            <View style={formStyles.visibilitySheetOptions}>
              {options.map((item) => {
                const Icon = item.icon;
                const isSelected = visibility === item.value;
                return (
                  <Pressable
                    key={item.value}
                    style={[
                      formStyles.visibilitySheetOption,
                      {
                        backgroundColor: isSelected
                          ? theme.dark ? '#262010' : '#FDF4DC'
                          : theme.dark ? '#1A1A1A' : '#F7F5F0',
                        borderColor: isSelected ? gold[400] : theme.colors.border,
                      },
                    ]}
                    onPress={() => {
                      onChangeVisibility(item.value);
                      setShowVisibilityModal(false);
                    }}
                  >
                    <View
                      style={[
                        formStyles.visibilitySheetIcon,
                        {
                          backgroundColor: isSelected
                            ? 'rgba(212, 177, 58, 0.15)'
                            : theme.dark ? '#262626' : '#ECE8DF',
                        },
                      ]}
                    >
                      <Icon color={gold[400]} size={21} />
                    </View>
                    <View style={formStyles.visibilitySheetOptionText}>
                      <Text style={[formStyles.visibilitySheetOptionTitle, { color: theme.colors.foreground }]}>
                        {item.title}
                      </Text>
                      <Text style={[formStyles.visibilitySheetOptionSubtitle, { color: theme.colors.foregroundMuted }]}>
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
