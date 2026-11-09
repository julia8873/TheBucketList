import React from 'react';
import { View, Text, Pressable, ScrollView, Image, StyleSheet } from 'react-native';
import { Typography, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';
import { Check } from 'lucide-react-native';
import { BucketCover } from '@/components/BucketCover';
import { resolveTaskImage } from '@/utils/taskImage';
import { storageApi } from '@/services/api/storage';
import { styles } from '../styles/bucket-detail.styles';

function ThumbOption({
  label,
  selected,
  onPress,
  children,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={t('bucket.thumbnail_label', { label, defaultValue: `Imagen de la tarea: ${label}` })}
      style={{ width: 72, alignItems: 'center', gap: 6 }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 12,
          overflow: 'hidden',
          borderWidth: 2,
          borderColor: selected ? gold[400] : 'transparent',
          backgroundColor: theme.colors.surface,
        }}
      >
        {children}
        {selected && (
          <View
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: gold[400],
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Check size={12} color="#0D0D0D" strokeWidth={3} />
          </View>
        )}
      </View>
      <Text
        numberOfLines={1}
        style={{ fontSize: 11, color: selected ? gold[400] : '#9A9A9A' }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface BucketThumbnailSelectorProps {
  bucket?: any;
  hasCover?: boolean;
  thumbSelection?: 'auto' | 'cover' | 'photo';
  chosenPhotoId?: string | null;
  thumbPhotos: any[];
  theme: any;
  onChooseThumbnail: (photoId: string) => void;
}

export function BucketThumbnailSelector({
  chosenPhotoId,
  thumbPhotos,
  theme,
  onChooseThumbnail,
}: BucketThumbnailSelectorProps) {
  const { t } = useTranslation();
  if (!thumbPhotos || thumbPhotos.length === 0) return null;

  return (
    <View style={{ marginVertical: 14 }}>
      <Typography variant="caption" color={gold[400]} style={styles.subtasksLabel}>
        {t('bucket.thumbnail_title', { defaultValue: 'PORTADA' })}
      </Typography>
      <Typography variant="caption" color={theme.colors.foregroundMuted} style={{ marginTop: 2, marginBottom: 10 }}>
        {t('bucket.thumbnail_desc', { defaultValue: 'Elige la foto que se mostrará como portada de la tarea.' })}
      </Typography>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingRight: 8 }}
      >
        {thumbPhotos.map((photo: any, index: number) => {
          const isSelected = chosenPhotoId ? chosenPhotoId === photo.id : index === 0;
          return (
            <ThumbOption
              key={photo.id}
              label={t('bucket.thumbnail_photo', { number: thumbPhotos.length - index })}
              selected={isSelected}
              onPress={() => onChooseThumbnail(photo.id)}
            >
              <Image
                source={{ uri: storageApi.getPublicUrl(photo.thumb_path || photo.storage_path) }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            </ThumbOption>
          );
        })}
      </ScrollView>
    </View>
  );
}
