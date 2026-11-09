import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Image as RNImage, Platform } from 'react-native';
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

export interface TaskFormPhoto {
  id?: string;
  uri: string;
  storage_path?: string;
  thumb_path?: string;
}

/* =========================================================================
   TASK COVER BANNER (Vista previa de la portada arriba del formulario)
   ========================================================================= */

export interface TaskCoverBannerProps {
  coverImage: string;
  taskTitle?: string;
  isSquare?: boolean;
  onToggleSquare?: () => void;
  onRecrop?: (croppedUri: string) => void;
  onRemovePhoto?: () => void;
}

export function TaskCoverBanner({
  coverImage,
  taskTitle = '',
  isSquare = false,
  onToggleSquare,
  onRecrop,
  onRemovePhoto,
}: TaskCoverBannerProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [cropTarget, setCropTarget] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  const hasCustomImage = Boolean(
    coverImage &&
      !coverImage.startsWith('preset:') &&
      !coverImage.startsWith('#')
  );

  const prepareCrop = async (targetUri: string, initialW?: number, initialH?: number) => {
    let localUri = targetUri;
    if (targetUri.startsWith('http') && Platform.OS !== 'web') {
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

  return (
    <View style={styles.coverContainer}>
      <View style={[styles.coverPreviewBanner, isSquare && { height: 240 }]}>
        {hasCustomImage ? (
          <ExpoImage
            source={{ uri: coverImage.startsWith('http') || coverImage.startsWith('file:') || coverImage.startsWith('data:') ? coverImage : storageApi.getPublicUrl(coverImage) }}
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

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {hasCustomImage && onRemovePhoto && (
          <Pressable
            style={styles.coverRemoveBadge}
            onPress={onRemovePhoto}
            accessibilityRole="button"
            accessibilityLabel={t('bucket.cover_remove', { defaultValue: 'Quitar foto' })}
            hitSlop={10}
          >
            <X color="#FFF" size={14} strokeWidth={2.5} />
            <Text style={styles.coverRemoveBadgeText}>{t('bucket.remove_photo', { defaultValue: 'Quitar' })}</Text>
          </Pressable>
        )}

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

            {onToggleSquare && (
              <Pressable
                style={[styles.coverChangeBtn, isSquare && styles.coverChangeBtnActive]}
                onPress={onToggleSquare}
                accessibilityRole="button"
                accessibilityLabel={isSquare ? '16:9' : '1:1'}
              >
                <Maximize2 color={isSquare ? gold[400] : '#FFF'} size={13} strokeWidth={2} />
                <Text style={[styles.coverChangeBtnText, isSquare && { color: gold[400] }]}>
                  {isSquare ? '1:1' : '16:9'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

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
          onRecrop?.(croppedUri);
        }}
      />
    </View>
  );
}

/* =========================================================================
   TASK PHOTO AND COLOR PICKER (Controles debajo de QUÉ QUIERES LOGRAR)
   ========================================================================= */

const MAX_TASK_PHOTOS = 8;

export interface TaskPhotoAndColorPickerProps {
  coverColor: string;
  onChangeColor: (color: string) => void;
  photos: TaskFormPhoto[];
  selectedCoverIndex: number;
  onSelectCoverPhoto: (index: number) => void;
  onAddPhotos: (uris: string[]) => void;
  onRemovePhoto: (index: number) => void;
  isAdmin?: boolean;
  taskTitle?: string;
}

export function TaskPhotoAndColorPicker({
  coverColor,
  onChangeColor,
  photos,
  selectedCoverIndex,
  onSelectCoverPhoto,
  onAddPhotos,
  onRemovePhoto,
  isAdmin = false,
  taskTitle = '',
}: TaskPhotoAndColorPickerProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { savedColors } = useCustomColors();

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Mapeo del degradado activo
  const selectedGradientId =
    coverColor === 'preset:green' || coverColor === 'preset:aurora' ? 'aurora' :
    coverColor === 'preset:orange' || coverColor === 'preset:atardecer' ? 'atardecer' :
    coverColor === 'preset:blue' || coverColor === 'preset:cielo' ? 'cielo' :
    coverColor === 'preset:purple' || coverColor === 'preset:violeta' ? 'violeta' :
    coverColor === 'preset:dorado' || coverColor === 'preset:gold' ? 'dorado' :
    null;

  // Mapeo del color sólido activo
  let currentSolidHex: string | null = null;
  if (coverColor.startsWith('preset:color:')) {
    currentSolidHex = coverColor.replace('preset:color:', '');
  } else if (coverColor.startsWith('preset:solid:')) {
    currentSolidHex = coverColor.replace('preset:solid:', '');
  } else if (coverColor.startsWith('#')) {
    currentSolidHex = coverColor;
  } else if (coverColor.startsWith('preset:')) {
    const name = coverColor.replace('preset:', '');
    const solidMap: Record<string, string> = {
      rojo: '#E53935',
      azul: '#1E88E5',
      verde: '#43A047',
      amarillo: '#FDD835',
      morado: '#8E24AA',
    };
    if (solidMap[name]) {
      currentSolidHex = solidMap[name] as string;
    }
  }

  const isCustomColor = Boolean(
    currentSolidHex &&
      !SOLID_COVERS.some((c) => c.colors?.[0]?.toLowerCase() === currentSolidHex?.toLowerCase())
  );

  const checkPhotoLimit = () => {
    if (!isAdmin && photos.length >= MAX_TASK_PHOTOS) {
      toast.error(
        t('bucket_detail.photo_limit_message', {
          defaultValue: 'Solo hay un máximo de 10 fotos por tarea.',
        })
      );
      return false;
    }
    return true;
  };

  const pickFromGallery = async () => {
    if (!checkPhotoLimit()) return;
    try {
      const remaining = MAX_TASK_PHOTOS - photos.length;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.85,
        ...(isAdmin ? {} : { selectionLimit: Math.max(1, remaining) }),
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (!isAdmin && photos.length + result.assets.length > MAX_TASK_PHOTOS) {
          toast.error(
            t('bucket_detail.photo_limit_message', {
              defaultValue: 'Solo hay un máximo de 10 fotos por tarea.',
            })
          );
        }
        const toAdd = result.assets
          .slice(0, isAdmin ? undefined : remaining)
          .map((a) => a.uri)
          .filter(Boolean);
        if (toAdd.length > 0) {
          onAddPhotos(toAdd);
        }
      }
    } catch (err) {
      if (__DEV__) console.warn('Error seleccionando imagen:', err);
    }
  };

  const takeCameraPhoto = async () => {
    if (!checkPhotoLimit()) return;
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
        onAddPhotos([result.assets[0].uri]);
      }
    } catch {
      toast.error(t('albums.error_camera_open', { defaultValue: 'Error al abrir la cámara.' }));
    }
  };

  const handleUrlPhoto = (url: string) => {
    setShowLinkModal(false);
    if (!url.trim()) return;
    if (!checkPhotoLimit()) return;
    onAddPhotos([url.trim()]);
  };

  return (
    <View style={{ gap: 14 }}>
      {/* FILA 1: Colores predeterminados con el hex picker y gradientes */}
      <View>
        <Text style={{ fontSize: 12, fontWeight: '600', color: gold[400], marginBottom: 8, textTransform: 'uppercase' }}>
          {t('task_form.colors_title', { defaultValue: 'Color o degradado de fondo' })}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.coversRow}>
          {/* Selector de color personalizado con ColorPickerModal */}
          <Pressable
            style={[
              styles.coverOption,
              isCustomColor && styles.coverOptionSelected,
              {
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: isCustomColor && currentSolidHex ? currentSolidHex : theme.colors.surface,
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
            .filter((sc) => !SOLID_COVERS.some((soc) => soc.colors?.[0]?.toLowerCase() === sc.toLowerCase()))
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
                  onPress={() => onChangeColor(`preset:color:${sc}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Color guardado ${sc}`}
                >
                  {isSelected && (
                    <Check size={18} color={isColorDark(sc) ? '#FFF' : '#000'} strokeWidth={2.8} />
                  )}
                </Pressable>
              );
            })}

          {/* Gradientes predeterminados */}
          {COVERS.map((cover) => {
            const isSelected = selectedGradientId === cover.id;
            return (
              <Pressable
                key={cover.id}
                style={[styles.coverOption, isSelected && styles.coverOptionSelected]}
                onPress={() => onChangeColor(`preset:${cover.id}`)}
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
                onPress={() => onChangeColor(`preset:color:${colorHex}`)}
                accessibilityRole="button"
                accessibilityLabel={`Color ${cover.id}`}
              >
                {isSelected && <Check size={18} color="#FFF" strokeWidth={2.8} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* FILA 2: Botones para añadir fotos (Galería, Cámara, Enlace Google) */}
      <View>
        <Text style={{ fontSize: 12, fontWeight: '600', color: gold[400], marginBottom: 8, textTransform: 'uppercase' }}>
          {t('task_form.photos_title', { defaultValue: 'Subir imágenes' })}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {/* Galería */}
          <Pressable
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
            onPress={() => void pickFromGallery()}
            accessibilityRole="button"
          >
            <ImageIcon color={gold[400]} size={18} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.foreground }}>
              {t('albums.pick_gallery', { defaultValue: 'Galería' })}
            </Text>
          </Pressable>

          {/* Cámara */}
          <Pressable
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
            onPress={() => void takeCameraPhoto()}
            accessibilityRole="button"
          >
            <Camera color={gold[400]} size={18} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.foreground }}>
              {t('albums.take_camera', { defaultValue: 'Cámara' })}
            </Text>
          </Pressable>

          {/* Enlace Google / Web */}
          <Pressable
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 12,
              borderRadius: 12,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
            }}
            onPress={() => setShowLinkModal(true)}
            accessibilityRole="button"
          >
            <Link2 color={gold[400]} size={18} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.foreground }}>
              {t('albums.paste_link', { defaultValue: 'Enlace' })}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* FILA 3: Fotos subidas */}
      {photos.length > 0 && (
        <View style={{ marginTop: 2 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '600', color: theme.colors.foregroundMuted }}>
              {t('task_form.uploaded_photos', { defaultValue: 'Fotos añadidas' })} ({photos.length}{!isAdmin ? '/8' : ''})
            </Text>
            <Text style={{ fontSize: 11, color: gold[400] }}>
              {t('task_form.tap_cover_hint', { defaultValue: 'Toca una foto para elegir la portada' })}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
            {photos.map((item, idx) => {
              const isCover = idx === selectedCoverIndex;
              const photoUri = item.uri.startsWith('http') || item.uri.startsWith('file:') || item.uri.startsWith('data:')
                ? item.uri
                : storageApi.getPublicUrl(item.thumb_path || item.storage_path || item.uri);

              return (
                <Pressable
                  key={`${item.id || item.uri}_${idx}`}
                  onPress={() => onSelectCoverPhoto(idx)}
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 12,
                    overflow: 'hidden',
                    borderWidth: 2,
                    borderColor: isCover ? gold[400] : theme.colors.border,
                    backgroundColor: theme.colors.surface,
                    position: 'relative',
                  }}
                >
                  <ExpoImage
                    source={{ uri: photoUri }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                  />

                  {/* Badge de Portada */}
                  {isCover && (
                    <View
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(212, 177, 58, 0.9)',
                        paddingVertical: 2,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 9, fontWeight: '700', color: '#0D0D0D' }}>
                        {t('bucket.thumbnail_cover', { defaultValue: 'PORTADA' })}
                      </Text>
                    </View>
                  )}

                  {/* Botón quitar foto */}
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      onRemovePhoto(idx);
                    }}
                    hitSlop={8}
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={12} color="#FFF" strokeWidth={2.5} />
                  </Pressable>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ColorPickerModal para portadas */}
      <ColorPickerModal
        visible={showColorPicker}
        initialColor={currentSolidHex || '#D4B13A'}
        onSelectColor={(color) => {
          onChangeColor(`preset:color:${color}`);
        }}
        onClose={() => setShowColorPicker(false)}
        title={t('albums.custom_cover_color', { defaultValue: 'Color de portada' })}
      />

      {/* Modal para añadir portada con enlace web o de Google */}
      <ImageLinkModal
        visible={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onApplyImage={handleUrlPhoto}
        initialQuery={taskTitle}
      />
    </View>
  );
}

