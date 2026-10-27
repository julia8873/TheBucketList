import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  FlatList,
  ScrollView,
  PanResponder,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  MapPin,
  X,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Layers,
  LayoutList,
  LayoutGrid,
  AlignJustify,
  Maximize2,
  Minimize2,
} from 'lucide-react-native';
import { gold, useTheme } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { BucketCover } from '../../../components/BucketCover';
import { resolveTaskImage } from '../../../utils/taskImage';
import type { MapTaskItem } from '../types';

export type PreviewViewMode = 'card' | 'gallery' | 'compact';

interface TaskMapPreviewCardProps {
  task: MapTaskItem | null;
  tasksAtLocation?: MapTaskItem[];
  onSelectTask?: (task: MapTaskItem) => void;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 440);

export function TaskMapPreviewCard({
  task,
  tasksAtLocation,
  onSelectTask,
  onClose,
}: TaskMapPreviewCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();

  const flatListRef = useRef<FlatList<MapTaskItem> | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState<PreviewViewMode>('card');
  const [isExpanded, setIsExpanded] = useState(false);

  const items = tasksAtLocation && tasksAtLocation.length > 0 ? tasksAtLocation : (task ? [task] : []);

  // Gestor de deslizamiento hacia arriba para pantalla completa
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 12;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -30) {
          // Deslizado hacia arriba -> pantalla completa
          setIsExpanded(true);
        } else if (gestureState.dy > 30) {
          // Deslizado hacia abajo -> minimizar o cerrar
          if (isExpanded) {
            setIsExpanded(false);
          } else {
            onClose();
          }
        }
      },
    })
  ).current;

  // Sincronizar índice visible cuando la tarea seleccionada cambia desde fuera
  useEffect(() => {
    if (task && items.length > 0) {
      const idx = items.findIndex((t) => t.id === task.id);
      if (idx >= 0 && idx !== currentIndex) {
        setCurrentIndex(idx);
        try {
          flatListRef.current?.scrollToIndex({ index: idx, animated: true });
        } catch {}
      }
    }
  }, [task?.id, items.length]);

  if (!task || items.length === 0) return null;

  const handlePrev = () => {
    if (currentIndex > 0) {
      const newIdx = currentIndex - 1;
      setCurrentIndex(newIdx);
      try {
        flatListRef.current?.scrollToIndex({ index: newIdx, animated: true });
      } catch {}
      const target = items[newIdx];
      if (target) {
        onSelectTask?.(target);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      const newIdx = currentIndex + 1;
      setCurrentIndex(newIdx);
      try {
        flatListRef.current?.scrollToIndex({ index: newIdx, animated: true });
      } catch {}
      const target = items[newIdx];
      if (target) {
        onSelectTask?.(target);
      }
    }
  };

  const handleOpenTask = (targetTask: MapTaskItem) => {
    router.push(`/bucket/${targetTask.id}` as any);
  };

  const handleSelectFromList = (targetTask: MapTaskItem) => {
    onSelectTask?.(targetTask);
    const idx = items.findIndex((t) => t.id === targetTask.id);
    if (idx >= 0) setCurrentIndex(idx);
  };

  // Agrupar elementos en pares de 2 para garantizar 2 columnas exactas sin bugs de flexWrap
  const galleryRows: MapTaskItem[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    galleryRows.push(items.slice(i, i + 2));
  }

  const locationTitle = task.location_text
    ? task.location_text.split(',')[0]?.trim() || 'Ubicación'
    : 'Ubicación';

  // Si está expandido en pantalla completa
  if (isExpanded) {
    return (
      <View
        style={[
          styles.expandedOverlay,
          {
            top: Math.max(insets.top + 6, 36),
            bottom: Math.max(insets.bottom + 6, 16),
          },
        ]}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.expandedPanel,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Tirador de arrastre para deslizar hacia abajo */}
          <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
            <View
              style={[
                styles.dragHandleBar,
                { backgroundColor: theme.colors.border },
              ]}
            />
          </View>

          {/* Cabecera de pantalla completa */}
          <View style={styles.expandedHeaderRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={styles.expandedTitleRow}>
                <MapPin size={15} color={gold[400]} />
                <Text
                  numberOfLines={1}
                  style={[styles.expandedTitle, { color: theme.colors.foreground }]}
                >
                  {locationTitle}
                </Text>
              </View>
              <Text style={[styles.expandedSubtitle, { color: theme.colors.foregroundMuted }]}>
                {items.length} {items.length === 1 ? t('map.task_single') : t('map.tasks_in_zone')}
              </Text>
            </View>

            {/* Selector de modo y botones */}
            <View style={styles.expandedControls}>
              {/* Conmutador de 3 modos */}
              <View
                style={[
                  styles.viewModeToggle,
                  { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.border },
                ]}
              >
                <Pressable
                  onPress={() => setViewMode('card')}
                  style={[styles.viewModeBtn, viewMode === 'card' && styles.viewModeBtnActive]}
                  hitSlop={4}
                  accessibilityLabel={t('map.view_card')}
                >
                  <LayoutList
                    size={14}
                    color={viewMode === 'card' ? '#000000' : theme.colors.foregroundMuted}
                  />
                </Pressable>
                <Pressable
                  onPress={() => setViewMode('gallery')}
                  style={[styles.viewModeBtn, viewMode === 'gallery' && styles.viewModeBtnActive]}
                  hitSlop={4}
                  accessibilityLabel={t('map.view_gallery')}
                >
                  <LayoutGrid
                    size={14}
                    color={viewMode === 'gallery' ? '#000000' : theme.colors.foregroundMuted}
                  />
                </Pressable>
                <Pressable
                  onPress={() => setViewMode('compact')}
                  style={[styles.viewModeBtn, viewMode === 'compact' && styles.viewModeBtnActive]}
                  hitSlop={4}
                  accessibilityLabel={t('map.view_compact')}
                >
                  <AlignJustify
                    size={14}
                    color={viewMode === 'compact' ? '#000000' : theme.colors.foregroundMuted}
                  />
                </Pressable>
              </View>

              {/* Botón minimizar / colapsar a flotante */}
              <Pressable
                hitSlop={8}
                onPress={() => setIsExpanded(false)}
                style={[
                  styles.iconActionBtn,
                  { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.border },
                ]}
                accessibilityLabel={t('map.minimize_card')}
              >
                <Minimize2 size={16} color={theme.colors.foreground} />
              </Pressable>

              {/* Botón cerrar */}
              <Pressable
                hitSlop={8}
                onPress={onClose}
                style={[
                  styles.iconActionBtn,
                  { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.border },
                ]}
                accessibilityLabel={t('map.close_view')}
              >
                <X size={16} color={theme.colors.foregroundMuted} />
              </Pressable>
            </View>
          </View>

          {/* CONTENIDO EXPANDIDO SEGÚN MODO */}
          {/* A. Galería en 2 columnas completa */}
          {viewMode === 'gallery' && (
            <ScrollView
              style={{ flex: 1, marginTop: 10 }}
              contentContainerStyle={styles.galleryContentContainer}
              showsVerticalScrollIndicator={true}
            >
              {galleryRows.map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.galleryRow}>
                  {row.map((item) => {
                    const isSelected = item.id === task?.id;
                    const isDone = item.status === 'completed';
                    const authorName = item.user?.display_name || item.user?.username || t('map.default_user');

                    return (
                      <Pressable
                        key={item.id}
                        style={[
                          styles.galleryCard,
                          {
                            borderColor: isSelected ? gold[400] : theme.colors.border,
                            borderWidth: isSelected ? 2 : 1,
                          },
                        ]}
                        onPress={() => {
                          handleSelectFromList(item);
                          handleOpenTask(item);
                        }}
                      >
                        <BucketCover
                          value={resolveTaskImage(item, { preferThumb: true })}
                          title={item.title}
                          categorySlug={item.category?.slug}
                          seed={item.id}
                          iconSize={36}
                          style={StyleSheet.absoluteFill}
                        />

                        {isDone && (
                          <View style={styles.galleryDoneBadge}>
                            <Check size={11} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        )}

                        <View style={styles.galleryOverlay}>
                          <Text numberOfLines={2} style={styles.galleryCardTitle}>
                            {item.title}
                          </Text>
                          <Text numberOfLines={1} style={styles.galleryCardAuthor}>
                            {authorName}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                  {row.length === 1 && <View style={styles.galleryCardPlaceholder} />}
                </View>
              ))}
            </ScrollView>
          )}

          {/* B. Compacto en lista vertical completa */}
          {viewMode === 'compact' && (
            <ScrollView
              style={{ flex: 1, marginTop: 10 }}
              contentContainerStyle={styles.compactContentContainer}
              showsVerticalScrollIndicator={true}
            >
              {items.map((item) => {
                const isSelected = item.id === task?.id;
                const isDone = item.status === 'completed';
                const authorName = item.user?.display_name || item.user?.username || t('map.default_user');
                const locationPart = item.location_text
                  ? item.location_text.split(',')[0]?.trim()
                  : t('map.default_location');

                return (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.compactRow,
                      {
                        borderColor: isSelected ? gold[400] : theme.colors.border,
                        borderWidth: isSelected ? 1.5 : 1,
                        backgroundColor: theme.dark
                          ? 'rgba(255, 255, 255, 0.03)'
                          : 'rgba(0, 0, 0, 0.02)',
                      },
                    ]}
                    onPress={() => {
                      handleSelectFromList(item);
                      handleOpenTask(item);
                    }}
                  >
                    <View style={styles.compactThumb}>
                      <BucketCover
                        value={resolveTaskImage(item, { preferThumb: true })}
                        title={item.title}
                        categorySlug={item.category?.slug}
                        seed={item.id}
                        iconSize={26}
                        style={StyleSheet.absoluteFill}
                      />
                      {isDone && (
                        <View style={styles.compactDoneBadge}>
                          <Check size={9} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      )}
                    </View>

                    <View style={styles.compactDetails}>
                      <Text
                        numberOfLines={1}
                        style={[styles.compactTitle, { color: theme.colors.foreground }]}
                      >
                        {item.title}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[styles.compactSubtext, { color: theme.colors.foregroundMuted }]}
                      >
                        {authorName} • {locationPart}
                      </Text>
                    </View>

                    <View style={styles.compactRight}>
                      {isDone ? (
                        <View style={styles.compactStatusDone}>
                          <Text style={styles.compactStatusDoneText}>{t('map.status_done')}</Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.compactStatusPending,
                            {
                              backgroundColor: theme.dark
                                ? 'rgba(212, 177, 58, 0.15)'
                                : 'rgba(212, 177, 58, 0.2)',
                            },
                          ]}
                        >
                          <Text style={[styles.compactStatusPendingText, { color: gold[500] }]}>
                            {t('map.status_pending')}
                          </Text>
                        </View>
                      )}
                      <ChevronRight size={16} color={theme.colors.foregroundMuted} />
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {/* C. Carrusel deslizable en pantalla completa */}
          {viewMode === 'card' && (
            <ScrollView
              style={{ flex: 1, marginTop: 10 }}
              contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
              showsVerticalScrollIndicator={true}
            >
              {items.map((item, idx) => {
                const isCompleted = item.status === 'completed';
                const authorName = item.user?.display_name || item.user?.username || t('map.default_user');
                const authorAvatar = item.user?.avatar_url;

                return (
                  <View
                    key={item.id}
                    style={[
                      styles.card,
                      {
                        width: '100%',
                        backgroundColor: theme.colors.surfaceElevated ?? theme.colors.surface,
                        borderColor: item.id === task?.id ? gold[400] : theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.headerRow}>
                      <View style={styles.authorGroup}>
                        {authorAvatar ? (
                          <Image source={{ uri: authorAvatar }} style={styles.authorAvatar} />
                        ) : (
                          <View
                            style={[
                              styles.authorAvatarFallback,
                              { backgroundColor: theme.colors.border },
                            ]}
                          >
                            <Text style={[styles.avatarInitial, { color: theme.colors.foreground }]}>
                              {authorName[0]?.toUpperCase() || 'U'}
                            </Text>
                          </View>
                        )}
                        <Text
                          numberOfLines={1}
                          style={[styles.authorName, { color: theme.colors.foreground }]}
                        >
                          {authorName}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, color: gold[400], fontFamily: 'Inter_600SemiBold' }}>
                        #{idx + 1}
                      </Text>
                    </View>

                    <Pressable
                      style={styles.contentRow}
                      onPress={() => handleOpenTask(item)}
                    >
                      <View style={styles.coverImage}>
                        <BucketCover
                          value={resolveTaskImage(item, { preferThumb: true })}
                          title={item.title}
                          categorySlug={item.category?.slug}
                          seed={item.id}
                          iconSize={48}
                          style={StyleSheet.absoluteFill}
                        />
                      </View>
                      <View style={styles.detailsCol}>
                        <Text numberOfLines={2} style={[styles.title, { color: theme.colors.foreground }]}>
                          {item.title}
                        </Text>
                        <View style={styles.locationRow}>
                          <MapPin size={13} color={gold[400]} strokeWidth={2} />
                          <Text numberOfLines={1} style={[styles.locationText, { color: theme.colors.foregroundMuted }]}>
                            {item.location_text}
                          </Text>
                        </View>
                      </View>
                    </Pressable>

                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: gold[400] }]}
                      onPress={() => handleOpenTask(item)}
                    >
                      <Text style={styles.actionBtnText}>{t('map.view_task_details')}</Text>
                      <ArrowUpRight size={17} color="#000000" strokeWidth={2.5} />
                    </Pressable>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    );
  }

  // MODO FLOTANTE INFERIOR (COMPACTO / DESLIZABLE)
  return (
    <View style={styles.floatingContainer} pointerEvents="box-none">
      {/* Tirador superior para deslizar hacia arriba */}
      <View {...panResponder.panHandlers} style={styles.floatingDragHandleContainer}>
        <Pressable onPress={() => setIsExpanded(true)} hitSlop={10} style={styles.dragHandleBarBtn}>
          <View style={[styles.dragHandleBar, { backgroundColor: theme.colors.border }]} />
        </Pressable>
      </View>

      {/* Indicador de múltiples tareas y conmutador de modos de vista */}
      {items.length > 1 && (
        <View
          style={[
            styles.multiHeaderPill,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Pressable
            style={styles.multiHeaderLeft}
            onPress={() => setIsExpanded(true)}
            hitSlop={6}
          >
            <Layers size={13} color={gold[400]} />
            <Text style={[styles.multiHeaderText, { color: theme.colors.foreground }]}>
              {viewMode === 'card'
                ? t('map.tasks_count_of', { current: currentIndex + 1, total: items.length })
                : `${items.length} ${t('map.tasks_in_zone')}`}
            </Text>
          </Pressable>

          <View style={styles.multiHeaderRight}>
            {/* Flechas de navegación en modo tarjeta deslizable */}
            {viewMode === 'card' && (
              <View style={styles.navArrows}>
                <Pressable
                  hitSlop={8}
                  onPress={handlePrev}
                  disabled={currentIndex === 0}
                  style={[styles.arrowBtn, currentIndex === 0 && { opacity: 0.3 }]}
                  accessibilityLabel={t('map.prev_task')}
                >
                  <ChevronLeft size={16} color={theme.colors.foreground} />
                </Pressable>
                <Pressable
                  hitSlop={8}
                  onPress={handleNext}
                  disabled={currentIndex === items.length - 1}
                  style={[styles.arrowBtn, currentIndex === items.length - 1 && { opacity: 0.3 }]}
                  accessibilityLabel={t('map.next_task')}
                >
                  <ChevronRight size={16} color={theme.colors.foreground} />
                </Pressable>
              </View>
            )}

            {/* Conmutador de 3 modos: Deslizar (Card), Galería (Grid 2 cols), Compacto (Lista) */}
            <View
              style={[
                styles.viewModeToggle,
                { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.border },
              ]}
            >
              <Pressable
                onPress={() => setViewMode('card')}
                style={[styles.viewModeBtn, viewMode === 'card' && styles.viewModeBtnActive]}
                hitSlop={4}
                accessibilityLabel={t('map.view_card')}
              >
                <LayoutList
                  size={14}
                  color={viewMode === 'card' ? '#000000' : theme.colors.foregroundMuted}
                />
              </Pressable>
              <Pressable
                onPress={() => setViewMode('gallery')}
                style={[styles.viewModeBtn, viewMode === 'gallery' && styles.viewModeBtnActive]}
                hitSlop={4}
                accessibilityLabel={t('map.view_gallery')}
              >
                <LayoutGrid
                  size={14}
                  color={viewMode === 'gallery' ? '#000000' : theme.colors.foregroundMuted}
                />
              </Pressable>
              <Pressable
                onPress={() => setViewMode('compact')}
                style={[styles.viewModeBtn, viewMode === 'compact' && styles.viewModeBtnActive]}
                hitSlop={4}
                accessibilityLabel={t('map.view_compact')}
              >
                <AlignJustify
                  size={14}
                  color={viewMode === 'compact' ? '#000000' : theme.colors.foregroundMuted}
                />
              </Pressable>
            </View>

            {/* Botón expandir a pantalla completa */}
            <Pressable
              hitSlop={6}
              onPress={() => setIsExpanded(true)}
              style={[
                styles.arrowBtn,
                { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.border, borderRadius: 6, padding: 4 },
              ]}
              accessibilityLabel={t('map.view_fullscreen')}
            >
              <Maximize2 size={13} color={theme.colors.foreground} />
            </Pressable>
          </View>
        </View>
      )}

      {/* 1. MODO CARRUSEL DESLIZABLE (SWIPEABLE CARD) */}
      {viewMode === 'card' && (
        <>
          <FlatList
            ref={flatListRef}
            data={items}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH}
            decelerationRate="fast"
            style={{ width: CARD_WIDTH }}
            onMomentumScrollEnd={(e) => {
              const newIdx = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
              if (newIdx >= 0 && newIdx < items.length && newIdx !== currentIndex) {
                setCurrentIndex(newIdx);
                const target = items[newIdx];
                if (target) {
                  onSelectTask?.(target);
                }
              }
            }}
            getItemLayout={(_, index) => ({
              length: CARD_WIDTH,
              offset: CARD_WIDTH * index,
              index,
            })}
            onScrollToIndexFailed={(info) => {
              setTimeout(() => {
                flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
              }, 100);
            }}
            renderItem={({ item }) => {
              const isCompleted = item.status === 'completed';
              const authorName = item.user?.display_name || item.user?.username || t('map.default_user');
              const authorHandle = item.user?.username ? `@${item.user.username}` : '';
              const authorAvatar = item.user?.avatar_url;

              return (
                <View
                  style={[
                    styles.card,
                    {
                      width: CARD_WIDTH,
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                    },
                  ]}
                >
                  {/* Cabecera del autor y botón de cerrar / expandir */}
                  <View style={styles.headerRow}>
                    <View style={styles.authorGroup}>
                      {authorAvatar ? (
                        <Image source={{ uri: authorAvatar }} style={styles.authorAvatar} />
                      ) : (
                        <View
                          style={[
                            styles.authorAvatarFallback,
                            { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.border },
                          ]}
                        >
                          <Text style={[styles.avatarInitial, { color: theme.colors.foreground }]}>
                            {authorName[0]?.toUpperCase() || 'U'}
                          </Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text
                          numberOfLines={1}
                          style={[styles.authorName, { color: theme.colors.foreground }]}
                        >
                          {authorName}
                        </Text>
                        {authorHandle ? (
                          <Text
                            numberOfLines={1}
                            style={[styles.authorHandle, { color: theme.colors.foregroundMuted }]}
                          >
                            {authorHandle}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {items.length > 1 && (
                        <Pressable
                          hitSlop={8}
                          onPress={() => setIsExpanded(true)}
                          style={[
                            styles.closeBtn,
                            {
                              backgroundColor: theme.colors.surfaceElevated ?? theme.colors.border,
                            },
                          ]}
                          accessibilityLabel={t('map.fullscreen')}
                        >
                          <Maximize2 size={13} color={theme.colors.foregroundMuted} />
                        </Pressable>
                      )}
                      <Pressable
                        hitSlop={10}
                        onPress={onClose}
                        style={[
                          styles.closeBtn,
                          {
                            backgroundColor: theme.colors.surfaceElevated ?? theme.colors.border,
                          },
                        ]}
                        accessibilityLabel={t('map.close_preview')}
                      >
                        <X size={15} color={theme.colors.foregroundMuted} />
                      </Pressable>
                    </View>
                  </View>

                  {/* Fila con Foto de portada e información */}
                  <Pressable
                    style={styles.contentRow}
                    onPress={() => handleOpenTask(item)}
                  >
                    <View style={styles.coverImage}>
                      <BucketCover
                        value={resolveTaskImage(item, { preferThumb: true })}
                        title={item.title}
                        categorySlug={item.category?.slug}
                        seed={item.id}
                        iconSize={48}
                        style={StyleSheet.absoluteFill}
                      />
                    </View>

                    <View style={styles.detailsCol}>
                      <Text
                        numberOfLines={2}
                        style={[styles.title, { color: theme.colors.foreground }]}
                      >
                        {item.title}
                      </Text>

                      <View style={styles.locationRow}>
                        <MapPin size={13} color={gold[400]} strokeWidth={2} />
                        <Text
                          numberOfLines={1}
                          style={[styles.locationText, { color: theme.colors.foregroundMuted }]}
                        >
                          {item.location_text}
                        </Text>
                      </View>

                      {/* Fila de insignias de estado y categoría */}
                      <View style={styles.badgesRow}>
                        {isCompleted ? (
                          <View style={styles.completedBadge}>
                            <Check size={11} color="#FFFFFF" strokeWidth={3} />
                            <Text style={styles.completedBadgeText}>{t('map.completed')}</Text>
                          </View>
                        ) : (
                          <View
                            style={[
                              styles.pendingBadge,
                              {
                                backgroundColor: theme.dark
                                  ? 'rgba(212, 177, 58, 0.15)'
                                  : 'rgba(212, 177, 58, 0.2)',
                              },
                            ]}
                          >
                            <Text style={[styles.pendingBadgeText, { color: gold[500] }]}>
                              {t('map.pending_fulfill')}
                            </Text>
                          </View>
                        )}

                        {item.category ? (
                          <View
                            style={[
                              styles.categoryBadge,
                              { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.border },
                            ]}
                          >
                            <Text
                              style={[styles.categoryBadgeText, { color: theme.colors.foregroundMuted }]}
                            >
                              {i18n.language?.startsWith('en')
                                ? (item.category.name_en || item.category.name)
                                : (item.category.name_es || item.category.name)}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>

                  {/* Botón de acción */}
                  <Pressable
                    style={[styles.actionBtn, { backgroundColor: gold[400] }]}
                    onPress={() => handleOpenTask(item)}
                  >
                    <Text style={styles.actionBtnText}>{t('map.view_task_details')}</Text>
                    <ArrowUpRight size={17} color="#000000" strokeWidth={2.5} />
                  </Pressable>
                </View>
              );
            }}
          />

          {/* Indicadores de puntos (dots) si hay múltiples tareas */}
          {items.length > 1 && (
            <View style={styles.dotsRow}>
              {items.map((it, i) => (
                <View
                  key={it.id}
                  style={[
                    styles.dot,
                    i === currentIndex
                      ? [styles.activeDot, { backgroundColor: gold[400] }]
                      : { backgroundColor: theme.colors.border },
                  ]}
                />
              ))}
            </View>
          )}
        </>
      )}

      {/* 2. MODO VISTA DE GALERÍA (2 COLUMNAS ROBUSTAS) */}
      {viewMode === 'gallery' && (
        <View
          style={[
            styles.multiViewPanel,
            {
              width: CARD_WIDTH,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Cabecera del panel */}
          <View style={styles.multiViewHeader}>
            <View style={styles.multiViewHeaderLeft}>
              <LayoutGrid size={15} color={gold[400]} />
              <Text style={[styles.multiViewTitle, { color: theme.colors.foreground }]}>
                {t('map.gallery_title', { count: items.length })}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Pressable
                hitSlop={8}
                onPress={() => setIsExpanded(true)}
                style={[
                  styles.closeBtn,
                  { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.border },
                ]}
                accessibilityLabel={t('map.fullscreen')}
              >
                <Maximize2 size={13} color={theme.colors.foregroundMuted} />
              </Pressable>
              <Pressable
                hitSlop={10}
                onPress={onClose}
                style={[
                  styles.closeBtn,
                  { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.border },
                ]}
                accessibilityLabel={t('map.close_preview')}
              >
                <X size={15} color={theme.colors.foregroundMuted} />
              </Pressable>
            </View>
          </View>

          {/* Cuadrícula scrolleable en 2 columnas exactas */}
          <ScrollView
            style={styles.galleryScrollView}
            contentContainerStyle={styles.galleryGrid}
            showsVerticalScrollIndicator={false}
          >
            {galleryRows.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.galleryRow}>
                {row.map((item) => {
                  const isSelected = item.id === task?.id;
                  const isDone = item.status === 'completed';
                  const authorName = item.user?.display_name || item.user?.username || t('map.default_user');

                  return (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.galleryCard,
                        {
                          borderColor: isSelected ? gold[400] : theme.colors.border,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                      onPress={() => {
                        handleSelectFromList(item);
                        handleOpenTask(item);
                      }}
                    >
                      <BucketCover
                        value={resolveTaskImage(item, { preferThumb: true })}
                        title={item.title}
                        categorySlug={item.category?.slug}
                        seed={item.id}
                        iconSize={32}
                        style={StyleSheet.absoluteFill}
                      />

                      {/* Insignia de estado superior */}
                      {isDone && (
                        <View style={styles.galleryDoneBadge}>
                          <Check size={11} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      )}

                      {/* Gradiente oscuro inferior con título y autor */}
                      <View style={styles.galleryOverlay}>
                        <Text numberOfLines={2} style={styles.galleryCardTitle}>
                          {item.title}
                        </Text>
                        <Text numberOfLines={1} style={styles.galleryCardAuthor}>
                          {authorName}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
                {row.length === 1 && <View style={styles.galleryCardPlaceholder} />}
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* 3. MODO VISTA COMPACTA (LISTA VERTICAL DETALLADA) */}
      {viewMode === 'compact' && (
        <View
          style={[
            styles.multiViewPanel,
            {
              width: CARD_WIDTH,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          {/* Cabecera del panel */}
          <View style={styles.multiViewHeader}>
            <View style={styles.multiViewHeaderLeft}>
              <AlignJustify size={15} color={gold[400]} />
              <Text style={[styles.multiViewTitle, { color: theme.colors.foreground }]}>
                {t('map.all_tasks_title', { count: items.length })}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Pressable
                hitSlop={8}
                onPress={() => setIsExpanded(true)}
                style={[
                  styles.closeBtn,
                  { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.border },
                ]}
                accessibilityLabel={t('map.fullscreen')}
              >
                <Maximize2 size={13} color={theme.colors.foregroundMuted} />
              </Pressable>
              <Pressable
                hitSlop={10}
                onPress={onClose}
                style={[
                  styles.closeBtn,
                  { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.border },
                ]}
                accessibilityLabel={t('map.close_preview')}
              >
                <X size={15} color={theme.colors.foregroundMuted} />
              </Pressable>
            </View>
          </View>

          {/* Lista scrolleable de filas compactas */}
          <ScrollView
            style={styles.compactScrollView}
            contentContainerStyle={styles.compactList}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item) => {
              const isSelected = item.id === task?.id;
              const isDone = item.status === 'completed';
              const authorName = item.user?.display_name || item.user?.username || t('map.default_user');
              const locationPart = item.location_text
                ? item.location_text.split(',')[0]?.trim()
                : t('map.default_location');

              return (
                <Pressable
                  key={item.id}
                  style={[
                    styles.compactRow,
                    {
                      borderColor: isSelected ? gold[400] : theme.colors.border,
                      borderWidth: isSelected ? 1.5 : 1,
                      backgroundColor: theme.dark
                        ? 'rgba(255, 255, 255, 0.03)'
                        : 'rgba(0, 0, 0, 0.02)',
                    },
                  ]}
                  onPress={() => {
                    handleSelectFromList(item);
                    handleOpenTask(item);
                  }}
                >
                  {/* Miniatura */}
                  <View style={styles.compactThumb}>
                    <BucketCover
                      value={resolveTaskImage(item, { preferThumb: true })}
                      title={item.title}
                      categorySlug={item.category?.slug}
                      seed={item.id}
                      iconSize={24}
                      style={StyleSheet.absoluteFill}
                    />
                    {isDone && (
                      <View style={styles.compactDoneBadge}>
                        <Check size={9} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </View>

                  {/* Información */}
                  <View style={styles.compactDetails}>
                    <Text
                      numberOfLines={1}
                      style={[styles.compactTitle, { color: theme.colors.foreground }]}
                    >
                      {item.title}
                    </Text>
                    <Text
                      numberOfLines={1}
                      style={[styles.compactSubtext, { color: theme.colors.foregroundMuted }]}
                    >
                      {authorName} • {locationPart}
                    </Text>
                  </View>

                  {/* Estado / Flecha */}
                  <View style={styles.compactRight}>
                    {isDone ? (
                      <View style={styles.compactStatusDone}>
                        <Text style={styles.compactStatusDoneText}>{t('map.status_done')}</Text>
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.compactStatusPending,
                          {
                            backgroundColor: theme.dark
                              ? 'rgba(212, 177, 58, 0.15)'
                              : 'rgba(212, 177, 58, 0.2)',
                          },
                        ]}
                      >
                        <Text style={[styles.compactStatusPendingText, { color: gold[500] }]}>
                          {t('map.status_pending')}
                        </Text>
                      </View>
                    )}
                    <ChevronRight size={16} color={theme.colors.foregroundMuted} />
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 999,
    gap: 8,
  },
  floatingDragHandleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 2,
  },
  dragHandleBarBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  dragHandleArea: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 6,
  },
  dragHandleBar: {
    width: 38,
    height: 4.5,
    borderRadius: 999,
  },
  // Contenedor expandido a pantalla completa
  expandedOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 1000,
  },
  expandedPanel: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 20,
  },
  expandedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  expandedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expandedTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 16,
  },
  expandedSubtitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
    marginTop: 2,
  },
  expandedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryContentContainer: {
    gap: 10,
    paddingBottom: 20,
  },
  compactContentContainer: {
    gap: 8,
    paddingBottom: 20,
  },
  multiHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: CARD_WIDTH,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  multiHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  multiHeaderText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
  },
  multiHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  navArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  arrowBtn: {
    padding: 3,
  },
  viewModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  viewModeBtn: {
    width: 25,
    height: 23,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewModeBtnActive: {
    backgroundColor: gold[400],
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  authorGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  authorAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  authorAvatarFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
  authorName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  authorHandle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: -1,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  coverImage: {
    width: 84,
    height: 84,
    borderRadius: 14,
    overflow: 'hidden',
  },
  detailsCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 16,
    lineHeight: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  locationText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    flex: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#34C759',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  completedBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  pendingBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  pendingBadgeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  categoryBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  categoryBadgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 14,
    gap: 6,
  },
  actionBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13.5,
    color: '#000000',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 14,
    borderRadius: 3,
  },
  multiViewPanel: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  multiViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  multiViewHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  multiViewTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
  },
  galleryScrollView: {
    maxHeight: 285,
  },
  galleryGrid: {
    gap: 10,
    paddingBottom: 4,
  },
  galleryRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  galleryCard: {
    flex: 1,
    height: 125,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  galleryCardPlaceholder: {
    flex: 1,
  },
  galleryDoneBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  galleryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  galleryCardTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 11.5,
    lineHeight: 14,
    color: '#FFFFFF',
  },
  galleryCardAuthor: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9.5,
    color: 'rgba(255, 255, 255, 0.75)',
    marginTop: 2,
  },
  compactScrollView: {
    maxHeight: 285,
  },
  compactList: {
    gap: 8,
    paddingBottom: 4,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 14,
    gap: 10,
  },
  compactThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  compactDoneBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  compactDetails: {
    flex: 1,
    gap: 2,
  },
  compactTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  compactSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  compactRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactStatusDone: {
    backgroundColor: '#34C759',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  compactStatusDoneText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9.5,
  },
  compactStatusPending: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 999,
  },
  compactStatusPendingText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 9.5,
  },
});
