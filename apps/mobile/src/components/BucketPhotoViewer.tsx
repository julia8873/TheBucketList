import React, { useState, useCallback, useRef } from 'react';
import {
  Modal,
  View,
  Pressable,
  FlatList,
  Platform,
  StyleSheet,
  TextInput,
  Text,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {
  X,
  Download,
  Trash2,
  Calendar,
  CheckCircle2,
  Pencil,
  Check,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { Typography, ConfirmDialog, fontFamily, toast } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { storageApi } from '../services/api/storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import DateTimePicker from '@react-native-community/datetimepicker';
import { UniversalDatePicker } from './UniversalDatePicker';
import { format } from 'date-fns';
import { getDateFnsLocale } from '@/utils/dateLocale';

function formatPhotoDate(dateStr?: string | null, language?: string): string {
  if (!dateStr) return '';
  try {
    const locale = getDateFnsLocale(language);
    const pattern = language?.startsWith('en') ? "MMM d, yyyy" : "d 'de' MMM yyyy";
    return format(new Date(dateStr), pattern, { locale });
  } catch {
    return new Date(dateStr).toLocaleDateString(language);
  }
}

interface ZoomablePhotoItemProps {
  photo: any;
  viewerWidth: number;
  viewerHeight: number;
  onZoomChange: (zoomed: boolean) => void;
}

function ZoomablePhotoItem({ photo, viewerWidth, viewerHeight, onZoomChange }: ZoomablePhotoItemProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [loading, setLoading] = useState(true);

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

        const maxTransX = Math.max(0, ((scale.value - 1) * viewerWidth) / 2);
        const maxTransY = Math.max(0, ((scale.value - 1) * viewerHeight) / 2);

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
      const maxTransX = Math.max(0, ((scale.value - 1) * viewerWidth) / 2);
      const maxTransY = Math.max(0, ((scale.value - 1) * viewerHeight) / 2);

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
      const maxTransX = Math.max(0, ((scale.value - 1) * viewerWidth) / 2);
      const maxTransY = Math.max(0, ((scale.value - 1) * viewerHeight) / 2);

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

  const fullUrl = storageApi.getPublicUrl(photo.storage_path);
  const thumbUrl = storageApi.getPublicUrl(photo.thumb_path || photo.storage_path);

  return (
    <GestureDetector gesture={composedGestures}>
      <View
        style={{
          width: viewerWidth,
          height: viewerHeight,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          backgroundColor: '#000',
        }}
      >
        <Animated.View
          style={[
            {
              width: viewerWidth,
              height: viewerHeight,
              justifyContent: 'center',
              alignItems: 'center',
            },
            animatedStyle,
          ]}
        >
          <ExpoImage
            source={{ uri: fullUrl }}
            placeholder={{ uri: thumbUrl }}
            placeholderContentFit="contain"
            style={{
              width: viewerWidth,
              height: viewerHeight,
            }}
            contentFit="contain"
            cachePolicy="memory-disk"
            priority="high"
            transition={200}
            onLoadStart={() => setLoading(true)}
            onLoad={() => setLoading(false)}
            onError={() => setLoading(false)}
          />
        </Animated.View>

        {loading && (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <ActivityIndicator size="large" color={gold[400]} />
          </View>
        )}
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
  selectedThumbnailId?: string | null;
  onSetAsThumbnail?: (photoId: string) => void;
};

export function BucketPhotoViewer({
  photos,
  viewingPhotoIndex,
  setViewingPhotoIndex,
  isOwner,
  onUpdateTitle,
  onUpdatePhotoDate,
  onDelete,
  selectedThumbnailId,
  onSetAsThumbnail,
}: BucketPhotoViewerProps) {
  const { t, i18n } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const [isAnyPhotoZoomed, setIsAnyPhotoZoomed] = useState(false);
  const [datePickerState, setDatePickerState] = useState<{
    visible: boolean;
    photoId: string;
    field: 'created_at' | 'completed_at';
    date: Date;
  } | null>(null);
  const [pickerTempDate, setPickerTempDate] = useState<Date>(new Date());

  const currentPhoto = viewingPhotoIndex !== null && photos ? photos[viewingPhotoIndex] : null;

  const handleClose = useCallback(() => {
    setIsAnyPhotoZoomed(false);
    setViewingPhotoIndex(null);
  }, [setViewingPhotoIndex]);

  const openDatePicker = (photoId: string, field: 'created_at' | 'completed_at', initialStr?: string | null) => {
    const initialDate = initialStr ? new Date(initialStr) : new Date();
    setPickerTempDate(initialDate);
    setDatePickerState({
      visible: true,
      photoId,
      field,
      date: initialDate,
    });
  };

  const handleConfirmDate = () => {
    if (!datePickerState) return;
    const safeDate = new Date(pickerTempDate);
    safeDate.setHours(12, 0, 0, 0);
    const targetPhotoId = datePickerState.photoId || currentPhoto?.id;
    if (targetPhotoId) {
      onUpdatePhotoDate?.(targetPhotoId, datePickerState.field, safeDate.toISOString());
    }
    setDatePickerState(null);
  };

  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [removeCompletedConfirmId, setRemoveCompletedConfirmId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadToast, setDownloadToast] = useState<{ message: string; isError?: boolean } | null>(null);
  const downloadToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerDownloadToast = (message: string, isError = false) => {
    if (downloadToastTimer.current) clearTimeout(downloadToastTimer.current);
    setDownloadToast({ message, isError });
    downloadToastTimer.current = setTimeout(() => {
      setDownloadToast(null);
    }, 2800);
  };

  const handleRemoveCompletedAt = (photoId: string) => {
    setRemoveCompletedConfirmId(photoId);
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
            ref={flatListRef}
            data={photos}
            horizontal
            pagingEnabled
            scrollEnabled={!isAnyPhotoZoomed}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            initialScrollIndex={viewingPhotoIndex}
            getItemLayout={(_data, index) => ({
              length: windowWidth,
              offset: windowWidth * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
              }, 60);
            }}
            onMomentumScrollEnd={(e) => {
              const newIndex = Math.round(e.nativeEvent.contentOffset.x / windowWidth);
              if (newIndex >= 0 && newIndex < photos.length) {
                setViewingPhotoIndex(newIndex);
              }
            }}
            renderItem={({ item }) => (
              <ZoomablePhotoItem
                photo={item}
                viewerWidth={windowWidth}
                viewerHeight={windowHeight}
                onZoomChange={setIsAnyPhotoZoomed}
              />
            )}
            style={{ width: windowWidth, height: windowHeight }}
          />
        )}

        {/* Flechas de navegación para pantallas grandes / web o acceso rápido */}
        {photos && photos.length > 1 && (
          <>
            {viewingPhotoIndex !== null && viewingPhotoIndex > 0 && (
              <Pressable
                style={styles.arrowLeft}
                onPress={() => {
                  const prev = viewingPhotoIndex - 1;
                  flatListRef.current?.scrollToIndex({ index: prev, animated: true });
                  setViewingPhotoIndex(prev);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('bucket.photo_prev')}
                hitSlop={12}
              >
                <ChevronLeft color="#FFFFFF" size={26} strokeWidth={2.4} />
              </Pressable>
            )}
            {viewingPhotoIndex !== null && viewingPhotoIndex < photos.length - 1 && (
              <Pressable
                style={styles.arrowRight}
                onPress={() => {
                  const next = viewingPhotoIndex + 1;
                  flatListRef.current?.scrollToIndex({ index: next, animated: true });
                  setViewingPhotoIndex(next);
                }}
                accessibilityRole="button"
                accessibilityLabel={t('bucket.photo_next')}
                hitSlop={12}
              >
                <ChevronRight color="#FFFFFF" size={26} strokeWidth={2.4} />
              </Pressable>
            )}
          </>
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
                      placeholder={t('bucket.photo_add_title')}
                      placeholderTextColor="rgba(255, 255, 255, 0.4)"
                      defaultValue={currentPhoto.title || ''}
                      onChangeText={(text) => onUpdateTitle?.(currentPhoto.id, text)}
                      style={styles.titleInput}
                      maxLength={60}
                    />
                  ) : (
                    <Text style={styles.titleStaticText} numberOfLines={1}>
                      {currentPhoto.title || t('bucket.photo_untitled')}
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
                    accessibilityLabel={t('bucket.photo_close_viewer')}
                  >
                    <X color="#FFFFFF" size={17} strokeWidth={2.4} />
                  </Pressable>
                </View>
              </View>

              {/* Fila inferior de Fechas con diseño de Chips modernos */}
              <View style={styles.datesRow}>
                {/* Chip Fecha de subida */}
                <Pressable
                  onPress={() => isOwner && openDatePicker(currentPhoto.id, 'created_at', currentPhoto.created_at)}
                  style={styles.dateChip}
                  disabled={!isOwner}
                  hitSlop={4}
                >
                  <Calendar size={11} color="#A0A0A0" strokeWidth={2} />
                  <Text style={styles.dateChipText}>
                    {t('bucket.photo_uploaded', { date: formatPhotoDate(currentPhoto.created_at, i18n.language) })}
                  </Text>
                  {isOwner && <Pencil size={9} color="rgba(255,255,255,0.35)" style={{ marginLeft: 2 }} />}
                </Pressable>

                {/* Chip Fecha en que se completó esa foto */}
                {currentPhoto.completed_at ? (
                  <View style={styles.completedChip}>
                    <Pressable
                      onPress={() => isOwner && openDatePicker(currentPhoto.id, 'completed_at', currentPhoto.completed_at)}
                      style={styles.completedChipInner}
                      disabled={!isOwner}
                      hitSlop={4}
                    >
                      <CheckCircle2 size={11} color="#34C759" strokeWidth={2.2} />
                      <Text style={[styles.dateChipText, { color: '#34C759' }]}>
                        {t('bucket.photo_completed', { date: formatPhotoDate(currentPhoto.completed_at, i18n.language) })}
                      </Text>
                      {isOwner && <Pencil size={9} color="rgba(52, 199, 89, 0.5)" style={{ marginLeft: 2 }} />}
                    </Pressable>
                    {isOwner && (
                      <Pressable
                        hitSlop={8}
                        onPress={() => handleRemoveCompletedAt(currentPhoto.id)}
                        style={styles.removeDateXBtn}
                        accessibilityRole="button"
                        accessibilityLabel={t('bucket.photo_remove_completed')}
                      >
                        <X size={10} color="rgba(255,255,255,0.7)" strokeWidth={2.4} />
                      </Pressable>
                    )}
                  </View>
                ) : isOwner ? (
                  <Pressable
                    onPress={() => openDatePicker(currentPhoto.id, 'completed_at', null)}
                    style={styles.addCompletedChip}
                    hitSlop={4}
                  >
                    <CheckCircle2 size={11} color={gold[400]} strokeWidth={2} />
                    <Text style={[styles.dateChipText, { color: gold[400], fontWeight: '600' }]}>
                      {t('bucket.photo_add_completed')}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        )}

        {/* Selector de fecha (inline overlay en iOS para evitar conflictos de Modal anidado) */}
        {datePickerState && Platform.OS === 'ios' && (
          <View style={[StyleSheet.absoluteFillObject, styles.dateModalBackdrop, { zIndex: 9999 }]}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setDatePickerState(null)} />
            <View style={styles.dateModalContent}>
              <View style={styles.dateModalHeader}>
                <Pressable onPress={() => setDatePickerState(null)} hitSlop={10}>
                  <Typography variant="body" color="#8E8E93">{t('common.cancel')}</Typography>
                </Pressable>
                <Typography variant="bodySemibold" color="#FFF">
                  {datePickerState.field === 'created_at' ? t('bucket.photo_upload_date') : t('bucket.photo_completed_date')}
                </Typography>
                <Pressable onPress={handleConfirmDate} hitSlop={10}>
                  <Typography variant="bodySemibold" color={gold[400]}>{t('common.save')}</Typography>
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
        )}

        {datePickerState && Platform.OS !== 'ios' && (
          <UniversalDatePicker
            value={pickerTempDate}
            onChange={(date) => {
              const { field, photoId } = datePickerState;
              setDatePickerState(null);
              if (date) {
                const safeDate = new Date(date);
                safeDate.setHours(12, 0, 0, 0);
                const targetPhotoId = photoId || currentPhoto?.id;
                if (targetPhotoId) {
                  onUpdatePhotoDate?.(targetPhotoId, field, safeDate.toISOString());
                }
              }
            }}
            onClose={() => setDatePickerState(null)}
          />
        )}

        {/* Barra de acciones inferior: Borrar y Descargar */}
        {currentPhoto && (
          <View style={styles.actionBarWrapper}>
            <View style={styles.actionBarInner}>
              {isOwner && onDelete && (
                <Pressable
                  accessibilityLabel={t('bucket.photo_delete_label')}
                  style={styles.deleteBtn}
                  unstable_pressDelay={0}
                  hitSlop={8}
                  onPress={() => setDeleteConfirmVisible(true)}
                >
                  <Trash2 color="#F87171" size={20} strokeWidth={2} />
                </Pressable>
              )}
              <Pressable
                style={[
                  styles.actionBtn,
                  styles.actionBtnFilled,
                  { backgroundColor: gold[400] },
                  isDownloading && { opacity: 0.75 },
                ]}
                disabled={isDownloading}
                onPress={async () => {
                  if (isDownloading) return;
                  try {
                    setIsDownloading(true);
                    triggerDownloadToast(t('bucket.photo_downloading', { defaultValue: 'Descargando foto...' }));
                    const { status } = await MediaLibrary.requestPermissionsAsync(true);
                    if (status !== 'granted') {
                      setIsDownloading(false);
                      triggerDownloadToast(t('bucket.photo_download_permission'), true);
                      return;
                    }
                    const url = storageApi.getPublicUrl(currentPhoto.storage_path);
                    const filename = url.split('/').pop() ?? 'foto.jpg';
                    const localUri = FileSystem.cacheDirectory + filename;
                    await FileSystem.downloadAsync(url, localUri);
                    await MediaLibrary.saveToLibraryAsync(localUri);
                    setIsDownloading(false);
                    triggerDownloadToast(t('bucket.photo_download_saved'));
                    toast.success(t('bucket.photo_download_saved'));
                  } catch {
                    setIsDownloading(false);
                    triggerDownloadToast(t('bucket.photo_download_error'), true);
                    toast.error(t('bucket.photo_download_error'));
                  }
                }}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Download color="#000" size={18} strokeWidth={2} />
                )}
                <Typography variant="bodySemibold" color="#000" style={{ marginLeft: 8 }}>
                  {isDownloading
                    ? t('bucket.photo_downloading', { defaultValue: 'Descargando...' })
                    : t('bucket.photo_download')}
                </Typography>
              </Pressable>
            </View>
          </View>
        )}

        {/* Diálogo / Toast flotante dentro del visor (visible sin cerrar la foto) */}
        {downloadToast && (
          <View style={styles.viewerToastOverlay} pointerEvents="none">
            <View
              style={[
                styles.viewerToastPill,
                downloadToast.isError && { borderColor: 'rgba(248,113,113,0.5)' },
              ]}
            >
              {downloadToast.isError ? (
                <AlertCircle size={16} color="#F87171" strokeWidth={2.2} />
              ) : (
                <Check size={16} color={gold[400]} strokeWidth={2.5} />
              )}
              <Text style={styles.viewerToastText}>{downloadToast.message}</Text>
            </View>
          </View>
        )}

        {/* Diálogos de confirmación */}
        {deleteConfirmVisible && currentPhoto && (
          <ConfirmDialog
            visible={true}
            inline={true}
            title={t('bucket.photo_delete_confirm_title')}
            message={t('bucket.photo_delete_confirm_desc')}
            confirmLabel={t('bucket.photo_delete_label')}
            cancelLabel={t('common.cancel')}
            destructive={true}
            onConfirm={() => {
              const photoToDelete = currentPhoto;
              setDeleteConfirmVisible(false);
              onDelete?.(photoToDelete);
            }}
            onCancel={() => setDeleteConfirmVisible(false)}
          />
        )}

        {removeCompletedConfirmId && (
          <ConfirmDialog
            visible={true}
            inline={true}
            title={t('bucket.photo_remove_completed_confirm_title')}
            message={t('bucket.photo_remove_completed_confirm_desc')}
            confirmLabel={t('common.delete', 'Eliminar')}
            cancelLabel={t('common.cancel')}
            destructive={true}
            onConfirm={() => {
              const pid = removeCompletedConfirmId;
              setRemoveCompletedConfirmId(null);
              onUpdatePhotoDate?.(pid, 'completed_at', null);
            }}
            onCancel={() => setRemoveCompletedConfirmId(null)}
          />
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
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 20,
  },
  topHeaderCard: {
    width: '100%',
    maxWidth: 580,
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
  arrowLeft: {
    position: 'absolute',
    left: 16,
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
  },
  arrowRight: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
  },
  actionBarWrapper: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 20,
  },
  actionBarInner: {
    width: '100%',
    maxWidth: 580,
    flexDirection: 'row',
    gap: 12,
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
  viewerToastOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 90,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    elevation: 99999,
  },
  viewerToastPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E20',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.4)',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  viewerToastText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: fontFamily.semibold,
  },
});