/* =========================================================================
   LEGACY / WRAPPER TASK COVER PICKER (Para compatibilidad existente)
   ========================================================================= */

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
  const [photos, setPhotos] = useState<TaskFormPhoto[]>(() => {
    if (coverImage && !coverImage.startsWith('preset:') && !coverImage.startsWith('#')) {
      return [{ uri: coverImage }];
    }
    return [];
  });
  const [selectedCoverIndex, setSelectedCoverIndex] = useState(0);

  const activeCover = photos[selectedCoverIndex]?.uri || coverImage;

  return (
    <View style={{ gap: 16 }}>
      <TaskCoverBanner
        coverImage={activeCover}
        taskTitle={taskTitle}
        onRemovePhoto={() => {
          setPhotos([]);
          onChangeCover('preset:aurora');
        }}
      />
      <TaskPhotoAndColorPicker
        coverColor={coverImage.startsWith('preset:') || coverImage.startsWith('#') ? coverImage : 'preset:aurora'}
        onChangeColor={(col) => {
          setPhotos([]);
          onChangeCover(col);
        }}
        photos={photos}
        selectedCoverIndex={selectedCoverIndex}
        onSelectCoverPhoto={(idx) => {
          setSelectedCoverIndex(idx);
          if (photos[idx]) onChangeCover(photos[idx].uri);
        }}
        onAddPhotos={(newUris) => {
          const next = [...photos, ...newUris.map((u) => ({ uri: u }))];
          setPhotos(next);
          if (photos.length === 0 && next[0]) {
            setSelectedCoverIndex(0);
            onChangeCover(next[0].uri);
          }
        }}
        onRemovePhoto={(idx) => {
          const next = photos.filter((_, i) => i !== idx);
          setPhotos(next);
          if (next.length === 0) {
            onChangeCover('preset:aurora');
          } else {
            const nextIdx = Math.min(selectedCoverIndex, next.length - 1);
            setSelectedCoverIndex(nextIdx);
            onChangeCover(next[nextIdx]!.uri);
          }
        }}
        taskTitle={taskTitle}
      />
    </View>
  );
}
