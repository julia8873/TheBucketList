import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Image as RNImage } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Image as ImageIcon,
  Palette,
  Link2,
  Crop,
  Camera,
  Check,
  X,
  Maximize2,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { toast, gold, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { styles } from '../styles/task-form.styles';
import { COVERS, SOLID_COVERS } from '../../album-form/types';
import { ImageLinkModal } from '@/components/ImageLinkModal';
import { ColorPickerModal, isColorDark } from '@/components/ColorPickerModal';
import { PhotoCropModal } from '@/components/PhotoCropModal';
import { useCustomColors } from '@/hooks/useCustomColors';
import { BucketCover } from '@/components/BucketCover';
import { storageApi } from '@/services/api/storage';

interface TaskCoverPickerProps {
  coverImage: string;
  onChangeCover: (cover: string) => void;
  taskTitle?: string;
}

export function TaskCoverPicker({
  coverImage,
  onChangeCover,
  taskTitle = '',
}: TaskCoverPickerProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { savedColors } = useCustomColors();

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isSquare, setIsSquare] = useState(false);
  const [cropTarget, setCropTarget] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  const hasCustomImage = Boolean(
    coverImage &&
      !coverImage.startsWith('preset:') &&
      !coverImage.startsWith('#')
  );

  const isWebLink = hasCustomImage && Boolean(coverImage?.startsWith('http'));
  const isLocalImage = hasCustomImage && !isWebLink;

  useEffect(() => {
    if (hasCustomImage) {
      const uri =
        coverImage.startsWith('http') ||
        coverImage.startsWith('file:') ||
        coverImage.startsWith('data:')
          ? coverImage
          : storageApi.getPublicUrl(coverImage);

      if (uri && !uri.startsWith('data:')) {
        RNImage.getSize(
          uri,
          (w, h) => {
            if (w && h) {
              const ratio = w / h;
              setIsSquare(Math.abs(ratio - 1) < 0.25);
            }
          },
          () => {}
        );
      }
    } else {
      setIsSquare(false);
    }
  }, [coverImage, hasCustomImage]);

  const prepareCrop = async (targetUri: string, initialW?: number, initialH?: number) => {
    let localUri = targetUri;
    if (targetUri.startsWith('http')) {
      try {
        const filename = `crop_temp_${Date.now()}.jpg`;
        const dest = `${FileSystem.cacheDirectory}${filename}`;
        const download = await FileSystem.downloadAsync(targetUri, dest);
        localUri = download.uri;
      } catch (e) {
        console.warn('Failed to cache remote image for crop, using original:', e);
      }
    }

    if (initialW && initialH) {
      setCropTarget({ uri: localUri, width: initialW, height: initialH });
      setShowCropModal(true);
    } else {
      RNImage.getSize(
        localUri,
        (w, h) => {
          setCropTarget({ uri: localUri, width: w, height: h });
          setShowCropModal(true);
        },
        () => {
          setCropTarget({ uri: localUri, width: 1200, height: 800 });
          setShowCropModal(true);
        }
      );
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        const asset = result.assets[0];
        if (asset.width && asset.height) {
          setIsSquare(Math.abs(asset.width / asset.height - 1) < 0.25);
        }
        onChangeCover(asset.uri);
      }
    } catch (err) {
      if (__DEV__) console.warn('Error seleccionando imagen:', err);
    }
  };

  const takeCameraPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        toast.error(
          t('albums.error_camera_permission', { defaultValue: 'Se necesita permiso para acceder a la cámara.' })
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        const asset = result.assets[0];
        if (asset.width && asset.height) {
          setIsSquare(Math.abs(asset.width / asset.height - 1) < 0.25);
        }
        onChangeCover(asset.uri);
      }
    } catch {
      toast.error(t('albums.error_camera_open', { defaultValue: 'Error al abrir la cámara.' }));
    }
  };

  const handleUrlCover = (url: string) => {
    setShowLinkModal(false);
    if (!url.startsWith('data:')) {
      RNImage.getSize(
        url,
        (w, h) => {
          if (w && h) {
            setIsSquare(Math.abs(w / h - 1) < 0.25);
          }
          onChangeCover(url);
        },
        () => {
          onChangeCover(url);
        }
      );
    } else {
      onChangeCover(url);
    }
  };

  const handleRecropCurrent = () => {
    if (!hasCustomImage) return;
    const uri =
      coverImage.startsWith('http') ||
      coverImage.startsWith('file:') ||
      coverImage.startsWith('data:')
        ? coverImage
        : storageApi.getPublicUrl(coverImage);
    void prepareCrop(uri);
  };

  const handleRemoveCover = () => {
    setIsSquare(false);
    onChangeCover('preset:aurora');
  };

  // Mapeo del degradado activo
  const selectedGradientId =
    coverImage === 'preset:green' || coverImage === 'preset:aurora' ? 'aurora' :
    coverImage === 'preset:orange' || coverImage === 'preset:atardecer' ? 'atardecer' :
    coverImage === 'preset:blue' || coverImage === 'preset:cielo' ? 'cielo' :
    coverImage === 'preset:purple' || coverImage === 'preset:violeta' ? 'violeta' :
    coverImage === 'preset:dorado' || coverImage === 'preset:gold' ? 'dorado' :
    null;

  // Mapeo del color sólido activo
  let currentSolidHex: string | null = null;
  if (coverImage.startsWith('preset:color:')) {
    currentSolidHex = coverImage.replace('preset:color:', '');
  } else if (coverImage.startsWith('preset:solid:')) {
    currentSolidHex = coverImage.replace('preset:solid:', '');
  } else if (coverImage.startsWith('#')) {
    currentSolidHex = coverImage;
  } else if (coverImage.startsWith('preset:')) {
    const name = coverImage.replace('preset:', '');
    const solidMap: Record<string, string> = {
      rojo: '#E53935',
      azul: '#1E88E5',
      verde: '#43A047',
      amarillo: '#FDD835',
      morado: '#8E24AA',
    };
    if (solidMap[name]) {
      currentSolidHex = solidMap[name];
    }
  }

  const isCustomColor = Boolean(
    currentSolidHex &&
      !SOLID_COVERS.some((c) => c.colors?.[0]?.toLowerCase() === currentSolidHex?.toLowerCase())
  );

  return (
    <View style={styles.coverContainer}>
      {/* Vista previa en vivo de la portada */}
      <View style={[styles.coverPreviewBanner, isSquare && { height: 240 }]}>
        {hasCustomImage ? (
          <ExpoImage
            source={{ uri: coverImage }}
            style={styles.coverPreviewImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <BucketCover
            value={coverImage}
            title={taskTitle}
            style={StyleSheet.absoluteFill}
          />
        )}

        {/* Gradiente sutil inferior */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Botón quitar foto si tiene imagen personalizada */}
        {hasCustomImage && (
          <Pressable
            style={styles.coverRemoveBadge}
            onPress={handleRemoveCover}
            accessibilityRole="button"
            accessibilityLabel={t('bucket.cover_remove', { defaultValue: 'Quitar foto' })}
            hitSlop={10}
          >
            <X color="#FFF" size={14} strokeWidth={2.5} />
            <Text style={styles.coverRemoveBadgeText}>{t('bucket.remove_photo', { defaultValue: 'Quitar' })}</Text>
          </Pressable>
        )}

        {/* Botones inferiores en imagen: Recortar y Aspect Ratio */}
        {hasCustomImage && (
          <View style={styles.coverPreviewOverlay}>
            <Pressable
              style={styles.coverChangeBtn}
              onPress={handleRecropCurrent}
              accessibilityRole="button"
              accessibilityLabel={t('bucket.cover_recrop', { defaultValue: 'Recortar' })}
            >
              <Crop color="#FFF" size={13} strokeWidth={2} />
              <Text style={styles.coverChangeBtnText}>{t('bucket.crop_action', { defaultValue: 'Recortar' })}</Text>
            </Pressable>

            <Pressable
              style={[styles.coverChangeBtn, isSquare && styles.coverChangeBtnActive]}
              onPress={() => setIsSquare(!isSquare)}
              accessibilityRole="button"
              accessibilityLabel={isSquare ? '16:9' : '1:1'}
            >
              <Maximize2 color={isSquare ? gold[400] : '#FFF'} size={13} strokeWidth={2} />
              <Text style={[styles.coverChangeBtnText, isSquare && { color: gold[400] }]}>
                {isSquare ? '1:1' : '16:9'}
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Botón para reajustar recorte si hay imagen seleccionada */}
      {hasCustomImage && (
        <Pressable
          style={[styles.recropBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={handleRecropCurrent}
          accessibilityRole="button"
          accessibilityLabel={t('albums.recrop_photo', { defaultValue: 'Reajustar recorte de la foto' })}
        >
          <Crop size={15} color="#D4B13A" strokeWidth={2} />
          <Text style={styles.recropBtnText}>{t('albums.recrop_photo', { defaultValue: 'Reajustar recorte de la foto' })}</Text>
        </Pressable>
      )}

      {/* Fila 1: Galería, Cámara, Enlace, Gradientes */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.coversRow}>
        {/* Galería */}
        <Pressable
          style={[
            styles.coverOption,
            isLocalImage && styles.coverOptionSelected,
            {
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: theme.colors.surface,
              borderColor: isLocalImage ? '#D4B13A' : theme.colors.border,
            },
          ]}
          onPress={() => void pickFromGallery()}
          accessibilityRole="button"
          accessibilityLabel={t('albums.pick_gallery', { defaultValue: 'Galería' })}
        >
          <ImageIcon
            color={isLocalImage ? '#D4B13A' : theme.colors.foregroundMuted}
            size={24}
          />
        </Pressable>

        {/* Cámara */}
        <Pressable
          style={[
            styles.coverOption,
            {
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
          onPress={() => void takeCameraPhoto()}
          accessibilityRole="button"
          accessibilityLabel={t('albums.take_camera', { defaultValue: 'Cámara' })}
        >
          <Camera color={theme.colors.foregroundMuted} size={24} />
        </Pressable>

        {/* Pegar enlace / Google */}
        <Pressable
          style={[
            styles.coverOption,
            isWebLink && styles.coverOptionSelected,
            {
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: theme.colors.surface,
              borderColor: isWebLink ? '#D4B13A' : theme.colors.border,
            },
          ]}
          onPress={() => setShowLinkModal(true)}
          accessibilityRole="button"
          accessibilityLabel={t('albums.paste_link', { defaultValue: 'Pegar enlace' })}
        >
          <Link2
            color={isWebLink ? '#D4B13A' : theme.colors.foregroundMuted}
            size={24}
          />
        </Pressable>

        {/* Gradientes predeterminados */}
        {COVERS.map((cover) => {
          const isSelected = selectedGradientId === cover.id;
          return (
            <Pressable
              key={cover.id}
              style={[styles.coverOption, isSelected && styles.coverOptionSelected]}
              onPress={() => {
                setIsSquare(false);
                onChangeCover(`preset:${cover.id}`);
              }}
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
          );
        })}
      </ScrollView>

      {/* Fila 2: Selector de color hexadecimal (Palette) / Colores guardados / Colores sólidos */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginTop: 4 }}
        contentContainerStyle={styles.coversRow}
      >
        {/* Selector de color personalizado con ColorPickerModal */}
        <Pressable
          style={[
            styles.coverOption,
            isCustomColor && styles.coverOptionSelected,
            {
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: isCustomColor && currentSolidHex
                ? currentSolidHex
                : theme.colors.surface,
              borderColor: isCustomColor ? '#D4B13A' : theme.colors.border,
            },
          ]}
          onPress={() => setShowColorPicker(true)}
          accessibilityRole="button"
          accessibilityLabel={t('common.custom_color', { defaultValue: 'Color personalizado' })}
        >
          <Palette
            color={
              isCustomColor && currentSolidHex
                ? isColorDark(currentSolidHex)
                  ? '#FFF'
                  : '#000'
                : '#D4B13A'
            }
            size={22}
          />
        </Pressable>

        {/* Colores guardados por el usuario */}
        {savedColors
          .filter(
            (sc) =>
              !SOLID_COVERS.some((soc) => soc.colors?.[0]?.toLowerCase() === sc.toLowerCase())
          )
          .slice(0, 6)
          .map((sc) => {
            const isSelected = currentSolidHex?.toLowerCase() === sc.toLowerCase();
            return (
              <Pressable
                key={sc}
                style={[
                  styles.coverOption,
                  isSelected && styles.coverOptionSelected,
                  { backgroundColor: sc, justifyContent: 'center', alignItems: 'center' },
                ]}
                onPress={() => {
                  setIsSquare(false);
                  onChangeCover(`preset:color:${sc}`);
                }}
                accessibilityRole="button"
                accessibilityLabel={`Color guardado ${sc}`}
              >
                {isSelected && (
                  <Check
                    size={18}
                    color={isColorDark(sc) ? '#FFF' : '#000'}
                    strokeWidth={2.8}
                  />
                )}
              </Pressable>
            );
          })}

        {/* Colores sólidos predeterminados */}
        {SOLID_COVERS.map((cover) => {
          const colorHex = cover.colors![0];
          const isSelected = currentSolidHex?.toLowerCase() === colorHex.toLowerCase();
          return (
            <Pressable
              key={cover.id}
              style={[
                styles.coverOption,
                isSelected && styles.coverOptionSelected,
                {
                  backgroundColor: colorHex,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}
              onPress={() => {
                setIsSquare(false);
                onChangeCover(`preset:color:${colorHex}`);
              }}
              accessibilityRole="button"
              accessibilityLabel={`Color ${cover.id}`}
            >
              {isSelected && <Check size={18} color="#FFF" strokeWidth={2.8} />}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* ColorPickerModal para portadas */}
      <ColorPickerModal
        visible={showColorPicker}
        initialColor={currentSolidHex || '#D4B13A'}
        onSelectColor={(color) => {
          setIsSquare(false);
          onChangeCover(`preset:color:${color}`);
        }}
        onClose={() => setShowColorPicker(false)}
        title={t('albums.custom_cover_color', { defaultValue: 'Color de portada' })}
      />

      {/* Modal para añadir portada con enlace web o de Google */}
      <ImageLinkModal
        visible={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onApplyImage={handleUrlCover}
        initialQuery={taskTitle}
      />

      {/* Editor interactivo de recorte */}
      <PhotoCropModal
        visible={showCropModal}
        uri={cropTarget?.uri ?? null}
        width={cropTarget?.width ?? 1200}
        height={cropTarget?.height ?? 800}
        index={0}
        total={1}
        onCancel={() => {
          setShowCropModal(false);
          setCropTarget(null);
        }}
        onDone={(croppedUri) => {
          setShowCropModal(false);
          setCropTarget(null);
          RNImage.getSize(
            croppedUri,
            (w, h) => {
              if (w && h) {
                setIsSquare(Math.abs(w / h - 1) < 0.25);
              }
            },
            () => {}
          );
          onChangeCover(croppedUri);
        }}
      />
    </View>
  );
}
