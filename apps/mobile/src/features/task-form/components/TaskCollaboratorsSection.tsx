import { themedStyleSheet } from '@bucketlist/ui';
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Users, Plus, X, Lock, UserCheck, Zap, Globe } from 'lucide-react-native';
import { useTheme } from '@bucketlist/ui';
import { styles as formStyles } from '../styles/task-form.styles';
import type { CollaboratorItem } from '../../../components/CollaboratorPickerSheet';

export type TaskCollaborationMode = 'invite_only' | 'request' | 'open';
export type TaskCollaborationAudience = 'followers' | 'anyone';

interface TaskCollaboratorsSectionProps {
  selectedCollaborators: CollaboratorItem[];
  onOpenPicker: () => void;
  onRemoveCollaborator: (id: string) => void;
  collaborationMode?: TaskCollaborationMode;
  collaborationAudience?: TaskCollaborationAudience;
  onChangeCollaborationMode?: (mode: TaskCollaborationMode) => void;
  onChangeCollaborationAudience?: (audience: TaskCollaborationAudience) => void;
}

export function TaskCollaboratorsSection({
  selectedCollaborators,
  onOpenPicker,
  onRemoveCollaborator,
  collaborationMode = 'invite_only',
  collaborationAudience = 'followers',
  onChangeCollaborationMode,
  onChangeCollaborationAudience,
}: TaskCollaboratorsSectionProps) {
  const { theme } = useTheme();

  return (
    <View style={formStyles.collaboratorsContainer}>
      {/* Botón para invitar colaboradores específicos */}
      <Pressable
        style={[
          formStyles.collaboratorRow,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
        onPress={onOpenPicker}
      >
        <Users color="#D4B13A" size={22} />
        <Text
          style={[formStyles.collaboratorPlaceholder, { color: theme.colors.foregroundMuted }]}
          numberOfLines={1}
        >
          {selectedCollaborators.length === 0
            ? 'Añadir colaboradores a esta tarea...'
            : `${selectedCollaborators.length} colaborador${selectedCollaborators.length > 1 ? 'es' : ''} añadido${selectedCollaborators.length > 1 ? 's' : ''}`}
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
            >
              <Text style={formStyles.collaboratorChipText}>
                {c.display_name || `@${c.username}`}
              </Text>
              <X color="#D4B13A" size={14} />
            </Pressable>
          ))}
        </View>
      )}

      {/* Selector de Modo de Colaboración */}
      {onChangeCollaborationMode && (
        <View style={[localStyles.settingsBlock, { borderTopColor: theme.colors.border }]}>
          <Text style={[localStyles.blockLabel, { color: theme.colors.foregroundMuted }]}>
            ¿CÓMO PUEDEN COLABORAR OTROS USUARIOS?
          </Text>
          <View
            style={[
              localStyles.segmentRow,
              {
                backgroundColor: theme.dark ? '#161616' : (theme.colors.surfaceElevated ?? '#ECE8DF'),
                borderColor: theme.colors.border,
              },
            ]}
          >
            {/* Solo por invitación */}
            <Pressable
              style={[
                localStyles.segmentBtn,
                collaborationMode === 'invite_only' && localStyles.segmentBtnActive,
              ]}
              onPress={() => onChangeCollaborationMode('invite_only')}
            >
              <Lock
                size={13}
                color={collaborationMode === 'invite_only' ? '#0D0D0D' : theme.colors.foregroundMuted}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  localStyles.segmentBtnText,
                  { color: theme.colors.foregroundMuted },
                  collaborationMode === 'invite_only' && localStyles.segmentBtnTextActive,
                ]}
              >
                Solo invitación
              </Text>
            </Pressable>

            {/* Con solicitud */}
            <Pressable
              style={[
                localStyles.segmentBtn,
                collaborationMode === 'request' && localStyles.segmentBtnActive,
              ]}
              onPress={() => onChangeCollaborationMode('request')}
            >
              <UserCheck
                size={13}
                color={collaborationMode === 'request' ? '#0D0D0D' : theme.colors.foregroundMuted}
                strokeWidth={2.2}
              />
              <Text
                style={[
                  localStyles.segmentBtnText,
                  { color: theme.colors.foregroundMuted },
                  collaborationMode === 'request' && localStyles.segmentBtnTextActive,
                ]}
              >
                Con solicitud
              </Text>
            </Pressable>

            {/* Abierta (sin permiso) */}
            <Pressable
              style={[
                localStyles.segmentBtn,
                collaborationMode === 'open' && localStyles.segmentBtnActive,
              ]}
              onPress={() => onChangeCollaborationMode('open')}
            >
              <Zap
                size={13}
                color={collaborationMode === 'open' ? '#0D0D0D' : theme.colors.foregroundMuted}
                strokeWidth={2.4}
              />
              <Text
                style={[
                  localStyles.segmentBtnText,
                  { color: theme.colors.foregroundMuted },
                  collaborationMode === 'open' && localStyles.segmentBtnTextActive,
                ]}
              >
                Sin permiso
              </Text>
            </Pressable>
          </View>

          {/* Selector de Audiencia (Seguidores vs Todos) */}
          {collaborationMode !== 'invite_only' && onChangeCollaborationAudience && (
            <View style={{ marginTop: 12 }}>
              <Text style={[localStyles.blockLabel, { color: theme.colors.foregroundMuted }]}>
                ¿QUIÉN TIENE PERMITIDO UNIRSE O SOLICITAR?
              </Text>
              <View style={localStyles.audienceRow}>
                <Pressable
                  style={[
                    localStyles.audienceBtn,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                    collaborationAudience === 'followers' && localStyles.audienceBtnActive,
                  ]}
                  onPress={() => onChangeCollaborationAudience('followers')}
                >
                  <Users
                    size={14}
                    color={collaborationAudience === 'followers' ? '#D4B13A' : theme.colors.foregroundMuted}
                  />
                  <Text
                    style={[
                      localStyles.audienceBtnText,
                      { color: theme.colors.foregroundMuted },
                      collaborationAudience === 'followers' && localStyles.audienceBtnTextActive,
                    ]}
                  >
                    Solo seguidores
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    localStyles.audienceBtn,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                    collaborationAudience === 'anyone' && localStyles.audienceBtnActive,
                  ]}
                  onPress={() => onChangeCollaborationAudience('anyone')}
                >
                  <Globe
                    size={14}
                    color={collaborationAudience === 'anyone' ? '#D4B13A' : theme.colors.foregroundMuted}
                  />
                  <Text
                    style={[
                      localStyles.audienceBtnText,
                      { color: theme.colors.foregroundMuted },
                      collaborationAudience === 'anyone' && localStyles.audienceBtnTextActive,
                    ]}
                  >
                    Todos los usuarios
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const localStyles = themedStyleSheet({
  settingsBlock: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  blockLabel: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.9,
    marginBottom: 8,
  },
  segmentRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 9,
    gap: 5,
  },
  segmentBtnActive: {
    backgroundColor: '#D4B13A',
  },
  segmentBtnText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  segmentBtnTextActive: {
    color: '#0D0D0D',
  },
  audienceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  audienceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  audienceBtnActive: {
    borderColor: '#D4B13A',
    backgroundColor: 'rgba(212, 177, 58, 0.08)',
  },
  audienceBtnText: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
  },
  audienceBtnTextActive: {
    color: '#D4B13A',
    fontFamily: 'Inter_600SemiBold',
  },
});
