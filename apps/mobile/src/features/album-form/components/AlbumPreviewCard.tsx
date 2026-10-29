import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { styles } from '../styles/album-form.styles';
import { useTranslation } from '@bucketlist/shared';
import type { Cover, AlbumVisibility } from '../types';
import type { CollaboratorItem } from '../../../components/CollaboratorPickerSheet';

interface AlbumPreviewCardProps {
  selectedCover: Cover;
  name: string;
  isShared: boolean;
  visibility: AlbumVisibility;
  collaborators: CollaboratorItem[];
}

export function AlbumPreviewCard({
  selectedCover,
  name,
  isShared,
  visibility,
  collaborators,
}: AlbumPreviewCardProps) {
  const { t } = useTranslation();
  const gradientColors: [string, string, ...string[]] =
    selectedCover.colors && selectedCover.colors.length >= 2
      ? (selectedCover.colors as [string, string, ...string[]])
      : ['#000000', '#000000'];

  // Vista previa compacta: misma proporción que la portada elegida, pero con altura máxima reducida.
  const ratio = selectedCover.aspectRatio || '1:1';
  const screenWidth = Dimensions.get('window').width;
  const maxW = Math.min(screenWidth, 620) - 24;
  const PREVIEW_H = 150;
  const ratioValue = ratio === '1:1' ? 1 : ratio === '3:4' ? 3 / 4 : 16 / 9;
  const previewW = Math.min(maxW, Math.round(PREVIEW_H * ratioValue));
  const dynamicContainerStyle: any = {
    width: previewW,
    height: PREVIEW_H,
    alignSelf: 'center',
    marginHorizontal: 0,
    marginTop: 4,
  };

  return (
    <View style={[styles.previewContainer, dynamicContainerStyle]}>
      {selectedCover.type === 'image' && selectedCover.uri ? (
        <ExpoImage source={{ uri: selectedCover.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <LinearGradient
          colors={gradientColors}
          start={selectedCover.diagonal ? { x: 0, y: 0 } : { x: 0.5, y: 0 }}
          end={selectedCover.diagonal ? { x: 1, y: 1 } : { x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.78)']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.previewBadgesRow}>
        {isShared && (
          <View style={styles.previewSharedBadge}>
            <Text style={[styles.previewSharedText, { color: '#D4B13A' }]}>{t('albums.shared')}</Text>
          </View>
        )}
        <View style={styles.previewVisibilityBadge}>
          <Text style={[styles.previewVisibilityText, { color: '#E2DCCF' }]}>
            {visibility === 'public'
              ? t('common.public')
              : visibility === 'followers'
              ? t('bucket.followers')
              : t('common.private')}
          </Text>
        </View>
      </View>

      <View style={styles.previewBottom}>
        <Text style={[styles.previewTitle, { color: '#F3EEE3' }]} numberOfLines={1}>
          {name.trim() ? name : t('albums.new_album')}
        </Text>
        <Text style={[styles.previewSubtitle, { color: '#E2DCCF' }]}>
          {isShared && collaborators.length > 0
            ? `${collaborators.length} ${collaborators.length > 1 ? t('albums.collaborators_plural') : t('albums.collaborator_single')}`
            : `0 ${t('albums.tasks')} · 0 ${t('albums.completed_plural')}`}
        </Text>
        <View style={[styles.progressBarTrack, { backgroundColor: 'rgba(255, 255, 255, 0.25)' }]} />
      </View>
    </View>
  );
}
