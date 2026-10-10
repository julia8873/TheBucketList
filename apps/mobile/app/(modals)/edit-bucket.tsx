import React, { useEffect, useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Typography, Button, Input, useTheme } from '@bucketlist/ui';
import { supabase } from '../../src/services/supabase';
import { useUpdateBucket } from '../../src/hooks/useBuckets';
import type { UpdateBucketForm } from '@bucketlist/shared';
import { TagsRow } from '../../src/components/TagsRow';
import { useTagPickerStore } from '../../src/stores/tagPicker.store';
import { useItemTags, useSyncItemTags } from '../../src/hooks/useTags';

export default function EditBucketModal() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const router = useRouter();
    const { theme } = useTheme();
    const updateBucket = useUpdateBucket();

    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [visibility, setVisibility] =
        useState<'public' | 'followers' | 'private'>('public');
    const [locationText, setLocationText] = useState('');
    const [deadline, setDeadline] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    
    const { selectedTags, setSelectedTags } = useTagPickerStore();
    const { data: itemTagsData } = useItemTags(id as string);
    const syncTags = useSyncItemTags();

    // Set initial tags
    useEffect(() => {
        if (itemTagsData && itemTagsData.length > 0) {
            setSelectedTags(itemTagsData.map((it: any) => it.tag));
        } else {
            setSelectedTags([]);
        }
    }, [itemTagsData]);

    useEffect(() => {
        if (!id) return;

        supabase
            .from('buckets')
            .select('title, description, visibility, location_text, deadline')
            .eq('id', id)
            .single()
            .then(({ data, error }) => {
                if (error || !data) {
                    Alert.alert(
                        'No se pudo cargar la tarea',
                        error?.message || 'Tarea no encontrada.'
                    );
                    router.back();
                    return;
                }

                setTitle(data.title || '');
                setDescription(data.description || '');
                setVisibility(data.visibility || 'public');
                setLocationText(data.location_text || '');
                setDeadline(data.deadline ? new Date(data.deadline) : null);
                setLoading(false);
            });
    }, [id, router]);

    const handleSave = () => {
        if (!id || !title.trim()) {
            Alert.alert(
                'Falta el título',
                'Escribe un título para la tarea.'
            );
            return;
        }

        const data: UpdateBucketForm = {
            title: title.trim(),
            description: description.trim() || undefined,
            visibility,
            location_text: locationText.trim() || null,
            deadline,
        };

        updateBucket.mutate(
            { id, data },
            {
                onSuccess: () => router.back(),
                onError: (error) =>
                    Alert.alert('No se pudo guardar', error.message),
            }
        );
    };

    if (loading) {
        // Auto-sync tags when changed
    useEffect(() => {
        if (!loading && id) {
            syncTags.mutate({ bucketId: id as string, selectedTagIds: selectedTags.map(t => t.id) });
        }
    }, [selectedTags]);
    return (
            <View
                style={[
                    styles.center,
                    { backgroundColor: theme.colors.background },
                ]}
            >
                <ActivityIndicator
                    size="large"
                    color={theme.colors.foreground}
                />
            </View>
        );
    }

    // Auto-sync tags when changed
    useEffect(() => {
        if (!loading && id) {
            syncTags.mutate({ bucketId: id as string, selectedTagIds: selectedTags.map(t => t.id) });
        }
    }, [selectedTags]);
    return (
        <KeyboardAvoidingView
            style={[
                styles.container,
                { backgroundColor: theme.colors.background },
            ]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <View style={styles.pageHeader}>
                    <View style={styles.headerTop}>
                        <Button
                            variant="ghost"
                            onPress={() => router.back()}
                        >
                            Cancelar
                        </Button>

                        <Button
                            variant="primary"
                            onPress={handleSave}
                            loading={updateBucket.isPending}
                        >
                            Guardar
                        </Button>
                    </View>

                    <Typography
                        variant="h1"
                        color={theme.colors.foreground}
                        style={styles.title}
                    >
                        Editar tarea
                    </Typography>

                    <Typography
                        variant="body"
                        color={theme.colors.foreground}
                        style={styles.subtitle}
                    >
                        Actualiza los detalles de tu tarea.
                    </Typography>
                </View>

                <ScrollView
                    contentContainerStyle={styles.content}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Input
                        label="Título"
                        value={title}
                        onChangeText={setTitle}
                        placeholder="¿Qué quieres hacer?"
                    />

                    <Input
                        label="Descripción"
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Cuéntanos más…"
                        multiline
                        numberOfLines={4}
                    />

                    <View style={styles.field}>
                        <Typography
                            variant="body"
                            style={styles.label}
                        >
                            Visibilidad
                        </Typography>

                        <View style={styles.row}>
                            {(
                                ['public', 'followers', 'private'] as const
                            ).map((value) => (
                                <Button
                                    key={value}
                                    variant={
                                        visibility === value
                                            ? 'secondary'
                                            : 'ghost'
                                    }
                                    size="sm"
                                    onPress={() =>
                                        setVisibility(value)
                                    }
                                >
                                    {value === 'public'
                                        ? 'Pública'
                                        : value === 'followers'
                                            ? 'Seguidores'
                                            : 'Privada'}
                                </Button>
                            ))}
                        </View>
                    </View>

                    <Input
                        label="Lugar"
                        value={locationText}
                        onChangeText={setLocationText}
                        placeholder="¿Dónde?"
                    />

                    <View style={styles.field}>
                        <Typography
                            variant="body"
                            style={styles.label}
                        >
                            Fecha límite
                        </Typography>

                        <Button
                            variant="secondary"
                            onPress={() => setShowDatePicker(true)}
                        >
                            {deadline
                                ? deadline.toLocaleDateString('es-ES')
                                : 'Sin fecha'}
                        </Button>

                        {deadline && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onPress={() => setDeadline(null)}
                                style={styles.clearDate}
                            >
                                Quitar fecha
                            </Button>
                        )}

                        </View>

                        <View style={{ backgroundColor: '#161616', borderRadius: 16, borderWidth: 1, borderColor: '#2A2A2A', overflow: 'hidden' }}>
                            <TagsRow selectedTags={selectedTags} />
                        {showDatePicker && (
                            <DateTimePicker
                                value={deadline || new Date()}
                                mode="date"
                                display="default"
                                onChange={(_event, date) => {
                                    setShowDatePicker(
                                        Platform.OS === 'ios'
                                    );

                                    if (date) {
                                        setDeadline(date);
                                    }
                                }}
                            />
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    safeArea: {
        flex: 1,
    },

    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    pageHeader: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
    },

    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 18,
    },

    title: {
        marginBottom: 4,
    },

    subtitle: {
        opacity: 0.6,
    },

    content: {
        paddingHorizontal: 20,
        paddingTop: 4,
        gap: 20,
        paddingBottom: 40,
    },

    field: {
        gap: 8,
    },

    label: {
        marginBottom: 2,
        fontWeight: '700',
    },

    row: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },

    clearDate: {
        alignSelf: 'flex-start',
    },
});