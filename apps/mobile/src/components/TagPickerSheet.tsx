import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    Modal,
    Pressable,
    Animated,
    PanResponder,
    ScrollView,
    TextInput,
    StyleSheet,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Search, X, ChevronLeft } from 'lucide-react-native';
import { TagChip } from '@bucketlist/ui';
import { useTags, useCreateTag } from '../hooks/useTags';

export interface TagItem {
    id: string;
    name: string;
    color: string;
}

const SCREEN_H = Dimensions.get('window').height;
const SHEET_H = Math.min(690, SCREEN_H * 0.88);

const COLORS = [
    { name: 'dorado', value: '#D4B13A' },
    { name: 'naranja', value: '#E8884A' },
    { name: 'azul', value: '#3F7FD0' },
    { name: 'morado', value: '#7A3FD0' },
    { name: 'verde', value: '#1E8A5E' },
    { name: 'rojo', value: '#C0453A' },
];

const SUGGESTED = ['Naturaleza', 'Fotografía', 'Aniversario', 'En solitario'];

const norm = (s: string) => s.trim().toLowerCase();

interface TagPickerSheetProps {
    visible: boolean;
    selectedTags: TagItem[];
    onChange: (tags: TagItem[]) => void;
    onClose: () => void;
}

function SectionLabel({ gold, rest }: { gold: string; rest?: string }) {
    return (
        <Text style={styles.label}>
            <Text style={{ color: '#D4B13A' }}>{gold}</Text>
            {rest ? ` ${rest}` : ''}
        </Text>
    );
}

