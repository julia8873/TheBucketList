import React, { useRef, useState } from 'react';
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
import { X, Check, Trash2, ChevronLeft, ChevronRight, Pipette } from 'lucide-react-native';
import { useTheme, gold } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { ColorPickerModal, isColorDark } from '@/components/ColorPickerModal';
import { useCustomColors } from '@/hooks/useCustomColors';
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
  '🔥', '🚀', '💻', '🎉', '🍕', '✈️', '🎨', '🎵', '💛',
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
  const { t } = useTranslation();
  const { savedColors } = useCustomColors();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const emojiScrollRef = useRef<ScrollView>(null);
  const emojiScrollX = useRef(0);

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
            {editingDailyTag ? t('tags.edit_tag') : t('tags.new_tag')}
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <X size={18} color={theme.colors.foregroundMuted} />
          </Pressable>
        </View>

        {/* Input Name */}
        <Text style={[styles.fieldLabel, { color: theme.colors.foregroundMuted }]}>{t('tags.tag_name')}</Text>
        <TextInput
          style={[
            styles.modalInput,
            {
              backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.foreground,
            },
          ]}
          placeholder={t('tags.tag_name_placeholder')}
          placeholderTextColor={theme.colors.foregroundSubtle ?? '#888'}
          value={tagFormName}
          onChangeText={setTagFormName}
          autoFocus
        />

        {/* Color Selector */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 6 }}>
          <Text style={[styles.fieldLabel, { color: theme.colors.foregroundMuted, marginTop: 0, marginBottom: 0 }]}>
            {t('tags.tag_color')}
          </Text>
          <Pressable
            onPress={() => setShowColorPicker(true)}
            hitSlop={6}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
          >
            <Pipette size={13} color={gold[400]} />
            <Text style={{ fontSize: 12, color: gold[400], fontWeight: '600' }}>
              {t('common.custom_color', { defaultValue: 'Personalizado' })}
            </Text>
          </Pressable>
        </View>

        <View style={styles.paletteRow}>
          {TAG_COLOR_PALETTE.map((c) => (
            <Pressable
              key={c}
              style={[
                styles.paletteCircle,
                { backgroundColor: c },
                tagFormColor.toLowerCase() === c.toLowerCase() && styles.paletteCircleSelected,
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
              onPress={() => setTagFormColor(c)}
            >
              {tagFormColor.toLowerCase() === c.toLowerCase() && <Check size={13} color="#FFF" />}
            </Pressable>
          ))}
          {/* User saved colors */}
          {savedColors
            .filter((sc) => !TAG_COLOR_PALETTE.some((tc) => tc.toLowerCase() === sc.toLowerCase()))
            .slice(0, 6)
            .map((c) => {
              const isSelected = tagFormColor.toLowerCase() === c.toLowerCase();
              return (
                <Pressable
                  key={c}
                  style={[
                    styles.paletteCircle,
                    { backgroundColor: c },
                    isSelected && styles.paletteCircleSelected,
                    Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                  ]}
                  onPress={() => setTagFormColor(c)}
                >
                  {isSelected && <Check size={13} color={isColorDark(c) ? '#FFF' : '#000'} />}
                </Pressable>
              );
            })}
          {/* Color picker circle launcher */}
          <Pressable
            style={[
              styles.paletteCircle,
              {
                backgroundColor: !TAG_COLOR_PALETTE.some((tc) => tc.toLowerCase() === tagFormColor.toLowerCase())
                  ? tagFormColor
                  : (theme.colors.surfaceElevated ?? theme.colors.surface),
                borderColor: !TAG_COLOR_PALETTE.some((tc) => tc.toLowerCase() === tagFormColor.toLowerCase())
                  ? gold[400]
                  : theme.colors.border,
                borderWidth: 1.5,
              },
              Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
            ]}
            onPress={() => setShowColorPicker(true)}
            accessibilityRole="button"
            accessibilityLabel="Color personalizado"
          >
            <Pipette
              size={14}
              color={
                !TAG_COLOR_PALETTE.some((tc) => tc.toLowerCase() === tagFormColor.toLowerCase())
                  ? isColorDark(tagFormColor) ? '#FFF' : '#000'
                  : gold[400]
              }
            />
          </Pressable>
        </View>

        <ColorPickerModal
          visible={showColorPicker}
          initialColor={tagFormColor}
          onSelectColor={(color) => {
            setTagFormColor(color);
          }}
          onClose={() => setShowColorPicker(false)}
        />

        {/* Custom Emoji Input & Presets */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 6 }}>
          <Text style={[styles.fieldLabel, { color: theme.colors.foregroundMuted, marginTop: 0, marginBottom: 0 }]}>
            {t('tags.tag_icon')}
          </Text>
          {Platform.OS === 'web' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Pressable
                onPress={() => {
                  const nextX = Math.max(0, emojiScrollX.current - 140);
                  emojiScrollRef.current?.scrollTo({ x: nextX, animated: true });
                }}
                hitSlop={8}
                style={[
                  styles.emojiNavBtn,
                  {
                    backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                  Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                ]}
                accessibilityRole="button"
                accessibilityLabel="Anterior"
              >
                <ChevronLeft size={13} color={theme.colors.foregroundMuted} />
              </Pressable>
              <Pressable
                onPress={() => {
                  const nextX = emojiScrollX.current + 140;
                  emojiScrollRef.current?.scrollTo({ x: nextX, animated: true });
                }}
                hitSlop={8}
                style={[
                  styles.emojiNavBtn,
                  {
                    backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                  Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
                ]}
                accessibilityRole="button"
                accessibilityLabel="Siguiente"
              >
                <ChevronRight size={13} color={theme.colors.foregroundMuted} />
              </Pressable>
            </View>
          )}
        </View>
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
            {t('tags.tag_emoji_hint')}
          </Text>
        </View>

        <ScrollView
          ref={emojiScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => {
            emojiScrollX.current = e.nativeEvent.contentOffset.x;
          }}
          scrollEventThrottle={16}
          style={[
            styles.emojiScrollView,
            Platform.OS === 'web' && ({
              maxWidth: '100%',
              minWidth: 0,
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            } as any),
          ]}
          contentContainerStyle={[styles.emojiScrollContent, { gap: 8, paddingBottom: 6 }]}
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
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
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
            <Text style={styles.deleteTagRowText}>{t('tags.delete_this_tag')}</Text>
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
            <Text style={[styles.modalCancelBtnText, { color: theme.colors.foreground }]}>{t('common.cancel')}</Text>
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
                {editingDailyTag ? t('common.save') : t('tags.create_tag')}
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
