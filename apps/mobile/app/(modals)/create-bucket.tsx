import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBucketSchema, type CreateBucketForm, processBucketImage } from '@bucketlist/shared';
import { useCreateBucket } from '../../src/hooks/useBuckets';
import { supabase } from '../../src/services/supabase';
import { storageApi } from '../../src/services/api/storage';
import { PageTitle } from '@bucketlist/ui';
import { LocationPickerModal } from '../../src/components/LocationPickerModal';
import type { TagItem } from '../../src/components/TagPickerSheet';
import { CollaboratorPickerSheet, type CollaboratorItem } from '../../src/components/CollaboratorPickerSheet';
import { AlbumPickerSheet } from '../../src/components/AlbumPickerSheet';
import { useAlbums } from '../../src/hooks/useAlbums';
import { useAuthStore } from '../../src/stores/auth.store';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

import { styles } from '../../src/features/task-form/styles/task-form.styles';
import { TaskCoverPicker } from '../../src/features/task-form/components/TaskCoverPicker';
import { TaskPriorityPicker } from '../../src/features/task-form/components/TaskPriorityPicker';
import { TaskSettingsCard } from '../../src/features/task-form/components/TaskSettingsCard';
import { TaskStepsSection, type TaskStepItem } from '../../src/features/task-form/components/TaskStepsSection';
import { TaskCollaboratorsSection } from '../../src/features/task-form/components/TaskCollaboratorsSection';

