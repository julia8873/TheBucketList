import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { GripVertical, Lock, Star, Users, Bookmark, CheckCircle2 } from 'lucide-react-native';
import { useTheme, useCoverOverlay } from '@bucketlist/ui';
import { useTranslation } from '@bucketlist/shared';
import { styles } from '../styles/my-list.styles';
import { DragHandle } from '@/components/DraggableTaskList';
import { AlbumViewCustomization } from '@/stores/myListCustomization.store';

export const AlbumCoverThumb = React.memo(function AlbumCoverThumb({
  coverUri,
  colorIndex = 0,
  size = 40,
}: {
  coverUri?: string | null;
  colorIndex?: number;
  size?: number;
}) {
  const overlay = useCoverOverlay();
  const [g1, g2] = overlay.placeholders[colorIndex % overlay.placeholders.length] ?? overlay.placeholders[0]!;
  let parsedCover: any = null;
  if (coverUri && coverUri.startsWith('{')) {
    try {
      parsedCover = JSON.parse(coverUri);
    } catch {}
  }

  let inner;
  if (parsedCover?.type === 'image' && parsedCover.uri) {
    inner = (
      <ExpoImage
        source={{ uri: parsedCover.uri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
      />
    );
  } else if ((parsedCover?.type === 'gradient' || parsedCover?.type === 'solid') && parsedCover.colors) {
    inner = <LinearGradient colors={parsedCover.colors} style={StyleSheet.absoluteFill} />;
  } else if (coverUri && !parsedCover) {
    inner = (
      <ExpoImage
        source={{ uri: coverUri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={150}
      />
    );
  } else {
    inner = <LinearGradient colors={[g1, g2]} style={StyleSheet.absoluteFill} />;
  }

  return (
    <View style={{ width: size, height: size, borderRadius: size > 40 ? 10 : 8, overflow: 'hidden' }}>
      {inner}
    </View>
  );
});

export const AlbumCompactItemRow = React.memo(function AlbumCompactItemRow({
  item,
  drag,
  isFav = false,
  isSaved = false,
  onToggleSave,
  customization,
  onPress,
  onLongPress,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
}: {
  item: any;
  drag?: DragHandle;
  isFav?: boolean;
  isSaved?: boolean;
  onToggleSave?: () => void;
  customization?: AlbumViewCustomization;
  onPress: () => void;
  onLongPress?: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const total = item.total_tasks ?? 0;
  const completed = item.completed_tasks ?? 0;
  const isCompleted = total > 0 && completed === total;

  return (
    <Pressable
      key={item.id}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.compactRow,
        {
          backgroundColor: isCompleted
            ? theme.colors.surfaceSunken
            : theme.colors.surface,
          borderColor: theme.colors.border,
        },
        isSelected && {
          borderColor: theme.colors.primary,
          backgroundColor: 'rgba(212, 177, 58, 0.08)',
        },
        drag?.isActive && { borderColor: theme.colors.primary },
        { marginBottom: drag ? 6 : 0 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={item.title}
    >
      {drag && (
        <View
          {...drag.panHandlers}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          style={{ marginRight: 8, justifyContent: 'center', alignItems: 'center' }}
          accessibilityLabel="Arrastrar para reordenar"
        >
          <GripVertical size={18} color={drag.isActive ? theme.colors.primary : theme.colors.foregroundMuted} strokeWidth={2} />
        </View>
      )}

      {isSelectionMode && (
        <Pressable
          hitSlop={8}
          onPress={onToggleSelect}
          style={{ marginRight: 8, justifyContent: 'center', alignItems: 'center' }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isSelected }}
        >
          {isSelected ? (
            <CheckCircle2 size={18} color={theme.colors.primary} fill={theme.colors.primary} />
          ) : (
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                borderWidth: 1.5,
                borderColor: theme.colors.border,
              }}
            />
          )}
        </Pressable>
      )}

      <View style={{ marginRight: 10 }}>
        <AlbumCoverThumb coverUri={item.cover_path} colorIndex={0} size={32} />
      </View>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        <Text numberOfLines={1} style={[styles.compactTitle, { color: isCompleted ? theme.colors.foregroundMuted : theme.colors.foreground }]}>
          {item.title}
        </Text>
        {customization?.showDescription && item.description ? (
          <Text numberOfLines={1} style={{ fontSize: 11, color: theme.colors.foregroundMuted, marginTop: 1 }}>
            {item.description.trim()}
          </Text>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 8 }}>
        {(customization?.showBadges ?? true) && item.is_closed ? <Lock size={12} color={theme.colors.foregroundMuted} /> : null}
        {(customization?.showBadges ?? true) && item.is_shared ? <Users size={12} color={theme.colors.primary} /> : null}
        {(customization?.showPriority ?? false) && item.priority && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 3,
              paddingHorizontal: 6,
              paddingVertical: 1.5,
              borderRadius: 6,
              backgroundColor:
                item.priority === 'high' || item.priority === 'urgent'
                  ? 'rgba(239, 68, 68, 0.14)'
                  : item.priority === 'low'
                  ? 'rgba(16, 185, 129, 0.14)'
                  : 'rgba(212, 177, 58, 0.14)',
              borderWidth: 1,
              borderColor:
                item.priority === 'high' || item.priority === 'urgent'
                  ? '#EF4444'
                  : item.priority === 'low'
                  ? '#10B981'
                  : theme.colors.primary,
            }}
          >
            <View
              style={{
                width: 5,
                height: 5,
                borderRadius: 2.5,
                backgroundColor:
                  item.priority === 'high' || item.priority === 'urgent'
                    ? '#EF4444'
                    : item.priority === 'low'
                    ? '#10B981'
                    : theme.colors.primary,
              }}
            />
            <Text
              style={{
                fontSize: 10,
                fontWeight: '700',
                color:
                  item.priority === 'high' || item.priority === 'urgent'
                    ? '#EF4444'
                    : item.priority === 'low'
                    ? '#10B981'
                    : theme.colors.primary,
              }}
            >
              {item.priority === 'high' || item.priority === 'urgent'
                ? t('common.high')
                : item.priority === 'low'
                ? t('common.low')
                : t('common.medium')}
            </Text>
          </View>
        )}
        {(customization?.showTaskCount ?? true) && (
          <View
            style={{
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 6,
              backgroundColor: isCompleted
                ? 'rgba(52, 199, 89, 0.15)'
                : theme.colors.secondary,
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                color: isCompleted ? '#34C759' : theme.colors.foregroundMuted,
              }}
            >
              {completed}/{total}
            </Text>
          </View>
        )}
        {(customization?.showProgress ?? false) && total > 0 && (
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.colors.border, overflow: 'hidden' }}>
            <View style={{ width: `${Math.round((completed / total) * 100)}%`, height: '100%', backgroundColor: theme.colors.primary }} />
          </View>
        )}
        {customization?.showDate && item.created_at && (
          <Text style={{ fontSize: 11, color: theme.colors.foregroundMuted }}>
            {new Date(item.created_at).toLocaleDateString(i18n.language?.startsWith('en') ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short' })}
          </Text>
        )}
        {onToggleSave ? (
          <Pressable hitSlop={8} onPress={onToggleSave}>
            <Bookmark
              size={14}
              color={isSaved ? theme.colors.primary : theme.colors.foregroundMuted}
              fill={isSaved ? theme.colors.primary : 'transparent'}
            />
          </Pressable>
        ) : isSaved ? (
          <Bookmark size={13} color={theme.colors.primary} fill={theme.colors.primary} />
        ) : isFav ? (
          <Star size={13} color={theme.colors.primary} fill={theme.colors.primary} />
        ) : null}
      </View>
    </Pressable>
  );
});

