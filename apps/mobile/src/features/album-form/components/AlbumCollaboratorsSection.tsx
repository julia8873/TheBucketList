import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Users, Plus, Lock, X } from 'lucide-react-native';
import { useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { styles as formStyles } from '../../task-form/styles/task-form.styles';
import { styles } from '../styles/album-form.styles';
import type { CollaboratorItem } from '../../../components/CollaboratorPickerSheet';

interface AlbumCollaboratorsSectionProps {
  selectedCollaborators: CollaboratorItem[];
  readOnlyIds: string[];
  onOpenPicker: () => void;
  onRemoveCollaborator: (id: string) => void;
}

/**
 * Colaboradores del álbum, con el mismo diseño que en el formulario de tarea.
 * El interruptor de «álbum compartido» vive ahora en la tarjeta de ajustes; esta sección
 * solo se muestra cuando el álbum es compartido.
 */
export function AlbumCollaboratorsSection({
  selectedCollaborators,
  readOnlyIds,
  onOpenPicker,
  onRemoveCollaborator,
}: AlbumCollaboratorsSectionProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const label =
    selectedCollaborators.length === 0
      ? t('albums.add_collaborators_placeholder')
      : t('albums.collaborators_selected_count', { count: selectedCollaborators.length });

  return (
    <View style={styles.section}>
      <Text style={[formStyles.sectionLabel, { color: theme.colors.foreground, marginTop: 0 }]}>
        <Text style={{ color: '#D4B13A' }}>{t('task_form.section_collaborators')}</Text>
        {selectedCollaborators.length > 0 ? ` · ${selectedCollaborators.length}` : ''}
      </Text>

      <Pressable
        style={[
          formStyles.collaboratorRow,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, height: 54, marginTop: 0 },
        ]}
        onPress={onOpenPicker}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <Users color="#D4B13A" size={22} />
        <Text style={[formStyles.collaboratorPlaceholder, { color: theme.colors.foregroundMuted }]} numberOfLines={1}>
          {label}
        </Text>
        <Plus color="#D4B13A" size={20} />
      </Pressable>

      {selectedCollaborators.length > 0 && (
        <View style={formStyles.collaboratorChips}>
          {selectedCollaborators.map((c) => {
            const isReadOnly = readOnlyIds.includes(c.id);
            return (
              <Pressable
                key={c.id}
                style={formStyles.collaboratorChip}
                onPress={() => {
                  if (!isReadOnly) onRemoveCollaborator(c.id);
                }}
                accessibilityRole="button"
              >
                <Text style={formStyles.collaboratorChipText}>{c.display_name || `@${c.username}`}</Text>
                {isReadOnly ? <Lock color="#D4B13A" size={13} style={{ marginLeft: 4 }} /> : <X color="#D4B13A" size={14} />}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
