import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Dimensions,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin, X, ArrowUpRight, Check, ChevronLeft, ChevronRight, Layers } from 'lucide-react-native';
import { gold, useTheme } from '@bucketlist/ui';
import { BucketCover } from '../../../components/BucketCover';
import { resolveTaskImage } from '../../../utils/taskImage';
import type { MapTaskItem } from '../types';

interface TaskMapPreviewCardProps {
  task: MapTaskItem | null;
  tasksAtLocation?: MapTaskItem[];
  onSelectTask?: (task: MapTaskItem) => void;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 440);

export function TaskMapPreviewCard({
  task,
  tasksAtLocation,
  onSelectTask,
  onClose,
}: TaskMapPreviewCardProps) {
  const router = useRouter();
  const { theme } = useTheme();

  const flatListRef = useRef<FlatList<MapTaskItem> | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const items = tasksAtLocation && tasksAtLocation.length > 0 ? tasksAtLocation : (task ? [task] : []);

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

  return (
    <View style={styles.floatingContainer} pointerEvents="box-none">
      {/* Indicador de múltiples tareas en la misma ubicación */}
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
          <View style={styles.multiHeaderLeft}>
            <Layers size={13} color={gold[400]} />
            <Text style={[styles.multiHeaderText, { color: theme.colors.foreground }]}>
              {currentIndex + 1} de {items.length} tareas en esta ubicación
            </Text>
          </View>
          <View style={styles.navArrows}>
            <Pressable
              hitSlop={8}
              onPress={handlePrev}
              disabled={currentIndex === 0}
              style={[styles.arrowBtn, currentIndex === 0 && { opacity: 0.3 }]}
              accessibilityLabel="Tarea anterior"
            >
              <ChevronLeft size={16} color={theme.colors.foreground} />
            </Pressable>
            <Pressable
              hitSlop={8}
              onPress={handleNext}
              disabled={currentIndex === items.length - 1}
              style={[styles.arrowBtn, currentIndex === items.length - 1 && { opacity: 0.3 }]}
              accessibilityLabel="Siguiente tarea"
            >
              <ChevronRight size={16} color={theme.colors.foreground} />
            </Pressable>
          </View>
        </View>
      )}

      {/* Lista horizontal deslizable (swipeable) para ver todas las tareas del lugar */}
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
          const authorName = item.user?.display_name || item.user?.username || 'Usuario';
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
              {/* Cabecera del autor y botón de cerrar */}
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

                <Pressable
                  hitSlop={10}
                  onPress={onClose}
                  style={[
                    styles.closeBtn,
                    {
                      backgroundColor: theme.colors.surfaceElevated ?? theme.colors.border,
                    },
                  ]}
                  accessibilityLabel="Cerrar vista previa"
                >
                  <X size={16} color={theme.colors.foregroundMuted} />
                </Pressable>
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
                        <Text style={styles.completedBadgeText}>Completada</Text>
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
                          Por cumplir
                        </Text>
                      </View>
                    )}

                    {item.category?.name ? (
                      <View
                        style={[
                          styles.categoryBadge,
                          { backgroundColor: theme.colors.surfaceElevated ?? theme.colors.border },
                        ]}
                      >
                        <Text
                          style={[styles.categoryBadgeText, { color: theme.colors.foregroundMuted }]}
                        >
                          {item.category.name}
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
                <Text style={styles.actionBtnText}>Ver detalles de la tarea</Text>
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
  multiHeaderPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: CARD_WIDTH,
    paddingHorizontal: 12,
    paddingVertical: 7,
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
  },
  multiHeaderText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
  },
  navArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  arrowBtn: {
    padding: 3,
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
});
