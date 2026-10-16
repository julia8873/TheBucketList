import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { PageTitle } from '@bucketlist/ui';
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

import { styles } from '../../src/features/task-form/styles/task-form.styles';
import { TaskSettingsCard } from '../../src/features/task-form/components/TaskSettingsCard';
import { TaskCollaboratorsSection } from '../../src/features/task-form/components/TaskCollaboratorsSection';

type Visibility = 'public' | 'followers' | 'private';

export default function EditBucketModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  // Etiquetas
  const [selectedTags, setSelectedTags] = useState<TagItem[]>([]);
  const { data: itemTagsData } = useItemTags(id as string);
  const tagsInitialized = useRef(false);

  // Colaboradores
  const [selectedCollaborators, setSelectedCollaborators] = useState<CollaboratorItem[]>([]);
  const [showCollaboratorPicker, setShowCollaboratorPicker] = useState(false);
  const collaboratorsInitialized = useRef(false);

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
      .select('title, description, visibility, location_text, location_lat, location_lng, deadline')
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

    const data: UpdateBucketForm = {
      title: title.trim(),
      description: description.trim() || undefined,
      visibility,
      location_text: locationText.trim() || null,
      location_lat: locationText.trim() ? locationLat : null,
      location_lng: locationText.trim() ? locationLng : null,
      deadline,
    };

    try {
      await updateBucket.mutateAsync({ id, data });
      await syncTags.mutateAsync({
        bucketId: id,
        selectedTagIds: selectedTags.map((t) => t.id),
      });

      const { data: existingCollabs } = await supabase
        .from('bucket_collaborators')
        .select('user_id')
        .eq('bucket_id', id);
      const existingIds = new Set((existingCollabs ?? []).map((c: any) => c.user_id));
      const newIds = new Set(selectedCollaborators.map((c) => c.id));

      const toAdd = selectedCollaborators.filter((c) => !existingIds.has(c.id));
      if (toAdd.length > 0) {
        await supabase
          .from('bucket_collaborators')
          .insert(toAdd.map((c) => ({ bucket_id: id, user_id: c.id, status: 'pending' })));
      }

      const toRemoveIds = [...existingIds].filter((uid) => !newIds.has(uid));
      if (toRemoveIds.length > 0) {
        await supabase
          .from('bucket_collaborators')
          .delete()
          .eq('bucket_id', id)
          .in('user_id', toRemoveIds);
      }

      if (albumId !== initialAlbumId.current) {
        await supabase.from('album_items').delete().eq('bucket_id', id);
        if (albumId) {
          await supabase
            .from('album_items')
            .insert({ bucket_id: id, album_id: albumId, position: 0 });
        }
        void queryClient.invalidateQueries({ queryKey: ['bucketAlbum', id] });
        void queryClient.invalidateQueries({ queryKey: ['bucketDetail', id] });
        void queryClient.invalidateQueries({ queryKey: ['albums'] });
      }

      router.back();
    } catch (error: any) {
      Alert.alert('No se pudo guardar', error?.message ?? 'Inténtalo de nuevo.');
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
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {/* CABECERA */}
          <View style={styles.header}>
            <Pressable
              style={styles.backButton}
              onPress={() => router.back()}
              accessibilityLabel="Volver"
            >
              <ChevronLeft color="#FFF" size={28} />
            </Pressable>
            <PageTitle gold="Editar" rest="tarea" />
          </View>

          {/* QUÉ QUIERES LOGRAR */}
          <Text style={styles.sectionLabel}>
            <Text style={{ color: '#D4B13A' }}>QUÉ</Text> QUIERES LOGRAR
          </Text>
          <TextInput
            style={[styles.titleInput, isTitleFocused && { borderColor: '#D4B13A' }]}
            placeholder="Ej. Ver auroras boreales"
            placeholderTextColor="#6B6B6B"
            value={title}
            onChangeText={setTitle}
            onFocus={() => setIsTitleFocused(true)}
            onBlur={() => setIsTitleFocused(false)}
          />

          {/* DESCRIPCIÓN */}
          <Text style={styles.sectionLabel}>
            <Text style={{ color: '#D4B13A' }}>DESCRIPCIÓN</Text>
          </Text>
          <TextInput
            style={styles.descInput}
            placeholder="Cuéntanos más…"
            placeholderTextColor="#6B6B6B"
            value={description}
            onChangeText={setDescription}
            multiline
          />

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
            visibilityMode="chips"
            visibilityValue={visibility}
            onChangeVisibilityValue={setVisibility}
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

        {/* BOTTOM BAR */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable
            style={[styles.submitButton, (!title.trim() || isSaving) && { opacity: 0.5 }]}
            onPress={() => void handleSave()}
            disabled={!title.trim() || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#111" />
            ) : (
              <Text style={styles.submitText}>Guardar cambios</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}