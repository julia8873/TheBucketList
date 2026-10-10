import React from 'react';
import { Pressable, Text, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { X } from 'lucide-react-native';

interface TagChipProps {
  label: string;
  variant?: 'default' | 'selected' | 'colored' | 'create';
  color?: string;
  /** Emoji opcional: sustituye al punto de color en la variante `colored`. */
  emoji?: string | null;
  /** `sm` = chip compacto para las tarjetas de la lista. */
  size?: 'md' | 'sm';
  onPress?: () => void;
  onRemove?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** hex (#RRGGBB) → rgba(). Si no es un hex válido devuelve un gris. */
function tint(hex: string | undefined, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? '').trim());
  if (!m) return `rgba(138,138,138,${alpha})`;
  const n = parseInt(m[1]!, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function TagChip({ label, variant = 'default', color, emoji, size = 'md', onPress, onRemove, style }: TagChipProps) {
  const isCreate = variant === 'create';
  const isSelected = variant === 'selected';
  const isColored = variant === 'colored';
  const sm = size === 'sm';

  const coloredStyle =
    isColored && color
      ? { backgroundColor: tint(color, 0.14), borderColor: tint(color, 0.4) }
      : null;

  return (
    <Pressable
      style={[
        styles.chip,
        sm && styles.chipSm,
        isSelected && styles.chipSelected,
        isCreate && styles.chipCreate,
        coloredStyle,
        style,
      ]}
      onPress={onPress}
      disabled={!onPress && !onRemove}
    >
      {isColored && color && emoji ? (
        <View
          style={[
            styles.emojiBubble,
            sm && styles.emojiBubbleSm,
            { backgroundColor: tint(color, 0.3) },
          ]}
        >
          <Text style={[styles.emojiText, sm && styles.emojiTextSm]}>{emoji}</Text>
        </View>
      ) : isColored && color ? (
        <View style={[styles.colorDot, sm && styles.colorDotSm, { backgroundColor: color }]} />
      ) : null}

      <Text
        style={[
          styles.text,
          sm && styles.textSm,
          isSelected && styles.textSelected,
          isCreate && styles.textCreate,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>

      {isSelected && onRemove && (
        <Pressable onPress={onRemove} style={styles.removeIcon} hitSlop={10} accessibilityLabel="Eliminar etiqueta">
          <X color="#D4B13A" size={14} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 21,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSm: {
    height: 23,
    paddingHorizontal: 9,
    borderRadius: 12,
  },
  chipSelected: {
    borderColor: '#D4B13A',
    backgroundColor: 'rgba(212, 177, 58, 0.12)',
  },
  chipCreate: {
    backgroundColor: 'transparent',
    borderStyle: 'dashed',
    borderColor: '#D4B13A',
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  colorDotSm: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  emojiBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 8,
    marginLeft: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiBubbleSm: {
    width: 15,
    height: 15,
    borderRadius: 8,
    marginRight: 5,
    marginLeft: -5,
  },
  emojiText: {
    fontSize: 12,
    lineHeight: 15,
    textAlign: 'center',
  },
  emojiTextSm: {
    fontSize: 9,
    lineHeight: 12,
  },
  text: {
    color: '#E5E5E5',
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
  },
  textSm: {
    fontSize: 12,
  },
  textSelected: {
    color: '#D4B13A',
  },
  textCreate: {
    color: '#D4B13A',
    fontFamily: 'Inter_600SemiBold',
  },
  removeIcon: {
    marginLeft: 6,
    marginRight: -4,
  },
});
