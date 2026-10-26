import { themedStyleSheet, useTheme } from '@bucketlist/ui';
import React, { memo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { storageApi } from '../services/api/storage';
import type {
  CoverPreset} from '../constants/coverPresets';
import {
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

const PresetArt = memo(function PresetArt({
  preset,
  iconSize,
  isDark,
}: {
  preset: CoverPreset;
  iconSize: number;
  isDark: boolean;
}) {
  const IconComponent = preset.icon;
  const colors = !isDark && preset.lightColors ? preset.lightColors : preset.colors;

  return (
    <>
      {preset.image ? (
        <ExpoImage
          source={preset.image}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <LinearGradient
          colors={colors}
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
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)',
          },
        ]}
      />
      {IconComponent && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', right: -iconSize * 0.08, top: '14%' }}
        >
          <IconComponent
            color={isDark ? 'rgba(255,255,255,0.20)' : 'rgba(255,255,255,0.25)'}
            size={iconSize}
            strokeWidth={1.2}
          />
        </View>
      )}
    </>
  );
});

/**
 * Portada de una tarea: foto propia, preset elegido o preset automático.
 * Se dibuja a pantalla completa dentro del contenedor (overflow oculto).
 * Optimizado con expo-image, caché en disco/memoria y React.memo.
 */
function BucketCoverComponent({
  value,
  title,
  categorySlug,
  seed,
  iconSize = 150,
  style,
  children,
}: BucketCoverProps) {
  const { theme } = useTheme();
  const presetKey = presetKeyFromValue(value);
  const chosenPreset = getPresetByKey(presetKey);
  const isCustomImage = !!value && !presetKey;

  // Preset visible (también sirve de fondo mientras carga una foto propia).
  const preset = chosenPreset ?? autoCoverPreset({ title, categorySlug, seed });

  const imageUri = isCustomImage
    ? (value.startsWith('http') || value.startsWith('file:') || value.startsWith('content:') || value.startsWith('ph:') || value.startsWith('blob:') || value.startsWith('data:'))
      ? value
      : storageApi.getPublicUrl(value)
    : null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }, style]}>
      {!isCustomImage && <PresetArt preset={preset} iconSize={iconSize} isDark={theme.dark} />}
      {imageUri && (
        <ExpoImage
          source={{ uri: imageUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
        />
      )}
      {children}
    </View>
  );
}

export const BucketCover = memo(BucketCoverComponent);

const styles = themedStyleSheet({
  container: {
    overflow: 'hidden',
  },
  circle: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
});