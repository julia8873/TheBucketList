import React, { useState } from 'react';
import {
  Modal,
  View,
  Pressable,
  FlatList,
  Image,
  Dimensions,
  Platform,
  Alert,
  StyleSheet,
  TextInput,
  Text,
} from 'react-native';
import { X, Download, Trash2, Calendar, CheckCircle2, Pencil } from 'lucide-react-native';
import { Typography } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { storageApi } from '../services/api/storage';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatPhotoDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), "d 'de' MMM yyyy", { locale: es });
  } catch {
    return new Date(dateStr).toLocaleDateString();
  }
}

type BucketPhotoViewerProps = {
  photos: any[];
  viewingPhotoIndex: number | null;
  setViewingPhotoIndex: (index: number | null) => void;
  isOwner?: boolean;
  onUpdateTitle?: (photoId: string, title: string) => void;
  onUpdatePhotoDate?: (photoId: string, field: 'created_at' | 'completed_at', date: string | null) => void;
  /** Si se pasa y el usuario puede editar, aparece el botón de borrar. Debe pedir confirmación y borrar. */
  onDelete?: (photo: any) => void;
};

export function BucketPhotoViewer({
  photos,
  viewingPhotoIndex,
  setViewingPhotoIndex,
  isOwner,
  onUpdateTitle,
  onUpdatePhotoDate,
  onDelete,
}: BucketPhotoViewerProps) {
  const [datePickerState, setDatePickerState] = useState<{
    visible: boolean;
    field: 'created_at' | 'completed_at';
    date: Date;
  } | null>(null);
  const [pickerTempDate, setPickerTempDate] = useState<Date>(new Date());

  const currentPhoto = viewingPhotoIndex !== null && photos ? photos[viewingPhotoIndex] : null;

  const openDatePicker = (field: 'created_at' | 'completed_at', initialStr?: string | null) => {
    const initialDate = initialStr ? new Date(initialStr) : new Date();
    setPickerTempDate(initialDate);
    setDatePickerState({
      visible: true,
      field,
      date: initialDate,
    });
  };

  const handleConfirmDate = () => {
    if (!datePickerState || !currentPhoto) return;
    const safeDate = new Date(pickerTempDate);
    safeDate.setHours(12, 0, 0, 0);
    onUpdatePhotoDate?.(currentPhoto.id, datePickerState.field, safeDate.toISOString());
    setDatePickerState(null);
  };

  const handleRemoveCompletedAt = (photoId: string) => {
    Alert.alert(
      'Quitar fecha de completado',
      '¿Deseas quitar la fecha de completado de esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Quitar',
          style: 'destructive',
          onPress: () => onUpdatePhotoDate?.(photoId, 'completed_at', null),
        },
      ]
    );
  };

  return (
    <Modal
      visible={viewingPhotoIndex !== null}
      transparent={true}
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent={true}
      onRequestClose={() => setViewingPhotoIndex(null)}
    >
      <View style={styles.photoViewerBackdrop}>
        {/* Botón cerrar */}
        <View style={styles.photoViewerNav}>
          <Pressable style={styles.photoViewerBtn} onPress={() => setViewingPhotoIndex(null)}>
            <X color="#fff" size={22} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Carousel de fotos */}
        {viewingPhotoIndex !== null && (
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            initialScrollIndex={viewingPhotoIndex}
            getItemLayout={(_data, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
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

        {/* Tarjeta superior con Título y Fechas editables */}
        {currentPhoto && (
          <View style={styles.headerInfoCard}>
            {isOwner ? (
              <TextInput
                placeholder="Añadir título..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                defaultValue={currentPhoto.title || ''}
                onChangeText={(text) => onUpdateTitle?.(currentPhoto.id, text)}
                style={styles.titleInput}
              />
            ) : (
              <Typography variant="bodySemibold" color="#fff" style={{ textAlign: 'left' }}>
                {currentPhoto.title || 'Sin título'}
              </Typography>
            )}

            {/* Fechas de la foto */}
            <View style={styles.datesContainer}>
              {/* Fecha de subida */}
              <Pressable
                onPress={() => isOwner && openDatePicker('created_at', currentPhoto.created_at)}
                style={styles.dateRow}
                disabled={!isOwner}
                hitSlop={6}
              >
                <Calendar size={13} color={gold[400]} strokeWidth={2} />
                <Text style={styles.dateText}>
                  Subida: {formatPhotoDate(currentPhoto.created_at)}
                </Text>
                {isOwner && <Pencil size={11} color="rgba(255,255,255,0.4)" style={{ marginLeft: 2 }} />}
              </Pressable>

              {/* Fecha en que se completó esa foto */}
              {currentPhoto.completed_at ? (
                <View style={[styles.dateRow, { justifyContent: 'space-between' }]}>
                  <Pressable
                    onPress={() => isOwner && openDatePicker('completed_at', currentPhoto.completed_at)}
                    style={styles.dateRowInner}
                    disabled={!isOwner}
                    hitSlop={6}
                  >
                    <CheckCircle2 size={13} color="#34C759" strokeWidth={2} />
                    <Text style={[styles.dateText, { color: '#34C759' }]}>
                      Completada: {formatPhotoDate(currentPhoto.completed_at)}
                    </Text>
                    {isOwner && <Pencil size={11} color="rgba(255,255,255,0.4)" style={{ marginLeft: 2 }} />}
                  </Pressable>
                  {isOwner && (
                    <Pressable
                      hitSlop={8}
                      onPress={() => handleRemoveCompletedAt(currentPhoto.id)}
                      style={styles.removeDateBtn}
                    >
                      <X size={12} color="rgba(255,255,255,0.6)" strokeWidth={2} />
                    </Pressable>
                  )}
                </View>
              ) : isOwner ? (
                <Pressable
                  onPress={() => openDatePicker('completed_at', null)}
                  style={styles.dateRow}
                  hitSlop={6}
                >
                  <CheckCircle2 size={13} color={gold[400]} strokeWidth={2} />
                  <Text style={[styles.dateText, { color: gold[400] }]}>
                    + Añadir fecha completada
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        )}

        {/* Modal de selección de fecha */}
        {datePickerState && Platform.OS === 'ios' && (
          <Modal transparent animationType="slide" visible={true} onRequestClose={() => setDatePickerState(null)}>
            <View style={styles.dateModalBackdrop}>
              <View style={styles.dateModalContent}>
                <View style={styles.dateModalHeader}>
                  <Pressable onPress={() => setDatePickerState(null)} hitSlop={10}>
                    <Typography variant="body" color="#8E8E93">Cancelar</Typography>
                  </Pressable>
                  <Typography variant="bodySemibold" color="#FFF">
                    {datePickerState.field === 'created_at' ? 'Fecha de subida' : 'Fecha completada'}
                  </Typography>
                  <Pressable onPress={handleConfirmDate} hitSlop={10}>
                    <Typography variant="bodySemibold" color={gold[400]}>Guardar</Typography>
                  </Pressable>
                </View>
                <DateTimePicker
                  value={pickerTempDate}
                  mode="date"
                  display="spinner"
                  themeVariant="dark"
                  onChange={(_event, date) => {
                    if (date) setPickerTempDate(date);
                  }}
                />
              </View>
            </View>
          </Modal>
        )}

        {datePickerState && Platform.OS !== 'ios' && (
          <DateTimePicker
            value={pickerTempDate}
            mode="date"
            display="default"
            onChange={(event, date) => {
              const field = datePickerState.field;
              setDatePickerState(null);
              if (event.type === 'set' && date) {
                const safeDate = new Date(date);
                safeDate.setHours(12, 0, 0, 0);
                if (currentPhoto) {
                  onUpdatePhotoDate?.(currentPhoto.id, field, safeDate.toISOString());
                }
              }
            }}
          />
        )}

        {/* Barra de acciones inferior: Borrar y Descargar */}
        {currentPhoto && (
          <View style={[styles.actionBar, { borderTopColor: 'transparent', position: 'absolute', bottom: 40, width: '100%', paddingHorizontal: 20, gap: 12 }]}>
            {isOwner && onDelete && (
              <Pressable
                accessibilityLabel="Borrar foto"
                style={[styles.deleteBtn]}
                onPress={() => onDelete(currentPhoto)}
              >
                <Trash2 color="#F87171" size={20} strokeWidth={2} />
              </Pressable>
            )}
            <Pressable
              style={[styles.actionBtn, styles.actionBtnFilled, { backgroundColor: gold[400] }]}
              onPress={async () => {
                try {
                  const { status } = await MediaLibrary.requestPermissionsAsync();
                  if (status !== 'granted') {
                    Alert.alert('Permiso denegado', 'Activa el permiso de galería en ajustes.');
                    return;
                  }
                  const url = storageApi.getPublicUrl(currentPhoto.storage_path);
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
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerNav: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  photoViewerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfoCard: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 32,
    left: 20,
    right: 80,
    backgroundColor: 'rgba(20, 20, 20, 0.90)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    zIndex: 10,
    justifyContent: 'center',
  },
  titleInput: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'PlayfairDisplay_700Bold',
    textAlign: 'left',
    padding: 0,
    marginBottom: 4,
  },
  datesContainer: {
    marginTop: 4,
    gap: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  removeDateBtn: {
    padding: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
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
  deleteBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.45)',
  },
  dateModalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  dateModalContent: {
    backgroundColor: '#1C1C1E',
    padding: 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
});
