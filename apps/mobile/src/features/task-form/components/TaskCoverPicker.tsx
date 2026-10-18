import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, Image as RNImage } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, ImagePlus, X, Check, Link2, Crop, Maximize2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { gold } from '@bucketlist/ui';
import { styles } from '../styles/task-form.styles';
import { TASK_COVER_GRADIENTS } from '../constants';
import { ImageLinkModal } from '@/components/ImageLinkModal';
import { PhotoCropModal } from '@/components/PhotoCropModal';
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
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [isSquare, setIsSquare] = useState(false);
  const [cropTarget, setCropTarget] = useState<{ uri: string; width: number; height: number } | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);

  const hasCustomImage = Boolean(coverImage && !coverImage.startsWith('preset:'));

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
        allowsEditing: false,
        quality: 0.9,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset?.uri) {
          await prepareCrop(asset.uri, asset.width || undefined, asset.height || undefined);
        }
      }
    } catch (err) {
      console.warn('Error seleccionando imagen:', err);
    }
  };

  const takePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso necesario', 'Se necesita permiso para acceder a la cámara.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.9,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset?.uri) {
          await prepareCrop(asset.uri, asset.width || undefined, asset.height || undefined);
        }
      }
    } catch (err) {
      console.warn('Error abriendo cámara:', err);
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
    onChangeCover(TASK_COVER_GRADIENTS[0]?.id || 'preset:green');
  };

  return (
    <View style={styles.coverContainer}>
      {hasCustomImage ? (
        // Preview Banner con la imagen elegida (se adapta a formato cuadrado o panorámico)
        <View style={[styles.coverPreviewBanner, isSquare && { height: 260 }]}>
          <ExpoImage
            source={{ uri: coverImage }}
            style={styles.coverPreviewImage}
            contentFit="cover"
            cachePolicy="memory-disk"
          />

          {/* Botón rápido cerrar/borrar foto en la esquina superior derecha */}
          <Pressable
            style={styles.coverRemoveBadge}
            onPress={handleRemoveCover}
            accessibilityRole="button"
            accessibilityLabel="Borrar foto de portada"
            hitSlop={10}
          >
            <X color="#FFF" size={14} strokeWidth={2.5} />
            <Text style={styles.coverRemoveBadgeText}>Borrar foto</Text>
          </Pressable>

          {/* Botones inferiores: Recortar (edita la foto actual) y Cuadrada/Panorámica */}
          <View style={styles.coverPreviewOverlay}>
            <Pressable
              style={styles.coverChangeBtn}
              onPress={handleRecropCurrent}
              accessibilityRole="button"
              accessibilityLabel="Recortar y reajustar foto actual"
            >
              <Crop color="#FFF" size={13} strokeWidth={2} />
              <Text style={styles.coverChangeBtnText}>Recortar</Text>
            </Pressable>

            <Pressable
              style={[styles.coverChangeBtn, isSquare && styles.coverChangeBtnActive]}
              onPress={() => setIsSquare(!isSquare)}
              accessibilityRole="button"
              accessibilityLabel={isSquare ? 'Cambiar a formato panorámico' : 'Cambiar a formato cuadrado 1:1'}
            >
              <Maximize2 color={isSquare ? gold[400] : '#FFF'} size={13} strokeWidth={2} />
              <Text style={[styles.coverChangeBtnText, isSquare && { color: gold[400] }]}>
                {isSquare ? '1:1 Cuadrada' : 'Panorámica'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        // Opciones directas: Galería, Cámara y Enlace Google / Web (sin diálogos bloqueantes)
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Pressable
              style={[styles.uploadCoverBtn, { flex: 1 }]}
              onPress={() => void pickFromGallery()}
              accessibilityRole="button"
              accessibilityLabel="Subir foto desde la galería"
            >
              <View style={styles.uploadCoverIconCircle}>
                <ImagePlus size={20} color="#D4B13A" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.uploadCoverTitle}>Galería</Text>
                <Text style={styles.uploadCoverSubtitle}>Elegir y recortar</Text>
              </View>
            </Pressable>

            <Pressable
              style={[styles.uploadCoverBtn, { flex: 1 }]}
              onPress={() => void takePhoto()}
              accessibilityRole="button"
              accessibilityLabel="Hacer foto con la cámara"
            >
              <View style={styles.uploadCoverIconCircle}>
                <Camera size={20} color="#D4B13A" strokeWidth={2.2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.uploadCoverTitle}>Cámara</Text>
                <Text style={styles.uploadCoverSubtitle}>Hacer foto</Text>
              </View>
            </Pressable>
          </View>

          <Pressable
            style={[
              styles.uploadCoverBtn,
              {
                borderColor: 'rgba(212, 177, 58, 0.4)',
                backgroundColor: 'rgba(212, 177, 58, 0.05)',
              },
            ]}
            onPress={() => setShowLinkModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Añadir foto con enlace de Google o Web"
          >
            <View style={[styles.uploadCoverIconCircle, { borderColor: gold[400] }]}>
              <Link2 size={20} color={gold[400]} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.uploadCoverTitle, { color: gold[400] }]}>
                Añadir con enlace de Google / Web
              </Text>
              <Text style={styles.uploadCoverSubtitle}>
                Pega el enlace sin descargar la foto en tu móvil
              </Text>
            </View>
          </Pressable>
        </View>
      )}

      {/* Degradados de color predeterminados */}
      <View style={styles.coverPresetsSection}>
        <Text style={styles.coverSubLabel}>
          {hasCustomImage ? 'O cambia a un degradado' : 'O elige un color predeterminado'}
        </Text>
        <View style={styles.coverPresetsRow}>
          {TASK_COVER_GRADIENTS.map((g) => {
            const isSelected = coverImage === g.id;
            return (
              <Pressable
                key={g.id}
                onPress={() => {
                  setIsSquare(false);
                  onChangeCover(g.id);
                }}
                style={[
                  styles.coverPresetTile,
                  isSelected && styles.coverPresetTileSelected,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Color de portada ${g.id}`}
              >
                <LinearGradient
                  colors={g.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}
                >
                  {isSelected && <Check size={18} color="#FFF" strokeWidth={2.8} />}
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Editor interactivo de recorte con Cancelar y Listo */}
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

      {/* Modal para pegar enlace de Google / Web */}
      <ImageLinkModal
        visible={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onApplyImage={(url) => {
          void prepareCrop(url);
        }}
        initialQuery={taskTitle}
      />
    </View>
  );
}
