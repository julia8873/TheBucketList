import { Alert } from '@bucketlist/ui';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { PageTitle, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import type { UpdateBucketForm } from '@bucketlist/shared';
import { supabase } from '../../src/services/supabase';
import { useUpdateBucket } from '../../src/hooks/useBuckets';
import { useItemTags, useSyncItemTags } from '../../src/hooks/useTags';
import { useAlbums } from '../../src/hooks/useAlbums';
import { useAuthStore } from '../../src/stores/auth.store';
import { useQueryClient } from '@tanstack/react-query';
import { LocationPickerModal } from '../../src/components/LocationPickerModal';
import type { TagItem } from '../../src/components/TagPickerSheet';
import { CollaboratorPickerSheet, type CollaboratorItem } from '../../src/components/CollaboratorPickerSheet';
import { AlbumPickerSheet } from '../../src/components/AlbumPickerSheet';
import { GoogleDriveModal } from '../../src/components/GoogleDriveModal';

import { styles } from '../../src/features/task-form/styles/task-form.styles';
import { SectionTitle } from '../../src/features/task-form/components/SectionTitle';
import { TaskSettingsCard } from '../../src/features/task-form/components/TaskSettingsCard';
import { TaskCollaboratorsSection } from '../../src/features/task-form/components/TaskCollaboratorsSection';
import { TaskCoverPicker } from '../../src/features/task-form/components/TaskCoverPicker';
import { processBucketImage } from '@bucketlist/shared';
import { storageApi } from '../../src/services/api/storage';
import { applyMoveTasks, settleTaskCaches } from '../../src/utils/optimisticCache';

type Visibility = 'public' | 'followers' | 'private';

export default function EditBucketModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const updateBucket = useUpdateBucket();
  const syncTags = useSyncItemTags();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [locationText, setLocationText] = useState('');
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLng, setLocationLng] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [isDescFocused, setIsDescFocused] = useState(false);
  const [driveUrl, setDriveUrl] = useState<string | null>(null);
  const [showDriveModal, setShowDriveModal] = useState(false);

  // Etiquetas
  const [selectedTags, setSelectedTags] = useState<TagItem[]>([]);
  const { data: itemTagsData } = useItemTags(id);
  const tagsInitialized = useRef(false);

  // Colaboradores
  const [selectedCollaborators, setSelectedCollaborators] = useState<CollaboratorItem[]>([]);
  const [showCollaboratorPicker, setShowCollaboratorPicker] = useState(false);
  const collaboratorsInitialized = useRef(false);
  const [collaborationMode, setCollaborationMode] = useState<'invite_only' | 'request' | 'open'>('invite_only');
  const [collaborationAudience, setCollaborationAudience] = useState<'followers' | 'anyone'>('followers');

  // Portada
  const [coverImage, setCoverImage] = useState<string>('preset:green');
  const initialCoverImage = useRef<string>('preset:green');

  // Álbum
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: albums = [] } = useAlbums(user?.id);
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [showAlbumPicker, setShowAlbumPicker] = useState(false);
  const initialAlbumId = useRef<string | null>(null);

  useEffect(() => {
    if (!id || collaboratorsInitialized.current) return;
    supabase
      .from('bucket_collaborators')
      .select('user_id, profiles!inner(id, username, display_name, avatar_url)')
      .eq('bucket_id', id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setSelectedCollaborators(
            data.map((c: any) => ({
              id: c.profiles.id,
              username: c.profiles.username,
              display_name: c.profiles.display_name,
              avatar_url: c.profiles.avatar_url,
            }))
          );
          collaboratorsInitialized.current = true;
        }
      });
  }, [id]);

  useEffect(() => {
    if (itemTagsData && !tagsInitialized.current) {
      setSelectedTags(
        itemTagsData
          .map((it: any) => it.tag)
          .filter(Boolean)
          .map((t: any) => ({ id: t.id, name: t.name, color: t.color }))
      );
      tagsInitialized.current = true;
    }
  }, [itemTagsData]);

  useEffect(() => {
    if (!id) return;

    supabase
      .from('buckets')
      .select('title, description, visibility, location_text, location_lat, location_lng, deadline, collaboration_mode, collaboration_audience, cover_image, drive_url')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          Alert.alert('No se pudo cargar la tarea', error?.message || 'Tarea no encontrada.');
          router.back();
          return;
        }

        setTitle(data.title || '');
        setDescription(data.description || '');
        setVisibility((data.visibility as Visibility) || 'public');
        setLocationText(data.location_text || '');
        setLocationLat(data.location_lat ?? null);
        setLocationLng(data.location_lng ?? null);
        setDeadline(data.deadline ? new Date(data.deadline) : null);
        if ((data as any).collaboration_mode) {
          setCollaborationMode((data as any).collaboration_mode);
        }
        if ((data as any).collaboration_audience) {
          setCollaborationAudience((data as any).collaboration_audience);
        }
        if ((data as any).cover_image) {
          setCoverImage((data as any).cover_image);
          initialCoverImage.current = (data as any).cover_image;
        }
        if ((data as any).drive_url) {
          setDriveUrl((data as any).drive_url);
        }
        setLoading(false);
      });

    supabase
      .from('album_items')
      .select('album_id')
      .eq('bucket_id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.album_id) {
          setAlbumId(data.album_id);
          initialAlbumId.current = data.album_id;
        }
      });
  }, [id, router]);

  const isSaving = updateBucket.isPending || syncTags.isPending;

  const handleSave = async () => {
    if (!id || !title.trim()) {
      Alert.alert('Falta el título', 'Escribe un título para la tarea.');
      return;
    }

    let finalCoverImage = coverImage;
    if (
      coverImage &&
      coverImage !== initialCoverImage.current &&
      !coverImage.startsWith('preset:') &&
      !coverImage.startsWith('http')
    ) {
      try {
        const processed = await processBucketImage(coverImage);
        const path = `covers/${user?.id || 'anon'}_${Date.now()}.jpg`;
        finalCoverImage = await storageApi.uploadSingle(path, processed.original.uri);
      } catch (uploadErr) {
        console.error('Failed to upload cover image:', uploadErr);
      }
    }

    const data: UpdateBucketForm = {
      title: title.trim(),
      description: description.trim() || undefined,
      visibility,
      location_text: locationText.trim() || null,
      location_lat: locationText.trim() ? locationLat : null,
      location_lng: locationText.trim() ? locationLng : null,
      deadline,
      collaboration_mode: collaborationMode,
      collaboration_audience: collaborationAudience,
      cover_image: finalCoverImage,
      drive_url: driveUrl,
    } as any;

    try {
      // Todo lo independiente se envía a la vez (antes eran 5-6 esperas seguidas).
      const saveCollaborators = async () => {
        const { data: existingCollabs } = await supabase
          .from('bucket_collaborators')
          .select('user_id')
          .eq('bucket_id', id);
        const existingIds = new Set((existingCollabs ?? []).map((c: any) => c.user_id));
        const newIds = new Set(selectedCollaborators.map((c) => c.id));

        const toAdd = selectedCollaborators.filter((c) => !existingIds.has(c.id));
        const toRemoveIds = [...existingIds].filter((uid) => !newIds.has(uid));
        await Promise.all([
          toAdd.length > 0
            ? supabase
                .from('bucket_collaborators')
                .insert(toAdd.map((c) => ({ bucket_id: id, user_id: c.id, status: 'pending' })))
            : null,
          toRemoveIds.length > 0
            ? supabase.from('bucket_collaborators').delete().eq('bucket_id', id).in('user_id', toRemoveIds)
            : null,
        ]);
      };

      const saveAlbum = async () => {
        if (albumId === initialAlbumId.current) return;
        // Optimista: la tarea cambia de álbum al instante en listas y álbumes.
        applyMoveTasks(queryClient, [id], albumId);
        await supabase.from('album_items').delete().eq('bucket_id', id);
        if (albumId) {
          await supabase
            .from('album_items')
            .insert({ bucket_id: id, album_id: albumId, position: 0 });
        }
        settleTaskCaches(queryClient);
      };

      await Promise.all([
        updateBucket.mutateAsync({ id, data }),
        syncTags.mutateAsync({
          bucketId: id,
          selectedTagIds: selectedTags.map((t) => t.id),
        }),
        saveCollaborators(),
        saveAlbum(),
      ]);

      router.back();
    } catch (error: any) {
      settleTaskCaches(queryClient); // deshace lo optimista recargando el estado real
      Alert.alert(
        t('task_form.alert_save_error_title', { defaultValue: 'No se pudo guardar la tarea' }),
        error?.message ?? t('common.retry', { defaultValue: 'Inténtalo de nuevo.' })
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#D4B13A" />
      </View>
    );
  }

  const selectedAlbumTitle = albumId
    ? albums.find((a) => a.id === albumId)?.title || 'Seleccionado'
    : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
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
              gold={t('task_form.edit_task_gold', { defaultValue: 'Editar' })}
              rest={t('task_form.edit_task_rest', { defaultValue: 'tarea' })}
            />
          </View>

          {/* QUÉ QUIERES LOGRAR */}
          <View style={styles.section}>
            <SectionTitle
              highlight={t('task_form.section_what_gold', { defaultValue: 'QUÉ' })}
              rest={t('task_form.section_what_rest', { defaultValue: 'QUIERES LOGRAR' })}
            />
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
              value={title}
              onChangeText={setTitle}
              onFocus={() => setIsTitleFocused(true)}
              onBlur={() => setIsTitleFocused(false)}
              accessibilityLabel={t('task_form.title_placeholder', { defaultValue: 'Título de la tarea' })}
            />
          </View>

          {/* PORTADA */}
          <View style={styles.section}>
            <SectionTitle
              highlight={t('task_form.section_cover_gold', { defaultValue: 'TU' })}
              rest={t('task_form.section_cover_rest', { defaultValue: 'PORTADA' })}
            />
            <TaskCoverPicker
              coverImage={coverImage}
              onChangeCover={setCoverImage}
              taskTitle={title}
            />
          </View>

          {/* DESCRIPCIÓN */}
          <View style={[styles.section, { marginBottom: 4 }]}>
            <SectionTitle
              highlight={t('task_form.section_desc_gold', { defaultValue: 'DESCRIPCIÓN' })}
              rest={t('task_form.section_desc_rest', { defaultValue: 'DE LA TAREA' })}
            />
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
              placeholder={t('task_form.desc_placeholder', { defaultValue: 'Cuéntanos más sobre esta tarea…' })}
              placeholderTextColor={theme.colors.foregroundMuted}
              value={description}
              onChangeText={setDescription}
              onFocus={() => setIsDescFocused(true)}
              onBlur={() => setIsDescFocused(false)}
              multiline
              accessibilityLabel={t('task_form.desc_placeholder', { defaultValue: 'Descripción de la tarea' })}
            />
          </View>

          {/* AJUSTES */}
          <TaskSettingsCard
            locationText={locationText}
            onOpenLocationPicker={() => setIsEditingLocation(true)}
            onClearLocation={() => {
              setLocationText('');
              setLocationLat(null);
              setLocationLng(null);
            }}
            deadline={deadline}
            showDatePicker={showDatePicker}
            onOpenDatePicker={() => setShowDatePicker(true)}
            onDateChange={(date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (date) setDeadline(date);
            }}
            onClearDate={() => setDeadline(null)}
            albumTitle={selectedAlbumTitle}
            onOpenAlbumPicker={() => setShowAlbumPicker(true)}
            selectedTags={selectedTags}
            onChangeTags={setSelectedTags}
            driveUrl={driveUrl}
            onOpenDriveModal={() => setShowDriveModal(true)}
            onClearDriveUrl={() => setDriveUrl(null)}
            visibilityMode="chips"
            visibilityValue={visibility}
            onChangeVisibilityValue={setVisibility}
          />

          {/* COLABORADORES */}
          <Text style={styles.sectionLabel}>
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
            onChangeCollaborationMode={setCollaborationMode}
            collaborationAudience={collaborationAudience}
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
          value={locationText}
          onChangeLocation={(loc) => {
            setLocationText(loc?.text ?? '');
            setLocationLat(loc ? loc.lat : null);
            setLocationLng(loc ? loc.lng : null);
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
            style={[styles.submitButton, (!title.trim() || isSaving) && { opacity: 0.5 }]}
            onPress={() => void handleSave()}
            disabled={!title.trim() || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#111" />
            ) : (
              <Text style={styles.submitText}>{t('task_form.btn_save_changes', { defaultValue: 'Guardar cambios' })}</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}