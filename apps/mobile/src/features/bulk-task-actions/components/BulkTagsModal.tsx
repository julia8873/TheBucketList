import React from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { Check } from 'lucide-react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { styles } from '../styles/bulk-actions.styles';
import type { Tag } from '../../../hooks/useTags';
import { useTranslation } from '@bucketlist/shared';

interface BulkTagsModalProps {
  visible: boolean;
  count: number;
  allTags: Tag[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onClose: () => void;
  onApply: () => void;
  title?: string;
}

export function BulkTagsModal({
  visible,
  count,
  allTags,
  selectedTagIds,
  onToggleTag,
  onClose,
  onApply,
  title,
}: BulkTagsModalProps) {
  const { t } = useTranslation();
  if (!visible) return null;

  return (
    <Modal
      transparent
      animationType="slide"
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title || t('bulk_actions.tags_modal_title', { count })}</Text>
          </View>

          <ScrollView style={{ maxHeight: 280 }}>
            <View style={styles.tagsContainer}>
              {allTags.map((tag) => {
                const isSelected = selectedTagIds.includes(tag.id);
                const tagColor = tag.color || gold[400];
                return (
                  <Pressable
                    key={tag.id}
                    style={[
                      styles.tagPill,
                      isSelected && {
                        borderColor: tagColor,
                        backgroundColor: `${tagColor}33`,
                      },
                    ]}
                    onPress={() => onToggleTag(tag.id)}
                  >
                    {tag.emoji && <Text style={{ fontSize: 13, marginRight: 4 }}>{tag.emoji}</Text>}
                    <Text
                      style={[
                        styles.tagText,
                        isSelected && { color: tagColor, fontWeight: '600' },
                      ]}
                    >
                      {tag.name}
                    </Text>
                    {isSelected && <Check size={12} color={tagColor} style={{ marginLeft: 4 }} />}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <Pressable
            style={[styles.applyBtn, !selectedTagIds.length && styles.applyBtnDisabled]}
            disabled={!selectedTagIds.length}
            onPress={onApply}
          >
            <Text style={styles.applyBtnText}>{t('bulk_actions.assign_tags_btn', { count: selectedTagIds.length })}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
