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
import { useAlbumSync, toSyncPriority } from '../../src/hooks/useAlbumSync';
import { useAuthStore } from '../../src/stores/auth.store';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

import { styles } from '../../src/features/task-form/styles/task-form.styles';
import { SectionTitle } from '../../src/features/task-form/components/SectionTitle';
import { processBucketImage } from '@bucketlist/shared';
import { useIsAdmin } from '../../src/hooks/useCurrentUserProfile';
import {
  TaskCoverBanner,
  TaskPhotoAndColorPicker,
  type TaskFormPhoto,
} from '../../src/features/task-form/components/TaskCoverPicker';
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
  const { askAlbumSync, albumSyncSheet } = useAlbumSync();

  const isAdmin = useIsAdmin();
  const [coverColor, setCoverColor] = useState<string>('preset:aurora');
  const [taskPhotos, setTaskPhotos] = useState<TaskFormPhoto[]>([]);
  const [selectedCoverIndex, setSelectedCoverIndex] = useState<number>(0);
  const [isSquare, setIsSquare] = useState<boolean>(false);
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
    // Si la tarea se crea dentro de un álbum, usar preferentemente la visibilidad y la prioridad
    // del álbum como valores iniciales (el usuario puede cambiarlas en el formulario).
    if (params.albumId && params.albumId !== 'new') {
      void supabase
        .from('albums')
        .select('visibility, priority')
        .eq('id', params.albumId)
        .maybeSingle()
        .then(({ data }) => {
          const albumPriority = toSyncPriority((data as any)?.priority);
          if (albumPriority) setValue('priority', albumPriority);
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
  const priorityValue = watch('priority');

  /**
   * Al elegir un álbum en el selector se pregunta si la tarea adopta la visibilidad y la
   * prioridad del álbum. Si el usuario cierra la pregunta, se mantiene el álbum anterior.
   */
  const handleSelectAlbum = async (newAlbumId: string | null) => {
    const album = newAlbumId && newAlbumId !== albumId ? albums.find((a) => a.id === newAlbumId) : undefined;
    if (!album) {
      setAlbumId(newAlbumId);
      return;
    }
    const answer = await askAlbumSync(
      album,
      [{ visibility: visibilityValue, priority: priorityValue }],
      // En iOS el selector aún se está cerrando: se espera a que termine para abrir la pregunta.
      { delayMs: Platform.OS === 'ios' ? 450 : 0 },
    );
    if (answer === null) return;
    setAlbumId(album.id);
    if (answer.visibility) setValue('visibility', answer.visibility);
    if (answer.priority) setValue('priority', answer.priority);
  };

  const activeCoverPhotoUri = taskPhotos[selectedCoverIndex]?.uri ?? null;
  const activeCoverValue = activeCoverPhotoUri || coverColor;

  const handleAddPhotos = (newUris: string[]) => {
    setTaskPhotos((prev) => [...prev, ...newUris.map((u) => ({ uri: u }))]);
  };

  const handleRemovePhoto = (index: number) => {
    setTaskPhotos((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (selectedCoverIndex >= next.length) {
        setSelectedCoverIndex(Math.max(0, next.length - 1));
      }
      return next;
    });
  };

  const onSubmit = async (data: CreateBucketForm) => {
    try {
      setIsUploadingCover(true);
      data.subtasks = steps
        .filter((s) => s.title.trim() !== '')
        .map((s, i) => ({
          title: s.title.trim(),
          done: false,
          position: i,
        }));

      const tag_ids = selectedTags.map((t) => t.id);
      const collaborator_ids = selectedCollaborators.map((c) => c.id);

      const payload = {
        ...data,
        cover_image: coverColor,
        thumbnail_mode: taskPhotos.length > 0 ? 'photo' : 'auto',
        drive_url: driveUrl,
        album_id: albumId,
        tag_ids,
        collaborator_ids,
      } as any;

      createBucket.mutate(payload, {
        onSuccess: async (newBucket: any) => {
          if (taskPhotos.length > 0 && newBucket?.id && user?.id) {
            try {
              let chosenDbPhotoId: string | null = null;
              for (let i = 0; i < taskPhotos.length; i++) {
                const photo = taskPhotos[i];
                if (!photo?.uri) continue;
                const processed = await processBucketImage(photo.uri);
                const paths = await storageApi.uploadPhoto(
                  user.id,
                  newBucket.id,
                  processed.original.uri,
                  processed.thumbnail.uri,
                );
                const { data: insertedPhoto, error: pErr } = await supabase
                  .from('bucket_photos')
                  .insert({
                    bucket_id: newBucket.id,
                    user_id: user.id,
                    storage_path: paths.photoPath,
                    thumb_path: paths.thumbPath,
                    width: processed.original.width,
                    height: processed.original.height,
                    size_bytes: processed.original.sizeBytes,
                    thumb_size_bytes: processed.thumbnail.sizeBytes,
                    position: i,
                    visibility: data.visibility || 'public',
                  })
                  .select('id')
                  .single();

                if (!pErr && insertedPhoto && (i === selectedCoverIndex || (selectedCoverIndex >= taskPhotos.length && i === 0))) {
                  chosenDbPhotoId = insertedPhoto.id;
                }
              }

              if (chosenDbPhotoId) {
                await supabase
                  .from('buckets')
                  .update({
                    thumbnail_mode: 'photo',
                    thumbnail_photo_id: chosenDbPhotoId,
                  })
                  .eq('id', newBucket.id);
              }
            } catch (uploadErr) {
              console.error('Failed to upload task photos:', uploadErr);
            }
          }
          setIsUploadingCover(false);
          router.back();
        },
        onError: (error) => {
          setIsUploadingCover(false);
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
    let msg = first?.message ?? t('task_form.alert_invalid_msg', { defaultValue: 'Faltan datos por completar.' });
    if (typeof msg === 'string' && (msg.includes('at most') || msg.includes('max') || msg.includes('characters'))) {
      msg = t('task_form.title_max_error', { defaultValue: 'El título no puede superar los 200 caracteres.' });
    }
    Alert.alert(
      t('task_form.alert_invalid_title', { defaultValue: 'Revisa la tarea' }),
      msg
    );
  };

  const selectedAlbumTitle = albumId
    ? albums.find((a) => a.id === albumId)?.title || t('task_form.album_selected_fallback')
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
            <TaskCoverBanner
              coverImage={activeCoverValue}
              taskTitle={titleValue}
              isSquare={isSquare}
              onToggleSquare={() => setIsSquare(!isSquare)}
              onRecrop={(croppedUri) => {
                if (taskPhotos.length > 0) {
                  setTaskPhotos((prev) =>
                    prev.map((p, i) => (i === selectedCoverIndex ? { ...p, uri: croppedUri } : p))
                  );
                }
              }}
              onRemovePhoto={
                taskPhotos.length > 0 ? () => handleRemovePhoto(selectedCoverIndex) : undefined
              }
            />
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
                <View>
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
                    maxLength={200}
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
                  {value && value.length > 150 ? (
                    <Text style={{ alignSelf: 'flex-end', fontSize: 12, color: theme.colors.foregroundMuted, marginTop: 4 }}>
                      {value.length}/200
                    </Text>
                  ) : null}
                </View>
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
                  maxLength={1000}
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

          {/* PERSONALIZACIÓN DE PORTADA Y FOTOS */}
          <View style={styles.section}>
            <SectionTitle
              highlight={t('task_form.section_media_gold', { defaultValue: 'COLOR Y' })}
              rest={t('task_form.section_media_rest', { defaultValue: 'FOTOS' })}
            />
            <TaskPhotoAndColorPicker
              coverColor={coverColor}
              onChangeColor={setCoverColor}
              photos={taskPhotos}
              selectedCoverIndex={selectedCoverIndex}
              onSelectCoverPhoto={setSelectedCoverIndex}
              onAddPhotos={handleAddPhotos}
              onRemovePhoto={handleRemovePhoto}
              isAdmin={isAdmin}
              taskTitle={titleValue}
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
          onSelectAlbum={(id) => void handleSelectAlbum(id)}
          onClose={() => setShowAlbumPicker(false)}
        />

        {albumSyncSheet}

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