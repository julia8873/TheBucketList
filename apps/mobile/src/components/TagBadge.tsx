import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Tag as TagIcon } from 'lucide-react-native';
import { hexToRgba } from '../constants/tagPresets';

interface TagBadgeProps {
  emoji?: string | null;
  color: string;
  size?: number;
}

/**
 * Círculo con el emoji de la etiqueta sobre un fondo del color de la etiqueta.
 * Sin emoji muestra el icono de etiqueta (como en el diseño).
 */
export function TagBadge({ emoji, color, size = 42 }: TagBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: hexToRgba(color, emoji ? 0.22 : 0.14),
          borderColor: hexToRgba(color, emoji ? 0.55 : 0.4),
        },
      ]}
    >
      {emoji ? (
        <Text style={{ fontSize: Math.round(size * 0.46), lineHeight: Math.round(size * 0.6), textAlign: 'center' }}>
          {emoji}
        </Text>
      ) : (
        <TagIcon size={Math.round(size * 0.48)} color={color} strokeWidth={1.8} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