export default function CreateBucketModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ albumId?: string; title?: string }>();
  const createBucket = useCreateBucket();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { data: albums = [] } = useAlbums(user?.id);

  const [coverImage, setCoverImage] = useState<string>('preset:green');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [albumId, setAlbumId] = useState<string | null>(
    params.albumId && params.albumId !== 'new' ? String(params.albumId) : null
  );
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);

  const [steps, setSteps] = useState<TaskStepItem[]>([]);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [selectedTags, setSelectedTags] = useState<TagItem[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<CollaboratorItem[]>([]);
  const [showCollaboratorPicker, setShowCollaboratorPicker] = useState(false);
  const [collaborationMode, setCollaborationMode] = useState<'invite_only' | 'request' | 'open'>('invite_only');
  const [collaborationAudience, setCollaborationAudience] = useState<'followers' | 'anyone'>('followers');

  const { control, handleSubmit, setValue, watch } = useForm<CreateBucketForm>({
    resolver: zodResolver(createBucketSchema),
    defaultValues: {
      title: params.title ? String(params.title) : '',
      description: '',
      priority: 'medium',
      visibility: 'public',
      subtasks: [],
    },
  });

  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id;
      if (!id) return;
      const { data: p } = await supabase
        .from('profiles')
        .select('default_task_visibility')
        .eq('id', id)
        .maybeSingle();
      const v = (p as any)?.default_task_visibility;
      if (v === 'public' || v === 'followers' || v === 'private') setValue('visibility', v);
    });
  }, [setValue]);

  const titleValue = watch('title');
  const locationTextValue = watch('location_text') || '';
  const deadlineValue = watch('deadline');
  const visibilityValue = watch('visibility');

  const onSubmit = async (data: CreateBucketForm) => {
    try {
      data.subtasks = steps
        .filter((s) => s.title.trim() !== '')
        .map((s, i) => ({
          title: s.title.trim(),
          done: false,
          position: i,
        }));

      const tag_ids = selectedTags.map((t) => t.id);
      const collaborator_ids = selectedCollaborators.map((c) => c.id);
      let finalCoverImage: string | null = coverImage;

      if (coverImage && !coverImage.startsWith('preset:') && !coverImage.startsWith('http')) {
        setIsUploadingCover(true);
        try {
          const processed = await processBucketImage(coverImage);
          const path = `covers/${user?.id || 'anon'}_${Date.now()}.jpg`;
          finalCoverImage = await storageApi.uploadSingle(path, processed.original.uri);
        } catch (uploadErr) {
          console.error('Failed to upload cover image, using local fallback:', uploadErr);
        } finally {
          setIsUploadingCover(false);
        }
      }

      const payload = {
        ...data,
        cover_image: finalCoverImage,
        album_id: albumId,
        tag_ids,
        collaborator_ids,
        collaboration_mode: collaborationMode,
        collaboration_audience: collaborationAudience,
      } as any;

      createBucket.mutate(payload, {
        onSuccess: () => {
          router.back();
        },
        onError: (error) => {
          console.error('Failed to create bucket:', error);
          Alert.alert('No se pudo crear la tarea', (error as Error)?.message ?? 'Inténtalo de nuevo.');
        },
      });
    } catch (err: any) {
      setIsUploadingCover(false);
      Alert.alert('Error al preparar la tarea', err?.message || 'Inténtalo de nuevo.');
    }
  };

  const onInvalid = (errs: Record<string, any>) => {
    console.warn('Formulario inválido:', errs);
    const first = Object.values(errs)[0] as any;
    Alert.alert('Revisa la tarea', first?.message ?? 'Faltan datos por completar.');
  };

  const selectedAlbumTitle = albumId
    ? albums.find((a) => a.id === albumId)?.title || 'Seleccionado'
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0E0E0E' }} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* CABECERA */}
          <View style={styles.header}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <ChevronLeft color="#FFF" size={28} />
            </Pressable>
            <PageTitle gold="Nueva" rest="tarea" />
          </View>

          {/* QUÉ QUIERES LOGRAR */}
          <Text style={styles.sectionLabel}>
            <Text style={{ color: '#D4B13A' }}>QUÉ</Text> QUIERES LOGRAR
          </Text>
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[styles.titleInput, isTitleFocused && { borderColor: '#D4B13A' }]}
                placeholder="Ej. Ver auroras boreales"
                placeholderTextColor="#6B6B6B"
                value={value}
                onChangeText={onChange}
                onFocus={() => setIsTitleFocused(true)}
                onBlur={() => setIsTitleFocused(false)}
              />
            )}
          />

          {/* PORTADA */}
          <Text style={styles.sectionLabel}>
            <Text style={{ color: '#D4B13A' }}>TU</Text> PORTADA
          </Text>
          <TaskCoverPicker coverImage={coverImage} onChangeCover={setCoverImage} taskTitle={titleValue} />

          {/* PRIORIDAD */}
          <Text style={styles.sectionLabel}>
            <Text style={{ color: '#D4B13A' }}>PRIORIDAD</Text>
          </Text>
          <Controller
            control={control}
            name="priority"
            render={({ field: { onChange, value } }) => (
              <TaskPriorityPicker value={(value as any) || 'medium'} onChange={onChange} />
            )}
          />

          {/* AJUSTES */}
          <TaskSettingsCard
            locationText={locationTextValue}
            onOpenLocationPicker={() => setIsEditingLocation(true)}
            onClearLocation={() => {
              setValue('location_text', '');
              setValue('location_lat', null);
              setValue('location_lng', null);
            }}
            deadline={deadlineValue ? new Date(deadlineValue) : null}
            showDatePicker={showDatePicker}
            onOpenDatePicker={() => setShowDatePicker(true)}
            onDateChange={(date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) setValue('deadline', date);
            }}
            onClearDate={() => setValue('deadline', null)}
            albumTitle={selectedAlbumTitle}
            onOpenAlbumPicker={() => setShowAlbumPicker(true)}
            selectedTags={selectedTags}
            onChangeTags={setSelectedTags}
            isPublic={visibilityValue === 'public'}
            onTogglePublic={(pub) => setValue('visibility', pub ? 'public' : 'private')}
          />

          {/* PASOS */}
          <Text style={styles.sectionLabel}>
            <Text style={{ color: '#D4B13A' }}>PASOS</Text> · {steps.length}
          </Text>
          <TaskStepsSection
            steps={steps}
            onAddStep={() => setSteps([...steps, { id: Math.random().toString(), title: '' }])}
            onUpdateStep={(id, text) =>
              setSteps(steps.map((s) => (s.id === id ? { ...s, title: text } : s)))
            }
            onRemoveStep={(id) => setSteps(steps.filter((s) => s.id !== id))}
          />

          {/* COLABORADORES */}
          <Text style={styles.sectionLabel}>
            <Text style={{ color: '#D4B13A' }}>COLABORADORES</Text>
            {selectedCollaborators.length > 0 ? ` · ${selectedCollaborators.length}` : ''}
          </Text>
          <TaskCollaboratorsSection
            selectedCollaborators={selectedCollaborators}
            onOpenPicker={() => setShowCollaboratorPicker(true)}
            onRemoveCollaborator={(collabId) =>
              setSelectedCollaborators((prev) => prev.filter((x) => x.id !== collabId))
            }
            collaborationMode={collaborationMode}
            collaborationAudience={collaborationAudience}
            onChangeCollaborationMode={setCollaborationMode}
            onChangeCollaborationAudience={setCollaborationAudience}
          />
        </ScrollView>

        <CollaboratorPickerSheet
          visible={showCollaboratorPicker}
          selected={selectedCollaborators}
          onChange={setSelectedCollaborators}
          onClose={() => setShowCollaboratorPicker(false)}
        />

        <AlbumPickerSheet
          visible={showAlbumPicker}
          selectedAlbumId={albumId}
          onSelectAlbum={setAlbumId}
          onClose={() => setShowAlbumPicker(false)}
        />

        <LocationPickerModal
          visible={isEditingLocation}
          value={locationTextValue}
          onChangeLocation={(loc) => {
            setValue('location_text', loc?.text || '');
            setValue('location_lat', loc ? loc.lat : null);
            setValue('location_lng', loc ? loc.lng : null);
          }}
          onClose={() => setIsEditingLocation(false)}
        />

        {/* BOTTOM BAR */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            style={[
              styles.submitButton,
              (!titleValue || createBucket.isPending || isUploadingCover) && { opacity: 0.5 },
            ]}
            onPress={() => void handleSubmit(onSubmit, onInvalid)()}
            disabled={!titleValue || createBucket.isPending || isUploadingCover}
          >
            {createBucket.isPending || isUploadingCover ? (
              <ActivityIndicator color="#111" />
            ) : (
              <Text style={styles.submitText}>Añadir a mi lista</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}