import React from 'react';
import { Modal, View, Pressable, FlatList, Image, Dimensions, Platform, Alert, StyleSheet } from 'react-native';
import { X, Download } from 'lucide-react-native';
import { Typography } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { storageApi } from '../services/api/storage';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type BucketPhotoViewerProps = {
  photos: any[];
  viewingPhotoIndex: number | null;
  setViewingPhotoIndex: (index: number | null) => void;
};

export function BucketPhotoViewer({ photos, viewingPhotoIndex, setViewingPhotoIndex }: BucketPhotoViewerProps) {
  return (
    <Modal
      visible={viewingPhotoIndex !== null}
      transparent
      animationType="fade"
      onRequestClose={() => setViewingPhotoIndex(null)}
    >
      <View style={styles.photoViewerBackdrop}>
        <View style={styles.photoViewerNav}>
          <Pressable style={styles.photoViewerBtn} onPress={() => setViewingPhotoIndex(null)}>
            <X color="#fff" size={22} strokeWidth={2} />
          </Pressable>
        </View>

        {viewingPhotoIndex !== null && (
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            initialScrollIndex={viewingPhotoIndex}
            getItemLayout={(data, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setViewingPhotoIndex(newIndex);
            }}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_WIDTH, height: '100%', justifyContent: 'center' }}>
                <Image
                  source={{ uri: storageApi.getPublicUrl(item.storage_path) }}
                  style={{ width: SCREEN_WIDTH, height: '100%' }}
                  resizeMode="contain"
                />
              </View>
            )}
          />
        )}

        {viewingPhotoIndex !== null && photos[viewingPhotoIndex] && (
          <View style={[styles.actionBar, { borderTopColor: 'transparent', position: 'absolute', bottom: 40, width: '100%', paddingHorizontal: 20 }]}>
            <Pressable
              style={[styles.actionBtn, styles.actionBtnFilled, { backgroundColor: gold[400] }]}
              onPress={async () => {
                try {
                  const { status } = await MediaLibrary.requestPermissionsAsync();
                  if (status !== 'granted') {
                    Alert.alert('Permiso denegado', 'Activa el permiso de galería en ajustes.');
                    return;
                  }
                  const url = storageApi.getPublicUrl(photos[viewingPhotoIndex].storage_path);
                  const filename = url.split('/').pop() ?? 'foto.jpg';
                  const localUri = FileSystem.cacheDirectory + filename;
                  await FileSystem.downloadAsync(url, localUri);
                  await MediaLibrary.saveToLibraryAsync(localUri);
                  Alert.alert('Guardada', 'La foto se ha guardado en tu galería.');
                } catch {
                  Alert.alert('Error', 'No se pudo descargar la foto.');
                }
              }}
            >
              <Download color="#000" size={18} strokeWidth={2} />
              <Typography variant="bodySemibold" color="#000" style={{ marginLeft: 8 }}>
                Descargar
              </Typography>
            </Pressable>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  photoViewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerNav: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  photoViewerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBar: {
    flexDirection: 'row',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnFilled: {},
});
