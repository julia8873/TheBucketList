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
import { PageTitle } from '@bucketlist/ui';
import { CollaboratorPickerSheet } from '../../src/components/CollaboratorPickerSheet';

import { styles } from '../../src/features/album-form/styles/album-form.styles';
import { SectionTitle } from '../../src/features/album-form/components/SectionTitle';
import { AlbumPreviewCard } from '../../src/features/album-form/components/AlbumPreviewCard';
import { CoverPickerSection } from '../../src/features/album-form/components/CoverPickerSection';
import { AlbumCollaboratorsSection } from '../../src/features/album-form/components/AlbumCollaboratorsSection';
import { AlbumMetaSettingsSection } from '../../src/features/album-form/components/AlbumMetaSettingsSection';
import { useAlbumFormData } from '../../src/features/album-form/hooks/useAlbumFormData';

export default function CreateAlbumScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();

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
    loadingInitial,
    isSaving,
    handleSave,
  } = useAlbumFormData(id);

  if (loadingInitial) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#D4B13A" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
          {/* Cabecera */}
          <View style={[styles.header, { paddingTop: Math.max(insets.top, 52) }]}>
            <Pressable style={styles.backBtn} onPress={() => router.back()}>
              <ChevronLeft color="#F3EEE3" size={22} strokeWidth={2} />
            </Pressable>
            <PageTitle gold={isEditing ? 'Editar' : 'Nuevo'} rest="álbum" />
          </View>

          {/* Vista previa en vivo */}
          <AlbumPreviewCard
            selectedCover={selectedCover}
            name={name}
            isShared={isShared}
            visibility={visibility}
            collaborators={selectedCollaborators}
          />

          {/* Sección Nombre */}
          <View style={styles.section}>
            <SectionTitle highlight="NOMBRE" rest=" DEL ÁLBUM" />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Ej. Viaje a Noruega"
              placeholderTextColor="#8F8F8F"
              accessibilityLabel="Nombre del álbum"
            />
          </View>

          {/* Sección Descripción */}
          <View style={[styles.section, { marginBottom: 4 }]}>
            <SectionTitle highlight="DESCRIPCIÓN" rest=" DEL ÁLBUM" />
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
                },
              ]}
              value={description}
              onChangeText={setDescription}
              placeholder="Añade una descripción (opcional)"
              placeholderTextColor="#8F8F8F"
              accessibilityLabel="Descripción del álbum"
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

          {/* Sección Portada */}
          <CoverPickerSection
            selectedCover={selectedCover}
            onSelectCover={setSelectedCover}
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

      {/* Barra inferior fija */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Pressable
          style={[styles.createBtn, (!name.trim() || isSaving) && styles.createBtnDisabled]}
          disabled={!name.trim() || isSaving}
          onPress={handleSave}
        >
          {isSaving ? (
            <ActivityIndicator color="#0D0D0D" />
          ) : (
            <Text style={styles.createBtnText}>
              {isEditing ? 'Guardar cambios' : 'Crear álbum'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
