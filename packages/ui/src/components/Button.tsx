import React from 'react';
import {
  Pressable,
  ActivityIndicator,
  type PressableProps,
  type ViewStyle,
  type TextStyle,
  StyleSheet,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

import { useTheme } from '../theme/useTheme';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { fontFamily, fontSize, lineHeight } from '../tokens/typography';
import { duration } from '../tokens/motion';
import { shadows } from '../tokens/shadows';

// ─── Types ────────────────────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  title?: string;
  children?: React.ReactNode;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Component ────────────────────────────────────────────────────────────────

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  disabled,
  style,
  title,
  children,
  onPressIn,
  onPressOut,
  ...props
}: ButtonProps) {
  const { theme } = useTheme();
  const pressed = useSharedValue(0);

  const isDisabled = disabled ?? loading;

  // ── Press animation
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.97]) }],
    opacity: interpolate(pressed.value, [0, 1], [1, 0.85]),
  }));

  const handlePressIn = (e: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
    pressed.value = withTiming(1, { duration: duration.fast });
    onPressIn?.(e);
  };

  const handlePressOut = (e: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
    pressed.value = withTiming(0, { duration: duration.fast });
    onPressOut?.(e);
  };

  // ── Variant styles
  const getVariantStyle = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'primary':
        return {
          container: {
            backgroundColor: isDisabled
              ? theme.colors.foregroundSubtle
              : theme.colors.primary,
            ...shadows.sm,
          },
          text: { color: theme.colors.primaryForeground },
        };
      case 'secondary':
        return {
          container: {
            backgroundColor: theme.colors.secondary,
            borderWidth: 1,
            borderColor: theme.colors.border,
          },
          text: { color: theme.colors.secondaryForeground },
        };
      case 'ghost':
        return {
          container: { backgroundColor: 'transparent' },
          text: { color: isDisabled ? theme.colors.foregroundSubtle : theme.colors.foreground },
        };
      case 'destructive':
        return {
          container: {
            backgroundColor: isDisabled
              ? theme.colors.foregroundSubtle
              : theme.colors.error,
            ...shadows.sm,
          },
          text: { color: theme.colors.errorForeground },
        };
      case 'link':
        return {
          container: { backgroundColor: 'transparent', padding: 0 },
          text: {
            color: isDisabled ? theme.colors.foregroundSubtle : theme.colors.primary,
            textDecorationLine: 'underline',
          },
        };
    }
  };

  // ── Size styles
  const sizeStyles: Record<Size, { container: ViewStyle; text: TextStyle }> = {
    sm: {
      container: {
        paddingVertical: spacing[1.5],
        paddingHorizontal: spacing[3],
        borderRadius: radii.md,
        gap: spacing[1],
      },
      text: {
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.sm,
        lineHeight: lineHeight.sm,
      },
    },
    md: {
      container: {
        paddingVertical: spacing[2.5],
        paddingHorizontal: spacing[5],
        borderRadius: radii.lg,
        gap: spacing[1.5],
      },
      text: {
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.base,
        lineHeight: lineHeight.base,
      },
    },
    lg: {
      container: {
        paddingVertical: spacing[4],
        paddingHorizontal: spacing[8],
        borderRadius: radii.xl,
        gap: spacing[2],
      },
      text: {
        fontFamily: fontFamily.semibold,
        fontSize: fontSize.lg,
        lineHeight: lineHeight.lg,
      },
    },
  };

  const variantStyle = getVariantStyle();
  const sz = sizeStyles[size];

  return (
    <AnimatedPressable
      style={[
        styles.base,
        sz.container,
        variantStyle.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        animStyle,
        style,
      ]}
      disabled={isDisabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variantStyle.text.color as string}
        />
      ) : (
        <>
          {leftIcon}
          {(children !== undefined || title !== undefined) ? (
            typeof children === 'string' || typeof children === 'number' || typeof title === 'string' ? (
              <Animated.Text style={[sz.text, variantStyle.text]}>
                {children ?? title}
              </Animated.Text>
            ) : (
              children
            )
          ) : null}
          {rightIcon}
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  disabled: {
    opacity: 0.5,
  },
});
