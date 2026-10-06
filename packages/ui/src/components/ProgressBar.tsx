import React, { useEffect, useRef } from 'react';
import { View, Animated, type ViewStyle, StyleSheet } from 'react-native';

import { useTheme } from '../theme/useTheme';
import { Typography } from './Typography';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { duration } from '../tokens/motion';

interface ProgressBarProps {
  value: number;        // 0–100
  label?: string;
  showPercent?: boolean;
  colorOverride?: string;
  style?: ViewStyle;
}

export function ProgressBar({
  value,
  label,
  showPercent = false,
  colorOverride,
  style,
}: ProgressBarProps) {
  const { theme } = useTheme();
  const clampedValue = Math.max(0, Math.min(100, value));
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: clampedValue,
      duration: duration.slow,
      useNativeDriver: false,
    }).start();
  }, [clampedValue, widthAnim]);

  const isNearLimit = clampedValue >= 80;
  const barColor =
    colorOverride ?? (isNearLimit ? theme.colors.warning : theme.colors.primary);

  const widthPercent = widthAnim.interpolate({
    inputRange:  [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.wrapper, style]}>
      {(label ?? showPercent) ? (
        <View style={styles.header}>
          {label ? (
            <Typography variant="caption" color={theme.colors.foregroundMuted}>
              {label}
            </Typography>
          ) : null}
          {showPercent ? (
            <Typography
              variant="caption"
              color={isNearLimit ? theme.colors.warning : theme.colors.foregroundMuted}
            >
              {clampedValue.toFixed(0)}%
            </Typography>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.track, { backgroundColor: theme.colors.border }]}>
        <Animated.View
          style={[styles.fill, { width: widthPercent, backgroundColor: barColor }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing[1] },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  track: {
    height: 6,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.full,
  },
});
