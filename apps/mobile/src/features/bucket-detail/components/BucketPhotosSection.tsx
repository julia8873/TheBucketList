import React from 'react';
import { View, Pressable, TextInput, useWindowDimensions, Platform } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Typography } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';
import { Camera, ArrowDown, ArrowUp, GripVertical } from 'lucide-react-native';
import { DraggableTaskList } from '@/components/DraggableTaskList';
import { storageApi } from '@/services/api/storage';
import { styles } from '../styles/bucket-detail.styles';
import type { PhotoSortField, PhotoSortDir } from './PhotoSortModal';

interface BucketPhotosSectionProps {
  bucket: any;
  photos: any[];
  canEdit: boolean;
  theme: any;
  photoSortField: PhotoSortField;
  photoSortDir: PhotoSortDir;
  sortTriggerRef: any;
  openSortMenu: () => void;
  photoSearchQuery: string;
  setPhotoSearchQuery: (query: string) => void;
  setScrollEnabled: (enabled: boolean) => void;
  persistPhotoOrder: (ids: string[]) => Promise<void> | void;
  setViewingPhotoIndex: (index: number) => void;
  pickAndUploadPhotos: () => Promise<void> | void;
  onOpenAddPhotoSheet?: () => void;
}

export function BucketPhotosSection({
  bucket,
  photos,
  canEdit,
  theme,
  photoSortField,
  photoSortDir,
  sortTriggerRef,
  openSortMenu,
  photoSearchQuery,
  setPhotoSearchQuery,
  setScrollEnabled,
  persistPhotoOrder,
  setViewingPhotoIndex,
  pickAndUploadPhotos,
  onOpenAddPhotoSheet,
}: BucketPhotosSectionProps) {
  const { t, i18n } = useTranslation();
  const { width: windowWidth } = useWindowDimensions();
  const containerWidth = Platform.OS === 'web' ? Math.min(windowWidth, 620) - 40 : windowWidth - 40;
  const thumbWidth = Math.max(120, Math.floor((containerWidth - 10) / 2));
  const thumbHeight = Math.floor(thumbWidth * 1.25);

  if (!bucket.bucket_photos?.length && !canEdit) return null;

  return (
    <>
      <View style={[styles.divider, { backgroundColor: theme.colors.border, marginTop: 20 }]} />
      <View style={styles.photosSection}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Typography variant="caption" color={gold[400]} style={styles.subtasksLabel}>
            {t('bucket.photos_title')}{bucket.bucket_photos?.length > 0 ? ` · ${bucket.bucket_photos?.length}` : ''}
          </Typography>
          {bucket.bucket_photos?.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Typography variant="caption" color={theme.colors.foregroundMuted}>
                {t('bucket.sort_by')}
              </Typography>
              <Pressable
                ref={sortTriggerRef}
                collapsable={false}
                onPress={openSortMenu}
                hitSlop={8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Typography variant="caption" color={gold[400]}>
                  {photoSortField === 'date' ? t('bucket.sort_date') : photoSortField === 'title' ? t('bucket.sort_title') : t('bucket.sort_manual')}
                </Typography>
                {photoSortField === 'manual' ? null : photoSortDir === 'desc' ? (
                  <ArrowDown color={gold[400]} size={14} />
                ) : (
                  <ArrowUp color={gold[400]} size={14} />
                )}
              </Pressable>
            </View>
          )}
        </View>

        {bucket.bucket_photos?.length > 0 && (
          <TextInput
            placeholder={t('bucket.search_photos')}
            placeholderTextColor={theme.colors.foregroundMuted}
            value={photoSearchQuery}
            onChangeText={setPhotoSearchQuery}
            style={{
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 10,
              color: theme.colors.foreground,
              marginBottom: 16,
            }}
          />
        )}

        {photoSortField === 'manual' && canEdit && photos.length > 1 && !photoSearchQuery.trim() ? (
          <>
            <Typography variant="caption" color={theme.colors.foregroundMuted} style={{ marginBottom: 10 }}>
              {t('bucket.drag_photos_hint')}
            </Typography>
            <DraggableTaskList
              items={photos}
              onReorder={(ids) => void persistPhotoOrder(ids)}
              onDraggingChange={(dragging) => setScrollEnabled(!dragging)}
              renderItem={(photo, drag) => (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    height: 72,
                    padding: 8,
                    borderRadius: 14,
                    backgroundColor: theme.colors.surface,
                    borderWidth: 1,
                    borderColor: drag.isActive ? gold[400] : theme.colors.border,
                    gap: 12,
                  }}
                >
                  <Pressable
                    onPress={() => setViewingPhotoIndex(photos.findIndex((p: any) => p.id === photo.id))}
                    style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', backgroundColor: theme.colors.surfaceSunken }}
                  >
                    <ExpoImage
                      source={{ uri: storageApi.getPublicUrl(photo.thumb_path || photo.storage_path) }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                      transition={150}
                      cachePolicy="memory-disk"
                    />
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Typography variant="bodySemibold" color={theme.colors.foreground} numberOfLines={1}>
                      {photo.title || t('bucket.photo_untitled')}
                    </Typography>
                    <Typography variant="caption" color={theme.colors.foregroundMuted}>
                      {photo.created_at ? t('bucket.photo_uploaded', { date: new Date(photo.created_at).toLocaleDateString(i18n.language) }) : ''}
                      {photo.completed_at ? ` · ${t('bucket.photo_completed', { date: new Date(photo.completed_at).toLocaleDateString(i18n.language) })}` : ''}
                    </Typography>
                  </View>
                  <View
                    {...drag.panHandlers}
                    hitSlop={10}
                    style={{ width: 44, height: 56, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <GripVertical color={gold[400]} size={22} strokeWidth={2} />
                  </View>
                </View>
              )}
            />
            <View style={{ height: 14 }} />
            <Pressable
              style={[styles.photoAddThumb, { width: '100%', height: 60, flexDirection: 'row' }]}
              onPress={() => onOpenAddPhotoSheet ? onOpenAddPhotoSheet() : void pickAndUploadPhotos()}
            >
              <Camera color={gold[400]} size={22} strokeWidth={1.8} />
              <Typography variant="bodySemibold" color={gold[400]} style={{ marginLeft: 10 }}>
                {t('bucket.add_photo')}
              </Typography>
            </Pressable>
          </>
        ) : (
          <View style={styles.photosGrid}>
            {photos.map((photo, index) => (
              <Pressable
                key={photo.id}
                onPress={() => setViewingPhotoIndex(index)}
                style={[
                  styles.photoThumb,
                  photos.length === 1 && !canEdit
                    ? {
                        width: '100%',
                        height: Math.min(Math.round(containerWidth * 0.65), 300),
                        marginBottom: 12,
                      }
                    : Platform.select({
                        web: {
                          width: 'calc(50% - 6px)',
                          aspectRatio: 1 / 1.25,
                        } as any,
                        default: {
                          width: thumbWidth,
                          height: thumbHeight,
                        },
                      }),
                ]}
              >
                <ExpoImage
                  source={{ uri: storageApi.getPublicUrl(photo.thumb_path || photo.storage_path) }}
                  style={styles.photoThumbImage}
                  contentFit="cover"
                  transition={200}
                  cachePolicy="memory-disk"
                />
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6 }}>
                  <Typography variant="caption" color="#fff" numberOfLines={1}>
                    {photo.title || t('bucket.photo_untitled')}
                  </Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.7)">
                    {photo.completed_at
                      ? t('bucket.photo_completed', { date: new Date(photo.completed_at).toLocaleDateString(i18n.language) })
                      : (photo.created_at ? t('bucket.photo_uploaded', { date: new Date(photo.created_at).toLocaleDateString(i18n.language) }) : '')}
                  </Typography>
                </View>
              </Pressable>
            ))}
            {canEdit && (
              <Pressable
                style={[
                  styles.photoAddThumb,
                  photos.length === 0
                    ? { width: '100%', height: 72, flexDirection: 'row' }
                    : Platform.select({
                        web: {
                          width: 'calc(50% - 6px)',
                          aspectRatio: 1 / 1.25,
                        } as any,
                        default: {
                          width: thumbWidth,
                          height: thumbHeight,
                        },
                      }),
                ]}
                onPress={() => onOpenAddPhotoSheet ? onOpenAddPhotoSheet() : void pickAndUploadPhotos()}
              >
                <Camera color={gold[400]} size={24} strokeWidth={1.8} />
                {photos.length === 0 && (
                  <Typography variant="bodySemibold" color={gold[400]} style={{ marginLeft: 10 }}>
                    {t('bucket.add_photo')}
                  </Typography>
                )}
              </Pressable>
            )}
          </View>
        )}
      </View>
    </>
  );
}
