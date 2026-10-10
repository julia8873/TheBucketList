import React, { useState, useEffect } from 'react';
import { 
  View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, 
  Pressable, Text, TextInput, Switch, ActivityIndicator, Image 
} from 'react-native';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createBucketSchema, type CreateBucketForm } from '@bucketlist/shared';
import { useCreateBucket } from '../../src/hooks/useBuckets';
import { supabase } from '../../src/services/supabase';
import { LocationAutocomplete } from '../../src/components/LocationAutocomplete';
import { TagsRow } from '../../src/components/TagsRow';
import { useTagPickerStore } from '../../src/stores/tagPicker.store';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronLeft, Camera, MapPin, Calendar, Folder, Globe, Plus, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';

const GRADIENTS = [
  { id: 'preset:green', colors: ['#0F5C4A', '#1E8A5E'] as const },
  { id: 'preset:orange', colors: ['#F29A5C', '#D2562B'] as const },
  { id: 'preset:blue', colors: ['#2F6DB5', '#8EC5F2'] as const },
  { id: 'preset:purple', colors: ['#6B2FB0', '#2E1A66'] as const },
];

export default function CreateBucketModal() {
  const router = useRouter();
  const createBucket = useCreateBucket();
  const insets = useSafeAreaInsets();
  
  const [categories, setCategories] = useState<any[]>([]);
  const [coverImage, setCoverImage] = useState<string>('preset:green');
  const [albumId, setAlbumId] = useState<string | null>(null);
  const [albums, setAlbums] = useState<any[]>([]); 
  
  const [steps, setSteps] = useState<{ id: string; title: string }[]>([]);
  
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const { selectedTags, setSelectedTags } = useTagPickerStore();
  
  useEffect(() => {
    supabase.from('categories').select('*').then(({ data }) => {
      if (data) setCategories(data);
    });
    supabase.from('albums').select('*').then(({ data }) => {
      if (data) setAlbums(data);
    });
  }, []);

  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateBucketForm>({
    resolver: zodResolver(createBucketSchema),
    defaultValues: {
      title: '',
      description: '', 
      visibility: 'public',
      subtasks: [],
    }
  });

  const titleValue = watch('title');

  const onSubmit = (data: CreateBucketForm) => {
    data.subtasks = steps.filter(s => s.title.trim() !== '').map((s, i) => ({
      title: s.title.trim(),
      done: false,
      position: i,
    }));
    
    // Get IDs to save in item_tags
    const tag_ids = selectedTags.map(t => t.id);

    // Reuse existing mutation fields, passing local states where appropriate
    const payload = {
      ...data,
      cover_image: coverImage,
      album_id: albumId,
      tag_ids,
    } as any;

    createBucket.mutate(payload, {
      onSuccess: () => {
        router.back();
      },
      onError: (error) => {
        console.error('Failed to create bucket:', error);
      }
    });
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setCoverImage(result.assets?.[0]?.uri || '');
    }
  };
  
  const addStep = () => {
    setSteps([...steps, { id: Math.random().toString(), title: '' }]);
  };
  
  const updateStep = (id: string, text: string) => {
    setSteps(steps.map(s => s.id === id ? { ...s, title: text } : s));
  };

  const removeStep = (id: string) => {
    setSteps(steps.filter(s => s.id !== id));
  };

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
          <Text style={styles.headerTitle}>Nueva tarea</Text>
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
        <View style={styles.coverRow}>
          {GRADIENTS.map((g) => {
            const isSelected = coverImage === g.id;
            return (
              <Pressable key={g.id} onPress={() => setCoverImage(g.id)}>
                <LinearGradient
                  colors={g.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.coverTile, isSelected && styles.coverSelected]}
                />
              </Pressable>
            );
          })}
          
          <Pressable 
            onPress={pickImage}
            style={[styles.coverTile, styles.coverImageTile, coverImage.startsWith('file') && styles.coverSelected]}
          >
            {coverImage.startsWith('file') ? (
              <Image source={{ uri: coverImage }} style={[StyleSheet.absoluteFill, { borderRadius: 12 }]} />
            ) : (
              <Camera color="#D4B13A" size={28} />
            )}
          </Pressable>
        </View>

        {/* AJUSTES */}
        <View style={styles.settingsCard}>
          {/* Ubicación */}
          <Controller
            control={control}
            name="location_text"
            render={({ field: { onChange, value } }) => (
              <View>
                {!isEditingLocation ? (
                  <Pressable style={styles.settingRow} onPress={() => setIsEditingLocation(true)}>
                    <MapPin color="#D4B13A" size={24} />
                    <Text style={styles.settingLabel}>Ubicación</Text>
                    <Text style={[styles.settingValue, !value && { color: '#6B6B6B' }]} numberOfLines={1}>
                      {value || 'Sin ubicación'}
                    </Text>
                  </Pressable>
                ) : (
                  <View style={[styles.settingRow, { paddingHorizontal: 10 }]}>
                    <LocationAutocomplete
                      value={value || ''}
                      onChangeLocation={(loc) => {
                        onChange(loc?.text);
                        if (loc) {
                          setValue('location_lat', loc.lat);
                          setValue('location_lng', loc.lng);
                        } else {
                          setValue('location_lat', null);
                          setValue('location_lng', null);
                        }
                        setIsEditingLocation(false);
                      }}
                    />
                  </View>
                )}
              </View>
            )}
          />

          {/* Fecha Límite */}
          <Controller
            control={control}
            name="deadline"
            render={({ field: { onChange, value } }) => (
              <>
                <Pressable style={styles.settingRow} onPress={() => setShowDatePicker(true)}>
                  <Calendar color="#D4B13A" size={24} />
                  <Text style={styles.settingLabel}>Fecha límite</Text>
                  <Text style={[styles.settingValue, !value && { color: '#6B6B6B' }]}>
                    {value ? new Date(value).toLocaleDateString('es-ES') : 'Sin fecha'}
                  </Text>
                </Pressable>
                {showDatePicker && (
                  <DateTimePicker
                    value={value ? new Date(value) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(_event, date) => {
                      setShowDatePicker(Platform.OS === 'ios');
                      if (date) onChange(date);
                    }}
                  />
                )}
              </>
            )}
          />

          {/* Álbum */}
          <Pressable style={styles.settingRow} onPress={() => {
            if (albums.length > 0) {
              const idx = albums.findIndex(a => a.id === albumId);
              const next = albums[(idx + 1) % albums.length];
              setAlbumId(next.id);
            }
          }}>
            <Folder color="#D4B13A" size={24} />
            <Text style={styles.settingLabel}>Álbum</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[styles.settingValue, !albumId && { color: '#6B6B6B' }]}>
                {albumId ? albums.find(a => a.id === albumId)?.title || 'Seleccionado' : 'Sin álbum'}
              </Text>
              <ChevronLeft color="#6B6B6B" size={20} style={{ transform: [{ rotate: '180deg' }] }} />
            </View>
          </Pressable>

          {/* Etiquetas */}
          <TagsRow selectedTags={selectedTags} />

          {/* Pública */}
          <Controller
            control={control}
            name="visibility"
            render={({ field: { onChange, value } }) => {
              const isPublic = value === 'public';
              return (
                <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                  <Globe color="#D4B13A" size={24} />
                  <Text style={styles.settingLabel}>Pública</Text>
                  <Switch
                    value={isPublic}
                    onValueChange={(val) => onChange(val ? 'public' : 'private')}
                    trackColor={{ false: '#333', true: '#D4B13A' }}
                    thumbColor={isPublic ? '#111' : '#E5E5E5'}
                  />
                </View>
              );
            }}
          />
        </View>

        {/* PASOS */}
        <Text style={styles.sectionLabel}>
          <Text style={{ color: '#D4B13A' }}>PASOS</Text> · {steps.length}
        </Text>
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={step.id} style={styles.stepRow}>
              <View style={styles.stepCircle} />
              <TextInput
                style={styles.stepInput}
                value={step.title}
                onChangeText={(txt) => updateStep(step.id, txt)}
                placeholder="Escribe un paso..."
                placeholderTextColor="#6B6B6B"
                autoFocus={index === steps.length - 1}
              />
              <Pressable onPress={() => removeStep(step.id)} hitSlop={10}>
                <X color="#555" size={20} />
              </Pressable>
            </View>
          ))}
          <Pressable style={styles.addStepRow} onPress={addStep}>
            <Plus color="#D4B13A" size={24} />
            <Text style={styles.addStepText}>Añadir paso</Text>
          </Pressable>
        </View>
        
      </ScrollView>

      {/* BOTTOM BAR */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable 
          style={[styles.submitButton, (!titleValue || createBucket.isPending) && { opacity: 0.5 }]}
          onPress={() => void handleSubmit(onSubmit)()}
          disabled={!titleValue || createBucket.isPending}
        >
          {createBucket.isPending ? (
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E0E0E' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 150 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 10 },
  backButton: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#161616', borderWidth: 1, borderColor: '#2A2A2A',
    alignItems: 'center', justifyContent: 'center'
  },
  headerTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 34, color: '#FFF' },
  sectionLabel: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 16, letterSpacing: 1, color: '#FFF',
    marginTop: 26, marginBottom: 12,
  },
  titleInput: {
    height: 74, borderRadius: 16, backgroundColor: '#161616',
    borderWidth: 1, borderColor: '#2A2A2A',
    paddingHorizontal: 20,
    fontFamily: 'PlayfairDisplay_400Regular', fontSize: 22, color: '#FFF',
  },
  coverRow: { flexDirection: 'row', gap: 15 },
  coverTile: { width: 70, height: 70, borderRadius: 14, overflow: 'hidden' },
  coverSelected: { borderWidth: 2, borderColor: '#D4B13A' },
  coverImageTile: {
    backgroundColor: '#161616', borderWidth: 1, borderColor: '#D4B13A', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center'
  },
  categoryScroll: { gap: 12, paddingRight: 40, marginTop: 4 },
  catPill: {
    height: 48, borderRadius: 24, paddingHorizontal: 22,
    backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#333',
    justifyContent: 'center'
  },
  catPillActive: { backgroundColor: 'rgba(212, 177, 58, 0.12)', borderColor: '#D4B13A' },
  catText: { fontFamily: 'Inter_500Medium', fontSize: 17, color: '#E5E5E5' },
  catTextActive: { color: '#D4B13A' },
  settingsCard: {
    borderRadius: 16, backgroundColor: '#161616',
    borderWidth: 1, borderColor: '#2A2A2A', overflow: 'hidden',
    marginTop: 14,
  },
  settingRow: {
    height: 72, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#2A2A2A'
  },
  settingLabel: { fontFamily: 'Inter_500Medium', fontSize: 18, color: '#FFF', marginLeft: 16, flex: 1 },
  settingValue: { fontFamily: 'Inter_400Regular', fontSize: 17, color: '#9A9A9A' },
  stepsContainer: { paddingBottom: 20 },
  stepRow: { height: 58, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#2A2A2A' },
  stepCircle: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: '#555' },
  stepInput: { flex: 1, marginLeft: 16, fontFamily: 'Inter_400Regular', fontSize: 18, color: '#FFF' },
  addStepRow: { height: 58, flexDirection: 'row', alignItems: 'center', gap: 16 },
  addStepText: { fontFamily: 'Inter_600SemiBold', fontSize: 18, color: '#D4B13A' },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#0E0E0E', borderTopWidth: 1, borderTopColor: '#2A2A2A',
    padding: 16
  },
  submitButton: {
    height: 62, borderRadius: 31, backgroundColor: '#D4B13A',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#D4B13A', shadowOpacity: 0.3, shadowRadius: 16, elevation: 8
  },
  submitText: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#111' }
});
