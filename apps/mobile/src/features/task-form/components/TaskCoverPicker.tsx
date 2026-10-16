import React from 'react';
import { View, Text, Pressable, Image, StyleSheet, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera, ImagePlus, X, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { styles } from '../styles/task-form.styles';
import { TASK_COVER_GRADIENTS } from '../constants';

interface TaskCoverPickerProps {
  coverImage: string;
  onChangeCover: (cover: string) => void;
}

export function TaskCoverPicker({
  coverImage,
  onChangeCover,
}: TaskCoverPickerProps) {
  const hasCustomImage = Boolean(coverImage && !coverImage.startsWith('preset:'));

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.9,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0]?.uri;
        if (uri) {
          onChangeCover(uri);
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
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.9,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0]?.uri;
        if (uri) {
          onChangeCover(uri);
        }
      }
    } catch (err) {
      console.warn('Error abriendo cámara:', err);
    }
  };

  const handlePickCover = () => {
    Alert.alert(
      'Foto de portada',
      'Elige el origen de tu foto:',
      [
        { text: 'Galería', onPress: () => void pickFromGallery() },
        { text: 'Hacer foto', onPress: () => void takePhoto() },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  return (
    <View style={styles.coverContainer}>
      {hasCustomImage ? (
        // Preview Banner con la imagen elegida
        <View style={styles.coverPreviewBanner}>
          <Image
            source={{ uri: coverImage }}
            style={styles.coverPreviewImage}
            resizeMode="cover"
          />
          <View style={styles.coverPreviewOverlay}>
            <Pressable
              style={styles.coverChangeBtn}
              onPress={handlePickCover}
              accessibilityRole="button"
              accessibilityLabel="Cambiar foto de portada"
            >
              <Camera color="#FFF" size={14} />
              <Text style={styles.coverChangeBtnText}>Cambiar foto</Text>
            </Pressable>

            <Pressable
              style={styles.coverRemoveBtn}
              onPress={() => onChangeCover(TASK_COVER_GRADIENTS[0]?.id || 'preset:green')}
              accessibilityRole="button"
              accessibilityLabel="Quitar foto y usar color"
            >
              <X color="#FFF" size={16} />
            </Pressable>
          </View>
        </View>
      ) : (
        // Botón visible para subir o tomar foto de portada
        <Pressable
          style={styles.uploadCoverBtn}
          onPress={handlePickCover}
          accessibilityRole="button"
          accessibilityLabel="Subir foto de portada para la tarea"
        >
          <View style={styles.uploadCoverIconCircle}>
            <ImagePlus size={20} color="#D4B13A" strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.uploadCoverTitle}>Añadir foto de portada</Text>
            <Text style={styles.uploadCoverSubtitle}>
              Sube una foto de tu galería o haz una foto
            </Text>
          </View>
        </Pressable>
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
                onPress={() => onChangeCover(g.id)}
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
    </View>
  );
}
