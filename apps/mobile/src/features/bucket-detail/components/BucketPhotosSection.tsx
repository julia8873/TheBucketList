import React from 'react';
import { View, Pressable, TextInput, Image, Dimensions } from 'react-native';
import { Typography } from '@bucketlist/ui';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';
import { Camera, ArrowDown, ArrowUp, GripVertical } from 'lucide-react-native';
import { DraggableTaskList } from '@/components/DraggableTaskList';
import { storageApi } from '@/services/api/storage';
import { styles } from '../styles/bucket-detail.styles';
import type { PhotoSortField, PhotoSortDir } from './PhotoSortModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
}: BucketPhotosSectionProps) {
  if (!bucket.bucket_photos?.length && !canEdit) return null;

  return (
    <>
      <View style={[styles.divider, { backgroundColor: dark[400], marginTop: 20 }]} />
      <View style={styles.photosSection}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Typography variant="caption" color={gold[400]} style={styles.subtasksLabel}>
            FOTOS{bucket.bucket_photos?.length > 0 ? ` · ${bucket.bucket_photos?.length}` : ''}
          </Typography>
          {bucket.bucket_photos?.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Typography variant="caption" color={theme.colors.foregroundMuted}>
                Ordenar por:
              </Typography>
              <Pressable
                ref={sortTriggerRef}
                collapsable={false}
                onPress={openSortMenu}
                hitSlop={8}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Typography variant="caption" color={gold[400]}>
                  {photoSortField === 'date' ? 'Fecha' : photoSortField === 'title' ? 'Nombre' : 'Manual'}
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
            placeholder="Buscar foto..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={photoSearchQuery}
            onChangeText={setPhotoSearchQuery}
            style={{
              backgroundColor: dark[400],
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 10,
              color: '#FFF',
              marginBottom: 16,
            }}
          />
        )}

        {photoSortField === 'manual' && canEdit && photos.length > 1 && !photoSearchQuery.trim() ? (
          <>
            <Typography variant="caption" color={theme.colors.foregroundMuted} style={{ marginBottom: 10 }}>
              Arrastra el asa para cambiar el orden de las fotos.
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
                    backgroundColor: dark[300],
                    borderWidth: 1,
                    borderColor: drag.isActive ? gold[400] : dark[400],
                    gap: 12,
                  }}
                >
                  <Pressable
                    onPress={() => setViewingPhotoIndex(photos.findIndex((p: any) => p.id === photo.id))}
                    style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', backgroundColor: dark[400] }}
                  >
                    <Image
                      source={{ uri: storageApi.getPublicUrl(photo.thumb_path || photo.storage_path) }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <Typography variant="bodySemibold" color="#fff" numberOfLines={1}>
                      {photo.title || 'Sin título'}
                    </Typography>
                    <Typography variant="caption" color={theme.colors.foregroundMuted}>
                      Subida: {photo.created_at ? new Date(photo.created_at).toLocaleDateString() : ''}
                      {photo.completed_at ? ` · Completada: ${new Date(photo.completed_at).toLocaleDateString()}` : ''}
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
              style={[styles.photoAddThumb, { width: '100%', height: 64, flexDirection: 'row' }]}
              onPress={() => void pickAndUploadPhotos()}
            >
              <Camera color={gold[400]} size={22} strokeWidth={1.8} />
              <Typography variant="bodySemibold" color={gold[400]} style={{ marginLeft: 10 }}>
                Añadir foto
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
                  photos.length === 1 && { width: '100%', height: (SCREEN_WIDTH - 40) * 1.25, marginBottom: 40 },
                ]}
              >
                <Image
                  source={{ uri: storageApi.getPublicUrl(photo.storage_path) }}
                  style={styles.photoThumbImage}
                  resizeMode="cover"
                />
                <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6 }}>
                  <Typography variant="caption" color="#fff" numberOfLines={1}>
                    {photo.title || 'Sin título'}
                  </Typography>
                  <Typography variant="caption" color="rgba(255,255,255,0.7)">
                    {photo.completed_at
                      ? `Completada: ${new Date(photo.completed_at).toLocaleDateString()}`
                      : (photo.created_at ? `Subida: ${new Date(photo.created_at).toLocaleDateString()}` : '')}
                  </Typography>
                </View>
              </Pressable>
            ))}
            {canEdit && (
              <Pressable
                style={[
                  styles.photoAddThumb,
                  photos.length === 0 && { width: '100%', height: 72, flexDirection: 'row' },
                ]}
                onPress={() => void pickAndUploadPhotos()}
              >
                <Camera color={gold[400]} size={24} strokeWidth={1.8} />
                {photos.length === 0 && (
                  <Typography variant="bodySemibold" color={gold[400]} style={{ marginLeft: 10 }}>
                    Añadir foto
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
