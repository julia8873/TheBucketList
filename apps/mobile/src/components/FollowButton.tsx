import { themedStyleSheet } from '@bucketlist/ui';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { Check, UserX } from 'lucide-react-native';
import { fontFamily, gold, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import type { FollowStatus } from '../services/api/friends';

interface FollowButtonProps {
  status: FollowStatus;
  /** Cuenta privada: "Solicitar" en lugar de "Seguir". */
  isPrivate?: boolean;
  loading?: boolean;
  onPress: () => void;
  /** "pill" (lista) o "block" (cabecera del perfil, ancho completo). */
  size?: 'pill' | 'block';
  style?: StyleProp<ViewStyle>;
  /** Si el usuario actual tiene bloqueado a este perfil */
  isBlocked?: boolean;
}

/**
 * Botón de seguimiento con 5 estados:
 *   bloqueado → "Bloqueado" (peligro / borde rojo)
 *   accepted → "Siguiendo" · pending → "Pendiente"
 *   none + privada → "Solicitar" · none → "Seguir"
 */
export function FollowButton({
  status,
  isPrivate = false,
  loading = false,
  onPress,
  size = 'pill',
  style,
  isBlocked = false,
}: FollowButtonProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const block = size === 'block';

  let label: string;
  let variant: 'solid' | 'outline' | 'muted' | 'blocked';

  if (isBlocked) {
    label = t('social.blocked');
    variant = 'blocked';
  } else if (status === 'accepted') {
    label = t('social.following');
    variant = 'muted';
  } else if (status === 'pending') {
    label = block ? t('social.request_sent') : t('social.request_pending');
    variant = 'muted';
  } else if (isPrivate) {
    label = block ? t('social.request_follow_full') : t('social.request_follow');
    variant = 'outline';
  } else {
    label = t('social.follow');
    variant = 'solid';
  }

  const textColor =
    variant === 'blocked'
      ? '#EF4444'
      : variant === 'solid'
      ? '#111111'
      : variant === 'outline'
      ? gold[400]
      : theme.colors.foregroundMuted;

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        block ? styles.block : styles.pill,
        variant === 'solid' && styles.solid,
        variant === 'outline' && styles.outline,
        variant === 'muted' && { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        variant === 'blocked' && styles.blocked,
        { opacity: pressed ? 0.75 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {variant === 'blocked' ? (
            <UserX size={15} color="#EF4444" style={styles.check} strokeWidth={2} />
          ) : block && status === 'accepted' ? (
            <Check size={16} color={textColor} style={styles.check} />
          ) : null}
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = themedStyleSheet({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pill: {
    height: 38,
    minWidth: 98,
    paddingHorizontal: 12,
    borderRadius: 19,
  },
  block: {
    height: 46,
    alignSelf: 'stretch',
    borderRadius: 23,
  },
  solid: { backgroundColor: gold[400], borderColor: gold[400] },
  outline: { backgroundColor: 'transparent', borderColor: gold[400] },
  blocked: { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderColor: 'rgba(239, 68, 68, 0.65)' },
  label: { fontFamily: fontFamily.semibold, fontSize: 14 },
  check: { marginRight: 6 },
});
