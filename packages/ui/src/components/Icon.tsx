/**
 * Icon wrapper for lucide-react-native.
 * Sizes and colors are aligned with design tokens.
 */
import React from 'react';
import type { LucideProps } from 'lucide-react-native';
import { useTheme } from '../theme/useTheme';

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_MAP: Record<IconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

interface IconProps extends Omit<LucideProps, 'size' | 'color'> {
  icon: React.ComponentType<LucideProps>;
  size?: IconSize | number;
  color?: string;
}

export function Icon({ icon: LucideIcon, size = 'md', color, ...props }: IconProps) {
  const { theme } = useTheme();
  const resolvedSize = typeof size === 'number' ? size : SIZE_MAP[size];
  const resolvedColor = color ?? theme.colors.foreground;

  return <LucideIcon size={resolvedSize} color={resolvedColor} strokeWidth={1.75} {...props} />;
}
