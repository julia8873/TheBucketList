import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check, CheckCircle2, Star } from 'lucide-react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { useTheme, useCoverOverlay } from '@bucketlist/ui';
import { BucketCover } from '@/components/BucketCover';
import { resolveTaskImage } from '@/utils/taskImage';
import { styles } from '../styles/my-list.styles';

interface TaskGalleryItemCardProps {
  item: any;
  isSingle: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  isFav: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function TaskGalleryItemCardComponent({
  item,
  isSingle,
  isSelected,
  isSelectionMode,
  isFav,
  onPress,
  onLongPress,
}: TaskGalleryItemCardProps) {
  const { theme } = useTheme();
  const overlay = useCoverOverlay();
  const isCompleted = item.status === 'completed';
  const subtasksTotal = item.item_subtasks?.length || 0;
  const subtasksDone = item.item_subtasks?.filter((s: any) => s.done).length || 0;
  const itemPriority = item.priority || 'medium';

  return (
    <Pressable
      key={item.id}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.galleryCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
        isSingle && styles.galleryCardSingle,
        isSelected && { borderColor: gold[400], borderWidth: 2 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <BucketCover
        value={resolveTaskImage(item, { preferThumb: !isSingle })}
        title={item.title}
        categorySlug={item.category?.slug}
        seed={item.id}
        iconSize={isSingle ? 64 : 44}
        style={StyleSheet.absoluteFill}
      />

      {/* Badges superiores */}
      <View style={styles.galleryTopBadges}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {isSelectionMode ? (
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: isSelected ? gold[400] : 'rgba(0,0,0,0.6)',
                borderWidth: isSelected ? 0 : 1.5,
                borderColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isSelected && <Check size={14} color="#0E0E0E" strokeWidth={3} />}
            </View>
          ) : (
            <>
              {isFav && (
                <View
                  style={[
                    styles.galleryFavBadge,
                    !theme.dark && {
                      backgroundColor: 'rgba(255,255,255,0.92)',
                      borderColor: gold[400],
                    },
                  ]}
                >
                  <Star size={11} color={gold[500]} fill={gold[500]} />
                </View>
              )}
              {isCompleted && (
                <View style={styles.galleryCompletedBadge}>
                  <CheckCircle2 size={12} color="#FFFFFF" />
                </View>
              )}
            </>
          )}
        </View>
        {itemPriority === 'high' && (
          <View
            style={[
              styles.galleryPriorityBadge,
              !theme.dark && {
                backgroundColor: 'rgba(255,255,255,0.92)',
                borderColor: '#EF4444',
              },
            ]}
          >
            <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#EF4444' }} />
            <Text style={styles.galleryPriorityText}>Alta</Text>
          </View>
        )}
      </View>

      {/* Overlay inferior */}
      <View style={[styles.galleryBottomOverlay, { backgroundColor: overlay.panel }]}>
        <Text
          style={[styles.galleryCardTitle, { color: overlay.title }, isSingle && { fontSize: 16 }]}
          numberOfLines={2}
        >
          {item.title}
        </Text>
        {(item.category?.name_es || item.category?.name || subtasksTotal > 0 || item.location) && (
          <Text style={[styles.galleryCardMeta, { color: overlay.meta }]} numberOfLines={1}>
            {subtasksTotal > 0
              ? `${subtasksDone} de ${subtasksTotal} pasos`
              : item.category?.name_es || item.category?.name || item.location}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export const TaskGalleryItemCard = React.memo(TaskGalleryItemCardComponent);
