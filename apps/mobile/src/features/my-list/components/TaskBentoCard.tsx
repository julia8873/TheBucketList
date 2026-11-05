/**
 * Tarjeta de 2 columnas («bento») de Mi lista — misma estructura que en Mi_lista.html:
 *   [miniatura 40] Título
 *   ───────────────────────────
 *   [etiqueta]            [colaboradores] ★
 * Se usa en la vista Galería y en la sección FAVORITAS cuando «Favoritas en 2 columnas» está activo.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Check, Star } from 'lucide-react-native';
import { useTheme } from '@bucketlist/ui';
import { useTranslation, resolveCounterLabel } from '@bucketlist/shared';
import { BucketCover } from '@/components/BucketCover';
import { resolveTaskImage } from '@/utils/taskImage';
import { ParticipantsStack, useParticipantsOf } from '@/components/ItemParticipants';
import { hexToRgba } from '@/constants/tagPresets';
import type { TaskViewCustomization } from '@/stores/myListCustomization.store';
import type { Tag } from '@/hooks/useTags';

interface TaskBentoCardProps {
  item: any;
  isFav: boolean;
  isSelected: boolean;
  isSelectionMode: boolean;
  itemTags?: Tag[];
  customization?: TaskViewCustomization;
  onPress: () => void;
  onLongPress: () => void;
  onToggleFavorite?: () => void;
  onPressTag?: (tagId: string) => void;
  onLongPressTag?: (tagId: string) => void;
  onManageTags?: () => void;
}

function TaskBentoCardComponent({
  item,
  isFav,
  isSelected,
  isSelectionMode,
  itemTags,
  customization,
  onPress,
  onLongPress,
  onToggleFavorite,
  onPressTag,
  onLongPressTag,
  onManageTags,
}: TaskBentoCardProps) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const c = theme.colors;
  const participants = useParticipantsOf('task', item.id);

  const showThumbnails = customization?.showThumbnails ?? true;
  const showPriority = customization?.showPriority ?? true;
  const showFavorite = customization?.showFavorite ?? true;
  const showTags = customization?.showTags ?? true;
  const showSubtasks = customization?.showSubtasksProgress ?? true;
  const showDesc = customization?.showDescription ?? false;
  const visibleParticipants =
    (customization?.showCollaborators ?? true) && participants && participants.length > 0 ? participants : undefined;

  const isCompleted = item.status === 'completed';
  const subtasksTotal = item.item_subtasks?.length || 0;
  const subtasksDone = item.item_subtasks?.filter((s: any) => s.done).length || 0;
  const counterTarget = item.counter_target ?? 0;
  const counterCount = item.counter_count ?? 0;
  const counterLabel = resolveCounterLabel(item.counter_label, counterTarget || counterCount, i18n.language);
  const progressText =
    subtasksTotal > 0
      ? `${subtasksDone}/${subtasksTotal}`
      : counterTarget > 0
      ? `${counterCount}/${counterTarget} ${counterLabel}`
      : counterCount > 0
      ? `${counterCount} ${counterLabel}`
      : null;

  const priority = item.priority || 'medium';
  const priorityColor =
    priority === 'urgent' ? '#DC2626' : priority === 'high' ? '#EF4444' : priority === 'low' ? '#10B981' : '#D4B13A';
  const priorityLabel =
    priority === 'urgent'
      ? t('common.urgent')
      : priority === 'high'
      ? t('common.high')
      : priority === 'low'
      ? t('common.low')
      : t('common.medium');

  const firstTag = showTags && itemTags && itemTags.length > 0 ? itemTags[0] : undefined;
  const extraTags = showTags && itemTags && itemTags.length > 1 ? itemTags.length - 1 : 0;
  const showStar = isFav && showFavorite;

  const hasFooter = showPriority || !!firstTag || !!visibleParticipants || showStar;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={item.title}
      style={({ pressed }) => [
        {
          padding: 10,
          gap: 8,
          borderRadius: 16,
          borderWidth: 1,
          backgroundColor: isSelected ? 'rgba(212, 177, 58, 0.10)' : c.surface,
          borderColor: isSelected ? c.primary : c.border,
          opacity: pressed ? 0.9 : isCompleted ? 0.8 : 1,
          minHeight: 96,
          justifyContent: 'space-between',
          flex: 1,
        },
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        {isSelectionMode ? (
          <View
            style={{
              width: 16,
              height: 16,
              marginTop: 2,
              borderRadius: 4,
              borderWidth: 1,
              borderColor: isSelected ? c.primary : '#52525B',
              backgroundColor: isSelected ? c.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSelected ? <Check size={12} color={c.primaryForeground} strokeWidth={3} /> : null}
          </View>
        ) : null}

        {showThumbnails ? (
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              overflow: 'hidden',
              flexShrink: 0,
              backgroundColor: c.surfaceSunken,
              opacity: isCompleted ? 0.55 : 1,
              position: 'relative',
            }}
          >
            <BucketCover
              value={resolveTaskImage(item, { preferThumb: true })}
              title={item.title}
              categorySlug={item.category?.slug}
              seed={item.id}
              iconSize={22}
              style={StyleSheet.absoluteFill}
            />
          </View>
        ) : null}

        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={2}
            style={{
              color: isCompleted ? c.foregroundSubtle : c.foreground,
              fontFamily: 'Inter_700Bold',
              fontSize: 12,
              lineHeight: 16,
            }}
          >
            {item.title}
          </Text>
          {showSubtasks && progressText ? (
            <Text style={{ color: c.foregroundSubtle, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
              {progressText}
            </Text>
          ) : null}
          {showDesc && item.description ? (
            <Text style={{ color: c.foregroundSubtle, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
              {String(item.description).trim()}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Pie con etiquetas y colaboradores: siempre mantiene la misma altura (minHeight: 28) */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          paddingTop: 6,
          minHeight: 28,
          borderTopWidth: 1,
          borderTopColor: theme.dark ? '#1F1F26' : c.border,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1, minWidth: 0, minHeight: 20 }}>
          {showPriority ? (
            <View
              accessibilityLabel={priorityLabel}
              style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: priorityColor }}
            />
          ) : null}
          {firstTag ? (
            <Pressable
              disabled={isSelectionMode || !onPressTag}
              onPress={(e) => {
                (e as any)?.stopPropagation?.();
                onPressTag?.(firstTag.id);
              }}
              onLongPress={onLongPressTag ? (e) => {
                (e as any)?.stopPropagation?.();
                onLongPressTag(firstTag.id);
              } : undefined}
              style={({ pressed }) => [
                {
                  flexShrink: 1,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 99,
                  backgroundColor: hexToRgba(firstTag.color, 0.1),
                  borderWidth: 1,
                  borderColor: hexToRgba(firstTag.color, 0.25),
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={{ color: firstTag.color, fontSize: 10, fontFamily: 'Inter_500Medium' }}
              >
                {firstTag.emoji ? `${firstTag.emoji} ` : ''}
                {firstTag.name}
              </Text>
            </Pressable>
          ) : null}
          {extraTags > 0 ? (
            <Pressable
              disabled={isSelectionMode || !onManageTags}
              onPress={(e) => {
                (e as any)?.stopPropagation?.();
                onManageTags?.();
              }}
              style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={{ color: c.foregroundSubtle, fontSize: 10, fontFamily: 'Inter_600SemiBold' }}>
                +{extraTags}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0, minHeight: 20 }}>
          {visibleParticipants ? (
            <ParticipantsStack
              participants={visibleParticipants}
              max={2}
              ringColor={c.surface}
              disabled={isSelectionMode}
            />
          ) : null}
          {showStar ? (
            <Pressable
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              disabled={isSelectionMode || !onToggleFavorite}
              onPress={(e) => {
                (e as any)?.stopPropagation?.();
                onToggleFavorite?.();
              }}
              accessibilityRole="button"
              accessibilityLabel={t('common.favorite', { defaultValue: 'Favorita' })}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Star size={15} color={c.primary} fill={c.primary} />
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export const TaskBentoCard = React.memo(TaskBentoCardComponent);

/** Rejilla de 2 columnas con 8 px de separación (como `.items.bento` en Mi_lista.html). */
export function BentoGrid({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginTop: 0 }}>
      {items.map((child, i) => (
        <View key={i} style={{ width: '50%', padding: 4, display: 'flex' }}>
          {child}
        </View>
      ))}
    </View>
  );
}
