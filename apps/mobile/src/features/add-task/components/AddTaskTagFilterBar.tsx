import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { Tag as TagIcon, X } from 'lucide-react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { useTranslation } from '@bucketlist/shared';
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
  const { t } = useTranslation();

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
          accessibilityLabel={t('add_task.filter_tags', { defaultValue: 'Filtrar por etiquetas' })}
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
            {selectedTagIds.length > 0
              ? t('add_task.tags_count', { count: selectedTagIds.length, defaultValue: `Etiquetas · ${selectedTagIds.length}` })
              : t('add_task.tags', { defaultValue: 'Etiquetas' })}
          </Text>
        </Pressable>

        {selectedTags.map((tItem) => (
          <Pressable
            key={tItem.id}
            onPress={() => onRemoveTag(tItem.id)}
            accessibilityRole="button"
            accessibilityLabel={t('add_task.remove_tag', { name: tItem.name, defaultValue: `Quitar etiqueta ${tItem.name}` })}
            style={styles.activeTagChip}
          >
            {tItem.emoji ? (
              <View
                style={[
                  styles.activeTagEmoji,
                  { backgroundColor: hexToRgba(tItem.color, 0.3) },
                ]}
              >
                <Text style={styles.activeTagEmojiText}>{tItem.emoji}</Text>
              </View>
            ) : (
              <View style={[styles.activeTagDot, { backgroundColor: tItem.color }]} />
            )}
            <Text style={styles.activeTagText} numberOfLines={1}>
              {tItem.name}
            </Text>
            <X size={14} color="#E5E5E5" strokeWidth={2} />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
