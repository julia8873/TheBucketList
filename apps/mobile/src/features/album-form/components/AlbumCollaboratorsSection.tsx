import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Users, UserPlus, Plus, Lock, X } from 'lucide-react-native';
import { useTheme } from '@bucketlist/ui';
import { styles } from '../styles/album-form.styles';
import { SectionTitle } from './SectionTitle';
import type { CollaboratorItem } from '../../../components/CollaboratorPickerSheet';

interface AlbumCollaboratorsSectionProps {
  isShared: boolean;
  isOwner: boolean;
  onToggleShared: () => void;
  selectedCollaborators: CollaboratorItem[];
  readOnlyIds: string[];
  onOpenPicker: () => void;
  onRemoveCollaborator: (id: string) => void;
}

export function AlbumCollaboratorsSection({
  isShared,
  isOwner,
  onToggleShared,
  selectedCollaborators,
  readOnlyIds,
  onOpenPicker,
  onRemoveCollaborator,
}: AlbumCollaboratorsSectionProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <SectionTitle highlight="COLABORADORES" rest=" DEL ÁLBUM" />
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={[styles.cardRow, isShared && styles.cardRowBorder, isShared && { borderBottomColor: theme.colors.border }]}>
          <Users color="#D4B13A" size={22} strokeWidth={2} />
          <View style={styles.cardTexts}>
            <Text style={[styles.cardTitle, { color: theme.colors.foreground }]}>Álbum compartido</Text>
            <Text style={[styles.cardSubtitle, { color: theme.colors.foregroundMuted }]}>Comparte las tareas y completadlas juntos</Text>
          </View>
          <Pressable
            style={[
              styles.switchTrack,
              { backgroundColor: isShared ? '#D4B13A' : theme.dark ? '#262626' : '#E5E5E5' },
              !isOwner && { opacity: 0.6 },
            ]}
            onPress={() => {
              if (isOwner) onToggleShared();
            }}
          >
            <View
              style={[
                styles.switchKnob,
                { backgroundColor: isShared ? (theme.dark ? '#0D0D0D' : '#FFFFFF') : (theme.dark ? '#8F8F8F' : '#BBBBBB') },
                isShared && { transform: [{ translateX: 20 }] },
              ]}
            />
          </Pressable>
        </View>

        {isShared && (
          <View style={styles.collaboratorsContainer}>
            <Pressable
              style={[
                styles.addCollabRow,
                {
                  backgroundColor: theme.dark ? '#1A1A1A' : theme.colors.surfaceSunken,
                  borderColor: theme.colors.border,
                },
              ]}
              onPress={onOpenPicker}
            >
              <View style={styles.addCollabIconCircle}>
                <UserPlus size={18} color="#D4B13A" strokeWidth={1.8} />
              </View>
              <Text style={[styles.addCollabText, { color: theme.colors.foregroundMuted }]}>
                {selectedCollaborators.length === 0
                  ? 'Añadir colaboradores al álbum...'
                  : `${selectedCollaborators.length} colaborador${selectedCollaborators.length > 1 ? 'es' : ''} seleccionado${selectedCollaborators.length > 1 ? 's' : ''}`}
              </Text>
              <Plus color="#D4B13A" size={18} strokeWidth={2.5} />
            </Pressable>

            {selectedCollaborators.length > 0 && (
              <View style={styles.collaboratorChips}>
                {selectedCollaborators.map((c) => {
                  const isReadOnly = readOnlyIds.includes(c.id);
                  return (
                    <Pressable
                      key={c.id}
                      style={styles.collaboratorChip}
                      onPress={() => {
                        if (!isReadOnly) {
                          onRemoveCollaborator(c.id);
                        }
                      }}
                    >
                      <Text style={styles.collaboratorChipText}>
                        {c.display_name || `@${c.username}`}
                      </Text>
                      {isReadOnly ? (
                        <Lock color="#D4B13A" size={13} style={{ marginLeft: 4 }} />
                      ) : (
                        <X color="#D4B13A" size={14} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
