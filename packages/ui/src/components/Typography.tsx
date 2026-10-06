import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { textStyles } from '../tokens/typography';
import { useTheme } from '../theme/useTheme';

type Variant =
  | 'h1' | 'h2' | 'h3' | 'h4'
  | 'body' | 'bodyMedium' | 'bodySemibold'
  | 'sm' | 'smMedium'
  | 'caption' | 'label';

interface TypographyProps extends TextProps {
  variant?: Variant;
  color?: string;
  align?: TextStyle['textAlign'];
  children: React.ReactNode;
}

export function Typography({
  variant = 'body',
  color,
  align,
  style,
  children,
  ...props
}: TypographyProps) {
  const { theme } = useTheme();
  const tokenStyle = textStyles[variant];

  return (
    <Text
      style={[
        tokenStyle,
        { color: color ?? theme.colors.foreground },
        align ? { textAlign: align } : undefined,
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}
