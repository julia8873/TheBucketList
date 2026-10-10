import React from 'react';
import { Pressable, Text, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { X } from 'lucide-react-native';

interface TagChipProps {
  label: string;
  variant?: 'default' | 'selected' | 'colored' | 'create';
  color?: string;
  onPress?: () => void;
  onRemove?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function TagChip({ label, variant = 'default', color, onPress, onRemove, style }: TagChipProps) {
  const isCreate = variant === 'create';
  const isSelected = variant === 'selected';
  const isColored = variant === 'colored';

  return (
    <Pressable
      style={[
        styles.chip,
        isSelected && styles.chipSelected,
        isCreate && styles.chipCreate,
        style,
      ]}
      onPress={onPress}
      disabled={!onPress && !onRemove}
    >
      {isColored && color && (
        <View style={[styles.colorDot, { backgroundColor: color }]} />
      )}
      
      <Text
        style={[
          styles.text,
          isSelected && styles.textSelected,
          isCreate && styles.textCreate,
        ]}
      >
        {label}
      </Text>

      {isSelected && onRemove && (
        <Pressable onPress={onRemove} style={styles.removeIcon} hitSlop={10} accessibilityLabel="Eliminar etiqueta">
          <X color="#D4B13A" size={14} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 21,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: '#D4B13A',
    backgroundColor: 'rgba(212, 177, 58, 0.12)',
  },
  chipCreate: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderColor: '#D4B13A',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  text: {
    color: '#E5E5E5',
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
  textSelected: {
    color: '#D4B13A',
  },
  textCreate: {
    color: '#D4B13A',
    fontFamily: 'Inter_600SemiBold',
  },
  removeIcon: {
    marginLeft: 6,
    marginRight: -4,
  },
});
