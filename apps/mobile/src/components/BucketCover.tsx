import React from 'react';
import { View, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { storageApi } from '../services/api/storage';
import {
  CoverPreset,
  autoCoverPreset,
  getPresetByKey,
  presetKeyFromValue,
} from '../constants/coverPresets';

interface BucketCoverProps {
  /** Valor de `buckets.cover_image` (preset:<key>, ruta de storage o null). */
  value?: string | null;
  title?: string | null;
  categorySlug?: string | null;
  /** Semilla estable (id de la tarea) para elegir el degradado automático. */
  seed?: string | null;
  /** Tamaño del icono decorativo; se adapta al alto del contenedor si no se indica. */
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

function PresetArt({ preset, iconSize }: { preset: CoverPreset; iconSize: number }) {
  const IconComponent = preset.icon;
  return (
    <>
      {preset.image ? (
        <Image source={preset.image} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={preset.colors}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      {/* Círculos decorativos */}
      <View
        pointerEvents="none"
        style={[
          styles.circle,
          {
            width: iconSize * 1.6,
            height: iconSize * 1.6,
            borderRadius: iconSize * 0.8,
            top: -iconSize * 0.5,
            left: -iconSize * 0.45,
          },
        ]}
      />
      {IconComponent && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', right: -iconSize * 0.08, top: '14%' }}
        >
          <IconComponent color="rgba(255,255,255,0.20)" size={iconSize} strokeWidth={1.2} />
        </View>
      )}
    </>
  );
}

/**
 * Portada de una tarea: foto propia, preset elegido o preset automático.
 * Se dibuja a pantalla completa dentro del contenedor (overflow oculto).
 */
export function BucketCover({
  value,
  title,
  categorySlug,
  seed,
  iconSize = 150,
  style,
  children,
}: BucketCoverProps) {
  const presetKey = presetKeyFromValue(value);
  const chosenPreset = getPresetByKey(presetKey);
  const isCustomImage = !!value && !presetKey;

  // Preset visible (también sirve de fondo mientras carga una foto propia).
  const preset = chosenPreset ?? autoCoverPreset({ title, categorySlug, seed });

  const imageUri = isCustomImage
    ? value!.startsWith('http')
      ? value!
      : storageApi.getPublicUrl(value!)
    : null;

  return (
    <View style={[styles.container, style]}>
      <PresetArt preset={preset} iconSize={iconSize} />
      {imageUri && (
        <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#0E0E0E',
  },
  circle: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});