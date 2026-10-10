import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TagSheetShell } from './TagSheetShell';
import { TagAppearanceFields, GoldLabel } from './TagAppearanceFields';
import { ConfirmDialog } from './SettingsParts';
import { TAG_COLORS, TAG_NAME_MAX, hexToRgba } from '../constants/tagPresets';
import { useCreateTag, useDeleteTag, useTags, useUpdateTag, type Tag } from '../hooks/useTags';

const GOLD = '#D4B13A';
const norm = (s: string) => s.trim().toLowerCase();

interface TagEditSheetProps {
  visible: boolean;
  /** Etiqueta a editar. `null` = crear una nueva. */
  tag: Tag | null;
  /** Nº de tareas que usan la etiqueta (solo al editar). */
  usageCount?: number;
  onClose: () => void;
  onSaved?: (tag: Tag) => void;
  onDeleted?: (id: string) => void;
}

export function TagEditSheet({ visible, tag, usageCount = 0, onClose, onSaved, onDeleted }: TagEditSheetProps) {
  const insets = useSafeAreaInsets();
  const isEdit = !!tag;

  const { data: tags = [] } = useTags();
  const createTag = useCreateTag();
  const updateTag = useUpdateTag();
  const deleteTag = useDeleteTag();

  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState<string | null>(null);
  const [color, setColor] = useState<string>(TAG_COLORS[0].value);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Se cambia al abrir para reiniciar el estado interno de los campos de apariencia.
  const [session, setSession] = useState(0);

  // Al abrir: cargar la etiqueta (o valores por defecto si es nueva).
  useEffect(() => {
    if (!visible) return;
    setName(tag?.name ?? '');
    setEmoji(tag?.emoji ?? null);
    setColor(tag?.color ?? TAG_COLORS[tags.length % TAG_COLORS.length]!.value);
    setError(null);
    setConfirmDelete(false);
    setSession((s) => s + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, tag?.id]);

  const trimmed = name.trim();
  const duplicate = useMemo(
    () => (trimmed ? tags.find((t) => t.id !== tag?.id && norm(t.name) === norm(trimmed)) : undefined),
    [tags, tag?.id, trimmed],
  );
  const errorText = duplicate ? 'Ya existe una etiqueta con ese nombre' : error;
  const saving = createTag.isPending || updateTag.isPending;
  const canSave = !!trimmed && !duplicate && !saving;

  const save = async () => {
    if (!canSave) return;
    setError(null);
    try {
      const saved = tag
        ? await updateTag.mutateAsync({ id: tag.id, name: trimmed, color, emoji })
        : await createTag.mutateAsync({ name: trimmed, color, emoji });
      onSaved?.(saved);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'No se pudo guardar la etiqueta. Inténtalo de nuevo.');
    }
  };

  const remove = async () => {
    if (!tag) return;
    try {
      await deleteTag.mutateAsync(tag.id);
      setConfirmDelete(false);
      onDeleted?.(tag.id);
      onClose();
    } catch (e: any) {
      setConfirmDelete(false);
      setError(e?.message || 'No se pudo eliminar la etiqueta.');
    }
  };

  const note = !isEdit
    ? 'Elige un nombre, un emoji y un color. Podrás cambiarlos cuando quieras.'
    : usageCount === 0
      ? 'Sin tareas todavía. Al cambiarla se actualiza en todas.'
      : `Usada en ${usageCount} ${usageCount === 1 ? 'tarea' : 'tareas'}. Al cambiarla se actualiza en todas.`;

  return (
    <TagSheetShell visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <Text style={styles.title}>{isEdit ? 'Editar etiqueta' : 'Nueva etiqueta'}</Text>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Vista previa */}
          <View
            style={[
              styles.preview,
              { backgroundColor: hexToRgba(color, 0.14), borderColor: hexToRgba(color, 0.4) },
            ]}
          >
            {emoji ? (
              <View style={[styles.previewEmoji, { backgroundColor: hexToRgba(color, 0.3) }]}>
                <Text style={styles.previewEmojiText}>{emoji}</Text>
              </View>
            ) : (
              <View style={[styles.previewDot, { backgroundColor: color }]} />
            )}
            <Text style={styles.previewText} numberOfLines={1}>
              {trimmed || 'Nueva etiqueta'}
            </Text>
          </View>

          {/* Nombre */}
          <GoldLabel style={{ marginTop: 24 }}>NOMBRE</GoldLabel>
          <View style={[styles.inputBox, !!errorText && { borderColor: '#E5877D' }]}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={(t) => {
                setName(t.slice(0, TAG_NAME_MAX));
                setError(null);
              }}
              placeholder="Ej. Luna de miel"
              placeholderTextColor="#6B6B6B"
              maxLength={TAG_NAME_MAX}
              autoFocus={!isEdit}
              returnKeyType="done"
              onSubmitEditing={() => void save()}
              accessibilityLabel="Nombre de la etiqueta"
            />
            <Text style={styles.counter}>
              {name.length}/{TAG_NAME_MAX}
            </Text>
          </View>
          {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}

          {/* Emoji + color (con valores por defecto y opción personalizada) */}
          <TagAppearanceFields
            key={session}
            name={name}
            emoji={emoji}
            color={color}
            autoColor={!isEdit}
            onChange={(next) => {
              if (next.emoji !== undefined) setEmoji(next.emoji);
              if (next.color !== undefined) setColor(next.color);
            }}
          />

          <Text style={styles.note}>{note}</Text>
        </ScrollView>

        {/* Pie */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <Pressable
            style={[styles.cta, !canSave && { opacity: 0.5 }]}
            onPress={() => void save()}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityLabel={isEdit ? 'Guardar cambios' : 'Crear etiqueta'}
          >
            {saving ? (
              <ActivityIndicator color="#111111" />
            ) : (
              <Text style={styles.ctaText}>{isEdit ? 'Guardar cambios' : 'Crear etiqueta'}</Text>
            )}
          </Pressable>
          {isEdit && (
            <Pressable
              onPress={() => setConfirmDelete(true)}
              hitSlop={8}
              style={styles.deleteBtn}
              accessibilityRole="button"
              accessibilityLabel="Eliminar etiqueta"
            >
              <Text style={styles.deleteText}>Eliminar etiqueta</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ConfirmDialog
        visible={confirmDelete}
        title="Eliminar etiqueta"
        message={
          usageCount > 0
            ? `«${tag?.name}» se quitará de ${usageCount} ${usageCount === 1 ? 'tarea' : 'tareas'}. Las tareas no se borran. Esta acción no se puede deshacer.`
            : `Se eliminará «${tag?.name}». Esta acción no se puede deshacer.`
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        destructive
        loading={deleteTag.isPending}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      />
    </TagSheetShell>
  );
}

const styles = StyleSheet.create({
  content: { flexShrink: 1 },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
    color: '#F5F0E6',
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 14,
  },
  scroll: { flexShrink: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  preview: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    height: 29,
    paddingHorizontal: 11,
    borderRadius: 15,
    borderWidth: 1,
  },
  previewDot: { width: 8, height: 8, borderRadius: 4, marginRight: 7 },
  previewEmoji: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: -7,
    marginRight: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmojiText: { fontSize: 12, lineHeight: 16, textAlign: 'center' },
  previewText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#F5F5F5', maxWidth: 240 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: GOLD,
  },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 18, color: '#F5F5F5', padding: 0 },
  counter: { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#8A8A8A', marginLeft: 12 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#E5877D', marginTop: 8, marginLeft: 6 },
  note: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 21, color: '#9A9A9A', marginTop: 22 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1F1F1F',
    backgroundColor: '#141414',
  },
  cta: { height: 54, borderRadius: 27, backgroundColor: GOLD, alignItems: 'center', justifyContent: 'center' },
  ctaText: { fontFamily: 'Inter_700Bold', fontSize: 18, color: '#111111' },
  deleteBtn: { alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  deleteText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#E5877D' },
});
