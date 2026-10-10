import React, { useState } from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { Tag, ChevronRight } from 'lucide-react-native';
import { TagPickerSheet, type TagItem } from './TagPickerSheet';

interface TagsRowProps {
  selectedTags: TagItem[];
  onChange: (tags: TagItem[]) => void;
}

export function TagsRow({ selectedTags, onChange }: TagsRowProps) {
  const [open, setOpen] = useState(false);

  let displayValue = 'Ninguna';
  let textColor = '#6B6B6B';

  if (selectedTags.length > 0) {
    textColor = '#D4B13A';
    displayValue =
      selectedTags.length <= 2
        ? selectedTags.map((t) => t.name).join(', ')
        : `${selectedTags[0]!.name}, ${selectedTags[1]!.name} +${selectedTags.length - 2}`;
  }

  return (
    <>
      <Pressable
        style={styles.settingRow}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Etiquetas"
      >
        <Tag color="#D4B13A" size={24} />
        <Text style={styles.settingLabel}>Etiquetas</Text>
        <Text style={[styles.settingValue, { color: textColor }]} numberOfLines={1}>
          {displayValue}
        </Text>
        <ChevronRight color="#6B6B6B" size={20} />
      </Pressable>

      <TagPickerSheet
        visible={open}
        selectedTags={selectedTags}
        onChange={onChange}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  settingRow: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
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