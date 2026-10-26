import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check, CheckCircle2, Star } from 'lucide-react-native';
import { gold } from '@bucketlist/ui/src/tokens/colors';
import { useTheme, useCoverOverlay } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { BucketCover } from '@/components/BucketCover';
import { resolveTaskImage } from '@/utils/taskImage';
import { styles } from '../styles/my-list.styles';
import type { TaskViewCustomization } from '@/stores/myListCustomization.store';
import type { Tag } from '@/hooks/useTags';

interface TaskGalleryItemCardProps {
  item: any;
  isSingle: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  isFav: boolean;
  itemTags?: Tag[];
  customization?: TaskViewCustomization;
  onPress: () => void;
  onLongPress: () => void;
}

function TaskGalleryItemCardComponent({
  item,
  isSingle,
  isSelected,
  isSelectionMode,
  isFav,
  itemTags,
  customization,
  onPress,
  onLongPress,
}: TaskGalleryItemCardProps) {
  const { theme } = useTheme();
  const overlay = useCoverOverlay();
  const { t, i18n } = useTranslation();
  const isCompleted = item.status === 'completed';

  const imageValue = resolveTaskImage(item, { preferThumb: !isSingle });
  const isImageCover = !!imageValue && !imageValue.startsWith('preset:');

  const showPriority = customization?.showPriority ?? true;
  const showTags = customization?.showTags ?? true;
  const showDates = customization?.showDates ?? true;
  const showCategoryLoc = customization?.showCategoryLocation ?? true;
  const showSubtasks = customization?.showSubtasksProgress ?? true;
  const showDesc = customization?.showDescription ?? false;

  const subtasksTotal = item.item_subtasks?.length || 0;
  const subtasksDone = item.item_subtasks?.filter((s: any) => s.done).length || 0;
  const itemPriority = item.priority || 'medium';
  const itemPriorityColor =
    itemPriority === 'urgent'
      ? '#DC2626'
      : itemPriority === 'high'
      ? '#EF4444'
      : itemPriority === 'low'
      ? '#10B981'
      : '#D4B13A';
  const itemPriorityLabel =
    itemPriority === 'urgent'
      ? t('common.urgent')
      : itemPriority === 'high'
      ? t('common.high')
      : itemPriority === 'low'
      ? t('common.low')
      : t('common.medium');

  // Build meta text according to customization
  const metaParts: string[] = [];
  if (showSubtasks) {
    if (subtasksTotal > 0) {
      metaParts.push(`${subtasksDone}/${subtasksTotal} ${t('common.steps', { defaultValue: 'pasos' })}`);
    } else if (item.counter_target > 0) {
      metaParts.push(`${item.counter_count ?? 0}/${item.counter_target}`);
    }
  }
  if (showCategoryLoc) {
    const isEn = i18n.language?.startsWith('en');
    const categoryName = isEn
      ? item.category?.name_en || item.category?.name_es
      : item.category?.name_es || item.category?.name_en;
    const catOrLoc = categoryName || item.category?.name || item.location;
    if (catOrLoc) metaParts.push(catOrLoc);
  }
  if (showDates) {
    const targetDate = item.status === 'completed' && item.completed_at ? item.completed_at : item.deadline;
    if (targetDate) {
      try {
        const d = new Date(targetDate);
        metaParts.push(d.toLocaleDateString(i18n.language?.startsWith('en') ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short' }));
      } catch {}
    }
  }
  const metaText = metaParts.join(' · ');

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
        value={imageValue}
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: '65%' }}>
          {showPriority && (
            <View
              style={[
                styles.galleryPriorityBadge,
                {
                  borderColor: itemPriorityColor,
                },
                !theme.dark && {
                  backgroundColor: 'rgba(255,255,255,0.92)',
                },
              ]}
            >
              <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: itemPriorityColor }} />
              <Text style={[styles.galleryPriorityText, { color: itemPriorityColor }]}>{itemPriorityLabel}</Text>
            </View>
          )}
          {showTags && itemTags && itemTags.length > 0 && (
            itemTags.slice(0, 1).map((t) => (
              <View
                key={t.id}
                style={[
                  styles.galleryPriorityBadge,
                  {
                    backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.92)',
                    borderColor: t.color || gold[400],
                  },
                ]}
              >
                <Text style={{ fontSize: 10, color: t.color || (theme.dark ? '#F2EFE8' : '#141414'), fontWeight: '600' }} numberOfLines={1}>
                  {t.emoji ? `${t.emoji} ` : ''}{t.name}
                </Text>
              </View>
            ))
          )}
          {showTags && itemTags && itemTags.length > 1 && (
            <View
              style={[
                styles.galleryPriorityBadge,
                {
                  backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.92)',
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <Text style={{ fontSize: 10, color: theme.colors.foregroundMuted, fontWeight: '600' }}>
                +{itemTags.length - 1}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Overlay inferior — transparent panel when there's a real image cover */}
      <View
        style={[
          styles.galleryBottomOverlay,
          { backgroundColor: isImageCover ? 'rgba(0,0,0,0.52)' : overlay.panel },
        ]}
      >
        <Text
          style={[styles.galleryCardTitle, { color: overlay.title }, isSingle && { fontSize: 16 }]}
          numberOfLines={showDesc && item.description ? 1 : 2}
        >
          {item.title}
        </Text>
        {metaText ? (
          <Text style={[styles.galleryCardMeta, { color: overlay.meta }]} numberOfLines={1}>
            {metaText}
          </Text>
        ) : null}
        {showDesc && item.description ? (
          <Text
            style={[styles.galleryCardMeta, { color: overlay.meta, fontSize: 11, marginTop: 2 }]}
            numberOfLines={1}
          >
            {item.description.trim()}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export const TaskGalleryItemCard = React.memo(TaskGalleryItemCardComponent);
