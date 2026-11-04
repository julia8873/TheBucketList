import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Users, Plus, X } from 'lucide-react-native';
import { useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { styles as formStyles } from '../styles/task-form.styles';
import type { CollaboratorItem } from '../../../components/CollaboratorPickerSheet';

interface TaskCollaboratorsSectionProps {
  selectedCollaborators: CollaboratorItem[];
  onOpenPicker: () => void;
  onRemoveCollaborator: (id: string) => void;
}

export function TaskCollaboratorsSection({
  selectedCollaborators,
  onOpenPicker,
  onRemoveCollaborator,
}: TaskCollaboratorsSectionProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={formStyles.collaboratorsContainer}>
      {/* Botón para invitar colaboradores específicos */}
      <Pressable
        style={[
          formStyles.collaboratorRow,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
        onPress={onOpenPicker}
        accessibilityRole="button"
        accessibilityLabel={
          selectedCollaborators.length === 0
            ? t('task_form.add_collaborators_placeholder', { defaultValue: 'Añadir colaboradores a esta tarea...' })
            : selectedCollaborators.length === 1
              ? t('task_form.collaborator_count_single', { defaultValue: '1 colaborador añadido' })
              : t('task_form.collaborator_count_plural', { count: selectedCollaborators.length, defaultValue: `${selectedCollaborators.length} colaboradores añadidos` })
        }
      >
        <Users color="#D4B13A" size={22} />
        <Text
          style={[formStyles.collaboratorPlaceholder, { color: theme.colors.foregroundMuted }]}
          numberOfLines={1}
        >
          {selectedCollaborators.length === 0
            ? t('task_form.add_collaborators_placeholder', { defaultValue: 'Añadir colaboradores a esta tarea...' })
            : selectedCollaborators.length === 1
              ? t('task_form.collaborator_count_single', { defaultValue: '1 colaborador añadido' })
              : t('task_form.collaborator_count_plural', { count: selectedCollaborators.length, defaultValue: `${selectedCollaborators.length} colaboradores añadidos` })}
        </Text>
        <Plus color="#D4B13A" size={20} />
      </Pressable>

      {selectedCollaborators.length > 0 && (
        <View style={formStyles.collaboratorChips}>
          {selectedCollaborators.map((c) => (
            <Pressable
              key={c.id}
              style={formStyles.collaboratorChip}
              onPress={() => onRemoveCollaborator(c.id)}
              accessibilityRole="button"
              accessibilityLabel={t('common.delete', { defaultValue: 'Eliminar' })}
            >
              <Text style={formStyles.collaboratorChipText}>
                {c.display_name || `@${c.username}`}
              </Text>
              <X color="#D4B13A" size={14} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
