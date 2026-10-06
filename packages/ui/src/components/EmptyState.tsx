import React from 'react';
import { View, type ViewStyle, StyleSheet } from 'react-native';

import { Typography } from './Typography';
import { useTheme } from '../theme/useTheme';
import { spacing } from '../tokens/spacing';

interface EmptyStateProps {
  title: string;
  description?: string;
  /** Alias for description — backward compat */
  message?: string;
  illustration?: React.ReactNode;
  /** Lucide icon or any component renderable as icon */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon?: React.ElementType<any>;
  action?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  title,
  description,
  message,
  illustration,
  icon: IconComponent,
  action,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const { theme } = useTheme();
  const resolvedDesc = description ?? message;

  return (
    <View style={[styles.container, style]}>
      {illustration ? <View style={styles.illustration}>{illustration}</View> : null}
      {IconComponent && !illustration ? (
        <View style={styles.illustration}>
          <IconComponent size={48} color={theme.colors.foregroundSubtle} />
        </View>
      ) : null}
      <Typography variant="h4" align="center" color={theme.colors.foreground}>
        {title}
      </Typography>
      {resolvedDesc ? (
        <Typography
          variant="body"
          align="center"
          color={theme.colors.foregroundMuted}
          style={styles.description}
        >
          {resolvedDesc}
        </Typography>
      ) : null}
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    gap: spacing[3],
  },
  illustration: {
    marginBottom: spacing[2],
  },
  description: {
    marginTop: -spacing[1],
  },
  action: {
    marginTop: spacing[2],
  },
});
