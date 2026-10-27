import { themedStyleSheet } from '@bucketlist/ui';
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
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
  const { theme } = useTheme();
  const { t } = useTranslation();
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
  const errorText = duplicate ? t('tags.duplicate_error') : error;
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
      setError(e?.message || t('tags.save_error'));
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
      setError(e?.message || t('tags.delete_error'));
    }
  };

  const note = !isEdit
    ? t('tags.note_create')
    : usageCount === 0
      ? t('tags.note_edit_empty')
      : usageCount === 1
        ? t('tags.note_edit_used_one')
        : t('tags.note_edit_used_many', { count: usageCount });

  return (
    <TagSheetShell visible={visible} onClose={onClose}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.colors.foreground }]}>{isEdit ? t('tags.edit_title') : t('tags.create_title')}</Text>

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
            <Text style={[styles.previewText, { color: theme.colors.foreground }]} numberOfLines={1}>
              {trimmed || t('tags.preview_placeholder')}
            </Text>
          </View>

          {/* Nombre */}
          <GoldLabel style={{ marginTop: 24 }}>{t('tags.name_label')}</GoldLabel>
          <View
            style={[
              styles.inputBox,
              { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface },
              !!errorText && { borderColor: '#E5877D' },
            ]}
          >
            <TextInput
              style={[styles.input, { color: theme.colors.foreground }]}
              value={name}
              onChangeText={(t2) => {
                setName(t2.slice(0, TAG_NAME_MAX));
                setError(null);
              }}
              placeholder={t('tags.name_placeholder')}
              placeholderTextColor={theme.colors.foregroundSubtle ?? '#6B6B6B'}
              maxLength={TAG_NAME_MAX}
              autoFocus={!isEdit}
              returnKeyType="done"
              onSubmitEditing={() => void save()}
              accessibilityLabel={t('tags.name_accessibility')}
            />
            <Text style={[styles.counter, { color: theme.colors.foregroundMuted }]}>
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

          <Text style={[styles.note, { color: theme.colors.foregroundMuted }]}>{note}</Text>
        </ScrollView>

        {/* Pie */}
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.border,
              paddingBottom: Math.max(insets.bottom, 16) + 12,
            },
          ]}
        >
          <Pressable
            style={[styles.cta, !canSave && { opacity: 0.5 }]}
            onPress={() => void save()}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityLabel={isEdit ? t('tags.save_accessibility') : t('tags.create_accessibility')}
          >
            {saving ? (
              <ActivityIndicator color={theme.dark ? '#111111' : '#FFFFFF'} />
            ) : (
              <Text style={styles.ctaText}>{isEdit ? t('tags.save_changes') : t('tags.create_btn')}</Text>
            )}
          </Pressable>
          {isEdit && (
            <Pressable
              onPress={() => setConfirmDelete(true)}
              hitSlop={8}
              style={styles.deleteBtn}
              accessibilityRole="button"
              accessibilityLabel={t('tags.delete_accessibility')}
            >
              <Text style={styles.deleteText}>{t('tags.delete_btn')}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <ConfirmDialog
        visible={confirmDelete}
        title={t('tags.delete_confirm_title')}
        message={
          usageCount > 1
            ? t('tags.delete_confirm_used_many', { name: tag?.name ?? '', count: usageCount })
            : usageCount === 1
            ? t('tags.delete_confirm_used_one', { name: tag?.name ?? '' })
            : t('tags.delete_confirm_unused', { name: tag?.name ?? '' })
        }
        confirmLabel={t('tags.delete_confirm_btn')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={deleteTag.isPending}
        onConfirm={() => void remove()}
        onCancel={() => setConfirmDelete(false)}
      />
    </TagSheetShell>
  );
}

const styles = themedStyleSheet({
  content: { flexShrink: 1 },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 24,
    color: '#F5F0E6',
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 14,
  },
  scroll: { flexShrink: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },
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
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
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
