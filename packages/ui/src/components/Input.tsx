import React, { useState, useRef } from 'react';
import {
  TextInput,
  View,
  Pressable,
  type TextInputProps,
  type ViewStyle,
  StyleSheet,
  Animated,
} from 'react-native';

import { useTheme } from '../theme/useTheme';
import { Typography } from './Typography';
import { spacing } from '../tokens/spacing';
import { radii } from '../tokens/radii';
import { fontFamily, fontSize, lineHeight } from '../tokens/typography';
import { duration } from '../tokens/motion';

// ─── Types ────────────────────────────────────────────────────────────────────

type InputVariant = 'default' | 'error' | 'success';

interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string;
  variant?: InputVariant;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerStyle?: ViewStyle;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Input({
  label,
  hint,
  error,
  variant: _variant,
  leftIcon,
  rightIcon,
  containerStyle,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const variant: InputVariant = error ? 'error' : _variant ?? 'default';

  const borderColor = () => {
    if (focused) return theme.colors.borderFocus;
    switch (variant) {
      case 'error':   return theme.colors.error;
      case 'success': return theme.colors.success;
      default:        return theme.colors.border;
    }
  };

  const handleFocus = (e: Parameters<NonNullable<TextInputProps['onFocus']>>[0]) => {
    setFocused(true);
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: duration.fast,
      useNativeDriver: false,
    }).start();
    onFocus?.(e);
  };

  const handleBlur = (e: Parameters<NonNullable<TextInputProps['onBlur']>>[0]) => {
    setFocused(false);
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: duration.fast,
      useNativeDriver: false,
    }).start();
    onBlur?.(e);
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? (
        <Typography variant="smMedium" color={theme.colors.foregroundMuted} style={styles.label}>
          {label}
        </Typography>
      ) : null}

      <Animated.View
        style={[
          styles.inputRow,
          {
            backgroundColor: theme.colors.surfaceSunken,
            borderColor: borderColor(),
            borderWidth: focused ? 1.5 : 1,
          },
        ]}
      >
        {leftIcon ? <View style={styles.icon}>{leftIcon}</View> : null}

        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.foreground,
              fontFamily: fontFamily.regular,
              fontSize: fontSize.base,
              lineHeight: lineHeight.base,
            },
          ]}
          placeholderTextColor={theme.colors.foregroundSubtle}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        />

        {rightIcon ? <View style={styles.icon}>{rightIcon}</View> : null}
      </Animated.View>

      {(error ?? hint) ? (
        <Typography
          variant="caption"
          color={error ? theme.colors.error : theme.colors.foregroundMuted}
          style={styles.hint}
        >
          {error ?? hint}
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing[1],
  },
  label: {
    marginBottom: spacing[0.5],
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    minHeight: 48,
    paddingHorizontal: spacing[3],
  },
  input: {
    flex: 1,
    paddingVertical: spacing[3],
  },
  icon: {
    marginHorizontal: spacing[1],
  },
  hint: {
    marginTop: spacing[0.5],
  },
});
