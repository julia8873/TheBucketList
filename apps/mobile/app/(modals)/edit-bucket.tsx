import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ChevronLeft, MapPin, Calendar, Eye, X } from 'lucide-react-native';
import { TagChip } from '@bucketlist/ui';
import type { UpdateBucketForm } from '@bucketlist/shared';
import { supabase } from '../../src/services/supabase';
import { useUpdateBucket } from '../../src/hooks/useBuckets';
import { useItemTags, useSyncItemTags } from '../../src/hooks/useTags';
import { LocationAutocomplete } from '../../src/components/LocationAutocomplete';
import { TagsRow } from '../../src/components/TagsRow';
import type { TagItem } from '../../src/components/TagPickerSheet';

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

    // Etiquetas: se cargan una vez y se guardan al pulsar "Guardar cambios"
    const [selectedTags, setSelectedTags] = useState<TagItem[]>([]);
    const { data: itemTagsData } = useItemTags(id as string);
    const tagsInitialized = useRef(false);

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
                        <Text style={styles.headerTitle}>Editar tarea</Text>
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
                    <View style={styles.settingsCard}>
                        {/* Ubicación */}
                        {!isEditingLocation ? (
                            <Pressable style={styles.settingRow} onPress={() => setIsEditingLocation(true)}>
                                <MapPin color="#D4B13A" size={24} />
                                <Text style={styles.settingLabel}>Ubicación</Text>
                                <Text
                                    style={[styles.settingValue, !locationText && { color: '#6B6B6B' }]}
                                    numberOfLines={1}
                                >
                                    {locationText || 'Sin ubicación'}
                                </Text>
                            </Pressable>
                        ) : (
                            <View style={[styles.settingRow, { paddingHorizontal: 10 }]}>
                                <LocationAutocomplete
                                    value={locationText}
                                    onChangeLocation={(loc) => {
                                        setLocationText(loc?.text ?? '');
                                        setLocationLat(loc ? loc.lat : null);
                                        setLocationLng(loc ? loc.lng : null);
                                        setIsEditingLocation(false);
                                    }}
                                />
                            </View>
                        )}

                        {/* Fecha límite */}
                        <Pressable style={styles.settingRow} onPress={() => setShowDatePicker(true)}>
                            <Calendar color="#D4B13A" size={24} />
                            <Text style={styles.settingLabel}>Fecha límite</Text>
                            <Text style={[styles.settingValue, !deadline && { color: '#6B6B6B' }]}>
                                {deadline ? deadline.toLocaleDateString('es-ES') : 'Sin fecha'}
                            </Text>
                            {deadline && (
                                <Pressable
                                    onPress={() => setDeadline(null)}
                                    hitSlop={10}
                                    style={{ marginLeft: 10 }}
                                    accessibilityLabel="Quitar fecha"
                                >
                                    <X color="#6B6B6B" size={18} />
                                </Pressable>
                            )}
                        </Pressable>
                        {showDatePicker && (
                            <DateTimePicker
                                value={deadline || new Date()}
                                mode="date"
                                display="default"
                                onChange={(_event, date) => {
                                    setShowDatePicker(Platform.OS === 'ios');
                                    if (date) setDeadline(date);
                                }}
                            />
                        )}

                        {/* Etiquetas */}
                        <TagsRow selectedTags={selectedTags} onChange={setSelectedTags} />

                        {/* Visibilidad */}
                        <View style={[styles.settingRow, { borderBottomWidth: 0, height: undefined, paddingVertical: 16 }]}>
                            <Eye color="#D4B13A" size={24} />
                            <Text style={styles.settingLabel}>Visible para</Text>
                        </View>
                        <View style={styles.visibilityRow}>
                            {(['public', 'followers', 'private'] as const).map((value) => (
                                <TagChip
                                    key={value}
                                    label={value === 'public' ? 'Pública' : value === 'followers' ? 'Seguidores' : 'Privada'}
                                    variant={visibility === value ? 'selected' : 'default'}
                                    onPress={() => setVisibility(value)}
                                />
                            ))}
                        </View>
                    </View>
                </ScrollView>

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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0E0E0E' },
    center: { justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 150 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 10 },
    backButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#161616',
        borderWidth: 1,
        borderColor: '#2A2A2A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 34, color: '#FFF' },
    sectionLabel: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: 16,
        letterSpacing: 1,
        color: '#FFF',
        marginTop: 26,
        marginBottom: 12,
    },
    titleInput: {
        height: 74,
        borderRadius: 16,
        backgroundColor: '#161616',
        borderWidth: 1,
        borderColor: '#2A2A2A',
        paddingHorizontal: 20,
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: 22,
        color: '#FFF',
    },
    descInput: {
        minHeight: 96,
        borderRadius: 16,
        backgroundColor: '#161616',
        borderWidth: 1,
        borderColor: '#2A2A2A',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        fontFamily: 'Inter_400Regular',
        fontSize: 17,
        color: '#FFF',
        textAlignVertical: 'top',
    },
    settingsCard: {
        borderRadius: 16,
        backgroundColor: '#161616',
        borderWidth: 1,
        borderColor: '#2A2A2A',
        overflow: 'hidden',
        marginTop: 26,
    },
    settingRow: {
        height: 72,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#2A2A2A',
    },
    settingLabel: { fontFamily: 'Inter_500Medium', fontSize: 18, color: '#FFF', marginLeft: 16, flex: 1 },
    settingValue: { fontFamily: 'Inter_400Regular', fontSize: 17, color: '#9A9A9A', maxWidth: 170 },
    visibilityRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        paddingHorizontal: 20,
        paddingBottom: 18,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#0E0E0E',
        borderTopWidth: 1,
        borderTopColor: '#2A2A2A',
        padding: 16,
    },
    submitButton: {
        height: 62,
        borderRadius: 31,
        backgroundColor: '#D4B13A',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#D4B13A',
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    submitText: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#111' },
});