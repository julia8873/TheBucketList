import { Alert } from '@bucketlist/ui';
import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBucketSchema, type CreateBucketForm } from '@bucketlist/shared';
import { useCreateBucket } from '../../src/hooks/useBuckets';
import { supabase } from '../../src/services/supabase';
import { storageApi } from '../../src/services/api/storage';
import { PageTitle, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { LocationPickerModal } from '../../src/components/LocationPickerModal';
import type { TagItem } from '../../src/components/TagPickerSheet';
import { CollaboratorPickerSheet, type CollaboratorItem } from '../../src/components/CollaboratorPickerSheet';
import { AlbumPickerSheet } from '../../src/components/AlbumPickerSheet';
import { GoogleDriveModal } from '../../src/components/GoogleDriveModal';
import { useAlbums } from '../../src/hooks/useAlbums';
import { useAuthStore } from '../../src/stores/auth.store';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

import { styles } from '../../src/features/task-form/styles/task-form.styles';
import { SectionTitle } from '../../src/features/task-form/components/SectionTitle';
import { TaskCoverPicker } from '../../src/features/task-form/components/TaskCoverPicker';
import { TaskPriorityPicker } from '../../src/features/task-form/components/TaskPriorityPicker';
import { TaskSettingsCard } from '../../src/features/task-form/components/TaskSettingsCard';
import { TaskStepsSection, type TaskStepItem } from '../../src/features/task-form/components/TaskStepsSection';
import { TaskCollaboratorsSection } from '../../src/features/task-form/components/TaskCollaboratorsSection';

export default function CreateBucketModal() {
  const router = useRouter();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ albumId?: string; title?: string }>();
  const createBucket = useCreateBucket();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const { data: albums = [] } = useAlbums(user?.id);

  const [coverImage, setCoverImage] = useState<string>('preset:green');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [albumId, setAlbumId] = useState<string | null>(
    params.albumId && params.albumId !== 'new' ? String(params.albumId) : null
  );
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);
  const [driveUrl, setDriveUrl] = useState<string | null>(null);
  const [showDriveModal, setShowDriveModal] = useState(false);

  const [steps, setSteps] = useState<TaskStepItem[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const titleSectionY = useRef(0);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [isDescFocused, setIsDescFocused] = useState(false);
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
    // Si la tarea se crea dentro de un álbum, usar preferentemente la visibilidad del álbum
    if (params.albumId && params.albumId !== 'new') {
      void supabase
        .from('albums')
        .select('visibility')
        .eq('id', params.albumId)
        .maybeSingle()
        .then(({ data }) => {
          const albumVis = data?.visibility;
          if (albumVis === 'public' || albumVis === 'followers' || albumVis === 'private') {
            setValue('visibility', albumVis);
            return;
          }
        });
    }

    void supabase.auth.getUser().then(async ({ data }) => {
      const id = data.user?.id;
      if (!id) return;
      const { data: p } = await supabase
        .from('profiles')
        .select('default_task_visibility')
        .eq('id', id)
        .maybeSingle();
      const v = (p as any)?.default_task_visibility;
      if ((v === 'public' || v === 'followers' || v === 'private') && (!params.albumId || params.albumId === 'new')) {
        setValue('visibility', v);
      }
    });
  }, [params.albumId, setValue]);

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

      const isPreset = !!coverImage && coverImage.startsWith('preset:');
      const isAlreadyOurStorage = !!coverImage && (
        coverImage.includes('/storage/v1/object/public/photos/') ||
        (coverImage.startsWith('covers/') && !coverImage.includes('://'))
      );

      if (coverImage && !isPreset && !isAlreadyOurStorage) {
        setIsUploadingCover(true);
        try {
          finalCoverImage = await storageApi.uploadCover(user?.id || 'anon', coverImage);
        } catch (uploadErr) {
          // Nunca guardar la URI local / base64 / URL externa larga en la BD: viola la restricción o dispara el egress.
          console.error('Failed to upload cover image, saving without cover:', uploadErr);
          finalCoverImage = null;
        } finally {
          setIsUploadingCover(false);
        }
      }

      const payload = {
        ...data,
        cover_image: finalCoverImage,
        drive_url: driveUrl,
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
          Alert.alert(
            t('task_form.alert_create_error_title', { defaultValue: 'No se pudo crear la tarea' }),
            (error)?.message ?? t('common.retry', { defaultValue: 'Inténtalo de nuevo.' })
          );
        },
      });
    } catch (err: any) {
      setIsUploadingCover(false);
      Alert.alert(
        t('task_form.alert_prepare_error_title', { defaultValue: 'Error al preparar la tarea' }),
        err?.message || t('common.retry', { defaultValue: 'Inténtalo de nuevo.' })
      );
    }
  };

  const onInvalid = (errs: Record<string, any>) => {
    console.warn('Formulario inválido:', errs);
    const first = Object.values(errs)[0];
    Alert.alert(
      t('task_form.alert_invalid_title', { defaultValue: 'Revisa la tarea' }),
      first?.message ?? t('task_form.alert_invalid_msg', { defaultValue: 'Faltan datos por completar.' })
    );
  };

  const selectedAlbumTitle = albumId
    ? albums.find((a) => a.id === albumId)?.title || 'Seleccionado'
    : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* CABECERA */}
          <View style={styles.header}>
            <Pressable
              style={[
                styles.backButton,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
              onPress={() => router.back()}
              accessibilityLabel={t('common.back', { defaultValue: 'Volver' })}
            >
              <ChevronLeft color={theme.colors.foreground} size={22} strokeWidth={2} />
            </Pressable>
            <PageTitle
              gold={t('task_form.new_task_gold', { defaultValue: 'Nueva' })}
              rest={t('task_form.new_task_rest', { defaultValue: 'tarea' })}
            />
          </View>

          {/* PORTADA */}
          <View style={styles.section}>
            <SectionTitle
              highlight={t('task_form.section_cover_gold', { defaultValue: 'TU' })}
              rest={t('task_form.section_cover_rest', { defaultValue: 'PORTADA' })}
            />
            <TaskCoverPicker coverImage={coverImage} onChangeCover={setCoverImage} taskTitle={titleValue} />
          </View>

          {/* QUÉ QUIERES LOGRAR */}
          <View style={styles.section} onLayout={(e) => { titleSectionY.current = e.nativeEvent.layout.y; }}>
            <SectionTitle
              highlight={t('task_form.section_what_gold', { defaultValue: 'QUÉ' })}
              rest={t('task_form.section_what_rest', { defaultValue: 'QUIERES LOGRAR' })}
            />
            <Controller
              control={control}
              name="title"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[
                    styles.titleInput,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.foreground,
                    },
                    isTitleFocused && { borderColor: '#D4B13A' },
                  ]}
                  placeholder={t('task_form.title_placeholder', { defaultValue: 'Ej. Ver auroras boreales' })}
                  placeholderTextColor={theme.colors.foregroundMuted}
                  value={value}
                  onChangeText={onChange}
                  onFocus={() => {
                    setIsTitleFocused(true);
                    // Baja la pantalla para que el título quede por encima del teclado.
                    setTimeout(() => {
                      scrollRef.current?.scrollTo({ y: Math.max(0, titleSectionY.current - 12), animated: true });
                    }, 150);
                  }}
                  onBlur={() => setIsTitleFocused(false)}
                  accessibilityLabel={t('task_form.title_placeholder', { defaultValue: 'Título de la tarea' })}
                />
              )}
            />
          </View>

          {/* DESCRIPCIÓN */}
          <View style={[styles.section, { marginBottom: 4 }]}>
            <SectionTitle
              highlight={t('task_form.section_desc_gold', { defaultValue: 'DESCRIPCIÓN' })}
              rest={t('task_form.section_desc_rest', { defaultValue: 'DE LA TAREA' })}
            />
            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, value } }) => (
                <TextInput
                  style={[
                    styles.descInput,
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
                    isDescFocused && { borderColor: '#D4B13A' },
                  ]}
                  value={value || ''}
                  onChangeText={onChange}
                  placeholder={t('task_form.desc_placeholder', { defaultValue: 'Cuéntanos más sobre esta tarea…' })}
                  placeholderTextColor={theme.colors.foregroundMuted}
                  accessibilityLabel={t('task_form.desc_placeholder', { defaultValue: 'Descripción de la tarea' })}
                  multiline
                  onFocus={() => setIsDescFocused(true)}
                  onBlur={() => setIsDescFocused(false)}
                />
              )}
            />
          </View>

          {/* PRIORIDAD */}
          <View style={styles.section}>
            <SectionTitle
              highlight={t('task_form.section_priority', { defaultValue: 'PRIORIDAD' })}
              rest=""
            />
            <Controller
              control={control}
              name="priority"
              render={({ field: { onChange, value } }) => (
                <TaskPriorityPicker value={(value as any) || 'medium'} onChange={onChange} />
              )}
            />
          </View>

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
            driveUrl={driveUrl}
            onOpenDriveModal={() => setShowDriveModal(true)}
            visibilityValue={visibilityValue as any}
            onChangeVisibilityValue={(val) => setValue('visibility', val)}
          />

          {/* PASOS */}
          <Text style={[styles.sectionLabel, { color: theme.colors.foreground }]}>
            <Text style={{ color: '#D4B13A' }}>{t('task_form.section_steps', { defaultValue: 'PASOS' })}</Text> · {steps.length}
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
          <Text style={[styles.sectionLabel, { color: theme.colors.foreground }]}>
            <Text style={{ color: '#D4B13A' }}>{t('task_form.section_collaborators', { defaultValue: 'COLABORADORES' })}</Text>
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

        <GoogleDriveModal
          visible={showDriveModal}
          onClose={() => setShowDriveModal(false)}
          currentUrl={driveUrl}
          onSave={(u) => setDriveUrl(u)}
          canEdit={true}
        />

        {/* BOTTOM BAR */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
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
              <Text style={styles.submitText}>{t('task_form.btn_add_to_list', { defaultValue: 'Añadir a mi lista' })}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}