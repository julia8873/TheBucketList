import React from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { PageTitle, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { CollaboratorPickerSheet } from '../../src/components/CollaboratorPickerSheet';
import { TagAssignSheet } from '../../src/components/TagAssignSheet';
import { AlbumTaskPickerSheet } from '../../src/components/AlbumTaskPickerSheet';

import { styles } from '../../src/features/album-form/styles/album-form.styles';
import { styles as formStyles } from '../../src/features/task-form/styles/task-form.styles';
import { SectionTitle } from '../../src/features/album-form/components/SectionTitle';
import { AlbumPreviewCard } from '../../src/features/album-form/components/AlbumPreviewCard';
import { CoverPickerSection } from '../../src/features/album-form/components/CoverPickerSection';
import { AlbumSettingsCard } from '../../src/features/album-form/components/AlbumSettingsCard';
import { AlbumTasksSection } from '../../src/features/album-form/components/AlbumTasksSection';
import { AlbumCollaboratorsSection } from '../../src/features/album-form/components/AlbumCollaboratorsSection';
import { TaskPriorityPicker } from '../../src/features/task-form/components/TaskPriorityPicker';
import { useAlbumFormData } from '../../src/features/album-form/hooks/useAlbumFormData';

export default function CreateAlbumScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [isNameFocused, setIsNameFocused] = React.useState(false);
  const [isDescFocused, setIsDescFocused] = React.useState(false);

  const {
    isEditing,
    name,
    setName,
    description,
    setDescription,
    priority,
    setPriority,
    selectedCover,
    setSelectedCover,
    visibility,
    setVisibility,
    isShared,
    setIsShared,
    isOwner,
    selectedCollaborators,
    setSelectedCollaborators,
    readOnlyIds,
    existingCollaboratorIds,
    showCollaboratorPicker,
    setShowCollaboratorPicker,
    selectedTags,
    showTagPicker,
    setShowTagPicker,
    handleTagPickerChange,
    selectedTasks,
    toggleTask,
    removeTask,
    existingTaskIds,
    showTaskPicker,
    setShowTaskPicker,
    loadingInitial,
    isSaving,
    handleSave,
  } = useAlbumFormData(id);

  if (loadingInitial) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#D4B13A" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 130 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Cabecera (igual que en tarea) */}
          <View style={[formStyles.header, { paddingHorizontal: 12 }]}>
            <Pressable
              style={[
                formStyles.backButton,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
              onPress={() => router.back()}
              accessibilityLabel={t('common.back', { defaultValue: 'Volver' })}
            >
              <ChevronLeft color={theme.colors.foreground} size={22} strokeWidth={2} />
            </Pressable>
            <PageTitle gold={isEditing ? t('common.edit') : t('albums.new')} rest={t('albums.album')} />
          </View>

          {/* Portada: vista previa compacta + selector */}
          <AlbumPreviewCard
            selectedCover={selectedCover}
            name={name}
            isShared={isShared}
            visibility={visibility}
            collaborators={selectedCollaborators}
          />
          <CoverPickerSection
            selectedCover={selectedCover}
            onSelectCover={setSelectedCover}
            albumTitle={name}
          />

          {/* Nombre */}
          <View style={styles.section}>
            <SectionTitle highlight={t('albums.section_name_highlight')} rest={t('albums.section_name_rest')} />
            <TextInput
              style={[
                formStyles.titleInput,
                {
                  height: 56,
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.foreground,
                },
                isNameFocused && { borderColor: '#D4B13A' },
              ]}
              value={name}
              onChangeText={setName}
              onFocus={() => setIsNameFocused(true)}
              onBlur={() => setIsNameFocused(false)}
              placeholder={t('albums.name_placeholder')}
              placeholderTextColor={theme.colors.foregroundMuted}
              accessibilityLabel={t('albums.name_label')}
            />
          </View>

          {/* Descripción */}
          <View style={styles.section}>
            <SectionTitle highlight={t('albums.section_desc_highlight')} rest={t('albums.section_desc_rest')} />
            <TextInput
              style={[
                formStyles.descInput,
                {
                  minHeight: 72,
                  paddingTop: 12,
                  paddingBottom: 12,
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.foreground,
                },
                isDescFocused && { borderColor: '#D4B13A' },
              ]}
              value={description}
              onChangeText={setDescription}
              onFocus={() => setIsDescFocused(true)}
              onBlur={() => setIsDescFocused(false)}
              placeholder={t('albums.description_placeholder')}
              placeholderTextColor={theme.colors.foregroundMuted}
              accessibilityLabel={t('albums.description_label')}
              multiline
            />
          </View>

          {/* Prioridad */}
          <View style={styles.section}>
            <SectionTitle highlight={t('task_form.section_priority')} rest="" />
            <TaskPriorityPicker value={priority as any} onChange={setPriority} />
          </View>

          {/* Ajustes: etiquetas, visibilidad y compartido */}
          <View style={styles.section}>
            <AlbumSettingsCard
              selectedTags={selectedTags}
              onChangeTags={handleTagPickerChange}
              visibility={visibility}
              onChangeVisibility={setVisibility}
              isShared={isShared}
              isOwner={isOwner}
              onToggleShared={() => setIsShared(!isShared)}
            />
          </View>

          {/* Tareas del álbum */}
          <AlbumTasksSection
            tasks={selectedTasks}
            onOpenPicker={() => setShowTaskPicker(true)}
            onRemoveTask={removeTask}
          />

          {/* Colaboradores (solo si el álbum es compartido) */}
          {isShared && (
            <AlbumCollaboratorsSection
              selectedCollaborators={selectedCollaborators}
              readOnlyIds={readOnlyIds}
              onOpenPicker={() => setShowCollaboratorPicker(true)}
              onRemoveCollaborator={(collabId) => {
                setSelectedCollaborators((prev) => prev.filter((x) => x.id !== collabId));
              }}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <CollaboratorPickerSheet
        visible={showCollaboratorPicker}
        selected={selectedCollaborators}
        onChange={setSelectedCollaborators}
        onClose={() => setShowCollaboratorPicker(false)}
        readOnlyIds={readOnlyIds}
        excludeIds={existingCollaboratorIds}
      />

      <TagAssignSheet
        visible={showTagPicker}
        selectedTags={selectedTags}
        onChange={handleTagPickerChange}
        onClose={() => setShowTagPicker(false)}
      />

      <AlbumTaskPickerSheet
        visible={showTaskPicker}
        selected={selectedTasks}
        excludeIds={existingTaskIds}
        onToggle={toggleTask}
        onClose={() => setShowTaskPicker(false)}
      />

      {/* Barra inferior fija (igual que en tarea) */}
      <View
        style={[
          formStyles.bottomBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <Pressable
          style={[formStyles.submitButton, (!name.trim() || isSaving) && { opacity: 0.5 }]}
          disabled={!name.trim() || isSaving}
          onPress={handleSave}
        >
          {isSaving ? (
            <ActivityIndicator color="#111" />
          ) : (
            <Text style={formStyles.submitText}>
              {isEditing ? t('common.save_changes') : t('albums.create_album')}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
