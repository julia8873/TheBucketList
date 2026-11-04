/**
 * SegmentedControl — tab navigation
 * Matches the reference design: flat labels with a gold underline
 * for the active tab (no pill/background).
 */
import React, { useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { fontFamily, fontSize } from '../tokens/typography';
import { gold, dark } from '../tokens/colors';
import { useTheme } from '../theme/useTheme';
import { radii } from '../tokens/radii';
import { spacing } from '../tokens/spacing';

export interface SegmentOption {
  key: string;
  label: string;
}

interface SegmentedControlProps {
  options: SegmentOption[];
  selected: string;
  onChange: (key: string) => void;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

export function SegmentedControl({
  options,
  selected,
  onChange,
  style,
  labelStyle,
}: SegmentedControlProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.dark ? '#141414' : '#EDE8DE',
          borderColor: theme.colors.border,
        },
        style,
      ]}
      accessible
      accessibilityRole="tablist"
    >
      {options.map((opt) => {
        const isActive = opt.key === selected;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[
              styles.option,
              isActive && { backgroundColor: theme.colors.primary },
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={opt.label}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: isActive ? theme.colors.primaryForeground : theme.colors.foregroundMuted,
                  fontFamily: fontFamily.semibold,
                },
                options.length >= 4 && { fontSize: 13 },
                labelStyle,
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    padding: 3,
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: 'transparent',
  },
  label: {
    fontSize: 14,
  },
});