export const AlbumListItemRow = React.memo(function AlbumListItemRow({
  item,
  drag,
  index = 0,
  isFav = false,
  isSaved = false,
  customization,
  onPress,
  onLongPress,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  onToggleFavorite,
  onToggleSave,
}: {
  item: any;
  drag?: DragHandle;
  index?: number;
  isFav?: boolean;
  isSaved?: boolean;
  customization?: AlbumViewCustomization;
  onPress: () => void;
  onLongPress?: () => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onToggleFavorite?: () => void;
  onToggleSave?: () => void;
}) {
  const { theme } = useTheme();
  const { t, i18n } = useTranslation();
  const total = item.total_tasks ?? 0;
  const completed = item.completed_tasks ?? 0;
  const progress = total > 0 ? completed / total : 0;
  const priority = item.priority;
  const priorityColor =
    priority === 'high' || priority === 'urgent'
      ? '#EF4444'
      : priority === 'low'
      ? '#10B981'
      : theme.colors.primary;
  const priorityLabel =
    priority === 'high' || priority === 'urgent'
      ? t('common.high')
      : priority === 'low'
      ? t('common.low')
      : t('common.medium');

  const showPriority = customization?.showPriority ?? true;
  const showTaskCount = customization?.showTaskCount ?? true;
  const showProgress = customization?.showProgress ?? true;
  const showBadges = customization?.showBadges ?? true;
  const showDate = customization?.showDate ?? false;
  const showDesc = customization?.showDescription ?? false;

  return (
    <View
      key={item.id}
      style={[
        drag ? { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 } : { marginBottom: 10 },
      ]}
    >
      {drag && (
        <View
          {...drag.panHandlers}
          hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
          style={{ width: 28, height: 68, alignItems: 'center', justifyContent: 'center' }}
          accessibilityLabel={t('my_list.drag_to_reorder', { defaultValue: 'Arrastrar para reordenar' })}
        >
          <GripVertical size={20} color={drag.isActive ? theme.colors.primary : theme.colors.foregroundMuted} strokeWidth={2} />
        </View>
      )}
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={[
          styles.listAlbumCard,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
          isSelected && {
            borderColor: theme.colors.primary,
            backgroundColor: 'rgba(212, 177, 58, 0.08)',
          },
          drag && { flex: 1 },
          drag?.isActive && { borderColor: theme.colors.primary },
        ]}
        accessibilityRole="button"
        accessibilityLabel={item.title}
      >
        {isSelectionMode && (
          <Pressable
            hitSlop={8}
            onPress={onToggleSelect}
            style={{ marginRight: 10, justifyContent: 'center', alignItems: 'center' }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isSelected }}
          >
            {isSelected ? (
              <CheckCircle2 size={22} color={theme.colors.primary} fill={theme.colors.primary} />
            ) : (
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  borderWidth: 1.5,
                  borderColor: theme.colors.border,
                }}
              />
            )}
          </Pressable>
        )}

        <View style={{ marginRight: 12 }}>
          <AlbumCoverThumb coverUri={item.cover_path} colorIndex={index} size={54} />
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.listAlbumTitle, { color: theme.colors.foreground }]} numberOfLines={1}>
              {item.title}
            </Text>
            {onToggleSave ? (
              <Pressable hitSlop={8} onPress={onToggleSave}>
                <Bookmark
                  size={16}
                  color={isSaved ? theme.colors.primary : theme.colors.foregroundMuted}
                  fill={isSaved ? theme.colors.primary : 'transparent'}
                />
              </Pressable>
            ) : isSaved ? (
              <Bookmark
                size={16}
                color={theme.colors.primary}
                fill={theme.colors.primary}
              />
            ) : onToggleFavorite ? (
              <Pressable hitSlop={8} onPress={onToggleFavorite}>
                <Star
                  size={16}
                  color={isFav ? theme.colors.primary : theme.colors.foregroundMuted}
                  fill={isFav ? theme.colors.primary : 'transparent'}
                />
              </Pressable>
            ) : isFav ? (
              <Star
                size={16}
                color={theme.colors.primary}
                fill={theme.colors.primary}
              />
            ) : null}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            {showTaskCount && (
              <Text style={[styles.listAlbumMeta, { color: theme.colors.foregroundMuted }]}>
                {total} {total === 1 ? t('albums.task_single') : t('albums.task_plural')} · {completed} {completed === 1 ? t('albums.completed_single') : t('albums.completed_plural')}
              </Text>
            )}

            {showDate && item.created_at && (
              <Text style={[styles.listAlbumMeta, { color: theme.colors.foregroundMuted }]}>
                {new Date(item.created_at).toLocaleDateString(i18n.language?.startsWith('en') ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            )}

            {showBadges && item.is_shared && (
              <View style={[styles.listAlbumBadge, {
                backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                borderColor: theme.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
              }]}>
                <Users size={10} color={theme.colors.foregroundMuted} />
                <Text style={[styles.listAlbumBadgeText, { color: theme.colors.foregroundMuted }]}>{t('albums.shared')}</Text>
              </View>
            )}

            {showBadges && item.is_closed && (
              <View style={[styles.listAlbumBadge, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#EF4444' }]}>
                <Lock size={10} color="#EF4444" />
                <Text style={[styles.listAlbumBadgeText, { color: '#EF4444' }]}>{t('common.closed')}</Text>
              </View>
            )}

            {showPriority && priority && (
              <View style={[styles.listAlbumBadge, { borderColor: priorityColor }]}>
                <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: priorityColor }} />
                <Text style={[styles.listAlbumBadgeText, { color: priorityColor }]}>{priorityLabel}</Text>
              </View>
            )}
          </View>

          {showDesc && item.description ? (
            <Text
              style={{
                fontSize: 12,
                color: theme.colors.foregroundMuted,
                marginTop: 3,
                fontFamily: 'Inter_400Regular',
              }}
              numberOfLines={1}
            >
              {item.description.trim()}
            </Text>
          ) : null}

          {showProgress && (
            <View style={[styles.listAlbumProgressTrack, { backgroundColor: theme.colors.border }]}>
              <View style={[styles.listAlbumProgressFill, { backgroundColor: theme.colors.primary, width: `${Math.round(progress * 100)}%` as any }]} />
            </View>
          )}
        </View>
      </Pressable>
    </View>
  );
});
