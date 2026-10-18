import React from 'react';
import { View, StyleSheet, Text, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { useTheme } from '../theme/useTheme';
import { radii } from '../tokens/radii';
import { spacing } from '../tokens/spacing';
import { gold } from '../tokens/colors';
import { fontFamily } from '../tokens/typography';

/**
 * Resolver global opcional para las URLs de avatar. La app lo registra para
 * reescribir el host de Storage al del entorno actual (así la foto subida
 * desde otro dispositivo/entorno sigue cargando).
 */
let avatarUriResolver: (uri: string) => string = (uri) => uri;
export function setAvatarUriResolver(fn: (uri: string) => string): void {
  avatarUriResolver = fn;
}

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZES: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const FONT_CONFIG: Record<AvatarSize, { fontSize: number; lineHeight: number }> = {
  xs: { fontSize: 9, lineHeight: 12 },
  sm: { fontSize: 12, lineHeight: 16 },
  md: { fontSize: 15, lineHeight: 19 },
  lg: { fontSize: 20, lineHeight: 26 },
  xl: { fontSize: 26, lineHeight: 32 },
};

interface AvatarProps {
  /** New prop: accepts { uri: string } like Image source */
  source?: { uri: string | null | undefined } | null;
  /** Fallback text (initials) when no image */
  fallback?: string;
  /** Legacy props — kept for backward compat */
  uri?: string | null;
  initials?: string;
  size?: AvatarSize;
  badge?: React.ReactNode;
  /** Show gold ring border (for profile headers) */
  goldRing?: boolean;
  style?: ViewStyle;
}

function AvatarComponent({
  source,
  fallback,
  uri,
  initials,
  size = 'md',
  badge,
  goldRing = false,
  style,
}: AvatarProps) {
  const { theme } = useTheme();
  const dim = SIZES[size];
  const { fontSize, lineHeight } = FONT_CONFIG[size];

  // Resolve uri from either new `source` or legacy `uri` prop
  const rawUri = source?.uri ?? uri ?? null;
  const resolvedUri = rawUri ? avatarUriResolver(rawUri) : null;
  // Resolve initials from either `fallback` or legacy `initials`
  const resolvedInitials = (fallback ?? initials ?? '?').trim().toUpperCase().slice(0, 2);

  const innerDim = goldRing ? dim - 7 : dim;

  return (
    <View
      style={[
        {
          width: dim,
          height: dim,
          alignItems: 'center',
          justifyContent: 'center',
        },
        goldRing && {
          borderRadius: dim / 2,
          borderWidth: 1.5,
          borderColor: gold[400],
        },
        style,
      ]}
    >
      {resolvedUri ? (
        <Image
          source={{ uri: resolvedUri }}
          style={{ width: innerDim, height: innerDim, borderRadius: innerDim / 2 }}
          contentFit="cover"
          cachePolicy="disk"
          accessibilityRole="image"
          accessibilityLabel="Avatar"
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            {
              width: innerDim,
              height: innerDim,
              borderRadius: innerDim / 2,
              backgroundColor: '#201B0E',
            },
          ]}
        >
          <Text
            style={[
              styles.initialsText,
              {
                fontSize,
                lineHeight,
                color: gold[400],
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {resolvedInitials}
          </Text>
        </View>
      )}

      {badge ? (
        <View
          style={[
            styles.badge,
            {
              borderColor: theme.colors.background,
              bottom: 0,
              right: 0,
            },
          ]}
        >
          {badge}
        </View>
      ) : null}
    </View>
  );
}

export const Avatar = React.memo(AvatarComponent);

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontFamily: fontFamily.semibold,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    letterSpacing: -0.3,
  },
  badge: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: radii.full,
    minWidth: spacing[3],
    minHeight: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
});
