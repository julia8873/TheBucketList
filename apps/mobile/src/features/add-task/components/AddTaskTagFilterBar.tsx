import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Tag as TagIcon, X } from 'lucide-react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { styles } from '../styles/add-task.styles';
import { hexToRgba } from '../../../constants/tagPresets';
import type { Tag } from '../../../hooks/useTags';

interface AddTaskTagFilterBarProps {
  selectedTagIds: string[];
  selectedTags: Tag[];
  onOpenSheet: () => void;
  onRemoveTag: (tagId: string) => void;
}

export function AddTaskTagFilterBar({
  selectedTagIds,
  selectedTags,
  onOpenSheet,
  onRemoveTag,
}: AddTaskTagFilterBarProps) {
  return (
    <View style={styles.tagFilterRow}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.tagFilterScroll}
      >
        <Pressable
          onPress={onOpenSheet}
          accessibilityRole="button"
          accessibilityLabel="Filtrar por etiquetas"
          style={[styles.tagFilterBtn, selectedTagIds.length > 0 && styles.tagFilterBtnActive]}
        >
          <TagIcon
            size={15}
            color={selectedTagIds.length > 0 ? gold[400] : '#E5E5E5'}
            strokeWidth={1.9}
          />
          <Text
            style={[
              styles.tagFilterText,
              selectedTagIds.length > 0 && { color: gold[400] },
            ]}
          >
            {selectedTagIds.length > 0 ? `Etiquetas · ${selectedTagIds.length}` : 'Etiquetas'}
          </Text>
        </Pressable>

        {selectedTags.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => onRemoveTag(t.id)}
            accessibilityRole="button"
            accessibilityLabel={`Quitar etiqueta ${t.name}`}
            style={styles.activeTagChip}
          >
            {t.emoji ? (
              <View
                style={[
                  styles.activeTagEmoji,
                  { backgroundColor: hexToRgba(t.color, 0.3) },
                ]}
              >
                <Text style={styles.activeTagEmojiText}>{t.emoji}</Text>
              </View>
            ) : (
              <View style={[styles.activeTagDot, { backgroundColor: t.color }]} />
            )}
            <Text style={styles.activeTagText} numberOfLines={1}>
              {t.name}
            </Text>
            <X size={14} color="#E5E5E5" strokeWidth={2} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
