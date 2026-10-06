import React, { useEffect, useRef } from 'react';
import { Animated, type ViewStyle } from 'react-native';

import { useTheme } from '../theme/useTheme';
import { radii } from '../tokens/radii';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radii.md,
  style,
}: SkeletonProps) {
  const { theme } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: false }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  const bgColor = shimmer.interpolate({
    inputRange:  [0, 1],
    outputRange: [theme.colors.border, theme.colors.secondary],
  });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: bgColor },
        style,
      ]}
    />
  );
}
