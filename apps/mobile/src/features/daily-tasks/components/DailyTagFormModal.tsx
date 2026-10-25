import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { X, Check, Trash2 } from 'lucide-react-native';
import { useTheme, gold } from '@bucketlist/ui';
import { styles } from '../styles/explore.styles';
import type { DailyTag } from '../types';

interface DailyTagFormModalProps {
  visible: boolean;
  isNestedOverlay?: boolean;
  editingDailyTag: DailyTag | null;
  tagFormName: string;
  setTagFormName: (val: string) => void;
  tagFormColor: string;
  setTagFormColor: (val: string) => void;
  tagFormEmoji: string;
  setTagFormEmoji: (val: string) => void;
  isSavingTag: boolean;
  onSave: () => void;
  onDelete?: (tag: DailyTag) => void;
  onClose: () => void;
}

const TAG_COLOR_PALETTE = [
  '#D4B13A',
  '#3B82F6',
  '#10B981',
  '#EC4899',
  '#8B5CF6',
  '#F97316',
  '#06B6D4',
  '#EF4444',
];

const TAG_EMOJI_PRESETS = [
  '📌', '💼', '🏠', '🏃', '🛒', '📚', '⭐', '💡', '🎯',
  '🔥', '🚀', '💻', '🎉', '🍕', '✈️', '🎨', '🎵', '❤️',
];

export const DailyTagFormModal: React.FC<DailyTagFormModalProps> = ({
  visible,
  isNestedOverlay = false,
  editingDailyTag,
  tagFormName,
  setTagFormName,
  tagFormColor,
  setTagFormColor,
  tagFormEmoji,
  setTagFormEmoji,
  isSavingTag,
  onSave,
  onDelete,
  onClose,
}) => {
  const { theme } = useTheme();

  if (!visible) return null;

  const content = (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.modalOverlay}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.colors.foreground }]}>
            {editingDailyTag ? 'Editar etiqueta' : 'Nueva etiqueta'}
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <X size={18} color={theme.colors.foregroundMuted} />
          </Pressable>
        </View>

        {/* Input Name */}
        <Text style={[styles.fieldLabel, { color: theme.colors.foregroundMuted }]}>Nombre</Text>
        <TextInput
          style={[
            styles.modalInput,
            {
              backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.foreground,
            },
          ]}
          placeholder="Ej. Prioritario, Gimnasio..."
          placeholderTextColor={theme.colors.foregroundSubtle ?? '#888'}
          value={tagFormName}
          onChangeText={setTagFormName}
          autoFocus
        />

        {/* Color Selector */}
        <Text style={[styles.fieldLabel, { color: theme.colors.foregroundMuted }]}>Color</Text>
        <View style={styles.paletteRow}>
          {TAG_COLOR_PALETTE.map((c) => (
            <Pressable
              key={c}
              style={[
                styles.paletteCircle,
                { backgroundColor: c },
                tagFormColor === c && styles.paletteCircleSelected,
              ]}
              onPress={() => setTagFormColor(c)}
            >
              {tagFormColor === c && <Check size={13} color="#FFF" />}
            </Pressable>
          ))}
        </View>

        {/* Custom Emoji Input & Presets */}
        <Text style={[styles.fieldLabel, { color: theme.colors.foregroundMuted }]}>Icono / Emoji</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <TextInput
            style={{
              width: 48,
              height: 48,
              backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
              borderRadius: 12,
              borderWidth: 1.5,
              borderColor: tagFormColor || theme.colors.border,
              textAlign: 'center',
              fontSize: 22,
              color: theme.colors.foreground,
            }}
            value={tagFormEmoji}
            onChangeText={(text) => setTagFormEmoji(text.trim())}
            placeholder="📌"
            placeholderTextColor={theme.colors.foregroundSubtle ?? '#888'}
            maxLength={6}
          />
          <Text style={{ fontSize: 12, color: theme.colors.foregroundMuted, flex: 1, lineHeight: 16 }}>
            Escribe cualquier emoji desde tu teclado, o toca una sugerencia rápida:
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
        >
          {TAG_EMOJI_PRESETS.map((em) => (
            <Pressable
              key={em}
              style={[
                styles.emojiCircle,
                {
                  backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                tagFormEmoji === em && [
                  styles.emojiCircleSelected,
                  {
                    borderColor: gold[400],
                    backgroundColor: theme.dark ? '#262112' : '#FDF6E2',
                  },
                ],
              ]}
              onPress={() => setTagFormEmoji(em)}
            >
              <Text style={{ fontSize: 16 }}>{em}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* If editing, show delete button */}
        {editingDailyTag && onDelete && (
          <Pressable
            style={styles.deleteTagRow}
            onPress={() => onDelete(editingDailyTag)}
          >
            <Trash2 size={15} color="#FF453A" />
            <Text style={styles.deleteTagRowText}>Eliminar esta etiqueta</Text>
          </Pressable>
        )}

        {/* Buttons */}
        <View style={styles.modalFooterRow}>
          <Pressable
            style={[
              styles.modalCancelBtn,
              {
                backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                borderColor: theme.colors.border,
                borderWidth: 1,
              },
              Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
            ]}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={[styles.modalCancelBtnText, { color: theme.colors.foreground }]}>Cancelar</Text>
          </Pressable>
          <Pressable
            style={[
              styles.modalSubmitBtn,
              (!tagFormName.trim() || isSavingTag) && styles.modalSubmitBtnDisabled,
              Platform.OS === 'web' && ({ cursor: (!tagFormName.trim() || isSavingTag) ? 'not-allowed' : 'pointer' } as any),
            ]}
            disabled={!tagFormName.trim() || isSavingTag}
            onPress={onSave}
            accessibilityRole="button"
          >
            {isSavingTag ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.modalSubmitBtnText}>
                {editingDailyTag ? 'Guardar' : 'Crear etiqueta'}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  if (isNestedOverlay) {
    return <View style={StyleSheet.absoluteFill}>{content}</View>;
  }

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      {content}
    </Modal>
  );
};
