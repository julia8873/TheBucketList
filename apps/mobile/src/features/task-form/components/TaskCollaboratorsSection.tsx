import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Users, Plus, X } from 'lucide-react-native';
import { styles } from '../styles/task-form.styles';
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
  return (
    <View style={styles.collaboratorsContainer}>
      <Pressable style={styles.collaboratorRow} onPress={onOpenPicker}>
        <Users color="#D4B13A" size={22} />
        <Text style={styles.collaboratorPlaceholder} numberOfLines={1}>
          {selectedCollaborators.length === 0
            ? 'Añadir colaboradores a esta tarea...'
            : `${selectedCollaborators.length} colaborador${selectedCollaborators.length > 1 ? 'es' : ''} añadido${selectedCollaborators.length > 1 ? 's' : ''}`}
        </Text>
        <Plus color="#D4B13A" size={20} />
      </Pressable>

      {selectedCollaborators.length > 0 && (
        <View style={styles.collaboratorChips}>
          {selectedCollaborators.map((c) => (
            <Pressable
              key={c.id}
              style={styles.collaboratorChip}
              onPress={() => onRemoveCollaborator(c.id)}
            >
              <Text style={styles.collaboratorChipText}>
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
