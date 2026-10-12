import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { useTheme } from '../theme/useTheme';
import { Typography } from './Typography';
import { radii } from '../tokens/radii';
import { spacing } from '../tokens/spacing';
import { gold } from '../tokens/colors';

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

const FONT_SIZES: Record<AvatarSize, number> = {
  xs: 9,
  sm: 12,
  md: 15,
  lg: 20,
  xl: 30,
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

export function Avatar({
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
  const fontSize = FONT_SIZES[size];

  // Resolve uri from either new `source` or legacy `uri` prop
  const rawUri = source?.uri ?? uri ?? null;
  const resolvedUri = rawUri ? avatarUriResolver(rawUri) : null;
  // Resolve initials from either `fallback` or legacy `initials`
  const resolvedInitials = fallback ?? initials ?? '?';

  return (
    <View
      style={[
        { width: dim, height: dim },
        goldRing && {
          borderRadius: dim / 2,
          borderWidth: 1.5,
          borderColor: gold[400],
          padding: 2,
        },
        style,
      ]}
    >
      {resolvedUri ? (
        <Image
          source={{ uri: resolvedUri }}
          style={{ width: goldRing ? dim - 7 : dim, height: goldRing ? dim - 7 : dim, borderRadius: dim / 2 }}
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
              width: goldRing ? dim - 7 : dim,
              height: goldRing ? dim - 7 : dim,
              borderRadius: dim / 2,
              backgroundColor: '#201B0E',
            },
          ]}
        >
          <Typography
            variant="bodySemibold"
            color={gold[400]}
            style={{ fontSize }}
          >
            {resolvedInitials.toUpperCase().slice(0, 2)}
          </Typography>
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

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
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
