import { themedStyleSheet } from '@bucketlist/ui';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Check, Plus, Tag as TagIcon } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import {
  TAG_COLORS,
  TAG_EMOJIS,
  defaultColorForEmoji,
  defaultEmojiFor,
  firstEmoji,
  hexToRgba,
  normalizeHex,
  readableOn,
} from '../constants/tagPresets';
import { ColorPickerModal } from './ColorPickerModal';
import { useCustomColors } from '../hooks/useCustomColors';

const GOLD = '#D4B13A';
const RAINBOW = ['#E1553C', '#D4B13B', '#4CB06A', '#4B8FE0', '#8D5BD6'] as const;

interface Props {
  /** Nombre de la etiqueta: con `autoColor` se usa para sugerir un emoji por defecto. */
  name?: string;
  emoji: string | null;
  color: string;
  /**
   * Si es true, al elegir un emoji se adopta su color de fondo por defecto
   * mientras el usuario no haya elegido un color a mano (útil al crear).
   */
  autoColor?: boolean;
  onChange: (next: { emoji?: string | null; color?: string }) => void;
}

export function GoldLabel({ children, style }: { children: string; style?: object }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

/** Selector de emoji (con fondos de color por defecto o emoji propio) y de color (paleta o hex propio). */
export function TagAppearanceFields({ name = '', emoji, color, autoColor = false, onChange }: Props) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { savedColors } = useCustomColors();
  const [colorPickerVisible, setColorPickerVisible] = useState(false);
  const touchedColor = useRef(!autoColor);
  const touchedEmoji = useRef(!autoColor);
  const isPresetEmoji = !!emoji && TAG_EMOJIS.some((e) => e.emoji === emoji);
  const isPaletteColor = TAG_COLORS.some((c) => c.value.toLowerCase() === color.toLowerCase());

  // ── Emoji propio ───────────────────────────────────────────────────────────
  const [customEmoji, setCustomEmoji] = useState(emoji && !isPresetEmoji ? emoji : '');
  const [emojiError, setEmojiError] = useState(false);

  useEffect(() => {
    // Si se elige uno de la lista (o ninguno) se limpia el campo propio.
    if (!emoji || isPresetEmoji) {
      setCustomEmoji('');
      setEmojiError(false);
    }
  }, [emoji, isPresetEmoji]);

  // Sugerencia automática: mientras el usuario no toque el emoji, se propone uno según el nombre
  // ("Viajes" → ✈️) con su color de fondo por defecto.
  useEffect(() => {
    if (!autoColor || touchedEmoji.current) return;
    const suggested = defaultEmojiFor(name);
    if (suggested === emoji) return;
    const suggestedColor = suggested ? defaultColorForEmoji(suggested) : null;
    onChange(
      !touchedColor.current && suggestedColor
        ? { emoji: suggested, color: suggestedColor }
        : { emoji: suggested },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  const pickPreset = (preset: (typeof TAG_EMOJIS)[number]) => {
    touchedEmoji.current = true;
    setEmojiError(false);
    onChange(!touchedColor.current ? { emoji: preset.emoji, color: preset.color } : { emoji: preset.emoji });
  };

  const onCustomEmojiText = (text: string) => {
    touchedEmoji.current = true;
    if (!text.trim()) {
      setCustomEmoji('');
      setEmojiError(false);
      return;
    }
    const e = firstEmoji(text);
    if (!e) {
      setCustomEmoji(text);
      setEmojiError(true);
      return;
    }
    setCustomEmoji(e);
    setEmojiError(false);
    const preset = defaultColorForEmoji(e);
    onChange(!touchedColor.current && preset ? { emoji: e, color: preset } : { emoji: e });
  };

  // ── Color propio ───────────────────────────────────────────────────────────
  const [customOpen, setCustomOpen] = useState(!isPaletteColor);
  const [hex, setHex] = useState(isPaletteColor ? '' : color.replace('#', ''));
  const hexInvalid = hex.length > 0 && !normalizeHex(hex);

  const pickColor = (value: string) => {
    touchedColor.current = true;
    onChange({ color: value });
  };

  const onHexText = (text: string) => {
    const clean = text.replace(/[^0-9a-fA-F]/g, '').slice(0, 6).toUpperCase();
    setHex(clean);
    const n = clean.length === 6 || clean.length === 3 ? normalizeHex(clean) : null;
    if (n) pickColor(n);
  };

  return (
    <View>
      {/* ── EMOJI ─────────────────────────────────────────────────────────── */}
      <GoldLabel style={{ marginTop: 24 }}>EMOJI</GoldLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.emojiScroll}
        contentContainerStyle={styles.emojiRow}
      >
        <Pressable
          onPress={() => {
            touchedEmoji.current = true;
            setEmojiError(false);
            onChange({ emoji: null });
          }}
          accessibilityRole="button"
          accessibilityLabel={t('tags.no_emoji')}
          accessibilityState={{ selected: !emoji }}
          style={[
            styles.emojiCircle,
            styles.emojiNone,
            {
              backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <TagIcon size={20} color={theme.colors.foregroundMuted} strokeWidth={1.8} />
          {!emoji && <View style={styles.ring} pointerEvents="none" />}
        </Pressable>

        {TAG_EMOJIS.map((p) => {
          const on = emoji === p.emoji;
          return (
            <Pressable
              key={p.emoji}
              onPress={() => pickPreset(p)}
              accessibilityRole="button"
              accessibilityLabel={`Emoji ${p.emoji}`}
              accessibilityState={{ selected: on }}
              style={[
                styles.emojiCircle,
                { backgroundColor: hexToRgba(p.color, 0.22), borderColor: hexToRgba(p.color, 0.55) },
              ]}
            >
              <Text style={styles.emojiGlyph}>{p.emoji}</Text>
              {on && <View style={styles.ring} pointerEvents="none" />}
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        style={[
          styles.customRow,
          {
            backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
            borderColor: theme.colors.border,
          },
          emojiError && { borderColor: '#E5877D' },
          !!customEmoji && !emojiError && { borderColor: GOLD },
        ]}
      >
        <Text style={[styles.customHint, { color: theme.colors.foregroundMuted }]}>{t('tags.your_emoji')}</Text>
        <TextInput
          value={customEmoji}
          onChangeText={onCustomEmojiText}
          placeholder={t('tags.custom_emoji_placeholder')}
          placeholderTextColor={theme.colors.foregroundSubtle ?? '#6B6B6B'}
          style={[styles.customInput, { color: theme.colors.foreground }]}
          autoCorrect={false}
          autoCapitalize="none"
          maxLength={16}
          accessibilityLabel={t('tags.custom_emoji_accessibility')}
        />
      </View>
      {emojiError && <Text style={styles.errorText}>{t('tags.only_emojis_allowed')}</Text>}

      {/* ── COLOR ─────────────────────────────────────────────────────────── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 24, marginBottom: 8 }}>
        <GoldLabel style={{ marginTop: 0 }}>COLOR</GoldLabel>
        <Pressable
          onPress={() => setColorPickerVisible(true)}
          hitSlop={6}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Text style={{ fontSize: 12, color: GOLD, fontWeight: '600' }}>{t('tags.color_picker_btn')}</Text>
        </Pressable>
      </View>
      <View style={styles.swatches}>
        {TAG_COLORS.map((c) => {
          const on = color.toLowerCase() === c.value.toLowerCase();
          return (
            <Pressable
              key={c.value}
              onPress={() => pickColor(c.value)}
              accessibilityRole="button"
              accessibilityLabel={`Color ${c.name}`}
              accessibilityState={{ selected: on }}
              style={[styles.swatch, { backgroundColor: c.value }]}
            >
              {on && <Check size={20} color="#111111" strokeWidth={2.6} />}
              {on && <View style={[styles.ring, { borderColor: c.value }]} pointerEvents="none" />}
            </Pressable>
          );
        })}

        {/* Colores guardados por el usuario */}
        {savedColors
          .filter((sc) => !TAG_COLORS.some((tc) => tc.value.toLowerCase() === sc.toLowerCase()))
          .slice(0, 8)
          .map((sc) => {
            const on = color.toLowerCase() === sc.toLowerCase();
            return (
              <Pressable
                key={sc}
                onPress={() => pickColor(sc)}
                accessibilityRole="button"
                accessibilityLabel={`Color guardado ${sc}`}
                accessibilityState={{ selected: on }}
                style={[styles.swatch, { backgroundColor: sc }]}
              >
                {on && <Check size={20} color={readableOn(sc)} strokeWidth={2.6} />}
                {on && <View style={[styles.ring, { borderColor: sc }]} pointerEvents="none" />}
              </Pressable>
            );
          })}

        {/* Color personalizado / Color Picker */}
        <Pressable
          onPress={() => setColorPickerVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={t('tags.custom_color_accessibility')}
          style={styles.swatch}
        >
          {!isPaletteColor ? (
            <View style={[StyleSheet.absoluteFill, styles.swatchFill, { backgroundColor: color }]}>
              <Check size={20} color={readableOn(color)} strokeWidth={2.6} />
            </View>
          ) : (
            <LinearGradient
              colors={RAINBOW}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[StyleSheet.absoluteFill, styles.swatchFill]}
            >
              <Plus size={20} color="#FFFFFF" strokeWidth={2.6} />
            </LinearGradient>
          )}
          {!isPaletteColor && <View style={[styles.ring, { borderColor: color }]} pointerEvents="none" />}
        </Pressable>
      </View>

      <ColorPickerModal
        visible={colorPickerVisible}
        initialColor={color}
        onSelectColor={(c) => {
          pickColor(c);
          setHex(c.replace('#', ''));
        }}
        onClose={() => setColorPickerVisible(false)}
      />

      {customOpen && (
        <View style={styles.hexWrap}>
          <View
            style={[
              styles.customRow,
              {
                marginTop: 0,
                backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                borderColor: theme.colors.border,
              },
              hexInvalid && { borderColor: '#E5877D' },
              !hexInvalid && hex.length > 0 && { borderColor: GOLD },
            ]}
          >
            <View
              style={[
                styles.hexPreview,
                { backgroundColor: normalizeHex(hex) ?? (isPaletteColor ? theme.colors.border : color) },
              ]}
            />
            <Text style={[styles.hexHash, { color: theme.colors.foregroundMuted }]}>#</Text>
            <TextInput
              value={hex}
              onChangeText={onHexText}
              placeholder="D4B13B"
              placeholderTextColor={theme.colors.foregroundSubtle ?? '#6B6B6B'}
              style={[styles.customInput, { color: theme.colors.foreground }]}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
              accessibilityLabel={t('tags.hex_accessibility')}
            />
          </View>
          {hexInvalid && hex.length >= 3 && hex.length !== 3 && hex.length !== 6 ? (
            <Text style={styles.errorText}>{t('tags.hex_format_hint')}</Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = themedStyleSheet({
  label: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 14,
    letterSpacing: 1,
    color: GOLD,
    marginBottom: 12,
  },
  emojiScroll: { marginHorizontal: -12, flexGrow: 0 },
  emojiRow: { paddingHorizontal: 12, paddingVertical: 6, gap: 12, alignItems: 'center' },
  emojiCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiNone: { borderStyle: 'dashed', borderColor: '#3A3A3A', backgroundColor: '#161616' },
  emojiGlyph: { fontSize: 21, lineHeight: 28, textAlign: 'center' },
  ring: {
    position: 'absolute',
    top: -6,
    left: -6,
    right: -6,
    bottom: -6,
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: GOLD,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    marginTop: 12,
    paddingHorizontal: 12,
    borderRadius: 24,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 10,
  },
  customHint: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#9A9A9A' },
  customInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 16, color: '#F5F5F5', padding: 0 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#E5877D', marginTop: 8, marginLeft: 6 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 12 },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  swatchFill: { borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  hexWrap: { marginTop: 14 },
  hexPreview: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#2A2A2A' },
  hexHash: { fontFamily: 'Inter_500Medium', fontSize: 16, color: '#9A9A9A', marginRight: -6 },
});
