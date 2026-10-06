import React from 'react';
import { View, type ViewStyle, StyleSheet } from 'react-native';

import { useTheme } from '../theme/useTheme';
import { Typography } from './Typography';
import { spacing } from '../tokens/spacing';

interface DividerProps {
  label?: string;
  style?: ViewStyle;
  orientation?: 'horizontal' | 'vertical';
}

export function Divider({ label, style, orientation = 'horizontal' }: DividerProps) {
  const { theme } = useTheme();

  if (orientation === 'vertical') {
    return (
      <View
        style={[
          { width: 1, alignSelf: 'stretch', backgroundColor: theme.colors.border },
          style,
        ]}
      />
    );
  }

  if (label) {
    return (
      <View style={[styles.row, style]}>
        <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
        <Typography
          variant="caption"
          color={theme.colors.foregroundSubtle}
          style={styles.labelText}
        >
          {label}
        </Typography>
        <View style={[styles.line, { backgroundColor: theme.colors.border }]} />
      </View>
    );
  }

  return (
    <View
      style={[{ height: 1, backgroundColor: theme.colors.border, alignSelf: 'stretch' }, style]}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  line: {
    flex: 1,
    height: 1,
  },
  labelText: {
    textTransform: 'uppercase',
  },
});
