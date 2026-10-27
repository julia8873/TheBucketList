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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { PageTitle, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { CollaboratorPickerSheet } from '../../src/components/CollaboratorPickerSheet';
import { TagAssignSheet } from '../../src/components/TagAssignSheet';

import { styles } from '../../src/features/album-form/styles/album-form.styles';
import { SectionTitle } from '../../src/features/album-form/components/SectionTitle';
import { AlbumPreviewCard } from '../../src/features/album-form/components/AlbumPreviewCard';
import { CoverPickerSection } from '../../src/features/album-form/components/CoverPickerSection';
import { AlbumTagsSection } from '../../src/features/album-form/components/AlbumTagsSection';
import { AlbumCollaboratorsSection } from '../../src/features/album-form/components/AlbumCollaboratorsSection';
import { AlbumMetaSettingsSection } from '../../src/features/album-form/components/AlbumMetaSettingsSection';
import { useAlbumFormData } from '../../src/features/album-form/hooks/useAlbumFormData';

export default function CreateAlbumScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { t } = useTranslation();

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
    showCollaboratorPicker,
    setShowCollaboratorPicker,
    selectedTags,
    showTagPicker,
    setShowTagPicker,
    handleTagPickerChange,
    handleRemoveTag,
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          {/* Cabecera */}
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 52) }]}>
            <Pressable
              style={[
                styles.backBtn,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
              onPress={() => router.back()}
              accessibilityLabel={t('common.back', { defaultValue: 'Volver' })}
            >
              <ChevronLeft color={theme.colors.foreground} size={22} strokeWidth={2} />
            </Pressable>
            <PageTitle gold={isEditing ? t('common.edit') : t('albums.new')} rest={t('albums.album')} />
          </View>

          {/* Vista previa en vivo */}
          <AlbumPreviewCard
            selectedCover={selectedCover}
            name={name}
            isShared={isShared}
            visibility={visibility}
            collaborators={selectedCollaborators}
          />

          {/* Sección Portada */}
          <CoverPickerSection
            selectedCover={selectedCover}
            onSelectCover={setSelectedCover}
            albumTitle={name}
          />

          {/* Sección Nombre */}
          <View style={styles.section}>
            <SectionTitle highlight={t('albums.section_name_highlight')} rest={t('albums.section_name_rest')} />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.foreground,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder={t('albums.name_placeholder')}
              placeholderTextColor={theme.colors.foregroundMuted}
              accessibilityLabel={t('albums.name_label')}
            />
          </View>

          {/* Sección Descripción */}
          <View style={[styles.section, { marginBottom: 4 }]}>
            <SectionTitle highlight={t('albums.section_desc_highlight')} rest={t('albums.section_desc_rest')} />
            <TextInput
              style={[
                styles.input,
                {
                  minHeight: 88,
                  textAlignVertical: 'top',
                  fontSize: 16,
                  fontFamily: 'Inter_400Regular',
                  paddingTop: 16,
                  paddingBottom: 16,
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.foreground,
                },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('albums.description_placeholder')}
              placeholderTextColor={theme.colors.foregroundMuted}
              accessibilityLabel={t('albums.description_label')}
              multiline
            />
          </View>

          {/* Secciones Prioridad y Visibilidad */}
          <AlbumMetaSettingsSection
            priority={priority}
            onChangePriority={setPriority}
            visibility={visibility}
            onChangeVisibility={setVisibility}
          />

          {/* Sección Etiquetas del Álbum */}
          <AlbumTagsSection
            selectedTags={selectedTags}
            onOpenTagPicker={() => setShowTagPicker(true)}
            onRemoveTag={handleRemoveTag}
          />

          {/* Sección Compartir / Colaboradores */}
          <AlbumCollaboratorsSection
            isShared={isShared}
            isOwner={isOwner}
            onToggleShared={() => setIsShared(!isShared)}
            selectedCollaborators={selectedCollaborators}
            readOnlyIds={readOnlyIds}
            onOpenPicker={() => setShowCollaboratorPicker(true)}
            onRemoveCollaborator={(collabId) => {
              setSelectedCollaborators((prev) => prev.filter((x) => x.id !== collabId));
            }}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <CollaboratorPickerSheet
        visible={showCollaboratorPicker}
        selected={selectedCollaborators}
        onChange={setSelectedCollaborators}
        onClose={() => setShowCollaboratorPicker(false)}
        readOnlyIds={readOnlyIds}
      />

      <TagAssignSheet
        visible={showTagPicker}
        selectedTags={selectedTags}
        onChange={handleTagPickerChange}
        onClose={() => setShowTagPicker(false)}
      />

      {/* Barra inferior fija */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            paddingBottom: Math.max(insets.bottom, 24),
          },
        ]}
      >
        <Pressable
          style={[styles.createBtn, (!name.trim() || isSaving) && styles.createBtnDisabled]}
          disabled={!name.trim() || isSaving}
          onPress={handleSave}
        >
          {isSaving ? (
            <ActivityIndicator color="#0D0D0D" />
          ) : (
            <Text style={styles.createBtnText}>
              {isEditing ? t('common.save_changes') : t('albums.create_album')}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
