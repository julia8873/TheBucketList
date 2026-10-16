import React from 'react';
import { View, Text, Pressable, Switch } from 'react-native';
import { MapPin, Calendar, Folder, Globe, Eye, ChevronLeft, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TagChip } from '@bucketlist/ui';
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
  // Mode: switch
  isPublic?: boolean;
  onTogglePublic?: (isPublic: boolean) => void;
  // Mode: chips
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
  isPublic = true,
  onTogglePublic,
  visibilityMode = 'switch',
  visibilityValue = 'public',
  onChangeVisibilityValue,
}: TaskSettingsCardProps) {
  return (
    <View style={styles.settingsCard}>
      {/* Ubicación */}
      <Pressable style={styles.settingRow} onPress={onOpenLocationPicker}>
        <MapPin color="#D4B13A" size={24} />
        <Text style={styles.settingLabel}>Ubicación</Text>
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
      <Pressable style={styles.settingRow} onPress={onOpenDatePicker}>
        <Calendar color="#D4B13A" size={24} />
        <Text style={styles.settingLabel}>Fecha límite</Text>
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
      <Pressable style={styles.settingRow} onPress={onOpenAlbumPicker}>
        <Folder color="#D4B13A" size={24} />
        <Text style={styles.settingLabel}>Álbum</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={[styles.settingValue, !albumTitle && { color: '#6B6B6B' }]}>
            {albumTitle || 'Sin álbum'}
          </Text>
          <ChevronLeft color="#6B6B6B" size={20} style={{ transform: [{ rotate: '180deg' }] }} />
        </View>
      </Pressable>

      {/* Etiquetas */}
      <TagsRow selectedTags={selectedTags} onChange={onChangeTags} />

      {/* Visibilidad */}
      {visibilityMode === 'chips' ? (
        <>
          <View style={[styles.settingRow, { borderBottomWidth: 0, height: undefined, paddingVertical: 16 }]}>
            <Eye color="#D4B13A" size={24} />
            <Text style={styles.settingLabel}>Visible para</Text>
          </View>
          <View style={styles.visibilityRow}>
            {(['public', 'followers', 'private'] as const).map((value) => (
              <TagChip
                key={value}
                label={value === 'public' ? 'Pública' : value === 'followers' ? 'Seguidores' : 'Privada'}
                variant={visibilityValue === value ? 'selected' : 'default'}
                onPress={() => onChangeVisibilityValue?.(value)}
              />
            ))}
          </View>
        </>
      ) : (
        <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
          <Globe color="#D4B13A" size={24} />
          <Text style={styles.settingLabel}>Pública</Text>
          <Switch
            value={isPublic}
            onValueChange={onTogglePublic}
            trackColor={{ false: '#333', true: '#D4B13A' }}
            thumbColor={isPublic ? '#111' : '#E5E5E5'}
          />
        </View>
      )}
    </View>
  );
}
