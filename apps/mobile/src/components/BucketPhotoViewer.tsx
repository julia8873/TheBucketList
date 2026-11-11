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
  Image,
  Alert,
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
  Globe,
  Users,
  Lock,
  Crop,
} from 'lucide-react-native';
import { Typography, ConfirmDialog, fontFamily, toast } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { storageApi } from '../services/api/storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import DateTimePicker from '@react-native-community/datetimepicker';
import { UniversalDatePicker } from './UniversalDatePicker';
import { PhotoCropModal } from './PhotoCropModal';
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
  onUpdatePhotoVisibility?: (photoId: string, visibility: 'public' | 'followers' | 'private') => void;
  onRecropPhoto?: (photoId: string, croppedUri: string) => Promise<void> | void;
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
  onUpdatePhotoVisibility,
  onRecropPhoto,
  onDelete,
  selectedThumbnailId,
  onSetAsThumbnail,
}: BucketPhotoViewerProps) {
  const { t, i18n } = useTranslation();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const [isAnyPhotoZoomed, setIsAnyPhotoZoomed] = useState(false);
  const [visibilityPickerVisible, setVisibilityPickerVisible] = useState(false);
  const [datePickerState, setDatePickerState] = useState<{
    visible: boolean;
    photoId: string;
    field: 'created_at' | 'completed_at';
    date: Date;
  } | null>(null);
  const [pickerTempDate, setPickerTempDate] = useState<Date>(new Date());
  const [cropTarget, setCropTarget] = useState<{
    uri: string;
    width: number;
    height: number;
  } | null>(null);
  const [isPreparingCrop, setIsPreparingCrop] = useState(false);

  const currentPhoto = viewingPhotoIndex !== null && photos ? photos[viewingPhotoIndex] : null;

  const handleClose = useCallback(() => {
    setIsAnyPhotoZoomed(false);
    setVisibilityPickerVisible(false);
    setCropTarget(null);
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

  const handleUploadedPress = () => {
    if (!currentPhoto) return;
    if (!isOwner) {
      if (currentPhoto.created_at) {
        toast.info(t('bucket.photo_uploaded', { date: formatPhotoDate(currentPhoto.created_at, i18n.language) }));
      }
      return;
    }
    openDatePicker(currentPhoto.id, 'created_at', currentPhoto.created_at);
  };

  const handleCompletedPress = () => {
    if (!currentPhoto) return;
    if (!isOwner) {
      if (currentPhoto.completed_at) {
        toast.info(t('bucket.photo_completed', { date: formatPhotoDate(currentPhoto.completed_at, i18n.language) }));
      }
      return;
    }
    if (currentPhoto.completed_at) {
      Alert.alert(
        t('bucket.photo_completed_date') || 'Fecha completada',
        formatPhotoDate(currentPhoto.completed_at, i18n.language),
        [
          {
            text: t('bucket.photo_change_date', { defaultValue: 'Cambiar fecha' }),
            onPress: () => openDatePicker(currentPhoto.id, 'completed_at', currentPhoto.completed_at),
          },
          {
            text: t('bucket.photo_remove_completed', { defaultValue: 'Quitar fecha' }),
            style: 'destructive',
            onPress: () => onUpdatePhotoDate?.(currentPhoto.id, 'completed_at', null),
          },
          { text: t('common.cancel'), style: 'cancel' },
        ]
      );
    } else {
      openDatePicker(currentPhoto.id, 'completed_at', null);
    }
  };

  const handleStartCrop = async () => {
    if (!currentPhoto || isPreparingCrop) return;
    setIsPreparingCrop(true);
    try {
      const remoteUrl = storageApi.getPublicUrl(currentPhoto.storage_path);
      let localUri = remoteUrl;
      let imgW = currentPhoto.width || 0;
      let imgH = currentPhoto.height || 0;

      if (Platform.OS !== 'web') {
        const ext = currentPhoto.storage_path?.endsWith('.png') ? 'png' : 'jpg';
        const filename = `crop_temp_${Date.now()}.${ext}`;
        const targetPath = `${FileSystem.cacheDirectory}${filename}`;
        const downloadRes = await FileSystem.downloadAsync(remoteUrl, targetPath);
        localUri = downloadRes.uri;
      }

      if (!imgW || !imgH) {
        await new Promise<void>((resolve) => {
          Image.getSize(
            localUri,
            (w, h) => {
              imgW = w;
              imgH = h;
              resolve();
            },
            () => {
              imgW = windowWidth;
              imgH = windowHeight;
              resolve();
            }
          );
        });
      }

      setCropTarget({
        uri: localUri,
        width: imgW,
        height: imgH,
      });
    } catch (e: any) {
      toast.error(t('common.error') || 'Error al preparar la imagen para recortar');
    } finally {
      setIsPreparingCrop(false);
    }
  };

  const handleDownload = async () => {
    if (!currentPhoto || isDownloading) return;
    try {
      setIsDownloading(true);
      if (Platform.OS === 'web') {
        const url = storageApi.getPublicUrl(currentPhoto.storage_path);
        if (typeof window !== 'undefined') window.open(url, '_blank');
        setIsDownloading(false);
        return;
      }
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
                setVisibilityPickerVisible(false);
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

        {/* Cabecera superior mínima flotante: Paginación y Botón cerrar (X) */}
        {currentPhoto && (
          <View style={styles.topHeaderWrapper} pointerEvents="box-none">
            <View style={styles.topHeaderRow} pointerEvents="box-none">
              <View style={styles.topLeftContainer}>
                {photos && photos.length > 1 && (
                  <View style={styles.photoIndexBadge}>
                    <Text style={styles.photoIndexText}>
                      {(viewingPhotoIndex ?? 0) + 1}/{photos.length}
                    </Text>
                  </View>
                )}
                {!!currentPhoto.title && (
                  <View style={styles.photoTitleBadge}>
                    <Text style={styles.photoTitleBadgeText} numberOfLines={1}>
                      {currentPhoto.title}
                    </Text>
                  </View>
                )}
              </View>

              <Pressable
                style={styles.closeBtn}
                onPress={handleClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={t('bucket.photo_close_viewer')}
              >
                <X color="#FFFFFF" size={18} strokeWidth={2.4} />
              </Pressable>
            </View>
          </View>
        )}

        {/* Selector de Visibilidad de la foto */}
        {visibilityPickerVisible && currentPhoto && (
          <View style={[StyleSheet.absoluteFillObject, styles.dateModalBackdrop, { zIndex: 9999 }]}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setVisibilityPickerVisible(false)} />
            <View style={styles.visibilityModalContent}>
              <View style={styles.dateModalHeader}>
                <Typography variant="bodySemibold" color="#FFF">
                  {t('bucket.photo_visibility_title')}
                </Typography>
                <Pressable onPress={() => setVisibilityPickerVisible(false)} hitSlop={10}>
                  <X size={20} color="#8E8E93" />
                </Pressable>
              </View>

              <View style={{ marginTop: 8, gap: 8 }}>
                {[
                  {
                    key: 'public' as const,
                    icon: Globe,
                    title: t('bucket.visibility_public'),
                    desc: t('bucket.photo_visibility_public_desc'),
                    color: '#60A5FA',
                  },
                  {
                    key: 'followers' as const,
                    icon: Users,
                    title: t('bucket.visibility_followers'),
                    desc: t('bucket.photo_visibility_followers_desc'),
                    color: '#C084FC',
                  },
                  {
                    key: 'private' as const,
                    icon: Lock,
                    title: t('bucket.visibility_private'),
                    desc: t('bucket.photo_visibility_private_desc'),
                    color: '#F87171',
                  },
                ].map((opt) => {
                  const isSelected = ((currentPhoto.visibility as string) || 'public') === opt.key;
                  const Icon = opt.icon;
                  return (
                    <Pressable
                      key={opt.key}
                      onPress={() => {
                        onUpdatePhotoVisibility?.(currentPhoto.id, opt.key);
                        setVisibilityPickerVisible(false);
                      }}
                      style={[
                        styles.visibilityOptionRow,
                        isSelected && { borderColor: opt.color, backgroundColor: 'rgba(255,255,255,0.06)' },
                      ]}
                    >
                      <View style={[styles.visibilityOptionIcon, { backgroundColor: `${opt.color}18` }]}>
                        <Icon size={18} color={opt.color} strokeWidth={2.2} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.visibilityOptionTitle, isSelected && { color: opt.color, fontWeight: '700' }]}>
                          {opt.title}
                        </Text>
                        <Text style={styles.visibilityOptionDesc}>
                          {opt.desc}
                        </Text>
                      </View>
                      {isSelected && (
                        <Check size={18} color={opt.color} strokeWidth={2.5} />
                      )}
                    </Pressable>
                  );
                })}
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

        {/* Barra de acciones inferior flotante con iconos */}
        {currentPhoto && (
          <View style={styles.actionBarWrapper} pointerEvents="box-none">
            <View style={styles.actionBarDock}>
              {/* 1. Calendario (fecha de subida) */}
              <Pressable
                style={styles.dockIconBtn}
                onPress={handleUploadedPress}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={t('bucket.photo_upload_date', { defaultValue: 'Fecha de subida' })}
              >
                <Calendar color="#FFFFFF" size={20} strokeWidth={2} />
              </Pressable>

              {/* 2. Check (fecha completada) */}
              {(() => {
                const isCompleted = !!currentPhoto.completed_at;
                return (
                  <Pressable
                    style={[
                      styles.dockIconBtn,
                      isCompleted && styles.dockIconBtnCompleted,
                    ]}
                    onPress={handleCompletedPress}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={t('bucket.photo_completed_date', { defaultValue: 'Fecha completada' })}
                  >
                    <CheckCircle2
                      color={isCompleted ? '#34C759' : 'rgba(255, 255, 255, 0.65)'}
                      size={20}
                      strokeWidth={isCompleted ? 2.4 : 2}
                    />
                  </Pressable>
                );
              })()}

              {/* 3. Crop (recortar foto) */}
              {isOwner && onRecropPhoto && (
                <Pressable
                  style={styles.dockIconBtn}
                  onPress={handleStartCrop}
                  disabled={isPreparingCrop}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={t('photo_crop.title', { defaultValue: 'Recortar foto' })}
                >
                  {isPreparingCrop ? (
                    <ActivityIndicator size="small" color={gold[400]} />
                  ) : (
                    <Crop color={gold[400]} size={20} strokeWidth={2.2} />
                  )}
                </Pressable>
              )}

              {/* 4. Bola de visibilidad */}
              {(() => {
                const vis = (currentPhoto.visibility as 'public' | 'followers' | 'private') || 'public';
                const VisIcon = vis === 'private' ? Lock : vis === 'followers' ? Users : Globe;
                const visColor = vis === 'private' ? '#EF4444' : vis === 'followers' ? '#A855F7' : '#60A5FA';
                return (
                  <Pressable
                    style={[
                      styles.dockIconBtn,
                      {
                        backgroundColor: `${visColor}1A`,
                        borderColor: `${visColor}55`,
                      },
                    ]}
                    onPress={() => {
                      if (!isOwner) {
                        const label =
                          vis === 'private'
                            ? t('bucket.visibility_private')
                            : vis === 'followers'
                            ? t('bucket.visibility_followers')
                            : t('bucket.visibility_public');
                        toast.info(`${t('bucket.photo_visibility_title')}: ${label}`);
                        return;
                      }
                      setVisibilityPickerVisible(true);
                    }}
                    hitSlop={6}
                    accessibilityRole="button"
                    accessibilityLabel={t('bucket.photo_visibility_title')}
                  >
                    <VisIcon color={visColor} size={20} strokeWidth={2.2} />
                  </Pressable>
                );
              })()}

              {/* 5. Descargar */}
              <Pressable
                style={styles.dockIconBtn}
                onPress={handleDownload}
                disabled={isDownloading}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={t('bucket.photo_download')}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Download color="#FFFFFF" size={20} strokeWidth={2} />
                )}
              </Pressable>

              {/* 6. Basura (borrar foto) */}
              {isOwner && onDelete && (
                <Pressable
                  style={[styles.dockIconBtn, styles.dockIconBtnDelete]}
                  onPress={() => setDeleteConfirmVisible(true)}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel={t('bucket.photo_delete_label')}
                >
                  <Trash2 color="#F87171" size={20} strokeWidth={2} />
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Modal de recorte inline para la foto actual */}
        {cropTarget && (
          <PhotoCropModal
            inline={true}
            visible={!!cropTarget}
            uri={cropTarget.uri}
            width={cropTarget.width}
            height={cropTarget.height}
            index={viewingPhotoIndex ?? 0}
            total={photos.length}
            onCancel={() => setCropTarget(null)}
            onDone={async (croppedUri) => {
              const pid = currentPhoto?.id;
              setCropTarget(null);
              if (pid && onRecropPhoto) {
                await onRecropPhoto(pid, croppedUri);
              }
            }}
          />
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
    top: Platform.OS === 'ios' ? 52 : 32,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 20,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topLeftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 12,
  },
  photoIndexBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  photoIndexText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  photoTitleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    maxWidth: '70%',
  },
  photoTitleBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
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
    bottom: Platform.OS === 'ios' ? 36 : 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    zIndex: 20,
  },
  actionBarDock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(18, 18, 20, 0.92)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 12,
  },
  dockIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  dockIconBtnCompleted: {
    backgroundColor: 'rgba(52, 199, 89, 0.16)',
    borderColor: 'rgba(52, 199, 89, 0.45)',
  },
  dockIconBtnDelete: {
    backgroundColor: 'rgba(248, 113, 113, 0.14)',
    borderColor: 'rgba(248, 113, 113, 0.35)',
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
  visibilityModalContent: {
    backgroundColor: '#1C1C1E',
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  visibilityOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    gap: 12,
  },
  visibilityOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  visibilityOptionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fontFamily.semibold,
  },
  visibilityOptionDesc: {
    color: '#8E8E93',
    fontSize: 11,
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
});
