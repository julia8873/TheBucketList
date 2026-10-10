/**
 * FilterChip — pill-shaped filter button
 * Active: gold border + gold text. Inactive: dark border + muted text.
 */
import React from 'react';
import { Pressable, Text, StyleSheet, type ViewStyle } from 'react-native';
import { fontFamily, fontSize } from '../tokens/typography';
import { gold, dark } from '../tokens/colors';
import { useTheme } from '../theme/useTheme';

interface FilterChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function FilterChip({ label, active = false, onPress, style, accessibilityLabel }: FilterChipProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: active ? 'transparent' : '#1A1A1A',
          borderColor: active ? gold[400] : '#333333',
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text
        style={[
          styles.label,
          {
            color: active ? gold[400] : '#E5E5E5',
            fontFamily: fontFamily.medium,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 13,
  },
});
