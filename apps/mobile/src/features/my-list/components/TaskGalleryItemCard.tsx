import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check, CheckCircle2, Star } from 'lucide-react-native';
import { gold, dark } from '@bucketlist/ui/src/tokens/colors';
import { useTheme, useCoverOverlay } from '@bucketlist/ui';
import { useTranslation, resolveCounterLabel } from '@bucketlist/shared';
import { BucketCover } from '@/components/BucketCover';
import { resolveTaskImage } from '@/utils/taskImage';
import { styles } from '../styles/my-list.styles';
import type { TaskViewCustomization, GalleryColumns } from '@/stores/myListCustomization.store';
import type { Tag } from '@/hooks/useTags';
import { ParticipantsStack, useParticipantsOf } from '@/components/ItemParticipants';
import { getTaskStatusType, getStatusConfig } from '@/utils/statusBadge';

interface TaskGalleryItemCardProps {
  item: any;
  isSingle?: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  isFav: boolean;
  itemTags?: Tag[];
  customization?: TaskViewCustomization;
  columns?: GalleryColumns;
  onPress: () => void;
  onLongPress: () => void;
}

function TaskGalleryItemCardComponent({
  item,
  isSingle = false,
  isSelected,
  isSelectionMode,
  isFav,
  itemTags,
  customization,
  columns = 2,
  onPress,
  onLongPress,
}: TaskGalleryItemCardProps) {
  const { theme } = useTheme();
  const overlay = useCoverOverlay();
  const { t, i18n } = useTranslation();
  const isCompleted = item.status === 'completed';
  const participants = useParticipantsOf('task', item.id);

  const effectiveSingle = isSingle && columns === 2;
  const imageValue = resolveTaskImage(item, { preferThumb: !effectiveSingle });
  const isImageCover = !!imageValue && !imageValue.startsWith('preset:');

  const showPriority = customization?.showPriority ?? true;
  const showFavorite = customization?.showFavorite ?? true;
  const showTags = customization?.showTags ?? true;
  const showDates = customization?.showDates ?? true;
  const showCategoryLoc = customization?.showCategoryLocation ?? true;
  const showSubtasks = customization?.showSubtasksProgress ?? true;
  const showDesc = customization?.showDescription ?? false;
  const visibleParticipants =
    (customization?.showCollaborators ?? true) && participants && participants.length > 0 ? participants : undefined;

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
      const label = resolveCounterLabel(item.counter_label, item.counter_target, i18n.language);
      metaParts.push(`${item.counter_count ?? 0}/${item.counter_target} ${label}`);
    } else if ((item.counter_count ?? 0) > 0) {
      const label = resolveCounterLabel(item.counter_label, item.counter_count, i18n.language);
      metaParts.push(`${item.counter_count} ${label}`);
    }
  }
  if (showCategoryLoc && item.location) {
    metaParts.push(item.location);
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

  const is4Cols = columns === 4;
  const is3Cols = columns === 3;
  const badgeSize = is4Cols ? 18 : is3Cols ? 20 : 22;
  const checkIconSize = is4Cols ? 10 : is3Cols ? 11 : 12;
  const starIconSize = is4Cols ? 9 : is3Cols ? 10 : 11;

  const showStatus = customization?.showStatus ?? true;
  const statusType = getTaskStatusType(item);
  const statusCfg = getStatusConfig(statusType, t);

  return (
    <Pressable
      key={item.id}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.galleryCard,
        is3Cols && styles.galleryCard3,
        is4Cols && styles.galleryCard4,
        {
          backgroundColor: theme.dark ? dark[900] : dark[800],
          borderColor: theme.colors.border,
        },
        effectiveSingle && styles.galleryCardSingle,
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      <BucketCover
        value={imageValue}
        title={item.title}
        categorySlug={item.category?.slug}
        seed={item.id}
        iconSize={effectiveSingle ? 64 : is4Cols ? 26 : is3Cols ? 34 : 44}
        style={StyleSheet.absoluteFill}
      />

      {/* Selection Border Overlay */}
      {isSelected && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: is4Cols ? 8 : is3Cols ? 10 : 14,
              borderWidth: is4Cols ? 1.5 : 2.5,
              borderColor: gold[400],
              zIndex: 10,
            },
          ]}
        />
      )}

      {/* Badges superiores */}
      <View style={[styles.galleryTopBadges, is4Cols && { top: 4, left: 4, right: 4 }, is3Cols && { top: 5, left: 5, right: 5 }]}>
        {/* Columna izquierda: Estado y Favorito arriba, Fotos de perfil debajo */}
        <View style={{ flexDirection: 'column', alignItems: 'flex-start', gap: is4Cols ? 2 : is3Cols ? 3 : 4, flexShrink: 0 }}>
          {isSelectionMode ? (
            <View
              style={{
                width: is4Cols ? 18 : is3Cols ? 20 : 24,
                height: is4Cols ? 18 : is3Cols ? 20 : 24,
                borderRadius: is4Cols ? 9 : is3Cols ? 10 : 12,
                backgroundColor: isSelected ? gold[400] : 'rgba(0,0,0,0.6)',
                borderWidth: isSelected ? 0 : 1.5,
                borderColor: '#FFFFFF',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isSelected && <Check size={is4Cols ? 10 : 14} color="#0E0E0E" strokeWidth={3} />}
            </View>
          ) : (
            <>
              {/* Fila superior izquierda: Estado y Favorito */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: is4Cols ? 3 : is3Cols ? 4 : 4 }}>
                {showStatus && (
                  <View
                    style={[
                      styles.galleryCompletedBadge,
                      {
                        width: badgeSize,
                        height: badgeSize,
                        borderRadius: badgeSize / 2,
                        backgroundColor: statusCfg.badgeBg,
                      },
                    ]}
                  >
                    {statusCfg.renderGalleryIcon(checkIconSize)}
                  </View>
                )}
                {isFav && showFavorite && (
                  <View
                    style={[
                      styles.galleryFavBadge,
                      { width: badgeSize, height: badgeSize, borderRadius: badgeSize / 2 },
                      !theme.dark && {
                        backgroundColor: 'rgba(255,255,255,0.92)',
                        borderColor: gold[400],
                      },
                    ]}
                  >
                    <Star size={starIconSize} color={gold[500]} fill={gold[500]} />
                  </View>
                )}
              </View>

              {/* Fotos de perfil debajo */}
              {visibleParticipants && (
                <View style={{ marginTop: 1 }}>
                  <ParticipantsStack
                    participants={visibleParticipants}
                    max={is4Cols ? 1 : is3Cols ? 2 : 2}
                    size="xs"
                    ringColor="rgba(0,0,0,0.55)"
                    disabled={isSelectionMode}
                  />
                </View>
              )}
            </>
          )}
        </View>

        {/* Columna derecha: Prioridad arriba, Etiquetas debajo para no salirse */}
        <View style={{ flexDirection: 'column', alignItems: 'flex-end', gap: is4Cols ? 2 : is3Cols ? 3 : 4, flex: 1, marginLeft: 6 }}>
          {showPriority && (
            is4Cols ? (
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: itemPriorityColor,
                  borderWidth: 1,
                  borderColor: 'rgba(0,0,0,0.4)',
                }}
              />
            ) : (
              <View
                style={[
                  styles.galleryPriorityBadge,
                  is3Cols && { paddingHorizontal: 4, paddingVertical: 1, gap: 3 },
                  {
                    borderColor: itemPriorityColor,
                    maxWidth: '100%',
                  },
                  !theme.dark && {
                    backgroundColor: 'rgba(255,255,255,0.92)',
                  },
                ]}
              >
                <View style={{ width: is3Cols ? 4 : 5, height: is3Cols ? 4 : 5, borderRadius: 2.5, backgroundColor: itemPriorityColor, flexShrink: 0 }} />
                <Text
                  style={[styles.galleryPriorityText, is3Cols && { fontSize: 9 }, { color: itemPriorityColor, flexShrink: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {itemPriorityLabel}
                </Text>
              </View>
            )
          )}
          {!is4Cols && showTags && itemTags && itemTags.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, maxWidth: '100%', justifyContent: 'flex-end' }}>
              {itemTags.slice(0, 1).map((t) => (
                <View
                  key={t.id}
                  style={[
                    styles.galleryPriorityBadge,
                    is3Cols && { paddingHorizontal: 4, paddingVertical: 1 },
                    {
                      backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.92)',
                      borderColor: t.color || gold[400],
                      maxWidth: itemTags.length > 1 ? '75%' : '100%',
                      flexShrink: 1,
                    },
                  ]}
                >
                  <Text
                    style={{ fontSize: is3Cols ? 9 : 10, color: t.color || (theme.dark ? '#F2EFE8' : '#141414'), fontWeight: '600', flexShrink: 1 }}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {t.emoji ? `${t.emoji} ` : ''}{t.name}
                  </Text>
                </View>
              ))}
              {itemTags.length > 1 && (
                <View
                  style={[
                    styles.galleryPriorityBadge,
                    is3Cols && { paddingHorizontal: 3, paddingVertical: 1 },
                    {
                      backgroundColor: theme.dark ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.92)',
                      borderColor: theme.colors.border,
                      flexShrink: 0,
                    },
                  ]}
                >
                  <Text style={{ fontSize: is3Cols ? 8 : 9, color: theme.dark ? '#8F8F8F' : '#666666', fontWeight: '700' }}>
                    +{itemTags.length - 1}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>

      {/* Overlay inferior — transparent panel when there's a real image cover */}
      <View
        style={[
          styles.galleryBottomOverlay,
          { backgroundColor: isImageCover ? 'rgba(0,0,0,0.52)' : overlay.panel },
          is3Cols && { minHeight: 44, paddingHorizontal: 6, paddingVertical: 4, borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
          is4Cols && { minHeight: 32, paddingHorizontal: 4, paddingVertical: 3, borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
        ]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: is4Cols ? 4 : is3Cols ? 6 : 8 }}>
          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.galleryCardTitle,
                { color: overlay.title },
                effectiveSingle && { fontSize: 16, lineHeight: 22, minHeight: 44 },
                is3Cols && { fontSize: 11, lineHeight: 14, minHeight: 14 },
                is4Cols && { fontSize: 10, lineHeight: 12, minHeight: 12 },
              ]}
              numberOfLines={is4Cols || is3Cols || (showDesc && item.description) ? 1 : 2}
            >
              {item.title}
            </Text>
            {!is4Cols && metaText ? (
              <Text style={[styles.galleryCardMeta, { color: overlay.meta }, is3Cols && { fontSize: 9, marginTop: 1 }]} numberOfLines={1}>
                {metaText}
              </Text>
            ) : null}
            {!is4Cols && !is3Cols && showDesc && item.description ? (
              <Text
                style={[styles.galleryCardMeta, { color: overlay.meta, fontSize: 11, marginTop: 2 }]}
                numberOfLines={1}
              >
                {item.description.trim()}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export const TaskGalleryItemCard = React.memo(TaskGalleryItemCardComponent);
