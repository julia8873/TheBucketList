import React, { useState, useCallback } from 'react';
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
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { X, Download, Trash2, Calendar, CheckCircle2, Pencil } from 'lucide-react-native';
import { Typography } from '@bucketlist/ui';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { storageApi } from '../services/api/storage';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function formatPhotoDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), "d 'de' MMM yyyy", { locale: es });
  } catch {
    return new Date(dateStr).toLocaleDateString();
  }
}

interface ZoomablePhotoItemProps {
  photo: any;
  onZoomChange: (zoomed: boolean) => void;
}

function ZoomablePhotoItem({ photo, onZoomChange }: ZoomablePhotoItemProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const handleZoomChange = useCallback(
    (zoomed: boolean) => {
      setIsZoomed(zoomed);
      onZoomChange(zoomed);
    },
    [onZoomChange]
  );

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
      runOnJS(handleZoomChange)(true);
    })
    .onUpdate((e) => {
      const rawScale = savedScale.value * e.scale;
      if (rawScale < 1) {
        scale.value = 1 - (1 - rawScale) * 0.5;
      } else if (rawScale > 4) {
        scale.value = 4 + (rawScale - 4) * 0.3;
      } else {
        scale.value = rawScale;
      }
    })
    .onEnd(() => {
      if (scale.value < 1.05) {
        scale.value = withSpring(1, { damping: 18, stiffness: 150 });
        translateX.value = withSpring(0, { damping: 18, stiffness: 150 });
        translateY.value = withSpring(0, { damping: 18, stiffness: 150 });
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(handleZoomChange)(false);
      } else {
        if (scale.value > 4) {
          scale.value = withSpring(4, { damping: 18, stiffness: 150 });
          savedScale.value = 4;
        } else {
          savedScale.value = scale.value;
        }

        const maxTransX = Math.max(0, ((scale.value - 1) * SCREEN_WIDTH) / 2);
        const maxTransY = Math.max(0, ((scale.value - 1) * SCREEN_HEIGHT) / 2);

        let targetX = translateX.value;
        let targetY = translateY.value;

        if (Math.abs(targetX) > maxTransX) {
          targetX = Math.sign(targetX) * maxTransX;
          translateX.value = withSpring(targetX, { damping: 18, stiffness: 150 });
          savedTranslateX.value = targetX;
        }
        if (Math.abs(targetY) > maxTransY) {
          targetY = Math.sign(targetY) * maxTransY;
          translateY.value = withSpring(targetY, { damping: 18, stiffness: 150 });
          savedTranslateY.value = targetY;
        }

        runOnJS(handleZoomChange)(true);
      }
    });

  const panGesture = Gesture.Pan()
    .enabled(isZoomed)
    .onStart(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      const maxTransX = Math.max(0, ((scale.value - 1) * SCREEN_WIDTH) / 2);
      const maxTransY = Math.max(0, ((scale.value - 1) * SCREEN_HEIGHT) / 2);

      const nextX = savedTranslateX.value + e.translationX;
      const nextY = savedTranslateY.value + e.translationY;

      if (nextX > maxTransX) {
        translateX.value = maxTransX + (nextX - maxTransX) * 0.3;
      } else if (nextX < -maxTransX) {
        translateX.value = -maxTransX + (nextX + maxTransX) * 0.3;
      } else {
        translateX.value = nextX;
      }

      if (nextY > maxTransY) {
        translateY.value = maxTransY + (nextY - maxTransY) * 0.3;
      } else if (nextY < -maxTransY) {
        translateY.value = -maxTransY + (nextY + maxTransY) * 0.3;
      } else {
        translateY.value = nextY;
      }
    })
    .onEnd(() => {
      const maxTransX = Math.max(0, ((scale.value - 1) * SCREEN_WIDTH) / 2);
      const maxTransY = Math.max(0, ((scale.value - 1) * SCREEN_HEIGHT) / 2);

      let targetX = translateX.value;
      let targetY = translateY.value;

      if (targetX > maxTransX) {
        targetX = maxTransX;
      } else if (targetX < -maxTransX) {
        targetX = -maxTransX;
      }

      if (targetY > maxTransY) {
        targetY = maxTransY;
      } else if (targetY < -maxTransY) {
        targetY = -maxTransY;
      }

      translateX.value = withSpring(targetX, { damping: 18, stiffness: 150 });
      translateY.value = withSpring(targetY, { damping: 18, stiffness: 150 });
      savedTranslateX.value = targetX;
      savedTranslateY.value = targetY;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      if (scale.value > 1.15) {
        scale.value = withSpring(1, { damping: 18, stiffness: 150 });
        translateX.value = withSpring(0, { damping: 18, stiffness: 150 });
        translateY.value = withSpring(0, { damping: 18, stiffness: 150 });
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        runOnJS(handleZoomChange)(false);
      } else {
        scale.value = withSpring(2.5, { damping: 18, stiffness: 150 });
        savedScale.value = 2.5;
        runOnJS(handleZoomChange)(true);
      }
    });

  const composedGestures = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    doubleTapGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGestures}>
      <View
        style={{
          width: SCREEN_WIDTH,
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            {
              width: SCREEN_WIDTH,
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            },
            animatedStyle,
          ]}
        >
          <Image
            source={{ uri: storageApi.getPublicUrl(photo.storage_path) }}
            style={{ width: SCREEN_WIDTH, height: '100%' }}
            resizeMode="contain"
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
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
  const [isAnyPhotoZoomed, setIsAnyPhotoZoomed] = useState(false);
  const [datePickerState, setDatePickerState] = useState<{
    visible: boolean;
    field: 'created_at' | 'completed_at';
    date: Date;
  } | null>(null);
  const [pickerTempDate, setPickerTempDate] = useState<Date>(new Date());

  const currentPhoto = viewingPhotoIndex !== null && photos ? photos[viewingPhotoIndex] : null;

  const handleClose = useCallback(() => {
    setIsAnyPhotoZoomed(false);
    setViewingPhotoIndex(null);
  }, [setViewingPhotoIndex]);

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
      onRequestClose={handleClose}
    >
      <GestureHandlerRootView style={styles.photoViewerBackdrop}>
        {/* Carousel de fotos */}
        {viewingPhotoIndex !== null && (
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            scrollEnabled={!isAnyPhotoZoomed}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            initialScrollIndex={viewingPhotoIndex}
            getItemLayout={(_data, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setViewingPhotoIndex(newIndex);
            }}
            renderItem={({ item }) => (
              <ZoomablePhotoItem
                photo={item}
                onZoomChange={setIsAnyPhotoZoomed}
              />
            )}
          />
        )}

        {/* Cabecera superior unificada: Título de foto, X de cerrar y Fechas */}
        {currentPhoto && (
          <View style={styles.topHeaderWrapper}>
            <View style={styles.topHeaderCard}>
              {/* Fila superior: Título de la foto + Badge de paginación + Botón cerrar (X) */}
              <View style={styles.titleRow}>
                <View style={styles.titleContainer}>
                  {isOwner ? (
                    <TextInput
                      key={currentPhoto.id}
                      placeholder="Añadir título..."
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      defaultValue={currentPhoto.title || ''}
                      onChangeText={(text) => onUpdateTitle?.(currentPhoto.id, text)}
                      style={styles.titleInput}
                      maxLength={60}
                    />
                  ) : (
                    <Text style={styles.titleStaticText} numberOfLines={1}>
                      {currentPhoto.title || 'Sin título'}
                    </Text>
                  )}
                </View>

                <View style={styles.topRightActions}>
                  {photos && photos.length > 1 && (
                    <View style={styles.photoIndexBadge}>
                      <Text style={styles.photoIndexText}>
                        {(viewingPhotoIndex ?? 0) + 1}/{photos.length}
                      </Text>
                    </View>
                  )}
                  <Pressable
                    style={styles.closeBtn}
                    onPress={handleClose}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Cerrar visor"
                  >
                    <X color="#FFFFFF" size={17} strokeWidth={2.4} />
                  </Pressable>
                </View>
              </View>

              {/* Fila inferior de Fechas con diseño de Chips modernos */}
              <View style={styles.datesRow}>
                {/* Chip Fecha de subida */}
                <Pressable
                  onPress={() => isOwner && openDatePicker('created_at', currentPhoto.created_at)}
                  style={styles.dateChip}
                  disabled={!isOwner}
                  hitSlop={4}
                >
                  <Calendar size={11} color="#A0A0A0" strokeWidth={2} />
                  <Text style={styles.dateChipText}>
                    Subida: {formatPhotoDate(currentPhoto.created_at)}
                  </Text>
                  {isOwner && <Pencil size={9} color="rgba(255,255,255,0.35)" style={{ marginLeft: 2 }} />}
                </Pressable>

                {/* Chip Fecha en que se completó esa foto */}
                {currentPhoto.completed_at ? (
                  <View style={styles.completedChip}>
                    <Pressable
                      onPress={() => isOwner && openDatePicker('completed_at', currentPhoto.completed_at)}
                      style={styles.completedChipInner}
                      disabled={!isOwner}
                      hitSlop={4}
                    >
                      <CheckCircle2 size={11} color="#34C759" strokeWidth={2.2} />
                      <Text style={[styles.dateChipText, { color: '#34C759' }]}>
                        Completada: {formatPhotoDate(currentPhoto.completed_at)}
                      </Text>
                      {isOwner && <Pencil size={9} color="rgba(52, 199, 89, 0.5)" style={{ marginLeft: 2 }} />}
                    </Pressable>
                    {isOwner && (
                      <Pressable
                        hitSlop={8}
                        onPress={() => handleRemoveCompletedAt(currentPhoto.id)}
                        style={styles.removeDateXBtn}
                        accessibilityRole="button"
                        accessibilityLabel="Quitar fecha de completado"
                      >
                        <X size={10} color="rgba(255,255,255,0.7)" strokeWidth={2.4} />
                      </Pressable>
                    )}
                  </View>
                ) : isOwner ? (
                  <Pressable
                    onPress={() => openDatePicker('completed_at', null)}
                    style={styles.addCompletedChip}
                    hitSlop={4}
                  >
                    <CheckCircle2 size={11} color={gold[400]} strokeWidth={2} />
                    <Text style={[styles.dateChipText, { color: gold[400], fontWeight: '600' }]}>
                      + Fecha completada
                    </Text>
                  </Pressable>
                ) : null}
              </View>
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
      </GestureHandlerRootView>
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
  topHeaderWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 30,
    left: 16,
    right: 16,
    zIndex: 20,
  },
  topHeaderCard: {
    backgroundColor: 'rgba(18, 18, 18, 0.88)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleContainer: {
    flex: 1,
    minHeight: 32,
    justifyContent: 'center',
  },
  titleInput: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    paddingVertical: 2,
    paddingHorizontal: 0,
    letterSpacing: 0.2,
  },
  titleStaticText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.2,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoIndexBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  photoIndexText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.65)',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dateChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.82)',
  },
  completedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 8,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.25)',
  },
  completedChipInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  removeDateXBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  addCompletedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(212, 177, 58, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212, 177, 58, 0.25)',
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
