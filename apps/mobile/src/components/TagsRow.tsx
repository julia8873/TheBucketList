import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Tag, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTagPickerStore } from '../stores/tagPicker.store';

interface TagsRowProps {
  selectedTags: any[];
}

export function TagsRow({ selectedTags }: TagsRowProps) {
  const router = useRouter();
  const { setSelectedTags } = useTagPickerStore();

  const handlePress = () => {
    setSelectedTags(selectedTags);
    router.push('/(modals)/tag-picker');
  };

  let displayValue = 'Ninguna';
  let textColor = '#6B6B6B';

  if (selectedTags.length > 0) {
    textColor = '#D4B13A';
    if (selectedTags.length <= 2) {
      displayValue = selectedTags.map(t => t.name).join(', ');
    } else {
      displayValue = `${selectedTags[0].name}, ${selectedTags[1].name} +${selectedTags.length - 2}`;
    }
  }

  return (
    <Pressable style={styles.settingRow} onPress={handlePress}>
      <Tag color="#D4B13A" size={24} />
      <Text style={styles.settingLabel}>Etiquetas</Text>
      <Text style={[styles.settingValue, { color: textColor }]} numberOfLines={1}>
        {displayValue}
      </Text>
      <ChevronRight color="#6B6B6B" size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  settingLabel: {
    flex: 1,
    marginLeft: 12,
    color: '#FFF',
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
  },
  settingValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    marginRight: 4,
    maxWidth: 150,
  },
});
