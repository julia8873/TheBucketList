import React, { useState, useEffect, useRef } from 'react';
import type {
  GestureResponderEvent} from 'react-native';
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  PanResponder
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, Trash2, Pipette, Hash } from 'lucide-react-native';
import { useTheme, gold } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { useCustomColors, normalizeHexColor } from '@/hooks/useCustomColors';

const HUE_GRADIENT = [
  '#FF0000',
  '#FFFF00',
  '#00FF00',
  '#00FFFF',
  '#0000FF',
  '#FF00FF',
  '#FF0000',
] as const;

const POPULAR_PRESETS = [
  '#D4B13A',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
  '#6366F1',
  '#3B82F6',
  '#06B6D4',
  '#10B981',
  '#84CC16',
  '#EAB308',
  '#F97316',
  '#64748B',
  '#1E293B',
  '#FAF5E9',
  '#A855F7',
];

export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  if (c.length !== 6) return { h: 45, s: 65, l: 50 };

  const r = parseInt(c.substring(0, 2), 16) / 255;
  const g = parseInt(c.substring(2, 4), 16) / 255;
  const b = parseInt(c.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function isColorDark(hex: string): boolean {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  if (c.length !== 6) return true;
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq < 135;
}

interface ColorPickerModalProps {
  visible: boolean;
  initialColor?: string;
  onSelectColor: (color: string) => void;
  onClose: () => void;
  title?: string;
}

export const ColorPickerModal: React.FC<ColorPickerModalProps> = ({
  visible,
  initialColor = '#D4B13A',
  onSelectColor,
  onClose,
  title,
}) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { savedColors, addCustomColor, removeCustomColor } = useCustomColors();

  const [currentColor, setCurrentColor] = useState<string>(initialColor);
  const [hexInput, setHexInput] = useState<string>(initialColor.replace('#', ''));
  const [hue, setHue] = useState<number>(45);
  const [sliderWidth, setSliderWidth] = useState<number>(280);

  useEffect(() => {
    if (visible) {
      const valid = normalizeHexColor(initialColor) || '#D4B13A';
      setCurrentColor(valid);
      setHexInput(valid.replace('#', ''));
      const hsl = hexToHsl(valid);
      setHue(hsl.h);
    }
  }, [visible, initialColor]);

  const updateColor = (newHex: string) => {
    const valid = normalizeHexColor(newHex);
    if (valid) {
      setCurrentColor(valid);
      setHexInput(valid.replace('#', ''));
      const hsl = hexToHsl(valid);
      setHue(hsl.h);
    }
  };

  const handleHexInputChange = (text: string) => {
    const clean = text.replace(/[^0-9A-Fa-f]/g, '').slice(0, 6).toUpperCase();
    setHexInput(clean);
    const valid = normalizeHexColor(clean);
    if (valid) {
      setCurrentColor(valid);
      const hsl = hexToHsl(valid);
      setHue(hsl.h);
    }
  };

  const handleHueTouch = (clientXOrLocationX: number) => {
    if (sliderWidth <= 0) return;
    const clamped = Math.max(0, Math.min(sliderWidth, clientXOrLocationX));
    const newHue = Math.round((clamped / sliderWidth) * 360);
    setHue(newHue);
    const hsl = hexToHsl(currentColor);
    const newHex = hslToHex(newHue, Math.max(hsl.s, 50), Math.max(20, Math.min(85, hsl.l)));
    setCurrentColor(newHex);
    setHexInput(newHex.replace('#', ''));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        handleHueTouch(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        handleHueTouch(evt.nativeEvent.locationX);
      },
    })
  ).current;

  const handleApply = () => {
    const finalColor = normalizeHexColor(currentColor) || '#D4B13A';
    void addCustomColor(finalColor);
    onSelectColor(finalColor);
    onClose();
  };

  if (!visible) return null;

  const currentHueShades = [
    hslToHex(hue, 65, 88),
    hslToHex(hue, 80, 72),
    hslToHex(hue, 95, 58),
    hslToHex(hue, 100, 48),
    hslToHex(hue, 90, 36),
    hslToHex(hue, 90, 22),
  ];

  const thumbPosition = (hue / 360) * sliderWidth;
  const contrastText = isColorDark(currentColor) ? '#FFFFFF' : '#111111';

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pipette size={18} color={gold[400]} />
              <Text style={[styles.title, { color: theme.colors.foreground }]}>
                {title || t('common.custom_color', { defaultValue: 'Color personalizado' })}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel={t('common.close', { defaultValue: 'Cerrar' })}>
              <X size={18} color={theme.colors.foregroundMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
            {/* Color Preview & Hex Input Row */}
            <View style={styles.previewRow}>
              <View
                style={[
                  styles.previewBox,
                  {
                    backgroundColor: currentColor,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={[styles.previewText, { color: contrastText }]}>{currentColor}</Text>
              </View>

              <View
                style={[
                  styles.hexInputWrapper,
                  {
                    backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Hash size={16} color={gold[400]} />
                <TextInput
                  value={hexInput}
                  onChangeText={handleHexInputChange}
                  placeholder="D4B13A"
                  placeholderTextColor={theme.colors.foregroundSubtle ?? '#666'}
                  maxLength={6}
                  style={[styles.hexInput, { color: theme.colors.foreground }]}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Hue Slider */}
            <Text style={[styles.sectionSubtitle, { color: theme.colors.foregroundMuted }]}>
              {t('common.hue_spectrum', { defaultValue: 'Espectro de color' })}
            </Text>
            <View
              style={styles.sliderContainer}
              onLayout={(e) => {
                const w = e.nativeEvent.layout.width;
                if (w > 0) setSliderWidth(w);
              }}
              {...panResponder.panHandlers}
            >
              <LinearGradient
                colors={HUE_GRADIENT}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.sliderTrack}
              />
              <View
                pointerEvents="none"
                style={[
                  styles.sliderThumb,
                  {
                    transform: [{ translateX: Math.max(0, Math.min(sliderWidth - 22, thumbPosition - 11)) }],
                    backgroundColor: hslToHex(hue, 100, 50),
                  },
                ]}
              />
            </View>

            {/* Current Hue Shades */}
            <Text style={[styles.sectionSubtitle, { color: theme.colors.foregroundMuted, marginTop: 14 }]}>
              {t('common.color_tones', { defaultValue: 'Tonos e intensidades' })}
            </Text>
            <View style={styles.shadesRow}>
              {currentHueShades.map((shade) => {
                const isSelected = currentColor.toUpperCase() === shade.toUpperCase();
                return (
                  <Pressable
                    key={shade}
                    style={[
                      styles.shadeCircle,
                      { backgroundColor: shade },
                      isSelected && styles.shadeCircleSelected,
                    ]}
                    onPress={() => updateColor(shade)}
                  >
                    {isSelected && <Check size={14} color={isColorDark(shade) ? '#FFF' : '#000'} strokeWidth={2.6} />}
                  </Pressable>
                );
              })}
            </View>

            {/* User Saved Colors */}
            <View style={styles.savedSectionHeader}>
              <Text style={[styles.sectionSubtitle, { color: theme.colors.foregroundMuted, marginTop: 14 }]}>
                {t('common.saved_colors', { defaultValue: 'Tus colores guardados' })}
                {savedColors.length > 0 ? ` (${savedColors.length})` : ''}
              </Text>
            </View>

            {savedColors.length > 0 ? (
              <View style={styles.swatchesGrid}>
                {savedColors.map((sc) => {
                  const isSelected = currentColor.toUpperCase() === sc.toUpperCase();
                  return (
                    <Pressable
                      key={sc}
                      style={[
                        styles.swatchItem,
                        { backgroundColor: sc },
                        isSelected && styles.swatchItemSelected,
                      ]}
                      onPress={() => updateColor(sc)}
                    >
                      {isSelected && (
                        <Check size={14} color={isColorDark(sc) ? '#FFF' : '#000'} strokeWidth={2.6} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={[styles.emptyHint, { color: theme.colors.foregroundSubtle }]}>
                {t('common.saved_colors_hint', { defaultValue: 'Los colores que apliques se guardarán aquí para reutilizarlos.' })}
              </Text>
            )}

            {/* Popular Curated Presets */}
            <Text style={[styles.sectionSubtitle, { color: theme.colors.foregroundMuted, marginTop: 14 }]}>
              {t('common.preset_colors', { defaultValue: 'Preajustes sugeridos' })}
            </Text>
            <View style={styles.swatchesGrid}>
              {POPULAR_PRESETS.map((preset) => {
                const isSelected = currentColor.toUpperCase() === preset.toUpperCase();
                return (
                  <Pressable
                    key={preset}
                    style={[
                      styles.swatchItem,
                      { backgroundColor: preset },
                      isSelected && styles.swatchItemSelected,
                    ]}
                    onPress={() => updateColor(preset)}
                  >
                    {isSelected && (
                      <Check size={14} color={isColorDark(preset) ? '#FFF' : '#000'} strokeWidth={2.6} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footerRow}>
            <Pressable
              style={[
                styles.cancelBtn,
                {
                  backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                  borderColor: theme.colors.border,
                },
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
              onPress={onClose}
            >
              <Text style={[styles.cancelBtnText, { color: theme.colors.foreground }]}>
                {t('common.cancel', { defaultValue: 'Cancelar' })}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.applyBtn,
                { backgroundColor: gold[400] },
                Platform.OS === 'web' && ({ cursor: 'pointer' } as any),
              ]}
              onPress={handleApply}
            >
              <Check size={16} color="#000" strokeWidth={2.6} />
              <Text style={styles.applyBtnText}>
                {t('common.apply', { defaultValue: 'Aplicar color' })}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '90%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Inter_600SemiBold',
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  previewBox: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hexInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: 120,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
  },
  hexInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    padding: 0,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  sliderContainer: {
    height: 32,
    justifyContent: 'center',
    marginVertical: 4,
  },
  sliderTrack: {
    height: 14,
    borderRadius: 7,
  },
  sliderThumb: {
    position: 'absolute',
    top: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  shadesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 6,
  },
  shadeCircle: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadeCircleSelected: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  savedSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  swatchesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  swatchItem: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchItemSelected: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  emptyHint: {
    fontSize: 12,
    fontStyle: 'italic',
    marginVertical: 4,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  cancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 1.3,
    height: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  applyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
  },
});
