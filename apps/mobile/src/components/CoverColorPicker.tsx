import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Palette, Blend } from 'lucide-react-native';
import { useTranslation } from '@bucketlist/shared';
import { ColorPickerModal, isColorDark } from '@/components/ColorPickerModal';
import { useCustomColors } from '@/hooks/useCustomColors';
import { COVERS, SOLID_COVERS } from '@/features/album-form/types';

const GOLD = '#D4B13A';

interface CoverColorPickerProps {
  /**
   * Se llama al elegir un degradado. `id` es la clave del degradado predeterminado
   * (aurora, atardecer…) o `null` si es un degradado personalizado.
   */
  onSelectGradient: (colors: [string, string], id: string | null) => void;
  /** Se llama al elegir un color sólido (predeterminado, guardado o del selector de color). */
  onSelectSolid: (hex: string) => void;
}

type PickerTarget = 'start' | 'end' | 'solid' | null;

/**
 * Degradados y colores para portadas de álbumes y tareas:
 * predeterminados + degradado personalizado (2 colores) + color sólido con el selector de color.
 */
export function CoverColorPicker({ onSelectGradient, onSelectSolid }: CoverColorPickerProps) {
  const { t } = useTranslation();
  const { savedColors } = useCustomColors();

  const [editorOpen, setEditorOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<PickerTarget>(null);
  const [fromColor, setFromColor] = useState('#3A78C4');
  const [toColor, setToColor] = useState('#D4B13A');

  const extraSaved = savedColors
    .filter((sc) => !SOLID_COVERS.some((soc) => soc.colors?.[0]?.toLowerCase() === sc.toLowerCase()))
    .slice(0, 6);

  const handlePickedColor = (color: string) => {
    if (pickerTarget === 'start') setFromColor(color);
    else if (pickerTarget === 'end') setToColor(color);
    else if (pickerTarget === 'solid') onSelectSolid(color);
  };

  const pickerInitial =
    pickerTarget === 'start' ? fromColor : pickerTarget === 'end' ? toColor : GOLD;

  return (
    <View>
      <Text style={localStyles.label}>{t('albums.cover_gradients')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={localStyles.row}>
        <Pressable
          style={[localStyles.swatch, localStyles.addSwatch]}
          onPress={() => setEditorOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('albums.cover_custom_gradient')}
        >
          <Blend size={22} color={GOLD} />
        </Pressable>
        {COVERS.map((cover) => (
          <Pressable
            key={cover.id}
            style={localStyles.swatch}
            onPress={() => onSelectGradient([cover.colors![0], cover.colors![1]], cover.id)}
            accessibilityRole="button"
            accessibilityLabel={`Degradado ${cover.id}`}
          >
            <LinearGradient
              colors={cover.colors!}
              start={cover.diagonal ? { x: 0, y: 0 } : { x: 0.5, y: 0 }}
              end={cover.diagonal ? { x: 1, y: 1 } : { x: 0.5, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Pressable>
        ))}
      </ScrollView>

      <Text style={localStyles.label}>{t('albums.cover_solids')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={localStyles.row}>
        <Pressable
          style={[localStyles.swatch, localStyles.addSwatch]}
          onPress={() => setPickerTarget('solid')}
          accessibilityRole="button"
          accessibilityLabel={t('albums.cover_custom_color')}
        >
          <Palette size={22} color={GOLD} />
        </Pressable>
        {extraSaved.map((sc) => (
          <Pressable
            key={sc}
            style={[localStyles.swatch, { backgroundColor: sc }]}
            onPress={() => onSelectSolid(sc)}
            accessibilityRole="button"
            accessibilityLabel={`Color ${sc}`}
          />
        ))}
        {SOLID_COVERS.map((cover) => (
          <Pressable
            key={cover.id}
            style={[localStyles.swatch, { backgroundColor: cover.colors![0] }]}
            onPress={() => onSelectSolid(cover.colors![0])}
            accessibilityRole="button"
            accessibilityLabel={`Color ${cover.id}`}
          />
        ))}
      </ScrollView>

      {/* Editor de degradado personalizado (se oculta mientras se abre el selector de color) */}
      <Modal
        visible={editorOpen && pickerTarget === null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditorOpen(false)}
        statusBarTranslucent
      >
        <View style={localStyles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditorOpen(false)} />
          <View style={localStyles.card}>
            <Text style={localStyles.cardTitle}>{t('albums.cover_gradient_editor_title')}</Text>

            <View style={localStyles.preview}>
              <LinearGradient
                colors={[fromColor, toColor]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </View>

            <View style={localStyles.colorsRow}>
              {([
                ['start', fromColor, t('albums.cover_gradient_start')],
                ['end', toColor, t('albums.cover_gradient_end')],
              ] as const).map(([target, color, label]) => (
                <Pressable
                  key={target}
                  style={localStyles.colorBtn}
                  onPress={() => setPickerTarget(target)}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                >
                  <View style={[localStyles.colorDot, { backgroundColor: color }]}>
                    <Palette size={16} color={isColorDark(color) ? '#FFF' : '#000'} />
                  </View>
                  <Text style={localStyles.colorBtnText}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={localStyles.applyBtn}
              onPress={() => {
                setEditorOpen(false);
                onSelectGradient([fromColor, toColor], null);
              }}
              accessibilityRole="button"
            >
              <Text style={localStyles.applyBtnText}>{t('albums.cover_gradient_apply')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <ColorPickerModal
        visible={pickerTarget !== null}
        initialColor={pickerInitial}
        onSelectColor={handlePickedColor}
        onClose={() => setPickerTarget(null)}
        title={
          pickerTarget === 'start'
            ? t('albums.cover_gradient_start')
            : pickerTarget === 'end'
              ? t('albums.cover_gradient_end')
              : t('albums.cover_custom_color')
        }
      />
    </View>
  );
}

const localStyles = StyleSheet.create({
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#8F8F8F',
    marginTop: 8,
    marginBottom: 8,
  },
  row: { gap: 10, paddingRight: 8, paddingBottom: 4 },
  swatch: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSwatch: {
    borderStyle: 'dashed',
    borderColor: GOLD,
    backgroundColor: 'rgba(212,177,58,0.06)',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#151515',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 20,
  },
  cardTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: '#F3EEE3', marginBottom: 14 },
  preview: { height: 110, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  colorsRow: { flexDirection: 'row', gap: 12 },
  colorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#1A1A1A',
  },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorBtnText: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13, color: '#F3EEE3' },
  applyBtn: {
    height: 50,
    borderRadius: 999,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
  },
  applyBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#0D0D0D' },
});