export function TagPickerSheet({ visible, selectedTags, onChange, onClose }: TagPickerSheetProps) {
    const [mounted, setMounted] = useState(visible);
    const translateY = useRef(new Animated.Value(SHEET_H)).current;
    const backdrop = useRef(new Animated.Value(0)).current;
    const fade = useRef(new Animated.Value(1)).current;

    const [draft, setDraft] = useState<TagItem[]>(selectedTags);
    const [mode, setMode] = useState<'list' | 'create'>('list');
    const [query, setQuery] = useState('');
    const [name, setName] = useState('');
    const [color, setColor] = useState(COLORS[0]!.value);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const { data: tags = [], isLoading, isError, refetch } = useTags();
    const createTag = useCreateTag();

    const close = () => {
        onChange(draft);
        onClose();
    };
    const closeRef = useRef(close);
    closeRef.current = close;

    // Entrada / salida animada
    useEffect(() => {
        if (visible) {
            setDraft(selectedTags);
            setMode('list');
            setQuery('');
            setSubmitError(null);
            fade.setValue(1);
            translateY.setValue(SHEET_H);
            setMounted(true);
            Animated.parallel([
                Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
                Animated.timing(backdrop, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(translateY, { toValue: SHEET_H, duration: 220, useNativeDriver: true }),
                Animated.timing(backdrop, { toValue: 0, duration: 220, useNativeDriver: true }),
            ]).start(({ finished }) => {
                if (finished) setMounted(false);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    // Arrastrar hacia abajo para cerrar
    const pan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
            onPanResponderMove: (_, g) => {
                if (g.dy > 0) translateY.setValue(g.dy);
            },
            onPanResponderRelease: (_, g) => {
                if (g.dy > 120 || g.vy > 1.2) {
                    closeRef.current();
                } else {
                    Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
                }
            },
        })
    ).current;

    if (!mounted) return null;

    // ─── Derivados ──────────────────────────────────────────────────────────────
    const q = norm(query);
    const selectedIds = new Set(draft.map((t) => t.id));
    const existingNames = new Set(tags.map((t) => norm(t.name)));
    const available = tags.filter((t) => !selectedIds.has(t.id) && (!q || norm(t.name).includes(q)));
    const suggestions = SUGGESTED.filter((s) => !existingNames.has(norm(s)) && (!q || norm(s).includes(q)));
    const canCreateFromQuery = q.length > 0 && !existingNames.has(q);

    const duplicate = name.trim() ? tags.find((t) => norm(t.name) === norm(name)) : undefined;
    const errorText = duplicate ? 'Ya existe una etiqueta con ese nombre' : submitError;
    const nextColor = COLORS[tags.length % COLORS.length]!.value;

    // ─── Acciones ───────────────────────────────────────────────────────────────
    const switchMode = (next: 'list' | 'create') => {
        Animated.timing(fade, { toValue: 0, duration: 90, useNativeDriver: true }).start(() => {
            setMode(next);
            Animated.timing(fade, { toValue: 1, duration: 140, useNativeDriver: true }).start();
        });
    };

    const toggle = (tag: TagItem) => {
        setDraft((d) =>
            d.some((t) => t.id === tag.id) ? d.filter((t) => t.id !== tag.id) : [...d, tag]
        );
    };

    const openCreate = (prefill = '') => {
        setName(prefill.slice(0, 24));
        setColor(nextColor);
        setSubmitError(null);
        switchMode('create');
    };

    const pickSuggestion = async (label: string) => {
        try {
            const created = await createTag.mutateAsync({ name: label, color: nextColor });
            setDraft((d) => [...d, { id: created.id, name: created.name, color: created.color }]);
        } catch {
            setSubmitError('No se pudo crear la etiqueta. Inténtalo de nuevo.');
        }
    };

    const submitCreate = async () => {
        const n = name.trim();
        if (!n || duplicate) return;
        setSubmitError(null);
        try {
            const created = await createTag.mutateAsync({ name: n, color });
            setDraft((d) => [...d, { id: created.id, name: created.name, color: created.color }]);
            setQuery('');
            switchMode('list');
        } catch {
            setSubmitError('No se pudo crear la etiqueta. Inténtalo de nuevo.');
        }
    };

    const selectExisting = () => {
        if (!duplicate) return;
        setDraft((d) => (d.some((t) => t.id === duplicate.id) ? d : [...d, duplicate]));
        switchMode('list');
    };

    const onBack = () => (mode === 'create' ? switchMode('list') : close());

    // ─── Vista: lista ───────────────────────────────────────────────────────────
    const renderList = (
        <View style={{ flex: 1 }}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Etiquetas</Text>
                <Pressable style={styles.closeBtn} onPress={close} accessibilityLabel="Cerrar">
                    <X color="#F5F5F5" size={18} />
                </Pressable>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.searchBox}>
                    <Search color="#9A9A9A" size={20} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Buscar etiquetas"
                        placeholderTextColor="#6B6B6B"
                        value={query}
                        onChangeText={setQuery}
                        autoCorrect={false}
                    />
                </View>

                {draft.length > 0 && (
                    <>
                        <SectionLabel gold="SELECCIONADAS" rest={`· ${draft.length}`} />
                        <View style={styles.wrap}>
                            {draft.map((t) => (
                                <TagChip
                                    key={t.id}
                                    label={t.name}
                                    variant="selected"
                                    onRemove={() => toggle(t)}
                                />
                            ))}
                        </View>
                    </>
                )}

                <SectionLabel gold="TUS" rest="ETIQUETAS" />
                {isLoading ? (
                    <View style={styles.wrap}>
                        {[84, 110, 96, 72].map((w, i) => (
                            <View key={i} style={[styles.skeleton, { width: w }]} />
                        ))}
                    </View>
                ) : isError ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>No se pudieron cargar tus etiquetas.</Text>
                        <Pressable onPress={() => void refetch()} hitSlop={8}>
                            <Text style={styles.retryText}>Reintentar</Text>
                        </Pressable>
                    </View>
                ) : (
                    <View style={styles.wrap}>
                        {available.map((t) => (
                            <TagChip
                                key={t.id}
                                label={t.name}
                                variant="colored"
                                color={t.color}
                                onPress={() => toggle(t)}
                            />
                        ))}
                        <TagChip
                            label={canCreateFromQuery ? `Crear «${query.trim()}»` : '+ Crear etiqueta'}
                            variant="create"
                            onPress={() => openCreate(canCreateFromQuery ? query.trim() : '')}
                        />
                    </View>
                )}

                {suggestions.length > 0 && (
                    <>
                        <SectionLabel gold="SUGERIDAS" />
                        <View style={styles.wrap}>
                            {suggestions.map((s) => (
                                <TagChip key={s} label={s} onPress={() => void pickSuggestion(s)} />
                            ))}
                        </View>
                    </>
                )}
                {!!submitError && mode === 'list' && <Text style={[styles.errorText, { marginTop: 12 }]}>{submitError}</Text>}
            </ScrollView>

            <View style={styles.footer}>
                <Pressable style={styles.cta} onPress={close}>
                    <Text style={styles.ctaText}>Guardar etiquetas</Text>
                </Pressable>
            </View>
        </View>
    );

    // ─── Vista: crear etiqueta ──────────────────────────────────────────────────
    const canSubmit = !!name.trim() && !duplicate && !createTag.isPending;
    const renderCreate = (
        <View style={{ flexShrink: 1 }}>
            <View style={styles.headerRow}>
                <Pressable style={styles.closeBtn} onPress={() => switchMode('list')} accessibilityLabel="Volver">
                    <ChevronLeft color="#F5F5F5" size={22} />
                </Pressable>
                <Text style={[styles.title, { flex: 1, marginLeft: 14 }]}>Nueva etiqueta</Text>
            </View>

            <ScrollView
                style={{ flexShrink: 1 }}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <SectionLabel gold="NOMBRE" rest="DE LA ETIQUETA" />
                <TextInput
                    style={[styles.nameInput, !!errorText && { borderColor: '#C0453A' }]}
                    value={name}
                    onChangeText={(t) => {
                        setName(t.slice(0, 24));
                        setSubmitError(null);
                    }}
                    placeholder="Ej. Luna de miel"
                    placeholderTextColor="#6B6B6B"
                    autoFocus
                    maxLength={24}
                    returnKeyType="done"
                    onSubmitEditing={() => void submitCreate()}
                />
                {!!errorText && (
                    <View style={{ marginTop: 8 }}>
                        <Text style={styles.errorText}>{errorText}</Text>
                        {!!duplicate && (
                            <Pressable onPress={selectExisting} hitSlop={8}>
                                <Text style={styles.retryText}>Seleccionar la existente</Text>
                            </Pressable>
                        )}
                    </View>
                )}

                <SectionLabel gold="COLOR" />
                <View style={styles.colorRow}>
                    {COLORS.map((c) => {
                        const active = color === c.value;
                        return (
                            <Pressable
                                key={c.value}
                                onPress={() => setColor(c.value)}
                                accessibilityLabel={`Color ${c.name}`}
                                style={[styles.colorRing, active && { borderColor: '#D4B13A' }]}
                            >
                                <View style={[styles.colorDot, { backgroundColor: c.value }]} />
                            </Pressable>
                        );
                    })}
                </View>

                <SectionLabel gold="VISTA" rest="PREVIA" />
                <View style={styles.previewChip}>
                    <View style={[styles.previewDot, { backgroundColor: color }]} />
                    <Text style={styles.previewText}>{name.trim() || 'Nueva etiqueta'}</Text>
                </View>

                <View style={styles.btnRow}>
                    <Pressable style={[styles.cta, styles.ctaGhost]} onPress={() => switchMode('list')}>
                        <Text style={[styles.ctaText, { color: '#D4B13A' }]}>Cancelar</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.cta, { flex: 1.4 }, !canSubmit && { opacity: 0.5 }]}
                        onPress={() => void submitCreate()}
                        disabled={!canSubmit}
                    >
                        {createTag.isPending ? (
                            <ActivityIndicator color="#111" />
                        ) : (
                            <Text style={styles.ctaText}>Crear etiqueta</Text>
                        )}
                    </Pressable>
                </View>
            </ScrollView>
        </View>
    );

    return (
        <Modal visible transparent animationType="none" onRequestClose={onBack} statusBarTranslucent>
            <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdrop }]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Cerrar etiquetas" />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.sheet,
                        mode === 'list' ? { height: SHEET_H } : { maxHeight: SHEET_H },
                        { transform: [{ translateY }] },
                    ]}
                >
                    <View {...pan.panHandlers} style={styles.handleArea}>
                        <View style={styles.handle} />
                    </View>
                    <Animated.View style={[{ opacity: fade }, mode === 'list' ? { flex: 1 } : { flexShrink: 1 }]}>
                        {mode === 'list' ? renderList : renderCreate}
                    </Animated.View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet: {
        backgroundColor: '#161616',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderBottomWidth: 0,
        borderColor: '#2A2A2A',
        overflow: 'hidden',
    },
    handleArea: { paddingTop: 12, paddingBottom: 14, alignItems: 'center' },
    handle: { width: 44, height: 4, borderRadius: 2, backgroundColor: '#444' },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 26, color: '#F5F5F5' },
    closeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#161616',
        borderWidth: 1,
        borderColor: '#2A2A2A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
    label: {
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: 14,
        letterSpacing: 1,
        color: '#F5F5F5',
        marginTop: 24,
        marginBottom: 12,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        height: 50,
        marginTop: 18,
        paddingHorizontal: 18,
        borderRadius: 25,
        backgroundColor: '#0E0E0E',
        borderWidth: 1,
        borderColor: '#2A2A2A',
    },
    searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 16, color: '#F5F5F5', padding: 0 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    skeleton: { height: 42, borderRadius: 21, backgroundColor: '#1F1F1F' },
    errorBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    errorText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#E5877D' },
    retryText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#D4B13A', marginTop: 4 },
    footer: {
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 30,
        borderTopWidth: 1,
        borderTopColor: '#2A2A2A',
        backgroundColor: '#161616',
    },
    cta: {
        height: 58,
        borderRadius: 29,
        backgroundColor: '#D4B13A',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#D4B13A',
        shadowOpacity: 0.3,
        shadowRadius: 14,
        elevation: 6,
    },
    ctaGhost: {
        flex: 1,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#D4B13A',
        shadowOpacity: 0,
        elevation: 0,
    },
    ctaText: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#111' },
    nameInput: {
        height: 56,
        borderRadius: 16,
        backgroundColor: '#0E0E0E',
        borderWidth: 1,
        borderColor: '#D4B13A',
        paddingHorizontal: 18,
        fontFamily: 'PlayfairDisplay_700Bold',
        fontSize: 20,
        color: '#F5F5F5',
    },
    colorRow: { flexDirection: 'row', justifyContent: 'space-between' },
    colorRing: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 2,
        borderColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    colorDot: { width: 42, height: 42, borderRadius: 21 },
    previewChip: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        height: 42,
        paddingHorizontal: 18,
        borderRadius: 21,
        borderWidth: 1,
        borderColor: '#D4B13A',
        backgroundColor: 'rgba(212, 177, 58, 0.12)',
    },
    previewDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    previewText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: '#D4B13A' },
    btnRow: { flexDirection: 'row', gap: 12, marginTop: 28, paddingBottom: 16 },
});