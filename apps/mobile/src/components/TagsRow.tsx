import { themedStyleSheet } from '@bucketlist/ui';
import React, { useState } from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { Tag, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { TagAssignSheet, type TagItem } from './TagAssignSheet';

interface TagsRowProps {
  selectedTags: TagItem[];
  onChange: (tags: TagItem[]) => void;
  /** Fila más baja (formulario de álbum). */
  compact?: boolean;
}

export function TagsRow({ selectedTags, onChange, compact = false }: TagsRowProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  let displayValue = t('tags.none');
  let textColor = theme.colors.foregroundMuted;

  if (selectedTags.length > 0) {
    textColor = '#D4B13A';
    displayValue =
      selectedTags.length <= 2
        ? selectedTags.map((tag) => tag.name).join(', ')
        : `${selectedTags[0]!.name}, ${selectedTags[1]!.name} +${selectedTags.length - 2}`;
  }

  return (
    <>
      <Pressable
        style={[styles.settingRow, compact && { height: 58 }, { borderBottomColor: theme.colors.border }]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('tags.tags_label')}
      >
        <Tag color="#D4B13A" size={24} />
        <Text style={[styles.settingLabel, compact && { fontSize: 17 }, { color: theme.colors.foreground }]}>{t('tags.tags_label')}</Text>
        <Text style={[styles.settingValue, { color: textColor }]} numberOfLines={1}>
          {displayValue}
        </Text>
        <ChevronRight color={theme.colors.foregroundMuted} size={20} />
      </Pressable>

      <TagAssignSheet
        visible={open}
        selectedTags={selectedTags}
        onChange={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const styles = themedStyleSheet({
  settingRow: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  settingLabel: {
    flex: 1,
    marginLeft: 16,
    color: '#FFF',
    fontFamily: 'Inter_500Medium',
    fontSize: 18,
  },
  settingValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 17,
    marginRight: 4,
    maxWidth: 170,
  },
});