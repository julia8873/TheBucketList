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

  const isLightActive = !theme.dark && active;
  const chipBg = active 
    ? (theme.dark ? 'transparent' : 'rgba(212, 175, 55, 0.12)') 
    : theme.colors.surface;
  const chipBorder = active ? theme.colors.primary : theme.colors.border;
  const chipText = active ? theme.colors.primary : theme.colors.foregroundMuted;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: chipBg,
          borderColor: chipBorder,
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.label,
          {
            color: chipText,
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
