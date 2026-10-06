import React from 'react';
import { View, type ViewProps, StyleSheet } from 'react-native';

import { useTheme } from '../theme/useTheme';
import { radii } from '../tokens/radii';
import { spacing } from '../tokens/spacing';
import { shadows } from '../tokens/shadows';

type Variant = 'default' | 'elevated' | 'outlined';

interface CardProps extends ViewProps {
  variant?: Variant;
  padding?: number;
  children: React.ReactNode;
}

export function Card({
  variant = 'default',
  padding = spacing[4],
  style,
  children,
  ...props
}: CardProps) {
  const { theme } = useTheme();

  const variantStyle = () => {
    switch (variant) {
      case 'default':
        return {
          backgroundColor: theme.colors.surface,
          ...shadows.sm,
        };
      case 'elevated':
        return {
          backgroundColor: theme.colors.surfaceElevated,
          ...shadows.md,
        };
      case 'outlined':
        return {
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
    }
  };

  return (
    <View
      style={[styles.base, { padding, borderRadius: radii.xl }, variantStyle(), style]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});
