import { themedStyleSheet, useTheme } from '@bucketlist/ui';
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Tag as TagIcon, Plus, X } from 'lucide-react-native';
import { styles } from '../styles/album-form.styles';
import { SectionTitle } from './SectionTitle';
import type { TagItem } from '../../../components/TagAssignSheet';
import { hexToRgba } from '../../../constants/tagPresets';

interface AlbumTagsSectionProps {
  selectedTags: TagItem[];
  onOpenTagPicker: () => void;
  onRemoveTag: (tag: TagItem) => void;
}

export function AlbumTagsSection({
  selectedTags,
  onOpenTagPicker,
  onRemoveTag,
}: AlbumTagsSectionProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <SectionTitle highlight="ETIQUETAS" rest=" DEL ÁLBUM" />
      <Text style={[localStyles.helpText, { color: theme.colors.foregroundMuted }]}>
        Las etiquetas seleccionadas se aplicarán automáticamente a todas las tareas de este álbum.
      </Text>

      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <View style={localStyles.cardInner}>
          <Pressable
            style={[
              localStyles.addTagBtn,
              {
                backgroundColor: theme.dark ? '#1A1A1A' : theme.colors.surfaceSunken,
                borderColor: theme.colors.border,
              },
            ]}
            onPress={onOpenTagPicker}
          >
            <View style={localStyles.iconCircle}>
              <TagIcon size={18} color="#D4B13A" strokeWidth={2} />
            </View>
            <Text style={[localStyles.addTagText, { color: theme.colors.foregroundMuted }]}>
              {selectedTags.length === 0
                ? 'Asignar etiquetas al álbum...'
                : `${selectedTags.length} etiqueta${selectedTags.length > 1 ? 's' : ''} asignada${selectedTags.length > 1 ? 's' : ''}`}
            </Text>
            <Plus color="#D4B13A" size={18} strokeWidth={2.5} />
          </Pressable>

          {selectedTags.length > 0 && (
            <View style={localStyles.chipsWrap}>
              {selectedTags.map((tag) => (
                <View
                  key={tag.id}
                  style={[
                    localStyles.tagChip,
                    {
                      borderColor: tag.color || '#D4B13A',
                      backgroundColor: hexToRgba(tag.color || '#D4B13A', 0.15),
                    },
                  ]}
                >
                  {tag.emoji ? (
                    <Text style={localStyles.emoji}>{tag.emoji}</Text>
                  ) : null}
                  <Text
                    style={[
                      localStyles.tagText,
                      { color: tag.color || '#D4B13A' },
                    ]}
                  >
                    {tag.name}
                  </Text>
                  <Pressable
                    hitSlop={8}
                    onPress={() => onRemoveTag(tag)}
                    style={localStyles.removeBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Eliminar etiqueta ${tag.name}`}
                  >
                    <X size={14} color={tag.color || '#D4B13A'} strokeWidth={2.2} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const localStyles = themedStyleSheet({
  helpText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#8F8F8F',
    marginBottom: 10,
    marginTop: -2,
  },
  cardInner: {
    padding: 14,
  },
  addTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 177, 58, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTagText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#BDB7AA',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  emoji: {
    fontSize: 14,
  },
  tagText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  removeBtn: {
    padding: 2,
    marginLeft: 2,
  },
});
