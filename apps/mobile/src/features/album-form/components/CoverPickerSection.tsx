import { themedStyleSheet } from '@bucketlist/ui';
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Image as RNImage } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Image as ImageIcon,
  Palette,
  Link2,
  Crop,
  Camera,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { toast, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { styles } from '../styles/album-form.styles';
import { COVERS, SOLID_COVERS, type Cover, type CoverAspectRatio } from '../types';
import { SectionTitle } from './SectionTitle';
import { ImageLinkModal } from '../../../components/ImageLinkModal';

interface CoverPickerSectionProps {
  selectedCover: Cover;
  onSelectCover: (cover: Cover) => void;
  albumTitle?: string;
}

export function CoverPickerSection({
  selectedCover,
  onSelectCover,
  albumTitle = '',
}: CoverPickerSectionProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [showLinkModal, setShowLinkModal] = useState(false);
  const currentRatio: CoverAspectRatio = selectedCover.aspectRatio || '16:9';

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      const asset = result.assets[0];
      const width = asset.width || 1;
      const height = asset.height || 1;
      const ratioVal = width / height;
      const determinedRatio: CoverAspectRatio =
        Math.abs(ratioVal - 1) < 0.25 ? '1:1' : ratioVal < 0.85 ? '3:4' : '16:9';

      onSelectCover({
        id: 'custom-img',
        type: 'image',
        uri: asset.uri,
        aspectRatio: determinedRatio,
      });
    }
  };

  const takeCameraPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        toast.error(t('albums.error_camera_permission'));
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const width = asset.width || 1;
        const height = asset.height || 1;
        const ratioVal = width / height;
        const determinedRatio: CoverAspectRatio =
          Math.abs(ratioVal - 1) < 0.25 ? '1:1' : ratioVal < 0.85 ? '3:4' : '16:9';

        onSelectCover({
          id: 'custom-img',
          type: 'image',
          uri: asset.uri,
          aspectRatio: determinedRatio,
        });
      }
    } catch {
      toast.error(t('albums.error_camera_open'));
    }
  };

  const handleUrlCover = (url: string) => {
    setShowLinkModal(false);
    let determinedRatio: CoverAspectRatio = '16:9';

    if (!url.startsWith('data:')) {
      RNImage.getSize(
        url,
        (w, h) => {
          if (w && h) {
            const ratioVal = w / h;
            determinedRatio =
              Math.abs(ratioVal - 1) < 0.25 ? '1:1' : ratioVal < 0.85 ? '3:4' : '16:9';
          }
          onSelectCover({
            id: 'custom-img',
            type: 'image',
            uri: url,
            aspectRatio: determinedRatio,
          });
        },
        () => {
          onSelectCover({
            id: 'custom-img',
            type: 'image',
            uri: url,
            aspectRatio: '16:9',
          });
        }
      );
    } else {
      onSelectCover({
        id: 'custom-img',
        type: 'image',
        uri: url,
        aspectRatio: currentRatio,
      });
    }
  };

  return (
    <View style={styles.section}>
      <SectionTitle highlight={t('albums.section_cover_highlight')} rest={t('albums.section_cover_rest')} />

      {/* Botón para reajustar recorte si hay imagen seleccionada */}
      {selectedCover.type === 'image' && selectedCover.uri && (
        <Pressable
          style={[styles.recropBtn, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          onPress={() => void pickImage()}
          accessibilityRole="button"
          accessibilityLabel={t('albums.recrop_photo')}
        >
          <Crop size={15} color="#D4B13A" strokeWidth={2} />
          <Text style={styles.recropBtnText}>{t('albums.recrop_photo')}</Text>
        </Pressable>
      )}

      {/* Fila de opciones: Galería, Enlace, Gradientes */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.coversRow}>
        {/* Galería con recorte libre */}
        <Pressable
          style={[
            styles.coverOption,
            selectedCover.type === 'image' && !selectedCover.uri?.startsWith('http') && styles.coverOptionSelected,
            { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
          onPress={() => void pickImage()}
          accessibilityRole="button"
          accessibilityLabel={t('albums.pick_gallery')}
        >
          <ImageIcon color={selectedCover.type === 'image' && !selectedCover.uri?.startsWith('http') ? '#D4B13A' : theme.colors.foregroundMuted} size={24} />
        </Pressable>

        {/* Cámara */}
        <Pressable
          style={[
            styles.coverOption,
            { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
          onPress={() => void takeCameraPhoto()}
          accessibilityRole="button"
          accessibilityLabel={t('albums.take_camera')}
        >
          <Camera color={theme.colors.foregroundMuted} size={24} />
        </Pressable>

        {/* Pegar enlace / Google */}
        <Pressable
          style={[
            styles.coverOption,
            selectedCover.type === 'image' && Boolean(selectedCover.uri?.startsWith('http')) && styles.coverOptionSelected,
            { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
          onPress={() => setShowLinkModal(true)}
          accessibilityRole="button"
          accessibilityLabel={t('albums.paste_link')}
        >
          <Link2 color={selectedCover.type === 'image' && Boolean(selectedCover.uri?.startsWith('http')) ? '#D4B13A' : theme.colors.foregroundMuted} size={24} />
        </Pressable>

        {COVERS.map((cover) => {
          const isSelected = selectedCover.id === cover.id;
          return (
            <Pressable
              key={cover.id}
              style={[styles.coverOption, isSelected && styles.coverOptionSelected]}
              onPress={() => onSelectCover({ ...cover, aspectRatio: currentRatio })}
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

      {/* Fila de colores sólidos */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }} contentContainerStyle={styles.coversRow}>
        <Pressable
          style={[
            styles.coverOption,
            selectedCover.id === 'custom-color' && styles.coverOptionSelected,
            { justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
          onPress={() =>
            onSelectCover({
              id: 'custom-color',
              type: 'solid',
              colors: ['#D4B13A', '#D4B13A'],
              aspectRatio: currentRatio,
            })
          }
        >
          <Palette color={selectedCover.id === 'custom-color' ? '#D4B13A' : theme.colors.foregroundMuted} size={24} />
        </Pressable>
        {SOLID_COVERS.map((cover) => {
          const isSelected = selectedCover.id === cover.id;
          return (
            <Pressable
              key={cover.id}
              style={[
                styles.coverOption,
                isSelected && styles.coverOptionSelected,
                { backgroundColor: cover.colors![0] },
              ]}
              onPress={() => onSelectCover({ ...cover, aspectRatio: currentRatio })}
            />
          );
        })}
      </ScrollView>

      {/* Modal para añadir portada con enlace web o de Google */}
      <ImageLinkModal
        visible={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onApplyImage={handleUrlCover}
        initialQuery={albumTitle}
      />
    </View>
  );
}
