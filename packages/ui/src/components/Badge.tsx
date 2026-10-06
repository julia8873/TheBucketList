import React from 'react';
import { View, type ViewStyle, StyleSheet } from 'react-native';

import { useTheme } from '../theme/useTheme';
import { Typography } from './Typography';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import type { ThemeColors } from '../theme/types';

type BadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'primary';
type BadgeStyle = 'filled' | 'outlined';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  badgeStyle?: BadgeStyle;
  style?: ViewStyle;
}

function getBadgeColors(
  variant: BadgeVariant,
  style: BadgeStyle,
  colors: ThemeColors,
): { bg: string; text: string; border?: string } {
  const map: Record<BadgeVariant, { bg: string; text: string }> = {
    default:  { bg: colors.secondary,        text: colors.secondaryForeground },
    primary:  { bg: colors.primary,          text: colors.primaryForeground },
    success:  { bg: colors.successBackground, text: colors.success },
    error:    { bg: colors.errorBackground,   text: colors.error },
    warning:  { bg: colors.warningBackground, text: colors.warning },
    info:     { bg: colors.infoBackground,    text: colors.info },
  };
  const base = map[variant];
  if (style === 'outlined') {
    return { bg: 'transparent', text: base.text, border: base.text };
  }
  return base;
}

export function Badge({
  label,
  variant = 'default',
  badgeStyle = 'filled',
  style,
}: BadgeProps) {
  const { theme } = useTheme();
  const { bg, text, border } = getBadgeColors(variant, badgeStyle, theme.colors);

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          borderColor: border ?? 'transparent',
          borderWidth: border ? 1 : 0,
        },
        style,
      ]}
    >
      <Typography variant="label" color={text}>
        {label}
      </Typography>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingVertical: spacing[0.5],
    paddingHorizontal: spacing[2],
    borderRadius: radii.full,
  },
});
