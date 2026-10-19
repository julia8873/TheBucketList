import React from 'react';
import { View, Text, Pressable, ScrollView, Image, StyleSheet } from 'react-native';
import { Typography, useTheme } from '@bucketlist/ui';
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
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Imagen de la tarea: ${label}`}
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
  bucket: any;
  hasCover: boolean;
  thumbSelection: 'auto' | 'cover' | 'photo';
  chosenPhotoId?: string | null;
  thumbPhotos: any[];
  theme: any;
  onChooseThumbnail: (mode: 'auto' | 'cover' | 'photo', photoId?: string) => void;
}

export function BucketThumbnailSelector({
  bucket,
  hasCover,
  thumbSelection,
  chosenPhotoId,
  thumbPhotos,
  theme,
  onChooseThumbnail,
}: BucketThumbnailSelectorProps) {
  return (
    <>
      <View style={[styles.divider, { backgroundColor: dark[400], marginTop: 20 }]} />
      <View style={styles.photosSection}>
        <Typography variant="caption" color={gold[400]} style={styles.subtasksLabel}>
          IMAGEN DE LA TAREA
        </Typography>
        <Typography variant="caption" color={theme.colors.foregroundMuted} style={{ marginTop: 4, marginBottom: 12 }}>
          Es la que verán los demás en el feed y en explorar.
        </Typography>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, paddingRight: 8 }}
        >
          <ThumbOption
            label="Automática"
            selected={thumbSelection === 'auto'}
            onPress={() => onChooseThumbnail('auto')}
          >
            <BucketCover
              value={resolveTaskImage({ ...bucket, thumbnail_mode: 'auto' }, { preferThumb: true })}
              title={bucket.title}
              categorySlug={bucket.category?.slug}
              seed={bucket.id}
              iconSize={64}
              style={StyleSheet.absoluteFill}
            />
          </ThumbOption>
          {hasCover && (
            <ThumbOption
              label="Portada"
              selected={thumbSelection === 'cover'}
              onPress={() => onChooseThumbnail('cover')}
            >
              <BucketCover
                value={bucket.cover_image}
                title={bucket.title}
                categorySlug={bucket.category?.slug}
                seed={bucket.id}
                iconSize={64}
                style={StyleSheet.absoluteFill}
              />
            </ThumbOption>
          )}
          {thumbPhotos.map((photo: any, index: number) => (
            <ThumbOption
              key={photo.id}
              label={`Foto ${thumbPhotos.length - index}`}
              selected={thumbSelection === 'photo' && chosenPhotoId === photo.id}
              onPress={() => onChooseThumbnail('photo', photo.id)}
            >
              <Image
                source={{ uri: storageApi.getPublicUrl(photo.thumb_path || photo.storage_path) }}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
              />
            </ThumbOption>
          ))}
        </ScrollView>
      </View>
    </>
  );
}
