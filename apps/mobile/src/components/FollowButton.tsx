import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';
import { fontFamily, gold } from '@bucketlist/ui';
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
}

/**
 * Botón de seguimiento con 4 estados:
 *   accepted → "Siguiendo" · pending → "Pendiente"
 *   none + privada → "Solicitar" · none → "Seguir"
 */
export function FollowButton({ status, isPrivate = false, loading = false, onPress, size = 'pill', style }: FollowButtonProps) {
  const block = size === 'block';

  let label: string;
  let variant: 'solid' | 'outline' | 'muted';
  if (status === 'accepted') {
    label = 'Siguiendo';
    variant = 'muted';
  } else if (status === 'pending') {
    label = block ? 'Solicitud enviada' : 'Pendiente';
    variant = 'muted';
  } else if (isPrivate) {
    label = block ? 'Solicitar seguimiento' : 'Solicitar';
    variant = 'outline';
  } else {
    label = 'Seguir';
    variant = 'solid';
  }

  const textColor = variant === 'solid' ? '#111111' : variant === 'outline' ? gold[400] : '#CFCFCF';

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
        variant === 'muted' && styles.muted,
        { opacity: pressed ? 0.75 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          {block && status === 'accepted' ? <Check size={16} color={textColor} style={styles.check} /> : null}
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pill: {
    height: 38,
    minWidth: 98,
    paddingHorizontal: 16,
    borderRadius: 19,
  },
  block: {
    height: 46,
    alignSelf: 'stretch',
    borderRadius: 23,
  },
  solid: { backgroundColor: gold[400], borderColor: gold[400] },
  outline: { backgroundColor: 'transparent', borderColor: gold[400] },
  muted: { backgroundColor: '#161616', borderColor: '#2A2A2A' },
  label: { fontFamily: fontFamily.semibold, fontSize: 14 },
  check: { marginRight: 6 },
});
