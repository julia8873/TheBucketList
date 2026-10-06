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
  type ViewStyle,
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
  style?: ViewStyle;
}

export function SegmentedControl({
  options,
  selected,
  onChange,
  style,
}: SegmentedControlProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
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
              isActive && styles.optionActive,
            ]}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={opt.label}
          >
            <Text
              style={[
                styles.label,
                {
                  color: isActive ? theme.colors.foreground : theme.colors.foregroundMuted,
                  fontFamily: isActive ? fontFamily.semibold : fontFamily.regular,
                },
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
    height: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: dark[400],
  },
  option: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  optionActive: {
    borderBottomColor: gold[400],
  },
  label: {
    fontSize: fontSize.sm,
    letterSpacing: 0,
  },
});
